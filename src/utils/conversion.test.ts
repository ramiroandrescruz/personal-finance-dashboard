import { describe, expect, it } from 'vitest'
import { convertRowToUsd } from './conversion'
import type { HoldingRow, Settings } from '../types'

const settings: Settings = {
  arsUsdOficial: 1400,
  arsUsdFinanciero: 1600
}

const baseRow: HoldingRow = {
  id: '1',
  cuenta: 'Test',
  moneda: 'ARS',
  monto: 1600,
  tipo: 'Cash',
  subactivo: 'ARS'
}

describe('convertRowToUsd', () => {
  it('convierte ARS a USD oficial y financiero', () => {
    const result = convertRowToUsd(baseRow, settings)

    expect(result.usdOficial).toBeCloseTo(1.142857, 4)
    expect(result.usdFinanciero).toBeCloseTo(1, 4)
  })

  it('deja USD sin conversion', () => {
    const result = convertRowToUsd({ ...baseRow, moneda: 'USD', monto: 2300.55 }, settings)

    expect(result.usdOficial).toBeCloseTo(2300.55, 4)
    expect(result.usdFinanciero).toBeCloseTo(2300.55, 4)
    expect(result.warning).toBeUndefined()
  })

  it('marca monedas no soportadas', () => {
    const result = convertRowToUsd({ ...baseRow, moneda: 'EUR', monto: 999 }, settings)

    expect(result.usdOficial).toBe(0)
    expect(result.usdFinanciero).toBe(0)
    expect(result.warning).toBe('Moneda no soportada')
  })
})
