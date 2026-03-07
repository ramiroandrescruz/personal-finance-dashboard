import type { HoldingMovement, HoldingRow, MovementKind } from '../types'
import { HOLDING_TYPES, LIQUIDITY_KINDS } from '../types'
import { normalizeTags } from './tags'

const DATE_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/
const EMPTY_NOTE = ''
const EPSILON = 0.0000001

const normalizeCurrency = (currency: string): string => currency.trim().toUpperCase()
const normalizeSubasset = (subasset: string): string => subasset.trim().toUpperCase()
const normalizeAccount = (account: string): string => account.trim()
const normalizeLiquidity = (liquidity: unknown, tipo: HoldingRow['tipo']): HoldingRow['liquidity'] => {
  if (typeof liquidity === 'string' && LIQUIDITY_KINDS.includes(liquidity as (typeof LIQUIDITY_KINDS)[number])) {
    return liquidity as HoldingRow['liquidity']
  }

  return tipo === 'Properties' ? 'ILLIQUID' : 'LIQUID'
}

const ensureDateKey = (value: string): string => {
  const trimmed = value.trim()

  if (DATE_KEY_PATTERN.test(trimmed)) {
    return trimmed
  }

  return new Date().toISOString().slice(0, 10)
}

export const isInboundMovement = (kind: MovementKind): boolean => {
  return kind === 'OPENING' || kind === 'IN' || kind === 'TRANSFER_IN'
}

export const signedMovementMultiplier = (kind: MovementKind): 1 | -1 | 0 => {
  if (kind === 'REVALUATION') {
    return 0
  }

  return isInboundMovement(kind) ? 1 : -1
}

export const normalizeMovement = (movement: HoldingMovement): HoldingMovement => {
  const { linkedMovementId, valuationDate, valuationSource, valuationCurrency, ...base } = movement
  const normalizedLinkedId = movement.linkedMovementId?.trim()
  const normalizedType = HOLDING_TYPES.includes(movement.tipo) ? movement.tipo : 'Other'
  const normalizedLiquidity = normalizeLiquidity((movement as { liquidity?: unknown }).liquidity, normalizedType)
  const rawAmount = Number.isFinite(movement.monto) ? movement.monto : 0
  const normalizedAmount = movement.kind === 'REVALUATION' ? rawAmount : Math.max(0, rawAmount)
  const normalizedValuationDate = valuationDate?.trim()
  const normalizedValuationSource = valuationSource?.trim()
  const normalizedValuationCurrency = valuationCurrency?.trim().toUpperCase()

  return {
    ...base,
    date: ensureDateKey(movement.date),
    kind: movement.kind,
    cuenta: normalizeAccount(movement.cuenta),
    moneda: normalizeCurrency(movement.moneda),
    monto: normalizedAmount,
    cantidad: movement.cantidad === null || !Number.isFinite(movement.cantidad) ? null : Math.max(0, movement.cantidad),
    tipo: normalizedType,
    subactivo: normalizeSubasset(movement.subactivo),
    liquidity: normalizedLiquidity,
    tags: normalizeTags(movement.tags ?? []),
    note: movement.note.trim(),
    createdAt: Number.isFinite(movement.createdAt) ? movement.createdAt : Date.now(),
    ...(normalizedLinkedId ? { linkedMovementId: normalizedLinkedId } : {}),
    ...(movement.kind === 'REVALUATION' && normalizedValuationDate ? { valuationDate: ensureDateKey(normalizedValuationDate) } : {}),
    ...(movement.kind === 'REVALUATION' && normalizedValuationSource ? { valuationSource: normalizedValuationSource } : {}),
    ...(movement.kind === 'REVALUATION' && normalizedValuationCurrency ? { valuationCurrency: normalizedValuationCurrency } : {})
  }
}

export const buildMovementsFromRows = (rows: HoldingRow[], createdAt: number): HoldingMovement[] => {
  return rows.map((row) =>
    normalizeMovement({
      id: row.id,
      date: new Date(createdAt).toISOString().slice(0, 10),
      kind: 'OPENING',
      cuenta: row.cuenta,
      moneda: row.moneda,
      monto: row.monto,
      cantidad: row.cantidad,
      tipo: row.tipo,
      subactivo: row.subactivo,
      liquidity: row.liquidity,
      tags: row.tags,
      note: 'Migración automática desde holdings previos',
      createdAt
    })
  )
}

interface HoldingAccumulator {
  cuenta: string
  moneda: string
  tipo: HoldingRow['tipo']
  subactivo: string
  liquidity: HoldingRow['liquidity']
  monto: number
  cantidad: number
  hasCantidad: boolean
  tags: Set<string>
}

const buildGroupingKey = (movement: HoldingMovement): string => {
  return `${movement.cuenta.toLowerCase()}::${movement.moneda.toUpperCase()}::${movement.tipo}::${movement.subactivo.toUpperCase()}::${movement.liquidity}`
}

const buildRowAssetKey = (row: HoldingRow): string => {
  return `${row.moneda.trim().toUpperCase()}::${row.tipo}::${row.subactivo.trim().toUpperCase()}::${row.liquidity}`
}

export const rebuildRowsFromMovements = (movements: HoldingMovement[]): HoldingRow[] => {
  const ordered = [...movements]
    .map(normalizeMovement)
    .sort((left, right) => (left.date === right.date ? left.createdAt - right.createdAt : left.date.localeCompare(right.date)))

  const map = new Map<string, HoldingAccumulator>()

  ordered.forEach((movement) => {
    const key = buildGroupingKey(movement)
    const current = map.get(key) ?? {
      cuenta: movement.cuenta,
      moneda: movement.moneda,
      tipo: movement.tipo,
      subactivo: movement.subactivo,
      liquidity: movement.liquidity,
      monto: 0,
      cantidad: 0,
      hasCantidad: false,
      tags: new Set<string>()
    }
    if (movement.kind === 'REVALUATION') {
      current.monto += movement.monto
    } else {
      const multiplier = signedMovementMultiplier(movement.kind)
      current.monto += multiplier * movement.monto

      if (movement.cantidad !== null) {
        current.hasCantidad = true
        current.cantidad += multiplier * movement.cantidad
      }
    }

    movement.tags.forEach((tag) => current.tags.add(tag))
    map.set(key, current)
  })

  const rows: HoldingRow[] = []

  map.forEach((item, key) => {
    const nextAmount = item.monto > EPSILON ? item.monto : 0
    const nextQuantity = item.hasCantidad ? (item.cantidad > EPSILON ? item.cantidad : 0) : null

    if (nextAmount === 0 && nextQuantity === 0) {
      return
    }

    rows.push({
      id: key,
      cuenta: item.cuenta,
      moneda: item.moneda,
      monto: nextAmount,
      cantidad: nextQuantity,
      tipo: item.tipo,
      subactivo: item.subactivo,
      liquidity: item.liquidity,
      tags: normalizeTags(Array.from(item.tags))
    })
  })

  return rows.sort((left, right) => left.cuenta.localeCompare(right.cuenta, 'es', { sensitivity: 'base' }))
}

export const movementKindToLabel = (kind: MovementKind): string => {
  switch (kind) {
    case 'OPENING':
      return 'Apertura'
    case 'IN':
      return 'Entrada'
    case 'OUT':
      return 'Salida'
    case 'TRANSFER_IN':
      return 'Transferencia +'
    case 'TRANSFER_OUT':
      return 'Transferencia -'
    case 'REVALUATION':
      return 'Revalorización'
    default:
      return kind
  }
}

export interface TransferValidationInput {
  cuentaFrom: string
  cuentaTo: string
  moneda: string
  monto: number
  cantidad: number | null
  tipo: HoldingRow['tipo']
  subactivo: string
  liquidity: HoldingRow['liquidity']
}

interface AssetDebitValidationInput {
  cuenta: string
  moneda: string
  monto: number
  cantidad: number | null
  tipo: HoldingRow['tipo']
  subactivo: string
  liquidity: HoldingRow['liquidity']
}

export const validateAssetDebitAgainstRows = (rows: HoldingRow[], draft: AssetDebitValidationInput): string | null => {
  const cuenta = normalizeAccount(draft.cuenta).toLowerCase()
  const moneda = normalizeCurrency(draft.moneda)
  const subactivo = normalizeSubasset(draft.subactivo)
  const liquidity = normalizeLiquidity(draft.liquidity, draft.tipo)

  if (!cuenta) {
    return 'La cuenta origen es obligatoria.'
  }

  const sourceRow = rows.find((row) => {
    return (
      normalizeAccount(row.cuenta).toLowerCase() === cuenta &&
      normalizeCurrency(row.moneda) === moneda &&
      row.tipo === draft.tipo &&
      normalizeSubasset(row.subactivo) === subactivo &&
      row.liquidity === liquidity
    )
  })

  if (!sourceRow) {
    return 'La cuenta origen no tiene ese asset para mover.'
  }

  if (draft.monto > sourceRow.monto + EPSILON) {
    return 'Monto insuficiente en la cuenta origen para ese asset.'
  }

  if (draft.cantidad !== null) {
    if (sourceRow.cantidad === null) {
      return 'La cuenta origen no maneja cantidad para ese asset.'
    }

    if (draft.cantidad > sourceRow.cantidad + EPSILON) {
      return 'Cantidad insuficiente en la cuenta origen para ese asset.'
    }
  }

  return null
}

export const validateTransferAgainstRows = (rows: HoldingRow[], draft: TransferValidationInput): string | null => {
  const cuentaFrom = normalizeAccount(draft.cuentaFrom).toLowerCase()
  const cuentaTo = normalizeAccount(draft.cuentaTo).toLowerCase()
  const moneda = normalizeCurrency(draft.moneda)
  const subactivo = normalizeSubasset(draft.subactivo)
  const liquidity = normalizeLiquidity(draft.liquidity, draft.tipo)
  const targetAssetKey = `${moneda}::${draft.tipo}::${subactivo}::${liquidity}`

  if (!cuentaFrom || !cuentaTo) {
    return 'Las cuentas origen y destino son obligatorias.'
  }

  if (cuentaFrom === cuentaTo) {
    return 'La cuenta origen y destino deben ser distintas.'
  }

  const debitError = validateAssetDebitAgainstRows(rows, {
    cuenta: draft.cuentaFrom,
    moneda: draft.moneda,
    monto: draft.monto,
    cantidad: draft.cantidad,
    tipo: draft.tipo,
    subactivo: draft.subactivo,
    liquidity: draft.liquidity
  })
  if (debitError) {
    if (debitError === 'La cuenta origen no tiene ese asset para mover.') {
      return 'La cuenta origen no tiene ese asset para transferir.'
    }
    return debitError
  }

  const destinationRows = rows.filter((row) => normalizeAccount(row.cuenta).toLowerCase() === cuentaTo)

  if (destinationRows.length === 0) {
    return null
  }

  const destinationHasSameAsset = destinationRows.some((row) => buildRowAssetKey(row) === targetAssetKey)
  if (destinationHasSameAsset) {
    return null
  }

  return 'La cuenta destino no tiene ese asset. Registrá una conversión antes de transferir entre assets distintos.'
}

export const isValidMovement = (value: unknown): value is HoldingMovement => {
  if (!value || typeof value !== 'object') {
    return false
  }

  const candidate = value as HoldingMovement

  const isValidKind =
    typeof candidate.kind === 'string' && (['OPENING', 'IN', 'OUT', 'TRANSFER_IN', 'TRANSFER_OUT', 'REVALUATION'] as string[]).includes(candidate.kind)
  const validDate = typeof candidate.date === 'string' && DATE_KEY_PATTERN.test(candidate.date)
  const validQty =
    candidate.cantidad === null || candidate.cantidad === undefined || (typeof candidate.cantidad === 'number' && Number.isFinite(candidate.cantidad))
  const validTags = Array.isArray(candidate.tags) && candidate.tags.every((item) => typeof item === 'string')
  const validLinked = candidate.linkedMovementId === undefined || typeof candidate.linkedMovementId === 'string'
  const validLiquidity =
    candidate.liquidity === undefined || (typeof candidate.liquidity === 'string' && LIQUIDITY_KINDS.includes(candidate.liquidity))
  const validValuationDate =
    candidate.valuationDate === undefined || (typeof candidate.valuationDate === 'string' && DATE_KEY_PATTERN.test(candidate.valuationDate))
  const validValuationSource = candidate.valuationSource === undefined || typeof candidate.valuationSource === 'string'
  const validValuationCurrency = candidate.valuationCurrency === undefined || typeof candidate.valuationCurrency === 'string'

  return (
    typeof candidate.id === 'string' &&
    validDate &&
    isValidKind &&
    typeof candidate.cuenta === 'string' &&
    typeof candidate.moneda === 'string' &&
    typeof candidate.monto === 'number' &&
    Number.isFinite(candidate.monto) &&
    validQty &&
    typeof candidate.tipo === 'string' &&
    HOLDING_TYPES.includes(candidate.tipo) &&
    typeof candidate.subactivo === 'string' &&
    validLiquidity &&
    validTags &&
    typeof candidate.note === 'string' &&
    typeof candidate.createdAt === 'number' &&
    Number.isFinite(candidate.createdAt) &&
    validLinked &&
    validValuationDate &&
    validValuationSource &&
    validValuationCurrency
  )
}

export const createMovementDraftDefaults = (): Pick<HoldingMovement, 'date' | 'kind' | 'note'> => ({
  date: new Date().toISOString().slice(0, 10),
  kind: 'IN',
  note: EMPTY_NOTE
})
