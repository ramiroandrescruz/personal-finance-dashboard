import { describe, expect, it } from 'vitest'
import type { HoldingRow } from '../types'
import { applyDashboardFilters, DEFAULT_DASHBOARD_FILTERS } from './filters'

const rows: HoldingRow[] = [
  { id: '1', cuenta: 'Binance', moneda: 'USD', monto: 1000, cantidad: null, tipo: 'Crypto', subactivo: 'BTC' },
  { id: '2', cuenta: 'Broker', moneda: 'ARS', monto: 2000, cantidad: null, tipo: 'Investments', subactivo: 'SPY' },
  { id: '3', cuenta: 'Wallet', moneda: 'USD', monto: 800, cantidad: null, tipo: 'Crypto', subactivo: 'USDT' }
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
})
