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

-- RLS ligado para bloquear acesso direto com a chave anon
alter table public.raw_messages enable row level security;
alter table public.daily_summaries enable row level security;
