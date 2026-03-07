import { describe, expect, it } from 'vitest'
import { holdingsReducer } from './holdingsReducer'
import type { HoldingsState } from '../types'

const initialState: HoldingsState = {
  transactions: [],
  rows: [
    {
      id: '1',
      cuenta: 'Cuenta Inicial',
      moneda: 'USD',
      monto: 10,
      cantidad: null,
      tags: [],
      tipo: 'Cash',
      subactivo: 'USD',
      liquidity: 'LIQUID'
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
  snapshots: [],
  savedViews: [],
  lastEditedAt: null
}

describe('holdingsReducer', () => {
  it('hidrata estado desde persistencia externa', () => {
    const state = holdingsReducer(initialState, {
      type: 'HYDRATE',
      payload: {
        rows: [
          {
            id: 'remote-1',
            cuenta: 'Cuenta remota',
            moneda: 'USD',
            monto: 200,
            cantidad: 2,
            tags: ['core'],
            tipo: 'Investments',
            subactivo: 'SPY',
            liquidity: 'LIQUID'
          }
        ],
        transactions: [
          {
            id: 'tx-1',
            date: '2026-03-04',
            kind: 'OPENING',
            cuenta: 'Cuenta remota',
            moneda: 'USD',
            monto: 200,
            cantidad: 2,
            tipo: 'Investments',
            subactivo: 'SPY',
            liquidity: 'LIQUID',
            tags: ['core'],
            note: 'migracion',
            createdAt: 1
          }
        ],
        settings: {
          arsUsdOficial: 1500,
          arsUsdFinanciero: 1700
        },
        targets: {
          byType: { Investments: 60 },
          bySubasset: { SPY: 30 },
          alertThresholdPct: 3
        },
        snapshots: [],
        savedViews: []
      }
    })

    expect(state.rows).toHaveLength(1)
    expect(state.rows[0]?.cuenta).toBe('Cuenta remota')
    expect(state.rows[0]?.subactivo).toBe('SPY')
    expect(state.transactions).toHaveLength(1)
    expect(state.settings.arsUsdFinanciero).toBe(1700)
    expect(state.targets.byType.Investments).toBe(60)
    expect(state.lastEditedAt).toBeNull()
  })

  it('agrega filas', () => {
    const state = holdingsReducer(initialState, {
      type: 'ADD_ROW',
      payload: {
        id: '2',
        cuenta: 'Nueva',
        moneda: 'ARS',
        monto: 1200,
        cantidad: null,
        tags: [],
        tipo: 'Cash',
        subactivo: 'ARS',
        liquidity: 'LIQUID'
      }
    })

    expect(state.rows).toHaveLength(2)
    expect(state.rows[1].cuenta).toBe('Nueva')
    expect(state.lastEditedAt).not.toBeNull()
  })

  it('agrega movimientos y reconstruye filas', () => {
    const state = holdingsReducer(initialState, {
      type: 'ADD_MOVEMENT',
      payload: {
        id: 'tx-2',
        date: '2026-03-05',
        kind: 'IN',
        cuenta: 'Binance',
        moneda: 'USD',
        monto: 1000,
        cantidad: 0.05,
        tipo: 'Crypto',
        subactivo: 'BTC',
        liquidity: 'LIQUID',
        tags: ['core'],
        note: '',
        createdAt: 2
      }
    })

    expect(state.transactions).toHaveLength(1)
    expect(state.rows).toHaveLength(1)
    expect(state.rows[0]?.monto).toBe(1000)
    expect(state.rows[0]?.cantidad).toBe(0.05)
  })

  it('actualiza movimiento y refleja cambios en liquidez', () => {
    const withMovement = holdingsReducer(initialState, {
      type: 'ADD_MOVEMENT',
      payload: {
        id: 'tx-liq',
        date: '2026-03-05',
        kind: 'IN',
        cuenta: 'Inmuebles',
        moneda: 'USD',
        monto: 50000,
        cantidad: null,
        tipo: 'Properties',
        subactivo: 'CASA',
        liquidity: 'ILLIQUID',
        tags: [],
        note: '',
        createdAt: 2
      }
    })

    const updated = holdingsReducer(withMovement, {
      type: 'UPDATE_MOVEMENT',
      payload: {
        id: 'tx-liq',
        patch: {
          liquidity: 'LIQUID'
        }
      }
    })

    expect(updated.transactions[0]?.liquidity).toBe('LIQUID')
    expect(updated.rows[0]?.liquidity).toBe('LIQUID')
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

  it('agrega o actualiza snapshot diario', () => {
    const firstState = holdingsReducer(initialState, {
      type: 'UPSERT_SNAPSHOT',
      payload: {
        date: '2026-03-04',
        totalUsdOficial: 100,
        totalUsdFinanciero: 90,
        arsUsdOficial: 1300,
        arsUsdFinanciero: 1500,
        capturedAt: 1
      }
    })

    const secondState = holdingsReducer(firstState, {
      type: 'UPSERT_SNAPSHOT',
      payload: {
        date: '2026-03-04',
        totalUsdOficial: 120,
        totalUsdFinanciero: 110,
        arsUsdOficial: 1400,
        arsUsdFinanciero: 1600,
        capturedAt: 2
      }
    })

    expect(secondState.snapshots).toHaveLength(1)
    expect(secondState.snapshots[0]?.totalUsdFinanciero).toBe(110)
    expect(secondState.snapshots[0]?.capturedAt).toBe(2)
  })
})
