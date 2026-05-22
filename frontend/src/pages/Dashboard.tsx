import { useEffect, useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { api } from '@/api'
import { formatBRL, GOAL_TYPE_LABEL } from '@/lib/utils'
import type { DashboardSummary, ByPeriodResponse, ByTagResponse, GoalProgress } from '@/types'

const CHART_COLORS = ['#33a95a', '#ef4444', '#6395ee', '#65daf0', '#4582b5', '#199741', '#ec4899']

function SummaryCards({ data }: { data: DashboardSummary }) {
  const cards = [
    { label: 'Entradas', value: data.total_income, color: 'text-emerald-600 dark:text-emerald-400' },
    { label: 'Saídas',   value: data.total_expense, color: 'text-rose-600 dark:text-rose-400' },
    { label: 'Saldo',    value: data.net,
      color: parseFloat(data.net) >= 0
        ? 'text-emerald-600 dark:text-emerald-400'
        : 'text-rose-600 dark:text-rose-400' },
    { label: 'Pagamentos fatura', value: data.total_payment, color: 'text-muted-foreground' },
  ]
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map(c => (
        <Card key={c.label}>
          <CardHeader className="pb-1">
            <CardTitle className="text-xs font-medium text-muted-foreground">{c.label}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`text-xl font-bold ${c.color}`}>{formatBRL(c.value)}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

function PeriodChart({ data }: { data: ByPeriodResponse }) {
  const formatted = data.points.map(p => ({
    period: p.period,
    Entradas: parseFloat(p.income),
    Saídas: parseFloat(p.expense),
  }))
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Entradas vs Saídas por mês</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={formatted} barCategoryGap="30%">
            <XAxis dataKey="period" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} tickFormatter={v => `R$${(v/1000).toFixed(0)}k`} />
            <Tooltip formatter={(v) => formatBRL(Number(v))} />
            <Legend />
            <Bar dataKey="Entradas" fill={CHART_COLORS[0]} radius={[3,3,0,0]} />
            <Bar dataKey="Saídas"   fill={CHART_COLORS[1]} radius={[3,3,0,0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}

function TagPieChart({ data }: { data: ByTagResponse }) {
  const top = data.shares.slice(0, 8)
  const pieData = top.map(s => ({ name: s.tag.name, value: parseFloat(s.total) }))
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Gastos por tag</CardTitle>
      </CardHeader>
      <CardContent>
        {pieData.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">Nenhuma transação com tag no período.</p>
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80}
                label={({ name, percent }) => `${name ?? ''} ${((percent as number) * 100).toFixed(0)}%`}
                labelLine={false}
              >
                {pieData.map((_, i) => (
                  <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(v) => formatBRL(Number(v))} />
            </PieChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  )
}

function GoalsCards({ goals }: { goals: GoalProgress[] }) {
  if (goals.length === 0) return null
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Objetivos ativos</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {goals.map(g => (
          <div key={g.id}>
            <div className="flex justify-between text-sm mb-1">
              <span className="font-medium">{g.name}</span>
              <span className="text-muted-foreground">{GOAL_TYPE_LABEL[g.goal_type]}</span>
            </div>
            <div className="flex justify-between text-xs text-muted-foreground mb-1">
              <span>{formatBRL(g.current_amount)} de {formatBRL(g.target_amount)}</span>
              <span>{g.progress_percent.toFixed(1)}%</span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all"
                style={{ width: `${Math.min(g.progress_percent, 100)}%` }}
              />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

export default function Dashboard() {
  const [summary, setSummary]   = useState<DashboardSummary | null>(null)
  const [period, setPeriod]     = useState<ByPeriodResponse | null>(null)
  const [byTag, setByTag]       = useState<ByTagResponse | null>(null)
  const [goals, setGoals]       = useState<GoalProgress[]>([])
  const [loading, setLoading]   = useState(true)

  useEffect(() => {
    const now = new Date()
    const dateFrom = new Date(now.getFullYear(), now.getMonth() - 5, 1)
      .toISOString().slice(0, 10)
    const dateTo = now.toISOString().slice(0, 10)
    const params = { date_from: dateFrom, date_to: dateTo }

    Promise.all([
      api.dashboard.summary(params),
      api.dashboard.byPeriod({ ...params, group_by: 'month' }),
      api.dashboard.byTag(params),
      api.dashboard.goals(),
    ]).then(([s, p, t, g]) => {
      setSummary(s); setPeriod(p); setByTag(t); setGoals(g)
    }).finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="p-8 space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24" />)}
        </div>
        <Skeleton className="h-72" />
      </div>
    )
  }

  return (
    <div className="p-8 space-y-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>
      {summary && <SummaryCards data={summary} />}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {period && <PeriodChart data={period} />}
        {byTag && <TagPieChart data={byTag} />}
      </div>
      <GoalsCards goals={goals} />
    </div>
  )
}
