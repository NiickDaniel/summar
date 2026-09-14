const app = require('./app');
const env = require('./config/env');
const { startCronJobs } = require('./services/cron.service');

app.listen(env.PORT, () => {
  console.log(`[server] Summar backend rodando na porta ${env.PORT}`);
  startCronJobs();
});
