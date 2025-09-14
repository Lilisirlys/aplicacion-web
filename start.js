// start.js
require('dotenv').config();

const { app } = require('./server');

// Intenta cargar los schedulers si existen (no rompe si no están)
let startSchedulers = null;
try {
  ({ startSchedulers } = require('./src/jobs/scheduler.js')); // <-- ruta correcta
} catch (e) {
  console.warn('Schedulers no cargados (opcional):', e.message);
}

// Usa el puerto del .env; si no, 8013 (mantengo tu valor)
const PORT = Number(process.env.PORT || 8013);

const server = app.listen(PORT, () => {
  console.log(`🚀 API escuchando en http://localhost:${PORT}`);

  if (typeof startSchedulers === 'function') {
    try {
      startSchedulers();
      console.log('⏱️  Schedulers iniciados');
    } catch (err) {
      console.error('No se pudieron iniciar los schedulers:', err);
    }
  }
});

// Limpieza elegante y manejo de errores globales
process.on('SIGINT', () => {
  console.log('Recibido SIGINT, cerrando servidor...');
  server.close(() => process.exit(0));
});
process.on('SIGTERM', () => {
  console.log('Recibido SIGTERM, cerrando servidor...');
  server.close(() => process.exit(0));
});
process.on('unhandledRejection', (reason) => {
  console.error('UNHANDLED REJECTION:', reason);
});
process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION:', err);
});
