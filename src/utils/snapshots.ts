import type { PortfolioSnapshot } from '../types'

export const SNAPSHOT_TIMEZONE = 'America/Argentina/Buenos_Aires'

const DATE_KEY_FORMATTER = new Intl.DateTimeFormat('en-US', {
  timeZone: SNAPSHOT_TIMEZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit'
})

const toDateKey = (date: Date): string => {
  const parts = DATE_KEY_FORMATTER.formatToParts(date)
  const year = parts.find((part) => part.type === 'year')?.value
  const month = parts.find((part) => part.type === 'month')?.value
  const day = parts.find((part) => part.type === 'day')?.value

  if (!year || !month || !day) {
    return '1970-01-01'
  }

  return `${year}-${month}-${day}`
}

export const getSnapshotDateKey = (timestamp: number = Date.now()): string => {
  return toDateKey(new Date(timestamp))
}

const parseDateKeyToUtc = (dateKey: string): Date => {
  return new Date(`${dateKey}T00:00:00.000Z`)
}

const addDays = (dateKey: string, days: number): string => {
  const base = parseDateKeyToUtc(dateKey)
  base.setUTCDate(base.getUTCDate() + days)

  const year = base.getUTCFullYear()
  const month = String(base.getUTCMonth() + 1).padStart(2, '0')
  const day = String(base.getUTCDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const sortByDate = (snapshots: PortfolioSnapshot[]): PortfolioSnapshot[] => {
  return [...snapshots].sort((left, right) => left.date.localeCompare(right.date))
}

export const upsertSnapshot = (snapshots: PortfolioSnapshot[], snapshot: PortfolioSnapshot): PortfolioSnapshot[] => {
  const next = snapshots.filter((item) => item.date !== snapshot.date)
  next.push(snapshot)
  return sortByDate(next)
}

const findSnapshotAtOrBefore = (snapshots: PortfolioSnapshot[], dateKey: string): PortfolioSnapshot | null => {
  for (let index = snapshots.length - 1; index >= 0; index -= 1) {
    const current = snapshots[index]

    if (current && current.date <= dateKey) {
      return current
    }
  }

  return null
}

interface SnapshotVariation {
  delta: number
  deltaPct: number | null
}

export interface SnapshotPeriodVariation {
  financiero: SnapshotVariation
  oficial: SnapshotVariation
  baseDate: string
}

export interface SnapshotVariations {
  daily: SnapshotPeriodVariation | null
  weekly: SnapshotPeriodVariation | null
  monthly: SnapshotPeriodVariation | null
}

const buildVariation = (current: number, base: number): SnapshotVariation => {
  const delta = current - base
  const deltaPct = base === 0 ? null : (delta / base) * 100

  return {
    delta,
    deltaPct
  }
}

const calculatePeriodVariation = (sortedSnapshots: PortfolioSnapshot[], current: PortfolioSnapshot, daysBack: number) => {
  const targetDate = addDays(current.date, -daysBack)
  const base = findSnapshotAtOrBefore(sortedSnapshots, targetDate)

  if (!base || base.date === current.date) {
    return null
  }

  return {
    financiero: buildVariation(current.totalUsdFinanciero, base.totalUsdFinanciero),
    oficial: buildVariation(current.totalUsdOficial, base.totalUsdOficial),
    baseDate: base.date
  }
}

export const buildSnapshotVariations = (snapshots: PortfolioSnapshot[]): SnapshotVariations => {
  if (snapshots.length === 0) {
    return {
      daily: null,
      weekly: null,
      monthly: null
    }
  }

  const sorted = sortByDate(snapshots)
  const current = sorted[sorted.length - 1]

  if (!current) {
    return {
      daily: null,
      weekly: null,
      monthly: null
    }
  }

  return {
    daily: calculatePeriodVariation(sorted, current, 1),
    weekly: calculatePeriodVariation(sorted, current, 7),
    monthly: calculatePeriodVariation(sorted, current, 30)
  }
}
