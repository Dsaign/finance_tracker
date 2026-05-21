import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { api } from '@/api'
import { formatBRL, formatDate, GOAL_TYPE_LABEL } from '@/lib/utils'
import type { Goal } from '@/types'

const STATUS_BADGE: Record<string, string> = {
  active:    'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
  completed: 'bg-blue-500/15 text-blue-600 dark:text-blue-400',
  paused:    'bg-amber-500/15 text-amber-600 dark:text-amber-400',
  cancelled: 'bg-muted text-muted-foreground',
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
              <p className="text-xs text-muted-foreground mt-0.5">{goal.description}</p>
            )}
          </div>
          <span className={`shrink-0 px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[goal.status]}`}>
            {goal.status === 'active' ? 'Ativo' : goal.status === 'completed' ? 'Concluído' : goal.status === 'paused' ? 'Pausado' : 'Cancelado'}
          </span>
        </div>
        <p className="text-xs text-muted-foreground">{GOAL_TYPE_LABEL[goal.goal_type]}</p>
      </CardHeader>
      <CardContent className="space-y-3">
        {isDebt && goal.debt ? (
          <>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Credor</p>
                <p className="font-medium">{goal.debt.creditor}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Saldo atual</p>
                <p className="font-medium text-rose-600 dark:text-rose-400">{formatBRL(goal.debt.current_balance)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Valor original</p>
                <p className="font-medium">{formatBRL(goal.debt.original_amount)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Já pago</p>
                <p className="font-medium text-emerald-600 dark:text-emerald-400">{formatBRL(goal.debt.paid_amount)}</p>
              </div>
              {goal.debt.installments_total && (
                <div className="col-span-2">
                  <p className="text-xs text-muted-foreground">Parcelas</p>
                  <p className="font-medium">
                    {goal.debt.installments_paid ?? 0}/{goal.debt.installments_total}
                  </p>
                </div>
              )}
            </div>
            <div>
              <div className="flex justify-between text-xs text-muted-foreground mb-1">
                <span>Progresso</span>
                <span>{goal.debt.progress_percent.toFixed(1)}%</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full"
                  style={{ width: `${Math.min(goal.debt.progress_percent, 100)}%` }}
                />
              </div>
            </div>
          </>
        ) : (
          <div className="text-sm">
            <div className="flex justify-between mb-1">
              <span className="text-muted-foreground">Meta</span>
              <span className="font-medium">{formatBRL(goal.target_amount)}</span>
            </div>
            {goal.deadline && (
              <div className="flex justify-between text-xs text-muted-foreground">
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
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Ativos</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {active.map(g => <GoalCard key={g.id} goal={g} />)}
          </div>
        </section>
      )}

      {inactive.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Concluídos / Pausados</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {inactive.map(g => <GoalCard key={g.id} goal={g} />)}
          </div>
        </section>
      )}

      {goals.length === 0 && (
        <p className="text-muted-foreground text-sm">Nenhum objetivo cadastrado ainda.</p>
      )}
    </div>
  )
}
