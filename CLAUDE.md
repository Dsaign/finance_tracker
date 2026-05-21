# Finance Tracker — Contexto para Claude Code

Este arquivo descreve o estado atual do projeto e serve como ponto de partida
para continuar o desenvolvimento via Claude Code.

## O que é esse projeto

Aplicação pessoal de controle financeiro com importação de extratos bancários,
categorização por tags, visualização de gastos e gestão de objetivos e dívidas.

## Stack definida

- **Backend:** FastAPI + SQLAlchemy 2.x + Alembic + Python 3.11+
- **Frontend:** React + TypeScript + Vite + Recharts (a iniciar)
- **Banco de dados:** MySQL 8.0 com utf8mb4
- **Importação:** Parsers por instituição (Nubank CSV, Bradesco OFX)

## O que já foi desenvolvido

### Models SQLAlchemy (`app/models/`)
Todos os models estão prontos e validados:
- `institution` — bancos/fintechs com campo `parser_type`
- `account_group` — agrupamento de contas (ex: PJ, PF)
- `account` — conta corrente, poupança, cartão de crédito, investimento
- `import_file` — registro de importações com deduplicação por hash MD5
- `transaction` — transação com `flow` enum (income/expense/payment/transfer) e `is_manual`
- `tag` + `transaction_tag` — categorização many-to-many pesquisável
- `category_rule` + `category_rule_tag` — regras de auto-categorização por keyword
- `goal` + `goal_account` — objetivos financeiros multi-conta
- `debt` — dívidas com credor, juros, parcelas (vinculada a goal)

### Migrations Alembic (`migrations/`)
- Migration inicial `4c265bcc3438_initial_schema.py` pronta
- `env.py` configurado para ler `DATABASE_URL` do `.env`
- Todas as tabelas com `utf8mb4_unicode_ci` para suporte Unicode completo
- Testado upgrade + downgrade completo

### Parsers de importação (`app/parsers/`)
- `base.py` — interface `BaseParser` + dataclass `ParsedTransaction`
- `nubank.py` — parser CSV (date, title, amount)
  - Detecta: expense, payment (fatura), income (estorno), juros de rotativo
  - Extrai parcelamento: "Parcela 2/10" → campos `installment_current/total`
  - Testado contra CSV real
- `bradesco.py` — parser OFX via `ofxparse`
  - Mapeia tipos OFX (CREDIT, DEBIT, ATM...) para TransactionFlow
- `__init__.py` — `PARSER_REGISTRY` + `get_parser("nubank_csv")`

## O que falta desenvolver (próximos passos)

### Backend (prioridade atual)
- [ ] `app/main.py` — entrypoint FastAPI com CORS e inclusão de routers
- [ ] `app/database.py` — engine, SessionLocal, get_db dependency
- [ ] `app/schemas/` — Pydantic schemas para request/response
- [ ] `app/services/` — lógica de negócio separada dos routers
- [ ] `app/routers/institutions.py` — CRUD de instituições
- [ ] `app/routers/accounts.py` — CRUD de contas e grupos
- [ ] `app/routers/transactions.py` — CRUD + busca com filtros
- [ ] `app/routers/imports.py` — upload e processamento de extrato
- [ ] `app/routers/tags.py` — CRUD de tags e regras de categorização
- [ ] `app/routers/goals.py` — CRUD de objetivos e dívidas
- [ ] `app/routers/dashboard.py` — agregações para gráficos

### Frontend (após backend)
- [ ] Estrutura React + TypeScript + Vite
- [ ] Tela de extrato com busca e filtros
- [ ] Dashboard com gráficos (Recharts)
- [ ] Gestão de objetivos e dívidas

## Decisões de design importantes

### TransactionFlow
O enum `flow` na tabela `transaction` é crítico para não distorcer relatórios:
- Nubank cartão: amount positivo = `expense`, negativo = `payment` (fatura) ou `expense` (juros)
- Conta corrente: amount positivo = `income`, negativo = `expense`
- `payment` nunca entra nos totais de entrada/saída — é liquidação de dívida do cartão

### Deduplicação
Dois níveis:
1. `import_file.file_hash` — impede reimportar o mesmo arquivo
2. `transaction.hash` — SHA256 de (account_id + date + description + amount) — impede duplicata mesmo entre arquivos diferentes

### Categorização
- Tags são entidades independentes reutilizadas entre transações
- `category_rule` aplica tags automaticamente na importação por keyword match
- Usuário pode editar tags de qualquer transação manualmente depois

### Dívidas
- `debt` é sempre vinculada a um `goal` do tipo `debt_payoff`
- `current_balance` é atualizado manualmente — não calculado pelas transações
- `progress_percent` é uma `@property` calculada, nunca armazenada

## Convenções do projeto

- Todos os valores monetários usam `Decimal` (nunca `float`)
- Datas usam `datetime.date` (sem timezone) — timezone só em timestamps de auditoria
- Enums são `str` enum para serializar bem no JSON e no MySQL
- `TimestampMixin` fornece `created_at` / `updated_at` automáticos
- Novos parsers: herdar `BaseParser`, definir `PARSER_TYPE`, registrar em `PARSER_REGISTRY`

## Configuração do ambiente

```bash
# Instalar dependências
pip install -r requirements.txt

# Configurar banco
cp .env.example .env
# editar DATABASE_URL no .env

# Rodar migrations
alembic upgrade head

# Iniciar servidor de desenvolvimento
uvicorn app.main:app --reload
```

## Variáveis de ambiente necessárias

```
DATABASE_URL=mysql+pymysql://root:senha@localhost:3306/finance_tracker
APP_ENV=development
SECRET_KEY=<32+ bytes aleatórios>
ALLOWED_ORIGINS=http://localhost:5173
```
