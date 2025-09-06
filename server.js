// server.js (backend raíz)
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const db = require('./src/db'); // mysql2/promise (pool)

const app = express();

// --- logger simple para depurar ---
app.use((req, _, next) => {
  console.log(`[REQ] ${req.method} ${req.originalUrl}`);
  next();
});

console.log('▷ Cargando server.js desde:', __filename);

app.use(cors({ origin: 'http://localhost:3000' }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/* =========================
   Helpers de fecha
========================= */
function toYYYYMMDD(s) {
  if (!s) return '';
  const str = String(s).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str; // ya viene yyyy-mm-dd
  const m = str.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
  if (!m) return '';
  const d = m[1].padStart(2, '0');
  const M = m[2].padStart(2, '0');
  let Y = m[3];
  if (Y.length === 2) Y = (parseInt(Y, 10) > 50 ? '19' : '20') + Y;
  return `${Y}-${M}-${d}`;
}

const ymd = (d) =>
  new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);

const sundayOf = (dateLike) => {
  const d = new Date(dateLike);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - d.getDay()); // 0=domingo
  return d;
};

/* ============ RUTAS ============ */

// Health
app.get('/health', (_, res) => res.send('OK'));
app.get('/api/health', (_, res) => res.send('OK'));

// 🔐 LOGIN robusto
app.post('/api/login', async (req, res) => {
  try {
    let { cedula, fecha_nacimiento } = req.body || {};
    if (!cedula || !fecha_nacimiento) {
      return res.status(400).json({ ok: false, msg: 'Faltan datos' });
    }

    cedula = String(cedula).trim();
    const fecha = toYYYYMMDD(fecha_nacimiento); // → '1976-12-18'
    if (!fecha) return res.status(400).json({ ok: false, msg: 'Fecha inválida' });

    console.log('[LOGIN] body:', { cedula, fecha });

    const sql = `
      SELECT id, cedula, nombre, apellido, fecha_nacimiento
      FROM agentes
      WHERE TRIM(cedula) = ?
        AND (
          STR_TO_DATE(TRIM(fecha_nacimiento), '%d/%m/%Y') = ?
          OR TRIM(fecha_nacimiento) = ?
          OR DATE(fecha_nacimiento) = ?
        )
      LIMIT 1
    `;
    const [rows] = await db.execute(sql, [cedula, fecha, fecha, fecha]);

    console.log('[LOGIN] filas encontradas =', rows.length);

    if (rows.length === 0) {
      return res.status(401).json({ ok: false, msg: 'Credenciales inválidas' });
    }
    res.json({ ok: true, agente: rows[0] });
  } catch (err) {
    console.error('SQL /api/login', err);
    res.status(500).json({ ok: false, msg: 'Error DB' });
  }
});

/* ==========================================================
   GET /api/turnos
   - Devuelve la semana ACTUAL (domingo→sábado) del agente.
   - Si no hay datos en la semana actual, hace FALLBACK a la
     última semana que tenga datos para ese agente.
========================================================== */
app.get('/api/turnos', async (req, res) => {
  try {
    const { cedula } = req.query;
    if (!cedula) return res.status(400).json({ ok: false, msg: 'Falta cédula' });

    // 1) Semana actual (domingo→sábado)
    let [rows] = await db.execute(
      `
      SELECT fecha, hora_inicio, hora_fin, tipo, sede, area, estado
      FROM turnos
      WHERE cedula = ?
        AND YEARWEEK(fecha, 0) = YEARWEEK(CURDATE(), 0)
      ORDER BY fecha, hora_inicio
    `,
      [String(cedula).trim()]
    );

    if (rows.length) {
      return res.json({ ok: true, turno_semana: 'actual', turnos: rows });
    }

    // 2) Fallback: última semana con datos
    const [[maxRow]] = await db.execute(
      `SELECT MAX(fecha) AS max_fecha FROM turnos WHERE cedula = ?`,
      [String(cedula).trim()]
    );

    if (!maxRow?.max_fecha) {
      return res.json({ ok: true, turno_semana: 'actual', turnos: [] });
    }

    const max = new Date(maxRow.max_fecha);
    const start = sundayOf(max);
    const end = new Date(start);
    end.setDate(start.getDate() + 7);

    const desde = ymd(start);
    const hastaExcl = ymd(end);

    ;[rows] = await db.execute(
      `
      SELECT fecha, hora_inicio, hora_fin, tipo, sede, area, estado
      FROM turnos
      WHERE cedula = ?
        AND fecha >= ?
        AND fecha <  ?
      ORDER BY fecha, hora_inicio
    `,
      [String(cedula).trim(), desde, hastaExcl]
    );

    return res.json({
      ok: true,
      turno_semana: 'ultima',
      rango: { desde, hasta: hastaExcl },
      turnos: rows,
    });
  } catch (err) {
    console.error('SQL /api/turnos', err);
    res.status(500).json({ ok: false, msg: 'Error DB' });
  }
});

/* ==========================================================
   GET /api/turnos/dia?cedula=...&fecha=YYYY-MM-DD
   - Devuelve los turnos de un agente para un DÍA específico.
========================================================== */
app.get('/api/turnos/dia', async (req, res) => {
  try {
    const { cedula, fecha } = req.query;
    if (!cedula || !fecha) {
      return res.status(400).json({ ok: false, msg: 'Faltan parámetros cedula y fecha' });
    }

    const f = toYYYYMMDD(fecha);
    if (!f) return res.status(400).json({ ok: false, msg: 'Fecha inválida (use YYYY-MM-DD)' });

    const [rows] = await db.execute(
      `
      SELECT fecha, hora_inicio, hora_fin, tipo, sede, area, estado
      FROM turnos
      WHERE cedula = ? AND fecha = ?
      ORDER BY hora_inicio
      `,
      [String(cedula).trim(), f]
    );

    res.json({ ok: true, fecha: f, turnos: rows });
  } catch (e) {
    console.error('GET /api/turnos/dia', e);
    res.status(500).json({ ok: false, msg: 'Error DB' });
  }
});

/* ==========================================================
   GET /api/turnos/semana-dom?cedula=...&inicio=YYYY-MM-DD
   - Devuelve la semana domingo→sábado empezando en 'inicio'.
   - Si 'inicio' no va, usa la semana de HOY.
========================================================== */
app.get('/api/turnos/semana-dom', async (req, res) => {
  try {
    const { cedula, inicio } = req.query;
    if (!cedula) return res.status(400).json({ ok: false, msg: 'Falta parámetro cedula' });

    const base = inicio ? new Date(inicio) : new Date();
    if (isNaN(base)) return res.status(400).json({ ok: false, msg: 'inicio inválido' });

    const start = sundayOf(base);
    const end = new Date(start);
    end.setDate(start.getDate() + 7);

    const desde = ymd(start);
    const hastaExcl = ymd(end);

    const [rows] = await db.execute(
      `
      SELECT fecha, hora_inicio, hora_fin, tipo, sede, area, estado
      FROM turnos
      WHERE cedula = ?
        AND fecha >= ?
        AND fecha <  ?
      ORDER BY fecha, hora_inicio
    `,
      [String(cedula).trim(), desde, hastaExcl]
    );

    res.json({ ok: true, rango: { desde, hasta: hastaExcl }, turnos: rows });
  } catch (e) {
    console.error('GET /api/turnos/semana-dom', e);
    res.status(500).json({ ok: false, msg: 'Error DB' });
  }
});

/* ==========================================================
   GET /api/turnos/rango?cedula=...&desde=YYYY-MM-DD&hasta=YYYY-MM-DD
   - Devuelve todos los turnos entre 'desde' y 'hasta' (INCLUSIVO).
========================================================== */
app.get('/api/turnos/rango', async (req, res) => {
  try {
    const { cedula, desde, hasta } = req.query;
    if (!cedula) return res.status(400).json({ ok: false, msg: 'Falta parámetro cedula' });
    if (!desde || !hasta) return res.status(400).json({ ok: false, msg: 'Faltan desde/hasta' });

    // Validación simple de fecha
    const iso = (s) => /^\d{4}-\d{2}-\d{2}$/.test(String(s).trim());
    if (!iso(desde) || !iso(hasta)) {
      return res.status(400).json({ ok: false, msg: 'Fechas inválidas (use YYYY-MM-DD)' });
    }

    // Opcional: controla rangos demasiado grandes y consistencia
    const d1 = new Date(desde), d2 = new Date(hasta);
    if (isNaN(d1) || isNaN(d2) || d1 > d2) {
      return res.status(400).json({ ok: false, msg: 'Rango de fechas inválido' });
    }

    const [rows] = await db.execute(
      `
      SELECT fecha, hora_inicio, hora_fin, tipo, sede, area, estado
      FROM turnos
      WHERE cedula = ?
        AND fecha >= ?
        AND fecha <= ?
      ORDER BY fecha, hora_inicio
      `,
      [String(cedula).trim(), desde, hasta]
    );

    res.json({ ok: true, rango: { desde, hasta }, turnos: rows });
  } catch (e) {
    console.error('GET /api/turnos/rango', e);
    res.status(500).json({ ok: false, msg: 'Error DB' });
  }
});

/* ---- deja SIEMPRE el 404 al final ---- */
app.use((req, res) => {
  console.warn(`[404] ${req.method} ${req.originalUrl}`);
  res.status(404).send('Not Found');
});

/* ===== Exporta app (start.js hace el .listen) ===== */
module.exports = { app };
