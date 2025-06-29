const pool = require('../models/db');
const bcrypt = require('bcrypt');

exports.register = async (req, res) => {
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
};

exports.login = async (req, res) => {
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
};
