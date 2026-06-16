# Acervo — Sistema de Gerenciamento de Empréstimos de Biblioteca

Sistema completo para gerenciar empréstimos de livros em uma biblioteca, com controle de permissões para **bibliotecários** e **leitores**.

## Visão geral

| Perfil | Permissões |
|---|---|
| **Bibliotecário** | Cadastrar, editar e remover livros · Visualizar todos os empréstimos · Confirmar devoluções · Cancelar empréstimos |
| **Leitor** | Visualizar catálogo de livros · Solicitar empréstimos · Acompanhar seus empréstimos · Solicitar devolução |

## Tecnologias

- **Backend:** Node.js + Express
- **Banco de dados:** SQLite (via `better-sqlite3`) — banco relacional em arquivo, sem precisar instalar servidor de banco
- **Autenticação:** JWT (`jsonwebtoken`)
- **Segurança:** Hash de senhas com `bcryptjs`
- **Frontend:** HTML + CSS + JavaScript (vanilla)

---

## Estrutura do projeto

```
biblioteca-backend/
├── back/                          # Backend (Node.js + Express)
│   ├── package.json
│   ├── .env.example
│   ├── .env                       (criado por você, ignorado pelo git)
│   ├── database.sqlite            (criado automaticamente)
│   └── src/
│       ├── server.js              # Ponto de entrada do servidor
│       ├── config/
│       │   └── database.js        # Conexão e criação das tabelas
│       ├── middleware/
│       │   └── auth.js            # Autenticação (JWT) e autorização por perfil
│       ├── controllers/
│       │   ├── authController.js
│       │   ├── livroController.js
│       │   └── emprestimoController.js
│       └── routes/
│           ├── authRoutes.js
│           ├── livroRoutes.js
│           └── emprestimoRoutes.js
├── front/                         # Frontend (HTML + CSS + JS)
│   ├── index.html                 # Login e Registro
│   ├── bibliotecario.html         # Painel do Bibliotecário
│   ├── leitor.html                # Painel do Leitor
│   ├── css/
│   │   └── style.css
│   └── js/
│       ├── api.js                 # Funções compartilhadas (HTTP, sessão)
│       ├── auth-page.js           # Lógica de login e cadastro
│       ├── bibliotecario.js       # Lógica do painel do bibliotecário
│       └── leitor.js              # Lógica do painel do leitor
├── package.json                   # Scripts de conveniência (raiz)
├── .gitignore
└── README.md
```

---

## Como executar

### Pré-requisitos

- [Node.js](https://nodejs.org/) (v18 ou superior recomendado)
- npm (vem junto com o Node.js)

### Instalação

```bash
# Clone o repositório (ou descompacte o projeto)
cd biblioteca-backend

# Instalar dependências do backend
cd back
npm install

# Criar o arquivo de variáveis de ambiente
cp .env.example .env
```

> **Nota:** Edite o arquivo `back/.env` e defina um `JWT_SECRET` seguro para produção. O valor padrão funciona para desenvolvimento.

### Executar o servidor

```bash
# A partir da pasta back/
npm start
```

Ou, para desenvolvimento com reinício automático (nodemon):

```bash
npm run dev
```

### Acessar o sistema

Abra o navegador em: **http://localhost:3000**

O servidor serve tanto a API quanto os arquivos do frontend automaticamente.

### Scripts de conveniência (raiz)

Se preferir, você também pode executar a partir da raiz do projeto:

```bash
# Instalar dependências
npm run install:back

# Iniciar o servidor
npm start

# Modo de desenvolvimento
npm run dev
```

---

## Banco de dados

O sistema utiliza **SQLite**, que cria automaticamente o arquivo `back/database.sqlite` na primeira execução. As três tabelas são criadas automaticamente:

### Tabela: `usuarios`

| Campo | Tipo | Restrições |
|---|---|---|
| `id` | INTEGER | Chave primária, autoincrement |
| `nome` | VARCHAR(100) | Obrigatório |
| `email` | VARCHAR(100) | Obrigatório, único |
| `senha` | VARCHAR(255) | Obrigatório (armazenada como hash) |
| `perfil` | TEXT | Obrigatório: `'bibliotecario'` ou `'leitor'` |

### Tabela: `livros`

| Campo | Tipo | Restrições |
|---|---|---|
| `id` | INTEGER | Chave primária, autoincrement |
| `titulo` | VARCHAR(150) | Obrigatório |
| `autor` | VARCHAR(100) | Obrigatório |
| `ano_publicacao` | INTEGER | Opcional |
| `quantidade_disponivel` | INTEGER | Obrigatório, default 0 |

### Tabela: `emprestimos`

| Campo | Tipo | Restrições |
|---|---|---|
| `id` | INTEGER | Chave primária, autoincrement |
| `livro_id` | INTEGER | FK → `livros.id` |
| `leitor_id` | INTEGER | FK → `usuarios.id` |
| `data_emprestimo` | DATE | Obrigatório |
| `data_devolucao_prevista` | DATE | Obrigatório |
| `data_devolucao_real` | DATE | Preenchido na devolução |
| `status` | TEXT | `'ativo'`, `'devolvido'` ou `'atrasado'` |
| `devolucao_solicitada` | INTEGER | 0 ou 1 (default 0) |

---

## API — Endpoints

### Autenticação (`/api/auth`)

| Método | Rota | Acesso | Descrição |
|---|---|---|---|
| POST | `/api/auth/registrar` | público | Cadastra usuário (`nome`, `email`, `senha`, `perfil`) |
| POST | `/api/auth/login` | público | Login → retorna token JWT |

### Livros (`/api/livros`)

| Método | Rota | Acesso | Descrição |
|---|---|---|---|
| GET | `/api/livros` | autenticado | Lista todos os livros |
| GET | `/api/livros/:id` | autenticado | Detalhes de um livro |
| POST | `/api/livros` | bibliotecário | Cadastra novo livro |
| PUT | `/api/livros/:id` | bibliotecário | Atualiza dados de um livro |
| DELETE | `/api/livros/:id` | bibliotecário | Remove um livro (se não houver empréstimos ativos) |

### Empréstimos (`/api/emprestimos`)

| Método | Rota | Acesso | Descrição |
|---|---|---|---|
| GET | `/api/emprestimos` | autenticado | Leitor vê os próprios; bibliotecário vê todos |
| GET | `/api/emprestimos/:id` | autenticado | Detalhes de um empréstimo |
| POST | `/api/emprestimos` | leitor | Solicita empréstimo (`livro_id`) |
| PUT | `/api/emprestimos/:id/solicitar-devolucao` | leitor | Solicita devolução de um empréstimo |
| PUT | `/api/emprestimos/:id` | bibliotecário | Atualiza status (ex: `devolvido`) |
| DELETE | `/api/emprestimos/:id` | bibliotecário | Cancela/remove um empréstimo |

---

## Autenticação

Após o login, o backend retorna um **token JWT**. Esse token deve ser enviado em todas as rotas protegidas no header:

```
Authorization: Bearer <token>
```

O frontend gerencia isso automaticamente via `localStorage`.

---

## Regras de negócio

- Apenas **bibliotecários** podem criar, atualizar ou remover livros
- Apenas **leitores** podem solicitar empréstimos
- Ao criar um empréstimo:
  - Verifica se há `quantidade_disponivel > 0`
  - Diminui `quantidade_disponivel` em 1
  - Define `status = 'ativo'` e `data_emprestimo` = data atual
  - `data_devolucao_prevista` = data informada ou data atual + 14 dias
- Ao marcar como devolvido (pelo bibliotecário):
  - Define `data_devolucao_real` = data atual
  - Aumenta `quantidade_disponivel` em 1
  - Limpa a flag `devolucao_solicitada`
- Empréstimos com `status = 'ativo'` cuja `data_devolucao_prevista` já passou são automaticamente marcados como `'atrasado'`
- Ao cancelar/remover um empréstimo não devolvido, o exemplar volta ao estoque
- O leitor pode **solicitar** devolução, que fica pendente até o bibliotecário confirmar

---

## Fluxo do sistema

```
┌─────────────┐     HTTP      ┌──────────────┐     SQL      ┌──────────────┐
│  Frontend   │ ─────────────→│   Backend    │ ────────────→│   SQLite     │
│  (HTML/JS)  │ ←─────────────│  (Express)   │ ←────────────│  (database)  │
└─────────────┘   JSON resp   └──────────────┘   resultados └──────────────┘
```

1. O frontend realiza chamadas HTTP (`fetch`) para o backend
2. O backend intercepta nas rotas definidas, aplica validações e verifica permissões
3. O backend se conecta ao banco de dados para buscar, inserir, atualizar ou remover dados
4. O backend devolve uma resposta JSON ao frontend

---

## Páginas do frontend

### `index.html` — Login e Registro
- Formulário de login (email + senha)
- Formulário de cadastro (nome, email, senha, perfil)
- Após login bem-sucedido, redireciona para o painel correspondente ao perfil

### `bibliotecario.html` — Painel do Bibliotecário
- Catálogo de livros com operações CRUD (adicionar, editar, excluir)
- Listagem de todos os empréstimos com ações (confirmar devolução, cancelar)
- Indicador visual de devoluções solicitadas pelos leitores

### `leitor.html` — Painel do Leitor
- Catálogo de livros disponíveis com botão para solicitar empréstimo
- Seção "Meus empréstimos" com status e opção de solicitar devolução

---

## Exemplos rápidos (curl)

```bash
# Cadastrar bibliotecário
curl -X POST http://localhost:3000/api/auth/registrar \
  -H "Content-Type: application/json" \
  -d '{"nome":"Ana","email":"ana@biblioteca.com","senha":"123456","perfil":"bibliotecario"}'

# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"ana@biblioteca.com","senha":"123456"}'

# Cadastrar livro (usar o token retornado no login)
curl -X POST http://localhost:3000/api/livros \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer SEU_TOKEN_AQUI" \
  -d '{"titulo":"Clean Code","autor":"Robert C. Martin","ano_publicacao":2008,"quantidade_disponivel":3}'
```
