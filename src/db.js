// src/db.js
const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: '',                 // XAMPP por defecto
  database: 'turnos_trabajo',   // tu BD
  port: 3306,
  waitForConnections: true,
  connectionLimit: 10
});

module.exports = pool;

