const pool = require('../models/db');

exports.getAll = async (req, res) => {
  const [rows] = await pool.query('SELECT * FROM items');
  res.json(rows);
};
