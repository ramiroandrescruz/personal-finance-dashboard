import { describe, expect, it } from 'vitest'
import type { HoldingMovement, HoldingRow } from '../types'
import { buildMovementsFromRows, rebuildRowsFromMovements } from './transactions'

describe('transactions utils', () => {
  it('reconstruye posiciones agregando entradas y salidas', () => {
    const movements: HoldingMovement[] = [
      {
        id: '1',
        date: '2026-03-01',
        kind: 'IN',
        cuenta: 'Broker',
        moneda: 'USD',
        monto: 1000,
        cantidad: 10,
        tipo: 'Investments',
        subactivo: 'SPY',
        tags: ['core'],
        note: '',
        createdAt: 1
      },
      {
        id: '2',
        date: '2026-03-02',
        kind: 'OUT',
        cuenta: 'Broker',
        moneda: 'USD',
        monto: 250,
        cantidad: 2,
        tipo: 'Investments',
        subactivo: 'SPY',
        tags: [],
        note: '',
        createdAt: 2
      }
    ]

    const rows = rebuildRowsFromMovements(movements)

    expect(rows).toHaveLength(1)
    expect(rows[0]?.monto).toBe(750)
    expect(rows[0]?.cantidad).toBe(8)
  })

  it('reconstruye transferencias como salida+entrada por cuenta', () => {
    const movements: HoldingMovement[] = [
      {
        id: '1',
        date: '2026-03-01',
        kind: 'TRANSFER_OUT',
        cuenta: 'Cuenta A',
        moneda: 'USD',
        monto: 500,
        cantidad: null,
        tipo: 'Cash',
        subactivo: 'USD',
        tags: [],
        note: '',
        createdAt: 1,
        linkedMovementId: '2'
      },
      {
        id: '2',
        date: '2026-03-01',
        kind: 'TRANSFER_IN',
        cuenta: 'Cuenta B',
        moneda: 'USD',
        monto: 500,
        cantidad: null,
        tipo: 'Cash',
        subactivo: 'USD',
        tags: [],
        note: '',
        createdAt: 1,
        linkedMovementId: '1'
      }
    ]

    const rows = rebuildRowsFromMovements(movements)

    expect(rows).toHaveLength(1)
    expect(rows[0]?.cuenta).toBe('Cuenta B')
    expect(rows[0]?.monto).toBe(500)
  })

  it('genera movimientos de apertura desde holdings legacy', () => {
    const rows: HoldingRow[] = [
      {
        id: 'h1',
        cuenta: 'Binance',
        moneda: 'USD',
        monto: 1200,
        cantidad: 0.02,
        tipo: 'Crypto',
        subactivo: 'BTC',
        tags: ['legacy']
      }
    ]

    const created = buildMovementsFromRows(rows, 123)

    expect(created).toHaveLength(1)
    expect(created[0]?.kind).toBe('OPENING')
    expect(created[0]?.monto).toBe(1200)
    expect(created[0]?.cantidad).toBe(0.02)
  })
})
