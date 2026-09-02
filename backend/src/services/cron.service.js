const cron = require('node-cron');
const env = require('../config/env');
const summariesService = require('./summaries.service');
const { getTodayBrtDateStr } = require('../utils/date');

/**
 * Agenda o job diário que resume as mensagens do dia via OpenAI.
 * Roda às 22h (horário de Brasília) por padrão — ver CRON_SCHEDULE/CRON_TIMEZONE.
 */
function startCronJobs() {
  cron.schedule(
    env.CRON_SCHEDULE,
    async () => {
      const today = getTodayBrtDateStr();
      // eslint-disable-next-line no-console
      console.log(`[cron] Iniciando geração do resumo diário para ${today}...`);
      try {
        await summariesService.generateAndSaveDailySummary(today);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('[cron] Falha ao gerar o resumo diário:', err);
      }
    },
    { timezone: env.CRON_TIMEZONE }
  );

  // eslint-disable-next-line no-console
  console.log(
    `[cron] Job de resumo diário agendado: "${env.CRON_SCHEDULE}" (${env.CRON_TIMEZONE}).`
  );
}

module.exports = { startCronJobs };
