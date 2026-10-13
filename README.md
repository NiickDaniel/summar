# Summar

Resumidor diário do grupo de WhatsApp da faculdade. Captura mensagens via
webhook da EvolutionAPI, gera um resumo diário com a OpenAI (visão geral,
pontos importantes e tarefas pendentes) e exibe tudo em uma interface web
simples e limpa, com três abas:

- **Resumos** — os resumos por dia; cada tarefa pendente tem um `+` que a
  manda para a sua lista.
- **Tarefas** — a lista, com conclusão, remoção e criação manual.
- **Configurações** — horário do disparo, liga/desliga do resumo automático,
  fuso horário e o botão "Resumir agora".

Veja [CLAUDE.md](./CLAUDE.md) para o contexto completo do projeto (arquitetura,
decisões e pontos em aberto) e [spec.md](./spec.md) para a especificação original.

## Stack

- **Backend:** Node.js + Express, `@supabase/supabase-js`, `openai`, `node-cron`
- **Frontend:** HTML + CSS + JavaScript puro, Tailwind CSS via CDN
- **Banco:** Supabase (PostgreSQL) — único componente **fora** do Docker
- **Infra:** Docker + Docker Compose (backend na porta `3000`, frontend na `8080`)

## Como rodar

1. Preencha `backend/.env` (copie de `backend/.env.example` se ainda não existir):
   - `SUPABASE_URL` e `SUPABASE_KEY` (service_role) — dashboard do Supabase em *Project Settings > API*
   - `OPENAI_API_KEY`
   - `WHATSAPP_GROUP_ID` — ID do grupo monitorado (formato `xxxxx@g.us`, você descobre pelo payload de qualquer webhook que a EvolutionAPI mandar desse grupo)

2. Suba os dois serviços:

   ```bash
   docker compose up -d --build
   ```

3. Acesse:
   - Frontend: http://localhost:8080
   - Backend: http://localhost:3000/health

## Testando sem a EvolutionAPI

O webhook aceita um payload simplificado, útil para gerar dados de teste:

```bash
curl -X POST http://localhost:3000/webhook/evolution \
  -H "Content-Type: application/json" \
  -d '{"data":{"group_id":"SEU_WHATSAPP_GROUP_ID","sender_name":"Fulano","content":"Bora resolver a lista de exercícios até sexta"}}'
```

Depois, dispare a geração do resumo sem esperar o horário agendado — pelo
botão "Resumir agora" na aba Configurações ou direto na API:

```bash
curl -X POST http://localhost:3000/api/summaries/generate
```

E veja o resultado em `GET /api/summaries` ou direto no frontend.

## Mudando o horário do resumo

O horário fica no banco (tabela `app_settings`), não no `.env`. Mude pela aba
**Configurações** ou pela API — nos dois casos o cron é **reagendado na hora**,
sem reiniciar o container:

```bash
curl -X PUT http://localhost:3000/api/settings \
  -H "Content-Type: application/json" \
  -d '{"summary_time":"21:30","auto_enabled":true}'
```

## Schema do banco

O SQL usado está em [`supabase/schema.sql`](./supabase/schema.sql) e já foi
aplicado no projeto Supabase configurado em `backend/.env`. Para reaplicar (é
idempotente) em outro projeto, rode o script no SQL Editor do Supabase.
