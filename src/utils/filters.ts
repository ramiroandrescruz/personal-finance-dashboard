import type { HoldingRow, HoldingType } from '../types'
import { getSubassetCategory, type SubassetCategory } from './subasset'

export interface DashboardFilters {
  searchTerm: string
  typeFilters: HoldingType[]
  currencyFilters: string[]
  subassetCategoryFilters: SubassetCategory[]
  subassetFilters: string[]
}

export const DEFAULT_DASHBOARD_FILTERS: DashboardFilters = {
  searchTerm: '',
  typeFilters: [],
  currencyFilters: [],
  subassetCategoryFilters: [],
  subassetFilters: []
}

const matchesMultiFilter = (value: string, selectedValues: string[]): boolean => {
  if (selectedValues.length === 0) {
    return true
  }

  return selectedValues.includes(value)
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
    const matchesType = matchesMultiFilter(row.tipo, filters.typeFilters)
    const matchesCurrency = matchesMultiFilter(currency, filters.currencyFilters)
    const matchesSubassetCategory = matchesMultiFilter(getSubassetCategory(row), filters.subassetCategoryFilters)
    const matchesSubasset = matchesMultiFilter(subasset, filters.subassetFilters)

    return matchesSearch && matchesType && matchesCurrency && matchesSubassetCategory && matchesSubasset
  })
}
