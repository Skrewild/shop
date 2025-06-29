const pool = require('../models/db');

exports.getCart = async (req, res) => {
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
};

exports.addToCart = async (req, res) => {
  const { item_id, email } = req.body;
  if (!item_id || !email) return res.status(400).json({ error: "item_id and email required" });
  const { rows: users } = await pool.query('SELECT 1 FROM users WHERE email = $1', [email]);
  if (users.length === 0) return res.status(403).json({ error: "User not found" });
  await pool.query(
    'INSERT INTO cart_items (email, item_id, status) VALUES ($1, $2, $3)',
    [email, item_id, "in_cart"]
  );
  res.json({ success: true });
};

exports.removeFromCart = async (req, res) => {
  const id = req.params.id;
  await pool.query('DELETE FROM cart_items WHERE id = $1', [id]);
  res.json({ success: true });
};
