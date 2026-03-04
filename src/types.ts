export const HOLDING_TYPES = ['Cash', 'Investments', 'Crypto', 'Other'] as const

export type HoldingType = (typeof HOLDING_TYPES)[number]

export type SupportedCurrency = 'ARS' | 'USD'

export interface HoldingRow {
  id: string
  cuenta: string
  moneda: string
  monto: number
  tipo: HoldingType
  subactivo: string
}

export interface Settings {
  arsUsdOficial: number
  arsUsdFinanciero: number
}

export interface AllocationTargets {
  byType: Partial<Record<HoldingType, number>>
  bySubasset: Record<string, number>
  alertThresholdPct: number
}

export interface HoldingsState {
  rows: HoldingRow[]
  settings: Settings
  targets: AllocationTargets
  lastEditedAt: number | null
}

export interface ConversionResult {
  usdOficial: number
  usdFinanciero: number
  warning?: string
}
