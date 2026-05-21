import client from './client'
import type {
  Account, AccountGroup, ByPeriodResponse, ByTagResponse,
  CategoryRule, DashboardSummary, Goal, GoalProgress,
  ImportResult, Institution, MerchantRow, Tag,
  Transaction, TransactionListResponse,
} from '@/types'

// ── Institutions ──────────────────────────────────────────────────────────────
export const api = {
  institutions: {
    list: () => client.get<Institution[]>('/institutions/').then(r => r.data),
    create: (data: object) => client.post<Institution>('/institutions/', data).then(r => r.data),
    update: (id: number, data: object) => client.patch<Institution>(`/institutions/${id}`, data).then(r => r.data),
    delete: (id: number) => client.delete(`/institutions/${id}`),
  },

  accountGroups: {
    list: () => client.get<AccountGroup[]>('/account-groups/').then(r => r.data),
    create: (data: object) => client.post<AccountGroup>('/account-groups/', data).then(r => r.data),
    update: (id: number, data: object) => client.patch<AccountGroup>(`/account-groups/${id}`, data).then(r => r.data),
    delete: (id: number) => client.delete(`/account-groups/${id}`),
  },

  accounts: {
    list: (activeOnly?: boolean) =>
      client.get<Account[]>('/accounts/', { params: { active_only: activeOnly } }).then(r => r.data),
    create: (data: object) => client.post<Account>('/accounts/', data).then(r => r.data),
    update: (id: number, data: object) => client.patch<Account>(`/accounts/${id}`, data).then(r => r.data),
    delete: (id: number) => client.delete(`/accounts/${id}`),
  },

  transactions: {
    list: (params: object) =>
      client.get<TransactionListResponse>('/transactions/', { params }).then(r => r.data),
    create: (data: object) => client.post<Transaction>('/transactions/', data).then(r => r.data),
    update: (id: number, data: object) =>
      client.patch<Transaction>(`/transactions/${id}`, data).then(r => r.data),
    delete: (id: number) => client.delete(`/transactions/${id}`),
  },

  imports: {
    upload: (accountId: number, file: File) => {
      const form = new FormData()
      form.append('account_id', String(accountId))
      form.append('file', file)
      return client.post<ImportResult>('/imports/', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      }).then(r => r.data)
    },
    list: (accountId?: number) =>
      client.get('/imports/', { params: accountId ? { account_id: accountId } : {} }).then(r => r.data),
  },

  tags: {
    list: (search?: string) =>
      client.get<Tag[]>('/tags/', { params: search ? { search } : {} }).then(r => r.data),
    create: (data: object) => client.post<Tag>('/tags/', data).then(r => r.data),
    update: (id: number, data: object) => client.patch<Tag>(`/tags/${id}`, data).then(r => r.data),
    delete: (id: number) => client.delete(`/tags/${id}`),
  },

  categoryRules: {
    list: () => client.get<CategoryRule[]>('/category-rules/').then(r => r.data),
    create: (data: object) => client.post<CategoryRule>('/category-rules/', data).then(r => r.data),
    update: (id: number, data: object) =>
      client.patch<CategoryRule>(`/category-rules/${id}`, data).then(r => r.data),
    delete: (id: number) => client.delete(`/category-rules/${id}`),
  },

  goals: {
    list: (params?: object) => client.get<Goal[]>('/goals/', { params }).then(r => r.data),
    create: (data: object) => client.post<Goal>('/goals/', data).then(r => r.data),
    update: (id: number, data: object) => client.patch<Goal>(`/goals/${id}`, data).then(r => r.data),
    updateDebt: (id: number, data: object) =>
      client.patch<Goal>(`/goals/${id}/debt`, data).then(r => r.data),
    setAccounts: (id: number, accountIds: number[]) =>
      client.put<Goal>(`/goals/${id}/accounts`, { account_ids: accountIds }).then(r => r.data),
    delete: (id: number) => client.delete(`/goals/${id}`),
  },

  dashboard: {
    summary: (params: object) =>
      client.get<DashboardSummary>('/dashboard/summary', { params }).then(r => r.data),
    byPeriod: (params: object) =>
      client.get<ByPeriodResponse>('/dashboard/by-period', { params }).then(r => r.data),
    byTag: (params: object) =>
      client.get<ByTagResponse>('/dashboard/by-tag', { params }).then(r => r.data),
    topMerchants: (params: object) =>
      client.get<{ merchants: MerchantRow[] }>('/dashboard/top-merchants', { params }).then(r => r.data),
    goals: () =>
      client.get<GoalProgress[]>('/dashboard/goals').then(r => r.data),
  },
}
