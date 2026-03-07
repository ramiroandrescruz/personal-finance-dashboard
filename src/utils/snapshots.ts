import type { HoldingMovement, PortfolioSnapshot, Settings } from '../types'
import { convertRowToUsd } from './conversion'
import { rebuildRowsFromMovements } from './transactions'

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

const summarizeUsdTotalsAtDate = (movements: HoldingMovement[], settings: Settings, dateKey: string) => {
  const rows = rebuildRowsFromMovements(movements.filter((movement) => movement.date <= dateKey))

  return rows.reduce(
    (accumulator, row) => {
      const conversion = convertRowToUsd(row, settings)
      accumulator.usdOficial += conversion.usdOficial
      accumulator.usdFinanciero += conversion.usdFinanciero
      return accumulator
    },
    { usdOficial: 0, usdFinanciero: 0 }
  )
}

const findLatestMovementDateAtOrBefore = (movements: HoldingMovement[], dateKey: string): string | null => {
  const eligible = movements.filter((movement) => movement.date <= dateKey).sort((left, right) => right.date.localeCompare(left.date))
  return eligible[0]?.date ?? null
}

const calculateMovementPeriodVariation = (
  movements: HoldingMovement[],
  settings: Settings,
  referenceDate: string,
  daysBack: number
): SnapshotPeriodVariation | null => {
  const targetDate = addDays(referenceDate, -daysBack)
  const baseDate = findLatestMovementDateAtOrBefore(movements, targetDate)

  if (!baseDate) {
    return null
  }

  const currentTotals = summarizeUsdTotalsAtDate(movements, settings, referenceDate)
  const baseTotals = summarizeUsdTotalsAtDate(movements, settings, baseDate)

  return {
    financiero: buildVariation(currentTotals.usdFinanciero, baseTotals.usdFinanciero),
    oficial: buildVariation(currentTotals.usdOficial, baseTotals.usdOficial),
    baseDate
  }
}

export const buildMovementDateVariations = (
  movements: HoldingMovement[],
  settings: Settings,
  referenceDate: string = getSnapshotDateKey()
): SnapshotVariations => {
  const normalizedMovements = [...movements].sort((left, right) =>
    left.date === right.date ? left.createdAt - right.createdAt : left.date.localeCompare(right.date)
  )
  const hasCurrentHistory = normalizedMovements.some((movement) => movement.date <= referenceDate)

  if (!hasCurrentHistory) {
    return {
      daily: null,
      weekly: null,
      monthly: null
    }
  }

  return {
    daily: calculateMovementPeriodVariation(normalizedMovements, settings, referenceDate, 1),
    weekly: calculateMovementPeriodVariation(normalizedMovements, settings, referenceDate, 7),
    monthly: calculateMovementPeriodVariation(normalizedMovements, settings, referenceDate, 30)
  }
}

export const rebuildSnapshotsFromMovements = (
  snapshots: PortfolioSnapshot[],
  movements: HoldingMovement[]
): PortfolioSnapshot[] => {
  if (snapshots.length === 0) {
    return []
  }

  const sortedSnapshots = sortByDate(snapshots)

  return sortedSnapshots.map((snapshot) => {
    const rowsAtSnapshotDate = rebuildRowsFromMovements(movements.filter((movement) => movement.date <= snapshot.date))

    const totals = rowsAtSnapshotDate.reduce(
      (accumulator, row) => {
        const conversion = convertRowToUsd(row, {
          arsUsdOficial: snapshot.arsUsdOficial,
          arsUsdFinanciero: snapshot.arsUsdFinanciero
        })

        accumulator.usdOficial += conversion.usdOficial
        accumulator.usdFinanciero += conversion.usdFinanciero
        return accumulator
      },
      { usdOficial: 0, usdFinanciero: 0 }
    )

    return {
      ...snapshot,
      totalUsdOficial: totals.usdOficial,
      totalUsdFinanciero: totals.usdFinanciero
    }
  })
}
