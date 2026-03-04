interface DistributionPoint {
  name: string
  value: number
}

interface TargetsMap {
  [key: string]: number | undefined
}

export interface AllocationDeviationRow {
  name: string
  usdValue: number
  currentPct: number
  targetPct: number
  deviationPct: number
  isAlert: boolean
}

const round2 = (value: number): number => Math.round(value * 100) / 100

export const buildDeviationRows = (
  distribution: DistributionPoint[],
  targets: TargetsMap,
  thresholdPct: number
): AllocationDeviationRow[] => {
  const safeThreshold = Number.isFinite(thresholdPct) && thresholdPct >= 0 ? thresholdPct : 0
  const totalUsd = distribution.reduce((accumulator, row) => accumulator + row.value, 0)

  const currentMap = new Map(distribution.map((row) => [row.name, row.value]))
  const keys = new Set<string>([...Object.keys(targets), ...distribution.map((row) => row.name)])

  return Array.from(keys)
    .map((name) => {
      const usdValue = currentMap.get(name) ?? 0
      const currentPct = totalUsd > 0 ? (usdValue / totalUsd) * 100 : 0
      const targetPct = targets[name] ?? 0
      const deviationPct = currentPct - targetPct
      const hasSignal = targetPct > 0 || currentPct > 0

      return {
        name,
        usdValue,
        currentPct: round2(currentPct),
        targetPct: round2(targetPct),
        deviationPct: round2(deviationPct),
        isAlert: hasSignal && Math.abs(deviationPct) >= safeThreshold
      }
    })
    .filter((row) => row.currentPct > 0 || row.targetPct > 0)
    .sort((a, b) => Math.abs(b.deviationPct) - Math.abs(a.deviationPct))
}

export const summarizeAlerts = (rows: AllocationDeviationRow[]) => {
  return {
    total: rows.length,
    alerts: rows.filter((row) => row.isAlert).length
  }
}
