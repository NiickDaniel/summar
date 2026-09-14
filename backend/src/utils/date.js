// Datas no fuso de Brasília (BRT = UTC-03:00, sem horário de verão)

// Data de hoje em BRT (YYYY-MM-DD)
function getTodayBrtDateStr() {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(new Date());
}

// Início e fim do dia em BRT convertidos para UTC
function getBrtDayRangeUtc(dateStr) {
  const start = new Date(`${dateStr}T00:00:00-03:00`);
  const end = new Date(`${dateStr}T23:59:59.999-03:00`);
  return { startIso: start.toISOString(), endIso: end.toISOString() };
}

module.exports = { getTodayBrtDateStr, getBrtDayRangeUtc };
