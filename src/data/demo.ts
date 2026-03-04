import type { HoldingRow, Settings } from '../types'

export const DEFAULT_SETTINGS: Settings = {
  arsUsdOficial: 1430,
  arsUsdFinanciero: 1600
}

export const DEMO_ROWS: HoldingRow[] = [
  { id: '1', cuenta: 'Galicia', moneda: 'ARS', monto: 0, cantidad: null, tipo: 'Cash', subactivo: 'ARS' },
  { id: '2', cuenta: 'MercadoPago', moneda: 'ARS', monto: 575344.63, cantidad: null, tipo: 'Cash', subactivo: 'ARS' },
  { id: '3', cuenta: 'Lemon ARS', moneda: 'ARS', monto: 0, cantidad: null, tipo: 'Cash', subactivo: 'ARS' },
  {
    id: '4',
    cuenta: 'Galicia Inversiones',
    moneda: 'ARS',
    monto: 3727750,
    cantidad: null,
    tipo: 'Investments',
    subactivo: 'SPY'
  },
  {
    id: '5',
    cuenta: 'Galicia Inversiones',
    moneda: 'ARS',
    monto: 2046080,
    cantidad: null,
    tipo: 'Investments',
    subactivo: 'QQQ'
  },
  {
    id: '6',
    cuenta: 'Galicia Inversiones',
    moneda: 'ARS',
    monto: 379440,
    cantidad: null,
    tipo: 'Investments',
    subactivo: 'XLE'
  },
  {
    id: '7',
    cuenta: 'Galicia Inversiones',
    moneda: 'ARS',
    monto: 291960,
    cantidad: null,
    tipo: 'Investments',
    subactivo: 'BRKB'
  },
  {
    id: '8',
    cuenta: 'Galicia Inversiones',
    moneda: 'ARS',
    monto: 167250,
    cantidad: null,
    tipo: 'Investments',
    subactivo: 'NVDA'
  },
  {
    id: '9',
    cuenta: 'Galicia Inversiones',
    moneda: 'ARS',
    monto: 144200,
    cantidad: null,
    tipo: 'Investments',
    subactivo: 'PLTR'
  },
  {
    id: '10',
    cuenta: 'Galicia Inversiones',
    moneda: 'ARS',
    monto: 99750,
    cantidad: null,
    tipo: 'Investments',
    subactivo: 'MSFT'
  },
  { id: '11', cuenta: 'Binance', moneda: 'USD', monto: 8666.66, cantidad: null, tipo: 'Crypto', subactivo: 'USDT' },
  { id: '12', cuenta: 'Binance', moneda: 'USD', monto: 3502.96, cantidad: null, tipo: 'Crypto', subactivo: 'USDC' },
  { id: '13', cuenta: 'Binance', moneda: 'USD', monto: 846.42, cantidad: null, tipo: 'Crypto', subactivo: 'BTC' }
]

export const cloneDemoRows = (): HoldingRow[] => DEMO_ROWS.map((row) => ({ ...row }))
