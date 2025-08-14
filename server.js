// server.js
const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');

const app = express();
app.use(cors({ origin: 'http://localhost:3000' })); // React
app.use(express.json()); // <-- MUY IMPORTANTE para leer req.body

// Ajusta tus credenciales:
const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: '',            // tu pass de MySQL si aplica
  database: 'callcenter',  // tu BD
  port: 3306
});

// (opcional) healthcheck rápido
app.get('/health', (req, res) => res.send('ok'));

app.post('/api/login', async (req, res) => {
  try {
    let { cedula, fecha_nacimiento } = req.body;

    // Log para depurar (mira la consola del backend)
    console.log('BODY =>', req.body);

    // Normaliza fecha a YYYY-MM-DD (acepta DD/MM/YYYY o DD-MM-YYYY)
    if (typeof fecha_nacimiento === 'string') {
      // también soporta formatos ISO del datepicker: "1980-08-11" o "1980-08-11T00:00:00.000Z"
      if (/^\d{2}[\/-]\d{2}[\/-]\d{4}$/.test(fecha_nacimiento)) {
        const [dd, mm, yyyy] = fecha_nacimiento.split(/[\/-]/);
        fecha_nacimiento = `${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`;
      } else if (/^\d{4}-\d{2}-\d{2}/.test(fecha_nacimiento)) {
        // ya viene en ISO; corta si trae hora/Z
        fecha_nacimiento = fecha_nacimiento.slice(0, 10);
      }
    }

    // Validación básica
    if (!cedula || !fecha_nacimiento) {
      return res.status(400).json({ message: 'Faltan datos' });
    }

    // Consulta
    const [rows] = await pool.execute(
      `SELECT id, nombre, apellido, fecha_turno, hora_inicio, hora_fin, tipo_turno, sede, area, estado
       FROM agentes_turnos
       WHERE cedula = ? AND fecha_nacimiento = ?`,
      [String(cedula), fecha_nacimiento]
    );

    if (rows.length === 0) {
      // Diferenciar: 401 = credenciales no coinciden
      return res.status(401).json({ message: 'Credenciales inválidas' });
    }

    // OK
    return res.json(rows[0]);
  } catch (err) {
    console.error('ERROR /api/login =>', err);
    return res.status(500).json({ message: 'Error interno' });
  }
});

const PORT = 8012;
app.listen(PORT, () => {
  console.log(`API escuchando en http://localhost:${PORT}`);
});
