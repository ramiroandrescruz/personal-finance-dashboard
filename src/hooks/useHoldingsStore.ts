import { useCallback, useEffect, useMemo, useReducer, useState } from 'react'
import { cloneDemoRows, DEFAULT_SETTINGS } from '../data/demo'
import { holdingsReducer } from '../store/holdingsReducer'
import type { AllocationTargets, HoldingRow, HoldingsState, Settings } from '../types'
import { DEFAULT_ALLOCATION_TARGETS, sanitizeTargets } from '../utils/allocationTargets'
import { loadCloudDashboardData, saveCloudDashboardData } from '../utils/firebaseStorage'
import { loadDashboardData, saveDashboardData } from '../utils/storage'
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
      lastEditedAt: null
    })
  )
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(initialPersisted.updatedAt)
  const [syncMode, setSyncMode] = useState<SyncMode>(cloudSyncEnabled && Boolean(userId) ? 'firebase' : 'local')
  const [cloudSyncError, setCloudSyncError] = useState<string | null>(null)
  const [isCloudSyncing, setIsCloudSyncing] = useState(false)
  const [lastCloudSyncAt, setLastCloudSyncAt] = useState<number | null>(null)
  const [isCloudReady, setIsCloudReady] = useState(!(cloudSyncEnabled && userId))

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
              targets: remote.targets
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
    [state.rows, state.settings, state.targets, cloudSyncEnabled, userId, isCloudReady]
  )

  const addRow = useCallback((draft: Omit<HoldingRow, 'id'>) => {
    dispatch({
      type: 'ADD_ROW',
      payload: {
        ...draft,
        id: generateId()
      }
    })
  }, [])

  const updateRow = useCallback((id: string, patch: Partial<Omit<HoldingRow, 'id'>>) => {
    dispatch({ type: 'UPDATE_ROW', payload: { id, patch } })
  }, [])

  const deleteRow = useCallback((id: string) => {
    dispatch({ type: 'DELETE_ROW', payload: { id } })
  }, [])

  const restoreDemo = useCallback(() => {
    dispatch({
      type: 'RESET_DATA',
      payload: {
        rows: cloneDemoRows(),
        settings: { ...DEFAULT_SETTINGS },
        targets: { ...DEFAULT_ALLOCATION_TARGETS, byType: {}, bySubasset: {} }
      }
    })
  }, [])

  const resetData = useCallback(() => {
    dispatch({
      type: 'RESET_DATA',
      payload: {
        rows: [],
        settings: { ...DEFAULT_SETTINGS },
        targets: { ...DEFAULT_ALLOCATION_TARGETS, byType: {}, bySubasset: {} }
      }
    })
  }, [])

  const updateSettings = useCallback((settings: Settings) => {
    dispatch({ type: 'SET_SETTINGS', payload: settings })
  }, [])

  const updateTargets = useCallback((targets: AllocationTargets) => {
    dispatch({ type: 'SET_TARGETS', payload: sanitizeTargets(targets) })
  }, [])

  return {
    rows: state.rows,
    settings: state.settings,
    targets: state.targets,
    lastEditedAt: state.lastEditedAt,
    lastSavedAt,
    syncMode,
    isCloudSyncing,
    cloudSyncError,
    lastCloudSyncAt,
    addRow,
    updateRow,
    deleteRow,
    restoreDemo,
    resetData,
    updateSettings,
    updateTargets
  }
}
