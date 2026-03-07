import { useEffect, useMemo, useState } from 'react'
import { Collapse, MultiSelect, Select, TextInput } from '@mantine/core'
import { HOLDING_TYPES } from '../types'
import type { SavedDashboardView } from '../types'
import type { DashboardFilters } from '../utils/filters'
import { DEFAULT_DASHBOARD_FILTERS } from '../utils/filters'
import { SUBASSET_CATEGORIES } from '../utils/subasset'
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
  onSaveCurrentView,
  onApplySavedView,
  onDeleteSavedView
}: GlobalFiltersBarProps) => {
  const [viewName, setViewName] = useState('')
  const [selectedViewId, setSelectedViewId] = useState('')
  const [showAdvanced, setShowAdvanced] = useState(false)

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

  const activeFilterChips = useMemo(() => {
    const chips: Array<{ id: string; label: string; onRemove: () => void }> = []

    if (filters.searchTerm.trim()) {
      chips.push({
        id: 'search',
        label: `Buscar: ${filters.searchTerm.trim()}`,
        onRemove: () => onFiltersChange({ ...filters, searchTerm: '' })
      })
    }

    filters.typeFilters.forEach((type) => {
      chips.push({
        id: `type-${type}`,
        label: `Tipo: ${type}`,
        onRemove: () => onFiltersChange({ ...filters, typeFilters: filters.typeFilters.filter((item) => item !== type) })
      })
    })

    filters.currencyFilters.forEach((currency) => {
      chips.push({
        id: `currency-${currency}`,
        label: `Moneda: ${currency}`,
        onRemove: () => onFiltersChange({ ...filters, currencyFilters: filters.currencyFilters.filter((item) => item !== currency) })
      })
    })

    filters.tagFilters.forEach((tag) => {
      chips.push({
        id: `tag-${tag}`,
        label: `Tag: ${tag}`,
        onRemove: () => onFiltersChange({ ...filters, tagFilters: filters.tagFilters.filter((item) => item !== tag) })
      })
    })

    filters.subassetCategoryFilters.forEach((category) => {
      chips.push({
        id: `subasset-category-${category}`,
        label: `Categoría: ${category}`,
        onRemove: () =>
          onFiltersChange({
            ...filters,
            subassetCategoryFilters: filters.subassetCategoryFilters.filter((item) => item !== category) as DashboardFilters['subassetCategoryFilters']
          })
      })
    })

    filters.subassetFilters.forEach((subasset) => {
      chips.push({
        id: `subasset-${subasset}`,
        label: `Subactivo: ${subasset}`,
        onRemove: () => onFiltersChange({ ...filters, subassetFilters: filters.subassetFilters.filter((item) => item !== subasset) })
      })
    })

    return chips
  }, [filters, onFiltersChange])

  return (
    <section className="filters-panel filters-panel-compact" aria-label="Filtros globales">
      <div className="filters-header filters-header-compact">
        <div>
          <h2>Filtros</h2>
          <p className="muted-text">
            {filteredRowsCount}/{totalRowsCount} posiciones visibles
          </p>
        </div>

        <div className="filters-header-actions">
          <AppButton tone="tertiary" onClick={() => setShowAdvanced((previous) => !previous)}>
            {showAdvanced ? 'Ocultar avanzados' : 'Más filtros'}
          </AppButton>
          <AppButton
            tone="tertiary"
            disabled={!hasActiveFilters}
            onClick={() => onFiltersChange(cloneFilters(DEFAULT_DASHBOARD_FILTERS))}
          >
            Limpiar
          </AppButton>
        </div>
      </div>

      <div className="filters-primary-row">
        <TextInput
          id="global-search"
          className="filters-search"
          placeholder="Buscar por cuenta o subactivo"
          value={filters.searchTerm}
          onChange={(event) => onFiltersChange({ ...filters, searchTerm: event.target.value })}
        />

        <MultiSelect
          data={toSelectData(HOLDING_TYPES)}
          value={filters.typeFilters}
          onChange={(values) => onFiltersChange({ ...filters, typeFilters: values as DashboardFilters['typeFilters'] })}
          placeholder="Tipo"
          searchable
          clearable
          nothingFoundMessage="Sin resultados"
        />

        <MultiSelect
          data={toSelectData(currencies)}
          value={filters.currencyFilters}
          onChange={(values) => onFiltersChange({ ...filters, currencyFilters: values })}
          placeholder="Moneda"
          searchable
          clearable
          nothingFoundMessage="Sin resultados"
        />

        <MultiSelect
          data={toSelectData(tags)}
          value={filters.tagFilters}
          onChange={(values) => onFiltersChange({ ...filters, tagFilters: values })}
          placeholder="Tags"
          searchable
          clearable
          nothingFoundMessage="Sin resultados"
        />
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

      <Collapse in={showAdvanced}>
        <div className="filters-advanced-row">
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
        </div>
      </Collapse>

      <div className="saved-views-row saved-views-row-compact">
        <TextInput
          value={viewName}
          onChange={(event) => setViewName(event.target.value)}
          placeholder="Nombre para guardar vista"
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
          value={selectedViewId || null}
          placeholder="Vista guardada"
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
          Aplicar
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
          Eliminar
        </AppButton>
      </div>

      {activeFilterChips.length > 0 ? (
        <div className="active-filter-chips" aria-label="Filtros activos">
          {activeFilterChips.map((chip) => (
            <button key={chip.id} type="button" className="active-filter-chip" onClick={chip.onRemove}>
              {chip.label} <span aria-hidden="true">×</span>
            </button>
          ))}
        </div>
      ) : null}
    </section>
  )
}
