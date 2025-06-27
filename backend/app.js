require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const app = express();

app.use(cors());
app.use(express.json());

const pool = require('./models/db');
const { notifyAdminOrder } = require('./telegram');

app.post('/auth/register', async (req, res) => {
  const { name, email, password, contact, city, address } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ error: "All fields required" });
  }
  const { rows: users } = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
  if (users.length > 0) {
    return res.status(400).json({ error: "Email already exists" });
  }
  const hash = await bcrypt.hash(password, 10);
  await pool.query(
    'INSERT INTO users (name, email, password, contact, city, address) VALUES ($1, $2, $3, $4, $5, $6)',
    [name, email, hash, contact, city, address]
  );
  res.json({ success: true, email, name });
});

app.post('/auth/login', async (req, res) => {
  const { email, password } = req.body;
  const { rows: users } = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
  if (users.length === 0) {
    return res.status(401).json({ error: "User not found" });
  }
  const user = users[0];
  const valid = await bcrypt.compare(password, user.password);
  if (!valid) {
    return res.status(401).json({ error: "Wrong password" });
  }
  res.json({ token: "dev-token", email: user.email, name: user.name });
});

app.get('/products', async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM items');
  res.json(rows);
});

app.get('/cart', async (req, res) => {
  const email = req.query.email;
  if (!email) return res.status(400).json({ error: "Email required" });
  const { rows } = await pool.query(
    `SELECT cart_items.id, items.name, items.price, items.location 
     FROM cart_items 
     JOIN items ON cart_items.item_id = items.id 
     WHERE cart_items.email = $1 AND cart_items.status = 'in_cart'`,
    [email]
  );
  res.json(rows);
});

app.post('/cart', async (req, res) => {
  const { item_id, email } = req.body;
  if (!item_id || !email) return res.status(400).json({ error: "item_id and email required" });
  const { rows: users } = await pool.query('SELECT 1 FROM users WHERE email = $1', [email]);
  if (users.length === 0) return res.status(403).json({ error: "User not found" });
  await pool.query(
    'INSERT INTO cart_items (email, item_id, status) VALUES ($1, $2, $3)',
    [email, item_id, "in_cart"]
  );
  res.json({ success: true });
});

// === Удалить из корзины ===
app.delete('/cart/:id', async (req, res) => {
  const id = req.params.id;
  await pool.query('DELETE FROM cart_items WHERE id = $1', [id]);
  res.json({ success: true });
});

app.post('/cart/confirm', async (req, res) => {
  const { item_id } = req.body;

  // 1. Получить товар и email владельца
  const { rows } = await pool.query(
    `SELECT ci.email, i.name, i.price
     FROM cart_items ci
     JOIN items i ON ci.item_id = i.id
     WHERE ci.id = $1`,
    [item_id]
  );
  if (!rows.length) return res.status(404).json({ error: "Item not found" });

  const { email, name, price } = rows[0];

  const { rows: users } = await pool.query(
    'SELECT name, contact, city, address FROM users WHERE email = $1',
    [email]
  );
  const user = users[0];

  await pool.query(
    'UPDATE cart_items SET status = $1 WHERE id = $2',
    ["ordered", item_id]
  );

  await notifyAdminOrder({
    email,
    user,
    items: [{ name, price }],
    total: Number(price),
    orderId: `single-item-${item_id}`
  });

  res.json({ success: true });
});

app.post('/order/confirm', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: "Email required" });

  // 1. Получить данные пользователя
  const { rows: users } = await pool.query(
    'SELECT name, contact, city, address FROM users WHERE email = $1',
    [email]
  );
  const user = users[0];
  
  const { rows: cartItems } = await pool.query(
    `SELECT ci.item_id, i.price, i.name 
     FROM cart_items ci 
     JOIN items i ON ci.item_id = i.id 
     WHERE ci.email = $1 AND ci.status = 'in_cart'`,
    [email]
  );
  if (!cartItems.length) return res.status(400).json({ error: "Cart is empty" });

  const orderRes = await pool.query(
    'INSERT INTO orders (email) VALUES ($1) RETURNING id', [email]
  );
  const orderId = orderRes.rows[0].id;

  for (const item of cartItems) {
    await pool.query(
      'INSERT INTO order_items (order_id, item_id, price) VALUES ($1, $2, $3)',
      [orderId, item.item_id, item.price]
    );
  }

  await pool.query(
    'UPDATE cart_items SET status = $1 WHERE email = $2 AND status = $3',
    ["ordered", email, "in_cart"]
  );

  await notifyAdminOrder({
    email,
    user,
    items: cartItems,
    total: cartItems.reduce((sum, item) => sum + Number(item.price), 0),
    orderId
  });

  res.json({ success: true, orderId });
});

app.get('/orders', async (req, res) => {
  const email = req.query.email;
  if (!email) return res.status(400).json({ error: "Email required" });
  const { rows } = await pool.query(
    `SELECT items.name, items.price, items.location, cart_items.id, cart_items.status, cart_items.created_at
     FROM cart_items 
     JOIN items ON cart_items.item_id = items.id 
     WHERE cart_items.email = $1 AND cart_items.status = 'ordered'
     ORDER BY cart_items.created_at DESC`,
    [email]
  );
  res.json(rows);
});

app.post('/orders/cancel', async (req, res) => {
  const { id, email } = req.body;
  if (!id || !email) return res.status(400).json({ error: "ID and email required" });

  const { rows: orderRows } = await pool.query(
    `SELECT ci.item_id, i.name, i.price
     FROM cart_items ci
     JOIN items i ON ci.item_id = i.id
     WHERE ci.id = $1 AND ci.email = $2 AND ci.status = 'ordered'`,
    [id, email]
  );
  if (!orderRows.length) return res.status(404).json({ error: "Order not found" });

  const { rows: userRows } = await pool.query(
    'SELECT name, contact, city, address FROM users WHERE email = $1',
    [email]
  );
  const user = userRows[0];

  // Помечаем заказ как cancelled
  await pool.query(
    'UPDATE cart_items SET status = $1 WHERE id = $2 AND email = $3',
    ["cancelled", id, email]
  );
  
  await notifyAdminOrder({
    email,
    user,
    items: orderRows,
    total: orderRows.reduce((sum, item) => sum + Number(item.price), 0),
    orderId: id,
    cancelled: true
  });

  res.json({ success: true });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log('API listening on ' + PORT));
