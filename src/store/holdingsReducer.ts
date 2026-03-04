import type { AllocationTargets, HoldingRow, HoldingsState, Settings } from '../types'

export type HoldingsAction =
  | { type: 'HYDRATE'; payload: { rows: HoldingRow[]; settings: Settings; targets: AllocationTargets } }
  | { type: 'ADD_ROW'; payload: HoldingRow }
  | { type: 'UPDATE_ROW'; payload: { id: string; patch: Partial<Omit<HoldingRow, 'id'>> } }
  | { type: 'DELETE_ROW'; payload: { id: string } }
  | { type: 'SET_SETTINGS'; payload: Settings }
  | { type: 'SET_TARGETS'; payload: AllocationTargets }
  | { type: 'RESET_DATA'; payload: { rows: HoldingRow[]; settings: Settings; targets: AllocationTargets } }

const withEditTimestamp = (state: Omit<HoldingsState, 'lastEditedAt'>): HoldingsState => ({
  ...state,
  lastEditedAt: Date.now()
})

export const holdingsReducer = (state: HoldingsState, action: HoldingsAction): HoldingsState => {
  switch (action.type) {
    case 'HYDRATE': {
      return {
        rows: action.payload.rows,
        settings: action.payload.settings,
        targets: action.payload.targets,
        lastEditedAt: null
      }
    }

    case 'ADD_ROW': {
      return withEditTimestamp({
        rows: [...state.rows, action.payload],
        settings: state.settings,
        targets: state.targets
      })
    }

    case 'UPDATE_ROW': {
      let hasChanges = false

      const nextRows = state.rows.map((row) => {
        if (row.id !== action.payload.id) {
          return row
        }

        hasChanges = true
        return {
          ...row,
          ...action.payload.patch
        }
      })

      if (!hasChanges) {
        return state
      }

      return withEditTimestamp({
        rows: nextRows,
        settings: state.settings,
        targets: state.targets
      })
    }

    case 'DELETE_ROW': {
      const nextRows = state.rows.filter((row) => row.id !== action.payload.id)

      if (nextRows.length === state.rows.length) {
        return state
      }

      return withEditTimestamp({
        rows: nextRows,
        settings: state.settings,
        targets: state.targets
      })
    }

    case 'SET_SETTINGS': {
      return withEditTimestamp({
        rows: state.rows,
        settings: action.payload,
        targets: state.targets
      })
    }

    case 'SET_TARGETS': {
      return withEditTimestamp({
        rows: state.rows,
        settings: state.settings,
        targets: action.payload
      })
    }

    case 'RESET_DATA': {
      return withEditTimestamp({
        rows: action.payload.rows,
        settings: action.payload.settings,
        targets: action.payload.targets
      })
    }

    default:
      return state
  }
}
