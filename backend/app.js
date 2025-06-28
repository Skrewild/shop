require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const app = express();
const fileUpload = require('express-fileupload');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'DELETE', 'PUT', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.options('*', cors());

app.use(express.json());
app.use(fileUpload());
app.use('/products', express.static(path.join(__dirname, 'products')));

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
  const { rows } = await pool.query('SELECT id, name, price, location FROM items WHERE is_deleted = false');
  res.json(rows);
});

app.get('/cart', async (req, res) => {
  const email = req.query.email;
  if (!email) return res.status(400).json({ error: "Email required" });

  const { rows } = await pool.query(
    `SELECT cart_items.id, items.name, items.price
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

app.delete('/cart/:id', async (req, res) => {
  const id = req.params.id;
  await pool.query('DELETE FROM cart_items WHERE id = $1', [id]);
  res.json({ success: true });
});

app.post('/cart/confirm', async (req, res) => {
  const { item_id } = req.body;
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

  const { rows: users } = await pool.query(
    'SELECT name, contact, city, address FROM users WHERE email = $1',
    [email]
  );
  const user = users[0];
  
  const { rows: cartItems } = await pool.query(
    `SELECT ci.item_id, i.price, i.name, i.location 
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
    `SELECT items.name, items.price, cart_items.id, cart_items.status, cart_items.created_at
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
    `SELECT ci.item_id, i.name, i.price, i.location
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

app.post('/products/add', async (req, res) => {
  const { name, price, location } = req.body;
  if (!name || !price || !location) {
    return res.status(400).json({ error: "All fields required" });
  }
  if (isNaN(Number(price)) || Number(price) <= 0) {
    return res.status(400).json({ error: "Invalid price" });
  }
  await pool.query(
    'INSERT INTO items (name, price, location) VALUES ($1, $2, $3)',
    [name, price, location]
  );
  res.json({ success: true });
});

app.delete('/products/:id', async (req, res) => {
  if (req.headers['x-admin-secret'] !== process.env.ADMIN_SECRET) {
    return res.status(403).json({ error: "Not authorized" });
  }
  const { id } = req.params;
  await pool.query('UPDATE items SET is_deleted = true WHERE id = $1', [id]);
  res.json({ success: true });
});

app.put('/products/:id', async (req, res) => {
  if (req.headers['x-admin-secret'] !== process.env.ADMIN_SECRET) {
    return res.status(403).json({ error: "Not authorized" });
  }
  const { id } = req.params;
  const { name, price, location } = req.body;
  if (!name || !price || !location) {
    return res.status(400).json({ error: "All fields required" });
  }
  await pool.query(
    'UPDATE items SET name = $1, price = $2, location = $3 WHERE id = $4',
    [name, price, location, id]
  );
  res.json({ success: true });
});

app.get('/admin/orders', async (req, res) => {
  if (req.headers['x-admin-secret'] !== process.env.ADMIN_SECRET) {
    return res.status(403).json({ error: "Not authorized" });
  }
  const q = `
    SELECT ci.id, u.name, u.email, u.contact, u.city, u.address, i.name AS product_name, i.price, ci.created_at
    FROM cart_items ci
    JOIN users u ON ci.email = u.email
    JOIN items i ON ci.item_id = i.id
    WHERE ci.status = 'ordered'
    ORDER BY ci.created_at DESC
  `;
  const { rows } = await pool.query(q);
  res.json(rows);
});

app.delete('/admin/orders/:id', async (req, res) => {
  if (req.headers['x-admin-secret'] !== process.env.ADMIN_SECRET) {
    return res.status(403).json({ error: "Not authorized" });
  }
  const { id } = req.params;
  await pool.query('DELETE FROM cart_items WHERE id = $1 AND status = $2', [id, "ordered"]);
  res.json({ success: true });
});

app.post('/upload', async (req, res) => {
  if (!req.files || !req.files.image) {
    return res.status(400).json({ error: "No image file provided" });
  }

  const image = req.files.image;
  const ext = path.extname(image.name);
  const filename = uuidv4() + ext;
  const filepath = path.join(__dirname, 'products', filename);

  try {
    await image.mv(filepath);
    res.json({ success: true, location: `products/${filename}` });
  } catch (err) {
    res.status(500).json({ error: "Upload failed", detail: err.message });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log('API listening on ' + PORT));
