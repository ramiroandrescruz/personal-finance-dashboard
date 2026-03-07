export const HOLDING_TYPES = ['Cash', 'Investments', 'Crypto', 'Properties', 'Other'] as const

export type HoldingType = (typeof HOLDING_TYPES)[number]

export type SupportedCurrency = 'ARS' | 'USD'

export const MOVEMENT_KINDS = ['OPENING', 'IN', 'OUT', 'TRANSFER_IN', 'TRANSFER_OUT', 'REVALUATION'] as const

export type MovementKind = (typeof MOVEMENT_KINDS)[number]

export const LIQUIDITY_KINDS = ['LIQUID', 'ILLIQUID'] as const

export type LiquidityKind = (typeof LIQUIDITY_KINDS)[number]

export interface HoldingRow {
  id: string
  cuenta: string
  moneda: string
  monto: number
  cantidad: number | null
  tags: string[]
  tipo: HoldingType
  subactivo: string
  liquidity: LiquidityKind
}

export interface HoldingMovement {
  id: string
  date: string
  kind: MovementKind
  cuenta: string
  moneda: string
  monto: number
  cantidad: number | null
  tipo: HoldingType
  subactivo: string
  liquidity: LiquidityKind
  tags: string[]
  note: string
  createdAt: number
  linkedMovementId?: string
  valuationDate?: string
  valuationSource?: string
  valuationCurrency?: string
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
  liquidityFilters: LiquidityKind[]
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
  transactions: HoldingMovement[]
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
