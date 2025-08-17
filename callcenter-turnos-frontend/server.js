// server.js
const express = require('express');
const cors = require('cors');
const mysql = require('mysql2');

const app = express();
app.use(cors({ origin: ['http://localhost:3000'] }));
app.use(express.json());

// ===== LOG de qué archivo estás ejecutando (evita confundir 2 server.js)
console.log('Usando server.js desde:', __filename);

// MySQL (XAMPP)
const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'turnos_trabajo',
  port: 3306
});

db.connect(err => {
  if (err) console.error('❌ MySQL:', err.message);
  else console.log('✅ Conectado a MySQL (BD: turnos_trabajo, puerto 3306)');
});

// util: normalizar fecha
function toYYYYMMDD(input) {
  if (!input) return null;
  const s = String(input).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const m = s.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/);
  if (!m) return null;
  const d = m[1].padStart(2, '0');
  const mo = m[2].padStart(2, '0');
  const y = m[3];
  return `${y}-${mo}-${d}`;
}

// health
app.get('/api/health', (req, res) => {
  db.ping(err => res.json({ ok: !err, db: err ? 'down' : 'up' }));
});

// login
app.post('/api/login', (req, res) => {
  // ===== LOG del body recibido (para ver qué llega desde el frontend)
  console.log('POST /api/login body:', req.body);

  const { cedula, fecha_nacimiento } = req.body || {};
  if (!cedula || !fecha_nacimiento) {
    return res.status(400).json({ ok: false, message: 'Faltan datos' });
  }
  const fecha = toYYYYMMDD(fecha_nacimiento);
  if (!fecha) return res.status(400).json({ ok: false, message: 'Fecha inválida' });

  const sql = `
    SELECT cedula, nombres, apellidos, turno
    FROM agentes
    WHERE cedula = ? AND fecha_nacimiento = ?
    LIMIT 1
  `;
  db.execute(sql, [cedula, fecha], (err, rows) => {
    if (err) {
      console.error('SQL error:', err);   // ===== LOG de error SQL
      return res.status(500).json({ ok: false, message: 'Error BD' });
    }
    if (!rows || rows.length === 0) {
      return res.status(401).json({ ok: false, message: 'Credenciales inválidas' });
    }
    return res.json({ ok: true, agente: rows[0] });
  });
});

const PORT = 5000; // API en 5000 (Apache usa 8012)
app.listen(PORT, () => console.log(`🚀 API en http://localhost:${PORT}`));
