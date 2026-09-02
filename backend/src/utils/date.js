/**
 * Utilidades de data/hora para o fuso America/Sao_Paulo (BRT, UTC-03:00).
 *
 * Simplificação assumida: o Brasil não observa mais horário de verão desde
 * 2019, então BRT = UTC-03:00 o ano inteiro. Isso evita depender de uma lib
 * de timezone (day.js/luxon) só por causa de um offset fixo.
 */

/** Retorna a data de hoje em BRT no formato "YYYY-MM-DD". */
function getTodayBrtDateStr() {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(new Date());
}

/**
 * Dado um dia em BRT ("YYYY-MM-DD"), retorna o início e o fim desse dia
 * já convertidos para ISO 8601 em UTC, prontos para uma query
 * `gte(created_at, start).lte(created_at, end)` no Supabase.
 */
function getBrtDayRangeUtc(dateStr) {
  const start = new Date(`${dateStr}T00:00:00-03:00`);
  const end = new Date(`${dateStr}T23:59:59.999-03:00`);
  return { startIso: start.toISOString(), endIso: end.toISOString() };
}

module.exports = { getTodayBrtDateStr, getBrtDayRangeUtc };
