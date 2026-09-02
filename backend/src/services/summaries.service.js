const supabase = require('../config/supabaseClient');
const messagesService = require('./messages.service');
const openaiService = require('./openai.service');

/**
 * Gera (ou regenera) o resumo diário de um dia específico e salva em
 * `daily_summaries`. Se não houver mensagens naquele dia, não cria nada.
 *
 * @param {string} dateStr dia em BRT, formato "YYYY-MM-DD"
 * @returns {object|null} a linha salva, ou null se não havia mensagens
 */
async function generateAndSaveDailySummary(dateStr) {
  const messages = await messagesService.getMessagesForDate(dateStr);

  if (messages.length === 0) {
    // eslint-disable-next-line no-console
    console.log(`[summaries] Nenhuma mensagem em ${dateStr}, resumo não gerado.`);
    return null;
  }

  const { overview, keyPoints, pendingTasks } = await openaiService.summarizeMessages(messages);

  const { data, error } = await supabase
    .from('daily_summaries')
    .upsert(
      {
        date: dateStr,
        overview,
        key_points: keyPoints,
        pending_tasks: pendingTasks,
      },
      { onConflict: 'date' }
    )
    .select()
    .single();

  if (error) throw error;

  // eslint-disable-next-line no-console
  console.log(`[summaries] Resumo de ${dateStr} salvo (${messages.length} mensagens).`);
  return data;
}

/** Lista todos os resumos, do mais recente para o mais antigo. */
async function listSummaries() {
  const { data, error } = await supabase
    .from('daily_summaries')
    .select('*')
    .order('date', { ascending: false });

  if (error) throw error;
  return data || [];
}

module.exports = { generateAndSaveDailySummary, listSummaries };
