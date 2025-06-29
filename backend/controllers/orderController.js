const pool = require('../models/db');
const { notifyAdminOrder } = require('../telegram');

exports.confirmSingleCart = async (req, res) => {
  const { item_id } = req.body;
  const { rows } = await pool.query(
    `SELECT ci.email, i.name, i.price, i.stock
     FROM cart_items ci
     JOIN items i ON ci.item_id = i.id
     WHERE ci.id = $1`,
    [item_id]
  );
  if (!rows.length) return res.status(404).json({ error: "Item not found" });

  const { email, name, price, stock } = rows[0];

  if (stock <= 0) {
    return res.status(400).json({ error: "Run out of this product" });
  }

  const { rows: users } = await pool.query(
    'SELECT name, contact, city, address FROM users WHERE email = $1',
    [email]
  );
  const user = users[0];

  await pool.query(
    'UPDATE cart_items SET status = $1 WHERE id = $2',
    ["waiting", item_id]
  );

  await notifyAdminOrder({
    email,
    user,
    items: [{ name, price }],
    total: Number(price),
    orderId: `single-item-${item_id}`
  });

  res.json({ success: true });
};

exports.confirmOrder = async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: "Email required" });

  const { rows: users } = await pool.query(
    'SELECT name, contact, city, address FROM users WHERE email = $1',
    [email]
  );
  const user = users[0];

  const { rows: cartItems } = await pool.query(
    `SELECT ci.item_id, i.price, i.name, i.location, i.stock, COUNT(*) AS quantity
     FROM cart_items ci
     JOIN items i ON ci.item_id = i.id
     WHERE ci.email = $1 AND ci.status = 'in_cart'
     GROUP BY ci.item_id, i.price, i.name, i.location, i.stock`,
    [email]
  );

  if (!cartItems.length) return res.status(400).json({ error: "Cart is empty" });

  for (const item of cartItems) {
    const { rows: reservedRows } = await pool.query(
      `SELECT COUNT(*) FROM cart_items WHERE item_id = $1 AND status = 'waiting'`,
      [item.item_id]
    );
    const reserved = Number(reservedRows[0].count);

    if (item.stock - reserved < item.quantity) {
      return res.status(400).json({ error: `Not enough stock for "${item.name}". Requested: ${item.quantity}, available: ${item.stock - reserved}` });
    }
  }

  const orderRes = await pool.query(
    'INSERT INTO orders (email) VALUES ($1) RETURNING id', [email]
  );
  const orderId = orderRes.rows[0].id;

  for (const item of cartItems) {
    await pool.query(
      'INSERT INTO order_items (order_id, item_id, price, quantity) VALUES ($1, $2, $3, $4)',
      [orderId, item.item_id, item.price, item.quantity]
    );
  }

  await pool.query(
    'UPDATE cart_items SET status = $1 WHERE email = $2 AND status = $3',
    ["waiting", email, "in_cart"]
  );

  await notifyAdminOrder({
    email,
    user,
    items: cartItems,
    total: cartItems.reduce((sum, item) => sum + Number(item.price) * Number(item.quantity), 0),
    orderId
  });

  res.json({ success: true, orderId });
};

exports.getOrders = async (req, res) => {
  const email = req.query.email;
  if (!email) return res.status(400).json({ error: "Email required" });

  const { rows } = await pool.query(
    `SELECT items.name, items.price, cart_items.id, cart_items.status, cart_items.created_at
     FROM cart_items 
     JOIN items ON cart_items.item_id = items.id 
     WHERE cart_items.email = $1 
       AND cart_items.status IN ('waiting', 'ordered')
     ORDER BY cart_items.created_at DESC`,
    [email]
  );

  res.json(rows);
};

exports.cancelOrder = async (req, res) => {
  const { id, email } = req.body;
  if (!id || !email) return res.status(400).json({ error: "ID and email required" });

  const { rows: orderRows } = await pool.query(
    `SELECT ci.item_id, i.name, i.price, i.location, ci.status
     FROM cart_items ci
     JOIN items i ON ci.item_id = i.id
     WHERE ci.id = $1 AND ci.email = $2 AND ci.status = 'waiting'`,
    [id, email]
  );

  if (!orderRows.length) return res.status(404).json({ error: "Order not found or already processed" });

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
};
