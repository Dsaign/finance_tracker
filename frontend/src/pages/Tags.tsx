import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Plus, Trash2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { api } from '@/api'
import type { Tag, CategoryRule } from '@/types'

function TagBadge({ tag }: { tag: Tag }) {
  return (
    <span
      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium text-white"
      style={{ backgroundColor: tag.color ?? '#6b7280' }}
    >
      {tag.name}
    </span>
  )
}

const PRESET_COLORS = [
  '#ef4444', '#f97316', '#eab308', '#22c55e',
  '#14b8a6', '#3b82f6', '#8b5cf6', '#ec4899',
  '#6b7280',
]

export default function Tags() {
  const [tags, setTags]   = useState<Tag[]>([])
  const [rules, setRules] = useState<CategoryRule[]>([])
  const [loading, setLoading] = useState(true)
  const [newTag, setNewTag]   = useState({ name: '', color: '#22c55e' })

  function loadAll() {
    return Promise.all([
      api.tags.list().then(setTags),
      api.categoryRules.list().then(setRules),
    ])
  }

  useEffect(() => {
    loadAll().catch(e => toast.error(e.message)).finally(() => setLoading(false))
  }, [])

  async function createTag() {
    if (!newTag.name.trim()) return
    try {
      await api.tags.create(newTag)
      setNewTag({ name: '', color: '#22c55e' })
      await loadAll()
      toast.success('Tag criada')
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Erro')
    }
  }

  async function deleteTag(tag: Tag) {
    if (!confirm(`Excluir tag "${tag.name}"?`)) return
    try {
      await api.tags.delete(tag.id)
      await loadAll()
      toast.success('Tag excluída')
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Erro')
    }
  }

  async function deleteRule(rule: CategoryRule) {
    if (!confirm(`Excluir regra "${rule.keyword}"?`)) return
    try {
      await api.categoryRules.delete(rule.id)
      await loadAll()
      toast.success('Regra excluída')
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Erro')
    }
  }

  if (loading) {
    return <div className="p-8 space-y-4"><Skeleton className="h-64" /></div>
  }

  return (
    <div className="p-8 space-y-8">
      <h1 className="text-2xl font-bold">Tags</h1>

      {/* Criar tag */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">
            Nova tag
            <span
              className="inline-flex ml-5 items-center px-2.5 py-0.5 rounded-full text-xs font-medium text-white shrink-0"
              style={{ backgroundColor: newTag.color }}
            >
              {newTag.name || 'Preview'}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 items-end">
            <div className="flex-1 space-y-1.5">
              <Label>Nome</Label>
              <div className="flex items-center gap-2">
                <Input
                  value={newTag.name}
                  onChange={e => setNewTag(t => ({ ...t, name: e.target.value.trimStart() }))}
                  onKeyDown={e => e.key === 'Enter' && createTag()}
                  placeholder="ex: Alimentação"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Cor</Label>
              <div className="flex items-center gap-1.5">
                {PRESET_COLORS.map(c => (
                  <button
                    type="button"
                    key={c}
                    title={c}
                    className={`w-6 h-6 cursor-pointer rounded-full transition-all focus:outline-none ${newTag.color === c ? 'ring-0 ring-offset-1 ring-foreground scale-110' : 'hover:scale-110'}`}
                    style={{ backgroundColor: c }}
                    onClick={() => setNewTag(t => ({ ...t, color: c }))}
                  />
                ))}
                <label
                  title="Cor personalizada"
                  className={`w-6 h-6 text-center rounded-full cursor-pointer transition-all relative overflow-hidden focus-within:outline-none ring-0 ring-offset-1 ring-foreground scale-110`}
                  style={{ backgroundColor: newTag.color }}
                >+
                  <input
                    type="color"
                    value={newTag.color}
                    onChange={e => setNewTag(t => ({ ...t, color: e.target.value }))}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                  />
                </label>
              </div>
            </div>
            <Button onClick={createTag} size="sm">
              <Plus size={14} className="mr-1" /> Criar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Lista de tags */}
      <Card>
        <CardHeader><CardTitle className="text-sm">Tags cadastradas ({tags.length})</CardTitle></CardHeader>
        <CardContent>
          {tags.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma tag cadastrada.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {tags.map(tag => (
                <div key={tag.id} className="flex items-center gap-1 group">
                  <TagBadge tag={tag} />
                  <button
                    onClick={() => deleteTag(tag)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-rose-500"
                  >
                    <Trash2 size={11} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Regras de categorização */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Regras de categorização ({rules.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {rules.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma regra cadastrada.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-xs text-muted-foreground uppercase tracking-wide">
                  <th className="py-2 text-left font-medium">Keyword</th>
                  <th className="py-2 text-left font-medium">Tipo de match</th>
                  <th className="py-2 text-left font-medium">Prioridade</th>
                  <th className="py-2 text-left font-medium">Tags aplicadas</th>
                  <th className="py-2" />
                </tr>
              </thead>
              <tbody>
                {rules.map(rule => (
                  <tr key={rule.id} className="border-b border-border/40">
                    <td className="py-2 font-mono text-xs">{rule.keyword}</td>
                    <td className="py-2 text-muted-foreground">{rule.match_type}</td>
                    <td className="py-2 text-muted-foreground">{rule.priority}</td>
                    <td className="py-2">
                      <div className="flex flex-wrap gap-1">
                        {rule.tags.map(t => <TagBadge key={t.id} tag={t} />)}
                      </div>
                    </td>
                    <td className="py-2 text-right">
                      <Button
                        variant="ghost" size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-rose-500"
                        onClick={() => deleteRule(rule)}
                      >
                        <Trash2 size={13} />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
