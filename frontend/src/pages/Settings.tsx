import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import { api } from '@/api'
import { InstitutionName } from '@/components/ui/institution-logo'
import { cn, ACCOUNT_TYPE_LABEL } from '@/lib/utils'
import type { Account, AccountGroup, AccountType, Institution } from '@/types'

const PARSERS = [
  { value: 'nubank_csv',    label: 'Nubank (CSV)' },
  { value: 'bradesco_ofx', label: 'Bradesco (OFX)' },
]

const ACCOUNT_TYPES = Object.entries(ACCOUNT_TYPE_LABEL) as [AccountType, string][]

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
}

const INST_EMPTY  = { name: '', slug: '', parser_type: '' }
const GROUP_EMPTY = { name: '', description: '' }
const ACCT_EMPTY  = { name: '', institution_id: '', account_group_id: '', type: '' as AccountType | '', currency: 'BRL', active: true }

export default function Settings() {
  const [loading, setLoading] = useState(true)
  const [saving,  setSaving]  = useState(false)

  const [institutions, setInstitutions] = useState<Institution[]>([])
  const [groups,       setGroups]       = useState<AccountGroup[]>([])
  const [accounts,     setAccounts]     = useState<Account[]>([])

  // Institution dialog
  const [instOpen, setInstOpen] = useState(false)
  const [editInst, setEditInst] = useState<Institution | null>(null)
  const [instForm, setInstForm] = useState(INST_EMPTY)

  // Account group dialog
  const [groupOpen, setGroupOpen] = useState(false)
  const [editGroup, setEditGroup] = useState<AccountGroup | null>(null)
  const [groupForm, setGroupForm] = useState(GROUP_EMPTY)

  // Account dialog
  const [acctOpen, setAcctOpen] = useState(false)
  const [editAcct, setEditAcct] = useState<Account | null>(null)
  const [acctForm, setAcctForm] = useState(ACCT_EMPTY)

  // Tab indicator
  type TabKey = 'institutions' | 'groups' | 'accounts'
  const TAB_LABELS: Record<TabKey, string> = { institutions: 'Instituições', groups: 'Grupos de contas', accounts: 'Contas' }
  const [activeTab, setActiveTab] = useState<TabKey>('institutions')
  const tabsContainerRef = useRef<HTMLDivElement>(null)
  const tabButtonRefs = useRef<Map<string, HTMLButtonElement>>(new Map())
  const [indicator, setIndicator] = useState({ left: 0, width: 0 })

  useLayoutEffect(() => {
    const el = tabButtonRefs.current.get(activeTab)
    if (el) setIndicator({ left: el.offsetLeft, width: el.offsetWidth })
  }, [activeTab])

  function loadAll() {
    return Promise.all([
      api.institutions.list().then(setInstitutions),
      api.accountGroups.list().then(setGroups),
      api.accounts.list().then(setAccounts),
    ])
  }

  useEffect(() => {
    loadAll().catch(e => toast.error(e.message)).finally(() => setLoading(false))
  }, [])

  // ── Institution ─────────────────────────────────────────────────────────────

  function openInstCreate() {
    setEditInst(null); setInstForm(INST_EMPTY); setInstOpen(true)
  }
  function openInstEdit(inst: Institution) {
    setEditInst(inst)
    setInstForm({ name: inst.name, slug: inst.slug, parser_type: inst.parser_type })
    setInstOpen(true)
  }
  async function submitInst() {
    if (!instForm.name || !instForm.slug || !instForm.parser_type) {
      toast.error('Preencha nome, slug e parser.')
      return
    }
    setSaving(true)
    try {
      const payload = instForm
      if (editInst) {
        await api.institutions.update(editInst.id, payload)
        toast.success('Instituição atualizada')
      } else {
        await api.institutions.create(payload)
        toast.success('Instituição criada')
      }
      setInstOpen(false)
      await loadAll()
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Erro')
    } finally { setSaving(false) }
  }
  async function deleteInst(inst: Institution) {
    if (!confirm(`Excluir "${inst.name}"? Contas vinculadas serão afetadas.`)) return
    try {
      await api.institutions.delete(inst.id)
      toast.success('Instituição excluída')
      await loadAll()
    } catch (e: unknown) { toast.error(e instanceof Error ? e.message : 'Erro') }
  }

  // ── Account Group ───────────────────────────────────────────────────────────

  function openGroupCreate() {
    setEditGroup(null); setGroupForm(GROUP_EMPTY); setGroupOpen(true)
  }
  function openGroupEdit(group: AccountGroup) {
    setEditGroup(group)
    setGroupForm({ name: group.name, description: group.description ?? '' })
    setGroupOpen(true)
  }
  async function submitGroup() {
    if (!groupForm.name) { toast.error('Preencha o nome do grupo.'); return }
    setSaving(true)
    try {
      const payload = { ...groupForm, description: groupForm.description || null }
      if (editGroup) {
        await api.accountGroups.update(editGroup.id, payload)
        toast.success('Grupo atualizado')
      } else {
        await api.accountGroups.create(payload)
        toast.success('Grupo criado')
      }
      setGroupOpen(false)
      await loadAll()
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Erro')
    } finally { setSaving(false) }
  }
  async function deleteGroup(group: AccountGroup) {
    if (!confirm(`Excluir grupo "${group.name}"?`)) return
    try {
      await api.accountGroups.delete(group.id)
      toast.success('Grupo excluído')
      await loadAll()
    } catch (e: unknown) { toast.error(e instanceof Error ? e.message : 'Erro') }
  }

  // ── Account ─────────────────────────────────────────────────────────────────

  function openAcctCreate() {
    setEditAcct(null); setAcctForm(ACCT_EMPTY); setAcctOpen(true)
  }
  function openAcctEdit(acct: Account) {
    setEditAcct(acct)
    setAcctForm({
      name: acct.name,
      institution_id: String(acct.institution_id),
      account_group_id: acct.account_group_id ? String(acct.account_group_id) : '',
      type: acct.type,
      currency: acct.currency,
      active: acct.active,
    })
    setAcctOpen(true)
  }
  async function submitAcct() {
    if (!acctForm.name || !acctForm.institution_id || !acctForm.type) {
      toast.error('Preencha nome, instituição e tipo.')
      return
    }
    setSaving(true)
    try {
      const payload = {
        name: acctForm.name,
        institution_id: parseInt(acctForm.institution_id),
        account_group_id: acctForm.account_group_id ? parseInt(acctForm.account_group_id) : null,
        type: acctForm.type as AccountType,
        currency: acctForm.currency,
        active: acctForm.active,
      }
      if (editAcct) {
        await api.accounts.update(editAcct.id, payload)
        toast.success('Conta atualizada')
      } else {
        await api.accounts.create(payload)
        toast.success('Conta criada')
      }
      setAcctOpen(false)
      await loadAll()
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Erro')
    } finally { setSaving(false) }
  }
  async function deleteAcct(acct: Account) {
    if (!confirm(`Excluir conta "${acct.name}"?`)) return
    try {
      await api.accounts.delete(acct.id)
      toast.success('Conta excluída')
      await loadAll()
    } catch (e: unknown) { toast.error(e instanceof Error ? e.message : 'Erro') }
  }

  if (loading) {
    return <div className="p-8 space-y-4"><Skeleton className="h-64" /></div>
  }

  return (
    <div className="p-8 space-y-6">
      <h1 className="text-2xl font-bold">Configurações</h1>

      <div>
        {/* ── Barra de abas ────────────────────────────────────────────────── */}
        <div ref={tabsContainerRef} className="relative flex items-end border-b border-border">
          {(Object.keys(TAB_LABELS) as TabKey[]).map(tab => (
            <button
              key={tab}
              ref={el => { if (el) tabButtonRefs.current.set(tab, el) }}
              onClick={() => setActiveTab(tab)}
              className={cn(
                'px-4 py-2 text-sm transition-colors whitespace-nowrap',
                activeTab === tab ? 'text-foreground font-medium' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {TAB_LABELS[tab]}
            </button>
          ))}
          <span
            className="absolute bottom-0 h-0.5 bg-primary pointer-events-none"
            style={{
              left: indicator.left,
              width: indicator.width,
              transition: 'left 250ms cubic-bezier(0.4,0,0.2,1), width 250ms cubic-bezier(0.4,0,0.2,1)',
            }}
          />
        </div>

        {/* ── Instituições ─────────────────────────────────────────────────── */}
        {activeTab === 'institutions' && <div className="mt-6 space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">{institutions.length} instituição(ões) cadastrada(s)</p>
            <Button size="sm" onClick={openInstCreate}><Plus size={14} /> Nova instituição</Button>
          </div>
          <Card>
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-xs text-muted-foreground uppercase tracking-wide">
                    <th className="px-4 py-3 text-left font-medium">Nome</th>
                    <th className="px-4 py-3 text-left font-medium">Slug</th>
                    <th className="px-4 py-3 text-left font-medium">Parser</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {institutions.length === 0 && (
                    <tr><td colSpan={4} className="px-4 py-12 text-center text-muted-foreground">Nenhuma instituição cadastrada.</td></tr>
                  )}
                  {institutions.map(inst => (
                    <tr key={inst.id} className="border-b border-border/40 hover:bg-muted/40 transition-colors">
                      <td className="px-4 py-3 font-medium">
                        <InstitutionName slug={inst.slug} name={inst.name} />
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{inst.slug}</td>
                      <td className="px-4 py-3 text-muted-foreground">{PARSERS.find(p => p.value === inst.parser_type)?.label ?? inst.parser_type}</td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openInstEdit(inst)}><Pencil size={13} /></Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-rose-500" onClick={() => deleteInst(inst)}><Trash2 size={13} /></Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </div>}

        {/* ── Grupos de contas ─────────────────────────────────────────────── */}
        {activeTab === 'groups' && <div className="mt-6 space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">{groups.length} grupo(s) cadastrado(s)</p>
            <Button size="sm" onClick={openGroupCreate}><Plus size={14} /> Novo grupo</Button>
          </div>
          <Card>
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-xs text-muted-foreground uppercase tracking-wide">
                    <th className="px-4 py-3 text-left font-medium">Nome</th>
                    <th className="px-4 py-3 text-left font-medium">Descrição</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {groups.length === 0 && (
                    <tr><td colSpan={3} className="px-4 py-12 text-center text-muted-foreground">Nenhum grupo cadastrado.</td></tr>
                  )}
                  {groups.map(group => (
                    <tr key={group.id} className="border-b border-border/40 hover:bg-muted/40 transition-colors">
                      <td className="px-4 py-3 font-medium">{group.name}</td>
                      <td className="px-4 py-3 text-muted-foreground">{group.description ?? '—'}</td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openGroupEdit(group)}><Pencil size={13} /></Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-rose-500" onClick={() => deleteGroup(group)}><Trash2 size={13} /></Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </div>}

        {/* ── Contas ───────────────────────────────────────────────────────── */}
        {activeTab === 'accounts' && <div className="mt-6 space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">{accounts.length} conta(s) cadastrada(s)</p>
            <Button size="sm" onClick={openAcctCreate}><Plus size={14} /> Nova conta</Button>
          </div>
          <Card>
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-xs text-muted-foreground uppercase tracking-wide">
                    <th className="px-4 py-3 text-left font-medium">Nome</th>
                    <th className="px-4 py-3 text-left font-medium">Instituição</th>
                    <th className="px-4 py-3 text-left font-medium">Tipo</th>
                    <th className="px-4 py-3 text-left font-medium">Status</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {accounts.length === 0 && (
                    <tr><td colSpan={5} className="px-4 py-12 text-center text-muted-foreground">Nenhuma conta cadastrada.</td></tr>
                  )}
                  {accounts.map(acct => (
                    <tr key={acct.id} className="border-b border-border/40 hover:bg-muted/40 transition-colors">
                      <td className="px-4 py-3 font-medium">{acct.name}</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        <InstitutionName slug={acct.institution.slug} name={acct.institution.name} />
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{ACCOUNT_TYPE_LABEL[acct.type]}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${acct.active ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' : 'bg-muted text-muted-foreground'}`}>
                          {acct.active ? 'Ativa' : 'Inativa'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openAcctEdit(acct)}><Pencil size={13} /></Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-rose-500" onClick={() => deleteAcct(acct)}><Trash2 size={13} /></Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </div>}
      </div>

      {/* ── Dialog: Instituição ───────────────────────────────────────────────── */}
      <Dialog open={instOpen} onOpenChange={setInstOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editInst ? 'Editar instituição' : 'Nova instituição'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Nome</Label>
              <Input
                value={instForm.name}
                onChange={e => {
                  const name = e.target.value
                  setInstForm(f => ({ ...f, name, ...(!editInst && { slug: slugify(name) }) }))
                }}
                maxLength={30}
                placeholder="ex: Nubank"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Slug</Label>
              <Input
                value={instForm.slug}
                onChange={e => setInstForm(f => ({ ...f, slug: e.target.value }))}
                placeholder="ex: nubank"
                maxLength={30}
                className="font-mono"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Parser</Label>
              <Select value={instForm.parser_type} onValueChange={v => setInstForm(f => ({ ...f, parser_type: v }))}>
                <SelectTrigger><SelectValue placeholder="Selecione o parser..." /></SelectTrigger>
                <SelectContent>
                  {PARSERS.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">Cancelar</Button></DialogClose>
            <Button onClick={submitInst} disabled={saving}>{saving ? 'Salvando...' : 'Salvar'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Dialog: Grupo de contas ───────────────────────────────────────────── */}
      <Dialog open={groupOpen} onOpenChange={setGroupOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editGroup ? 'Editar grupo' : 'Novo grupo de contas'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Nome</Label>
              <Input
                value={groupForm.name}
                onChange={e => setGroupForm(f => ({ ...f, name: e.target.value }))}
                placeholder="ex: Pessoa Física"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Descrição <span className="text-xs text-muted-foreground">(opcional)</span></Label>
              <Input
                value={groupForm.description}
                onChange={e => setGroupForm(f => ({ ...f, description: e.target.value }))}
                placeholder="ex: Contas pessoais"
              />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">Cancelar</Button></DialogClose>
            <Button onClick={submitGroup} disabled={saving}>{saving ? 'Salvando...' : 'Salvar'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Dialog: Conta ─────────────────────────────────────────────────────── */}
      <Dialog open={acctOpen} onOpenChange={setAcctOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editAcct ? 'Editar conta' : 'Nova conta'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Nome</Label>
              <Input
                value={acctForm.name}
                onChange={e => setAcctForm(f => ({ ...f, name: e.target.value }))}
                maxLength={30}
                placeholder="ex: Nubank Cartão"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Instituição</Label>
              <Select value={acctForm.institution_id} onValueChange={v => setAcctForm(f => ({ ...f, institution_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  {institutions.map(i => (
                    <SelectItem key={i.id} value={String(i.id)}>
                      <InstitutionName slug={i.slug} name={i.name} />
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Tipo</Label>
              <Select value={acctForm.type} onValueChange={v => setAcctForm(f => ({ ...f, type: v as AccountType }))}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  {ACCOUNT_TYPES.map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Grupo <span className="text-xs text-muted-foreground">(opcional)</span></Label>
              <Select
                value={acctForm.account_group_id || '_none'}
                onValueChange={v => setAcctForm(f => ({ ...f, account_group_id: v === '_none' ? '' : v }))}
              >
                <SelectTrigger><SelectValue placeholder="Sem grupo" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">Sem grupo</SelectItem>
                  {groups.map(g => <SelectItem key={g.id} value={String(g.id)}>{g.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between py-1">
              <Label>Conta ativa</Label>
              <Switch
                checked={acctForm.active}
                onCheckedChange={v => setAcctForm(f => ({ ...f, active: v }))}
              />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">Cancelar</Button></DialogClose>
            <Button onClick={submitAcct} disabled={saving}>{saving ? 'Salvando...' : 'Salvar'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
