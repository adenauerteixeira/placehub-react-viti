import { describe, expect, it } from 'vitest'
import {
  calculateAgioSummary,
  initializeAgioCalculation,
} from '../../src/features/announcements/agio-calculation.js'
import type { AgioCalculation } from '../../src/features/announcements/api.js'

function calculation(overrides: Partial<AgioCalculation> = {}): AgioCalculation {
  return {
    valorOriginal: 300_000,
    valorPago: 50_000,
    saldoDevedor: 250_000,
    valorMercado: 400_000,
    custosTransferencia: null,
    taxaTransferencia: '2,5',
    margem: '10',
    valorPrestacao: null,
    diaVencimento: null,
    dataReferencia: null,
    ...overrides,
  }
}

describe('calculateAgioSummary', () => {
  it('uses the transfer rate and includes valuation in the suggested premium', () => {
    expect(calculateAgioSummary(calculation())).toMatchObject({
      custosTransferencia: 10_000,
      valorizacao: 100_000,
      base: 140_000,
      agioSugerido: 154_000,
      valorTotalTransacao: 404_000,
    })
  })

  it('uses the manually entered transfer cost when there is no rate', () => {
    const summary = calculateAgioSummary(
      calculation({ taxaTransferencia: '', custosTransferencia: 1_200, margem: '0' }),
    )

    expect(summary.custosTransferencia).toBe(1_200)
    expect(summary.agioSugerido).toBe(148_800)
  })

  it('never returns a negative calculation base', () => {
    const summary = calculateAgioSummary(
      calculation({ valorPago: 1_000, valorMercado: 300_000, custosTransferencia: 5_000, taxaTransferencia: '' }),
    )

    expect(summary.base).toBe(0)
    expect(summary.agioSugerido).toBe(0)
  })
})

describe('initializeAgioCalculation', () => {
  it('updates paid and outstanding values for elapsed installments', () => {
    const result = initializeAgioCalculation(
      calculation({
        valorPrestacao: 1_000,
        diaVencimento: 10,
        dataReferencia: '2026-01-15',
      }),
      '2026-03-15',
    )

    expect(result.form.valorPago).toBe(52_000)
    expect(result.form.saldoDevedor).toBe(248_000)
    expect(result.form.dataReferencia).toBe('2026-03-10')
    expect(result.overdueInstallments?.count).toBe(2)
  })

  it('uses the last valid day for months shorter than the due day', () => {
    const result = initializeAgioCalculation(
      calculation({
        valorPrestacao: 1_000,
        diaVencimento: 31,
        dataReferencia: '2026-01-30',
      }),
      '2026-03-01',
    )

    expect(result.overdueInstallments?.count).toBe(2)
    expect(result.form.dataReferencia).toBe('2026-02-28')
  })
})
