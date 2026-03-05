import { useEffect, useMemo, useState } from 'react'
import { HOLDING_TYPES } from '../types'
import type { DashboardFilters } from '../utils/filters'
import { DEFAULT_DASHBOARD_FILTERS } from '../utils/filters'
import { SUBASSET_CATEGORIES } from '../utils/subasset'
import type { SavedDashboardView } from '../types'

interface GlobalFiltersBarProps {
  filters: DashboardFilters
  currencies: string[]
  subassets: string[]
  tags: string[]
  savedViews: SavedDashboardView[]
  filteredRowsCount: number
  totalRowsCount: number
  onFiltersChange: (filters: DashboardFilters) => void
  onOpenAddMovement: () => void
  onSaveCurrentView: (name: string) => SavedDashboardView | null
  onApplySavedView: (id: string) => void
  onDeleteSavedView: (id: string) => void
}

const summarizeSelection = <T extends string>(selected: T[], allLabel: string): string => {
  if (selected.length === 0) {
    return allLabel
  }

  if (selected.length === 1) {
    return selected[0] ?? allLabel
  }

  return `${selected.length} seleccionados`
}

const toggleSelection = <T extends string>(current: T[], value: T): T[] => {
  if (current.includes(value)) {
    return current.filter((item) => item !== value)
  }

  return [...current, value]
}

interface MultiSelectControlProps<T extends string> {
  label: string
  allLabel: string
  options: T[]
  selected: T[]
  onChange: (next: T[]) => void
}

const MultiSelectControl = <T extends string>({
  label,
  allLabel,
  options,
  selected,
  onChange
}: MultiSelectControlProps<T>) => {
  return (
    <div className="multi-select">
      <span className="filter-label">{label}</span>
      <details className="multi-select-dropdown">
        <summary>{summarizeSelection(selected, allLabel)}</summary>
        <div className="multi-select-menu">
          <button type="button" className="multi-select-clear" onClick={() => onChange([])}>
            {allLabel}
          </button>

          {options.map((option) => {
            const checked = selected.includes(option)

            return (
              <label key={option} className="multi-select-option">
                <input type="checkbox" checked={checked} onChange={() => onChange(toggleSelection(selected, option))} />
                <span>{option}</span>
              </label>
            )
          })}
        </div>
      </details>
    </div>
  )
}

const cloneFilters = (filters: DashboardFilters): DashboardFilters => ({
  searchTerm: filters.searchTerm,
  typeFilters: [...filters.typeFilters],
  currencyFilters: [...filters.currencyFilters],
  subassetCategoryFilters: [...filters.subassetCategoryFilters],
  subassetFilters: [...filters.subassetFilters],
  tagFilters: [...filters.tagFilters]
})

const PRESET_FILTERS: Array<{ id: string; label: string; filters: DashboardFilters }> = [
  { id: 'all', label: 'Todo', filters: cloneFilters(DEFAULT_DASHBOARD_FILTERS) },
  {
    id: 'crypto',
    label: 'Solo Crypto',
    filters: {
      ...cloneFilters(DEFAULT_DASHBOARD_FILTERS),
      typeFilters: ['Crypto']
    }
  },
  {
    id: 'investments',
    label: 'Solo Investments',
    filters: {
      ...cloneFilters(DEFAULT_DASHBOARD_FILTERS),
      typeFilters: ['Investments']
    }
  },
  {
    id: 'cash',
    label: 'Solo Cash',
    filters: {
      ...cloneFilters(DEFAULT_DASHBOARD_FILTERS),
      typeFilters: ['Cash']
    }
  }
]

export const GlobalFiltersBar = ({
  filters,
  currencies,
  subassets,
  tags,
  savedViews,
  filteredRowsCount,
  totalRowsCount,
  onFiltersChange,
  onOpenAddMovement,
  onSaveCurrentView,
  onApplySavedView,
  onDeleteSavedView
}: GlobalFiltersBarProps) => {
  const [viewName, setViewName] = useState('')
  const [selectedViewId, setSelectedViewId] = useState('')

  useEffect(() => {
    if (!selectedViewId) {
      return
    }

    if (!savedViews.some((view) => view.id === selectedViewId)) {
      setSelectedViewId('')
    }
  }, [savedViews, selectedViewId])

  const hasActiveFilters = useMemo(() => {
    return (
      filters.searchTerm.trim() !== '' ||
      filters.typeFilters.length > 0 ||
      filters.currencyFilters.length > 0 ||
      filters.subassetCategoryFilters.length > 0 ||
      filters.subassetFilters.length > 0 ||
      filters.tagFilters.length > 0
    )
  }, [filters])

  return (
    <section className="filters-panel" aria-label="Filtros globales">
      <div className="filters-header">
        <div>
          <h2>Filtros Globales</h2>
          <p className="muted-text">Aplican a resumen, gráficos y tabla</p>
        </div>
      </div>

      <div className="filters-presets-row">
        {PRESET_FILTERS.map((preset) => (
          <button
            key={preset.id}
            type="button"
            className="pf-btn pf-btn-tertiary pf-btn-preset"
            onClick={() => onFiltersChange(cloneFilters(preset.filters))}
          >
            <span className="pf-btn-label">{preset.label}</span>
          </button>
        ))}
      </div>

      <div className="saved-views-row">
        <label className="saved-views-name" htmlFor="saved-view-name">
          <span className="filter-label">Guardar vista actual</span>
          <input
            id="saved-view-name"
            value={viewName}
            onChange={(event) => setViewName(event.target.value)}
            placeholder="Ej: Liquidez + crypto"
          />
        </label>
        <button
          type="button"
          className="pf-btn pf-btn-tertiary"
          onClick={() => {
            const saved = onSaveCurrentView(viewName)

            if (saved) {
              setSelectedViewId(saved.id)
              setViewName('')
            }
          }}
        >
          <span className="pf-btn-label">Guardar vista</span>
        </button>

        <label className="saved-views-select" htmlFor="saved-view-select">
          <span className="filter-label">Vistas guardadas</span>
          <select id="saved-view-select" value={selectedViewId} onChange={(event) => setSelectedViewId(event.target.value)}>
            <option value="">Seleccionar…</option>
            {savedViews.map((view) => (
              <option key={view.id} value={view.id}>
                {view.name}
              </option>
            ))}
          </select>
        </label>

        <button
          type="button"
          className={`pf-btn pf-btn-tertiary ${!selectedViewId ? 'is-disabled' : ''}`}
          aria-disabled={!selectedViewId}
          onClick={() => {
            if (!selectedViewId) {
              return
            }

            onApplySavedView(selectedViewId)
          }}
        >
          <span className="pf-btn-label">Aplicar vista</span>
        </button>

        <button
          type="button"
          className={`pf-btn pf-btn-danger-outline ${!selectedViewId ? 'is-disabled' : ''}`}
          aria-disabled={!selectedViewId}
          onClick={() => {
            if (!selectedViewId) {
              return
            }

            onDeleteSavedView(selectedViewId)
            setSelectedViewId('')
          }}
        >
          <span className="pf-btn-label">Eliminar vista</span>
        </button>
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
          onChange={(next) => onFiltersChange({ ...filters, typeFilters: next })}
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
          onChange={(next) => onFiltersChange({ ...filters, subassetCategoryFilters: next })}
        />

        <MultiSelectControl
          label="Subactivo"
          allLabel="Todos"
          options={subassets}
          selected={filters.subassetFilters}
          onChange={(next) => onFiltersChange({ ...filters, subassetFilters: next })}
        />

        <MultiSelectControl
          label="Tags"
          allLabel="Todas"
          options={tags}
          selected={filters.tagFilters}
          onChange={(next) => onFiltersChange({ ...filters, tagFilters: next })}
        />
      </div>

      <div className="filters-actions">
        <p className="muted-text">
          Filas filtradas: {filteredRowsCount}/{totalRowsCount}
        </p>
        <button
          type="button"
          className={`pf-btn pf-btn-tertiary ${!hasActiveFilters ? 'is-disabled' : ''}`}
          aria-disabled={!hasActiveFilters}
          onClick={() => onFiltersChange(cloneFilters(DEFAULT_DASHBOARD_FILTERS))}
        >
          <span className="pf-btn-label">Limpiar filtros</span>
        </button>
        <button type="button" className="pf-btn pf-btn-primary" onClick={onOpenAddMovement}>
          <span className="pf-btn-label">+ Agregar movimiento</span>
        </button>
      </div>
    </section>
  )
}
