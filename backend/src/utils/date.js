// Datas resolvidas no fuso configurado nas settings (padrao America/Sao_Paulo)

const FUSO_PADRAO = 'America/Sao_Paulo';

// Offset do fuso (ex.: "-03:00") no dia informado, respeitando horario de verao
function offsetDoFuso(dateStr, timezone = FUSO_PADRAO) {
  try {
    const partes = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      timeZoneName: 'longOffset',
    }).formatToParts(new Date(`${dateStr}T12:00:00Z`));

    const nome = partes.find((p) => p.type === 'timeZoneName')?.value || '';
    if (nome === 'GMT' || nome === 'UTC') return '+00:00';

    const achado = nome.match(/GMT([+-]\d{2}:\d{2})/);
    if (achado) return achado[1];

    // Alguns fusos vem como "GMT-3" em vez de "GMT-03:00"
    const curto = nome.match(/GMT([+-])(\d{1,2})$/);
    if (curto) return `${curto[1]}${curto[2].padStart(2, '0')}:00`;
  } catch (err) {
    console.warn(`[date] Fuso invalido "${timezone}", usando -03:00:`, err.message);
  }
  return '-03:00';
}

// Data de hoje no fuso informado (YYYY-MM-DD)
function getTodayDateStr(timezone = FUSO_PADRAO) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

// Inicio e fim do dia no fuso informado, convertidos para UTC
function getDayRangeUtc(dateStr, timezone = FUSO_PADRAO) {
  const offset = offsetDoFuso(dateStr, timezone);
  return {
    startIso: new Date(`${dateStr}T00:00:00${offset}`).toISOString(),
    endIso: new Date(`${dateStr}T23:59:59.999${offset}`).toISOString(),
  };
}

// Valida se o fuso e aceito pelo Intl antes de gravar nas settings
function fusoValido(timezone) {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: timezone });
    return true;
  } catch {
    return false;
  }
}

module.exports = { FUSO_PADRAO, getTodayDateStr, getDayRangeUtc, fusoValido, offsetDoFuso };
