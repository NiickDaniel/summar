require('dotenv').config();

// Aceita o JID completo ou só o número do grupo
function normalizeGroupId(value) {
  const raw = (value || '').trim();
  if (!raw) return '';
  return raw.includes('@') ? raw : `${raw}@g.us`;
}

// Variáveis de ambiente usadas pela aplicação
const env = {
  PORT: process.env.PORT || 3000,
  CORS_ORIGIN: process.env.CORS_ORIGIN || '*',

  SUPABASE_URL: process.env.SUPABASE_URL,
  SUPABASE_KEY: process.env.SUPABASE_KEY,

  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  OPENAI_MODEL: process.env.OPENAI_MODEL || 'gpt-4o-mini',

  WHATSAPP_GROUP_ID: normalizeGroupId(process.env.WHATSAPP_GROUP_ID),

  CRON_SCHEDULE: process.env.CRON_SCHEDULE || '0 22 * * *',
  CRON_TIMEZONE: process.env.CRON_TIMEZONE || 'America/Sao_Paulo',
};

const requiredForBoot = ['SUPABASE_URL', 'SUPABASE_KEY'];
const missing = requiredForBoot.filter((key) => !env[key]);

if (missing.length > 0) {
  console.warn(
    `[env] Atenção: variáveis ausentes (${missing.join(', ')}). ` +
      'As rotas que dependem do Supabase vão falhar até isso ser preenchido em backend/.env.'
  );
}

if (!env.WHATSAPP_GROUP_ID) {
  console.warn(
    '[env] WHATSAPP_GROUP_ID não definido: o webhook vai ignorar todas as mensagens recebidas.'
  );
} else {
  console.log(`[env] Grupo monitorado: ${env.WHATSAPP_GROUP_ID}`);
}

module.exports = env;
