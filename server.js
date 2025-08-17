// server.js (raíz del proyecto)
// Backend: Node/Express + mysql2/promise
const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');

const app = express();
app.use(cors({ origin: ['http://localhost:3000'] }));
app.use(express.json());

// ---------- DB ----------
const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'turnos_trabajo',   // <-- tu BD según phpMyAdmin
  port: 3306,
  connectionLimit: 10
});

// ---------- helpers ----------
function toYYYYMMDD(input) {
  if (!input) return null;
  const s = String(input).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;                // YYYY-MM-DD
  const m = s.match(/^(\d{2})[\/-](\d{2})[\/-](\d{4})$/);     // DD/MM/YYYY o DD-MM-YYYY
  if (!m) return null;
  return `${m[3]}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}`;
}

// ---------- health ----------
app.get('/api/health', async (_req, res) => {
  try { await pool.query('SELECT 1'); res.json({ ok: true, db: 'up' }); }
  catch (e) { res.status(500).json({ ok: false, db: 'down', error: e.message }); }
});

// ---------- login ----------
app.post('/api/login', async (req, res) => {
  try {
    let { cedula, fecha_nacimiento } = req.body ?? {};
    console.log('POST /api/login body:', req.body);

    if (!cedula || !fecha_nacimiento) {
      return res.status(400).json({ ok: false, message: 'Faltan datos' });
    }
    const fecha = toYYYYMMDD(fecha_nacimiento);
    if (!fecha) return res.status(400).json({ ok: false, message: 'Fecha inválida' });

    // columnas reales de tu tabla agentes (ver captura)
    const [rows] = await pool.execute(
      `SELECT
          cedula,
          nombre       AS nombres,
          apellido     AS apellidos,
          tipo_turno   AS turno,
          fecha_turno,
          hora_inicio,
          hora_fin,
          sede,
          area,
          estado
        FROM agentes
        WHERE cedula = ? AND fecha_nacimiento = ?
        LIMIT 1`,
      [String(cedula), fecha]
    );

    if (rows.length === 0) {
      return res.status(401).json({ ok: false, message: 'Credenciales inválidas' });
    }

    return res.json({ ok: true, agente: rows[0] });
  } catch (err) {
    console.error('ERROR /api/login =>', err);
    res.status(500).json({ ok: false, message: 'Error interno' });
  }
});

// ---------- puerto API (NO usar 8012) ----------
const PORT = 5000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 API en http://localhost:${PORT}`);
});
