// server.js
const express = require("express");
const cors = require("cors");

const app = express();
app.use(express.json());

// En desarrollo, permite llamadas desde el front en 3000
app.use(cors({ origin: "http://localhost:3000" }));

// Login: acepta cualquier cédula + fecha y devuelve un "token"
app.post("/api/login", (req, res) => {
  const { cedula, fechaNacimiento } = req.body || {};
  if (!cedula || !fechaNacimiento) {
    return res.status(400).json({ message: "Completa cédula y fecha de nacimiento." });
  }
  const token = Buffer.from(`${cedula}:${fechaNacimiento}:${Date.now()}`).toString("base64");
  res.json({ ok: true, token });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Backend listo en http://localhost:${PORT}`));


