import { useEffect, useState, useCallback } from 'react'
import { toast } from 'sonner'
import { Trash2, Plus } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { api } from '@/api'
import { formatBRL, formatDate, FLOW_LABEL } from '@/lib/utils'
import type { Transaction, TransactionListResponse } from '@/types'

const FLOW_COLOR: Record<string, string> = {
  income:   'bg-emerald-100 text-emerald-700',
  expense:  'bg-rose-100 text-rose-700',
  payment:  'bg-neutral-100 text-neutral-600',
  transfer: 'bg-blue-100 text-blue-700',
}

export default function Transactions() {
  const [data, setData]     = useState<TransactionListResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [flow, setFlow]     = useState<string>('all')
  const [page, setPage]     = useState(1)

  const PAGE_SIZE = 50

  const load = useCallback(() => {
    setLoading(true)
    api.transactions.list({
      search: search || undefined,
      flow: flow !== 'all' ? flow : undefined,
      page,
      page_size: PAGE_SIZE,
    }).then(setData).catch(e => toast.error(e.message))
      .finally(() => setLoading(false))
  }, [search, flow, page])

  useEffect(() => { setPage(1) }, [search, flow])
  useEffect(() => { load() }, [load])

  function handleDelete(tx: Transaction) {
    if (!confirm(`Excluir "${tx.description}"?`)) return
    api.transactions.delete(tx.id)
      .then(() => { toast.success('Transação excluída'); load() })
      .catch(e => toast.error(e.message))
  }

  const totalPages = data ? Math.ceil(data.total / PAGE_SIZE) : 1

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Extrato</h1>
        <Button size="sm" variant="outline">
          <Plus size={14} className="mr-1" /> Nova transação
        </Button>
      </div>

      {/* Filtros */}
      <div className="flex gap-3">
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
            <SelectItem value="income">Entrada</SelectItem>
            <SelectItem value="expense">Saída</SelectItem>
            <SelectItem value="payment">Pagamento</SelectItem>
            <SelectItem value="transfer">Transferência</SelectItem>
          </SelectContent>
        </Select>
        {data && (
          <span className="text-sm text-neutral-500 self-center ml-auto">
            {data.total} transações
          </span>
        )}
      </div>

      {/* Tabela */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 space-y-3">
              {[...Array(8)].map((_, i) => <Skeleton key={i} className="h-10" />)}
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-neutral-100 text-neutral-500 text-xs uppercase tracking-wide">
                  <th className="px-4 py-3 text-left font-medium">Data</th>
                  <th className="px-4 py-3 text-left font-medium">Descrição</th>
                  <th className="px-4 py-3 text-left font-medium">Tags</th>
                  <th className="px-4 py-3 text-left font-medium">Tipo</th>
                  <th className="px-4 py-3 text-right font-medium">Valor</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {data?.items.map(tx => (
                  <tr key={tx.id} className="border-b border-neutral-50 hover:bg-neutral-50 transition-colors">
                    <td className="px-4 py-3 text-neutral-500 whitespace-nowrap">{formatDate(tx.date)}</td>
                    <td className="px-4 py-3 font-medium max-w-xs truncate">{tx.description}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {tx.tags.map(tag => (
                          <span
                            key={tag.id}
                            className="px-2 py-0.5 rounded-full text-xs font-medium text-white"
                            style={{ backgroundColor: tag.color ?? '#6b7280' }}
                          >
                            {tag.name}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${FLOW_COLOR[tx.flow]}`}>
                        {FLOW_LABEL[tx.flow]}
                      </span>
                    </td>
                    <td className={`px-4 py-3 text-right font-mono font-medium ${
                      tx.flow === 'income' ? 'text-emerald-600' : tx.flow === 'expense' ? 'text-rose-600' : 'text-neutral-700'
                    }`}>
                      {tx.flow === 'income' ? '+' : tx.flow === 'expense' ? '-' : ''}{formatBRL(tx.amount)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        variant="ghost" size="icon"
                        className="h-7 w-7 text-neutral-400 hover:text-rose-500"
                        onClick={() => handleDelete(tx)}
                      >
                        <Trash2 size={13} />
                      </Button>
                    </td>
                  </tr>
                ))}
                {data?.items.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-neutral-400">
                      Nenhuma transação encontrada.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {/* Paginação */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>
            Anterior
          </Button>
          <span className="text-sm text-neutral-500 self-center">
            Página {page} de {totalPages}
          </span>
          <Button variant="outline" size="sm" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>
            Próxima
          </Button>
        </div>
      )}
    </div>
  )
}
