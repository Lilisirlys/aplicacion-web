const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// Conexión a MySQL (XAMPP)
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '', // vacío por defecto en XAMPP
    database: 'turnos_trabajo',
    port: 3306
});

db.connect(err => {
    if (err) {
        console.error('❌ Error al conectar a MySQL:', err);
    } else {
        console.log('✅ Conectado a MySQL');
    }
});

// Endpoint para buscar turno
app.post('/buscar-turno', (req, res) => {
    const { cedula, fecha_nacimiento } = req.body;
    const sql = 'SELECT nombre, turno FROM agentes WHERE cedula = ? AND fecha_nacimiento = ?';
    db.query(sql, [cedula, fecha_nacimiento], (err, result) => {
        if (err) return res.status(500).json({ error: 'Error en consulta' });
        if (result.length === 0) return res.status(404).json({ mensaje: 'No se encontró el turno' });
        res.json(result[0]);
    });
});

app.listen(3001, () => {
    console.log('🚀 Servidor corriendo en http://localhost:3001');
});
c