import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { api } from '@/api'
import { formatBRL, formatDate, GOAL_TYPE_LABEL } from '@/lib/utils'
import type { Goal } from '@/types'

const STATUS_BADGE: Record<string, string> = {
  active:    'bg-emerald-100 text-emerald-700',
  completed: 'bg-blue-100 text-blue-700',
  paused:    'bg-amber-100 text-amber-700',
  cancelled: 'bg-neutral-100 text-neutral-500',
}

function GoalCard({ goal }: { goal: Goal }) {
  const isDebt = goal.goal_type === 'debt_payoff'

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle className="text-base">{goal.name}</CardTitle>
            {goal.description && (
              <p className="text-xs text-neutral-500 mt-0.5">{goal.description}</p>
            )}
          </div>
          <span className={`shrink-0 px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[goal.status]}`}>
            {goal.status === 'active' ? 'Ativo' : goal.status === 'completed' ? 'Concluído' : goal.status === 'paused' ? 'Pausado' : 'Cancelado'}
          </span>
        </div>
        <p className="text-xs text-neutral-400">{GOAL_TYPE_LABEL[goal.goal_type]}</p>
      </CardHeader>
      <CardContent className="space-y-3">
        {isDebt && goal.debt ? (
          <>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <p className="text-xs text-neutral-500">Credor</p>
                <p className="font-medium">{goal.debt.creditor}</p>
              </div>
              <div>
                <p className="text-xs text-neutral-500">Saldo atual</p>
                <p className="font-medium text-rose-600">{formatBRL(goal.debt.current_balance)}</p>
              </div>
              <div>
                <p className="text-xs text-neutral-500">Valor original</p>
                <p className="font-medium">{formatBRL(goal.debt.original_amount)}</p>
              </div>
              <div>
                <p className="text-xs text-neutral-500">Já pago</p>
                <p className="font-medium text-emerald-600">{formatBRL(goal.debt.paid_amount)}</p>
              </div>
              {goal.debt.installments_total && (
                <div className="col-span-2">
                  <p className="text-xs text-neutral-500">Parcelas</p>
                  <p className="font-medium">
                    {goal.debt.installments_paid ?? 0}/{goal.debt.installments_total}
                  </p>
                </div>
              )}
            </div>
            <div>
              <div className="flex justify-between text-xs text-neutral-500 mb-1">
                <span>Progresso</span>
                <span>{goal.debt.progress_percent.toFixed(1)}%</span>
              </div>
              <div className="h-2 bg-neutral-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-indigo-500 rounded-full"
                  style={{ width: `${Math.min(goal.debt.progress_percent, 100)}%` }}
                />
              </div>
            </div>
          </>
        ) : (
          <div className="text-sm">
            <div className="flex justify-between mb-1">
              <span className="text-neutral-500">Meta</span>
              <span className="font-medium">{formatBRL(goal.target_amount)}</span>
            </div>
            {goal.deadline && (
              <div className="flex justify-between text-xs text-neutral-400">
                <span>Prazo</span>
                <span>{formatDate(goal.deadline)}</span>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default function Goals() {
  const [goals, setGoals] = useState<Goal[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.goals.list()
      .then(setGoals)
      .catch(e => toast.error(e.message))
      .finally(() => setLoading(false))
  }, [])

  const active    = goals.filter(g => g.status === 'active')
  const inactive  = goals.filter(g => g.status !== 'active')

  if (loading) {
    return (
      <div className="p-8 space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-48" />)}
        </div>
      </div>
    )
  }

  return (
    <div className="p-8 space-y-8">
      <h1 className="text-2xl font-bold">Objetivos</h1>

      {active.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-neutral-500 uppercase tracking-wide mb-3">Ativos</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {active.map(g => <GoalCard key={g.id} goal={g} />)}
          </div>
        </section>
      )}

      {inactive.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-neutral-500 uppercase tracking-wide mb-3">Concluídos / Pausados</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {inactive.map(g => <GoalCard key={g.id} goal={g} />)}
          </div>
        </section>
      )}

      {goals.length === 0 && (
        <p className="text-neutral-400 text-sm">Nenhum objetivo cadastrado ainda.</p>
      )}
    </div>
  )
}
