const env = require('../config/env');
const messagesService = require('../services/messages.service');

/**
 * Extrai { groupId, senderName, content } de um único evento de mensagem
 * no formato da EvolutionAPI (evento "messages.upsert").
 *
 * Também aceita um payload simplificado { group_id, sender_name, content },
 * útil para testar o webhook com curl/Postman sem uma instância real da
 * EvolutionAPI.
 */
function extractMessage(item) {
  if (!item) return null;

  // Payload simplificado (uso em testes/demo)
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

/**
 * POST /webhook/evolution
 * Recebe o payload de webhook da EvolutionAPI, filtra pelo grupo monitorado
 * (WHATSAPP_GROUP_ID) e persiste a mensagem crua em `raw_messages`.
 *
 * Sempre responde 200 rapidamente (mesmo quando ignora o evento) para que a
 * EvolutionAPI não fique reentregando o webhook.
 */
async function handleEvolutionWebhook(req, res) {
  try {
    const body = req.body || {};

    // A EvolutionAPI pode mandar um único objeto em `data` ou uma lista.
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
      // eslint-disable-next-line no-await-in-loop
      saved.push(await messagesService.saveRawMessage(msg));
    }

    return res.status(200).json({ received: true, saved: saved.length });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[webhook] Erro ao processar payload da EvolutionAPI:', err);
    // Ainda assim respondemos 200 para não gerar retries infinitos de payloads malformados.
    return res.status(200).json({ received: true, saved: 0, error: err.message });
  }
}

module.exports = { handleEvolutionWebhook };
