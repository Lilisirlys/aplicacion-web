const express = require('express');
const path = require('path');
const app = express();
const port = 3000;

// 👉 Carpeta de archivos estáticos generados por React
app.use(express.static(path.join(__dirname, 'callcenter-turnos-frontend/build')));

// 👉 Redireccionar cualquier ruta al index.html del build
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'callcenter-turnos-frontend/build', 'index.html'));
});

// 🚀 Inicia el servidor
app.listen(port, () => {
  console.log(`Servidor corriendo en http://localhost:${port}`);
});

