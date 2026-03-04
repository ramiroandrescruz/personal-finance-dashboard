import { cloneDemoRows, DEFAULT_SETTINGS } from '../data/demo'
import type { AllocationTargets, HoldingRow, PortfolioSnapshot, Settings } from '../types'
import { HOLDING_TYPES } from '../types'
import { DEFAULT_ALLOCATION_TARGETS, sanitizeTargets } from './allocationTargets'

const STORAGE_KEY = 'personal-finance-dashboard'
const SCHEMA_VERSION = 3

type LegacyHoldingRow = Omit<HoldingRow, 'cantidad'> & {
  cantidad?: number | null
}

interface PersistedDashboardV1 {
  schemaVersion: 1
  rows: LegacyHoldingRow[]
  settings: Settings
  updatedAt: number
}

interface PersistedDashboardV2 {
  schemaVersion: 2
  rows: LegacyHoldingRow[]
  settings: Settings
  targets: AllocationTargets
  updatedAt: number
}

interface PersistedDashboardV3 {
  schemaVersion: 3
  rows: HoldingRow[]
  settings: Settings
  targets: AllocationTargets
  snapshots: PortfolioSnapshot[]
  updatedAt: number
}

export interface PersistedDashboard {
  rows: HoldingRow[]
  settings: Settings
  targets: AllocationTargets
  snapshots: PortfolioSnapshot[]
  updatedAt: number | null
}

const isValidRow = (row: unknown): row is LegacyHoldingRow => {
  if (!row || typeof row !== 'object') {
    return false
  }

  const candidate = row as LegacyHoldingRow
  const quantityIsValid =
    candidate.cantidad === undefined ||
    candidate.cantidad === null ||
    (typeof candidate.cantidad === 'number' && Number.isFinite(candidate.cantidad))

  return (
    typeof candidate.id === 'string' &&
    typeof candidate.cuenta === 'string' &&
    typeof candidate.moneda === 'string' &&
    typeof candidate.monto === 'number' &&
    Number.isFinite(candidate.monto) &&
    typeof candidate.tipo === 'string' &&
    typeof candidate.subactivo === 'string' &&
    quantityIsValid
  )
}

const normalizeRow = (row: LegacyHoldingRow): HoldingRow => ({
  id: row.id,
  cuenta: row.cuenta,
  moneda: row.moneda,
  monto: row.monto,
  cantidad: typeof row.cantidad === 'number' && Number.isFinite(row.cantidad) ? row.cantidad : null,
  tipo: row.tipo,
  subactivo: row.subactivo
})

const isValidSettings = (settings: unknown): settings is Settings => {
  if (!settings || typeof settings !== 'object') {
    return false
  }

  const candidate = settings as Settings

  return (
    typeof candidate.arsUsdOficial === 'number' && Number.isFinite(candidate.arsUsdOficial) &&
    typeof candidate.arsUsdFinanciero === 'number' && Number.isFinite(candidate.arsUsdFinanciero)
  )
}

const isValidTargets = (targets: unknown): targets is AllocationTargets => {
  if (!targets || typeof targets !== 'object') {
    return false
  }

  const candidate = targets as AllocationTargets

  if (typeof candidate.alertThresholdPct !== 'number' || !Number.isFinite(candidate.alertThresholdPct)) {
    return false
  }

  if (!candidate.byType || typeof candidate.byType !== 'object') {
    return false
  }

  if (!candidate.bySubasset || typeof candidate.bySubasset !== 'object') {
    return false
  }

  const validTypeEntries = Object.entries(candidate.byType).every(([key, value]) => {
    return HOLDING_TYPES.includes(key as (typeof HOLDING_TYPES)[number]) && typeof value === 'number' && Number.isFinite(value)
  })

  const validSubassetEntries = Object.entries(candidate.bySubasset).every(([key, value]) => {
    return typeof key === 'string' && typeof value === 'number' && Number.isFinite(value)
  })

  return validTypeEntries && validSubassetEntries
}

const DATE_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/

const isValidSnapshot = (snapshot: unknown): snapshot is PortfolioSnapshot => {
  if (!snapshot || typeof snapshot !== 'object') {
    return false
  }

  const candidate = snapshot as PortfolioSnapshot

  return (
    typeof candidate.date === 'string' &&
    DATE_KEY_PATTERN.test(candidate.date) &&
    typeof candidate.totalUsdOficial === 'number' &&
    Number.isFinite(candidate.totalUsdOficial) &&
    typeof candidate.totalUsdFinanciero === 'number' &&
    Number.isFinite(candidate.totalUsdFinanciero) &&
    typeof candidate.arsUsdOficial === 'number' &&
    Number.isFinite(candidate.arsUsdOficial) &&
    typeof candidate.arsUsdFinanciero === 'number' &&
    Number.isFinite(candidate.arsUsdFinanciero) &&
    typeof candidate.capturedAt === 'number' &&
    Number.isFinite(candidate.capturedAt)
  )
}

const migrateFromV1 = (candidate: PersistedDashboardV1): PersistedDashboard | null => {
  if (!Array.isArray(candidate.rows) || !candidate.rows.every((row) => isValidRow(row)) || !isValidSettings(candidate.settings)) {
    return null
  }

  return {
    rows: candidate.rows.map(normalizeRow),
    settings: { ...candidate.settings },
    targets: { ...DEFAULT_ALLOCATION_TARGETS, byType: {}, bySubasset: {} },
    snapshots: [],
    updatedAt: typeof candidate.updatedAt === 'number' ? candidate.updatedAt : null
  }
}

const migrateFromV2 = (candidate: PersistedDashboardV2): PersistedDashboard | null => {
  if (
    !Array.isArray(candidate.rows) ||
    !candidate.rows.every((row) => isValidRow(row)) ||
    !isValidSettings(candidate.settings) ||
    !isValidTargets(candidate.targets)
  ) {
    return null
  }

  return {
    rows: candidate.rows.map(normalizeRow),
    settings: { ...candidate.settings },
    targets: sanitizeTargets(candidate.targets),
    snapshots: [],
    updatedAt: typeof candidate.updatedAt === 'number' ? candidate.updatedAt : null
  }
}

const migrateFromV3 = (candidate: PersistedDashboardV3): PersistedDashboard | null => {
  if (
    !Array.isArray(candidate.rows) ||
    !candidate.rows.every((row) => isValidRow(row)) ||
    !isValidSettings(candidate.settings) ||
    !isValidTargets(candidate.targets) ||
    !Array.isArray(candidate.snapshots) ||
    !candidate.snapshots.every((snapshot) => isValidSnapshot(snapshot))
  ) {
    return null
  }

  return {
    rows: candidate.rows.map(normalizeRow),
    settings: { ...candidate.settings },
    targets: sanitizeTargets(candidate.targets),
    snapshots: [...candidate.snapshots].sort((left, right) => left.date.localeCompare(right.date)),
    updatedAt: typeof candidate.updatedAt === 'number' ? candidate.updatedAt : null
  }
}

const migrate = (payload: unknown): PersistedDashboard | null => {
  if (!payload || typeof payload !== 'object') {
    return null
  }

  const candidate = payload as { schemaVersion?: number }

  if (candidate.schemaVersion === 1) {
    return migrateFromV1(payload as PersistedDashboardV1)
  }

  if (candidate.schemaVersion === 2) {
    return migrateFromV2(payload as PersistedDashboardV2)
  }

  if (candidate.schemaVersion === 3) {
    return migrateFromV3(payload as PersistedDashboardV3)
  }

  return null
}

export const parsePersistedDashboard = (payload: unknown): PersistedDashboard | null => {
  return migrate(payload)
}

export const serializePersistedDashboard = (data: PersistedDashboard): PersistedDashboardV3 => {
  return {
    schemaVersion: SCHEMA_VERSION,
    rows: data.rows,
    settings: data.settings,
    targets: sanitizeTargets(data.targets),
    snapshots: [...data.snapshots].sort((left, right) => left.date.localeCompare(right.date)),
    updatedAt: data.updatedAt ?? Date.now()
  }
}

const defaultPersistedDashboard = (): PersistedDashboard => ({
  rows: cloneDemoRows(),
  settings: { ...DEFAULT_SETTINGS },
  targets: { ...DEFAULT_ALLOCATION_TARGETS, byType: {}, bySubasset: {} },
  snapshots: [],
  updatedAt: null
})

export const loadDashboardData = (): PersistedDashboard => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)

    if (!raw) {
      return defaultPersistedDashboard()
    }

    const parsed = JSON.parse(raw) as unknown
    const migrated = parsePersistedDashboard(parsed)

    if (migrated) {
      return migrated
    }
  } catch (error) {
    console.warn('Error loading local data:', error)
  }

  return defaultPersistedDashboard()
}

export const saveDashboardData = (data: PersistedDashboard): void => {
  const payload = serializePersistedDashboard(data)

  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
}

export const clearDashboardData = (): void => {
  localStorage.removeItem(STORAGE_KEY)
}
