import { describe, expect, it } from 'vitest'
import { buildSnapshotVariations, rebuildSnapshotsFromMovements, upsertSnapshot, type SnapshotVariations } from './snapshots'
import type { HoldingMovement, PortfolioSnapshot } from '../types'

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

describe('rebuildSnapshotsFromMovements', () => {
  it('recalcula snapshots históricos usando movimientos hasta cada fecha', () => {
    const snapshots = [makeSnapshot('2026-01-01', 0, 0), makeSnapshot('2026-02-01', 0, 0), makeSnapshot('2026-03-01', 0, 0)]
    const movements: HoldingMovement[] = [
      {
        id: 'm1',
        date: '2025-12-15',
        kind: 'OPENING',
        cuenta: 'Inmuebles',
        moneda: 'USD',
        monto: 100000,
        cantidad: null,
        tipo: 'Properties',
        subactivo: 'DEPTO',
        liquidity: 'ILLIQUID',
        tags: [],
        note: '',
        createdAt: 1
      },
      {
        id: 'm2',
        date: '2026-02-10',
        kind: 'REVALUATION',
        cuenta: 'Inmuebles',
        moneda: 'USD',
        monto: 5000,
        cantidad: null,
        tipo: 'Properties',
        subactivo: 'DEPTO',
        liquidity: 'ILLIQUID',
        tags: [],
        note: '',
        createdAt: 2,
        valuationDate: '2026-02-10',
        valuationCurrency: 'USD',
        valuationSource: 'Tasación'
      }
    ]

    const rebuilt = rebuildSnapshotsFromMovements(snapshots, movements)

    expect(rebuilt[0]?.totalUsdFinanciero).toBe(100000)
    expect(rebuilt[1]?.totalUsdFinanciero).toBe(100000)
    expect(rebuilt[2]?.totalUsdFinanciero).toBe(105000)
  })
})
