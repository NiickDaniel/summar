const summariesService = require('../services/summaries.service');
const { getTodayBrtDateStr } = require('../utils/date');

// GET /api/summaries: lista os resumos do mais recente para o mais antigo
async function getSummaries(req, res) {
  try {
    const summaries = await summariesService.listSummaries();
    return res.status(200).json(summaries);
  } catch (err) {
    console.error('[summaries] Erro ao listar resumos:', err);
    return res.status(500).json({ error: 'Falha ao buscar os resumos.' });
  }
}

// POST /api/summaries/generate: gera o resumo de um dia sob demanda (padrão: hoje)
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
    console.error('[summaries] Erro ao gerar resumo manualmente:', err);
    return res.status(500).json({ error: 'Falha ao gerar o resumo.' });
  }
}

module.exports = { getSummaries, generateSummary };
