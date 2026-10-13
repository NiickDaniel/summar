// Aba Resumos: lista os resumos e permite mandar tarefas detectadas para a lista
(() => {
  const S = window.Summar;
  const container = document.getElementById('summariesContent');

  // Guarda os títulos por resumo para o botão não precisar carregar texto em atributo
  const pendentesPorResumo = new Map();
  let titulosNaLista = new Set();
  let jaCarregou = false;

  const normalizar = (titulo) => String(titulo).trim().toLowerCase();

  function dateBadge(dateStr) {
    if (dateStr === S.getTodayBrtDateStr()) {
      return '<span class="rounded-full bg-brand-100 px-2 py-0.5 text-xs font-semibold text-brand-700">Hoje</span>';
    }
    if (dateStr === S.getYesterdayBrtDateStr()) {
      return '<span class="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-500">Ontem</span>';
    }
    return '';
  }

  function renderBulletList(text, dotColorClass) {
    const itens = S.parseBullets(text);
    if (itens.length === 0) {
      return '<p class="text-sm italic text-slate-400">Nada por aqui.</p>';
    }
    return `<ul class="space-y-1.5">${itens
      .map(
        (item) =>
          `<li class="flex gap-2.5 text-sm leading-relaxed text-slate-600"><span class="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${dotColorClass}"></span><span>${S.escapeHtml(item)}</span></li>`
      )
      .join('')}</ul>`;
  }

  const marcaJaAdicionada = `
    <span class="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-brand-600" title="Já está nas suas tarefas">
      ${S.ICONS.check}
    </span>`;

  function botaoEnviar(resumoId, indice, dateStr) {
    return `
      <button
        type="button"
        data-add-todo
        data-resumo="${resumoId}"
        data-indice="${indice}"
        data-data="${dateStr}"
        class="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-400 transition hover:border-brand-300 hover:text-brand-600 disabled:opacity-50"
        title="Enviar para Tarefas"
        aria-label="Enviar para Tarefas"
      >${S.ICONS.plus}</button>`;
  }

  // Tarefas pendentes ganham botão de envio; o resto é lista simples
  function renderPendentes(resumo) {
    const itens = S.parseBullets(resumo.pending_tasks);
    pendentesPorResumo.set(resumo.id, itens);

    if (itens.length === 0) {
      return '<p class="text-sm italic text-slate-400">Nada por aqui.</p>';
    }

    return `<ul class="space-y-1">${itens
      .map((item, indice) => {
        const acao = titulosNaLista.has(normalizar(item))
          ? marcaJaAdicionada
          : botaoEnviar(resumo.id, indice, resumo.date);
        return `
          <li class="flex items-start gap-2.5 rounded-lg px-1 py-0.5 text-sm leading-relaxed text-slate-600 transition hover:bg-slate-50">
            <span class="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400"></span>
            <span class="flex-1 py-1">${S.escapeHtml(item)}</span>
            ${acao}
          </li>`;
      })
      .join('')}</ul>`;
  }

  function cardTemplate(resumo, aberto) {
    const bodyId = `body-${resumo.id}`;
    return `
      <article class="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card transition-shadow duration-150 hover:shadow-md">
        <button type="button" class="flex w-full items-center justify-between gap-4 px-5 py-4 text-left sm:px-6" data-toggle aria-expanded="${aberto}" aria-controls="${bodyId}">
          <div class="flex min-w-0 items-center gap-3">
            <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">${S.ICONS.calendar}</div>
            <div class="min-w-0">
              <div class="flex flex-wrap items-center gap-2">
                <h2 class="truncate font-semibold text-slate-900">${S.escapeHtml(S.formatLongDate(resumo.date))}</h2>
                ${dateBadge(resumo.date)}
              </div>
            </div>
          </div>
          ${S.ICONS.chevron.replace('class="chevron h-5 w-5"', `class="chevron h-5 w-5 shrink-0 text-slate-400${aberto ? ' rotate' : ''}"`)}
        </button>
        <div id="${bodyId}" class="card-body-wrapper${aberto ? ' open' : ''}">
          <div class="card-body-inner">
            <div class="space-y-5 border-t border-slate-100 px-5 pb-5 pt-5 sm:px-6 sm:pb-6">
              <section>
                <h3 class="mb-1.5 flex items-center gap-2 text-sm font-semibold text-slate-700">${S.ICONS.overview}Visão geral</h3>
                <p class="text-sm leading-relaxed text-slate-600">${S.escapeHtml(resumo.overview) || '<span class="italic text-slate-400">Sem resumo.</span>'}</p>
              </section>
              <section>
                <h3 class="mb-1.5 flex items-center gap-2 text-sm font-semibold text-slate-700">${S.ICONS.keyPoints}Pontos importantes</h3>
                ${renderBulletList(resumo.key_points, 'bg-brand-400')}
              </section>
              <section>
                <h3 class="mb-1.5 flex items-center gap-2 text-sm font-semibold text-amber-700">${S.ICONS.pendingTasks}Tarefas pendentes</h3>
                ${renderPendentes(resumo)}
              </section>
            </div>
          </div>
        </div>
      </article>`;
  }

  function renderSkeleton() {
    const card = `
      <div class="animate-pulse rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
        <div class="flex items-center gap-3">
          <div class="skeleton h-10 w-10 rounded-xl bg-slate-200"></div>
          <div class="flex-1 space-y-2">
            <div class="skeleton h-4 w-1/3 rounded bg-slate-200"></div>
          </div>
        </div>
      </div>`;
    container.innerHTML = `<div class="space-y-4">${card}${card}${card}</div>`;
  }

  function renderLista(resumos) {
    container.innerHTML = `<div class="space-y-4">${resumos
      .map((resumo, indice) => cardTemplate(resumo, indice === 0))
      .join('')}</div>`;

    container.querySelectorAll('[data-toggle]').forEach((botao) => {
      botao.addEventListener('click', () => {
        const corpo = document.getElementById(botao.getAttribute('aria-controls'));
        const chevron = botao.querySelector('.chevron');
        const vaiAbrir = !corpo.classList.contains('open');
        corpo.classList.toggle('open', vaiAbrir);
        chevron?.classList.toggle('rotate', vaiAbrir);
        botao.setAttribute('aria-expanded', String(vaiAbrir));
      });
    });
  }

  async function carregar() {
    renderSkeleton();
    try {
      const [resumos, tarefas] = await Promise.all([
        S.api.get('/api/summaries'),
        S.api.get('/api/todos').catch(() => []),
      ]);

      titulosNaLista = new Set(
        (tarefas || []).filter((t) => !t.done).map((t) => normalizar(t.title))
      );

      const lista = Array.isArray(resumos) ? resumos : [];
      S.stats.setResumos(lista.length, lista[0] ? lista[0].date : null);
      jaCarregou = true;

      if (lista.length === 0) {
        S.renderEstadoVazio(
          container,
          S.ICONS.inbox,
          'Nenhum resumo ainda',
          'Assim que houver mensagens no grupo, o resumo do dia aparece aqui no horário definido em Configurações.'
        );
        return;
      }

      renderLista(lista);
    } catch (err) {
      S.stats.setResumos(0, null);
      S.renderErro(container, err.message, carregar);
    }
  }

  // Envio de uma tarefa pendente para a lista
  container.addEventListener('click', async (evento) => {
    const botao = evento.target.closest('[data-add-todo]');
    if (!botao) return;

    const itens = pendentesPorResumo.get(botao.dataset.resumo) || [];
    const titulo = itens[Number(botao.dataset.indice)];
    if (!titulo) return;

    botao.disabled = true;
    try {
      await S.api.post('/api/todos', { title: titulo, source_date: botao.dataset.data });
      titulosNaLista.add(normalizar(titulo));
      botao.outerHTML = marcaJaAdicionada;
      S.toast('Tarefa enviada para a sua lista.');
      S.recarregarTarefas?.();
    } catch (err) {
      botao.disabled = false;
      S.toast(err.message, 'erro');
    }
  });

  S.registerView('resumos', {
    titulo: 'Resumos diários',
    subtitulo: 'O que rolou no grupo da turma, dia após dia.',
    onEnter: () => {
      if (!jaCarregou) carregar();
    },
    onRefresh: carregar,
  });

  S.recarregarResumos = carregar;
})();
