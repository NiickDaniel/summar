-- Schema do Summar. Idempotente: pode rodar de novo sem duplicar nada.

create extension if not exists "pgcrypto";

-- Mensagens cruas recebidas pelo webhook
create table if not exists public.raw_messages (
  id          uuid primary key default gen_random_uuid(),
  group_id    text not null,
  sender_name text,
  content     text,
  created_at  timestamptz not null default now()
);

comment on table public.raw_messages is 'Mensagens cruas capturadas do grupo de WhatsApp monitorado.';
comment on column public.raw_messages.group_id is 'ID do grupo do WhatsApp (deve bater com WHATSAPP_GROUP_ID).';

create index if not exists idx_raw_messages_group_created
  on public.raw_messages (group_id, created_at);

-- Resumos diários gerados pela OpenAI
create table if not exists public.daily_summaries (
  id             uuid primary key default gen_random_uuid(),
  date           date not null unique,
  overview       text,
  key_points     text,
  pending_tasks  text,
  created_at     timestamptz not null default now()
);

comment on table public.daily_summaries is 'Resumos diários da conversa do grupo, gerados via OpenAI.';

create index if not exists idx_daily_summaries_date
  on public.daily_summaries (date desc);

-- Tarefas enviadas para a lista a partir dos resumos (ou criadas na mao)
create table if not exists public.todos (
  id           uuid primary key default gen_random_uuid(),
  title        text not null,
  source_date  date,
  done         boolean not null default false,
  created_at   timestamptz not null default now(),
  completed_at timestamptz
);

comment on table public.todos is 'Lista de tarefas do usuario.';
comment on column public.todos.source_date is 'Dia do resumo que originou a tarefa; null quando criada manualmente.';

create index if not exists idx_todos_done_created
  on public.todos (done, created_at desc);

-- Configuracoes da aplicacao: uma linha so, fixada em id = 1
create table if not exists public.app_settings (
  id           smallint primary key default 1,
  summary_time text not null default '22:00',
  timezone     text not null default 'America/Sao_Paulo',
  auto_enabled boolean not null default true,
  updated_at   timestamptz not null default now(),
  constraint app_settings_linha_unica check (id = 1),
  constraint app_settings_hora_valida check (summary_time ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$')
);

comment on table public.app_settings is 'Configuracoes editaveis pela tela (horario e disparo do resumo).';

insert into public.app_settings (id) values (1) on conflict (id) do nothing;

-- RLS ligado para bloquear acesso direto com a chave anon
alter table public.raw_messages enable row level security;
alter table public.daily_summaries enable row level security;
alter table public.todos enable row level security;
alter table public.app_settings enable row level security;
