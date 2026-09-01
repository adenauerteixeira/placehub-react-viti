import { useState } from 'react'
import { AlertTriangle, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { supabase } from '@/lib/supabase'

type Scope = 'funnel' | 'funnel_and_announcements'

const SCOPES: {
  value: Scope
  title: string
  description: string
  risk: string
  riskLevel: 'default' | 'high'
}[] = [
  {
    value: 'funnel',
    title: 'Funil comercial',
    description:
      'Apaga Leads, Negociações, Propostas, Reservas, Vendas e Comissões de toda a imobiliária. Anúncios, Corretores e Usuários continuam intactos (anúncios "Vendido"/"Reservado" voltam a "Publicado", já que a venda/reserva que justificava isso deixa de existir).',
    risk: 'Isso remove QUALQUER lead, negociação, proposta, reserva, venda e comissão da imobiliária — não só as geradas em treinamento. Fotos de anúncios continuam no ar; comprovantes já enviados (recibos de parcela, repasse) ficam órfãos no armazenamento, mas não aparecem mais em lugar nenhum do sistema.',
    riskLevel: 'default',
  },
  {
    value: 'funnel_and_announcements',
    title: 'Funil comercial + Anúncios',
    description:
      'Tudo da opção acima, mais todos os imóveis cadastrados (Anúncios) — incluindo fotos e amenidades vinculadas.',
    risk: 'Além de tudo da opção acima, apaga TODOS os anúncios da imobiliária — inclusive imóveis reais já publicados no site, se houver algum. Use somente se a imobiliária ainda não tiver anúncios de verdade cadastrados.',
    riskLevel: 'high',
  },
]

export function ResetDataPage() {
  const [scope, setScope] = useState<Scope>('funnel')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const selected = SCOPES.find((s) => s.value === scope)!

  async function handleReset() {
    if (!password) {
      toast.error('Informe sua senha pra confirmar.')
      return
    }

    const confirmed = window.confirm(
      `Tem certeza? Isso vai apagar dados de verdade (${selected.title.toLowerCase()}) e não pode ser desfeito.`,
    )
    if (!confirmed) return

    setSubmitting(true)
    const { error } = await supabase.functions.invoke('reset-tenant-data', {
      body: { password, scope },
    })
    setSubmitting(false)

    if (error) {
      let message = error.message
      try {
        const body = await error.context?.json()
        if (body?.error) message = body.error
      } catch {
        // resposta sem corpo JSON legível — mantém error.message
      }
      toast.error('Não foi possível resetar os dados', { description: message })
      return
    }

    setPassword('')
    toast.success('Dados resetados.')
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Resetar dados</CardTitle>
          <CardDescription>
            Apaga dados de teste/treinamento gerados na prática do funil comercial — útil depois de
            uma sessão de treinamento com a equipe. Ação exclusiva do administrador, irreversível.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          <div className="flex flex-col gap-3">
            {SCOPES.map((s) => (
              <label
                key={s.value}
                className={cn(
                  'flex cursor-pointer flex-col gap-2 rounded-xl border p-4 transition-colors',
                  scope === s.value ? 'border-primary bg-primary/5' : 'hover:bg-muted/50',
                )}
              >
                <div className="flex items-start gap-2.5">
                  <input
                    type="radio"
                    name="reset-scope"
                    className="mt-1 accent-primary"
                    checked={scope === s.value}
                    onChange={() => setScope(s.value)}
                  />
                  <div className="flex flex-col gap-1">
                    <span className="text-sm font-medium">{s.title}</span>
                    <span className="text-muted-foreground text-sm">{s.description}</span>
                  </div>
                </div>
                <div
                  className={cn(
                    'ml-6 flex gap-2 rounded-md border-l-4 p-3 text-xs',
                    s.riskLevel === 'high'
                      ? 'border-destructive bg-destructive/10 text-destructive'
                      : 'bg-muted/60 border-primary text-muted-foreground',
                  )}
                >
                  <AlertTriangle className="size-3.5 shrink-0" />
                  <span>{s.risk}</span>
                </div>
              </label>
            ))}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="reset-password">Confirme sua senha</Label>
            <Input
              id="reset-password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <Button
            variant="destructive"
            disabled={submitting || !password}
            onClick={handleReset}
            className="self-start"
          >
            {submitting && <Loader2 className="animate-spin" />}
            Resetar dados
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
