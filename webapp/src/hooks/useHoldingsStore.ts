import { useCallback, useMemo, useReducer, useState } from 'react'
import { cloneDemoRows, DEFAULT_SETTINGS } from '../data/demo'
import { holdingsReducer } from '../store/holdingsReducer'
import type { HoldingRow, HoldingsState, Settings } from '../types'
import { loadDashboardData, saveDashboardData } from '../utils/storage'
import { useDebouncedEffect } from './useDebouncedEffect'

const createFallbackId = (): string => `${Date.now()}-${Math.random().toString(16).slice(2)}`

const generateId = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }

  return createFallbackId()
}

export const useHoldingsStore = () => {
  const initialPersisted = useMemo(loadDashboardData, [])
  const [state, dispatch] = useReducer(
    holdingsReducer,
    initialPersisted,
    (persisted): HoldingsState => ({
      rows: persisted.rows,
      settings: persisted.settings,
      lastEditedAt: null
    })
  )
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(initialPersisted.updatedAt)

  useDebouncedEffect(
    () => {
      const savedAt = Date.now()
      saveDashboardData({
        rows: state.rows,
        settings: state.settings,
        updatedAt: savedAt
      })
      setLastSavedAt(savedAt)
    },
    350,
    [state.rows, state.settings]
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
        settings: { ...DEFAULT_SETTINGS }
      }
    })
  }, [])

  const resetData = useCallback(() => {
    dispatch({
      type: 'RESET_DATA',
      payload: {
        rows: [],
        settings: { ...DEFAULT_SETTINGS }
      }
    })
  }, [])

  const updateSettings = useCallback((settings: Settings) => {
    dispatch({ type: 'SET_SETTINGS', payload: settings })
  }, [])

  return {
    rows: state.rows,
    settings: state.settings,
    lastEditedAt: state.lastEditedAt,
    lastSavedAt,
    addRow,
    updateRow,
    deleteRow,
    restoreDemo,
    resetData,
    updateSettings
  }
}
