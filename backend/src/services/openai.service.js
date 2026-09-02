const OpenAI = require('openai');
const env = require('../config/env');

const client = new OpenAI({ apiKey: env.OPENAI_API_KEY });

const SYSTEM_PROMPT = `Você é um assistente que resume a conversa diária de um grupo de WhatsApp de uma turma da faculdade.
Leia o histórico de mensagens do dia e responda SOMENTE com um JSON no formato:

{
  "overview": "um parágrafo curto com a visão geral da conversa do dia",
  "key_points": ["ponto importante 1", "ponto importante 2", "..."],
  "pending_tasks": ["atividade ou tarefa perdida/pendente 1", "..."]
}

Regras:
- "overview": visão geral objetiva do que foi discutido no grupo.
- "key_points": pontos, avisos e decisões relevantes da conversa.
- "pending_tasks": atividades, provas, entregas ou combinados que ficaram
  pendentes ou foram mencionados como "para fazer"/deadline. Se não houver
  nenhuma, retorne uma lista vazia.
- Responda em português do Brasil.
- Não invente informação que não esteja nas mensagens.`;

/** Formata as mensagens cruas em um log de texto simples para o prompt. */
function formatMessagesForPrompt(messages) {
  return messages
    .map((msg) => {
      const time = new Date(msg.created_at).toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'America/Sao_Paulo',
      });
      const sender = msg.sender_name || 'Desconhecido';
      return `[${time}] ${sender}: ${msg.content || ''}`;
    })
    .join('\n');
}

/**
 * Envia as mensagens do dia para a OpenAI e retorna o resumo estruturado.
 * @param {Array} messages linhas de `raw_messages` de um único dia
 * @returns {{ overview: string, keyPoints: string, pendingTasks: string }}
 */
async function summarizeMessages(messages) {
  const conversationLog = formatMessagesForPrompt(messages);

  const completion = await client.chat.completions.create({
    model: env.OPENAI_MODEL,
    temperature: 0.4,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: `Mensagens do dia:\n\n${conversationLog}` },
    ],
  });

  const raw = completion.choices[0]?.message?.content || '{}';
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    throw new Error(`Resposta da OpenAI não é um JSON válido: ${err.message}`);
  }

  const toBulletText = (value, fallback) => {
    if (Array.isArray(value)) {
      const items = value.map((item) => String(item).trim()).filter(Boolean);
      return items.length > 0 ? items.map((item) => `- ${item}`).join('\n') : fallback;
    }
    return typeof value === 'string' && value.trim() ? value.trim() : fallback;
  };

  return {
    overview: (parsed.overview || '').trim() || 'Nenhum resumo disponível para este dia.',
    keyPoints: toBulletText(parsed.key_points, 'Nenhum ponto de destaque identificado.'),
    pendingTasks: toBulletText(parsed.pending_tasks, 'Nenhuma tarefa pendente identificada.'),
  };
}

module.exports = { summarizeMessages };
