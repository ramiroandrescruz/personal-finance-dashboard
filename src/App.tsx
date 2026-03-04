import { useEffect, useMemo, useState } from 'react'
import { AddRowModal } from './components/AddRowModal'
import { AppHeader } from './components/AppHeader'
import { AuthGate } from './components/AuthGate'
import { ChartsSection } from './components/ChartsSection'
import { GlobalFiltersBar } from './components/GlobalFiltersBar'
import { HoldingsTable } from './components/HoldingsTable'
import { SettingsModal } from './components/SettingsModal'
import { SummaryCards } from './components/SummaryCards'
import { useHoldingsStore } from './hooks/useHoldingsStore'
import type { HoldingType } from './types'
import { aggregateTotals, convertRowToUsd } from './utils/conversion'
import { applyDashboardFilters, DEFAULT_DASHBOARD_FILTERS, type DashboardFilters } from './utils/filters'

const EMPTY_TOTALS_BY_TYPE: Record<HoldingType, number> = {
  Cash: 0,
  Investments: 0,
  Crypto: 0,
  Other: 0
}

type Theme = 'dark' | 'light'
const THEME_STORAGE_KEY = 'pfd-theme'

function App() {
  return <AuthGate>{({ email, logout }) => <DashboardApp email={email} onLogout={logout} />}</AuthGate>
}

interface DashboardAppProps {
  email?: string
  onLogout?: () => void
}

function DashboardApp({ email, onLogout }: DashboardAppProps) {
  const {
    rows,
    settings,
    lastEditedAt,
    lastSavedAt,
    addRow,
    updateRow,
    deleteRow,
    restoreDemo,
    resetData,
    updateSettings
  } = useHoldingsStore()

  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [isAddRowOpen, setIsAddRowOpen] = useState(false)
  const [filters, setFilters] = useState<DashboardFilters>(DEFAULT_DASHBOARD_FILTERS)
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window === 'undefined') {
      return 'dark'
    }

    const stored = window.localStorage.getItem(THEME_STORAGE_KEY)
    if (stored === 'dark' || stored === 'light') {
      return stored
    }

    return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
  })

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    window.localStorage.setItem(THEME_STORAGE_KEY, theme)
  }, [theme])

  const filteredRows = useMemo(() => applyDashboardFilters(rows, filters), [rows, filters])

  const currencies = useMemo(() => {
    return Array.from(new Set(rows.map((row) => row.moneda.trim().toUpperCase()).filter(Boolean))).sort((a, b) =>
      a.localeCompare(b, 'es', { sensitivity: 'base' })
    )
  }, [rows])

  const subassets = useMemo(() => {
    return Array.from(new Set(rows.map((row) => row.subactivo.trim().toUpperCase()).filter(Boolean))).sort((a, b) =>
      a.localeCompare(b, 'es', { sensitivity: 'base' })
    )
  }, [rows])

  const accounts = useMemo(() => {
    return Array.from(new Set(rows.map((row) => row.cuenta.trim()).filter(Boolean))).sort((a, b) =>
      a.localeCompare(b, 'es', { sensitivity: 'base' })
    )
  }, [rows])

  const computedRows = useMemo(() => {
    return filteredRows.map((row) => {
      const conversion = convertRowToUsd(row, settings)

      return {
        ...row,
        ...conversion
      }
    })
  }, [filteredRows, settings])

  const totals = useMemo(() => {
    return computedRows.reduce(
      (accumulator, row) => {
        accumulator.usdOficial += row.usdOficial
        accumulator.usdFinanciero += row.usdFinanciero
        accumulator.byType[row.tipo] += row.usdFinanciero

        if (row.warning === 'Moneda no soportada') {
          accumulator.unsupportedCurrencies.add(row.moneda.trim().toUpperCase())
        }

        return accumulator
      },
      {
        usdOficial: 0,
        usdFinanciero: 0,
        byType: { ...EMPTY_TOTALS_BY_TYPE },
        unsupportedCurrencies: new Set<string>()
      }
    )
  }, [computedRows])

  const chartsData = useMemo(() => {
    return {
      byType: aggregateTotals(filteredRows, settings, (row) => row.tipo),
      bySubasset: aggregateTotals(filteredRows, settings, (row) => row.subactivo),
      byAccount: aggregateTotals(filteredRows, settings, (row) => row.cuenta)
    }
  }, [filteredRows, settings])

  return (
    <div className="app-shell">
      <div className="app-bg" aria-hidden="true" />

      <main className="dashboard">
        <AppHeader
          lastSavedAt={lastSavedAt}
          lastEditedAt={lastEditedAt}
          userEmail={email}
          onLogout={email ? onLogout : undefined}
          theme={theme}
          onToggleTheme={() => setTheme((previous) => (previous === 'dark' ? 'light' : 'dark'))}
          onOpenSettings={() => setIsSettingsOpen(true)}
          onRestoreDemo={() => {
            if (window.confirm('Se van a restaurar las filas demo y las tasas por defecto. ¿Continuar?')) {
              restoreDemo()
            }
          }}
          onResetData={() => {
            if (window.confirm('Esto elimina todos los holdings guardados localmente. ¿Continuar?')) {
              resetData()
            }
          }}
        />

        {totals.unsupportedCurrencies.size > 0 ? (
          <p className="warning-banner" role="status">
            Moneda no soportada detectada ({Array.from(totals.unsupportedCurrencies).join(', ')}). Se valora como 0 USD.
          </p>
        ) : null}

        <GlobalFiltersBar
          filters={filters}
          currencies={currencies}
          subassets={subassets}
          filteredRowsCount={filteredRows.length}
          totalRowsCount={rows.length}
          onFiltersChange={setFilters}
          onOpenAddModal={() => setIsAddRowOpen(true)}
        />

        <SummaryCards
          totalUsdFinanciero={totals.usdFinanciero}
          totalUsdOficial={totals.usdOficial}
          totalsByType={totals.byType}
        />

        <ChartsSection byType={chartsData.byType} bySubasset={chartsData.bySubasset} byAccount={chartsData.byAccount} />

        <HoldingsTable
          rows={filteredRows}
          settings={settings}
          onUpdateRow={updateRow}
          onDeleteRow={deleteRow}
        />
      </main>

      <SettingsModal
        isOpen={isSettingsOpen}
        settings={settings}
        onClose={() => setIsSettingsOpen(false)}
        onSave={updateSettings}
      />

      <AddRowModal
        isOpen={isAddRowOpen}
        accountOptions={accounts}
        currencyOptions={currencies}
        subassetOptions={subassets}
        onClose={() => setIsAddRowOpen(false)}
        onCreate={addRow}
      />
    </div>
  )
}

export default App
