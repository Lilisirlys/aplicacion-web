// src/jobs/scheduler.js
const cron = require('node-cron');
const { programarRecordatorios } = require('../services/notification.service.js'); // ← con .js

function startSchedulers() {
  console.log('[scheduler] iniciado');

  // Latido: imprime cada minuto para verificar que el cron corre
  cron.schedule('* * * * *', () => {
    console.log('[scheduler] tick');
  });

  // Despacha notificaciones pendientes cada 5 min
  cron.schedule('*/5 * * * *', async () => {
    try {
      await programarRecordatorios('despachar');
    } catch (e) {
      console.error('Error despachando notificaciones:', e);
    }
  });

  // Genera recordatorios todos los días a las 20:00
  cron.schedule('0 20 * * *', async () => {
    try {
      await programarRecordatorios('generar');
    } catch (e) {
      console.error('Error generando recordatorios:', e);
    }
  });
}

module.exports = { startSchedulers };
