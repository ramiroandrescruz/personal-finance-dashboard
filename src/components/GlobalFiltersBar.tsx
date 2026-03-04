import { HOLDING_TYPES } from '../types'
import type { HoldingType } from '../types'
import { DEFAULT_DASHBOARD_FILTERS, type DashboardFilters } from '../utils/filters'
import { SUBASSET_CATEGORIES, type SubassetCategory } from '../utils/subasset'

interface GlobalFiltersBarProps {
  filters: DashboardFilters
  currencies: string[]
  subassets: string[]
  filteredRowsCount: number
  totalRowsCount: number
  onFiltersChange: (filters: DashboardFilters) => void
  onOpenAddModal: () => void
}

const summarizeSelection = (selected: string[], allLabel: string): string => {
  if (selected.length === 0) {
    return allLabel
  }

  if (selected.length === 1) {
    return selected[0]
  }

  return `${selected.length} seleccionados`
}

const toggleSelection = (current: string[], value: string): string[] => {
  if (current.includes(value)) {
    return current.filter((item) => item !== value)
  }

  return [...current, value]
}

interface MultiSelectControlProps {
  label: string
  allLabel: string
  options: string[]
  selected: string[]
  onChange: (next: string[]) => void
}

const MultiSelectControl = ({ label, allLabel, options, selected, onChange }: MultiSelectControlProps) => {
  return (
    <div className="multi-select">
      <span className="filter-label">{label}</span>
      <details className="multi-select-dropdown">
        <summary>{summarizeSelection(selected, allLabel)}</summary>
        <div className="multi-select-menu">
          <button type="button" className="multi-select-clear" onClick={() => onChange([])}>
            Todas
          </button>

          {options.map((option) => {
            const checked = selected.includes(option)

            return (
              <label key={option} className="multi-select-option">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => onChange(toggleSelection(selected, option))}
                />
                <span>{option}</span>
              </label>
            )
          })}
        </div>
      </details>
    </div>
  )
}

export const GlobalFiltersBar = ({
  filters,
  currencies,
  subassets,
  filteredRowsCount,
  totalRowsCount,
  onFiltersChange,
  onOpenAddModal
}: GlobalFiltersBarProps) => {
  return (
    <section className="filters-panel" aria-label="Filtros globales">
      <div className="filters-header">
        <div>
          <h2>Filtros Globales</h2>
          <p className="muted-text">Aplican a resumen, gráficos y tabla</p>
        </div>
      </div>

      <div className="filters-grid">
        <label className="filters-grid-wide" htmlFor="global-search">
          <span className="filter-label">Búsqueda</span>
          <input
            id="global-search"
            className="search-input"
            placeholder="Buscar por Cuenta o Subactivo"
            value={filters.searchTerm}
            onChange={(event) => onFiltersChange({ ...filters, searchTerm: event.target.value })}
          />
        </label>

        <MultiSelectControl
          label="Tipo"
          allLabel="Todos"
          options={[...HOLDING_TYPES]}
          selected={filters.typeFilters}
          onChange={(next) => onFiltersChange({ ...filters, typeFilters: next as HoldingType[] })}
        />

        <MultiSelectControl
          label="Moneda"
          allLabel="Todas"
          options={currencies}
          selected={filters.currencyFilters}
          onChange={(next) => onFiltersChange({ ...filters, currencyFilters: next })}
        />

        <MultiSelectControl
          label="Tipo subactivo"
          allLabel="Todos"
          options={[...SUBASSET_CATEGORIES]}
          selected={filters.subassetCategoryFilters}
          onChange={(next) => onFiltersChange({ ...filters, subassetCategoryFilters: next as SubassetCategory[] })}
        />

        <MultiSelectControl
          label="Subactivo"
          allLabel="Todos"
          options={subassets}
          selected={filters.subassetFilters}
          onChange={(next) => onFiltersChange({ ...filters, subassetFilters: next })}
        />
      </div>

      <div className="filters-actions">
        <p className="muted-text">
          Filas filtradas: {filteredRowsCount}/{totalRowsCount}
        </p>
        <button type="button" className="btn btn-tertiary" onClick={() => onFiltersChange(DEFAULT_DASHBOARD_FILTERS)}>
          Limpiar filtros
        </button>
        <button type="button" className="btn btn-primary" onClick={onOpenAddModal}>
          + Agregar fila
        </button>
      </div>
    </section>
  )
}
