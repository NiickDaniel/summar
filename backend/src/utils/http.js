// Traduz erro de servico em resposta HTTP: 400/404 vem do proprio erro, resto é 500
function responderErro(res, err, contexto, mensagemPadrao) {
  const status = err && err.status ? err.status : 500;

  if (status >= 500) {
    console.error(`[${contexto}]`, err);
    return res.status(500).json({ error: mensagemPadrao });
  }

  return res.status(status).json({ error: err.message });
}

module.exports = { responderErro };
