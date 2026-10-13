// Aba Configurações: horário/disparo do resumo e o botão "Resumir agora"
(() => {
  const S = window.Summar;

  const campoAuto = document.getElementById('setAutoEnabled');
  const campoHora = document.getElementById('setSummaryTime');
  const campoFuso = document.getElementById('setTimezone');
  const btnSalvar = document.getElementById('saveSettingsBtn');
  const statusSalvar = document.getElementById('settingsStatus');
  const btnAgora = document.getElementById('runNowBtn');
  const statusAgora = document.getElementById('runNowStatus');

  let settings = null;

  function textoDaSidebar(cfg) {
    if (!cfg) return 'Agendamento indisponível.';
    if (!cfg.auto_enabled) return 'Resumo automático desligado.';
    return `Resumo automático às ${cfg.summary_time} · ${cfg.timezone}`;
  }

  function preencherFormulario(cfg) {
    // Fuso gravado fora da lista padrão entra como opção extra
    if (cfg.timezone && !Array.from(campoFuso.options).some((o) => o.value === cfg.timezone)) {
      const opcao = document.createElement('option');
      opcao.value = cfg.timezone;
      opcao.textContent = cfg.timezone;
      campoFuso.appendChild(opcao);
    }

    campoAuto.checked = Boolean(cfg.auto_enabled);
    campoHora.value = cfg.summary_time || '22:00';
    campoFuso.value = cfg.timezone || 'America/Sao_Paulo';
    S.stats.setAgendamento(textoDaSidebar(cfg));
  }

  async function carregar() {
    try {
      const resposta = await S.api.get('/api/settings');
      settings = resposta.settings;
      preencherFormulario(settings);
      statusSalvar.textContent = '';
    } catch (err) {
      S.stats.setAgendamento('Não foi possível ler o agendamento.');
      statusSalvar.textContent = err.message;
      statusSalvar.className = 'text-sm text-red-600';
    }
  }

  async function salvar() {
    const hora = campoHora.value;
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(hora)) {
      statusSalvar.textContent = 'Informe um horário válido.';
      statusSalvar.className = 'text-sm text-red-600';
      return;
    }

    btnSalvar.disabled = true;
    statusSalvar.textContent = 'Salvando…';
    statusSalvar.className = 'text-sm text-slate-500';

    try {
      const resposta = await S.api.put('/api/settings', {
        summary_time: hora,
        timezone: campoFuso.value,
        auto_enabled: campoAuto.checked,
      });
      settings = resposta.settings;
      preencherFormulario(settings);
      statusSalvar.textContent = 'Configurações salvas.';
      statusSalvar.className = 'text-sm text-brand-700';
      S.toast(
        settings.auto_enabled
          ? `Resumo reagendado para ${settings.summary_time}.`
          : 'Resumo automático desligado.'
      );
    } catch (err) {
      statusSalvar.textContent = err.message;
      statusSalvar.className = 'text-sm text-red-600';
      S.toast(err.message, 'erro');
    } finally {
      btnSalvar.disabled = false;
    }
  }

  async function resumirAgora() {
    btnAgora.disabled = true;
    statusAgora.textContent = 'Gerando resumo… pode levar alguns segundos.';
    statusAgora.className = 'text-sm text-slate-500';

    try {
      const resultado = await S.api.post('/api/summaries/generate');

      if (resultado.generated) {
        const dia = resultado.date ? S.formatShortDate(resultado.date) : 'hoje';
        statusAgora.textContent = `Resumo de ${dia} gerado.`;
        statusAgora.className = 'text-sm text-brand-700';
        S.toast('Resumo gerado.');
        S.recarregarResumos?.();
      } else {
        statusAgora.textContent = resultado.message || 'Nenhuma mensagem para resumir.';
        statusAgora.className = 'text-sm text-slate-500';
      }
    } catch (err) {
      statusAgora.textContent = err.message;
      statusAgora.className = 'text-sm text-red-600';
      S.toast(err.message, 'erro');
    } finally {
      btnAgora.disabled = false;
    }
  }

  btnSalvar?.addEventListener('click', salvar);
  btnAgora?.addEventListener('click', resumirAgora);

  S.registerView('config', {
    titulo: 'Configurações',
    subtitulo: 'Quando o resumo é gerado e disparo manual.',
    onEnter: () => {
      if (!settings) carregar();
    },
    onRefresh: carregar,
    onBoot: carregar,
  });
})();
