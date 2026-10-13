const { Router } = require('express');
const { getSettings, updateSettings } = require('../controllers/settings.controller');

const router = Router();

router.get('/settings', getSettings);
router.put('/settings', updateSettings);

module.exports = router;
