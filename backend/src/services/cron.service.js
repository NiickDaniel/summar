const cron = require('node-cron');
const env = require('../config/env');
const summariesService = require('./summaries.service');
const { getTodayBrtDateStr } = require('../utils/date');

// Agenda a geração do resumo diário (22h de Brasília por padrão)
function startCronJobs() {
  cron.schedule(
    env.CRON_SCHEDULE,
    async () => {
      const today = getTodayBrtDateStr();
      console.log(`[cron] Iniciando geração do resumo diário para ${today}...`);
      try {
        await summariesService.generateAndSaveDailySummary(today);
      } catch (err) {
        console.error('[cron] Falha ao gerar o resumo diário:', err);
      }
    },
    { timezone: env.CRON_TIMEZONE }
  );

  console.log(
    `[cron] Job de resumo diário agendado: "${env.CRON_SCHEDULE}" (${env.CRON_TIMEZONE}).`
  );
}

module.exports = { startCronJobs };
