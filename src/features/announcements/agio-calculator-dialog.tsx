import { useState } from 'react'
import { Calculator } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { CurrencyInput } from '@/components/currency-input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { FieldLabel } from '@/components/field-label'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'

function formatPrice(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

const initialState = {
  valorOriginal: null as number | null,
  valorPago: null as number | null,
  saldoDevedor: null as number | null,
  valorMercado: null as number | null,
  custosTransferencia: null as number | null,
  margem: '10',
}

/** Calculadora de ágio pra imóveis em cessão (financiamento bancário ou direto
 * com a construtora): ajuda o corretor a chegar num valor sugerido a partir do
 * que já foi pago, da valorização estimada e dos custos de transferência —
 * não é um cálculo exato, é um ponto de partida pra negociação. */
export function AgioCalculatorDialog({
  open,
  onOpenChange,
  onApply,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onApply: (value: number) => void
}) {
  const [form, setForm] = useState(initialState)

  function set<K extends keyof typeof initialState>(key: K, value: (typeof initialState)[K]) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  const margemNumber = Number(form.margem.replace(',', '.')) || 0
  const valorizacao =
    form.valorMercado != null && form.valorOriginal != null
      ? Math.max(0, form.valorMercado - form.valorOriginal)
      : 0
  const base = Math.max(0, (form.valorPago ?? 0) + valorizacao - (form.custosTransferencia ?? 0))
  const agioSugerido = base * (1 + margemNumber / 100)
  const valorTotalTransacao = agioSugerido + (form.saldoDevedor ?? 0)
  const hasInput = form.valorPago != null && form.valorPago > 0

  function handleClose(nextOpen: boolean) {
    if (!nextOpen) setForm(initialState)
    onOpenChange(nextOpen)
  }

  function handleApply() {
    onApply(Math.round(agioSugerido * 100) / 100)
    handleClose(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent
        className="sm:max-w-lg"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>Calculadora de ágio</DialogTitle>
          <DialogDescription>
            Responda o que souber sobre o financiamento pra chegar num valor de ágio sugerido.
            Campos em branco entram como zero.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <FieldLabel hint="Valor do imóvel/contrato no momento em que o financiamento foi assinado.">
                Valor original do contrato
              </FieldLabel>
              <CurrencyInput
                value={form.valorOriginal}
                onChange={(v) => set('valorOriginal', v)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <FieldLabel hint="Soma da entrada com todas as parcelas já pagas ao banco ou à construtora.">
                Já pago até agora
              </FieldLabel>
              <CurrencyInput value={form.valorPago} onChange={(v) => set('valorPago', v)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <FieldLabel hint="Quanto ainda falta pagar ao banco/construtora — o cessionário assume esse saldo.">
                Saldo devedor restante
              </FieldLabel>
              <CurrencyInput value={form.saldoDevedor} onChange={(v) => set('saldoDevedor', v)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <FieldLabel hint="Opcional — se o imóvel valorizou desde a compra, informe o valor de mercado atual pra considerar essa diferença no ágio.">
                Valor de mercado atual
              </FieldLabel>
              <CurrencyInput value={form.valorMercado} onChange={(v) => set('valorMercado', v)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <FieldLabel hint="Opcional — taxas de anuência do banco, transferência do contrato, cartório, etc.">
                Custos de transferência
              </FieldLabel>
              <CurrencyInput
                value={form.custosTransferencia}
                onChange={(v) => set('custosTransferencia', v)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <FieldLabel htmlFor="agio-margem" hint="Margem sobre o patrimônio já construído — o quanto o cedente quer lucrar além do que já pagou.">
                Margem desejada
              </FieldLabel>
              <div className="relative">
                <Input
                  id="agio-margem"
                  inputMode="decimal"
                  className="pr-7"
                  value={form.margem}
                  onChange={(e) => set('margem', e.target.value)}
                />
                <span className="text-muted-foreground pointer-events-none absolute inset-y-0 right-2.5 flex items-center text-sm">
                  %
                </span>
              </div>
            </div>
          </div>

          <Separator />

          <div className="flex flex-col gap-1.5 text-sm">
            <div className="text-muted-foreground flex justify-between">
              <span>Valorização estimada</span>
              <span>{formatPrice(valorizacao)}</span>
            </div>
            <div className="text-muted-foreground flex justify-between">
              <span>Base de cálculo (pago + valorização − custos)</span>
              <span>{formatPrice(base)}</span>
            </div>
            <div className="flex items-center justify-between text-base font-semibold">
              <span>Ágio sugerido</span>
              <span>{formatPrice(agioSugerido)}</span>
            </div>
            <div className="text-muted-foreground flex justify-between">
              <span>Valor total da transação (ágio + saldo assumido)</span>
              <span>{formatPrice(valorTotalTransacao)}</span>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => handleClose(false)}>
            Cancelar
          </Button>
          <Button type="button" onClick={handleApply} disabled={!hasInput}>
            <Calculator className="size-4" /> Usar este valor no preço
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
