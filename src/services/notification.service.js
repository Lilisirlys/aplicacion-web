const db = require('../db');                // 👈 usa el pool
const { sendEmail } = require('./mail.service');

async function programarRecordatorios(accion) {
  if (accion === 'generar') {
    await db.execute(`
      INSERT INTO notificaciones (agente_id, tipo, titulo, mensaje, canal, fecha_programada)
      SELECT a.id, 'recordatorio',
             'Recordatorio de turno',
             CONCAT('Mañana tienes turno el ', DATE_FORMAT(t.fecha_turno, '%Y-%m-%d'),
                    ' de ', TIME_FORMAT(t.hora_inicio, '%H:%i'),
                    ' a ', TIME_FORMAT(t.hora_fin, '%H:%i')),
             'inapp,email',
             TIMESTAMP(DATE_SUB(t.fecha_turno, INTERVAL 1 DAY), '20:00:00')
      FROM agentes a
      JOIN turnos t ON t.agente_id = a.id
      WHERE t.fecha_turno = DATE_ADD(CURDATE(), INTERVAL 1 DAY)
        AND NOT EXISTS (
          SELECT 1 FROM notificaciones n
          WHERE n.agente_id = a.id
            AND n.tipo = 'recordatorio'
            AND DATE(n.fecha_programada) = DATE_SUB(t.fecha_turno, INTERVAL 1 DAY)
        );
    `);
  }

  const [pendientes] = await db.execute(`
    SELECT * FROM notificaciones
    WHERE enviada = 0 AND fecha_programada <= NOW()
    ORDER BY fecha_programada ASC
    LIMIT 100
  `);

  for (const n of pendientes) {
    try {
      if (n.canal.includes('email')) {
        await sendEmail(n.agente_id, n.titulo, n.mensaje);
      }
      await db.execute(
        'UPDATE notificaciones SET enviada=1, fecha_envio=NOW() WHERE id=?',
        [n.id]
      );
    } catch (e) {
      console.error('Error enviando notificación', n.id, e);
    }
  }
}

module.exports = { programarRecordatorios };
