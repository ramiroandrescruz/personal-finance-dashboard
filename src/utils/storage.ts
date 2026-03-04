import { cloneDemoRows, DEFAULT_SETTINGS } from '../data/demo'
import type { AllocationTargets, HoldingRow, Settings } from '../types'
import { HOLDING_TYPES } from '../types'
import { DEFAULT_ALLOCATION_TARGETS, sanitizeTargets } from './allocationTargets'

const STORAGE_KEY = 'personal-finance-dashboard'
const SCHEMA_VERSION = 2

interface PersistedDashboardV1 {
  schemaVersion: 1
  rows: HoldingRow[]
  settings: Settings
  updatedAt: number
}

interface PersistedDashboardV2 {
  schemaVersion: 2
  rows: HoldingRow[]
  settings: Settings
  targets: AllocationTargets
  updatedAt: number
}

export interface PersistedDashboard {
  rows: HoldingRow[]
  settings: Settings
  targets: AllocationTargets
  updatedAt: number | null
}

const isValidRow = (row: unknown): row is HoldingRow => {
  if (!row || typeof row !== 'object') {
    return false
  }

  const candidate = row as HoldingRow

  return (
    typeof candidate.id === 'string' &&
    typeof candidate.cuenta === 'string' &&
    typeof candidate.moneda === 'string' &&
    typeof candidate.monto === 'number' &&
    typeof candidate.tipo === 'string' &&
    typeof candidate.subactivo === 'string'
  )
}

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

const migrateFromV1 = (candidate: PersistedDashboardV1): PersistedDashboard | null => {
  if (!Array.isArray(candidate.rows) || !candidate.rows.every((row) => isValidRow(row)) || !isValidSettings(candidate.settings)) {
    return null
  }

  return {
    rows: candidate.rows.map((row) => ({ ...row })),
    settings: { ...candidate.settings },
    targets: { ...DEFAULT_ALLOCATION_TARGETS, byType: {}, bySubasset: {} },
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
    rows: candidate.rows.map((row) => ({ ...row })),
    settings: { ...candidate.settings },
    targets: sanitizeTargets(candidate.targets),
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

  return null
}

export const parsePersistedDashboard = (payload: unknown): PersistedDashboard | null => {
  return migrate(payload)
}

export const serializePersistedDashboard = (data: PersistedDashboard): PersistedDashboardV2 => {
  return {
    schemaVersion: SCHEMA_VERSION,
    rows: data.rows,
    settings: data.settings,
    targets: sanitizeTargets(data.targets),
    updatedAt: data.updatedAt ?? Date.now()
  }
}

const defaultPersistedDashboard = (): PersistedDashboard => ({
  rows: cloneDemoRows(),
  settings: { ...DEFAULT_SETTINGS },
  targets: { ...DEFAULT_ALLOCATION_TARGETS, byType: {}, bySubasset: {} },
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
