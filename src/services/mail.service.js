const nodemailer = require('nodemailer');
const db = require('../db');  // 👈 usa el pool

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
});

async function sendEmail(agenteId, subject, text) {
  const [rows] = await db.execute(
    'SELECT email, nombre FROM agentes WHERE id=?',
    [agenteId]
  );
  const agente = rows?.[0];
  if (!agente?.email) return;

  await transporter.sendMail({
    from: '"App de Turnos" <no-reply@tuapp.com>',
    to: agente.email,
    subject,
    text
  });
}

module.exports = { sendEmail };
