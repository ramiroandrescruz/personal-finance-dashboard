export const parseAmountInput = (value: string): number | null => {
  const trimmed = value.trim().replace(/\s/g, '')

  if (!trimmed) {
    return null
  }

  const hasComma = trimmed.includes(',')
  const hasDot = trimmed.includes('.')

  let normalized = trimmed

  if (hasComma && hasDot) {
    const lastComma = trimmed.lastIndexOf(',')
    const lastDot = trimmed.lastIndexOf('.')
    const decimalSeparator = lastComma > lastDot ? ',' : '.'

    normalized = decimalSeparator === ',' ? trimmed.replace(/\./g, '').replace(',', '.') : trimmed.replace(/,/g, '')
  } else if (hasComma) {
    normalized = trimmed.replace(',', '.')
  }

  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : null
}

export const formatUsd = (value: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value)
}

export const formatArs = (value: number): string => {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value)
}

export const formatPlainNumber = (value: number): string => {
  return new Intl.NumberFormat('es-AR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value)
}

export const formatTime = (timestamp: number | null): string => {
  if (!timestamp) {
    return '--:--'
  }

  return new Intl.DateTimeFormat('es-AR', {
    hour: '2-digit',
    minute: '2-digit'
  }).format(timestamp)
}
