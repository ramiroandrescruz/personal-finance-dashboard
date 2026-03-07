import { describe, expect, it } from 'vitest'
import type { HoldingMovement, HoldingRow } from '../types'
import { buildMovementsFromRows, normalizeMovement, rebuildRowsFromMovements, validateAssetDebitAgainstRows, validateTransferAgainstRows } from './transactions'

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
        liquidity: 'LIQUID',
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
        liquidity: 'LIQUID',
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
        liquidity: 'LIQUID',
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
        liquidity: 'LIQUID',
        tags: [],
        note: '',
        createdAt: 1,
        linkedMovementId: '1'
      }
    ]

    const rows = rebuildRowsFromMovements(movements)

    expect(rows).toHaveLength(2)
    const cuentaA = rows.find(r => r.cuenta === 'Cuenta A')
    const cuentaB = rows.find(r => r.cuenta === 'Cuenta B')
    expect(cuentaA?.monto).toBe(0)
    expect(cuentaB?.monto).toBe(500)
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
        liquidity: 'LIQUID',
        tags: ['legacy']
      }
    ]

    const created = buildMovementsFromRows(rows, 123)

    expect(created).toHaveLength(1)
    expect(created[0]?.kind).toBe('OPENING')
    expect(created[0]?.monto).toBe(1200)
    expect(created[0]?.cantidad).toBe(0.02)
  })

  it('no conserva linkedMovementId undefined al normalizar', () => {
    const normalized = normalizeMovement({
      id: 'n1',
      date: '2026-03-01',
      kind: 'IN',
      cuenta: 'Broker',
      moneda: 'USD',
      monto: 10,
      cantidad: null,
      tipo: 'Cash',
      subactivo: 'USD',
      liquidity: 'LIQUID',
      tags: [],
      note: '',
      createdAt: 1,
      linkedMovementId: undefined
    })

    expect(Object.prototype.hasOwnProperty.call(normalized, 'linkedMovementId')).toBe(false)
  })

  it('valida transferencia contra saldo y asset de la cuenta destino', () => {
    const rows: HoldingRow[] = [
      {
        id: 'r1',
        cuenta: 'Cuenta A',
        moneda: 'USD',
        monto: 1000,
        cantidad: 1000,
        tipo: 'Cash',
        subactivo: 'USD',
        liquidity: 'LIQUID',
        tags: []
      },
      {
        id: 'r2',
        cuenta: 'Cuenta B',
        moneda: 'USD',
        monto: 500,
        cantidad: 500,
        tipo: 'Cash',
        subactivo: 'USD',
        liquidity: 'LIQUID',
        tags: []
      }
    ]

    expect(
      validateTransferAgainstRows(rows, {
        cuentaFrom: 'Cuenta A',
        cuentaTo: 'Cuenta B',
        moneda: 'USD',
        monto: 200,
        cantidad: 200,
        tipo: 'Cash',
        subactivo: 'USD',
        liquidity: 'LIQUID'
      })
    ).toBeNull()

    expect(
      validateTransferAgainstRows(rows, {
        cuentaFrom: 'Cuenta A',
        cuentaTo: 'Cuenta B',
        moneda: 'USD',
        monto: 2000,
        cantidad: null,
        tipo: 'Cash',
        subactivo: 'USD',
        liquidity: 'LIQUID'
      })
    ).toBe('Monto insuficiente en la cuenta origen para ese asset.')
  })

  it('rechaza transferencia hacia cuenta con asset incompatible', () => {
    const rows: HoldingRow[] = [
      {
        id: 'r1',
        cuenta: 'Wallet BTC',
        moneda: 'USD',
        monto: 1200,
        cantidad: 0.02,
        tipo: 'Crypto',
        subactivo: 'BTC',
        liquidity: 'LIQUID',
        tags: []
      },
      {
        id: 'r2',
        cuenta: 'Broker ETF',
        moneda: 'USD',
        monto: 600,
        cantidad: 2,
        tipo: 'Investments',
        subactivo: 'SPY',
        liquidity: 'LIQUID',
        tags: []
      }
    ]

    expect(
      validateTransferAgainstRows(rows, {
        cuentaFrom: 'Wallet BTC',
        cuentaTo: 'Broker ETF',
        moneda: 'USD',
        monto: 100,
        cantidad: 0.001,
        tipo: 'Crypto',
        subactivo: 'BTC',
        liquidity: 'LIQUID'
      })
    ).toBe('La cuenta destino no tiene ese asset. Registrá una conversión antes de transferir entre assets distintos.')
  })

  it('valida débito de asset para conversiones', () => {
    const rows: HoldingRow[] = [
      {
        id: 'r1',
        cuenta: 'Binance',
        moneda: 'USD',
        monto: 1000,
        cantidad: 1000,
        tipo: 'Cash',
        subactivo: 'USDT',
        liquidity: 'LIQUID',
        tags: []
      }
    ]

    expect(
      validateAssetDebitAgainstRows(rows, {
        cuenta: 'Binance',
        moneda: 'USD',
        monto: 1000,
        cantidad: 1000,
        tipo: 'Cash',
        subactivo: 'USDT',
        liquidity: 'LIQUID'
      })
    ).toBeNull()

    expect(
      validateAssetDebitAgainstRows(rows, {
        cuenta: 'Binance',
        moneda: 'USD',
        monto: 1,
        cantidad: null,
        tipo: 'Crypto',
        subactivo: 'USDT',
        liquidity: 'LIQUID'
      })
    ).toBe('La cuenta origen no tiene ese asset para mover.')
  })

  it('aplica revalorización positiva y negativa sobre el monto', () => {
    const movements: HoldingMovement[] = [
      {
        id: '1',
        date: '2026-03-01',
        kind: 'OPENING',
        cuenta: 'Inmuebles',
        moneda: 'USD',
        monto: 100000,
        cantidad: null,
        tipo: 'Properties',
        subactivo: 'DEPTO-CABA',
        liquidity: 'ILLIQUID',
        tags: [],
        note: '',
        createdAt: 1
      },
      {
        id: '2',
        date: '2026-03-02',
        kind: 'REVALUATION',
        cuenta: 'Inmuebles',
        moneda: 'USD',
        monto: 5000,
        cantidad: null,
        tipo: 'Properties',
        subactivo: 'DEPTO-CABA',
        liquidity: 'ILLIQUID',
        tags: [],
        note: '',
        createdAt: 2,
        valuationDate: '2026-03-02',
        valuationCurrency: 'USD',
        valuationSource: 'Tasación'
      },
      {
        id: '3',
        date: '2026-03-03',
        kind: 'REVALUATION',
        cuenta: 'Inmuebles',
        moneda: 'USD',
        monto: -2000,
        cantidad: null,
        tipo: 'Properties',
        subactivo: 'DEPTO-CABA',
        liquidity: 'ILLIQUID',
        tags: [],
        note: '',
        createdAt: 3,
        valuationDate: '2026-03-03',
        valuationCurrency: 'USD',
        valuationSource: 'Mercado'
      }
    ]

    const rows = rebuildRowsFromMovements(movements)
    expect(rows).toHaveLength(1)
    expect(rows[0]?.monto).toBe(103000)
    expect(rows[0]?.liquidity).toBe('ILLIQUID')
  })
})
