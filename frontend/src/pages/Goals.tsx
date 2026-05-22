import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { CurrencyInput } from '@/components/ui/currency-input'
import { EmptyState } from '@/components/EmptyState'
import { api } from '@/api'
import { formatBRL, formatDate, GOAL_TYPE_LABEL } from '@/lib/utils'
import type { Goal, GoalType, GoalStatus } from '@/types'

const STATUS_BADGE: Record<string, string> = {
  active:    'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
  completed: 'bg-blue-500/15 text-blue-600 dark:text-blue-400',
  paused:    'bg-amber-500/15 text-amber-600 dark:text-amber-400',
  cancelled: 'bg-muted text-muted-foreground',
}

const STATUS_LABEL: Record<GoalStatus, string> = {
  active:    'Ativo',
  completed: 'Concluído',
  paused:    'Pausado',
  cancelled: 'Cancelado',
}

const GOAL_TYPES: { value: GoalType; label: string }[] = [
  { value: 'savings',       label: 'Poupança' },
  { value: 'debt_payoff',   label: 'Quitação de dívida' },
  { value: 'investment',    label: 'Investimento' },
  { value: 'spending_limit', label: 'Limite de gastos' },
]

type GoalFormState = {
  name: string
  description: string
  goal_type: GoalType
  target_amount: string
  deadline: string
  status: GoalStatus
}

type DebtFormState = {
  creditor: string
  original_amount: string
  current_balance: string
  interest_rate: string
  installments_total: string
  installments_paid: string
  start_date: string
  due_date: string
}

const GOAL_EMPTY: GoalFormState = {
  name: '', description: '', goal_type: 'savings',
  target_amount: '', deadline: '', status: 'active',
}

const DEBT_EMPTY: DebtFormState = {
  creditor: '', original_amount: '', current_balance: '',
  interest_rate: '', installments_total: '', installments_paid: '',
  start_date: '', due_date: '',
}

// ── GoalCard ─────────────────────────────────────────────────────────────────

function GoalCard({
  goal,
  onEdit,
  onDelete,
}: {
  goal: Goal
  onEdit: (g: Goal) => void
  onDelete: (g: Goal) => void
}) {
  const isDebt = goal.goal_type === 'debt_payoff'

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <CardTitle className="text-base truncate">{goal.name}</CardTitle>
            {goal.description && (
              <p className="text-xs text-muted-foreground mt-0.5 truncate">{goal.description}</p>
            )}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[goal.status]}`}>
              {STATUS_LABEL[goal.status]}
            </span>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEdit(goal)}>
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => onDelete(goal)}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
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

// ── GoalDialog ────────────────────────────────────────────────────────────────

function GoalDialog({
  open,
  editGoal,
  onClose,
  onSaved,
}: {
  open: boolean
  editGoal: Goal | null
  onClose: () => void
  onSaved: (goal: Goal) => void
}) {
  const isEdit = editGoal !== null
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<GoalFormState>(GOAL_EMPTY)
  const [debt, setDebt] = useState<DebtFormState>(DEBT_EMPTY)

  useEffect(() => {
    if (!open) return
    if (editGoal) {
      setForm({
        name:          editGoal.name,
        description:   editGoal.description ?? '',
        goal_type:     editGoal.goal_type,
        target_amount: editGoal.target_amount,
        deadline:      editGoal.deadline ?? '',
        status:        editGoal.status,
      })
      if (editGoal.debt) {
        setDebt({
          creditor:           editGoal.debt.creditor,
          original_amount:    editGoal.debt.original_amount,
          current_balance:    editGoal.debt.current_balance,
          interest_rate:      editGoal.debt.interest_rate ?? '',
          installments_total: editGoal.debt.installments_total?.toString() ?? '',
          installments_paid:  editGoal.debt.installments_paid?.toString() ?? '',
          start_date:         editGoal.debt.start_date ?? '',
          due_date:           editGoal.debt.due_date ?? '',
        })
      } else {
        setDebt(DEBT_EMPTY)
      }
    } else {
      setForm(GOAL_EMPTY)
      setDebt(DEBT_EMPTY)
    }
  }, [open, editGoal])

  const isDebt = form.goal_type === 'debt_payoff'

  function setF(field: keyof GoalFormState, value: string) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  function setD(field: keyof DebtFormState, value: string) {
    setDebt(prev => ({ ...prev, [field]: value }))
  }

  async function submitEdit(goal: Goal) {
    const goalPayload: Record<string, unknown> = {
      name:        form.name,
      description: form.description || null,
      status:      form.status,
      deadline:    form.deadline || null,
    }
    if (!isDebt) goalPayload.target_amount = form.target_amount
    const updated = await api.goals.update(goal.id, goalPayload)

    if (isDebt && goal.debt) {
      const debtPayload: Record<string, unknown> = {
        creditor:          debt.creditor || null,
        current_balance:   debt.current_balance || null,
        interest_rate:     debt.interest_rate || null,
        installments_paid: debt.installments_paid ? parseInt(debt.installments_paid) : null,
        due_date:          debt.due_date || null,
      }
      onSaved(await api.goals.updateDebt(goal.id, debtPayload))
    } else {
      onSaved(updated)
    }
    toast.success('Objetivo atualizado')
  }

  async function submitCreate() {
    const payload: Record<string, unknown> = {
      name:          form.name,
      description:   form.description || null,
      goal_type:     form.goal_type,
      target_amount: isDebt ? (debt.original_amount || '0') : form.target_amount,
      deadline:      form.deadline || null,
    }
    if (isDebt) {
      payload.debt = {
        creditor:           debt.creditor,
        original_amount:    debt.original_amount,
        current_balance:    debt.current_balance || debt.original_amount,
        interest_rate:      debt.interest_rate || null,
        installments_total: debt.installments_total ? parseInt(debt.installments_total) : null,
        installments_paid:  debt.installments_paid ? parseInt(debt.installments_paid) : null,
        start_date:         debt.start_date || null,
        due_date:           debt.due_date || null,
      }
    }
    onSaved(await api.goals.create(payload))
    toast.success('Objetivo criado')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      if (isEdit && editGoal) await submitEdit(editGoal)
      else await submitCreate()
      onClose()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro ao salvar objetivo')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose() }}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Editar objetivo' : 'Novo objetivo'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="goal-name">Nome <span className="text-primary">*</span></Label>
            <Input
              id="goal-name"
              value={form.name}
              onChange={e => setF('name', e.target.value)}
              required
              placeholder="Ex: Reserva de emergência"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="goal-desc">Descrição</Label>
            <Input
              id="goal-desc"
              value={form.description}
              onChange={e => setF('description', e.target.value)}
              placeholder="Opcional"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select
                value={form.goal_type}
                onValueChange={v => setF('goal_type', v as GoalType)}
                disabled={isEdit}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {GOAL_TYPES.map(t => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {isEdit && (
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={v => setF('status', v as GoalStatus)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(Object.entries(STATUS_LABEL) as [GoalStatus, string][]).map(([v, l]) => (
                      <SelectItem key={v} value={v}>{l}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {!isDebt && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="goal-amount">Valor da meta <span className="text-primary">*</span></Label>
                <CurrencyInput
                  id="goal-amount"
                  prefix="R$"
                  value={form.target_amount}
                  onChange={v => setF('target_amount', v)}
                  required={!isDebt}
                  placeholder="0,00"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="goal-deadline">Prazo</Label>
                <Input
                  id="goal-deadline"
                  type="date"
                  value={form.deadline}
                  onChange={e => setF('deadline', e.target.value)}
                />
              </div>
            </div>
          )}

          {isDebt && (
            <div className="space-y-3 border rounded-lg p-3 bg-muted/30">
              <p className="text-sm font-medium text-muted-foreground">Dados da dívida</p>

              <div className="space-y-2">
                <Label htmlFor="debt-creditor">Credor <span className="text-primary">*</span></Label>
                <Input
                  id="debt-creditor"
                  value={debt.creditor}
                  onChange={e => setD('creditor', e.target.value)}
                  required={isDebt && !isEdit}
                  placeholder="Ex: Banco Bradesco"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                {!isEdit && (
                  <div className="space-y-2">
                    <Label htmlFor="debt-original">Valor original <span className="text-primary">*</span></Label>
                    <CurrencyInput
                      id="debt-original"
                      prefix="R$"
                      value={debt.original_amount}
                      onChange={v => setD('original_amount', v)}
                      required={isDebt && !isEdit}
                      placeholder="0,00"
                    />
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="debt-balance">Saldo atual <span className="text-primary">*</span></Label>
                  <CurrencyInput
                    id="debt-balance"
                    prefix="R$"
                    value={debt.current_balance}
                    onChange={v => setD('current_balance', v)}
                    required={isDebt}
                    placeholder="0,00"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="debt-rate">Juros a.m. (%)</Label>
                  <Input
                    id="debt-rate"
                    type="number"
                    min="0"
                    step="0.01"
                    value={debt.interest_rate}
                    onChange={e => setD('interest_rate', e.target.value)}
                    placeholder="Ex: 1,99"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {!isEdit && (
                  <div className="space-y-2">
                    <Label htmlFor="debt-inst-total">Total de parcelas</Label>
                    <Input
                      id="debt-inst-total"
                      type="number"
                      min="1"
                      step="1"
                      value={debt.installments_total}
                      onChange={e => setD('installments_total', e.target.value)}
                      placeholder="Ex: 48"
                    />
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="debt-inst-paid">Parcelas pagas</Label>
                  <Input
                    id="debt-inst-paid"
                    type="number"
                    min="0"
                    step="1"
                    value={debt.installments_paid}
                    onChange={e => setD('installments_paid', e.target.value)}
                    placeholder="Ex: 12"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {!isEdit && (
                  <div className="space-y-2">
                    <Label htmlFor="debt-start">Data de início</Label>
                    <Input
                      id="debt-start"
                      type="date"
                      value={debt.start_date}
                      onChange={e => setD('start_date', e.target.value)}
                    />
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="debt-due">Data de vencimento</Label>
                  <Input
                    id="debt-due"
                    type="date"
                    value={debt.due_date}
                    onChange={e => setD('due_date', e.target.value)}
                  />
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="pt-2">
            <DialogClose asChild>
              <Button type="button" variant="outline" disabled={saving}>Cancelar</Button>
            </DialogClose>
            <Button type="submit" disabled={saving}>
              {saving ? 'Salvando…' : isEdit ? 'Salvar' : 'Criar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ── Goals page ────────────────────────────────────────────────────────────────

export default function Goals() {
  const [goals, setGoals]       = useState<Goal[]>([])
  const [loading, setLoading]   = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editGoal, setEditGoal] = useState<Goal | null>(null)
  const [deleteGoal, setDeleteGoal] = useState<Goal | null>(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    api.goals.list()
      .then(setGoals)
      .catch(e => toast.error(e.message))
      .finally(() => setLoading(false))
  }, [])

  function openCreate() {
    setEditGoal(null)
    setDialogOpen(true)
  }

  function openEdit(goal: Goal) {
    setEditGoal(goal)
    setDialogOpen(true)
  }

  function handleSaved(goal: Goal) {
    setGoals(prev => {
      const idx = prev.findIndex(g => g.id === goal.id)
      return idx >= 0
        ? prev.map(g => g.id === goal.id ? goal : g)
        : [...prev, goal]
    })
  }

  async function handleDelete() {
    if (!deleteGoal) return
    setDeleting(true)
    try {
      await api.goals.delete(deleteGoal.id)
      setGoals(prev => prev.filter(g => g.id !== deleteGoal.id))
      toast.success('Objetivo excluído')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro ao excluir objetivo')
    } finally {
      setDeleting(false)
      setDeleteGoal(null)
    }
  }

  const active   = goals.filter(g => g.status === 'active')
  const inactive = goals.filter(g => g.status !== 'active')

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
    <div className="flex flex-col h-full p-8 gap-8">
      <div className="flex items-center justify-between shrink-0">
        <h1 className="text-2xl font-bold">Objetivos</h1>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Novo objetivo
        </Button>
      </div>

      {active.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Ativos</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {active.map(g => (
              <GoalCard key={g.id} goal={g} onEdit={openEdit} onDelete={setDeleteGoal} />
            ))}
          </div>
        </section>
      )}

      {inactive.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Concluídos / Pausados / Cancelados</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {inactive.map(g => (
              <GoalCard key={g.id} goal={g} onEdit={openEdit} onDelete={setDeleteGoal} />
            ))}
          </div>
        </section>
      )}

      {goals.length === 0 && (
        <div className="flex-1 flex items-center justify-center">
          <EmptyState
            action={
              <Button variant="outline" onClick={openCreate}>
                <Plus className="h-4 w-4 mr-2" />
                Criar primeiro objetivo
              </Button>
            }
          />
        </div>
      )}

      <GoalDialog
        open={dialogOpen}
        editGoal={editGoal}
        onClose={() => setDialogOpen(false)}
        onSaved={handleSaved}
      />

      <AlertDialog open={!!deleteGoal} onOpenChange={v => { if (!v) setDeleteGoal(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir objetivo</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir <strong>{deleteGoal?.name}</strong>? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? 'Excluindo…' : 'Excluir'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
