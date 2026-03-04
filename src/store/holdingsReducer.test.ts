import { describe, expect, it } from 'vitest'
import { holdingsReducer } from './holdingsReducer'
import type { HoldingsState } from '../types'

const initialState: HoldingsState = {
  rows: [
    {
      id: '1',
      cuenta: 'Cuenta Inicial',
      moneda: 'USD',
      monto: 10,
      tipo: 'Cash',
      subactivo: 'USD'
    }
  ],
  settings: {
    arsUsdOficial: 1400,
    arsUsdFinanciero: 1600
  },
  targets: {
    byType: {},
    bySubasset: {},
    alertThresholdPct: 5
  },
  lastEditedAt: null
}

describe('holdingsReducer', () => {
  it('agrega filas', () => {
    const state = holdingsReducer(initialState, {
      type: 'ADD_ROW',
      payload: {
        id: '2',
        cuenta: 'Nueva',
        moneda: 'ARS',
        monto: 1200,
        tipo: 'Cash',
        subactivo: 'ARS'
      }
    })

    expect(state.rows).toHaveLength(2)
    expect(state.rows[1].cuenta).toBe('Nueva')
    expect(state.lastEditedAt).not.toBeNull()
  })

  it('edita filas existentes', () => {
    const state = holdingsReducer(initialState, {
      type: 'UPDATE_ROW',
      payload: {
        id: '1',
        patch: {
          monto: 25,
          subactivo: 'USDT'
        }
      }
    })

    expect(state.rows[0].monto).toBe(25)
    expect(state.rows[0].subactivo).toBe('USDT')
  })

  it('elimina filas', () => {
    const state = holdingsReducer(initialState, {
      type: 'DELETE_ROW',
      payload: { id: '1' }
    })

    expect(state.rows).toHaveLength(0)
  })

  it('actualiza objetivos de asignacion', () => {
    const state = holdingsReducer(initialState, {
      type: 'SET_TARGETS',
      payload: {
        byType: { Crypto: 30 },
        bySubasset: { BTC: 15 },
        alertThresholdPct: 4
      }
    })

    expect(state.targets.byType.Crypto).toBe(30)
    expect(state.targets.bySubasset.BTC).toBe(15)
    expect(state.targets.alertThresholdPct).toBe(4)
  })
})
