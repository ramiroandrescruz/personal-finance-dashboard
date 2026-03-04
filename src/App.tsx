import { useMemo, useState } from 'react'
import { AddRowModal } from './components/AddRowModal'
import { AppHeader } from './components/AppHeader'
import { AuthGate } from './components/AuthGate'
import { ChartsSection } from './components/ChartsSection'
import { HoldingsTable } from './components/HoldingsTable'
import { SettingsModal } from './components/SettingsModal'
import { SummaryCards } from './components/SummaryCards'
import { useHoldingsStore } from './hooks/useHoldingsStore'
import type { HoldingType } from './types'
import { aggregateTotals, convertRowToUsd } from './utils/conversion'

const EMPTY_TOTALS_BY_TYPE: Record<HoldingType, number> = {
  Cash: 0,
  Investments: 0,
  Crypto: 0,
  Other: 0
}

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

  const computedRows = useMemo(() => {
    return rows.map((row) => {
      const conversion = convertRowToUsd(row, settings)

      return {
        ...row,
        ...conversion
      }
    })
  }, [rows, settings])

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
      byType: aggregateTotals(rows, settings, (row) => row.tipo),
      bySubasset: aggregateTotals(rows, settings, (row) => row.subactivo),
      byAccount: aggregateTotals(rows, settings, (row) => row.cuenta)
    }
  }, [rows, settings])

  return (
    <div className="app-shell">
      <div className="app-bg" aria-hidden="true" />

      <main className="dashboard">
        <AppHeader
          lastSavedAt={lastSavedAt}
          lastEditedAt={lastEditedAt}
          userEmail={email}
          onLogout={email ? onLogout : undefined}
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

        <SummaryCards
          totalUsdFinanciero={totals.usdFinanciero}
          totalUsdOficial={totals.usdOficial}
          totalsByType={totals.byType}
        />

        <ChartsSection
          byType={chartsData.byType}
          bySubasset={chartsData.bySubasset}
          byAccount={chartsData.byAccount}
          totalUsdFinanciero={totals.usdFinanciero}
        />

        <HoldingsTable
          rows={rows}
          settings={settings}
          onUpdateRow={updateRow}
          onDeleteRow={deleteRow}
          onOpenAddModal={() => setIsAddRowOpen(true)}
        />
      </main>

      <SettingsModal
        isOpen={isSettingsOpen}
        settings={settings}
        onClose={() => setIsSettingsOpen(false)}
        onSave={updateSettings}
      />

      <AddRowModal isOpen={isAddRowOpen} onClose={() => setIsAddRowOpen(false)} onCreate={addRow} />
    </div>
  )
}

export default App
