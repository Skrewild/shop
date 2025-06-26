const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: 'Asdffd1!',
  database: 'shop',
});

module.exports = pool;
