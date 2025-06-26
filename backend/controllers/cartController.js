const pool = require('../models/db');

exports.addToCart = async (req, res) => {
  const email = req.user.email;
  const { item_id } = req.body;
  await pool.query(
    'INSERT INTO cart_items (email, item_id, status) VALUES (?, ?, "in_cart")',
    [email, item_id]
  );
  res.json({ message: 'Item added' });
};

exports.getCart = async (req, res) => {
  const email = req.user.email;
  const [rows] = await pool.query(
    `SELECT ci.*, i.name, i.price, i.location FROM cart_items ci 
    JOIN items i ON ci.item_id = i.id 
    WHERE ci.email = ? AND ci.status = "in_cart"`,
    [email]
  );
  res.json(rows);
};

exports.removeFromCart = async (req, res) => {
  const email = req.user.email;
  const { item_id } = req.body;
  await pool.query(
    'DELETE FROM cart_items WHERE email = ? AND item_id = ? AND status = "in_cart"',
    [email, item_id]
  );
  res.json({ message: 'Removed' });
};

exports.confirmOrder = async (req, res) => {
  const email = req.user.email;
  const { item_id } = req.body;
  await pool.query(
    'UPDATE cart_items SET status = "ordered" WHERE email = ? AND item_id = ? AND status = "in_cart"',
    [email, item_id]
  );
  res.json({ message: 'Order confirmed' });
};
