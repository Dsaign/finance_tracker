import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatBRL(value: string | number): string {
  const n = typeof value === 'string' ? parseFloat(value) : value
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n)
}

export function formatDate(iso: string): string {
  return new Date(iso + 'T00:00:00').toLocaleDateString('pt-BR')
}

export const FLOW_LABEL: Record<string, string> = {
  income: 'Entrada',
  expense: 'Saída',
  payment: 'Pagamento',
  transfer: 'Transferência',
}

export const ACCOUNT_TYPE_LABEL: Record<string, string> = {
  checking: 'Conta Corrente',
  savings: 'Poupança',
  credit_card: 'Cartão de Crédito',
  investment: 'Investimento',
}

export const GOAL_TYPE_LABEL: Record<string, string> = {
  savings: 'Poupança',
  debt_payoff: 'Quitação de Dívida',
  investment: 'Investimento',
  spending_limit: 'Limite de Gasto',
}
