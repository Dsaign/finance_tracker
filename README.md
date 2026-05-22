# Finance Tracker

Aplicação pessoal de controle financeiro com importação de extratos bancários, categorização por tags, visualização de gastos e gestão de objetivos e dívidas.

## Visão geral

- **Backend:** FastAPI + SQLAlchemy 2.x + Alembic
- **Frontend:** React + TypeScript + Vite + Recharts
- **Banco de dados:** MySQL (utf8mb4)
- **Importação:** Parsers por instituição (Nubank CSV, Bradesco OFX, ...)

---

## Funcionalidades

- Importação de extratos bancários via dialog (CSV Nubank, OFX Bradesco) com drag-and-drop e deduplicação automática
- Extrato com abas por conta, busca, filtro por tipo, totais de Entradas/Saídas e paginação adaptativa
- Criação e edição manual de transações (independente da importação)
- Categorização automática por tags via regras de keyword; edição manual de tags por transação
- Gráficos de entrada/saída por período e categoria (Recharts)
- Visão consolidada multi-conta
- Objetivos financeiros com CRUD completo (poupança, limite de gastos, quitação de dívidas)
- Gestão de dívidas com credor, juros, parcelas e progresso
- Configurações: CRUD de instituições, grupos de contas e contas
- Dark mode com persistência

---

## Estrutura do projeto

```
finance_tracker/
├── README.md
├── CLAUDE.md                   ← contexto para Claude Code
├── backend/
│   ├── alembic.ini
│   ├── .env                    ← criado a partir do .env.example (não versionar)
│   ├── .env.example
│   ├── requirements.txt
│   ├── app/
│   │   ├── main.py             ← entrypoint FastAPI
│   │   ├── models/             ← models SQLAlchemy
│   │   │   ├── institution.py, account.py, import_file.py
│   │   │   ├── tag.py, transaction.py, goal.py
│   │   ├── parsers/            ← leitores de extrato por instituição
│   │   │   ├── base.py         ← interface comum (BaseParser)
│   │   │   ├── nubank.py       ← CSV (date, title, amount)
│   │   │   └── bradesco.py     ← OFX
│   │   ├── routers/            ← endpoints FastAPI
│   │   │   ├── institutions.py, accounts.py, transactions.py
│   │   │   ├── imports.py, tags.py, goals.py, dashboard.py
│   │   ├── schemas/            ← Pydantic schemas
│   │   │   ├── transaction.py, goal.py, tag.py, ...
│   └── migrations/
│       └── versions/
└── frontend/
    └── src/
        ├── api/                ← cliente Axios + chamadas tipadas
        ├── components/
        │   ├── ui/             ← shadcn/ui + CurrencyInput + EmptyState
        │   └── Layout.tsx
        ├── pages/
        │   ├── Dashboard.tsx, Transactions.tsx, Goals.tsx
        │   ├── Tags.tsx, Settings.tsx
        ├── types/index.ts
        └── lib/utils.ts
```

---

## Configuração inicial

### 1. Pré-requisitos

- Python 3.11+
- MySQL 8.0+
- Node.js 20+ (para o frontend)

### 2. Backend

```bash
cd backend

# Crie e ative o ambiente virtual
python -m venv .venv
source .venv/bin/activate        # Linux/macOS
# .venv\Scripts\activate         # Windows

# Instale as dependências
pip install -r requirements.txt

# Configure as variáveis de ambiente
cp .env.example .env
# Edite o .env com suas credenciais do MySQL
```

### 3. Frontend

```bash
cd frontend
npm install
npm run dev                      # http://localhost:5173
# Proxy automático: /api/* → http://localhost:8000
```

### 3. Banco de dados

```bash
# Crie o banco no MySQL antes de rodar as migrations
mysql -u root -p -e "CREATE DATABASE finance_tracker CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

# Rode as migrations
alembic upgrade head
```

---

## Migrations (Alembic)

Todos os comandos devem ser rodados dentro de `backend/` com o `.venv` ativo.

```bash
# Aplicar todas as migrations pendentes
alembic upgrade head

# Ver qual migration está aplicada no banco
alembic current

# Ver histórico de migrations
alembic history

# Gerar nova migration automaticamente após alterar um model
alembic revision --autogenerate -m "descricao_curta_da_mudanca"

# Reverter a última migration aplicada
alembic downgrade -1

# Reverter todas as migrations (banco vazio)
alembic downgrade base

# Gerar SQL sem aplicar — útil para revisar antes de rodar em produção
alembic upgrade head --sql
```

> **Atenção:** sempre revise o arquivo gerado pelo `--autogenerate` antes de aplicar.
> O Alembic não detecta renomeações de coluna automaticamente — trata como drop + add.

---

## Variáveis de ambiente

| Variável | Descrição | Exemplo |
|---|---|---|
| `DATABASE_URL` | String de conexão MySQL | `mysql+pymysql://root:senha@localhost:3306/finance_tracker` |
| `APP_ENV` | Ambiente da aplicação | `development` \| `production` |
| `SECRET_KEY` | Chave para JWT | string aleatória de 32+ bytes |
| `ALLOWED_ORIGINS` | Origens CORS permitidas | `http://localhost:5173` |

---

## Importação de extratos

Cada instituição tem seu próprio parser em `app/parsers/`. A interface é sempre a mesma: recebe um arquivo, retorna uma lista de transações normalizadas.

| Instituição | Formato | Parser |
|---|---|---|
| Nubank Cartão | CSV (`date, title, amount`) | `nubank.py` |
| Nubank Conta Corrente | CSV (`Data, Valor, Identificador, Descrição`) | `nubank.py` |
| Bradesco | OFX | `bradesco.py` |

Para adicionar uma nova instituição:
1. Crie `app/parsers/<nome>.py` implementando a classe `BaseParser`
2. Cadastre a instituição no banco com o `parser_type` correspondente
3. O sistema detecta o parser automaticamente via `parser_type`

### Convenção de `flow` por tipo de conta

| Tipo de conta | Amount positivo | Amount negativo |
|---|---|---|
| Cartão de crédito | `expense` (compra) | `payment` (pgto. fatura) |
| Conta corrente | `income` (entrada) | `expense` (saída) |

---

## Modelos principais

| Tabela | Descrição |
|---|---|
| `institution` | Bancos/fintechs cadastrados |
| `account_group` | Agrupamento de contas (ex: PJ, PF) |
| `account` | Conta de uma instituição (corrente, poupança, cartão) |
| `import_file` | Registro de cada arquivo importado (deduplicação por hash) |
| `transaction` | Transação individual (importada ou manual); campo `external_id` armazena UUID do extrato original |
| `tag` | Tag de categorização pesquisável |
| `transaction_tag` | Associação many-to-many transação ↔ tag |
| `category_rule` | Regra de categorização automática por keyword |
| `category_rule_tag` | Tags aplicadas por cada regra |
| `goal` | Objetivo financeiro (poupança, dívida, limite) |
| `goal_account` | Contas monitoradas por um objetivo |
| `debt` | Detalhamento de dívida vinculada a um goal |

---

## Progresso do desenvolvimento

### Backend — completo
- [x] Modelagem do banco de dados + Migrations Alembic
- [x] Parsers de importação (Nubank CSV, Bradesco OFX)
- [x] Endpoints de instituições e contas
- [x] Endpoints de transações (listagem com filtros, CRUD, totais income/expense)
- [x] Endpoint de importação de extrato (upload, parse, deduplicação)
- [x] Endpoints de tags e regras de categorização
- [x] Endpoints de objetivos e dívidas
- [x] Endpoints de dashboard (resumo, por período, por tag, top merchants)

### Frontend — completo
- [x] Estrutura React + TypeScript + Vite + Tailwind v4 + shadcn/ui
- [x] Tema Mirante (logo, favicon, dark mode, faixa primária no topo)
- [x] Cliente HTTP integrado ao backend (`/api/v1`)
- [x] Dashboard com gráficos (Recharts) e resumo financeiro
- [x] Extrato: abas por conta, tabela adaptativa, totais Entradas/Saídas, paginação, CRUD de transações
- [x] Importação de extrato via dialog no Extrato (drag-and-drop CSV/OFX)
- [x] Objetivos: CRUD completo (criar/editar/excluir), barra de progresso, estado vazio
- [x] Tags e regras de categorização (CRUD)
- [x] Configurações (CRUD de instituições, contas e grupos)
- [x] Componentes: `CurrencyInput` com máscara BRL, `EmptyState` com ilustração SVG
