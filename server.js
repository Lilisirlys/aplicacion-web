// server.js (exporta app; start.js hace el .listen)
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const db = require("./src/db");

const app = express();
const DB = (process.env.DB_NAME || "turnos_demo").replace(/[^\w$]/g, "");

// ───────────────────────── Logs útiles ─────────────────────────
app.use((req, _res, next) => { console.log(`[REQ] ${req.method} ${req.originalUrl}`); next(); });

// ──────────────────────── Middlewares base ─────────────────────
app.use(cors({ origin: process.env.CORS_ORIGIN || "http://localhost:3000" }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ─────────────────────────── Helpers ───────────────────────────
const toYYYYMMDD = (s) => {
  if (!s) return "";
  const str = String(s).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
  const m = str.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
  if (!m) return "";
  const d = m[1].padStart(2, "0");
  const M = m[2].padStart(2, "0");
  let Y = m[3];
  if (Y.length === 2) Y = (parseInt(Y, 10) > 50 ? "19" : "20") + Y;
  return `${Y}-${M}-${d}`;
};
const ymd = (d) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
const sundayOf = (dateLike) => { const d = new Date(dateLike); d.setHours(0,0,0,0); d.setDate(d.getDate() - d.getDay()); return d; };
const fmtDate = (v) => (v instanceof Date ? v.toISOString().slice(0,10) : (v || null));

// ───────────────────────── Healthcheck ─────────────────────────
app.get("/api/health", async (_req, res) => {
  const [r] = await db.execute("SELECT DATABASE() AS db");
  res.json({ ok: true, db: r[0]?.db });
});

/* ================= LOGIN =================
   Valida cédula + fecha_nacimiento (YYYY-MM-DD)
   Tabla: DB.agentes (con nombres/apellidos o genérica)
========================================= */
app.post("/api/login", async (req, res) => {
  try {
    let { cedula, fecha_nacimiento } = req.body || {};
    if (!cedula || !fecha_nacimiento) {
      return res.status(400).json({ ok: false, msg: "Faltan campos: cedula y fecha_nacimiento" });
    }
    cedula = String(cedula).trim();
    const fnac = toYYYYMMDD(fecha_nacimiento);
    if (!fnac) return res.status(400).json({ ok: false, msg: "fecha_nacimiento inválida (use YYYY-MM-DD)" });

    // 1) intento con columnas esperadas
    const q1 = `
      SELECT id, cedula, nombres, apellidos, email, telefono,
             DATE_FORMAT(fecha_nacimiento, '%Y-%m-%d') AS fecha_nacimiento
      FROM \`${DB}\`.\`agentes\`
      WHERE TRIM(cedula) = ? AND fecha_nacimiento = ? AND activo = 1
      LIMIT 1
    `;
    try {
      const [rows] = await db.execute(q1, [cedula, fnac]);
      if (rows.length === 0) return res.status(401).json({ ok: false, msg: "Credenciales inválidas" });
      return res.json({ ok: true, agente: rows[0] });
    } catch (e) {
      // 2) fallback genérico
      const [rows2] = await db.execute(
        `SELECT * FROM \`${DB}\`.\`agentes\`
         WHERE TRIM(cedula) = ? AND fecha_nacimiento = ? AND activo = 1
         LIMIT 1`,
        [cedula, fnac]
      );
      if (rows2.length === 0) return res.status(401).json({ ok: false, msg: "Credenciales inválidas" });
      const a = rows2[0];
      const agente = {
        id: a.id,
        cedula: a.cedula,
        nombres: a.nombres ?? a.nombre ?? "",
        apellidos: a.apellidos ?? a.apellido ?? "",
        email: a.email ?? "",
        telefono: a.telefono ?? "",
        fecha_nacimiento: fmtDate(a.fecha_nacimiento),
      };
      return res.json({ ok: true, agente });
    }
  } catch (err) {
    console.error("SQL /api/login", err);
    res.status(500).json({ ok: false, msg: err.message || "Error DB" });
  }
});

/* ============= TURNOS semana actual o última con datos ============= */
app.get("/api/turnos", async (req, res) => {
  try {
    const { cedula } = req.query;
    if (!cedula) return res.status(400).json({ ok: false, msg: "Falta cédula" });
    const ced = String(cedula).trim();

    // ── Estrategia 1: esquema con JOIN (t.agente_id) ──
    try {
      let [rows] = await db.execute(
        `
        SELECT t.fecha, t.hora_inicio, t.hora_fin, t.tipo
        FROM \`${DB}\`.\`turnos\` t
        JOIN \`${DB}\`.\`agentes\` a ON a.id = t.agente_id
        WHERE TRIM(a.cedula) = ?
          AND YEARWEEK(t.fecha, 0) = YEARWEEK(CURDATE(), 0)
        ORDER BY t.fecha, t.hora_inicio
        `,
        [ced]
      );
      if (rows.length) return res.json({ ok: true, esquema: "join", turno_semana: "actual", turnos: rows });

      const [[maxRow]] = await db.execute(
        `
        SELECT MAX(t.fecha) AS max_fecha
        FROM \`${DB}\`.\`turnos\` t
        JOIN \`${DB}\`.\`agentes\` a ON a.id = t.agente_id
        WHERE TRIM(a.cedula) = ?
        `,
        [ced]
      );
      if (!maxRow?.max_fecha) return res.json({ ok: true, esquema: "join", turno_semana: "actual", turnos: [] });

      const start = sundayOf(maxRow.max_fecha);
      const end = new Date(start); end.setDate(start.getDate() + 7);
      const desde = ymd(start), hastaExcl = ymd(end);

      ;[rows] = await db.execute(
        `
        SELECT t.fecha, t.hora_inicio, t.hora_fin, t.tipo
        FROM \`${DB}\`.\`turnos\` t
        JOIN \`${DB}\`.\`agentes\` a ON a.id = t.agente_id
        WHERE TRIM(a.cedula) = ?
          AND t.fecha >= ? AND t.fecha < ?
        ORDER BY t.fecha, t.hora_inicio
        `,
        [ced, desde, hastaExcl]
      );
      return res.json({ ok: true, esquema: "join", turno_semana: "ultima", rango: { desde, hasta: hastaExcl }, turnos: rows });
    } catch (joinErr) {
      // ── Estrategia 2: esquema directo (turnos.cedula / fecha_turno) ──
      console.warn("Esquema JOIN no disponible, usando esquema directo:", joinErr?.message);
      let [rows] = await db.execute(
        `
        SELECT fecha_turno AS fecha,
               DATE_FORMAT(hora_inicio,'%H:%i') AS hora_inicio,
               DATE_FORMAT(hora_fin,'%H:%i')    AS hora_fin,
               COALESCE(tipo,'TRABAJO') AS tipo
        FROM \`${DB}\`.\`turnos\`
        WHERE TRIM(cedula)=? AND YEARWEEK(fecha_turno,0)=YEARWEEK(CURDATE(),0)
        ORDER BY fecha_turno, hora_inicio
        `,
        [ced]
      );
      if (rows.length) return res.json({ ok: true, esquema: "directo", turno_semana: "actual", turnos: rows });

      const [[maxRow]] = await db.execute(
        `SELECT MAX(fecha_turno) AS max_fecha FROM \`${DB}\`.\`turnos\` WHERE TRIM(cedula)=?`,
        [ced]
      );
      if (!maxRow?.max_fecha) return res.json({ ok: true, esquema: "directo", turno_semana: "actual", turnos: [] });

      const start = sundayOf(maxRow.max_fecha);
      const end = new Date(start); end.setDate(start.getDate() + 7);
      const desde = ymd(start), hastaExcl = ymd(end);

      ;[rows] = await db.execute(
        `
        SELECT fecha_turno AS fecha,
               DATE_FORMAT(hora_inicio,'%H:%i') AS hora_inicio,
               DATE_FORMAT(hora_fin,'%H:%i')    AS hora_fin,
               COALESCE(tipo,'TRABAJO') AS tipo
        FROM \`${DB}\`.\`turnos\`
        WHERE TRIM(cedula)=? AND fecha_turno >= ? AND fecha_turno < ?
        ORDER BY fecha_turno, hora_inicio
        `,
        [ced, desde, hastaExcl]
      );
      return res.json({ ok: true, esquema: "directo", turno_semana: "ultima", rango: { desde, hasta: hastaExcl }, turnos: rows });
    }
  } catch (err) {
    console.error("SQL /api/turnos", err);
    res.status(500).json({ ok: false, msg: err.message || "Error DB" });
  }
});

/* ============= TURNOS por día ============= */
// Intento JOIN -> fallback DIRECTO (lo que pediste añadir)
app.get("/api/turnos/dia", async (req, res) => {
  try {
    const { cedula, fecha } = req.query;
    if (!cedula || !fecha) return res.status(400).json({ ok: false, msg: "Faltan cedula y fecha" });
    const ced = String(cedula).trim();
    const f = toYYYYMMDD(fecha);
    if (!f) return res.status(400).json({ ok: false, msg: "Fecha inválida (YYYY-MM-DD)" });

    try {
      // ── Esquema 1: JOIN
      const [rows] = await db.execute(
        `
        SELECT t.fecha, t.hora_inicio, t.hora_fin, t.tipo
        FROM \`${DB}\`.\`turnos\` t
        JOIN \`${DB}\`.\`agentes\` a ON a.id = t.agente_id
        WHERE TRIM(a.cedula) = ? AND t.fecha = ?
        ORDER BY t.hora_inicio
        `,
        [ced, f]
      );
      return res.json({ ok: true, esquema: "join", fecha: f, turnos: rows });
    } catch (joinErr) {
      // ── Esquema 2: DIRECTO
      console.warn("Esquema JOIN no disponible, usando esquema directo:", joinErr?.message);
      const [rows] = await db.execute(
        `
        SELECT
          fecha_turno AS fecha,
          DATE_FORMAT(hora_inicio, '%H:%i') AS hora_inicio,
          DATE_FORMAT(hora_fin,    '%H:%i') AS hora_fin,
          COALESCE(tipo,'TRABAJO') AS tipo
        FROM \`${DB}\`.\`turnos\`
        WHERE TRIM(cedula)=TRIM(?) AND fecha_turno = ?
        ORDER BY hora_inicio
        `,
        [ced, f]
      );
      return res.json({ ok: true, esquema: "directo", fecha: f, turnos: rows });
    }
  } catch (e) {
    console.error("GET /api/turnos/dia", e);
    res.status(500).json({ ok: false, msg: e.message || "Error DB" });
  }
});

/* ============= TURNOS por rango ============= */
// Intento JOIN -> fallback DIRECTO (lo que pediste añadir)
app.get("/api/turnos/rango", async (req, res) => {
  try {
    const { cedula, desde, hasta } = req.query;
    if (!cedula) return res.status(400).json({ ok: false, msg: "Falta cedula" });
    if (!desde || !hasta) return res.status(400).json({ ok: false, msg: "Faltan desde/hasta" });

    const ced = String(cedula).trim();
    const isISO = (s) => /^\d{4}-\d{2}-\d{2}$/.test(String(s).trim());
    if (!isISO(desde) || !isISO(hasta)) return res.status(400).json({ ok: false, msg: "Fechas inválidas (YYYY-MM-DD)" });

    try {
      // ── Esquema 1: JOIN
      const [rows] = await db.execute(
        `
        SELECT t.fecha, t.hora_inicio, t.hora_fin, t.tipo
        FROM \`${DB}\`.\`turnos\` t
        JOIN \`${DB}\`.\`agentes\` a ON a.id = t.agente_id
        WHERE TRIM(a.cedula) = ?
          AND t.fecha BETWEEN ? AND ?
        ORDER BY t.fecha, t.hora_inicio
        `,
        [ced, desde, hasta]
      );
      return res.json({ ok: true, esquema: "join", rango: { desde, hasta }, turnos: rows });
    } catch (joinErr) {
      // ── Esquema 2: DIRECTO
      console.warn("Esquema JOIN no disponible, usando esquema directo:", joinErr?.message);
      const [rows] = await db.execute(
        `
        SELECT
          fecha_turno AS fecha,
          DATE_FORMAT(hora_inicio, '%H:%i') AS hora_inicio,
          DATE_FORMAT(hora_fin,    '%H:%i') AS hora_fin,
          COALESCE(tipo,'TRABAJO') AS tipo
        FROM \`${DB}\`.\`turnos\`
        WHERE TRIM(cedula)=TRIM(?)
          AND fecha_turno BETWEEN ? AND ?
        ORDER BY fecha_turno, hora_inicio
        `,
        [ced, desde, hasta]
      );
      return res.json({ ok: true, esquema: "directo", rango: { desde, hasta }, turnos: rows });
    }
  } catch (e) {
    console.error("GET /api/turnos/rango", e);
    res.status(500).json({ ok: false, msg: e.message || "Error DB" });
  }
});

// ─────────────────────────── 404 ───────────────────────────
app.use((req, res) => res.status(404).send("Not Found"));

module.exports = { app };

