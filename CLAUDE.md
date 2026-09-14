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
| `WHATSAPP_GROUP_ID` | ID do grupo monitorado (`xxxxx@g.us`)                            | `120363319840837485@g.us` (grupo "Geral") |
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

O frontend descobre o backend sozinho: `window.APP_CONFIG.apiBaseUrl`
(`<script>` inline em `frontend/index.html`) fica **vazio** por padrão, e o
`app.js` cai para `${protocolo}//${hostname da página}:3000`. Assim o mesmo
código funciona em `http://localhost:8080` e em `http://10.192.21.91:8080`
sem editar arquivo. Só preencha `apiBaseUrl` se o backend for para outro
host/porta. Importante: o navegador acessa a **porta publicada no host**, não
o nome do serviço na rede interna do Compose — por isso a URL não é
`http://backend:3000`.

Testar sem a EvolutionAPI (payload simplificado aceito pelo webhook) e forçar
a geração de um resumo sem esperar o cron: ver seção "Testando sem a
EvolutionAPI" no [README.md](./README.md).

## Deploy (VM)

O sistema está rodando na VM `10.192.21.91` (host `ip-10-192-21-91`, AWS,
Ubuntu), em `/home/ubuntu/summar`:

- Frontend: **http://10.192.21.91:8080**
- Backend: **http://10.192.21.91:3000** (`/health`, `/api/summaries`, `/webhook/evolution`)

Acesso: `ssh -i n8n-evolution-server-keypair.pem ubuntu@10.192.21.91` (chave
em `Desktop/pair/` na máquina do Nicolas). O Docker na VM **exige `sudo`**
(`sudo docker compose ...`), e o `sudo` é sem senha.

Essa VM é compartilhada e já hospedava outros serviços antes do Summar —
**não derrube nem faça prune de nada global**. Containers pré-existentes:
`lab_evolution_api` (:8081), `evolution-redis-1` (:6380),
`evolution-postgres-1`, `zetter_test_app` (:3001), `n8n-n8n-1` (:5678),
`n8n-postgres-1`, `teste-postgres-1`. As portas 3000 e 8080 estavam livres,
por isso foram mantidas as mesmas do dev. Recursos são apertados: ~1.9 GB de
RAM total e ~9 GB de disco livre.

Atualizar o deploy (empacota local, envia e rebuilda):

```bash
tar -czf summar.tar.gz --exclude='.git' --exclude='node_modules' --exclude='.env.dev' summar
scp -i chave.pem summar.tar.gz ubuntu@10.192.21.91:/home/ubuntu/
ssh -i chave.pem ubuntu@10.192.21.91 'cd /home/ubuntu && tar -xzf summar.tar.gz && cd summar && sudo docker compose up -d --build'
```

O `backend/.env` é gitignored, então precisa ir junto no pacote (ou ser criado
na VM na primeira vez) — sem ele o Compose não sobe.

## Integração com a EvolutionAPI

A EvolutionAPI **não faz parte deste repositório/Compose** — só o endpoint que
a recebe. A instância usada é a que já rodava na VM: container
`lab_evolution_api`, API em http://10.192.21.91:8081, painel em `/manager`,
versão 2.3.6. As chamadas exigem o header `apikey`, cujo valor está na env
`AUTHENTICATION_API_KEY` do container.

Essa Evolution é **compartilhada** e tem três instâncias. Cada instância
guarda **uma única** URL de webhook, então **nunca edite o webhook das outras
duas** — isso mataria silenciosamente os sistemas delas:

| Instância | Webhook aponta para | Sistema |
| --- | --- | --- |
| `summar` | `http://10.192.21.91:3000/webhook/evolution` | **este projeto** |
| `zetter-test` | `http://10.192.21.91:3001/webhook/evolution` | zetter_test_app |
| `Mockup Cash Back` | `http://10.192.21.91:5678/webhook/...` | n8n |

Não há webhook global (`WEBHOOK_GLOBAL_ENABLED`/`WEBHOOK_GLOBAL_URL` não estão
definidas), então os eventos de cada instância vão só para o destino dela e
não há risco de mistura entre os projetos.

Config do webhook da instância `summar` (o que está valendo):
`enabled: true`, `events: ["MESSAGES_UPSERT"]`, `webhookByEvents: false`,
`webhookBase64: false`.

⚠️ **`webhookByEvents` tem que ser `false`.** Se for `true`, a Evolution passa
a chamar `/webhook/evolution/messages-upsert` (nome do evento no fim da URL),
que **retorna 404** aqui — as mensagens seriam descartadas sem nenhum erro
visível. Testado.

A URL usa o **IP do host** e não `http://backend:3000`: o container da
Evolution está em outra rede Docker, então ele alcança o backend pela porta
publicada no host (mesmo padrão que as outras duas instâncias já usavam).

Para descobrir o ID de um grupo:
`GET http://10.192.21.91:8081/group/fetchAllGroups/summar?getParticipants=false`
com o header `apikey`.

## Status da validação

Pipeline testado de ponta a ponta na VM (02/09/2026): payload real de
`messages.upsert` → filtro de grupo → insert no Supabase → OpenAI →
`daily_summaries` → `GET /api/summaries`. A OpenAI devolveu resumo coerente
com visão geral, pontos importantes e tarefas pendentes corretamente
separados. As mensagens de teste foram removidas do banco depois; ficou
apenas 1 linha em `daily_summaries` (dia 2026-09-02) como demonstração — o
cron das 22h sobrescreve esse dia via upsert quando houver mensagens reais.

## Pontos em aberto / próximos passos
- Sem testes automatizados (fora de escopo da spec original; projeto
  acadêmico).
- Sem autenticação nas rotas — aceitável para o escopo do projeto, mas seria
  o primeiro item a endurecer antes de qualquer uso além do acadêmico.
