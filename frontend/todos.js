// Aba Tarefas: lista, conclui e remove as tarefas enviadas dos resumos
(() => {
  const S = window.Summar;
  const container = document.getElementById('todosContent');
  const form = document.getElementById('todoForm');
  const input = document.getElementById('todoInput');

  let tarefas = [];

  function origemLabel(tarefa) {
    if (!tarefa.source_date) {
      return '<span class="text-xs text-slate-400">criada por você</span>';
    }
    return `<span class="text-xs text-slate-400">do resumo de ${S.escapeHtml(S.formatShortDate(tarefa.source_date))}</span>`;
  }

  function itemTemplate(tarefa) {
    const concluida = tarefa.done;
    return `
      <li class="flex items-start gap-3 border-b border-slate-100 px-5 py-3.5 last:border-b-0 sm:px-6">
        <button
          type="button"
          data-toggle-todo="${tarefa.id}"
          class="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition ${
            concluida
              ? 'border-brand-500 bg-brand-500 text-white'
              : 'border-slate-300 bg-white text-transparent hover:border-brand-400'
          }"
          title="${concluida ? 'Marcar como pendente' : 'Marcar como concluída'}"
          aria-label="${concluida ? 'Marcar como pendente' : 'Marcar como concluída'}"
        >${S.ICONS.check}</button>

        <div class="min-w-0 flex-1">
          <p class="text-sm leading-relaxed ${concluida ? 'text-slate-400 line-through' : 'text-slate-700'}">${S.escapeHtml(tarefa.title)}</p>
          <div class="mt-0.5">${origemLabel(tarefa)}</div>
        </div>

        <button
          type="button"
          data-remove-todo="${tarefa.id}"
          class="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-slate-300 transition hover:bg-red-50 hover:text-red-500"
          title="Remover tarefa"
          aria-label="Remover tarefa"
        >${S.ICONS.trash}</button>
      </li>`;
  }

  function render() {
    const abertas = tarefas.filter((t) => !t.done);
    const concluidas = tarefas.filter((t) => t.done);

    S.stats.setTarefasAbertas(abertas.length);

    if (tarefas.length === 0) {
      S.renderEstadoVazio(
        container,
        S.ICONS.listCheck,
        'Nenhuma tarefa na lista',
        'Nos resumos, clique no + ao lado de uma tarefa pendente para trazê-la para cá. Ou escreva uma acima.'
      );
      return;
    }

    const bloco = (titulo, itens) => `
      <div class="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card">
        <div class="flex items-center justify-between border-b border-slate-100 px-5 py-3 sm:px-6">
          <h2 class="text-sm font-semibold text-slate-700">${titulo}</h2>
          <span class="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-500">${itens.length}</span>
        </div>
        <ul>${itens.map(itemTemplate).join('')}</ul>
      </div>`;

    container.innerHTML = `
      <div class="space-y-4">
        ${abertas.length > 0 ? bloco('Pendentes', abertas) : ''}
        ${concluidas.length > 0 ? bloco('Concluídas', concluidas) : ''}
      </div>`;
  }

  function renderSkeleton() {
    container.innerHTML = `
      <div class="animate-pulse space-y-3 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
        <div class="skeleton h-4 w-2/3 rounded bg-slate-200"></div>
        <div class="skeleton h-4 w-1/2 rounded bg-slate-200"></div>
        <div class="skeleton h-4 w-3/5 rounded bg-slate-200"></div>
      </div>`;
  }

  async function carregar({ comSkeleton = true } = {}) {
    if (comSkeleton) renderSkeleton();
    try {
      tarefas = (await S.api.get('/api/todos')) || [];
      render();
    } catch (err) {
      S.renderErro(container, err.message, () => carregar());
    }
  }

  form?.addEventListener('submit', async (evento) => {
    evento.preventDefault();
    const titulo = input.value.trim();
    if (!titulo) return;

    input.disabled = true;
    try {
      await S.api.post('/api/todos', { title: titulo });
      input.value = '';
      await carregar({ comSkeleton: false });
      S.toast('Tarefa adicionada.');
    } catch (err) {
      S.toast(err.message, 'erro');
    } finally {
      input.disabled = false;
      input.focus();
    }
  });

  container.addEventListener('click', async (evento) => {
    const botaoConcluir = evento.target.closest('[data-toggle-todo]');
    const botaoRemover = evento.target.closest('[data-remove-todo]');

    if (botaoConcluir) {
      const id = botaoConcluir.dataset.toggleTodo;
      const tarefa = tarefas.find((t) => t.id === id);
      if (!tarefa) return;
      botaoConcluir.disabled = true;
      try {
        await S.api.patch(`/api/todos/${id}`, { done: !tarefa.done });
        await carregar({ comSkeleton: false });
        S.recarregarResumos?.();
      } catch (err) {
        botaoConcluir.disabled = false;
        S.toast(err.message, 'erro');
      }
      return;
    }

    if (botaoRemover) {
      const id = botaoRemover.dataset.removeTodo;
      botaoRemover.disabled = true;
      try {
        await S.api.del(`/api/todos/${id}`);
        await carregar({ comSkeleton: false });
        S.recarregarResumos?.();
        S.toast('Tarefa removida.');
      } catch (err) {
        botaoRemover.disabled = false;
        S.toast(err.message, 'erro');
      }
    }
  });

  S.registerView('tarefas', {
    titulo: 'Tarefas',
    subtitulo: 'O que ficou pendente, reunido em um só lugar.',
    onEnter: () => carregar(),
    onRefresh: () => carregar(),
    onBoot: () => carregar({ comSkeleton: false }),
  });

  S.recarregarTarefas = () => carregar({ comSkeleton: false });
})();
