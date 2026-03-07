import type { HoldingRow } from '../types'

export const SUBASSET_CATEGORIES = ['Fiat', 'Stablecoin', 'Crypto', 'ETF', 'Stock', 'Property', 'Other'] as const

export type SubassetCategory = (typeof SUBASSET_CATEGORIES)[number]

const STABLECOINS = new Set(['USDT', 'USDC', 'DAI', 'FDUSD', 'TUSD'])
const ETFS = new Set(['SPY', 'QQQ', 'XLE', 'DIA', 'VTI', 'VOO', 'IVV'])

export const getSubassetCategory = (row: HoldingRow): SubassetCategory => {
  const subasset = row.subactivo.trim().toUpperCase()

  if (subasset === 'ARS' || subasset === 'USD') {
    return 'Fiat'
  }

  if (STABLECOINS.has(subasset)) {
    return 'Stablecoin'
  }

  if (row.tipo === 'Crypto') {
    return 'Crypto'
  }

  if (ETFS.has(subasset)) {
    return 'ETF'
  }

  if (row.tipo === 'Investments') {
    return 'Stock'
  }

  if (row.tipo === 'Properties') {
    return 'Property'
  }

  return 'Other'
}
