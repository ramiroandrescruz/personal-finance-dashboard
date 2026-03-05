import type { HoldingMovement, HoldingRow, MovementKind } from '../types'
import { HOLDING_TYPES } from '../types'
import { normalizeTags } from './tags'

const DATE_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/
const EMPTY_NOTE = ''
const EPSILON = 0.0000001

const normalizeCurrency = (currency: string): string => currency.trim().toUpperCase()
const normalizeSubasset = (subasset: string): string => subasset.trim().toUpperCase()
const normalizeAccount = (account: string): string => account.trim()

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

export const signedMovementMultiplier = (kind: MovementKind): 1 | -1 => (isInboundMovement(kind) ? 1 : -1)

export const normalizeMovement = (movement: HoldingMovement): HoldingMovement => {
  const { linkedMovementId, ...base } = movement
  const normalizedLinkedId = movement.linkedMovementId?.trim()

  return {
    ...base,
    date: ensureDateKey(movement.date),
    kind: movement.kind,
    cuenta: normalizeAccount(movement.cuenta),
    moneda: normalizeCurrency(movement.moneda),
    monto: Math.max(0, Number.isFinite(movement.monto) ? movement.monto : 0),
    cantidad: movement.cantidad === null || !Number.isFinite(movement.cantidad) ? null : Math.max(0, movement.cantidad),
    tipo: HOLDING_TYPES.includes(movement.tipo) ? movement.tipo : 'Other',
    subactivo: normalizeSubasset(movement.subactivo),
    tags: normalizeTags(movement.tags ?? []),
    note: movement.note.trim(),
    createdAt: Number.isFinite(movement.createdAt) ? movement.createdAt : Date.now(),
    ...(normalizedLinkedId ? { linkedMovementId: normalizedLinkedId } : {})
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
  monto: number
  cantidad: number
  hasCantidad: boolean
  tags: Set<string>
}

const buildGroupingKey = (movement: HoldingMovement): string => {
  return `${movement.cuenta.toLowerCase()}::${movement.moneda.toUpperCase()}::${movement.tipo}::${movement.subactivo.toUpperCase()}`
}

const buildRowAssetKey = (row: HoldingRow): string => {
  return `${row.moneda.trim().toUpperCase()}::${row.tipo}::${row.subactivo.trim().toUpperCase()}`
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
      monto: 0,
      cantidad: 0,
      hasCantidad: false,
      tags: new Set<string>()
    }
    const multiplier = signedMovementMultiplier(movement.kind)

    current.monto += multiplier * movement.monto

    if (movement.cantidad !== null) {
      current.hasCantidad = true
      current.cantidad += multiplier * movement.cantidad
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
}

interface AssetDebitValidationInput {
  cuenta: string
  moneda: string
  monto: number
  cantidad: number | null
  tipo: HoldingRow['tipo']
  subactivo: string
}

export const validateAssetDebitAgainstRows = (rows: HoldingRow[], draft: AssetDebitValidationInput): string | null => {
  const cuenta = normalizeAccount(draft.cuenta).toLowerCase()
  const moneda = normalizeCurrency(draft.moneda)
  const subactivo = normalizeSubasset(draft.subactivo)

  if (!cuenta) {
    return 'La cuenta origen es obligatoria.'
  }

  const sourceRow = rows.find((row) => {
    return (
      normalizeAccount(row.cuenta).toLowerCase() === cuenta &&
      normalizeCurrency(row.moneda) === moneda &&
      row.tipo === draft.tipo &&
      normalizeSubasset(row.subactivo) === subactivo
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
  const targetAssetKey = `${moneda}::${draft.tipo}::${subactivo}`

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
    subactivo: draft.subactivo
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

  const isValidKind = typeof candidate.kind === 'string' && (['OPENING', 'IN', 'OUT', 'TRANSFER_IN', 'TRANSFER_OUT'] as string[]).includes(candidate.kind)
  const validDate = typeof candidate.date === 'string' && DATE_KEY_PATTERN.test(candidate.date)
  const validQty =
    candidate.cantidad === null || candidate.cantidad === undefined || (typeof candidate.cantidad === 'number' && Number.isFinite(candidate.cantidad))
  const validTags = Array.isArray(candidate.tags) && candidate.tags.every((item) => typeof item === 'string')
  const validLinked = candidate.linkedMovementId === undefined || typeof candidate.linkedMovementId === 'string'

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
    validTags &&
    typeof candidate.note === 'string' &&
    typeof candidate.createdAt === 'number' &&
    Number.isFinite(candidate.createdAt) &&
    validLinked
  )
}

export const createMovementDraftDefaults = (): Pick<HoldingMovement, 'date' | 'kind' | 'note'> => ({
  date: new Date().toISOString().slice(0, 10),
  kind: 'IN',
  note: EMPTY_NOTE
})
