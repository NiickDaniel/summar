const summariesService = require('../services/summaries.service');
const settingsService = require('../services/settings.service');
const { getTodayDateStr } = require('../utils/date');
const { responderErro } = require('../utils/http');

// GET /api/summaries: lista os resumos do mais recente para o mais antigo
async function getSummaries(req, res) {
  try {
    return res.status(200).json(await summariesService.listSummaries());
  } catch (err) {
    return responderErro(res, err, 'summaries', 'Falha ao buscar os resumos.');
  }
}

// POST /api/summaries/generate: o "resumir agora" da tela (padrão: hoje)
async function generateSummary(req, res) {
  try {
    const { timezone } = await settingsService.getSettings();
    const dateStr = (req.body && req.body.date) || getTodayDateStr(timezone);

    const summary = await summariesService.generateAndSaveDailySummary(dateStr, timezone);

    if (!summary) {
      return res.status(200).json({
        generated: false,
        date: dateStr,
        message: `Nenhuma mensagem encontrada em ${dateStr}.`,
      });
    }

    return res.status(200).json({ generated: true, date: dateStr, summary });
  } catch (err) {
    return responderErro(res, err, 'summaries', 'Falha ao gerar o resumo.');
  }
}

module.exports = { getSummaries, generateSummary };
