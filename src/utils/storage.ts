import { cloneDemoRows, DEFAULT_SETTINGS } from '../data/demo'
import type { HoldingRow, Settings } from '../types'

const STORAGE_KEY = 'personal-finance-dashboard'
const SCHEMA_VERSION = 1

interface PersistedDashboardV1 {
  schemaVersion: 1
  rows: HoldingRow[]
  settings: Settings
  updatedAt: number
}

export interface PersistedDashboard {
  rows: HoldingRow[]
  settings: Settings
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

const migrate = (payload: unknown): PersistedDashboard | null => {
  if (!payload || typeof payload !== 'object') {
    return null
  }

  const candidate = payload as PersistedDashboardV1

  if (candidate.schemaVersion !== SCHEMA_VERSION) {
    return null
  }

  if (!Array.isArray(candidate.rows) || !candidate.rows.every((row) => isValidRow(row)) || !isValidSettings(candidate.settings)) {
    return null
  }

  return {
    rows: candidate.rows.map((row) => ({ ...row })),
    settings: { ...candidate.settings },
    updatedAt: typeof candidate.updatedAt === 'number' ? candidate.updatedAt : null
  }
}

export const loadDashboardData = (): PersistedDashboard => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)

    if (!raw) {
      return {
        rows: cloneDemoRows(),
        settings: { ...DEFAULT_SETTINGS },
        updatedAt: null
      }
    }

    const parsed = JSON.parse(raw) as unknown
    const migrated = migrate(parsed)

    if (migrated) {
      return migrated
    }
  } catch (error) {
    console.warn('Error loading local data:', error)
  }

  return {
    rows: cloneDemoRows(),
    settings: { ...DEFAULT_SETTINGS },
    updatedAt: null
  }
}

export const saveDashboardData = (data: PersistedDashboard): void => {
  const payload: PersistedDashboardV1 = {
    schemaVersion: SCHEMA_VERSION,
    rows: data.rows,
    settings: data.settings,
    updatedAt: data.updatedAt ?? Date.now()
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
}

export const clearDashboardData = (): void => {
  localStorage.removeItem(STORAGE_KEY)
}
