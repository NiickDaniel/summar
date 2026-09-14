const env = require('../config/env');
const messagesService = require('../services/messages.service');

// Extrai grupo, remetente e texto de um evento da EvolutionAPI
function extractMessage(item) {
  if (!item) return null;

  // Payload simplificado, usado nos testes
  if (item.group_id || item.content) {
    return {
      groupId: item.group_id,
      senderName: item.sender_name || item.senderName || null,
      content: item.content,
    };
  }

  // Payload real da EvolutionAPI
  const key = item.key || {};
  const message = item.message || {};

  const content =
    message.conversation ||
    message.extendedTextMessage?.text ||
    message.imageMessage?.caption ||
    message.videoMessage?.caption ||
    null;

  if (!content) return null;

  return {
    groupId: key.remoteJid,
    senderName: item.pushName || key.participant || null,
    content,
    fromMe: key.fromMe === true,
  };
}

// POST /webhook/evolution: salva as mensagens do grupo monitorado
async function handleEvolutionWebhook(req, res) {
  try {
    const body = req.body || {};

    // data pode vir como objeto único ou como lista
    const rawItems = Array.isArray(body.data) ? body.data : [body.data || body];

    const candidates = rawItems.map(extractMessage).filter(Boolean);

    if (candidates.length === 0) {
      return res.status(200).json({ received: true, saved: 0, reason: 'no_message_content' });
    }

    const relevant = candidates.filter(
      (msg) => !msg.fromMe && msg.groupId === env.WHATSAPP_GROUP_ID
    );

    if (relevant.length === 0) {
      return res.status(200).json({ received: true, saved: 0, reason: 'group_not_monitored' });
    }

    const saved = [];
    for (const msg of relevant) {
      saved.push(await messagesService.saveRawMessage(msg));
    }

    return res.status(200).json({ received: true, saved: saved.length });
  } catch (err) {
    console.error('[webhook] Erro ao processar payload da EvolutionAPI:', err);
    // Responde 200 mesmo com erro para a Evolution não reenviar
    return res.status(200).json({ received: true, saved: 0, error: err.message });
  }
}

module.exports = { handleEvolutionWebhook };
