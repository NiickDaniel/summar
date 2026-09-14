const supabase = require('../config/supabaseClient');
const messagesService = require('./messages.service');
const openaiService = require('./openai.service');

// Gera o resumo do dia e salva no banco (sem mensagens, não cria nada)
async function generateAndSaveDailySummary(dateStr) {
  const messages = await messagesService.getMessagesForDate(dateStr);

  if (messages.length === 0) {
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

  console.log(`[summaries] Resumo de ${dateStr} salvo (${messages.length} mensagens).`);
  return data;
}

// Lista os resumos do mais recente para o mais antigo
async function listSummaries() {
  const { data, error } = await supabase
    .from('daily_summaries')
    .select('*')
    .order('date', { ascending: false });

  if (error) throw error;
  return data || [];
}

module.exports = { generateAndSaveDailySummary, listSummaries };
