// Núcleo compartilhado: chamadas à API, helpers e troca de abas

// Sem apiBaseUrl definido, usa o mesmo host da página na porta 3000
const API_BASE_URL =
  (window.APP_CONFIG && window.APP_CONFIG.apiBaseUrl) ||
  `${window.location.protocol}//${window.location.hostname}:3000`;

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
  plus:
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-4 w-4"><path d="M12 5v14M5 12h14"/></svg>',
  check:
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="h-4 w-4"><path d="M20 6 9 17l-5-5"/></svg>',
  trash:
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-4 w-4"><path d="M3 6h18M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6M10 11v6M14 11v6M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>',
  listCheck:
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="h-10 w-10"><path d="m3 7 2 2 4-4M3 17l2 2 4-4M13 7h8M13 17h8"/></svg>',
};

// Chamada HTTP com erro já traduzido para mensagem legível
async function request(metodo, caminho, corpo) {
  let res;
  try {
    res = await fetch(`${API_BASE_URL}${caminho}`, {
      method: metodo,
      headers: corpo !== undefined ? { 'Content-Type': 'application/json' } : undefined,
      body: corpo !== undefined ? JSON.stringify(corpo) : undefined,
    });
  } catch {
    throw new Error('Não foi possível conectar ao backend. Verifique se ele está rodando.');
  }

  if (res.status === 204) return null;

  const texto = await res.text();
  let dados = null;
  try {
    dados = texto ? JSON.parse(texto) : null;
  } catch {
    dados = null;
  }

  if (!res.ok) {
    throw new Error((dados && dados.error) || `O servidor respondeu com status ${res.status}.`);
  }
  return dados;
}

const api = {
  get: (caminho) => request('GET', caminho),
  post: (caminho, corpo) => request('POST', caminho, corpo || {}),
  put: (caminho, corpo) => request('PUT', caminho, corpo || {}),
  patch: (caminho, corpo) => request('PATCH', caminho, corpo || {}),
  del: (caminho) => request('DELETE', caminho),
};

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str == null ? '' : String(str);
  return div.innerHTML;
}

// Data de hoje em BRT, igual ao backend
function getTodayBrtDateStr() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date());
}

// Data de ontem em BRT
function getYesterdayBrtDateStr() {
  const meioDiaUtc = new Date(`${getTodayBrtDateStr()}T12:00:00Z`);
  meioDiaUtc.setUTCDate(meioDiaUtc.getUTCDate() - 1);
  return meioDiaUtc.toISOString().slice(0, 10);
}

// Formata a data por extenso (em UTC, para não pular de dia)
function formatLongDate(dateStr) {
  const date = new Date(`${dateStr}T00:00:00Z`);
  const formatada = new Intl.DateTimeFormat('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    timeZone: 'UTC',
  }).format(date);
  return formatada.charAt(0).toUpperCase() + formatada.slice(1);
}

function formatShortDate(dateStr) {
  const date = new Date(`${dateStr}T00:00:00Z`);
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    timeZone: 'UTC',
  }).format(date);
}

// Quebra o texto do resumo em uma lista de itens
function parseBullets(text) {
  if (!text) return [];
  return String(text)
    .split('\n')
    .map((linha) => linha.replace(/^[-•*]\s*/, '').trim())
    .filter(Boolean);
}

function renderEstadoVazio(container, icone, titulo, descricao) {
  container.innerHTML = `
    <div class="flex flex-col items-center rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-16 text-center">
      <div class="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-50 text-brand-400">${icone}</div>
      <h2 class="text-base font-semibold text-slate-800">${escapeHtml(titulo)}</h2>
      <p class="mt-1.5 max-w-sm text-sm text-slate-500">${escapeHtml(descricao)}</p>
    </div>
  `;
}

function renderErro(container, mensagem, aoTentarNovamente) {
  container.innerHTML = `
    <div class="flex flex-col items-center rounded-2xl border border-red-100 bg-red-50/60 px-6 py-16 text-center">
      <div class="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-red-100 text-red-500">${ICONS.alert}</div>
      <h2 class="text-base font-semibold text-slate-800">Algo deu errado</h2>
      <p class="mt-1.5 max-w-sm text-sm text-slate-500">${escapeHtml(mensagem)}</p>
      <button data-retry type="button" class="mt-5 rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-card transition hover:bg-brand-700">
        Tentar novamente
      </button>
    </div>
  `;
  container.querySelector('[data-retry]')?.addEventListener('click', aoTentarNovamente);
}

// Aviso rápido no rodapé da tela
let timerToast = null;
function toast(mensagem, tipo = 'ok') {
  const el = document.getElementById('toast');
  if (!el) return;
  const cor = tipo === 'erro' ? 'bg-red-600' : 'bg-slate-900';
  el.innerHTML = `<div class="${cor} rounded-xl px-4 py-2.5 text-sm font-medium text-white shadow-lg">${escapeHtml(mensagem)}</div>`;
  el.classList.remove('opacity-0');
  clearTimeout(timerToast);
  timerToast = setTimeout(() => el.classList.add('opacity-0'), 2600);
}

// Registro de abas: cada arquivo de view se cadastra aqui
const views = new Map();
let viewAtual = null;

function registerView(nome, config) {
  views.set(nome, config);
}

function navigate(nome) {
  if (!views.has(nome)) return;
  viewAtual = nome;

  document.querySelectorAll('[data-view]').forEach((secao) => {
    secao.hidden = secao.dataset.view !== nome;
  });
  document.querySelectorAll('[data-view-link]').forEach((link) => {
    link.classList.toggle('ativo', link.dataset.viewLink === nome);
  });

  const { titulo, subtitulo, onEnter } = views.get(nome);
  document.getElementById('viewTitle').textContent = titulo;
  document.getElementById('viewSubtitle').textContent = subtitulo;

  if (typeof onEnter === 'function') onEnter();
  fecharSidebar();
}

function refreshViewAtual() {
  const config = views.get(viewAtual);
  if (config && typeof config.onRefresh === 'function') config.onRefresh();
}

// Contadores da sidebar, alimentados pelas views
const stats = {
  setResumos(total, ultimaData) {
    document.getElementById('statTotalSummaries').textContent = String(total);
    document.getElementById('statLastUpdate').textContent = ultimaData
      ? formatShortDate(ultimaData)
      : '—';
  },
  setTarefasAbertas(total) {
    document.getElementById('statOpenTodos').textContent = String(total);
    const badge = document.getElementById('navTodoCount');
    badge.textContent = String(total);
    badge.classList.toggle('hidden', total === 0);
  },
  setAgendamento(texto) {
    document.getElementById('sidebarScheduleInfo').textContent = texto;
  },
};

// Sidebar no mobile
const sidebar = document.getElementById('sidebar');
const sidebarOverlay = document.getElementById('sidebarOverlay');

function abrirSidebar() {
  sidebar.classList.remove('-translate-x-full');
  sidebarOverlay.classList.remove('hidden');
}

function fecharSidebar() {
  sidebar.classList.add('-translate-x-full');
  sidebarOverlay.classList.add('hidden');
}

// Modal "Como funciona"
const aboutModal = document.getElementById('aboutModal');

function abrirAbout() {
  aboutModal.classList.remove('hidden');
  aboutModal.classList.add('flex');
}

function fecharAbout() {
  aboutModal.classList.add('hidden');
  aboutModal.classList.remove('flex');
}

window.Summar = {
  api,
  ICONS,
  escapeHtml,
  parseBullets,
  formatLongDate,
  formatShortDate,
  getTodayBrtDateStr,
  getYesterdayBrtDateStr,
  renderEstadoVazio,
  renderErro,
  toast,
  registerView,
  navigate,
  stats,
};

// Os arquivos de view já rodaram e se registraram quando o DOM fica pronto
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('menuBtn')?.addEventListener('click', abrirSidebar);
  document.getElementById('closeSidebarBtn')?.addEventListener('click', fecharSidebar);
  sidebarOverlay?.addEventListener('click', fecharSidebar);

  document.getElementById('aboutBtn')?.addEventListener('click', abrirAbout);
  document.getElementById('closeAboutBtn')?.addEventListener('click', fecharAbout);
  aboutModal?.addEventListener('click', (evento) => {
    if (evento.target === aboutModal) fecharAbout();
  });

  document.querySelectorAll('[data-view-link]').forEach((link) => {
    link.addEventListener('click', () => navigate(link.dataset.viewLink));
  });

  document.getElementById('refreshBtn')?.addEventListener('click', refreshViewAtual);

  navigate('resumos');

  // Settings e tarefas alimentam a sidebar, então carregam no boot
  views.get('config')?.onBoot?.();
  views.get('tarefas')?.onBoot?.();
});
