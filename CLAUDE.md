# CLAUDE.md

Contexto do projeto **Summar** para sessões futuras do Claude Code (ou de
qualquer outro dev). Especificação original em [spec.md](./spec.md).

## O que é

Resumidor diário de um grupo de WhatsApp da faculdade. Um webhook recebe as
mensagens do grupo, elas ficam salvas cruas no banco, e todo dia às 22h
(horário de Brasília) um cron gera um resumo do dia via OpenAI — visão geral,
pontos importantes e tarefas/atividades pendentes — que fica disponível numa
interface web.

## Stack

| Camada     | Tecnologia                                                             |
| ---------- | ----------------------------------------------------------------------- |
| Backend    | Node.js 22 + Express, `@supabase/supabase-js`, `openai`, `node-cron`    |
| Frontend   | HTML/CSS/JS puro (sem build step), Tailwind CSS via CDN, fonte Inter    |
| Banco      | Supabase (PostgreSQL) — **único componente fora do Docker**             |
| Infra      | Docker + Docker Compose (backend `:3000`, frontend `:8080`)             |

Sem framework de frontend de propósito: os arquivos `frontend/index.html`,
`frontend/styles.css` e `frontend/app.js` são servidos estaticamente via
Nginx, exatamente como pedido na spec.

## Arquitetura / fluxo de dados

```
EvolutionAPI --POST--> backend /webhook/evolution --> Supabase.raw_messages
                                                              |
                                              cron 22h BRT (node-cron)
                                                              |
                                             busca mensagens do dia --> OpenAI
                                                              |
                                                   Supabase.daily_summaries
                                                              |
frontend (Nginx, :8080) --GET /api/summaries--> backend (:3000) --> Supabase
```

Detalhes que importam:

- O webhook **filtra por `WHATSAPP_GROUP_ID`**: mensagens de qualquer outro
  grupo são descartadas (mas o endpoint sempre responde `200`, para a
  EvolutionAPI não ficar reentregando).
- O webhook aceita tanto o payload real da EvolutionAPI (evento
  `messages.upsert`, com `data.key.remoteJid`, `data.message.conversation`
  etc. — ver [backend/src/controllers/webhook.controller.js](./backend/src/controllers/webhook.controller.js))
  quanto um payload simplificado `{ data: { group_id, sender_name, content } }`,
  para testar com `curl` sem precisar de uma instância real da EvolutionAPI.
- O cron roda com `node-cron` no timezone `America/Sao_Paulo`. A conversão de
  datas assume BRT = UTC-03:00 fixo (Brasil não tem mais horário de verão
  desde 2019), ver [backend/src/utils/date.js](./backend/src/utils/date.js).
- Existe um endpoint extra, **fora da spec original**, para facilitar
  demonstração/teste sem esperar as 22h: `POST /api/summaries/generate`
  (opcionalmente `{ "date": "YYYY-MM-DD" }` no body) roda a mesma lógica do
  cron sob demanda.
- `daily_summaries.date` tem constraint `unique`; gerar de novo o resumo de um
  dia faz `upsert` (sobrescreve o resumo existente daquele dia).

## Estrutura de pastas

```
summar/
├── backend/
│   ├── src/
│   │   ├── config/       # env.js, supabaseClient.js
│   │   ├── controllers/  # webhook.controller.js, summaries.controller.js
│   │   ├── routes/       # webhook.routes.js, summaries.routes.js
│   │   ├── services/     # messages, summaries, openai, cron
│   │   ├── utils/        # date.js (BRT helpers)
│   │   ├── app.js        # express app + middlewares
│   │   └── server.js     # entrypoint (listen + start cron)
│   ├── .env               # segredos reais (gitignored)
│   ├── .env.example        # template documentado
│   └── Dockerfile
├── frontend/
│   ├── index.html   # shell (sidebar + área de conteúdo)
│   ├── styles.css    # scrollbar, seleção, animação do accordion dos cards
│   ├── app.js         # fetch de /api/summaries + toda a renderização
│   ├── nginx.conf
│   └── Dockerfile
├── supabase/
│   └── schema.sql    # DDL de raw_messages e daily_summaries (idempotente)
├── docker-compose.yml # sobe backend (:3000) e frontend (:8080) juntos
├── CLAUDE.md
├── README.md
└── spec.md
```

## Banco de dados

Projeto Supabase: `tvywtlmfiayifcpvnbgv` (região Oregon/us-west-2). O schema
em [`supabase/schema.sql`](./supabase/schema.sql) já foi aplicado diretamente
nesse projeto (conexão Postgres via connection pooler, usando a senha que
veio em `.env.dev` — o host de conexão direta só resolve em IPv6 nesta rede,
por isso o pooler `aws-0-us-west-2.pooler.supabase.com` foi usado).

Tabelas:

- **`raw_messages`**: `id uuid pk`, `group_id text`, `sender_name text`,
  `content text`, `created_at timestamptz default now()`. Índice em
  `(group_id, created_at)`.
- **`daily_summaries`**: `id uuid pk`, `date date unique`, `overview text`,
  `key_points text`, `pending_tasks text`, `created_at timestamptz`. `key_points`
  e `pending_tasks` são salvos como texto com uma linha por item (`"- item"`);
  o frontend faz o parse de volta para lista.

RLS está habilitado nas duas tabelas — só o backend acessa o banco, usando a
`service_role` key (que ignora RLS por design).

## Variáveis de ambiente (`backend/.env`)

| Variável            | Descrição                                                     | Status                                   |
| ------------------- | -------------------------------------------------------------- | ----------------------------------------- |
| `SUPABASE_URL`      | URL do projeto                                                  | preenchido a partir do `.env.dev`         |
| `SUPABASE_KEY`      | Chave **service_role** (não a `anon`)                           | preenchido                                |
| `OPENAI_API_KEY`    | Chave da OpenAI                                                 | preenchido a partir do `.env.dev`         |
| `OPENAI_MODEL`      | Modelo usado no resumo                                          | `gpt-4o-mini` (padrão)                    |
| `WHATSAPP_GROUP_ID` | ID do grupo monitorado (`xxxxx@g.us`)                            | **em aberto** — só se descobre configurando a EvolutionAPI e olhando o payload que ela manda |
| `CRON_SCHEDULE`     | Expressão cron do resumo diário                                 | `0 22 * * *`                              |
| `CRON_TIMEZONE`     | Timezone do cron                                                | `America/Sao_Paulo`                       |

`backend/.env` está no `.gitignore`. Quem for reproduzir o setup usa
`backend/.env.example` como template. `.env.dev`, na raiz, foi o arquivo com
as credenciais originais fornecidas para o bootstrap do projeto — também está
gitignored e não deve ser commitado.

## Design do frontend

Pedido explícito: visual limpo, cards arredondados, sidebar lateral, paleta
neutra (branco/cinza) com azul bem claro de destaque.

- Layout: sidebar fixa à esquerda (`w-72`, branca, `border-r`) com marca,
  navegação, um bloco de estatísticas (total de dias resumidos + data do
  último resumo, calculado no `app.js`) e um modal "Como funciona". Em telas
  pequenas a sidebar vira um drawer (`-translate-x-full` + overlay).
- Paleta: fundo `slate-50`, cards `bg-white` com `border-slate-200` e
  `shadow-card` (sombra customizada, bem sutil), acento em `brand-*` (escala
  azul clara definida no `tailwind.config` inline do `index.html`, baseada em
  `blue-50..700`). Tarefas pendentes usam um leve acento âmbar só no
  ícone/título da seção (sinalização semântica, não domina a paleta).
  Tipografia: Inter (Google Fonts).
  - Cada card de resumo é expansível (accordion via CSS
  `grid-template-rows` em [`frontend/styles.css`](./frontend/styles.css),
  sem JS de cálculo de altura). O card do dia mais recente já abre expandido.
- Tailwind é carregado via CDN (`cdn.tailwindcss.com`) — sem build step, como
  pedido na spec.

## Rodando localmente

```bash
docker compose up -d --build
# backend:  http://localhost:3000  (GET /health, GET /api/summaries)
# frontend: http://localhost:8080
```

O frontend chama o backend em `http://localhost:3000` — configurado em
`window.APP_CONFIG.apiBaseUrl` no `<script>` inline de `frontend/index.html`
(o navegador acessa portas publicadas no host, não o nome do serviço na rede
interna do Compose, então isso é intencional e precisa ser ajustado ali se o
backend for exposto em outro host/porta em produção).

Testar sem a EvolutionAPI (payload simplificado aceito pelo webhook) e forçar
a geração de um resumo sem esperar o cron: ver seção "Testando sem a
EvolutionAPI" no [README.md](./README.md).

## Pontos em aberto / próximos passos

- **`WHATSAPP_GROUP_ID` não está preenchido** — falta configurar a
  EvolutionAPI apontando o webhook para `POST /webhook/evolution` e capturar
  o `remoteJid` do grupo real.
- A EvolutionAPI em si (a instância que conecta ao WhatsApp) não faz parte
  deste repositório/Docker Compose — só o endpoint que a recebe.
- Sem testes automatizados (fora de escopo da spec original; projeto
  acadêmico).
- Sem autenticação nas rotas — aceitável para o escopo do projeto, mas seria
  o primeiro item a endurecer antes de qualquer uso além do acadêmico.
