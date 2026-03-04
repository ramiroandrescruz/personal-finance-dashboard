import { type KeyboardEvent, useMemo, useState } from 'react'
import type { HoldingRow, HoldingType, Settings } from '../types'
import { HOLDING_TYPES } from '../types'
import { convertRowToUsd } from '../utils/conversion'
import type { DashboardFilters } from '../utils/filters'
import { formatPlainNumber, formatUsd, parseAmountInput } from '../utils/number'
import { SUBASSET_CATEGORIES, type SubassetCategory } from '../utils/subasset'

type EditableField = 'cuenta' | 'moneda' | 'monto' | 'tipo' | 'subactivo'
type SortColumn = EditableField | 'usdOficial' | 'usdFinanciero'

interface SortState {
  column: SortColumn
  direction: 'asc' | 'desc'
}

interface HoldingsTableProps {
  rows: HoldingRow[]
  totalRows: number
  settings: Settings
  filters: DashboardFilters
  currencies: string[]
  subassets: string[]
  onFiltersChange: (filters: DashboardFilters) => void
  onUpdateRow: (id: string, patch: Partial<Omit<HoldingRow, 'id'>>) => void
  onDeleteRow: (id: string) => void
  onOpenAddModal: () => void
}

interface EditingState {
  rowId: string
  field: EditableField
}

const sortArrow = (sort: SortState, column: SortColumn): string => {
  if (sort.column !== column) {
    return '↕'
  }

  return sort.direction === 'asc' ? '↑' : '↓'
}

const stringCompare = (a: string, b: string): number => a.localeCompare(b, 'es', { sensitivity: 'base' })

export const HoldingsTable = ({
  rows,
  totalRows,
  settings,
  filters,
  currencies,
  subassets,
  onFiltersChange,
  onUpdateRow,
  onDeleteRow,
  onOpenAddModal
}: HoldingsTableProps) => {
  const [sortState, setSortState] = useState<SortState>({ column: 'usdFinanciero', direction: 'desc' })
  const [editing, setEditing] = useState<EditingState | null>(null)
  const [draftValue, setDraftValue] = useState('')
  const [error, setError] = useState<string | null>(null)

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

    if (field === 'monto') {
      setDraftValue(row.monto.toString())
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

    const parsedAmount = parseAmountInput(trimmed)

    if (parsedAmount === null) {
      setError('Monto inválido. Ejemplos válidos: 575344,63 o 575344.63')
      return
    }

    onUpdateRow(editing.rowId, { monto: parsedAmount })
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
          inputMode={field === 'monto' ? 'decimal' : 'text'}
          aria-label={`Editar ${field}`}
        />
      )
    }

    const displayValue = field === 'monto' ? formatPlainNumber(row.monto) : String(row[field])

    return (
      <button type="button" className="cell-button" onClick={() => beginEdit(row, field)}>
        {displayValue}
      </button>
    )
  }

  return (
    <section className="table-section" aria-label="Holdings">
      <div className="table-toolbar">
        <div className="table-toolbar-main">
          <label htmlFor="search-holdings" className="sr-only">
            Buscar por cuenta o subactivo
          </label>
          <input
            id="search-holdings"
            className="search-input"
            placeholder="Buscar por Cuenta o Subactivo"
            value={filters.searchTerm}
            onChange={(event) => onFiltersChange({ ...filters, searchTerm: event.target.value })}
          />

          <label>
            <span className="filter-label">Tipo</span>
            <select
              value={filters.typeFilter}
              onChange={(event) => onFiltersChange({ ...filters, typeFilter: event.target.value as 'ALL' | HoldingType })}
            >
              <option value="ALL">Todos</option>
              {HOLDING_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span className="filter-label">Moneda</span>
            <select
              value={filters.currencyFilter}
              onChange={(event) => onFiltersChange({ ...filters, currencyFilter: event.target.value })}
            >
              <option value="ALL">Todas</option>
              {currencies.map((currency) => (
                <option key={currency} value={currency}>
                  {currency}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span className="filter-label">Tipo subactivo</span>
            <select
              value={filters.subassetCategoryFilter}
              onChange={(event) =>
                onFiltersChange({ ...filters, subassetCategoryFilter: event.target.value as 'ALL' | SubassetCategory })
              }
            >
              <option value="ALL">Todos</option>
              {SUBASSET_CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span className="filter-label">Subactivo</span>
            <select
              value={filters.subassetFilter}
              onChange={(event) => onFiltersChange({ ...filters, subassetFilter: event.target.value })}
            >
              <option value="ALL">Todos</option>
              {subassets.map((subasset) => (
                <option key={subasset} value={subasset}>
                  {subasset}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="table-toolbar-actions">
          <p className="muted-text">
            Filas: {sortedRows.length}/{totalRows}
          </p>
          <button
            type="button"
            className="btn btn-tertiary"
            onClick={() =>
              onFiltersChange({
                searchTerm: '',
                typeFilter: 'ALL',
                currencyFilter: 'ALL',
                subassetCategoryFilter: 'ALL',
                subassetFilter: 'ALL'
              })
            }
          >
            Limpiar filtros
          </button>
          <button type="button" className="btn btn-primary" onClick={onOpenAddModal}>
            + Agregar fila
          </button>
        </div>
      </div>

      {error ? <p className="error-text">{error}</p> : null}

      <div className="table-shell" role="region" aria-label="Tabla de holdings" tabIndex={0}>
        <table>
          <thead>
            <tr>
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
                  <td>{renderEditableCell(row, 'tipo')}</td>
                  <td>{formatUsd(conversion?.usdOficial ?? 0)}</td>
                  <td>{formatUsd(conversion?.usdFinanciero ?? 0)}</td>
                  <td>{renderEditableCell(row, 'subactivo')}</td>
                  <td>
                    <button
                      type="button"
                      className="btn btn-danger-outline"
                      onClick={() => {
                        if (window.confirm(`¿Eliminar la fila de ${row.cuenta}?`)) {
                          onDeleteRow(row.id)
                        }
                      }}
                    >
                      Eliminar
                    </button>
                  </td>
                </tr>
              )
            })}

            {sortedRows.length === 0 ? (
              <tr>
                <td colSpan={8}>
                  <p className="empty-state">No hay filas para los filtros actuales.</p>
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </section>
  )
}
