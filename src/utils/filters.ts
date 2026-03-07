import type { DashboardFilterState, HoldingRow } from '../types'
import { getSubassetCategory, type SubassetCategory } from './subasset'

export type DashboardFilters = DashboardFilterState & {
  subassetCategoryFilters: SubassetCategory[]
}

export const DEFAULT_DASHBOARD_FILTERS: DashboardFilters = {
  searchTerm: '',
  typeFilters: [],
  liquidityFilters: [],
  currencyFilters: [],
  subassetCategoryFilters: [],
  subassetFilters: [],
  tagFilters: []
}

const matchesMultiFilter = (value: string, selectedValues: string[]): boolean => {
  if (selectedValues.length === 0) {
    return true
  }

  return selectedValues.includes(value)
}

export const applyDashboardFilters = (rows: HoldingRow[], filters: DashboardFilters): HoldingRow[] => {
  const normalizedSearch = filters.searchTerm.trim().toLowerCase()
  const normalizedTagFilters = filters.tagFilters.map((tag) => tag.toLowerCase())
  const normalizedTypeFilters = filters.typeFilters.map((type) => type.toLowerCase())
  const normalizedLiquidityFilters = filters.liquidityFilters.map((liquidity) => liquidity.toUpperCase())
  const normalizedCurrencyFilters = filters.currencyFilters.map((currency) => currency.trim().toUpperCase())
  const normalizedSubassetCategoryFilters = filters.subassetCategoryFilters.map((category) => category.toLowerCase())
  const normalizedSubassetFilters = filters.subassetFilters.map((subasset) => subasset.trim().toUpperCase())

  return rows.filter((row) => {
    const currency = row.moneda.trim().toUpperCase()
    const subasset = row.subactivo.trim().toUpperCase()
    const liquidity = row.liquidity.toUpperCase()
    const rowTags = (row.tags ?? []).map((tag) => tag.toLowerCase())
    const subassetCategory = getSubassetCategory(row).toLowerCase()

    const matchesSearch =
      !normalizedSearch ||
      row.cuenta.toLowerCase().includes(normalizedSearch) ||
      row.subactivo.toLowerCase().includes(normalizedSearch)
    const matchesType = matchesMultiFilter(row.tipo.toLowerCase(), normalizedTypeFilters)
    const matchesLiquidity = matchesMultiFilter(liquidity, normalizedLiquidityFilters)
    const matchesCurrency = matchesMultiFilter(currency, normalizedCurrencyFilters)
    const matchesSubassetCategory = matchesMultiFilter(subassetCategory, normalizedSubassetCategoryFilters)
    const matchesSubasset = matchesMultiFilter(subasset, normalizedSubassetFilters)
    const matchesTags =
      normalizedTagFilters.length === 0 || normalizedTagFilters.some((selectedTag) => rowTags.includes(selectedTag))

    return matchesSearch && matchesType && matchesLiquidity && matchesCurrency && matchesSubassetCategory && matchesSubasset && matchesTags
  })
}
