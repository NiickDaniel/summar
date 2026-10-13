const cron = require('node-cron');
const summariesService = require('./summaries.service');
const settingsService = require('./settings.service');
const { getTodayDateStr } = require('../utils/date');

// node-cron 3.x nao tem destroy(): para reagendar, paramos a tarefa e criamos outra
let tarefaAtual = null;
let agendamentoAtivo = null;

// Roda a mesma logica do cron, usada tambem pelo "resumir agora"
async function executarResumoDoDia(origem = 'cron') {
  const settings = await settingsService.getSettings();
  const hoje = getTodayDateStr(settings.timezone);

  console.log(`[cron] (${origem}) Gerando resumo de ${hoje}...`);
  return summariesService.generateAndSaveDailySummary(hoje, settings.timezone);
}

// (Re)agenda o resumo conforme as settings do banco
async function aplicarAgendamento() {
  const settings = await settingsService.getSettings();

  if (tarefaAtual) {
    tarefaAtual.stop();
    tarefaAtual = null;
    agendamentoAtivo = null;
  }

  if (!settings.auto_enabled) {
    console.log('[cron] Resumo automatico desligado nas configuracoes.');
    return { agendado: false, settings };
  }

  const expressao = settingsService.horaParaCron(settings.summary_time);

  tarefaAtual = cron.schedule(
    expressao,
    async () => {
      try {
        await executarResumoDoDia('cron');
      } catch (err) {
        console.error('[cron] Falha ao gerar o resumo diário:', err);
      }
    },
    { timezone: settings.timezone }
  );

  agendamentoAtivo = { expressao, timezone: settings.timezone, hora: settings.summary_time };
  console.log(
    `[cron] Resumo agendado para ${settings.summary_time} ("${expressao}", ${settings.timezone}).`
  );

  return { agendado: true, settings };
}

// Estado atual do agendamento, exposto na tela de configuracoes
function statusDoAgendamento() {
  return {
    ativo: Boolean(tarefaAtual),
    ...(agendamentoAtivo || {}),
  };
}

async function startCronJobs() {
  try {
    await aplicarAgendamento();
  } catch (err) {
    console.error('[cron] Nao foi possivel agendar o resumo diario:', err);
  }
}

module.exports = {
  startCronJobs,
  aplicarAgendamento,
  executarResumoDoDia,
  statusDoAgendamento,
};
