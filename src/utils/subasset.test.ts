import { describe, expect, it } from 'vitest'
import type { HoldingRow } from '../types'
import { getSubassetCategory } from './subasset'

const baseRow: HoldingRow = {
  id: '1',
  cuenta: 'Test',
  moneda: 'USD',
  monto: 100,
  tipo: 'Cash',
  subactivo: 'USD'
}

describe('getSubassetCategory', () => {
  it('detecta fiat y stablecoins', () => {
    expect(getSubassetCategory({ ...baseRow, subactivo: 'ARS' })).toBe('Fiat')
    expect(getSubassetCategory({ ...baseRow, tipo: 'Crypto', subactivo: 'USDT' })).toBe('Stablecoin')
  })

  it('detecta crypto y etf', () => {
    expect(getSubassetCategory({ ...baseRow, tipo: 'Crypto', subactivo: 'BTC' })).toBe('Crypto')
    expect(getSubassetCategory({ ...baseRow, tipo: 'Investments', subactivo: 'SPY' })).toBe('ETF')
  })

  it('usa Stock para investments no ETF', () => {
    expect(getSubassetCategory({ ...baseRow, tipo: 'Investments', subactivo: 'NVDA' })).toBe('Stock')
  })
})
