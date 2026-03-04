import type { AllocationTargets, HoldingType } from '../types'

export const DEFAULT_ALERT_THRESHOLD_PCT = 5

export const DEFAULT_ALLOCATION_TARGETS: AllocationTargets = {
  byType: {},
  bySubasset: {},
  alertThresholdPct: DEFAULT_ALERT_THRESHOLD_PCT
}

export const clampTargetPercent = (value: number): number => {
  if (!Number.isFinite(value)) {
    return 0
  }

  if (value < 0) {
    return 0
  }

  if (value > 100) {
    return 100
  }

  return value
}

export const sanitizeTargets = (targets: AllocationTargets): AllocationTargets => {
  const byType = Object.entries(targets.byType).reduce<Partial<Record<HoldingType, number>>>((accumulator, [key, value]) => {
    const normalized = clampTargetPercent(Number(value ?? 0))

    if (normalized > 0) {
      accumulator[key as HoldingType] = normalized
    }

    return accumulator
  }, {})

  const bySubasset = Object.entries(targets.bySubasset).reduce<Record<string, number>>((accumulator, [key, value]) => {
    const normalizedKey = key.trim().toUpperCase()
    const normalizedValue = clampTargetPercent(Number(value ?? 0))

    if (normalizedKey.length > 0 && normalizedValue > 0) {
      accumulator[normalizedKey] = normalizedValue
    }

    return accumulator
  }, {})

  return {
    byType,
    bySubasset,
    alertThresholdPct: clampTargetPercent(targets.alertThresholdPct)
  }
}
