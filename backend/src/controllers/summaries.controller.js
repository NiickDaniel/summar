const summariesService = require('../services/summaries.service');
const { getTodayBrtDateStr } = require('../utils/date');

/**
 * GET /api/summaries
 * Retorna todos os resumos diários, do mais recente para o mais antigo.
 */
async function getSummaries(req, res) {
  try {
    const summaries = await summariesService.listSummaries();
    return res.status(200).json(summaries);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[summaries] Erro ao listar resumos:', err);
    return res.status(500).json({ error: 'Falha ao buscar os resumos.' });
  }
}

/**
 * POST /api/summaries/generate
 * Dispara manualmente a geração do resumo de um dia (padrão: hoje, em BRT).
 * Conveniência para testar/demonstrar o projeto sem esperar o cron das 22h.
 * Body opcional: { "date": "YYYY-MM-DD" }
 */
async function generateSummary(req, res) {
  try {
    const dateStr = (req.body && req.body.date) || getTodayBrtDateStr();
    const summary = await summariesService.generateAndSaveDailySummary(dateStr);

    if (!summary) {
      return res
        .status(200)
        .json({ generated: false, message: `Sem mensagens em ${dateStr}.` });
    }

    return res.status(200).json({ generated: true, summary });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[summaries] Erro ao gerar resumo manualmente:', err);
    return res.status(500).json({ error: 'Falha ao gerar o resumo.' });
  }
}

module.exports = { getSummaries, generateSummary };
