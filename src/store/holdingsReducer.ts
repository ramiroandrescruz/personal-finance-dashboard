import type {
  AllocationTargets,
  HoldingRow,
  HoldingsState,
  PortfolioSnapshot,
  SavedDashboardView,
  Settings
} from '../types'
import { upsertSnapshot } from '../utils/snapshots'

export type HoldingsAction =
  | {
      type: 'HYDRATE'
      payload: {
        rows: HoldingRow[]
        settings: Settings
        targets: AllocationTargets
        snapshots: PortfolioSnapshot[]
        savedViews: SavedDashboardView[]
      }
    }
  | { type: 'ADD_ROW'; payload: HoldingRow }
  | { type: 'DUPLICATE_ROW'; payload: HoldingRow }
  | { type: 'UPDATE_ROW'; payload: { id: string; patch: Partial<Omit<HoldingRow, 'id'>> } }
  | { type: 'BULK_UPDATE_ROWS'; payload: { ids: string[]; patch: Partial<Omit<HoldingRow, 'id'>> } }
  | { type: 'DELETE_ROW'; payload: { id: string } }
  | { type: 'SET_SETTINGS'; payload: Settings }
  | { type: 'SET_TARGETS'; payload: AllocationTargets }
  | { type: 'SET_SAVED_VIEWS'; payload: SavedDashboardView[] }
  | { type: 'UPSERT_SNAPSHOT'; payload: PortfolioSnapshot }
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
        snapshots: action.payload.snapshots,
        savedViews: action.payload.savedViews,
        lastEditedAt: null
      }
    }

    case 'ADD_ROW':
    case 'DUPLICATE_ROW': {
      return withEditTimestamp({
        rows: [...state.rows, action.payload],
        settings: state.settings,
        targets: state.targets,
        snapshots: state.snapshots,
        savedViews: state.savedViews
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
        targets: state.targets,
        snapshots: state.snapshots,
        savedViews: state.savedViews
      })
    }

    case 'BULK_UPDATE_ROWS': {
      const ids = new Set(action.payload.ids)

      if (ids.size === 0) {
        return state
      }

      let hasChanges = false

      const nextRows = state.rows.map((row) => {
        if (!ids.has(row.id)) {
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
        targets: state.targets,
        snapshots: state.snapshots,
        savedViews: state.savedViews
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
        targets: state.targets,
        snapshots: state.snapshots,
        savedViews: state.savedViews
      })
    }

    case 'SET_SETTINGS': {
      return withEditTimestamp({
        rows: state.rows,
        settings: action.payload,
        targets: state.targets,
        snapshots: state.snapshots,
        savedViews: state.savedViews
      })
    }

    case 'SET_TARGETS': {
      return withEditTimestamp({
        rows: state.rows,
        settings: state.settings,
        targets: action.payload,
        snapshots: state.snapshots,
        savedViews: state.savedViews
      })
    }

    case 'SET_SAVED_VIEWS': {
      return withEditTimestamp({
        rows: state.rows,
        settings: state.settings,
        targets: state.targets,
        snapshots: state.snapshots,
        savedViews: action.payload
      })
    }

    case 'UPSERT_SNAPSHOT': {
      return withEditTimestamp({
        rows: state.rows,
        settings: state.settings,
        targets: state.targets,
        snapshots: upsertSnapshot(state.snapshots, action.payload),
        savedViews: state.savedViews
      })
    }

    case 'RESET_DATA': {
      return withEditTimestamp({
        rows: action.payload.rows,
        settings: action.payload.settings,
        targets: action.payload.targets,
        snapshots: [],
        savedViews: state.savedViews
      })
    }

    default:
      return state
  }
}
