import { useEffect, useState, useCallback, useRef } from 'react'
import { toast } from 'sonner'
import { Trash2, Plus, Pencil, ChevronLeft, ChevronRight, Download, CheckCircle2, AlertCircle } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { api } from '@/api'
import { cn, formatBRL, formatDate, FLOW_LABEL } from '@/lib/utils'
import type { Account, Tag, Transaction, TransactionFlow, TransactionListResponse, ImportResult } from '@/types'

const FLOW_COLOR: Record<string, string> = {
  income:   'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
  expense:  'bg-rose-500/15 text-rose-600 dark:text-rose-400',
  payment:  'bg-muted text-muted-foreground',
  transfer: 'bg-blue-500/15 text-blue-600 dark:text-blue-400',
}

const FLOW_OPTIONS: { value: TransactionFlow; label: string }[] = [
  { value: 'income',   label: 'Entrada' },
  { value: 'expense',  label: 'Saída' },
  { value: 'payment',  label: 'Pagamento' },
  { value: 'transfer', label: 'Transferência' },
]

const today = () => new Date().toISOString().slice(0, 10)

const TX_EMPTY = {
  date: today(),
  description: '',
  amount: '',
  flow: '' as TransactionFlow | '',
  account_id: '',
  tag_ids: [] as number[],
}

export default function Transactions() {
  const [data,    setData]    = useState<TransactionListResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [search,  setSearch]  = useState('')
  const [flow,    setFlow]    = useState<string>('all')
  const [page,    setPage]    = useState(1)

  const [accounts,         setAccounts]         = useState<Account[]>([])
  const [allTags,          setAllTags]          = useState<Tag[]>([])
  const [selectedAccount,  setSelectedAccount]  = useState<string>('all')

  const [txOpen,  setTxOpen]  = useState(false)
  const [editTx,  setEditTx]  = useState<Transaction | null>(null)
  const [txForm,  setTxForm]  = useState(TX_EMPTY)
  const [saving,   setSaving]   = useState(false)

  const [importOpen,      setImportOpen]      = useState(false)
  const [importAccountId, setImportAccountId] = useState('')
  const [importFile,      setImportFile]      = useState<File | null>(null)
  const [importLoading,   setImportLoading]   = useState(false)
  const [importResult,    setImportResult]    = useState<ImportResult | null>(null)
  const importInputRef = useRef<HTMLInputElement>(null)

  const [containerH, setContainerH] = useState(0)
  const tableRef = useRef<HTMLDivElement>(null)

  // ROW_MIN_H = altura mínima de linha para evitar oscilação do layout durante o carregamento
  // HEADER_H = altura do header da tabela, para calcular quantas linhas cabem no container sem scroll
  const ROW_MIN_H = 30
  const HEADER_H  = 30
  
  // pageSize e rowH derivados deterministicamente do containerH — sem oscilação
  const pageSize = containerH > 0
    ? Math.max(5, Math.floor((containerH - HEADER_H) / ROW_MIN_H))
    : 20
  const rowH = containerH > 0
    ? Math.floor((containerH - HEADER_H) / pageSize)
    : undefined

  useEffect(() => {
    const el = tableRef.current
    if (!el) return
    setContainerH(el.clientHeight)
    const ro = new ResizeObserver(() => setContainerH(el.clientHeight))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const load = useCallback(() => {
    setLoading(true)
    api.transactions.list({
      search: search || undefined,
      flow: flow !== 'all' ? flow : undefined,
      account_id: selectedAccount !== 'all' ? parseInt(selectedAccount) : undefined,
      page,
      page_size: pageSize,
    }).then(setData).catch(e => toast.error(e.message))
      .finally(() => setLoading(false))
  }, [search, flow, selectedAccount, page, pageSize])

  useEffect(() => { setPage(1) }, [search, flow, selectedAccount, pageSize])
  useEffect(() => { load() }, [load])

  useEffect(() => {
    api.accounts.list(true).then(setAccounts).catch(() => {})
    api.tags.list().then(setAllTags).catch(() => {})
  }, [])

  // ── Dialog helpers ──────────────────────────────────────────────────────────

  function openCreate() {
    setEditTx(null)
    setTxForm({ ...TX_EMPTY, date: today() })
    setTxOpen(true)
  }

  function openEdit(tx: Transaction) {
    setEditTx(tx)
    setTxForm({
      date: tx.date,
      description: tx.description,
      amount: tx.amount,
      flow: tx.flow,
      account_id: String(tx.account_id),
      tag_ids: tx.tags.map(t => t.id),
    })
    setTxOpen(true)
  }

  function toggleTag(id: number) {
    setTxForm(f => ({
      ...f,
      tag_ids: f.tag_ids.includes(id)
        ? f.tag_ids.filter(t => t !== id)
        : [...f.tag_ids, id],
    }))
  }

  async function submitTx() {
    if (!txForm.date || !txForm.description || !txForm.amount || !txForm.flow) {
      toast.error('Preencha data, descrição, valor e tipo.')
      return
    }
    const amount = parseFloat(txForm.amount)
    if (isNaN(amount) || amount <= 0) {
      toast.error('Valor deve ser um número positivo.')
      return
    }
    setSaving(true)
    try {
      if (editTx) {
        await api.transactions.update(editTx.id, {
          date: txForm.date,
          description: txForm.description,
          amount,
          flow: txForm.flow,
          tag_ids: txForm.tag_ids,
        })
        toast.success('Transação atualizada')
      } else {
        if (!txForm.account_id) { toast.error('Selecione uma conta.'); return }
        await api.transactions.create({
          date: txForm.date,
          description: txForm.description,
          amount,
          flow: txForm.flow,
          account_id: parseInt(txForm.account_id),
          tag_ids: txForm.tag_ids,
        })
        toast.success('Transação criada')
      }
      setTxOpen(false)
      load()
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Erro')
    } finally { setSaving(false) }
  }

  function handleDelete(tx: Transaction) {
    if (!confirm(`Excluir "${tx.description}"?`)) return
    api.transactions.delete(tx.id)
      .then(() => { toast.success('Transação excluída'); load() })
      .catch(e => toast.error(e.message))
  }

  function openImport() {
    setImportAccountId('')
    setImportFile(null)
    setImportResult(null)
    setImportOpen(true)
  }

  function handleImportDrop(e: React.DragEvent) {
    e.preventDefault()
    const f = e.dataTransfer.files[0]
    if (f) { setImportFile(f); setImportResult(null) }
  }

  async function submitImport() {
    if (!importAccountId || !importFile) {
      toast.error('Selecione uma conta e um arquivo.')
      return
    }
    setImportLoading(true)
    try {
      const r = await api.imports.upload(parseInt(importAccountId), importFile)
      setImportResult(r)
      toast.success(`${r.total_inserted} transações importadas!`)
      load()
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Erro ao importar')
    } finally {
      setImportLoading(false)
    }
  }

  const totalPages = data ? Math.ceil(data.total / pageSize) : 1
  const accountMap = new Map(accounts.map(a => [a.id, a]))
  const showAccountCol = selectedAccount === 'all'

  return (
    <div className="flex flex-col h-full p-6 gap-3">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between shrink-0">
        <h1 className="text-2xl font-bold">Extrato</h1>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={openImport}>
            <Download size={14} /> Importar
          </Button>
          <Button size="sm" onClick={openCreate}>
            <Plus size={14} /> Nova transação
          </Button>
        </div>
      </div>

      {/* Abas de conta */}
      <div className="flex gap-1 shrink-0">
        <button
          onClick={() => setSelectedAccount('all')}
          className={cn(
            'px-3 py-1 text-sm rounded-md transition-colors',
            selectedAccount === 'all'
              ? 'bg-accent text-accent-foreground font-medium'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted'
          )}
        >
          Todas as contas
        </button>
        {accounts.map(a => (
          <button
            key={a.id}
            onClick={() => setSelectedAccount(String(a.id))}
            className={cn(
              'px-3 py-1 text-sm rounded-md transition-colors',
              selectedAccount === String(a.id)
                ? 'bg-accent text-accent-foreground font-medium'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
            )}
          >
            {a.name}
          </button>
        ))}
      </div>

      {/* Filtros */}
      <div className="flex gap-3 shrink-0">
        <Input
          placeholder="Buscar descrição..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <Select value={flow} onValueChange={setFlow}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os tipos</SelectItem>
            {FLOW_OPTIONS.map(o => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Tabela */}
      <Card className="flex-1 min-h-0 flex flex-col overflow-hidden">
        <CardContent className="p-0 flex flex-col flex-1 min-h-0">
          <div ref={tableRef} className="flex-1 min-h-0 overflow-hidden">
            {loading ? (
              <div className="p-6 space-y-2">
                {[...Array(8)].map((_, i) => <Skeleton key={i} className="h-8" />)}
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-muted-foreground text-xs uppercase tracking-wide">
                    <th className="px-4 py-1.5 text-left font-medium">Data</th>
                    <th className="px-4 py-1.5 text-left font-medium">Descrição</th>
                    {showAccountCol && <th className="px-4 py-1.5 text-left font-medium">Conta</th>}
                    <th className="px-4 py-1.5 text-left font-medium">Tags</th>
                    <th className="px-4 py-1.5 text-left font-medium">Tipo</th>
                    <th className="px-4 py-1.5 text-right font-medium">Valor</th>
                    <th className="px-4 py-1.5" />
                  </tr>
                </thead>
                <tbody>
                  {data?.items.map(tx => (
                    <tr key={tx.id} style={rowH ? { height: rowH } : undefined} className="border-b border-border/40 hover:bg-accent-foreground/5 transition-colors">
                      <td className="px-4 py-0.5 text-muted-foreground whitespace-nowrap">{formatDate(tx.date)}</td>
                      <td className="px-4 py-0.5 font-normal max-w-xs truncate">{tx.description}</td>
                      {showAccountCol && (
                        <td className="px-4 py-0.5 text-sm text-muted-foreground whitespace-nowrap">
                          {accountMap.get(tx.account_id)?.name ?? '—'}
                        </td>
                      )}
                      <td className="px-4 py-0.5">
                        <div className="flex flex-wrap gap-1">
                          {tx.tags.map(tag => (
                            <span
                              key={tag.id}
                              className="px-2 py-0.5 rounded-full text-xs font-normal text-white"
                              style={{ backgroundColor: tag.color ?? '#6b7280' }}
                            >
                              {tag.name}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-0.5">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${FLOW_COLOR[tx.flow]}`}>
                          {FLOW_LABEL[tx.flow]}
                        </span>
                      </td>
                      <td className={`px-4 py-0.5 text-right font-mono font-medium ${
                        tx.flow === 'income'
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : tx.flow === 'expense'
                            ? 'text-rose-600 dark:text-rose-400'
                            : 'text-foreground'
                      }`}>
                        {tx.flow === 'income' ? '+' : tx.flow === 'expense' ? '-' : ''}{formatBRL(tx.amount)}
                      </td>
                      <td className="px-4 py-0.5">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost" size="icon"
                            className="h-6 w-6 text-muted-foreground hover:text-foreground"
                            onClick={() => openEdit(tx)}
                          >
                            <Pencil size={11} />
                          </Button>
                          <Button
                            variant="ghost" size="icon"
                            className="h-6 w-6 text-muted-foreground hover:text-rose-500"
                            onClick={() => handleDelete(tx)}
                          >
                            <Trash2 size={11} />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {data?.items.length === 0 && (
                    <tr>
                      <td colSpan={showAccountCol ? 7 : 6} className="px-4 py-12 text-center text-muted-foreground">
                        Nenhuma transação encontrada.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Rodapé: contagem | paginação | totais */}
      <div className="shrink-0 grid grid-cols-3 items-center">
        <span className="text-sm text-muted-foreground">
          {data ? `${data.total} transações` : ''}
        </span>
        <div className="flex items-center justify-center gap-1.5">
          <Button variant="ghost" size="icon" className="h-7 w-7" disabled={page === 1} onClick={() => setPage(p => p - 1)}>
            <ChevronLeft size={15} />
          </Button>
          <span className="text-sm text-muted-foreground tabular-nums">
            {page} de {totalPages}
          </span>
          <Button variant="ghost" size="icon" className="h-7 w-7" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>
            <ChevronRight size={15} />
          </Button>
        </div>
        {data && (
          <div className="flex items-center justify-end gap-4">
            <div className="flex flex-col items-end">
              <span className="text-xs text-muted-foreground">Entradas</span>
              <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400 tabular-nums">
                +{formatBRL(data.total_income)}
              </span>
            </div>
            <div className="flex flex-col items-end">
              <span className="text-xs text-muted-foreground">Saídas</span>
              <span className="text-sm font-medium text-rose-600 dark:text-rose-400 tabular-nums">
                -{formatBRL(data.total_expense)}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* ── Dialog: importar extrato ────────────────────────────────────────── */}
      <Dialog open={importOpen} onOpenChange={open => { setImportOpen(open); if (!open) { setImportFile(null); setImportResult(null) } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Importar extrato</DialogTitle>
          </DialogHeader>

          {importResult ? (
            <div className="py-4 space-y-3">
              <div className="flex items-center gap-2 text-primary font-medium">
                <CheckCircle2 size={16} /> Importação concluída — {importResult.filename}
              </div>
              <div className="text-sm space-y-1 text-muted-foreground">
                <p><span className="font-medium text-foreground">{importResult.total_parsed}</span> linhas lidas</p>
                <p><span className="font-medium text-foreground">{importResult.total_inserted}</span> transações inseridas</p>
                {importResult.total_skipped > 0 && (
                  <p className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
                    <AlertCircle size={13} /> {importResult.total_skipped} duplicatas ignoradas
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label>Conta</Label>
                <Select value={importAccountId} onValueChange={setImportAccountId}>
                  <SelectTrigger><SelectValue placeholder="Selecione a conta..." /></SelectTrigger>
                  <SelectContent>
                    {accounts.map(a => (
                      <SelectItem key={a.id} value={String(a.id)}>
                        {a.name} — {a.institution.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div
                onDrop={handleImportDrop}
                onDragOver={e => e.preventDefault()}
                onClick={() => importInputRef.current?.click()}
                className="border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:border-primary hover:bg-primary/5 transition-colors"
              >
                <Download size={22} className="mx-auto mb-3 text-muted-foreground" />
                {importFile ? (
                  <p className="text-sm font-medium">{importFile.name}</p>
                ) : (
                  <>
                    <p className="text-sm font-medium">Arraste o arquivo aqui</p>
                    <p className="text-xs text-muted-foreground mt-1">ou clique para selecionar — CSV (Nubank) ou OFX (Bradesco)</p>
                  </>
                )}
                <input
                  ref={importInputRef}
                  type="file"
                  accept=".csv,.ofx"
                  className="hidden"
                  onChange={e => { const f = e.target.files?.[0]; if (f) { setImportFile(f); setImportResult(null) } }}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">{importResult ? 'Fechar' : 'Cancelar'}</Button>
            </DialogClose>
            {!importResult && (
              <Button onClick={submitImport} disabled={importLoading || !importAccountId || !importFile}>
                {importLoading ? 'Importando...' : 'Importar extrato'}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Dialog: criar / editar transação ───────────────────────────────── */}
      <Dialog open={txOpen} onOpenChange={setTxOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editTx ? 'Editar transação' : 'Nova transação'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Data</Label>
                <Input
                  type="date"
                  value={txForm.date}
                  onChange={e => setTxForm(f => ({ ...f, date: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Valor (R$)</Label>
                <Input
                  type="number"
                  min="0.01"
                  step="0.01"
                  placeholder="0,00"
                  value={txForm.amount}
                  onChange={e => setTxForm(f => ({ ...f, amount: e.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Descrição</Label>
              <Input
                placeholder="ex: Supermercado Extra"
                value={txForm.description}
                onChange={e => setTxForm(f => ({ ...f, description: e.target.value }))}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Tipo</Label>
              <Select
                value={txForm.flow}
                onValueChange={v => setTxForm(f => ({ ...f, flow: v as TransactionFlow }))}
              >
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  {FLOW_OPTIONS.map(o => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {!editTx && (
              <div className="space-y-1.5">
                <Label>Conta</Label>
                <Select
                  value={txForm.account_id}
                  onValueChange={v => setTxForm(f => ({ ...f, account_id: v }))}
                >
                  <SelectTrigger><SelectValue placeholder="Selecione a conta..." /></SelectTrigger>
                  <SelectContent>
                    {accounts.map(a => (
                      <SelectItem key={a.id} value={String(a.id)}>
                        {a.name} — {a.institution.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {allTags.length > 0 && (
              <div className="space-y-1.5">
                <Label>Tags <span className="text-xs text-muted-foreground">(opcional)</span></Label>
                <div className="flex flex-wrap gap-1.5 pt-0.5">
                  {allTags.map(tag => {
                    const selected = txForm.tag_ids.includes(tag.id)
                    return (
                      <button
                        key={tag.id}
                        type="button"
                        onClick={() => toggleTag(tag.id)}
                        className={`px-2.5 py-0.5 rounded-full text-xs font-medium text-white transition-opacity ${
                          selected ? 'opacity-100 ring-2 ring-offset-1 ring-offset-background ring-white/40' : 'opacity-40 hover:opacity-70'
                        }`}
                        style={{ backgroundColor: tag.color ?? '#6b7280' }}
                      >
                        {tag.name}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancelar</Button>
            </DialogClose>
            <Button onClick={submitTx} disabled={saving}>
              {saving ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
