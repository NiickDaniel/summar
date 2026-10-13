const settingsService = require('../services/settings.service');
const cronService = require('../services/cron.service');
const { responderErro } = require('../utils/http');

// GET /api/settings: configuracoes atuais + estado do agendamento
async function getSettings(req, res) {
  try {
    const settings = await settingsService.getSettings();
    return res.status(200).json({ settings, agendamento: cronService.statusDoAgendamento() });
  } catch (err) {
    return responderErro(res, err, 'settings', 'Falha ao buscar as configuracoes.');
  }
}

// PUT /api/settings: grava e ja reagenda o cron, sem precisar reiniciar o container
async function updateSettings(req, res) {
  try {
    const settings = await settingsService.updateSettings(req.body || {});
    await cronService.aplicarAgendamento();
    return res.status(200).json({ settings, agendamento: cronService.statusDoAgendamento() });
  } catch (err) {
    return responderErro(res, err, 'settings', 'Falha ao salvar as configuracoes.');
  }
}

module.exports = { getSettings, updateSettings };
