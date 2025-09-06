// start.js
require('dotenv').config();
const { app } = require('./server');
const { startSchedulers } = require('./src/jobs/scheduler.js'); // 👈 con .js

const PORT = process.env.PORT || 8013;

app.listen(PORT, () => {
  console.log(`🚀 API escuchando en http://localhost:${PORT}`);
  startSchedulers(); // inicializa los cron jobs
});
