import { describe, expect, it } from 'vitest'
import type { HoldingRow } from '../types'
import { applyDashboardFilters, DEFAULT_DASHBOARD_FILTERS } from './filters'

const rows: HoldingRow[] = [
  {
    id: '1',
    cuenta: 'Binance',
    moneda: 'USD',
    monto: 1000,
    cantidad: null,
    tags: ['largo plazo'],
    tipo: 'Crypto',
    subactivo: 'BTC',
    liquidity: 'LIQUID'
  },
  {
    id: '2',
    cuenta: 'Broker',
    moneda: 'ARS',
    monto: 2000,
    cantidad: null,
    tags: ['cedears'],
    tipo: 'Investments',
    subactivo: 'SPY',
    liquidity: 'LIQUID'
  },
  {
    id: '3',
    cuenta: 'Wallet',
    moneda: 'USD',
    monto: 800,
    cantidad: null,
    tags: ['liquidez'],
    tipo: 'Crypto',
    subactivo: 'USDT',
    liquidity: 'LIQUID'
  },
  {
    id: '4',
    cuenta: 'Real Estate',
    moneda: 'USD',
    monto: 50000,
    cantidad: null,
    tags: ['largo plazo'],
    tipo: 'Properties',
    subactivo: 'Departamento',
    liquidity: 'ILLIQUID'
  }
]

describe('applyDashboardFilters', () => {
  it('filtra por multiples tipos y monedas', () => {
    const filtered = applyDashboardFilters(rows, {
      ...DEFAULT_DASHBOARD_FILTERS,
      typeFilters: ['Crypto', 'Investments'],
      currencyFilters: ['USD']
    })

    expect(filtered).toHaveLength(2)
    expect(filtered.map((row) => row.id)).toEqual(['1', '3'])
  })

  it('filtra por multiples subactivos', () => {
    const filtered = applyDashboardFilters(rows, {
      ...DEFAULT_DASHBOARD_FILTERS,
      subassetFilters: ['BTC', 'SPY']
    })

    expect(filtered).toHaveLength(2)
    expect(filtered.map((row) => row.subactivo)).toEqual(['BTC', 'SPY'])
  })

  it('filtra por tags', () => {
    const filtered = applyDashboardFilters(rows, {
      ...DEFAULT_DASHBOARD_FILTERS,
      tagFilters: ['LIQUIDEZ']
    })

    expect(filtered).toHaveLength(1)
    expect(filtered[0]?.id).toBe('3')
  })

  it('filtra por liquidez', () => {
    const filtered = applyDashboardFilters(rows, {
      ...DEFAULT_DASHBOARD_FILTERS,
      liquidityFilters: ['ILLIQUID']
    })

    expect(filtered).toHaveLength(1)
    expect(filtered[0]?.id).toBe('4')
  })
})
