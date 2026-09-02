// Summar — frontend (vanilla JS)
// Busca os resumos diários no backend e renderiza os cards na tela.

const API_BASE_URL = (window.APP_CONFIG && window.APP_CONFIG.apiBaseUrl) || 'http://localhost:3000';

const contentEl = document.getElementById('content');
const refreshBtn = document.getElementById('refreshBtn');
const statTotalEl = document.getElementById('statTotalSummaries');
const statLastUpdateEl = document.getElementById('statLastUpdate');

const ICONS = {
  calendar:
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-5 w-5"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>',
  chevron:
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="chevron h-5 w-5"><path d="m6 9 6 6 6-6"/></svg>',
  overview:
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-4 w-4"><path d="m12 3-1.9 4.6-4.6 1.9 4.6 1.9L12 16l1.9-4.6 4.6-1.9-4.6-1.9L12 3zM5 17l-1 2-1-2-2-1 2-1 1-2 1 2 2 1-2 1zM19 17l-.7 1.4L17 19l1.3.6.7 1.4.7-1.4 1.3-.6-1.3-.6L19 17z"/></svg>',
  keyPoints:
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-4 w-4"><path d="m9 12 2 2 4-4M12 3a9 9 0 1 0 9 9"/></svg>',
  pendingTasks:
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-4 w-4"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/></svg>',
  inbox:
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="h-10 w-10"><path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/></svg>',
  alert:
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="h-10 w-10"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0zM12 9v4M12 17h.01"/></svg>',
};

/** Data de hoje em BRT ("YYYY-MM-DD"), consistente com o backend. */
function getTodayBrtDateStr() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date());
}

/** Data de ontem em BRT ("YYYY-MM-DD"). */
function getYesterdayBrtDateStr() {
  const todayUtcNoon = new Date(`${getTodayBrtDateStr()}T12:00:00Z`);
  todayUtcNoon.setUTCDate(todayUtcNoon.getUTCDate() - 1);
  return todayUtcNoon.toISOString().slice(0, 10);
}

/** Formata "YYYY-MM-DD" para "quinta-feira, 28 de agosto" (em UTC, para não deslizar de dia). */
function formatLongDate(dateStr) {
  const date = new Date(`${dateStr}T00:00:00Z`);
  const formatted = new Intl.DateTimeFormat('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    timeZone: 'UTC',
  }).format(date);
  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str == null ? '' : String(str);
  return div.innerHTML;
}

/** Quebra um texto tipo "- item\n- item" em uma lista de strings limpas. */
function parseBullets(text) {
  if (!text) return [];
  return String(text)
    .split('\n')
    .map((line) => line.replace(/^[-•*]\s*/, '').trim())
    .filter(Boolean);
}

function renderBulletList(text, dotColorClass) {
  const items = parseBullets(text);
  if (items.length === 0) {
    return '<p class="text-sm italic text-slate-400">Nada por aqui.</p>';
  }
  return `<ul class="space-y-1.5">${items
    .map(
      (item) =>
        `<li class="flex gap-2.5 text-sm leading-relaxed text-slate-600"><span class="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${dotColorClass}"></span><span>${escapeHtml(item)}</span></li>`
    )
    .join('')}</ul>`;
}

function dateBadge(dateStr) {
  if (dateStr === getTodayBrtDateStr()) {
    return '<span class="rounded-full bg-brand-100 px-2 py-0.5 text-xs font-semibold text-brand-700">Hoje</span>';
  }
  if (dateStr === getYesterdayBrtDateStr()) {
    return '<span class="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-500">Ontem</span>';
  }
  return '';
}

function summaryCardTemplate(summary, isOpen) {
  const bodyId = `body-${summary.id}`;
  return `
    <article class="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card transition-shadow duration-150 hover:shadow-md">
      <button type="button" class="flex w-full items-center justify-between gap-4 px-5 py-4 text-left sm:px-6" data-toggle aria-expanded="${isOpen}" aria-controls="${bodyId}">
        <div class="flex min-w-0 items-center gap-3">
          <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">${ICONS.calendar}</div>
          <div class="min-w-0">
            <div class="flex flex-wrap items-center gap-2">
              <h2 class="truncate font-semibold text-slate-900">${escapeHtml(formatLongDate(summary.date))}</h2>
              ${dateBadge(summary.date)}
            </div>
          </div>
        </div>
        ${ICONS.chevron.replace('class="chevron h-5 w-5"', `class="chevron h-5 w-5 shrink-0 text-slate-400${isOpen ? ' rotate' : ''}"`)}
      </button>
      <div id="${bodyId}" class="card-body-wrapper${isOpen ? ' open' : ''}">
        <div class="card-body-inner">
          <div class="space-y-5 border-t border-slate-100 px-5 pb-5 pt-5 sm:px-6 sm:pb-6">
            <section>
              <h3 class="mb-1.5 flex items-center gap-2 text-sm font-semibold text-slate-700">${ICONS.overview}Visão geral</h3>
              <p class="text-sm leading-relaxed text-slate-600">${escapeHtml(summary.overview) || '<span class="italic text-slate-400">Sem resumo.</span>'}</p>
            </section>
            <section>
              <h3 class="mb-1.5 flex items-center gap-2 text-sm font-semibold text-slate-700">${ICONS.keyPoints}Pontos importantes</h3>
              ${renderBulletList(summary.key_points, 'bg-brand-400')}
            </section>
            <section>
              <h3 class="mb-1.5 flex items-center gap-2 text-sm font-semibold text-amber-700">${ICONS.pendingTasks}Tarefas pendentes</h3>
              ${renderBulletList(summary.pending_tasks, 'bg-amber-400')}
            </section>
          </div>
        </div>
      </div>
    </article>
  `;
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
    </div>
  `;
  contentEl.innerHTML = `<div class="space-y-4">${card}${card}${card}</div>`;
}

function renderEmpty() {
  contentEl.innerHTML = `
    <div class="flex flex-col items-center rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-16 text-center">
      <div class="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-50 text-brand-400">${ICONS.inbox}</div>
      <h2 class="text-base font-semibold text-slate-800">Nenhum resumo ainda</h2>
      <p class="mt-1.5 max-w-sm text-sm text-slate-500">
        Assim que houver mensagens no grupo, o resumo do dia aparece aqui automaticamente às 22h (horário de Brasília).
      </p>
    </div>
  `;
}

function renderError(message) {
  contentEl.innerHTML = `
    <div class="flex flex-col items-center rounded-2xl border border-red-100 bg-red-50/60 px-6 py-16 text-center">
      <div class="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-red-100 text-red-500">${ICONS.alert}</div>
      <h2 class="text-base font-semibold text-slate-800">Não foi possível carregar os resumos</h2>
      <p class="mt-1.5 max-w-sm text-sm text-slate-500">${escapeHtml(message)}</p>
      <button id="retryBtn" type="button" class="mt-5 rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-card transition hover:bg-brand-700">
        Tentar novamente
      </button>
    </div>
  `;
  document.getElementById('retryBtn')?.addEventListener('click', loadSummaries);
}

function renderList(summaries) {
  contentEl.innerHTML = `<div class="space-y-4">${summaries
    .map((summary, index) => summaryCardTemplate(summary, index === 0))
    .join('')}</div>`;

  contentEl.querySelectorAll('[data-toggle]').forEach((button) => {
    button.addEventListener('click', () => {
      const body = document.getElementById(button.getAttribute('aria-controls'));
      const chevron = button.querySelector('.chevron');
      const willOpen = !body.classList.contains('open');
      body.classList.toggle('open', willOpen);
      chevron?.classList.toggle('rotate', willOpen);
      button.setAttribute('aria-expanded', String(willOpen));
    });
  });
}

function updateStats(summaries) {
  statTotalEl.textContent = String(summaries.length);
  statLastUpdateEl.textContent = summaries.length > 0 ? formatShortDate(summaries[0].date) : '—';
}

function formatShortDate(dateStr) {
  const date = new Date(`${dateStr}T00:00:00Z`);
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', timeZone: 'UTC' }).format(date);
}

async function loadSummaries() {
  renderSkeleton();
  try {
    const res = await fetch(`${API_BASE_URL}/api/summaries`);
    if (!res.ok) {
      throw new Error(`O servidor respondeu com status ${res.status}.`);
    }
    const summaries = await res.json();
    updateStats(summaries);

    if (!Array.isArray(summaries) || summaries.length === 0) {
      renderEmpty();
      return;
    }

    renderList(summaries);
  } catch (err) {
    updateStats([]);
    const message =
      err instanceof TypeError
        ? 'Não foi possível conectar ao backend. Verifique se ele está rodando.'
        : err.message;
    renderError(message);
  }
}

// --- Sidebar mobile ---
const sidebar = document.getElementById('sidebar');
const sidebarOverlay = document.getElementById('sidebarOverlay');
const menuBtn = document.getElementById('menuBtn');
const closeSidebarBtn = document.getElementById('closeSidebarBtn');

function openSidebar() {
  sidebar.classList.remove('-translate-x-full');
  sidebarOverlay.classList.remove('hidden');
}

function closeSidebar() {
  sidebar.classList.add('-translate-x-full');
  sidebarOverlay.classList.add('hidden');
}

menuBtn?.addEventListener('click', openSidebar);
closeSidebarBtn?.addEventListener('click', closeSidebar);
sidebarOverlay?.addEventListener('click', closeSidebar);

// --- Modal "Como funciona" ---
const aboutBtn = document.getElementById('aboutBtn');
const aboutModal = document.getElementById('aboutModal');
const closeAboutBtn = document.getElementById('closeAboutBtn');

function openAbout() {
  aboutModal.classList.remove('hidden');
  aboutModal.classList.add('flex');
}

function closeAbout() {
  aboutModal.classList.add('hidden');
  aboutModal.classList.remove('flex');
}

aboutBtn?.addEventListener('click', openAbout);
closeAboutBtn?.addEventListener('click', closeAbout);
aboutModal?.addEventListener('click', (event) => {
  if (event.target === aboutModal) closeAbout();
});

// --- Refresh ---
refreshBtn?.addEventListener('click', loadSummaries);

// --- Boot ---
loadSummaries();
