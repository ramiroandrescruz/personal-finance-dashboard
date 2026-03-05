import { type KeyboardEvent, useMemo, useState } from 'react'
import { Modal, NativeSelect, TextInput } from '@mantine/core'
import type { HoldingRow, HoldingType, Settings } from '../types'
import { HOLDING_TYPES } from '../types'
import { convertRowToUsd } from '../utils/conversion'
import { formatPlainNumber, formatQuantity, formatUsd, parseAmountInput } from '../utils/number'
import { formatTags, parseTagsInput } from '../utils/tags'
import { AppButton } from './ui/AppButton'

type EditableField = 'cuenta' | 'moneda' | 'monto' | 'cantidad' | 'tags' | 'tipo' | 'subactivo'
type SortColumn = EditableField | 'usdOficial' | 'usdFinanciero'

interface SortState {
  column: SortColumn
  direction: 'asc' | 'desc'
}

interface HoldingsTableProps {
  rows: HoldingRow[]
  settings: Settings
  onUpdateRow: (id: string, patch: Partial<Omit<HoldingRow, 'id'>>) => void
  onDeleteRow: (id: string) => void
  onDuplicateRow: (id: string) => void
  onBulkUpdateRows: (ids: string[], patch: Partial<Omit<HoldingRow, 'id'>>) => void
}

interface EditingState {
  rowId: string
  field: EditableField
}

interface BulkDraft {
  cuenta: string
  moneda: string
  tipo: '' | HoldingType
  subactivo: string
  tags: string
}

const sortArrow = (sort: SortState, column: SortColumn): string => {
  if (sort.column !== column) {
    return '↕'
  }

  return sort.direction === 'asc' ? '↑' : '↓'
}

const stringCompare = (a: string, b: string): number => a.localeCompare(b, 'es', { sensitivity: 'base' })

const INITIAL_BULK_DRAFT: BulkDraft = {
  cuenta: '',
  moneda: '',
  tipo: '',
  subactivo: '',
  tags: ''
}

export const HoldingsTable = ({
  rows,
  settings,
  onUpdateRow,
  onDeleteRow,
  onDuplicateRow,
  onBulkUpdateRows
}: HoldingsTableProps) => {
  const [sortState, setSortState] = useState<SortState>({ column: 'usdFinanciero', direction: 'desc' })
  const [editing, setEditing] = useState<EditingState | null>(null)
  const [draftValue, setDraftValue] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [selectedRowIds, setSelectedRowIds] = useState<string[]>([])
  const [isBulkEditOpen, setIsBulkEditOpen] = useState(false)
  const [bulkDraft, setBulkDraft] = useState<BulkDraft>(INITIAL_BULK_DRAFT)
  const [bulkError, setBulkError] = useState<string | null>(null)

  const rowConversions = useMemo(() => {
    const map = new Map<string, ReturnType<typeof convertRowToUsd>>()

    rows.forEach((row) => {
      map.set(row.id, convertRowToUsd(row, settings))
    })

    return map
  }, [rows, settings])

  const sortedRows = useMemo(() => {
    const sorted = [...rows]

    sorted.sort((left, right) => {
      let comparison = 0

      switch (sortState.column) {
        case 'cuenta':
          comparison = stringCompare(left.cuenta, right.cuenta)
          break
        case 'moneda':
          comparison = stringCompare(left.moneda, right.moneda)
          break
        case 'monto':
          comparison = left.monto - right.monto
          break
        case 'cantidad':
          comparison = (left.cantidad ?? -1) - (right.cantidad ?? -1)
          break
        case 'tags':
          comparison = stringCompare(formatTags(left.tags), formatTags(right.tags))
          break
        case 'tipo':
          comparison = stringCompare(left.tipo, right.tipo)
          break
        case 'subactivo':
          comparison = stringCompare(left.subactivo, right.subactivo)
          break
        case 'usdOficial':
          comparison =
            (rowConversions.get(left.id)?.usdOficial ?? 0) - (rowConversions.get(right.id)?.usdOficial ?? 0)
          break
        case 'usdFinanciero':
          comparison =
            (rowConversions.get(left.id)?.usdFinanciero ?? 0) - (rowConversions.get(right.id)?.usdFinanciero ?? 0)
          break
        default:
          comparison = 0
      }

      return sortState.direction === 'asc' ? comparison : -comparison
    })

    return sorted
  }, [rows, rowConversions, sortState])

  const selectableIds = useMemo(() => sortedRows.map((row) => row.id), [sortedRows])
  const selectedIdsSet = useMemo(() => new Set(selectedRowIds), [selectedRowIds])
  const selectedCount = selectedRowIds.length
  const areAllVisibleSelected = selectableIds.length > 0 && selectableIds.every((id) => selectedIdsSet.has(id))

  const handleSortChange = (column: SortColumn) => {
    setSortState((previous) => {
      if (previous.column === column) {
        return {
          column,
          direction: previous.direction === 'asc' ? 'desc' : 'asc'
        }
      }

      return {
        column,
        direction: 'asc'
      }
    })
  }

  const beginEdit = (row: HoldingRow, field: EditableField) => {
    setError(null)
    setEditing({
      rowId: row.id,
      field
    })

    if (field === 'monto' || field === 'cantidad') {
      const sourceValue = field === 'monto' ? row.monto : row.cantidad
      setDraftValue(sourceValue === null ? '' : sourceValue.toString())
      return
    }

    if (field === 'tags') {
      setDraftValue(formatTags(row.tags))
      return
    }

    setDraftValue(String(row[field]))
  }

  const cancelEdit = () => {
    setEditing(null)
    setDraftValue('')
    setError(null)
  }

  const commitEdit = () => {
    if (!editing) {
      return
    }

    const trimmed = draftValue.trim()

    if (editing.field === 'cuenta' || editing.field === 'subactivo') {
      if (!trimmed) {
        setError('Cuenta y subactivo son obligatorios.')
        return
      }

      const patch = editing.field === 'cuenta' ? { cuenta: trimmed } : { subactivo: trimmed.toUpperCase() }
      onUpdateRow(editing.rowId, patch)
      cancelEdit()
      return
    }

    if (editing.field === 'moneda') {
      if (!trimmed) {
        setError('La moneda no puede quedar vacía.')
        return
      }

      onUpdateRow(editing.rowId, { moneda: trimmed.toUpperCase() })
      cancelEdit()
      return
    }

    if (editing.field === 'tipo') {
      if (!HOLDING_TYPES.includes(trimmed as HoldingType)) {
        setError('Tipo inválido.')
        return
      }

      onUpdateRow(editing.rowId, { tipo: trimmed as HoldingType })
      cancelEdit()
      return
    }

    if (editing.field === 'tags') {
      onUpdateRow(editing.rowId, { tags: parseTagsInput(trimmed) })
      cancelEdit()
      return
    }

    if (editing.field === 'cantidad' && !trimmed) {
      onUpdateRow(editing.rowId, { cantidad: null })
      cancelEdit()
      return
    }

    const parsedNumber = parseAmountInput(trimmed)

    if (parsedNumber === null) {
      setError(
        editing.field === 'cantidad'
          ? 'Cantidad inválida. Ejemplos válidos: 0,025 o 0.025'
          : 'Monto inválido. Ejemplos válidos: 575344,63 o 575344.63'
      )
      return
    }

    if (parsedNumber < 0) {
      setError(editing.field === 'cantidad' ? 'La cantidad no puede ser negativa.' : 'El monto no puede ser negativo.')
      return
    }

    if (editing.field === 'monto') {
      onUpdateRow(editing.rowId, { monto: parsedNumber })
      cancelEdit()
      return
    }

    if (editing.field === 'cantidad') {
      onUpdateRow(editing.rowId, { cantidad: parsedNumber })
      cancelEdit()
      return
    }

    cancelEdit()
  }

  const handleCellKeyDown = (event: KeyboardEvent<HTMLInputElement | HTMLSelectElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault()
      commitEdit()
      return
    }

    if (event.key === 'Escape') {
      event.preventDefault()
      cancelEdit()
    }
  }

  const renderEditableCell = (row: HoldingRow, field: EditableField) => {
    const isEditing = editing?.rowId === row.id && editing.field === field

    if (isEditing && field === 'tipo') {
      return (
        <select
          value={draftValue}
          autoFocus
          onChange={(event) => setDraftValue(event.target.value)}
          onBlur={commitEdit}
          onKeyDown={handleCellKeyDown}
          aria-label={`Editar ${field}`}
        >
          {HOLDING_TYPES.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>
      )
    }

    if (isEditing) {
      return (
        <input
          autoFocus
          value={draftValue}
          onChange={(event) => setDraftValue(event.target.value)}
          onBlur={commitEdit}
          onKeyDown={handleCellKeyDown}
          inputMode={field === 'monto' || field === 'cantidad' ? 'decimal' : 'text'}
          aria-label={`Editar ${field}`}
        />
      )
    }

    let displayValue: string

    if (field === 'monto') {
      displayValue = formatPlainNumber(row.monto)
    } else if (field === 'cantidad') {
      displayValue = row.cantidad === null ? '—' : formatQuantity(row.cantidad)
    } else if (field === 'tags') {
      displayValue = row.tags.length > 0 ? formatTags(row.tags) : '—'
    } else {
      displayValue = String(row[field])
    }

    return (
      <button type="button" className="cell-button" onClick={() => beginEdit(row, field)}>
        {displayValue}
      </button>
    )
  }

  const toggleRowSelection = (id: string) => {
    setSelectedRowIds((current) => {
      if (current.includes(id)) {
        return current.filter((item) => item !== id)
      }

      return [...current, id]
    })
  }

  const toggleSelectAllVisible = () => {
    setSelectedRowIds((current) => {
      const currentSet = new Set(current)
      const allSelected = selectableIds.every((id) => currentSet.has(id))

      if (allSelected) {
        return current.filter((id) => !selectableIds.includes(id))
      }

      return Array.from(new Set([...current, ...selectableIds]))
    })
  }

  const openBulkEdit = () => {
    setBulkDraft(INITIAL_BULK_DRAFT)
    setBulkError(null)
    setIsBulkEditOpen(true)
  }

  const applyBulkEdit = () => {
    const patch: Partial<Omit<HoldingRow, 'id'>> = {}

    if (bulkDraft.cuenta.trim()) {
      patch.cuenta = bulkDraft.cuenta.trim()
    }

    if (bulkDraft.moneda.trim()) {
      patch.moneda = bulkDraft.moneda.trim().toUpperCase()
    }

    if (bulkDraft.tipo) {
      patch.tipo = bulkDraft.tipo
    }

    if (bulkDraft.subactivo.trim()) {
      patch.subactivo = bulkDraft.subactivo.trim().toUpperCase()
    }

    if (bulkDraft.tags.trim()) {
      patch.tags = parseTagsInput(bulkDraft.tags)
    }

    if (Object.keys(patch).length === 0) {
      setBulkError('Definí al menos un campo para aplicar.')
      return
    }

    onBulkUpdateRows(selectedRowIds, patch)
    setIsBulkEditOpen(false)
    setSelectedRowIds([])
    setBulkDraft(INITIAL_BULK_DRAFT)
    setBulkError(null)
  }

  return (
    <section className="table-section" aria-label="Holdings">
      <div className="table-toolbar table-toolbar-compact">
        <p className="muted-text">Holdings filtrados: {sortedRows.length}</p>
      </div>

      <div className="table-bulk-toolbar">
        <p className="muted-text">Seleccionadas: {selectedCount}</p>
        <AppButton type="button" tone="tertiary" disabled={selectedCount === 0} onClick={openBulkEdit}>
          Editar seleccionadas
        </AppButton>
        <AppButton type="button" tone="tertiary" disabled={selectedCount === 0} onClick={() => setSelectedRowIds([])}>
          Limpiar selección
        </AppButton>
      </div>

      {error ? <p className="error-text">{error}</p> : null}

      <div className="table-shell" role="region" aria-label="Tabla de holdings" tabIndex={0}>
        <table>
          <thead>
            <tr>
              <th>
                <input
                  type="checkbox"
                  aria-label="Seleccionar todas las filas visibles"
                  checked={areAllVisibleSelected}
                  onChange={toggleSelectAllVisible}
                />
              </th>
              <th>
                <button type="button" className="sort-button" onClick={() => handleSortChange('cuenta')}>
                  Cuenta {sortArrow(sortState, 'cuenta')}
                </button>
              </th>
              <th>
                <button type="button" className="sort-button" onClick={() => handleSortChange('moneda')}>
                  Moneda {sortArrow(sortState, 'moneda')}
                </button>
              </th>
              <th>
                <button type="button" className="sort-button" onClick={() => handleSortChange('monto')}>
                  Monto {sortArrow(sortState, 'monto')}
                </button>
              </th>
              <th>
                <button type="button" className="sort-button" onClick={() => handleSortChange('cantidad')}>
                  Cantidad {sortArrow(sortState, 'cantidad')}
                </button>
              </th>
              <th>
                <button type="button" className="sort-button" onClick={() => handleSortChange('tags')}>
                  Tags {sortArrow(sortState, 'tags')}
                </button>
              </th>
              <th>
                <button type="button" className="sort-button" onClick={() => handleSortChange('tipo')}>
                  Tipo {sortArrow(sortState, 'tipo')}
                </button>
              </th>
              <th>
                <button type="button" className="sort-button" onClick={() => handleSortChange('usdOficial')}>
                  USD (Oficial) {sortArrow(sortState, 'usdOficial')}
                </button>
              </th>
              <th>
                <button type="button" className="sort-button" onClick={() => handleSortChange('usdFinanciero')}>
                  USD (Financiero) {sortArrow(sortState, 'usdFinanciero')}
                </button>
              </th>
              <th>
                <button type="button" className="sort-button" onClick={() => handleSortChange('subactivo')}>
                  Subactivo {sortArrow(sortState, 'subactivo')}
                </button>
              </th>
              <th>Acciones</th>
            </tr>
          </thead>

          <tbody>
            {sortedRows.map((row) => {
              const conversion = rowConversions.get(row.id)

              return (
                <tr key={row.id}>
                  <td>
                    <input
                      type="checkbox"
                      checked={selectedIdsSet.has(row.id)}
                      aria-label={`Seleccionar ${row.cuenta}`}
                      onChange={() => toggleRowSelection(row.id)}
                    />
                  </td>
                  <td>{renderEditableCell(row, 'cuenta')}</td>
                  <td>
                    {renderEditableCell(row, 'moneda')}
                    {conversion?.warning === 'Moneda no soportada' ? (
                      <span className="warning-badge" title="Moneda no soportada">
                        !
                      </span>
                    ) : null}
                  </td>
                  <td>{renderEditableCell(row, 'monto')}</td>
                  <td>{renderEditableCell(row, 'cantidad')}</td>
                  <td>{renderEditableCell(row, 'tags')}</td>
                  <td>{renderEditableCell(row, 'tipo')}</td>
                  <td>{formatUsd(conversion?.usdOficial ?? 0)}</td>
                  <td>{formatUsd(conversion?.usdFinanciero ?? 0)}</td>
                  <td>{renderEditableCell(row, 'subactivo')}</td>
                  <td>
                    <div className="row-actions">
                      <AppButton type="button" tone="tertiary" size="compact-sm" onClick={() => onDuplicateRow(row.id)}>
                        Duplicar
                      </AppButton>
                      <AppButton
                        type="button"
                        tone="danger-outline"
                        size="compact-sm"
                        onClick={() => {
                          if (window.confirm(`¿Eliminar la fila de ${row.cuenta}?`)) {
                            onDeleteRow(row.id)
                          }
                        }}
                      >
                        Eliminar
                      </AppButton>
                    </div>
                  </td>
                </tr>
              )
            })}

            {sortedRows.length === 0 ? (
              <tr>
                <td colSpan={11}>
                  <p className="empty-state">No hay filas para los filtros actuales.</p>
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <Modal opened={isBulkEditOpen} onClose={() => setIsBulkEditOpen(false)} title={`Editar ${selectedCount} filas`} centered>
        <p className="modal-note">Solo se aplican los campos que completes.</p>

        <div className="form-grid">
          <TextInput
            id="bulk-cuenta"
            label="Cuenta"
            value={bulkDraft.cuenta}
            onChange={(event) => setBulkDraft((previous) => ({ ...previous, cuenta: event.currentTarget.value }))}
          />

          <TextInput
            id="bulk-moneda"
            label="Moneda"
            value={bulkDraft.moneda}
            onChange={(event) => setBulkDraft((previous) => ({ ...previous, moneda: event.currentTarget.value }))}
          />

          <NativeSelect
            id="bulk-tipo"
            label="Tipo"
            value={bulkDraft.tipo}
            onChange={(event) => setBulkDraft((previous) => ({ ...previous, tipo: event.currentTarget.value as BulkDraft['tipo'] }))}
            data={[{ value: '', label: 'Sin cambio' }, ...HOLDING_TYPES.map((type) => ({ value: type, label: type }))]}
          />

          <TextInput
            id="bulk-subactivo"
            label="Subactivo"
            value={bulkDraft.subactivo}
            onChange={(event) => setBulkDraft((previous) => ({ ...previous, subactivo: event.currentTarget.value }))}
          />

          <TextInput
            id="bulk-tags"
            label="Tags (coma)"
            value={bulkDraft.tags}
            onChange={(event) => setBulkDraft((previous) => ({ ...previous, tags: event.currentTarget.value }))}
            placeholder="largo plazo, liquidez"
          />
        </div>

        {bulkError ? <p className="error-text">{bulkError}</p> : null}

        <div className="modal-actions">
          <AppButton
            type="button"
            tone="tertiary"
            onClick={() => {
              setIsBulkEditOpen(false)
              setBulkError(null)
            }}
          >
            Cancelar
          </AppButton>
          <AppButton type="button" tone="primary" onClick={applyBulkEdit}>
            Aplicar cambios
          </AppButton>
        </div>
      </Modal>
    </section>
  )
}
