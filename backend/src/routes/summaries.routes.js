const { Router } = require('express');
const { getSummaries, generateSummary } = require('../controllers/summaries.controller');

const router = Router();

router.get('/summaries', getSummaries);
router.post('/summaries/generate', generateSummary);

module.exports = router;
