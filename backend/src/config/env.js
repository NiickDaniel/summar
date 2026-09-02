require('dotenv').config();

/**
 * Configuração central de variáveis de ambiente.
 * Mantém o resto da aplicação livre de `process.env` espalhado pelo código.
 */
const env = {
  PORT: process.env.PORT || 3000,
  CORS_ORIGIN: process.env.CORS_ORIGIN || '*',

  SUPABASE_URL: process.env.SUPABASE_URL,
  SUPABASE_KEY: process.env.SUPABASE_KEY,

  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  OPENAI_MODEL: process.env.OPENAI_MODEL || 'gpt-4o-mini',

  WHATSAPP_GROUP_ID: process.env.WHATSAPP_GROUP_ID || '',

  CRON_SCHEDULE: process.env.CRON_SCHEDULE || '0 22 * * *',
  CRON_TIMEZONE: process.env.CRON_TIMEZONE || 'America/Sao_Paulo',
};

const requiredForBoot = ['SUPABASE_URL', 'SUPABASE_KEY'];
const missing = requiredForBoot.filter((key) => !env[key]);

if (missing.length > 0) {
  // Não derruba o processo: em dev é comum subir a API antes de preencher
  // tudo. Mas avisa alto e claro no log, porque toda rota vai falhar.
  // eslint-disable-next-line no-console
  console.warn(
    `[env] Atenção: variáveis ausentes (${missing.join(', ')}). ` +
      'As rotas que dependem do Supabase vão falhar até isso ser preenchido em backend/.env.'
  );
}

if (!env.WHATSAPP_GROUP_ID) {
  // eslint-disable-next-line no-console
  console.warn(
    '[env] WHATSAPP_GROUP_ID não definido: o webhook vai ignorar todas as mensagens recebidas.'
  );
}

module.exports = env;
