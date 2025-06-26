const pool = require('../models/db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const secret = 'jwt_secret';

exports.register = async (req, res) => {
  const { name, email, password, contact, city, address } = req.body;
  const hashed = await bcrypt.hash(password, 10);
  await pool.query(
    'INSERT INTO users (name, email, password, contact, city, address) VALUES (?, ?, ?, ?, ?, ?)',
    [name, email, hashed, contact, city, address]
  );
  res.status(201).json({ message: 'Registered' });
};

exports.login = async (req, res) => {
  const { email, password } = req.body;
  const [[user]] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
  if (!user) return res.status(400).json({ message: 'User not found' });
  const valid = await bcrypt.compare(password, user.password);
  if (!valid) return res.status(400).json({ message: 'Wrong password' });
  const token = jwt.sign({ email: user.email, name: user.name }, secret, { expiresIn: '24h' });
  res.json({ token, name: user.name });
};
