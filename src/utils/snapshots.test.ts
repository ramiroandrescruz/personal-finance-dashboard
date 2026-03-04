import { describe, expect, it } from 'vitest'
import { buildSnapshotVariations, upsertSnapshot, type SnapshotVariations } from './snapshots'
import type { PortfolioSnapshot } from '../types'

const makeSnapshot = (date: string, financiero: number, oficial: number): PortfolioSnapshot => ({
  date,
  totalUsdFinanciero: financiero,
  totalUsdOficial: oficial,
  arsUsdOficial: 1400,
  arsUsdFinanciero: 1600,
  capturedAt: Date.now()
})

describe('upsertSnapshot', () => {
  it('reemplaza el snapshot de la misma fecha', () => {
    const initial = [makeSnapshot('2026-03-01', 100, 110), makeSnapshot('2026-03-02', 120, 130)]
    const updated = upsertSnapshot(initial, makeSnapshot('2026-03-02', 150, 160))

    expect(updated).toHaveLength(2)
    expect(updated[1]?.totalUsdFinanciero).toBe(150)
  })
})

describe('buildSnapshotVariations', () => {
  it('calcula variaciones diarias, semanales y mensuales usando el snapshot mas cercano hacia atras', () => {
    const rows = [
      makeSnapshot('2026-02-01', 80, 90),
      makeSnapshot('2026-02-20', 100, 110),
      makeSnapshot('2026-02-28', 120, 130),
      makeSnapshot('2026-03-03', 150, 170)
    ]

    const variations = buildSnapshotVariations(rows)

    expect(variations.daily?.baseDate).toBe('2026-02-28')
    expect(variations.daily?.financiero.delta).toBe(30)
    expect(variations.weekly?.baseDate).toBe('2026-02-20')
    expect(variations.monthly?.baseDate).toBe('2026-02-01')
  })

  it('devuelve nulos cuando no hay historial suficiente', () => {
    const variations: SnapshotVariations = buildSnapshotVariations([makeSnapshot('2026-03-04', 200, 220)])

    expect(variations.daily).toBeNull()
    expect(variations.weekly).toBeNull()
    expect(variations.monthly).toBeNull()
  })
})
