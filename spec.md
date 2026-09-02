# Contexto do Projeto

Você é um desenvolvedor Full-Stack sênior. Meu objetivo é construir um projeto acadêmico simples, mas com um design moderno e limpo. O sistema será um "Resumidor de Grupo de Faculdade", que captura mensagens de um grupo específico do WhatsApp e gera um resumo diário usando IA.

# Stack Tecnológica

- **Backend:** Node.js (com Express para a API e Webhooks).
- **Frontend:** Vanilla JS (HTML5, CSS3, JavaScript puro). Para um design bonito e simples, utilize Tailwind CSS via CDN.
- **Banco de Dados:** Supabase (PostgreSQL).
- **Integrações:** EvolutionAPI (para receber mensagens do WhatsApp) e OpenAI API (para gerar os resumos).
- **Infraestrutura:** Docker e Docker Compose (para rodar o Front e o Back juntos de forma isolada).

# Arquitetura e Fluxo de Dados

1. O backend expõe uma rota de Webhook para receber mensagens da EvolutionAPI.
2. Quando uma mensagem chega, o backend verifica se pertence ao "Grupo da Faculdade" (pelo ID do grupo) e salva a mensagem crua no Supabase.
3. Um Cron Job no Node.js é executado todos os dias às 22h00 (Horário de Brasília - BRT).
4. O Cron Job busca todas as mensagens do grupo daquele dia no Supabase e envia para a API da OpenAI.
5. O prompt da OpenAI pede um resumo destacando: "Visão geral da conversa", "Pontos importantes" e "Atividades/Tarefas perdidas".
6. O resumo retornado pela OpenAI é salvo em uma tabela de resumos no Supabase.
7. O frontend consome uma rota do backend para listar os resumos ordenados por data e os exibe em uma interface limpa.

# Estrutura do Banco de Dados (Supabase)

Forneça os scripts SQL para criar as seguintes tabelas e configure as chaves de API:

1. `raw_messages`: id (uuid), group_id (text), sender_name (text), content (text), created_at (timestamp).
2. `daily_summaries`: id (uuid), date (date), overview (text), key_points (text), pending_tasks (text), created_at (timestamp).

# Requisitos do Backend (Node.js)

Crie a estrutura do projeto com as seguintes dependências (`express`, `@supabase/supabase-js`, `openai`, `node-cron`, `dotenv`, `cors`).

- **Rotas necessárias:**
  - `POST /webhook/evolution`: Recebe o payload da EvolutionAPI e salva na tabela `raw_messages`.
  - `GET /api/summaries`: Retorna os resumos da tabela `daily_summaries` ordenados do mais recente para o mais antigo.
- **Serviço de Cron:**
  - Configure o `node-cron` para rodar às `0 22 * * *` com o timezone `America/Sao_Paulo`.
  - Lógica: Buscar mensagens do dia -> Chamar OpenAI -> Salvar em `daily_summaries`.

# Requisitos do Frontend (Vanilla JS)

- Arquivos: `index.html`, `styles.css`, `app.js`.
- **UI/UX:** Design minimalista tipo "Cards". Fundo em tom claro ou pastel. Use Tailwind via CDN para facilitar a estilização.
- Cada dia deve ser um "Card" expansível ou um bloco contendo a data no cabeçalho e três seções internas: Resumo Geral, Pontos Importantes e Tarefas Pendentes.
- O `app.js` fará um `fetch()` na rota `GET /api/summaries` do backend e renderizará os cards dinamicamente na tela.

# Requisitos de Infraestrutura (Docker)

- Crie um `Dockerfile` para o backend Node.js.
- Crie um `Dockerfile` simples (baseado em Nginx) para servir os arquivos estáticos do frontend.
- Crie um `docker-compose.yml` que suba os dois serviços na mesma rede. O backend deve rodar na porta 3000 e o frontend na 8080.

# Variáveis de Ambiente Necessárias (.env)

Indique onde deverei colocar:

- SUPABASE_URL
- SUPABASE_KEY
- OPENAI_API_KEY
- WHATSAPP_GROUP_ID (ID do grupo que será monitorado)

# Passo a Passo

Por favor, gere o código dividindo a resposta nas seguintes etapas:

1. Script SQL para o Supabase.
2. Código completo do Backend (com webhook, cron e integração OpenAI).
3. Código completo do Frontend (HTML, CSS e JS).
4. Arquivos do Docker (Dockerfiles e docker-compose.yml).
