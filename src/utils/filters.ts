import type { HoldingRow, HoldingType } from '../types'
import { getSubassetCategory, type SubassetCategory } from './subasset'

export interface DashboardFilters {
  searchTerm: string
  typeFilter: 'ALL' | HoldingType
  currencyFilter: 'ALL' | string
  subassetCategoryFilter: 'ALL' | SubassetCategory
  subassetFilter: 'ALL' | string
}

export const DEFAULT_DASHBOARD_FILTERS: DashboardFilters = {
  searchTerm: '',
  typeFilter: 'ALL',
  currencyFilter: 'ALL',
  subassetCategoryFilter: 'ALL',
  subassetFilter: 'ALL'
}

export const applyDashboardFilters = (rows: HoldingRow[], filters: DashboardFilters): HoldingRow[] => {
  const normalizedSearch = filters.searchTerm.trim().toLowerCase()

  return rows.filter((row) => {
    const currency = row.moneda.trim().toUpperCase()
    const subasset = row.subactivo.trim().toUpperCase()

    const matchesSearch =
      !normalizedSearch ||
      row.cuenta.toLowerCase().includes(normalizedSearch) ||
      row.subactivo.toLowerCase().includes(normalizedSearch)
    const matchesType = filters.typeFilter === 'ALL' || row.tipo === filters.typeFilter
    const matchesCurrency = filters.currencyFilter === 'ALL' || currency === filters.currencyFilter
    const matchesSubassetCategory =
      filters.subassetCategoryFilter === 'ALL' || getSubassetCategory(row) === filters.subassetCategoryFilter
    const matchesSubasset = filters.subassetFilter === 'ALL' || subasset === filters.subassetFilter

    return matchesSearch && matchesType && matchesCurrency && matchesSubassetCategory && matchesSubasset
  })
}
