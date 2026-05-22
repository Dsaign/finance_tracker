// ── Instituições e Contas ─────────────────────────────────────────────────────

export interface Institution {
  id: number
  name: string
  slug: string
  parser_type: string
  created_at: string
  updated_at: string | null
}

export interface AccountGroup {
  id: number
  name: string
  description: string | null
  created_at: string
  updated_at: string | null
}

export type AccountType = 'checking' | 'savings' | 'credit_card' | 'investment'

export interface Account {
  id: number
  institution_id: number
  account_group_id: number | null
  name: string
  type: AccountType
  currency: string
  active: boolean
  institution: Institution
  created_at: string
  updated_at: string | null
}

// ── Tags ──────────────────────────────────────────────────────────────────────

export interface Tag {
  id: number
  name: string
  slug: string
  color: string | null
}

export interface CategoryRule {
  id: number
  keyword: string
  match_type: 'contains' | 'starts_with' | 'exact'
  priority: number
  tags: Tag[]
}

// ── Transações ────────────────────────────────────────────────────────────────

export type TransactionFlow = 'income' | 'expense' | 'payment' | 'transfer'

export interface Transaction {
  id: number
  account_id: number
  import_file_id: number | null
  date: string
  description: string
  amount: string
  flow: TransactionFlow
  external_id: string | null
  is_manual: boolean
  tags: Tag[]
  created_at: string
  updated_at: string | null
}

export interface TransactionListResponse {
  items: Transaction[]
  total: number
  page: number
  page_size: number
  total_income: string
  total_expense: string
}

// ── Imports ───────────────────────────────────────────────────────────────────

export interface ImportResult {
  import_file_id: number
  filename: string
  total_parsed: number
  total_inserted: number
  total_skipped: number
}

// ── Goals e Dívidas ───────────────────────────────────────────────────────────

export type GoalType = 'savings' | 'debt_payoff' | 'investment' | 'spending_limit'
export type GoalStatus = 'active' | 'completed' | 'cancelled' | 'paused'

export interface Debt {
  id: number
  creditor: string
  original_amount: string
  current_balance: string
  interest_rate: string | null
  installments_total: number | null
  installments_paid: number | null
  start_date: string | null
  due_date: string | null
  paid_amount: string
  progress_percent: number
}

export interface Goal {
  id: number
  name: string
  description: string | null
  goal_type: GoalType
  target_amount: string
  deadline: string | null
  status: GoalStatus
  account_ids: number[]
  debt: Debt | null
  created_at: string
  updated_at: string | null
}

// ── Dashboard ─────────────────────────────────────────────────────────────────

export interface DashboardSummary {
  date_from: string | null
  date_to: string | null
  account_ids: number[]
  total_income: string
  total_expense: string
  total_payment: string
  net: string
}

export interface PeriodPoint {
  period: string
  income: string
  expense: string
}

export interface ByPeriodResponse {
  group_by: string
  points: PeriodPoint[]
}

export interface TagShare {
  tag: Tag
  total: string
  percent: number
}

export interface ByTagResponse {
  total_tagged: string
  shares: TagShare[]
}

export interface GoalProgress {
  id: number
  name: string
  goal_type: string
  status: string
  target_amount: string
  deadline: string | null
  current_amount: string
  progress_percent: number
  debt_creditor: string | null
  debt_current_balance: string | null
}
