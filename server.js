// server.js
const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');

const app = express();

// Si usas el proxy del frontend (http://localhost:3000) esto está bien
app.use(cors({ origin: 'http://localhost:3000' }));
app.use(express.json());

// Usa un puerto distinto a Apache/phpMyAdmin (que suelen usar 8012)
const PORT = 8013;

// Conexión MySQL (XAMPP)
const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '',                // por defecto en XAMPP
  database: 'turnos_trabajo',
  port: 3306,
  dateStrings: true            // fechas como 'YYYY-MM-DD'
});

db.connect(err => {
  if (err) { console.error('❌ MySQL:', err); return; }
  console.log('✅ Conectado a MySQL');
});

// Normaliza a YYYY-MM-DD (acepta dd/mm/aaaa o dd-mm-aaaa)
function toYYYYMMDD(s) {
  if (!s) return '';
  const str = String(s).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
  const m = str.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
  if (!m) return '';
  const d = m[1].padStart(2, '0');
  const M = m[2].padStart(2, '0');
  let Y = m[3];
  if (Y.length === 2) Y = (parseInt(Y,10) > 50 ? '19' : '20') + Y;
  return `${Y}-${M}-${d}`;
}

// 🔐 Login: valida cédula + fecha_nacimiento en 'agentes'
app.post('/api/login', (req, res) => {
  const { cedula, fecha_nacimiento } = req.body || {};
  const fechaNorm = toYYYYMMDD(fecha_nacimiento);

  if (!cedula || !fechaNorm) {
    return res.status(400).json({ ok:false, msg:'Faltan datos' });
  }

  const sql = `
    SELECT id, cedula, nombre, apellido, fecha_nacimiento
    FROM agentes
    WHERE cedula = ? AND fecha_nacimiento = ?
    LIMIT 1
  `;
  db.query(sql, [cedula, fechaNorm], (err, rows) => {
    if (err) { console.error('SQL /api/login', err); return res.status(500).json({ ok:false, msg:'Error DB' }); }
    if (rows.length === 0) return res.status(401).json({ ok:false, msg:'Credenciales inválidas' });
    res.json({ ok:true, agente: rows[0] });
  });
});

// 📅 Turnos por cédula (MISMA TABLA 'agentes')
app.get('/api/turnos', (req, res) => {
  const { cedula } = req.query;
  if (!cedula) return res.status(400).json({ ok:false, msg:'Falta cédula' });

  const sql = `
    SELECT id, fecha_turno, hora_inicio, hora_fin, tipo_turno, sede, area, estado
    FROM agentes
    WHERE cedula = ?
    ORDER BY fecha_turno DESC
    LIMIT 50
  `;
  db.query(sql, [cedula], (err, rows) => {
    if (err) { console.error('SQL /api/turnos', err); return res.status(500).json({ ok:false, msg:'Error DB' }); }
    res.json({ ok:true, turnos: rows });
  });
});

// Healthcheck
app.get('/health', (_, res) => res.send('OK'));

app.listen(PORT, () => {
  console.log(`🚀 API escuchando en http://localhost:${PORT}`);
  console.log(`🩺 Healthcheck: http://localhost:${PORT}/health`);
});
