import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { Upload, CheckCircle2, AlertCircle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { api } from '@/api'
import type { Account, ImportResult } from '@/types'

export default function Import() {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [accountId, setAccountId] = useState<string>('')
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<ImportResult | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    api.accounts.list(true).then(setAccounts).catch(e => toast.error(e.message))
  }, [])

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    const f = e.dataTransfer.files[0]
    if (f) { setFile(f); setResult(null) }
  }

  async function handleSubmit() {
    if (!accountId || !file) {
      toast.error('Selecione uma conta e um arquivo.')
      return
    }
    setLoading(true)
    try {
      const r = await api.imports.upload(parseInt(accountId), file)
      setResult(r)
      toast.success(`${r.total_inserted} transações importadas!`)
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Erro ao importar')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-8 max-w-xl space-y-6">
      <h1 className="text-2xl font-bold">Importar extrato</h1>

      <Card>
        <CardContent className="space-y-5 pt-6">
          {/* Conta */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Conta</label>
            <Select value={accountId} onValueChange={setAccountId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione a conta..." />
              </SelectTrigger>
              <SelectContent>
                {accounts.map(a => (
                  <SelectItem key={a.id} value={String(a.id)}>
                    {a.name} — {a.institution.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Drop zone */}
          <div
            onDrop={handleDrop}
            onDragOver={e => e.preventDefault()}
            onClick={() => inputRef.current?.click()}
            className="border-2 border-dashed border-neutral-200 rounded-lg p-10 text-center cursor-pointer
                       hover:border-indigo-400 hover:bg-indigo-50/30 transition-colors"
          >
            <Upload size={24} className="mx-auto mb-3 text-neutral-400" />
            {file ? (
              <p className="text-sm font-medium">{file.name}</p>
            ) : (
              <>
                <p className="text-sm font-medium">Arraste o arquivo aqui</p>
                <p className="text-xs text-neutral-400 mt-1">ou clique para selecionar — CSV (Nubank) ou OFX (Bradesco)</p>
              </>
            )}
            <input
              ref={inputRef}
              type="file"
              accept=".csv,.ofx"
              className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) { setFile(f); setResult(null) } }}
            />
          </div>

          <Button
            className="w-full"
            disabled={!accountId || !file || loading}
            onClick={handleSubmit}
          >
            {loading ? 'Importando...' : 'Importar extrato'}
          </Button>
        </CardContent>
      </Card>

      {/* Resultado */}
      {result && (
        <Card className="border-emerald-200 bg-emerald-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2 text-emerald-700">
              <CheckCircle2 size={16} /> Importação concluída — {result.filename}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-1 text-emerald-800">
            <p><span className="font-medium">{result.total_parsed}</span> linhas lidas</p>
            <p><span className="font-medium">{result.total_inserted}</span> transações inseridas</p>
            {result.total_skipped > 0 && (
              <p className="flex items-center gap-1 text-amber-700">
                <AlertCircle size={13} />
                {result.total_skipped} duplicatas ignoradas
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
