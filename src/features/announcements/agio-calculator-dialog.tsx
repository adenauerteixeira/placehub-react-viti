import { useEffect, useState } from 'react'
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
import type { AgioCalculation } from './api'

function formatPrice(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function formatDateBR(iso: string) {
  const [year, month, day] = iso.split('-')
  return `${day}/${month}/${year}`
}

function todayISO() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

function parseISODate(iso: string) {
  const [year, month, day] = iso.split('-').map(Number)
  return new Date(year, month - 1, day)
}

function clampDayInMonth(year: number, month: number, day: number) {
  const lastDay = new Date(year, month + 1, 0).getDate()
  return Math.min(day, lastDay)
}

/** Conta quantos vencimentos (dia fixo do mês) caíram entre a data de
 * referência (exclusive) e hoje (inclusive), avançando mês a mês — cobre
 * qualquer intervalo, não só "mesmo ano". Meses sem esse dia (ex: 31 em
 * fevereiro) usam o último dia do mês. */
function countElapsedInstallments(referenceISO: string, dueDay: number) {
  const reference = parseISODate(referenceISO)
  const today = parseISODate(todayISO())
  let cursorYear = reference.getFullYear()
  let cursorMonth = reference.getMonth()
  let count = 0
  let lastDueISO = referenceISO

  for (let guard = 0; guard < 1200; guard++) {
    const day = clampDayInMonth(cursorYear, cursorMonth, dueDay)
    const dueDate = new Date(cursorYear, cursorMonth, day)
    if (dueDate > today) break
    if (dueDate > reference) {
      count++
      lastDueISO = `${cursorYear}-${String(cursorMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    }
    cursorMonth++
    if (cursorMonth > 11) {
      cursorMonth = 0
      cursorYear++
    }
  }

  return { count, lastDueISO }
}

const emptyData: AgioCalculation = {
  valorOriginal: null,
  valorPago: null,
  saldoDevedor: null,
  valorMercado: null,
  custosTransferencia: null,
  taxaTransferencia: '',
  margem: '10',
  valorPrestacao: null,
  diaVencimento: null,
  dataReferencia: null,
}

/** Calculadora de ágio pra imóveis em cessão (financiamento bancário ou direto
 * com a construtora): ajuda o corretor a chegar num valor sugerido a partir do
 * que já foi pago, da valorização estimada e dos custos de transferência —
 * não é um cálculo exato, é um ponto de partida pra negociação. Os dados
 * ficam com o formulário do anúncio (props `data`/`onApply`), não com o
 * diálogo, pra persistir entre edições — o dono do imóvel pode querer
 * atualizar alguma informação depois. */
export function AgioCalculatorDialog({
  open,
  onOpenChange,
  data,
  onApply,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  data: AgioCalculation | null
  onApply: (data: AgioCalculation, suggestedPrice: number) => void
}) {
  const [form, setForm] = useState<AgioCalculation>(data ?? emptyData)
  const [updateNotice, setUpdateNotice] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    const initial = data ?? emptyData
    setUpdateNotice(null)

    if (initial.valorPrestacao && initial.diaVencimento && initial.dataReferencia) {
      const { count, lastDueISO } = countElapsedInstallments(
        initial.dataReferencia,
        initial.diaVencimento,
      )
      if (count > 0) {
        const pago = (initial.valorPago ?? 0) + count * initial.valorPrestacao
        const saldo = Math.max(0, (initial.saldoDevedor ?? 0) - count * initial.valorPrestacao)
        setForm({ ...initial, valorPago: pago, saldoDevedor: saldo, dataReferencia: lastDueISO })
        setUpdateNotice(
          `${count} parcela${count > 1 ? 's' : ''} de ${formatPrice(initial.valorPrestacao)} venceu${count > 1 ? 'ram' : ''} desde ${formatDateBR(initial.dataReferencia)} — valores atualizados abaixo.`,
        )
        return
      }
    }
    setForm(initial)
  }, [open, data])

  function set<K extends keyof AgioCalculation>(key: K, value: AgioCalculation[K]) {
    setForm((f) => {
      const next = { ...f, [key]: value }
      if (
        (key === 'valorPrestacao' || key === 'diaVencimento') &&
        next.valorPrestacao &&
        next.diaVencimento &&
        !next.dataReferencia
      ) {
        next.dataReferencia = todayISO()
      }
      return next
    })
  }

  useEffect(() => {
    const taxaNumber = Number(form.taxaTransferencia.replace(',', '.'))
    if (!taxaNumber || !form.valorMercado) return
    const calculado = Math.round(form.valorMercado * (taxaNumber / 100) * 100) / 100
    setForm((f) => (f.custosTransferencia === calculado ? f : { ...f, custosTransferencia: calculado }))
  }, [form.taxaTransferencia, form.valorMercado])

  const margemNumber = Number(form.margem.replace(',', '.')) || 0
  const valorizacao =
    form.valorMercado != null && form.valorOriginal != null
      ? Math.max(0, form.valorMercado - form.valorOriginal)
      : 0
  const base = Math.max(0, (form.valorPago ?? 0) + valorizacao - (form.custosTransferencia ?? 0))
  const agioSugerido = base * (1 + margemNumber / 100)
  const valorTotalTransacao = agioSugerido + (form.saldoDevedor ?? 0)
  const hasInput = form.valorPago != null && form.valorPago > 0

  function handleApply() {
    onApply(form, Math.round(agioSugerido * 100) / 100)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-lg"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>Calculadora de ágio</DialogTitle>
          <DialogDescription>
            Responda o que souber sobre o financiamento pra chegar num valor de ágio sugerido.
            Campos em branco entram como zero — os dados ficam salvos com o anúncio pra você
            reabrir e ajustar depois.
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
              <FieldLabel hint="Cada empreendimento cobra uma taxa diferente — informe o % pra preencher o custo de transferência automaticamente a partir do valor de mercado atual, ou digite o valor direto se já souber.">
                Custos de transferência
              </FieldLabel>
              <div className="grid grid-cols-[5.5rem_1fr] gap-2">
                <div className="relative">
                  <Input
                    id="agio-taxa-transferencia"
                    inputMode="decimal"
                    className="pr-6"
                    placeholder="0,00"
                    value={form.taxaTransferencia}
                    onChange={(e) => set('taxaTransferencia', e.target.value)}
                  />
                  <span className="text-muted-foreground pointer-events-none absolute inset-y-0 right-2 flex items-center text-sm">
                    %
                  </span>
                </div>
                <CurrencyInput
                  value={form.custosTransferencia}
                  onChange={(v) => set('custosTransferencia', v)}
                />
              </div>
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

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <FieldLabel hint="Opcional — valor de cada parcela do financiamento. Junto com o dia de vencimento, deixa o sistema manter 'já pago' e 'saldo devedor' em dia sozinho.">
                Valor da prestação
              </FieldLabel>
              <CurrencyInput value={form.valorPrestacao} onChange={(v) => set('valorPrestacao', v)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <FieldLabel htmlFor="agio-vencimento" hint="Dia do mês em que a prestação vence (ex: 10). Toda vez que a calculadora é aberta depois dessa data, ela soma a(s) parcela(s) vencida(s) ao valor pago e desconta do saldo devedor.">
                Dia de vencimento
              </FieldLabel>
              <Input
                id="agio-vencimento"
                type="number"
                min="1"
                max="31"
                value={form.diaVencimento ?? ''}
                onChange={(e) =>
                  set('diaVencimento', e.target.value ? Math.min(31, Math.max(1, Number(e.target.value))) : null)
                }
              />
            </div>
          </div>

          {updateNotice && (
            <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:bg-amber-950 dark:text-amber-200">
              {updateNotice}
            </p>
          )}

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
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button type="button" onClick={handleApply} disabled={!hasInput}>
            <Calculator className="size-4" /> Aplicar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
