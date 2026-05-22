# Finance Tracker — Contexto para Claude Code

Este arquivo descreve o estado atual do projeto e serve como ponto de partida
para continuar o desenvolvimento via Claude Code.

## O que é esse projeto

Aplicação pessoal de controle financeiro com importação de extratos bancários,
categorização por tags, visualização de gastos e gestão de objetivos e dívidas.
Nome do produto: **Mirante**.

## Stack definida

- **Backend:** FastAPI + SQLAlchemy 2.x + Alembic + Python 3.11+
- **Frontend:** React + TypeScript + Vite + Tailwind v4 + shadcn/ui + Recharts
- **Banco de dados:** MySQL 8.0 com utf8mb4
- **Importação:** Parsers por instituição (Nubank CSV, Bradesco OFX)

## Estado atual — o que está pronto

### Backend (`backend/app/`) — completo
- `models/` — todos os models SQLAlchemy validados
- `parsers/` — Nubank CSV (cartão de crédito e conta corrente, detecção automática por header) e Bradesco OFX
- `schemas/` — Pydantic schemas para todas as entidades
- `routers/institutions.py` — CRUD de instituições
- `routers/accounts.py` — CRUD de contas e grupos de contas
- `routers/transactions.py` — listagem com filtros (account_id, flow, search), CRUD, retorna `total_income` e `total_expense` na resposta
- `routers/imports.py` — upload, parse, deduplicação e persistência
- `routers/tags.py` — CRUD de tags e regras de categorização
- `routers/goals.py` — CRUD de objetivos e dívidas
- `routers/dashboard.py` — agregações por período, por tag, top merchants, progresso de goals
- `main.py` — FastAPI com CORS, todas as rotas em `/api/v1`
- Migrations Alembic com `utf8mb4_unicode_ci` em todas as tabelas

### Frontend (`frontend/src/`) — completo
- **Infraestrutura:** Vite proxy `/api` → `http://localhost:8000`, cliente Axios (`api/client.ts`)
- **API client:** `api/index.ts` — todas as chamadas mapeadas para os endpoints do backend
- **Tipos:** `types/index.ts` — interfaces TypeScript alinhadas com os schemas Pydantic
- **Tema Mirante:** logo SVG (Quicksand), favicon com triângulo + M, dark mode com persistência, faixa primária de 3px no topo do layout
- **Layout:** sidebar com navegação (sem item Importar), tokens de cor semânticos, Tailwind v4 canônico
- **Componentes UI:** shadcn/ui completos com named imports e `type` imports
- **Componentes customizados:**
  - `CurrencyInput` — input de valor monetário com máscara automática (0.000,00), aceita `prefix`
  - `EmptyState` — estado vazio padronizado com ilustração SVG e mensagem/ação
  - `InstitutionLogo` / `InstitutionName` — ícone da instituição derivado do slug (`/assets/logos/<slug>.svg`), colorido com `text-primary` via CSS mask; fallback com inicial; `InstitutionName` renderiza logo + nome inline
- **Páginas conectadas ao backend:**
  - `Dashboard` — gráficos de período e por tag (Recharts), resumo financeiro, progresso de goals
  - `Transactions` — abas por conta (com logo da instituição), tabela com altura dinâmica (ResizeObserver), coluna Conta condicional, totais Entradas/Saídas + Saldo no rodapé, busca, filtro por tipo, paginação com setas, criação/edição de transações via dialog (com CurrencyInput), importação de extrato via dialog (drag-and-drop CSV/OFX); descrições longas truncadas por CSS com tooltip
  - `Goals` — CRUD completo de objetivos e dívidas (criar/editar/excluir) via modais, barra de progresso, estado vazio com ilustração
  - `Tags` — CRUD de tags (cor, nome) e regras de categorização (keyword)
  - `Settings` — CRUD de instituições (logo via slug, sem campo manual), grupos de contas e contas com dialogs de criação/edição; `InstitutionName` aplicado em tabelas e selects; abas com indicador deslizante animado (mesmo padrão do Extrato)

## Próximos passos

Sem pendências mapeadas no momento.

## Ambiente de desenvolvimento

```bash
# Backend
cd backend
source .venv/bin/activate
uvicorn app.main:app --reload          # http://localhost:8000
# Docs interativas: http://localhost:8000/docs

# Frontend
cd frontend
npm run dev                            # http://localhost:5173
# Proxy automático: /api/* → http://localhost:8000
```

## Decisões de design importantes

### TransactionFlow
O enum `flow` na tabela `transaction` é crítico para não distorcer relatórios:
- Nubank cartão: amount positivo = `expense`, negativo = `payment` (fatura) ou `expense` (juros)
- Conta corrente: amount positivo = `income`, negativo = `expense`
- `payment` nunca entra nos totais de entrada/saída — é liquidação de dívida do cartão

### Deduplicação
Dois níveis:
1. `import_file.file_hash` (MD5) — impede reimportar o mesmo arquivo
2. `transaction.hash` (SHA256 de account_id + date + description + amount) — impede duplicata entre arquivos

### Categorização
- Tags são entidades independentes reutilizadas entre transações
- `category_rule` aplica tags automaticamente na importação por keyword match
- Usuário pode editar tags de qualquer transação manualmente

### Dívidas
- `debt` é sempre vinculada a um `goal` do tipo `debt_payoff`
- `current_balance` é atualizado manualmente — não calculado pelas transações
- `progress_percent` é uma `@property` calculada, nunca armazenada

## Convenções do projeto

- Valores monetários: `Decimal` (backend), `string` no JSON, `parseFloat` no frontend quando necessário
- Datas: `datetime.date` sem timezone — timezone só em timestamps de auditoria
- Enums: `str` enum para serializar bem no JSON e no MySQL
- `TimestampMixin` fornece `created_at` / `updated_at` automáticos
- Frontend: named imports em todos os arquivos (sem `import *`)
- Frontend: tipos importados com `import { type X }` (verbatimModuleSyntax)
- Novos parsers: herdar `BaseParser`, definir `PARSER_TYPE`, registrar em `PARSER_REGISTRY`

## Variáveis de ambiente necessárias

```
DATABASE_URL=mysql+pymysql://root:senha@localhost:3306/finance_tracker
APP_ENV=development
SECRET_KEY=<32+ bytes aleatórios>
ALLOWED_ORIGINS=http://localhost:5173
```
