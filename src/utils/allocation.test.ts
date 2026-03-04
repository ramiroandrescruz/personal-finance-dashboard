import { describe, expect, it } from 'vitest'
import { buildDeviationRows, summarizeAlerts } from './allocation'

describe('buildDeviationRows', () => {
  it('calcula desvio y alertas segun umbral', () => {
    const rows = buildDeviationRows(
      [
        { name: 'Crypto', value: 70 },
        { name: 'Cash', value: 30 }
      ],
      { Crypto: 50, Cash: 50 },
      10
    )

    const crypto = rows.find((row) => row.name === 'Crypto')
    const cash = rows.find((row) => row.name === 'Cash')

    expect(crypto?.currentPct).toBe(70)
    expect(crypto?.deviationPct).toBe(20)
    expect(crypto?.isAlert).toBe(true)

    expect(cash?.currentPct).toBe(30)
    expect(cash?.deviationPct).toBe(-20)
    expect(cash?.isAlert).toBe(true)
  })

  it('incluye keys definidas en target aunque no tengan valor actual', () => {
    const rows = buildDeviationRows([{ name: 'BTC', value: 100 }], { ETH: 10 }, 5)

    expect(rows.some((row) => row.name === 'ETH')).toBe(true)
    expect(rows.find((row) => row.name === 'ETH')?.currentPct).toBe(0)
  })
})

describe('summarizeAlerts', () => {
  it('resume cantidad total y alertas', () => {
    const summary = summarizeAlerts([
      { name: 'A', usdValue: 1, currentPct: 10, targetPct: 5, deviationPct: 5, isAlert: true },
      { name: 'B', usdValue: 1, currentPct: 10, targetPct: 9, deviationPct: 1, isAlert: false }
    ])

    expect(summary.total).toBe(2)
    expect(summary.alerts).toBe(1)
  })
})
