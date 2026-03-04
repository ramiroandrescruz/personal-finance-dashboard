import { useCallback, useEffect, useMemo, useReducer, useState } from 'react'
import { cloneDemoRows, DEFAULT_SETTINGS } from '../data/demo'
import { holdingsReducer, type HoldingsAction } from '../store/holdingsReducer'
import type {
  AllocationTargets,
  DashboardFilterState,
  HoldingRow,
  HoldingsState,
  PortfolioSnapshot,
  SavedDashboardView,
  Settings
} from '../types'
import { DEFAULT_ALLOCATION_TARGETS, sanitizeTargets } from '../utils/allocationTargets'
import { loadCloudDashboardData, saveCloudDashboardData } from '../utils/firebaseStorage'
import { getSnapshotDateKey } from '../utils/snapshots'
import { loadDashboardData, saveDashboardData } from '../utils/storage'
import { normalizeTags } from '../utils/tags'
import { useDebouncedEffect } from './useDebouncedEffect'

const createFallbackId = (): string => `${Date.now()}-${Math.random().toString(16).slice(2)}`

const generateId = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }

  return createFallbackId()
}

type SyncMode = 'local' | 'firebase'

interface UseHoldingsStoreOptions {
  userId?: string
  cloudSyncEnabled?: boolean
}

interface EditableStateSnapshot {
  rows: HoldingRow[]
  settings: Settings
  targets: AllocationTargets
  snapshots: PortfolioSnapshot[]
  savedViews: SavedDashboardView[]
}

const HISTORY_LIMIT = 60

const cloneFilterState = (filters: DashboardFilterState): DashboardFilterState => ({
  searchTerm: filters.searchTerm,
  typeFilters: [...filters.typeFilters],
  currencyFilters: [...filters.currencyFilters],
  subassetCategoryFilters: [...filters.subassetCategoryFilters],
  subassetFilters: [...filters.subassetFilters],
  tagFilters: [...filters.tagFilters]
})

const cloneSavedView = (view: SavedDashboardView): SavedDashboardView => ({
  id: view.id,
  name: view.name,
  filters: cloneFilterState(view.filters),
  createdAt: view.createdAt,
  updatedAt: view.updatedAt
})

const cloneEditableState = (state: EditableStateSnapshot): EditableStateSnapshot => ({
  rows: state.rows.map((row) => ({ ...row, tags: [...row.tags] })),
  settings: { ...state.settings },
  targets: {
    byType: { ...state.targets.byType },
    bySubasset: { ...state.targets.bySubasset },
    alertThresholdPct: state.targets.alertThresholdPct
  },
  snapshots: state.snapshots.map((snapshot) => ({ ...snapshot })),
  savedViews: state.savedViews.map(cloneSavedView)
})

const uniqueStrings = (values: string[]): string[] => {
  const seen = new Set<string>()
  const result: string[] = []

  values.forEach((value) => {
    const trimmed = value.trim()

    if (!trimmed) {
      return
    }

    const key = trimmed.toLowerCase()

    if (seen.has(key)) {
      return
    }

    seen.add(key)
    result.push(trimmed)
  })

  return result
}

const sanitizeFilterState = (filters: DashboardFilterState): DashboardFilterState => ({
  searchTerm: filters.searchTerm,
  typeFilters: Array.from(new Set(filters.typeFilters)),
  currencyFilters: uniqueStrings(filters.currencyFilters),
  subassetCategoryFilters: uniqueStrings(filters.subassetCategoryFilters),
  subassetFilters: uniqueStrings(filters.subassetFilters),
  tagFilters: uniqueStrings(filters.tagFilters)
})

const toErrorMessage = (error: unknown): string => {
  if (error instanceof Error && error.message.trim()) {
    return error.message
  }

  return 'Error desconocido de sincronización.'
}

export const useHoldingsStore = ({ userId, cloudSyncEnabled = false }: UseHoldingsStoreOptions = {}) => {
  const initialPersisted = useMemo(loadDashboardData, [])
  const [state, dispatch] = useReducer(
    holdingsReducer,
    initialPersisted,
    (persisted): HoldingsState => ({
      rows: persisted.rows,
      settings: persisted.settings,
      targets: persisted.targets,
      snapshots: persisted.snapshots,
      savedViews: persisted.savedViews,
      lastEditedAt: null
    })
  )
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(initialPersisted.updatedAt)
  const [syncMode, setSyncMode] = useState<SyncMode>(cloudSyncEnabled && Boolean(userId) ? 'firebase' : 'local')
  const [cloudSyncError, setCloudSyncError] = useState<string | null>(null)
  const [isCloudSyncing, setIsCloudSyncing] = useState(false)
  const [lastCloudSyncAt, setLastCloudSyncAt] = useState<number | null>(null)
  const [isCloudReady, setIsCloudReady] = useState(!(cloudSyncEnabled && userId))
  const [past, setPast] = useState<EditableStateSnapshot[]>([])
  const [future, setFuture] = useState<EditableStateSnapshot[]>([])

  const captureEditableState = useCallback((): EditableStateSnapshot => {
    return cloneEditableState({
      rows: state.rows,
      settings: state.settings,
      targets: state.targets,
      snapshots: state.snapshots,
      savedViews: state.savedViews
    })
  }, [state.rows, state.settings, state.targets, state.snapshots, state.savedViews])

  const dispatchWithHistory = useCallback(
    (action: HoldingsAction) => {
      const current = captureEditableState()
      setPast((previous) => [...previous.slice(-(HISTORY_LIMIT - 1)), current])
      setFuture([])
      dispatch(action)
    },
    [captureEditableState]
  )

  useEffect(() => {
    const shouldUseCloud = Boolean(cloudSyncEnabled && userId)

    setSyncMode(shouldUseCloud ? 'firebase' : 'local')
    setCloudSyncError(null)

    if (!shouldUseCloud || !userId) {
      setIsCloudReady(true)
      setIsCloudSyncing(false)
      return
    }

    let isCancelled = false

    const bootstrapCloudState = async () => {
      setIsCloudReady(false)
      setIsCloudSyncing(true)

      try {
        const remote = await loadCloudDashboardData(userId)
        const local = initialPersisted
        const localUpdatedAt = local.updatedAt ?? 0

        if (isCancelled) {
          return
        }

        if (!remote) {
          const bootstrapTimestamp = local.updatedAt ?? Date.now()

          await saveCloudDashboardData(userId, {
            ...local,
            updatedAt: bootstrapTimestamp
          })

          if (isCancelled) {
            return
          }

          setLastCloudSyncAt(bootstrapTimestamp)
          setCloudSyncError(null)
          return
        }

        const remoteUpdatedAt = remote.updatedAt ?? 0

        if (remoteUpdatedAt > localUpdatedAt) {
          dispatch({
            type: 'HYDRATE',
            payload: {
              rows: remote.rows,
              settings: remote.settings,
              targets: remote.targets,
              snapshots: remote.snapshots,
              savedViews: remote.savedViews
            }
          })

          setLastSavedAt(remote.updatedAt)
          saveDashboardData(remote)
          setLastCloudSyncAt(remote.updatedAt)
        } else if (localUpdatedAt > remoteUpdatedAt) {
          const bootstrapTimestamp = local.updatedAt ?? Date.now()

          await saveCloudDashboardData(userId, {
            ...local,
            updatedAt: bootstrapTimestamp
          })

          if (isCancelled) {
            return
          }

          setLastCloudSyncAt(bootstrapTimestamp)
        } else {
          setLastCloudSyncAt(remote.updatedAt)
        }

        setPast([])
        setFuture([])
        setCloudSyncError(null)
      } catch (error) {
        if (isCancelled) {
          return
        }

        setCloudSyncError(toErrorMessage(error))
      } finally {
        if (isCancelled) {
          return
        }

        setIsCloudReady(true)
        setIsCloudSyncing(false)
      }
    }

    void bootstrapCloudState()

    return () => {
      isCancelled = true
    }
  }, [cloudSyncEnabled, initialPersisted, userId])

  useDebouncedEffect(
    () => {
      if (cloudSyncEnabled && userId && !isCloudReady) {
        return
      }

      const savedAt = Date.now()
      const payload = {
        rows: state.rows,
        settings: state.settings,
        targets: state.targets,
        snapshots: state.snapshots,
        savedViews: state.savedViews,
        updatedAt: savedAt
      }

      saveDashboardData(payload)
      setLastSavedAt(savedAt)

      if (!cloudSyncEnabled || !userId) {
        return
      }

      setIsCloudSyncing(true)
      setCloudSyncError(null)

      void saveCloudDashboardData(userId, payload)
        .then(() => {
          setLastCloudSyncAt(savedAt)
        })
        .catch((error) => {
          setCloudSyncError(toErrorMessage(error))
        })
        .finally(() => {
          setIsCloudSyncing(false)
        })
    },
    350,
    [state.rows, state.settings, state.targets, state.snapshots, state.savedViews, cloudSyncEnabled, userId, isCloudReady]
  )

  const addRow = useCallback(
    (draft: Omit<HoldingRow, 'id'>) => {
      dispatchWithHistory({
        type: 'ADD_ROW',
        payload: {
          ...draft,
          tags: normalizeTags(draft.tags),
          id: generateId()
        }
      })
    },
    [dispatchWithHistory]
  )

  const duplicateRow = useCallback(
    (id: string): HoldingRow | null => {
      const source = state.rows.find((row) => row.id === id)

      if (!source) {
        return null
      }

      const duplicated: HoldingRow = {
        ...source,
        id: generateId(),
        cuenta: `${source.cuenta} (copia)`,
        tags: [...source.tags]
      }

      dispatchWithHistory({ type: 'DUPLICATE_ROW', payload: duplicated })
      return duplicated
    },
    [dispatchWithHistory, state.rows]
  )

  const updateRow = useCallback(
    (id: string, patch: Partial<Omit<HoldingRow, 'id'>>) => {
      const normalizedPatch = patch.tags ? { ...patch, tags: normalizeTags(patch.tags) } : patch
      dispatchWithHistory({ type: 'UPDATE_ROW', payload: { id, patch: normalizedPatch } })
    },
    [dispatchWithHistory]
  )

  const bulkUpdateRows = useCallback(
    (ids: string[], patch: Partial<Omit<HoldingRow, 'id'>>) => {
      if (ids.length === 0) {
        return
      }

      const normalizedPatch = patch.tags ? { ...patch, tags: normalizeTags(patch.tags) } : patch
      dispatchWithHistory({ type: 'BULK_UPDATE_ROWS', payload: { ids, patch: normalizedPatch } })
    },
    [dispatchWithHistory]
  )

  const deleteRow = useCallback(
    (id: string) => {
      dispatchWithHistory({ type: 'DELETE_ROW', payload: { id } })
    },
    [dispatchWithHistory]
  )

  const restoreDemo = useCallback(() => {
    dispatchWithHistory({
      type: 'RESET_DATA',
      payload: {
        rows: cloneDemoRows(),
        settings: { ...DEFAULT_SETTINGS },
        targets: { ...DEFAULT_ALLOCATION_TARGETS, byType: {}, bySubasset: {} }
      }
    })
  }, [dispatchWithHistory])

  const resetData = useCallback(() => {
    dispatchWithHistory({
      type: 'RESET_DATA',
      payload: {
        rows: [],
        settings: { ...DEFAULT_SETTINGS },
        targets: { ...DEFAULT_ALLOCATION_TARGETS, byType: {}, bySubasset: {} }
      }
    })
  }, [dispatchWithHistory])

  const updateSettings = useCallback(
    (settings: Settings) => {
      dispatchWithHistory({ type: 'SET_SETTINGS', payload: settings })
    },
    [dispatchWithHistory]
  )

  const updateTargets = useCallback(
    (targets: AllocationTargets) => {
      dispatchWithHistory({ type: 'SET_TARGETS', payload: sanitizeTargets(targets) })
    },
    [dispatchWithHistory]
  )

  const addSnapshot = useCallback(
    (snapshot: Omit<PortfolioSnapshot, 'date' | 'capturedAt'> & { date?: string }) => {
      const capturedAt = Date.now()

      dispatchWithHistory({
        type: 'UPSERT_SNAPSHOT',
        payload: {
          date: snapshot.date ?? getSnapshotDateKey(capturedAt),
          totalUsdOficial: snapshot.totalUsdOficial,
          totalUsdFinanciero: snapshot.totalUsdFinanciero,
          arsUsdOficial: snapshot.arsUsdOficial,
          arsUsdFinanciero: snapshot.arsUsdFinanciero,
          capturedAt
        }
      })
    },
    [dispatchWithHistory]
  )

  const upsertSavedView = useCallback(
    (payload: { id?: string; name: string; filters: DashboardFilterState }) => {
      const now = Date.now()
      const normalizedName = payload.name.trim()

      if (!normalizedName) {
        return null
      }

      const normalizedFilters = sanitizeFilterState(payload.filters)
      const existing = payload.id ? state.savedViews.find((view) => view.id === payload.id) : null

      const nextView: SavedDashboardView = {
        id: existing?.id ?? generateId(),
        name: normalizedName,
        filters: normalizedFilters,
        createdAt: existing?.createdAt ?? now,
        updatedAt: now
      }

      const nextViews = [...state.savedViews.filter((view) => view.id !== nextView.id), nextView].sort((left, right) =>
        left.name.localeCompare(right.name, 'es', { sensitivity: 'base' })
      )

      dispatchWithHistory({ type: 'SET_SAVED_VIEWS', payload: nextViews })
      return nextView
    },
    [dispatchWithHistory, state.savedViews]
  )

  const deleteSavedView = useCallback(
    (id: string) => {
      const nextViews = state.savedViews.filter((view) => view.id !== id)
      dispatchWithHistory({ type: 'SET_SAVED_VIEWS', payload: nextViews })
    },
    [dispatchWithHistory, state.savedViews]
  )

  const undo = useCallback((): boolean => {
    if (past.length === 0) {
      return false
    }

    const previous = past[past.length - 1]

    if (!previous) {
      return false
    }

    const current = captureEditableState()
    setPast((items) => items.slice(0, -1))
    setFuture((items) => [current, ...items].slice(0, HISTORY_LIMIT))
    dispatch({
      type: 'HYDRATE',
      payload: cloneEditableState(previous)
    })
    return true
  }, [captureEditableState, past])

  const redo = useCallback((): boolean => {
    if (future.length === 0) {
      return false
    }

    const [next, ...rest] = future

    if (!next) {
      return false
    }

    const current = captureEditableState()
    setPast((items) => [...items.slice(-(HISTORY_LIMIT - 1)), current])
    setFuture(rest)
    dispatch({
      type: 'HYDRATE',
      payload: cloneEditableState(next)
    })
    return true
  }, [captureEditableState, future])

  return {
    rows: state.rows,
    settings: state.settings,
    targets: state.targets,
    snapshots: state.snapshots,
    savedViews: state.savedViews,
    lastEditedAt: state.lastEditedAt,
    lastSavedAt,
    syncMode,
    isCloudSyncing,
    cloudSyncError,
    lastCloudSyncAt,
    canUndo: past.length > 0,
    canRedo: future.length > 0,
    addRow,
    duplicateRow,
    updateRow,
    bulkUpdateRows,
    deleteRow,
    restoreDemo,
    resetData,
    updateSettings,
    updateTargets,
    addSnapshot,
    upsertSavedView,
    deleteSavedView,
    undo,
    redo
  }
}
