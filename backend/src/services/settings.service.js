const supabase = require('../config/supabaseClient');
const env = require('../config/env');
const { fusoValido, FUSO_PADRAO } = require('../utils/date');

const FORMATO_HORA = /^([01]\d|2[0-3]):([0-5]\d)$/;

// Erro de entrada do usuario, para o controller responder 400 em vez de 500
function erroDeValidacao(mensagem) {
  const erro = new Error(mensagem);
  erro.status = 400;
  return erro;
}

// "0 22 * * *" -> "22:00"
function cronParaHora(expressao) {
  const partes = String(expressao || '').trim().split(/\s+/);
  if (partes.length < 2) return null;
  const minuto = Number(partes[0]);
  const hora = Number(partes[1]);
  if (!Number.isInteger(minuto) || !Number.isInteger(hora)) return null;
  if (hora < 0 || hora > 23 || minuto < 0 || minuto > 59) return null;
  return `${String(hora).padStart(2, '0')}:${String(minuto).padStart(2, '0')}`;
}

// "22:00" -> "0 22 * * *"
function horaParaCron(hora) {
  const achado = FORMATO_HORA.exec(hora);
  if (!achado) throw erroDeValidacao('Horario invalido. Use o formato HH:MM.');
  return `${Number(achado[2])} ${Number(achado[1])} * * *`;
}

// Valores iniciais caso a linha de settings nao exista ainda
function padroesDoEnv() {
  return {
    id: 1,
    summary_time: cronParaHora(env.CRON_SCHEDULE) || '22:00',
    timezone: fusoValido(env.CRON_TIMEZONE) ? env.CRON_TIMEZONE : FUSO_PADRAO,
    auto_enabled: true,
  };
}

// Le as configuracoes, semeando a linha unica se preciso
async function getSettings() {
  const { data, error } = await supabase
    .from('app_settings')
    .select('*')
    .eq('id', 1)
    .maybeSingle();

  if (error) throw error;
  if (data) return data;

  const { data: criada, error: erroInsert } = await supabase
    .from('app_settings')
    .insert(padroesDoEnv())
    .select()
    .single();

  if (erroInsert) throw erroInsert;
  console.log('[settings] Linha de configuracao criada a partir do .env');
  return criada;
}

// Atualiza so os campos enviados, validando antes de gravar
async function updateSettings(alteracoes = {}) {
  const campos = {};

  if (alteracoes.summary_time !== undefined) {
    const hora = String(alteracoes.summary_time).trim();
    if (!FORMATO_HORA.test(hora)) {
      throw erroDeValidacao('Horario invalido. Use o formato HH:MM (ex.: 22:00).');
    }
    campos.summary_time = hora;
  }

  if (alteracoes.timezone !== undefined) {
    const fuso = String(alteracoes.timezone).trim();
    if (!fusoValido(fuso)) {
      throw erroDeValidacao(`Fuso horario invalido: "${fuso}".`);
    }
    campos.timezone = fuso;
  }

  if (alteracoes.auto_enabled !== undefined) {
    if (typeof alteracoes.auto_enabled !== 'boolean') {
      throw erroDeValidacao('O campo auto_enabled deve ser true ou false.');
    }
    campos.auto_enabled = alteracoes.auto_enabled;
  }

  if (Object.keys(campos).length === 0) {
    throw erroDeValidacao('Nenhum campo valido para atualizar.');
  }

  campos.updated_at = new Date().toISOString();

  await getSettings();

  const { data, error } = await supabase
    .from('app_settings')
    .update(campos)
    .eq('id', 1)
    .select()
    .single();

  if (error) throw error;
  return data;
}

module.exports = {
  getSettings,
  updateSettings,
  horaParaCron,
  cronParaHora,
  erroDeValidacao,
};
