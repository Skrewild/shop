require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fileUpload = require('express-fileupload');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const ExcelJS = require('exceljs');

const app = express();
const pool = require('./models/db');
const { notifyAdminOrder } = require('./telegram');

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'DELETE', 'PUT', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.options('*', cors());
app.use(express.json());
app.use(fileUpload());
app.use('/products', express.static(path.join(__dirname, 'products')));

app.use('/auth', require('./routes/auth'));
app.use('/cart', require('./routes/cart'));
app.use('/orders', require('./routes/orders'));
app.use('/upload', require('./routes/upload'));
app.use('/products', require('./routes/products'));

app.post('/products/add', async (req, res) => {
  const { name, price, location, stock } = req.body;
  if (!name || !price || !location || stock === undefined) {
    return res.status(400).json({ error: "All fields required" });
  }
  if (isNaN(Number(price)) || Number(price) <= 0) {
    return res.status(400).json({ error: "Invalid price" });
  }
  if (isNaN(Number(stock)) || Number(stock) < 0) {
    return res.status(400).json({ error: "Invalid stock" });
  }
  await pool.query(
    'INSERT INTO items (name, price, location, stock) VALUES ($1, $2, $3, $4)',
    [name, price, location, stock]
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

app.get('/admin/orders/waiting', async (req, res) => {
  if (req.headers['x-admin-secret'] !== process.env.ADMIN_SECRET) {
    return res.status(403).json({ error: "Not authorized" });
  }
  const q = `
    SELECT ci.id, u.name, u.email, u.contact, u.city, u.address, i.name AS product_name, i.price, ci.created_at
    FROM cart_items ci
    JOIN users u ON ci.email = u.email
    JOIN items i ON ci.item_id = i.id
    WHERE ci.status = 'waiting'
    ORDER BY ci.created_at DESC
  `;
  const { rows } = await pool.query(q);
  res.json(rows);
});

app.post('/admin/orders/confirm/:id', async (req, res) => {
  if (req.headers['x-admin-secret'] !== process.env.ADMIN_SECRET) {
    return res.status(403).json({ error: "Not authorized" });
  }
  const id = req.params.id;
  const { rows } = await pool.query(
    `SELECT ci.item_id, i.stock
     FROM cart_items ci
     JOIN items i ON ci.item_id = i.id
     WHERE ci.id = $1 AND ci.status = 'waiting'`,
    [id]
  );
  if (!rows.length) return res.status(404).json({ error: "Order not found or already confirmed" });

  const { item_id, stock } = rows[0];
  if (stock <= 0) {
    return res.status(400).json({ error: "Not enough stock" });
  }

  await pool.query('UPDATE items SET stock = stock - 1 WHERE id = $1', [item_id]);
  await pool.query('UPDATE cart_items SET status = $1 WHERE id = $2', ["ordered", id]);

  res.json({ success: true });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log('API listening on ' + PORT));
