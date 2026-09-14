const supabase = require('../config/supabaseClient');
const env = require('../config/env');
const { getBrtDayRangeUtc } = require('../utils/date');

// Salva no banco uma mensagem recebida pelo webhook
async function saveRawMessage({ groupId, senderName, content }) {
  const { data, error } = await supabase
    .from('raw_messages')
    .insert({ group_id: groupId, sender_name: senderName, content })
    .select()
    .single();

  if (error) throw error;
  return data;
}

// Busca as mensagens do grupo monitorado em um dia
async function getMessagesForDate(dateStr) {
  const { startIso, endIso } = getBrtDayRangeUtc(dateStr);

  const { data, error } = await supabase
    .from('raw_messages')
    .select('*')
    .eq('group_id', env.WHATSAPP_GROUP_ID)
    .gte('created_at', startIso)
    .lte('created_at', endIso)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data || [];
}

module.exports = { saveRawMessage, getMessagesForDate };
