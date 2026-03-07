import { useCallback, useEffect, useMemo, useState } from 'react'
import { Modal } from '@mantine/core'
import { AllocationAlertsHome } from './components/AllocationAlertsHome'
import { AllocationTargetsPanel } from './components/AllocationTargetsPanel'
import { AppHeader } from './components/AppHeader'
import { AuthGate } from './components/AuthGate'
import { ChartsSection } from './components/ChartsSection'
import { GlobalFiltersBar } from './components/GlobalFiltersBar'
import { HoldingsSnapshotTable } from './components/HoldingsSnapshotTable'
import { MovementsSection } from './components/MovementsSection'
import { SettingsModal } from './components/SettingsModal'
import { SnapshotHistorySection } from './components/SnapshotHistorySection'
import { SummaryCards } from './components/SummaryCards'
import { ToastStack } from './components/ToastStack'
import { useHoldingsStore } from './hooks/useHoldingsStore'
import type { DashboardFilterState, HoldingType } from './types'
import { buildDeviationRows } from './utils/allocation'
import { clampTargetPercent } from './utils/allocationTargets'
import { aggregateTotals, convertRowToUsd } from './utils/conversion'
import { applyDashboardFilters, DEFAULT_DASHBOARD_FILTERS, type DashboardFilters } from './utils/filters'
import { getSnapshotDateKey } from './utils/snapshots'

const EMPTY_TOTALS_BY_TYPE: Record<HoldingType, number> = {
  Cash: 0,
  Investments: 0,
  Crypto: 0,
  Properties: 0,
  Other: 0
}

type Theme = 'dark' | 'light'
const THEME_STORAGE_KEY = 'pfd-theme'

interface ToastItem {
  id: string
  message: string
  tone?: 'info' | 'success' | 'error'
}

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
    transactions,
    rows,
    settings,
    targets,
    snapshots,
    savedViews,
    lastEditedAt,
    lastSavedAt,
    syncMode,
    cloudSyncError,
    lastCloudSyncAt,
    isCloudSyncing,
    canUndo,
    canRedo,
    addMovement,
    addTransferMovement,
    addConversionMovement,
    deleteMovement,
    resetData,
    updateSettings,
    updateTargets,
    addSnapshot,
    upsertSavedView,
    deleteSavedView,
    undo,
    redo
  } = useHoldingsStore({ userId, cloudSyncEnabled })

  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [isAddMovementOpen, setIsAddMovementOpen] = useState(false)
  const [isTargetsOpen, setIsTargetsOpen] = useState(false)
  const [filters, setFilters] = useState<DashboardFilters>(DEFAULT_DASHBOARD_FILTERS)
  const [toasts, setToasts] = useState<ToastItem[]>([])
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

  const pushToast = useCallback((message: string, tone: ToastItem['tone'] = 'info') => {
    const toastId = `${Date.now()}-${Math.random().toString(16).slice(2)}`

    setToasts((previous) => [...previous.slice(-3), { id: toastId, message, tone }])

    window.setTimeout(() => {
      setToasts((previous) => previous.filter((toast) => toast.id !== toastId))
    }, 2600)
  }, [])

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    window.localStorage.setItem(THEME_STORAGE_KEY, theme)
  }, [theme])

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      const isTypingField =
        target !== null &&
        (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT' || target.isContentEditable)
      const key = event.key.toLowerCase()
      const withModifier = event.metaKey || event.ctrlKey

      if (withModifier && !isTypingField && key === 'z' && !event.shiftKey) {
        event.preventDefault()

        if (undo()) {
          pushToast('Deshacer aplicado', 'success')
        }
        return
      }

      if (withModifier && !isTypingField && (key === 'y' || (key === 'z' && event.shiftKey))) {
        event.preventDefault()

        if (redo()) {
          pushToast('Rehacer aplicado', 'success')
        }
        return
      }

      if (withModifier && !isTypingField && key === 'n') {
        event.preventDefault()
        setIsAddMovementOpen(true)
        return
      }

      if (!withModifier && key === '/' && !isTypingField) {
        event.preventDefault()
        const search = document.getElementById('global-search') as HTMLInputElement | null
        search?.focus()
      }
    }

    window.addEventListener('keydown', handler)
    return () => {
      window.removeEventListener('keydown', handler)
    }
  }, [pushToast, redo, undo])

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

  const tags = useMemo(() => {
    return Array.from(new Set(rows.flatMap((row) => row.tags.map((tag) => tag.trim())).filter(Boolean))).sort((a, b) =>
      a.localeCompare(b, 'es', { sensitivity: 'base' })
    )
  }, [rows])

  const accounts = useMemo(() => {
    return Array.from(new Set(transactions.map((movement) => movement.cuenta.trim()).filter(Boolean))).sort((a, b) =>
      a.localeCompare(b, 'es', { sensitivity: 'base' })
    )
  }, [transactions])

  const movementCurrencies = useMemo(() => {
    return Array.from(new Set(transactions.map((movement) => movement.moneda.trim().toUpperCase()).filter(Boolean))).sort((a, b) =>
      a.localeCompare(b, 'es', { sensitivity: 'base' })
    )
  }, [transactions])

  const movementSubassets = useMemo(() => {
    return Array.from(new Set(transactions.map((movement) => movement.subactivo.trim().toUpperCase()).filter(Boolean))).sort((a, b) =>
      a.localeCompare(b, 'es', { sensitivity: 'base' })
    )
  }, [transactions])

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

  const portfolioTotalsByType = useMemo(() => {
    return rows.reduce(
      (accumulator, row) => {
        const conversion = convertRowToUsd(row, settings)
        accumulator[row.tipo] += conversion.usdFinanciero
        return accumulator
      },
      { ...EMPTY_TOTALS_BY_TYPE }
    )
  }, [rows, settings])

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

  const liquidityTotals = useMemo(() => {
    return rows.reduce(
      (accumulator, row) => {
        const conversion = convertRowToUsd(row, settings)
        if (row.liquidity === 'ILLIQUID') {
          accumulator.illiquidUsdFinanciero += conversion.usdFinanciero
        } else {
          accumulator.liquidUsdFinanciero += conversion.usdFinanciero
        }
        return accumulator
      },
      {
        liquidUsdFinanciero: 0,
        illiquidUsdFinanciero: 0
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
    pushToast('Snapshot diario guardado', 'success')
  }

  const handleSaveCurrentView = (name: string) => {
    const savedView = upsertSavedView({
      name,
      filters: filters as DashboardFilterState
    })

    if (!savedView) {
      pushToast('Ingresá un nombre para guardar la vista', 'error')
      return null
    }

    pushToast(`Vista "${savedView.name}" guardada`, 'success')
    return savedView
  }

  const handleApplySavedView = (id: string) => {
    const view = savedViews.find((item) => item.id === id)

    if (!view) {
      return
    }

    setFilters(view.filters as DashboardFilters)
    pushToast(`Vista "${view.name}" aplicada`, 'success')
  }

  const handleDeleteSavedView = (id: string) => {
    const view = savedViews.find((item) => item.id === id)

    if (!view) {
      return
    }

    if (!window.confirm(`¿Eliminar la vista guardada "${view.name}"?`)) {
      return
    }

    deleteSavedView(id)
    pushToast(`Vista "${view.name}" eliminada`)
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
          onResetData={() => {
            if (window.confirm('Esto elimina movimientos y posiciones guardadas. ¿Continuar?')) {
              resetData()
              pushToast('Datos reiniciados', 'success')
            }
          }}
        />

        {totals.unsupportedCurrencies.size > 0 ? (
          <p className="warning-banner" role="status">
            Moneda no soportada detectada ({Array.from(totals.unsupportedCurrencies).join(', ')}). Se valora como 0 USD.
          </p>
        ) : null}

        <SnapshotHistorySection
          snapshots={snapshots}
          totalUsdFinanciero={portfolioTotals.usdFinanciero}
          totalUsdOficial={portfolioTotals.usdOficial}
          liquidUsdFinanciero={liquidityTotals.liquidUsdFinanciero}
          illiquidUsdFinanciero={liquidityTotals.illiquidUsdFinanciero}
          onCaptureSnapshot={handleCaptureSnapshot}
        />

        <SummaryCards totalUsdFinanciero={portfolioTotals.usdFinanciero} totalsByType={portfolioTotalsByType} />

        <GlobalFiltersBar
          filters={filters}
          currencies={currencies}
          subassets={subassets}
          tags={tags}
          savedViews={savedViews}
          filteredRowsCount={filteredRows.length}
          totalRowsCount={rows.length}
          onFiltersChange={setFilters}
          onSaveCurrentView={handleSaveCurrentView}
          onApplySavedView={handleApplySavedView}
          onDeleteSavedView={handleDeleteSavedView}
        />

        <ChartsSection byType={chartsData.byType} bySubasset={chartsData.bySubasset} byAccount={chartsData.byAccount} />

        <HoldingsSnapshotTable rows={filteredRows} settings={settings} />

        <MovementsSection
          movements={transactions}
          accountOptions={accounts}
          currencyOptions={movementCurrencies}
          subassetOptions={movementSubassets}
          isCreateOpen={isAddMovementOpen}
          onOpenCreate={() => setIsAddMovementOpen(true)}
          onCloseCreate={() => setIsAddMovementOpen(false)}
          onCreateMovement={(draft) => {
            addMovement(draft)
            pushToast('Movimiento guardado', 'success')
          }}
          onCreateTransfer={(draft) => {
            const result = addTransferMovement(draft)
            if (result.ok) {
              pushToast('Transferencia guardada', 'success')
            }
            return result
          }}
          onCreateConversion={(draft) => {
            const result = addConversionMovement(draft)
            if (result.ok) {
              pushToast('Conversión guardada', 'success')
            }
            return result
          }}
          onDeleteMovement={(id) => {
            deleteMovement(id)
            pushToast('Movimiento eliminado')
          }}
          canUndo={canUndo}
          canRedo={canRedo}
          onUndo={() => {
            if (undo()) {
              pushToast('Deshacer aplicado', 'success')
            }
          }}
          onRedo={() => {
            if (redo()) {
              pushToast('Rehacer aplicado', 'success')
            }
          }}
        />

        <AllocationAlertsHome
          thresholdPct={thresholdPct}
          alerts={allocationAlerts}
          onOpenConfig={() => setIsTargetsOpen(true)}
        />

      </main>

      <SettingsModal
        isOpen={isSettingsOpen}
        settings={settings}
        onClose={() => setIsSettingsOpen(false)}
        onSave={(nextSettings) => {
          updateSettings(nextSettings)
          pushToast('Ajustes actualizados', 'success')
        }}
      />

      <Modal
        opened={isTargetsOpen}
        onClose={() => setIsTargetsOpen(false)}
        title="Configurar objetivos de asignación"
        centered
        size="xl"
      >
        <AllocationTargetsPanel
          byType={chartsData.byType}
          bySubasset={chartsData.bySubasset}
          targets={targets}
          onTargetsChange={(nextTargets) => {
            updateTargets(nextTargets)
            pushToast('Objetivos actualizados', 'success')
          }}
          onClose={() => setIsTargetsOpen(false)}
        />
      </Modal>

      <ToastStack toasts={toasts} />
    </div>
  )
}

export default App
