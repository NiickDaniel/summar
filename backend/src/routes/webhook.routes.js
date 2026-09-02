const { Router } = require('express');
const { handleEvolutionWebhook } = require('../controllers/webhook.controller');

const router = Router();

router.post('/evolution', handleEvolutionWebhook);

module.exports = router;
