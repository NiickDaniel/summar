# CLAUDE.md

Contexto do projeto **Summar** para sessões futuras do Claude Code (ou de
qualquer outro dev). A especificação original (`spec.md`) ficou só na máquina
do Nicolas — foi removida do versionamento no commit `8c58bd5`.

## O que é

Resumidor diário de um grupo de WhatsApp da faculdade. Um webhook recebe as
mensagens do grupo, elas ficam salvas cruas no banco, e no horário configurado
(padrão 22h de Brasília) um cron gera um resumo do dia via OpenAI — visão
geral, pontos importantes e tarefas/atividades pendentes — que fica disponível
numa interface web com três abas:

- **Resumos**: os resumos por dia, em cards expansíveis. Cada tarefa pendente
  tem um botão `+` que a envia para a lista de tarefas.
- **Tarefas**: lista própria, com conclusão, remoção e criação manual.
- **Configurações**: horário do disparo, liga/desliga do resumo automático,
  fuso horário e o botão "Resumir agora".

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
                                   cron no horário de app_settings (node-cron)
                                                              |
                                             busca mensagens do dia --> OpenAI
                                                              |
                                                   Supabase.daily_summaries
                                                              |
frontend (Nginx, :8080) --GET /api/summaries--> backend (:3000) --> Supabase
                        --GET/POST/PATCH/DELETE /api/todos-->
                        --GET/PUT /api/settings----------->
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
- **O horário do cron vem do banco, não do `.env`.** A tabela `app_settings`
  manda, e `PUT /api/settings` **reagenda em runtime** (para a tarefa antiga e
  cria outra) — não precisa reiniciar o container. As variáveis
  `CRON_SCHEDULE`/`CRON_TIMEZONE` servem apenas para semear a linha de
  settings caso ela não exista.
- `node-cron` 3.x **não tem `destroy()`**, só `stop()`. Por isso
  `aplicarAgendamento()` para a tarefa atual e cria uma nova em vez de tentar
  reconfigurar a existente.
- O recorte do dia respeita o fuso das settings:
  [backend/src/utils/date.js](./backend/src/utils/date.js) descobre o offset
  via `Intl` com `timeZoneName: 'longOffset'`, então mudar o fuso na tela move
  tanto o disparo quanto as fronteiras do dia de forma coerente. Se o offset
  não puder ser lido, cai para `-03:00`.
- `POST /api/summaries/generate` é o "Resumir agora" da tela (aceita
  `{ "date": "YYYY-MM-DD" }`; sem isso usa hoje no fuso configurado).
- `daily_summaries.date` tem constraint `unique`; gerar de novo o resumo de um
  dia faz `upsert` (sobrescreve o resumo existente daquele dia) — vale lembrar
  disso ao usar o "Resumir agora".
- `POST /api/todos` é idempotente para título repetido: se já existe uma
  tarefa **pendente** com o mesmo título, devolve a existente com `200` em vez
  de criar duplicata (`201` só quando cria de fato). Protege o duplo clique no
  botão `+` dos resumos.

## Estrutura de pastas

```
summar/
├── backend/
│   ├── src/
│   │   ├── config/       # env.js, supabaseClient.js
│   │   ├── controllers/  # webhook, summaries, todos, settings
│   │   ├── routes/       # webhook, summaries, todos, settings
│   │   ├── services/     # messages, summaries, openai, cron, todos, settings
│   │   ├── utils/        # date.js (fusos), http.js (erro -> status)
│   │   ├── app.js        # express app + middlewares
│   │   └── server.js     # entrypoint (listen + start cron)
│   ├── .env               # segredos reais (gitignored)
│   ├── .env.example        # template documentado
│   └── Dockerfile
├── frontend/
│   ├── index.html     # shell: sidebar, cabeçalho e as 3 seções de view
│   ├── styles.css      # scrollbar, accordion, nav-item e o switch
│   ├── app.js           # núcleo: API, helpers, toast e troca de abas
│   ├── summaries.js      # aba Resumos (+ envio de tarefa para a lista)
│   ├── todos.js           # aba Tarefas
│   ├── settings.js         # aba Configurações
│   ├── nginx.conf
│   └── Dockerfile
├── supabase/
│   └── schema.sql    # DDL das 4 tabelas (idempotente)
├── docker-compose.yml # sobe backend (:3000) e frontend (:8080) juntos
├── CLAUDE.md
└── README.md
```

O frontend **não tem build step nem módulos ES**: os arquivos são carregados
por `<script>` na ordem `app.js` → views. O `app.js` publica o namespace
`window.Summar` (API, helpers, `registerView`, `stats`, `toast`); cada view se
registra com `Summar.registerView(nome, { titulo, subtitulo, onEnter,
onRefresh, onBoot })` e o boot acontece no `DOMContentLoaded`, quando todos os
scripts já rodaram. `onBoot` existe para as views que alimentam a sidebar
(tarefas e configurações) carregarem mesmo sem o usuário abrir a aba.

⚠️ Ao adicionar um arquivo JS no frontend, inclua-o **no `<script>` do
`index.html` e no `COPY` do `frontend/Dockerfile`** — senão ele não vai para a
imagem.

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
- **`todos`**: `id uuid pk`, `title text`, `source_date date` (dia do resumo
  que originou a tarefa; `null` quando criada na mão), `done boolean`,
  `created_at`, `completed_at`.
- **`app_settings`**: linha única fixada por `check (id = 1)`. Campos:
  `summary_time text` (HH:MM, com check de formato no banco), `timezone text`,
  `auto_enabled boolean`, `updated_at`. O `insert ... on conflict do nothing`
  no schema garante que a linha exista.

RLS está habilitado nas quatro tabelas — só o backend acessa o banco, usando a
`service_role` key (que ignora RLS por design).

## Variáveis de ambiente (`backend/.env`)

| Variável            | Descrição                                                     | Status                                   |
| ------------------- | -------------------------------------------------------------- | ----------------------------------------- |
| `SUPABASE_URL`      | URL do projeto                                                  | preenchido a partir do `.env.dev`         |
| `SUPABASE_KEY`      | Chave **service_role** (não a `anon`)                           | preenchido                                |
| `OPENAI_API_KEY`    | Chave da OpenAI                                                 | preenchido a partir do `.env.dev`         |
| `OPENAI_MODEL`      | Modelo usado no resumo                                          | `gpt-4o-mini` (padrão)                    |
| `WHATSAPP_GROUP_ID` | ID do grupo monitorado (`xxxxx@g.us`)                            | `120363319840837485@g.us` (grupo "Geral") |
| `CRON_SCHEDULE`     | **Só semeia** a linha de `app_settings` na primeira subida      | `0 22 * * *`                              |
| `CRON_TIMEZONE`     | **Só semeia** o fuso na primeira subida                         | `America/Sao_Paulo`                       |

Depois que a linha de `app_settings` existe, **quem manda é o banco**: mudar
`CRON_SCHEDULE` no `.env` não altera mais nada. O horário se muda pela aba
Configurações (ou por `PUT /api/settings`).

## Rotas da API

| Método | Rota | Para que serve |
| --- | --- | --- |
| `POST` | `/webhook/evolution` | Recebe as mensagens da EvolutionAPI |
| `GET` | `/api/summaries` | Lista os resumos (mais recente primeiro) |
| `POST` | `/api/summaries/generate` | "Resumir agora"; body opcional `{ "date": "YYYY-MM-DD" }` |
| `GET` | `/api/todos` | Lista as tarefas (pendentes primeiro) |
| `POST` | `/api/todos` | Cria tarefa `{ title, source_date? }` — `201` nova, `200` já existia |
| `PATCH` | `/api/todos/:id` | Conclui/reabre (`{ done }`) ou renomeia (`{ title }`) |
| `DELETE` | `/api/todos/:id` | Remove a tarefa (`204`) |
| `GET` | `/api/settings` | Configurações + estado do agendamento |
| `PUT` | `/api/settings` | Salva e **reagenda o cron na hora** |
| `GET` | `/health` | Healthcheck |

Erros de entrada voltam `400` com a mensagem pronta para a tela; os serviços
marcam isso com `err.status` e [`utils/http.js`](./backend/src/utils/http.js)
traduz (sem `status` vira `500` e loga).

`backend/.env` está no `.gitignore`. Quem for reproduzir o setup usa
`backend/.env.example` como template. `.env.dev`, na raiz, foi o arquivo com
as credenciais originais fornecidas para o bootstrap do projeto — também está
gitignored e não deve ser commitado.

## Design do frontend

Pedido explícito: visual limpo, cards arredondados, sidebar lateral, paleta
neutra (branco/cinza) com azul bem claro de destaque.

- Layout: sidebar fixa à esquerda (`w-72`, branca, `border-r`) com marca,
  navegação (Resumos / Tarefas / Configurações, classe `.nav-item` com
  modificador `.ativo`), um bloco de estatísticas (dias resumidos, último
  resumo e tarefas abertas), o texto do agendamento vigente e um modal "Como
  funciona". Em telas pequenas a sidebar vira um drawer (`-translate-x-full` +
  overlay).
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
  o primeiro item a endurecer antes de qualquer uso além do acadêmico. Agora
  pesa mais: `PUT /api/settings` e as rotas de tarefas **escrevem** sem
  qualquer credencial.
- A aba Tarefas não tem edição de título pela tela, embora o
  `PATCH /api/todos/:id` já aceite `{ title }`.
- A VM `10.192.21.91` continua rodando a versão anterior; as abas novas só
  chegam lá no próximo deploy (ver seção Deploy).
