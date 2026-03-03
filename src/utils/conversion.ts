import type { ConversionResult, HoldingRow, Settings } from '../types'

const isPositiveNumber = (value: number): boolean => Number.isFinite(value) && value > 0

export const convertRowToUsd = (row: HoldingRow, settings: Settings): ConversionResult => {
  const currency = row.moneda.trim().toUpperCase()

  if (currency === 'USD') {
    return {
      usdOficial: row.monto,
      usdFinanciero: row.monto
    }
  }

  if (currency === 'ARS') {
    return {
      usdOficial: isPositiveNumber(settings.arsUsdOficial) ? row.monto / settings.arsUsdOficial : 0,
      usdFinanciero: isPositiveNumber(settings.arsUsdFinanciero) ? row.monto / settings.arsUsdFinanciero : 0,
      warning: isPositiveNumber(settings.arsUsdOficial) && isPositiveNumber(settings.arsUsdFinanciero)
        ? undefined
        : 'Tipo de cambio inválido'
    }
  }

  return {
    usdOficial: 0,
    usdFinanciero: 0,
    warning: 'Moneda no soportada'
  }
}

export const aggregateTotals = <T extends string>(
  rows: HoldingRow[],
  settings: Settings,
  keySelector: (row: HoldingRow) => T
): Array<{ name: T; value: number }> => {
  const totals = new Map<T, number>()

  rows.forEach((row) => {
    const key = keySelector(row)
    const value = convertRowToUsd(row, settings).usdFinanciero
    totals.set(key, (totals.get(key) ?? 0) + value)
  })

  return Array.from(totals.entries())
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
}
