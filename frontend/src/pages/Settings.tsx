import { useEffect, useState } from 'react'
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
import { UnderlineTabs, UnderlineTabsList, UnderlineTabsTrigger, UnderlineTabsContent } from '@/components/ui/underline-tabs'
import { ACCOUNT_TYPE_LABEL } from '@/lib/utils'
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
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
}

// ── InstitutionDialog ─────────────────────────────────────────────────────────

const INST_EMPTY = { name: '', slug: '', parser_type: '' }

function InstitutionDialog({ open, editInst, onClose, onSaved }: {
  open: boolean
  editInst: Institution | null
  onClose: () => void
  onSaved: () => void
}) {
  const [form, setForm] = useState(INST_EMPTY)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    setForm(editInst
      ? { name: editInst.name, slug: editInst.slug, parser_type: editInst.parser_type }
      : INST_EMPTY
    )
  }, [open, editInst])

  async function handleSave() {
    if (!form.name || !form.slug || !form.parser_type) {
      toast.error('Preencha nome, slug e parser.')
      return
    }
    setSaving(true)
    try {
      if (editInst) {
        await api.institutions.update(editInst.id, form)
        toast.success('Instituição atualizada')
      } else {
        await api.institutions.create(form)
        toast.success('Instituição criada')
      }
      onClose()
      onSaved()
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Erro')
    } finally { setSaving(false) }
  }

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose() }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{editInst ? 'Editar instituição' : 'Nova instituição'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>Nome</Label>
            <Input
              value={form.name}
              onChange={e => {
                const name = e.target.value
                setForm(f => ({ ...f, name, ...(!editInst && { slug: slugify(name) }) }))
              }}
              maxLength={30}
              placeholder="ex: Nubank"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Slug</Label>
            <Input
              value={form.slug}
              onChange={e => setForm(f => ({ ...f, slug: e.target.value }))}
              placeholder="ex: nubank"
              maxLength={30}
              className="font-mono"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Parser</Label>
            <Select value={form.parser_type} onValueChange={v => setForm(f => ({ ...f, parser_type: v }))}>
              <SelectTrigger><SelectValue placeholder="Selecione o parser..." /></SelectTrigger>
              <SelectContent>
                {PARSERS.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild><Button variant="outline">Cancelar</Button></DialogClose>
          <Button onClick={handleSave} disabled={saving}>{saving ? 'Salvando...' : 'Salvar'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── AccountGroupDialog ────────────────────────────────────────────────────────

const GROUP_EMPTY = { name: '', description: '' }

function AccountGroupDialog({ open, editGroup, onClose, onSaved }: {
  open: boolean
  editGroup: AccountGroup | null
  onClose: () => void
  onSaved: () => void
}) {
  const [form, setForm] = useState(GROUP_EMPTY)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    setForm(editGroup
      ? { name: editGroup.name, description: editGroup.description ?? '' }
      : GROUP_EMPTY
    )
  }, [open, editGroup])

  async function handleSave() {
    if (!form.name) { toast.error('Preencha o nome do grupo.'); return }
    setSaving(true)
    try {
      const payload = { ...form, description: form.description || null }
      if (editGroup) {
        await api.accountGroups.update(editGroup.id, payload)
        toast.success('Grupo atualizado')
      } else {
        await api.accountGroups.create(payload)
        toast.success('Grupo criado')
      }
      onClose()
      onSaved()
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Erro')
    } finally { setSaving(false) }
  }

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose() }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{editGroup ? 'Editar grupo' : 'Novo grupo de contas'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>Nome</Label>
            <Input
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="ex: Pessoa Física"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Descrição <span className="text-xs text-muted-foreground">(opcional)</span></Label>
            <Input
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="ex: Contas pessoais"
            />
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild><Button variant="outline">Cancelar</Button></DialogClose>
          <Button onClick={handleSave} disabled={saving}>{saving ? 'Salvando...' : 'Salvar'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── AccountDialog ─────────────────────────────────────────────────────────────

const ACCT_EMPTY = { name: '', institution_id: '', account_group_id: '', type: '' as AccountType | '', currency: 'BRL', active: true }

function AccountDialog({ open, editAcct, institutions, groups, onClose, onSaved }: {
  open: boolean
  editAcct: Account | null
  institutions: Institution[]
  groups: AccountGroup[]
  onClose: () => void
  onSaved: () => void
}) {
  const [form, setForm] = useState(ACCT_EMPTY)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    setForm(editAcct ? {
      name:             editAcct.name,
      institution_id:   String(editAcct.institution_id),
      account_group_id: editAcct.account_group_id ? String(editAcct.account_group_id) : '',
      type:             editAcct.type,
      currency:         editAcct.currency,
      active:           editAcct.active,
    } : ACCT_EMPTY)
  }, [open, editAcct])

  async function handleSave() {
    if (!form.name || !form.institution_id || !form.type) {
      toast.error('Preencha nome, instituição e tipo.')
      return
    }
    setSaving(true)
    try {
      const payload = {
        name:             form.name,
        institution_id:   parseInt(form.institution_id),
        account_group_id: form.account_group_id ? parseInt(form.account_group_id) : null,
        type:             form.type as AccountType,
        currency:         form.currency,
        active:           form.active,
      }
      if (editAcct) {
        await api.accounts.update(editAcct.id, payload)
        toast.success('Conta atualizada')
      } else {
        await api.accounts.create(payload)
        toast.success('Conta criada')
      }
      onClose()
      onSaved()
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Erro')
    } finally { setSaving(false) }
  }

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose() }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{editAcct ? 'Editar conta' : 'Nova conta'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>Nome</Label>
            <Input
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              maxLength={30}
              placeholder="ex: Nubank Cartão"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Instituição</Label>
            <Select value={form.institution_id} onValueChange={v => setForm(f => ({ ...f, institution_id: v }))}>
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
            <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v as AccountType }))}>
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
              value={form.account_group_id || '_none'}
              onValueChange={v => setForm(f => ({ ...f, account_group_id: v === '_none' ? '' : v }))}
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
              checked={form.active}
              onCheckedChange={v => setForm(f => ({ ...f, active: v }))}
            />
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild><Button variant="outline">Cancelar</Button></DialogClose>
          <Button onClick={handleSave} disabled={saving}>{saving ? 'Salvando...' : 'Salvar'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── Settings page ─────────────────────────────────────────────────────────────

export default function Settings() {
  const [loading, setLoading] = useState(true)

  const [institutions, setInstitutions] = useState<Institution[]>([])
  const [groups,       setGroups]       = useState<AccountGroup[]>([])
  const [accounts,     setAccounts]     = useState<Account[]>([])

  const [instOpen,  setInstOpen]  = useState(false)
  const [editInst,  setEditInst]  = useState<Institution | null>(null)

  const [groupOpen, setGroupOpen] = useState(false)
  const [editGroup, setEditGroup] = useState<AccountGroup | null>(null)

  const [acctOpen,  setAcctOpen]  = useState(false)
  const [editAcct,  setEditAcct]  = useState<Account | null>(null)

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

  async function deleteInst(inst: Institution) {
    if (!confirm(`Excluir "${inst.name}"? Contas vinculadas serão afetadas.`)) return
    try {
      await api.institutions.delete(inst.id)
      toast.success('Instituição excluída')
      await loadAll()
    } catch (e: unknown) { toast.error(e instanceof Error ? e.message : 'Erro') }
  }

  async function deleteGroup(group: AccountGroup) {
    if (!confirm(`Excluir grupo "${group.name}"?`)) return
    try {
      await api.accountGroups.delete(group.id)
      toast.success('Grupo excluído')
      await loadAll()
    } catch (e: unknown) { toast.error(e instanceof Error ? e.message : 'Erro') }
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

      <UnderlineTabs defaultValue="institutions">
        <UnderlineTabsList>
          <UnderlineTabsTrigger value="institutions">Instituições</UnderlineTabsTrigger>
          <UnderlineTabsTrigger value="groups">Grupos de contas</UnderlineTabsTrigger>
          <UnderlineTabsTrigger value="accounts">Contas</UnderlineTabsTrigger>
        </UnderlineTabsList>

        <UnderlineTabsContent value="institutions" className="mt-6 space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">{institutions.length} instituição(ões) cadastrada(s)</p>
            <Button size="sm" onClick={() => { setEditInst(null); setInstOpen(true) }}>
              <Plus size={14} /> Nova instituição
            </Button>
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
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditInst(inst); setInstOpen(true) }}><Pencil size={13} /></Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-rose-500" onClick={() => deleteInst(inst)}><Trash2 size={13} /></Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </UnderlineTabsContent>

        <UnderlineTabsContent value="groups" className="mt-6 space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">{groups.length} grupo(s) cadastrado(s)</p>
            <Button size="sm" onClick={() => { setEditGroup(null); setGroupOpen(true) }}>
              <Plus size={14} /> Novo grupo
            </Button>
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
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditGroup(group); setGroupOpen(true) }}><Pencil size={13} /></Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-rose-500" onClick={() => deleteGroup(group)}><Trash2 size={13} /></Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </UnderlineTabsContent>

        <UnderlineTabsContent value="accounts" className="mt-6 space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">{accounts.length} conta(s) cadastrada(s)</p>
            <Button size="sm" onClick={() => { setEditAcct(null); setAcctOpen(true) }}>
              <Plus size={14} /> Nova conta
            </Button>
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
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditAcct(acct); setAcctOpen(true) }}><Pencil size={13} /></Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-rose-500" onClick={() => deleteAcct(acct)}><Trash2 size={13} /></Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </UnderlineTabsContent>
      </UnderlineTabs>

      <InstitutionDialog
        open={instOpen}
        editInst={editInst}
        onClose={() => setInstOpen(false)}
        onSaved={() => loadAll()}
      />
      <AccountGroupDialog
        open={groupOpen}
        editGroup={editGroup}
        onClose={() => setGroupOpen(false)}
        onSaved={() => loadAll()}
      />
      <AccountDialog
        open={acctOpen}
        editAcct={editAcct}
        institutions={institutions}
        groups={groups}
        onClose={() => setAcctOpen(false)}
        onSaved={() => loadAll()}
      />
    </div>
  )
}
