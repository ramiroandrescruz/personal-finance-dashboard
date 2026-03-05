import { useEffect, useMemo, useState } from 'react'
import { MultiSelect, Select, TextInput } from '@mantine/core'
import { HOLDING_TYPES } from '../types'
import type { DashboardFilters } from '../utils/filters'
import { DEFAULT_DASHBOARD_FILTERS } from '../utils/filters'
import { SUBASSET_CATEGORIES } from '../utils/subasset'
import type { SavedDashboardView } from '../types'
import { AppButton } from './ui/AppButton'

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

const toSelectData = (values: readonly string[]) => values.map((value) => ({ value, label: value }))

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
          <AppButton
            key={preset.id}
            tone="tertiary"
            className="filters-preset-button"
            onClick={() => onFiltersChange(cloneFilters(preset.filters))}
          >
            {preset.label}
          </AppButton>
        ))}
      </div>

      <div className="saved-views-row">
        <TextInput
          label="Guardar vista actual"
          value={viewName}
          onChange={(event) => setViewName(event.target.value)}
          placeholder="Ej: Liquidez + crypto"
        />
        <AppButton
          tone="tertiary"
          className="saved-view-action-button"
          onClick={() => {
            const saved = onSaveCurrentView(viewName)

            if (saved) {
              setSelectedViewId(saved.id)
              setViewName('')
            }
          }}
        >
          Guardar vista
        </AppButton>

        <Select
          label="Vistas guardadas"
          value={selectedViewId || null}
          placeholder="Seleccionar..."
          data={savedViews.map((view) => ({ value: view.id, label: view.name }))}
          onChange={(value) => setSelectedViewId(value ?? '')}
          searchable
          clearable
        />

        <AppButton
          tone="tertiary"
          className="saved-view-action-button"
          disabled={!selectedViewId}
          onClick={() => {
            if (!selectedViewId) {
              return
            }

            onApplySavedView(selectedViewId)
          }}
        >
          Aplicar vista
        </AppButton>

        <AppButton
          tone="danger-outline"
          className="saved-view-action-button"
          disabled={!selectedViewId}
          onClick={() => {
            if (!selectedViewId) {
              return
            }

            onDeleteSavedView(selectedViewId)
            setSelectedViewId('')
          }}
        >
          Eliminar vista
        </AppButton>
      </div>

      <div className="filters-grid">
        <TextInput
          id="global-search"
          label="Búsqueda"
          className="filters-grid-wide"
          placeholder="Buscar por Cuenta o Subactivo"
          value={filters.searchTerm}
          onChange={(event) => onFiltersChange({ ...filters, searchTerm: event.target.value })}
        />

        <MultiSelect
          label="Tipo"
          data={toSelectData(HOLDING_TYPES)}
          value={filters.typeFilters}
          onChange={(values) => onFiltersChange({ ...filters, typeFilters: values as DashboardFilters['typeFilters'] })}
          placeholder="Todos"
          searchable
          clearable
          nothingFoundMessage="Sin resultados"
        />

        <MultiSelect
          label="Moneda"
          data={toSelectData(currencies)}
          value={filters.currencyFilters}
          onChange={(values) => onFiltersChange({ ...filters, currencyFilters: values })}
          placeholder="Todas"
          searchable
          clearable
          nothingFoundMessage="Sin resultados"
        />

        <MultiSelect
          label="Tipo subactivo"
          data={toSelectData(SUBASSET_CATEGORIES)}
          value={filters.subassetCategoryFilters}
          onChange={(values) =>
            onFiltersChange({
              ...filters,
              subassetCategoryFilters: values as DashboardFilters['subassetCategoryFilters']
            })
          }
          placeholder="Todos"
          searchable
          clearable
          nothingFoundMessage="Sin resultados"
        />

        <MultiSelect
          label="Subactivo"
          data={toSelectData(subassets)}
          value={filters.subassetFilters}
          onChange={(values) => onFiltersChange({ ...filters, subassetFilters: values })}
          placeholder="Todos"
          searchable
          clearable
          nothingFoundMessage="Sin resultados"
        />

        <MultiSelect
          label="Tags"
          data={toSelectData(tags)}
          value={filters.tagFilters}
          onChange={(values) => onFiltersChange({ ...filters, tagFilters: values })}
          placeholder="Todos"
          searchable
          clearable
          nothingFoundMessage="Sin resultados"
        />
      </div>

      <div className="filters-actions">
        <p className="muted-text">
          Filas filtradas: {filteredRowsCount}/{totalRowsCount}
        </p>
        <AppButton
          tone="tertiary"
          disabled={!hasActiveFilters}
          onClick={() => onFiltersChange(cloneFilters(DEFAULT_DASHBOARD_FILTERS))}
        >
          Limpiar filtros
        </AppButton>
        <AppButton tone="primary" onClick={onOpenAddMovement}>
          + Agregar movimiento
        </AppButton>
      </div>
    </section>
  )
}
