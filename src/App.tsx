import { useEffect, useMemo, useState } from 'react'
import { AddRowModal } from './components/AddRowModal'
import { AllocationAlertsHome } from './components/AllocationAlertsHome'
import { AllocationTargetsPanel } from './components/AllocationTargetsPanel'
import { AppHeader } from './components/AppHeader'
import { AuthGate } from './components/AuthGate'
import { ChartsSection } from './components/ChartsSection'
import { GlobalFiltersBar } from './components/GlobalFiltersBar'
import { HoldingsTable } from './components/HoldingsTable'
import { SettingsModal } from './components/SettingsModal'
import { SnapshotHistorySection } from './components/SnapshotHistorySection'
import { SummaryCards } from './components/SummaryCards'
import { useHoldingsStore } from './hooks/useHoldingsStore'
import type { HoldingType } from './types'
import { buildDeviationRows } from './utils/allocation'
import { aggregateTotals, convertRowToUsd } from './utils/conversion'
import { applyDashboardFilters, DEFAULT_DASHBOARD_FILTERS, type DashboardFilters } from './utils/filters'
import { clampTargetPercent } from './utils/allocationTargets'
import { getSnapshotDateKey } from './utils/snapshots'

const EMPTY_TOTALS_BY_TYPE: Record<HoldingType, number> = {
  Cash: 0,
  Investments: 0,
  Crypto: 0,
  Other: 0
}

type Theme = 'dark' | 'light'
const THEME_STORAGE_KEY = 'pfd-theme'

function App() {
  return (
    <AuthGate>
      {({ email, uid, logout, cloudSyncEnabled }) => (
        <DashboardApp email={email} userId={uid} cloudSyncEnabled={cloudSyncEnabled} onLogout={logout} />
      )}
    </AuthGate>
  )
}

interface DashboardAppProps {
  email?: string
  userId?: string
  cloudSyncEnabled: boolean
  onLogout?: () => void
}

function DashboardApp({ email, userId, cloudSyncEnabled, onLogout }: DashboardAppProps) {
  const {
    rows,
    settings,
    targets,
    snapshots,
    lastEditedAt,
    lastSavedAt,
    syncMode,
    cloudSyncError,
    lastCloudSyncAt,
    isCloudSyncing,
    addRow,
    updateRow,
    deleteRow,
    restoreDemo,
    resetData,
    updateSettings,
    updateTargets,
    addSnapshot
  } = useHoldingsStore({ userId, cloudSyncEnabled })

  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [isAddRowOpen, setIsAddRowOpen] = useState(false)
  const [isTargetsOpen, setIsTargetsOpen] = useState(false)
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

  const portfolioTotals = useMemo(() => {
    return rows.reduce(
      (accumulator, row) => {
        const conversion = convertRowToUsd(row, settings)
        accumulator.usdOficial += conversion.usdOficial
        accumulator.usdFinanciero += conversion.usdFinanciero
        return accumulator
      },
      {
        usdOficial: 0,
        usdFinanciero: 0
      }
    )
  }, [rows, settings])

  const thresholdPct = clampTargetPercent(targets.alertThresholdPct)

  const allocationAlerts = useMemo(() => {
    const typeAlerts = buildDeviationRows(chartsData.byType, targets.byType, thresholdPct)
      .filter((row) => row.isAlert)
      .map((row) => ({ ...row, scope: 'Tipo' as const }))

    const subassetAlerts = buildDeviationRows(chartsData.bySubasset, targets.bySubasset, thresholdPct, {
      onlyWithTarget: true
    })
      .filter((row) => row.isAlert)
      .map((row) => ({ ...row, scope: 'Subactivo' as const }))

    return [...typeAlerts, ...subassetAlerts].sort((left, right) => Math.abs(right.deviationPct) - Math.abs(left.deviationPct))
  }, [chartsData.bySubasset, chartsData.byType, targets.bySubasset, targets.byType, thresholdPct])

  const handleCaptureSnapshot = () => {
    const snapshotDate = getSnapshotDateKey()
    const hasTodaySnapshot = snapshots.some((snapshot) => snapshot.date === snapshotDate)
    const confirmationMessage = hasTodaySnapshot
      ? `Ya existe un snapshot para hoy (${snapshotDate}). ¿Querés actualizarlo?`
      : `¿Guardar snapshot manual de hoy (${snapshotDate})?`

    if (!window.confirm(confirmationMessage)) {
      return
    }

    addSnapshot({
      date: snapshotDate,
      totalUsdOficial: portfolioTotals.usdOficial,
      totalUsdFinanciero: portfolioTotals.usdFinanciero,
      arsUsdOficial: settings.arsUsdOficial,
      arsUsdFinanciero: settings.arsUsdFinanciero
    })
  }

  return (
    <div className="app-shell">
      <div className="app-bg" aria-hidden="true" />

      <main className="dashboard">
        <AppHeader
          lastSavedAt={lastSavedAt}
          lastEditedAt={lastEditedAt}
          syncMode={syncMode}
          cloudSyncError={cloudSyncError}
          lastCloudSyncAt={lastCloudSyncAt}
          isCloudSyncing={isCloudSyncing}
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

        <SnapshotHistorySection snapshots={snapshots} onCaptureSnapshot={handleCaptureSnapshot} />

        <AllocationAlertsHome
          thresholdPct={thresholdPct}
          alerts={allocationAlerts}
          onOpenConfig={() => setIsTargetsOpen(true)}
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

      {isTargetsOpen ? (
        <div className="modal-backdrop" role="presentation">
          <div className="allocation-modal-shell" role="dialog" aria-modal="true" aria-label="Configurar objetivos de asignación">
            <AllocationTargetsPanel
              byType={chartsData.byType}
              bySubasset={chartsData.bySubasset}
              targets={targets}
              onTargetsChange={updateTargets}
              onClose={() => setIsTargetsOpen(false)}
            />
          </div>
        </div>
      ) : null}
    </div>
  )
}

export default App
