const pool = require('../models/db');

exports.getAll = async (req, res) => {
  const { rows } = await pool.query(
    'SELECT id, name, price, location, stock FROM items WHERE is_deleted = false AND stock > 0'
  );
  res.json(rows);
};
