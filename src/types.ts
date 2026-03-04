export const HOLDING_TYPES = ['Cash', 'Investments', 'Crypto', 'Other'] as const

export type HoldingType = (typeof HOLDING_TYPES)[number]

export type SupportedCurrency = 'ARS' | 'USD'

export interface HoldingRow {
  id: string
  cuenta: string
  moneda: string
  monto: number
  cantidad: number | null
  tags: string[]
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

export interface DashboardFilterState {
  searchTerm: string
  typeFilters: HoldingType[]
  currencyFilters: string[]
  subassetCategoryFilters: string[]
  subassetFilters: string[]
  tagFilters: string[]
}

export interface SavedDashboardView {
  id: string
  name: string
  filters: DashboardFilterState
  createdAt: number
  updatedAt: number
}

export interface PortfolioSnapshot {
  date: string
  totalUsdOficial: number
  totalUsdFinanciero: number
  arsUsdOficial: number
  arsUsdFinanciero: number
  capturedAt: number
}

export interface HoldingsState {
  rows: HoldingRow[]
  settings: Settings
  targets: AllocationTargets
  snapshots: PortfolioSnapshot[]
  savedViews: SavedDashboardView[]
  lastEditedAt: number | null
}

export interface ConversionResult {
  usdOficial: number
  usdFinanciero: number
  warning?: string
}
