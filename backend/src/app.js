const express = require('express');
const cors = require('cors');
const env = require('./config/env');
const webhookRoutes = require('./routes/webhook.routes');
const summariesRoutes = require('./routes/summaries.routes');

const app = express();

app.use(cors({ origin: env.CORS_ORIGIN }));
app.use(express.json({ limit: '2mb' }));

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', service: 'summar-backend' });
});

app.use('/webhook', webhookRoutes);
app.use('/api', summariesRoutes);

app.use((req, res) => {
  res.status(404).json({ error: 'Rota não encontrada.' });
});

app.use((err, req, res, next) => {
  console.error('[app] Erro não tratado:', err);
  res.status(500).json({ error: 'Erro interno no servidor.' });
});

module.exports = app;
