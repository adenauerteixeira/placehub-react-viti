import type { AgioCalculation } from './api.js'

export type AgioSummary = {
  custosTransferencia: number | null
  valorizacao: number
  base: number
  agioSugerido: number
  valorTotalTransacao: number
}

export type AgioInitialization = {
  form: AgioCalculation
  overdueInstallments: { count: number; amount: number; referenceDate: string } | null
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
  return Math.min(day, new Date(year, month + 1, 0).getDate())
}

function elapsedInstallments(referenceISO: string, dueDay: number, currentISO: string) {
  const reference = parseISODate(referenceISO)
  const current = parseISODate(currentISO)
  let year = reference.getFullYear()
  let month = reference.getMonth()
  let count = 0
  let lastDueISO = referenceISO

  for (let guard = 0; guard < 1200; guard++) {
    const day = clampDayInMonth(year, month, dueDay)
    const dueDate = new Date(year, month, day)
    if (dueDate > current) break
    if (dueDate > reference) {
      count++
      lastDueISO = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    }
    month++
    if (month > 11) {
      month = 0
      year++
    }
  }

  return { count, lastDueISO }
}

/** Atualiza valores financiados pelas parcelas que venceram após a última
 * referência. `currentISO` é injetável para que a regra seja determinística
 * em testes. */
export function initializeAgioCalculation(
  data: AgioCalculation,
  currentISO = todayISO(),
): AgioInitialization {
  if (!data.valorPrestacao || !data.diaVencimento || !data.dataReferencia) {
    return { form: data, overdueInstallments: null }
  }

  const { count, lastDueISO } = elapsedInstallments(data.dataReferencia, data.diaVencimento, currentISO)
  if (count === 0) return { form: data, overdueInstallments: null }

  return {
    form: {
      ...data,
      valorPago: (data.valorPago ?? 0) + count * data.valorPrestacao,
      saldoDevedor: Math.max(0, (data.saldoDevedor ?? 0) - count * data.valorPrestacao),
      dataReferencia: lastDueISO,
    },
    overdueInstallments: {
      count,
      amount: data.valorPrestacao,
      referenceDate: data.dataReferencia,
    },
  }
}

/** Mantém o cálculo financeiro independente da interface para ser reutilizado
 * e testado sem precisar renderizar o diálogo. */
export function calculateAgioSummary(form: AgioCalculation): AgioSummary {
  const taxaTransferencia = Number(form.taxaTransferencia.replace(',', '.'))
  const custoCalculado =
    taxaTransferencia && form.valorMercado
      ? Math.round(form.valorMercado * (taxaTransferencia / 100) * 100) / 100
      : null
  const custosTransferencia = custoCalculado ?? form.custosTransferencia
  const margem = Number(form.margem.replace(',', '.')) || 0
  const valorizacao =
    form.valorMercado != null && form.valorOriginal != null
      ? Math.max(0, form.valorMercado - form.valorOriginal)
      : 0
  const base = Math.max(0, (form.valorPago ?? 0) + valorizacao - (custosTransferencia ?? 0))
  const agioSugerido = base * (1 + margem / 100)

  return {
    custosTransferencia,
    valorizacao,
    base,
    agioSugerido,
    valorTotalTransacao: agioSugerido + (form.saldoDevedor ?? 0),
  }
}
