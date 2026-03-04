import type {
  AllocationTargets,
  HoldingMovement,
  HoldingRow,
  HoldingsState,
  PortfolioSnapshot,
  SavedDashboardView,
  Settings
} from '../types'
import { upsertSnapshot } from '../utils/snapshots'
import { normalizeMovement, rebuildRowsFromMovements } from '../utils/transactions'

export type HoldingsAction =
  | {
      type: 'HYDRATE'
      payload: {
        rows: HoldingRow[]
        transactions: HoldingMovement[]
        settings: Settings
        targets: AllocationTargets
        snapshots: PortfolioSnapshot[]
        savedViews: SavedDashboardView[]
      }
    }
  | { type: 'ADD_MOVEMENT'; payload: HoldingMovement }
  | { type: 'ADD_MOVEMENTS'; payload: HoldingMovement[] }
  | { type: 'DELETE_MOVEMENT'; payload: { id: string } }
  | { type: 'ADD_ROW'; payload: HoldingRow }
  | { type: 'DUPLICATE_ROW'; payload: HoldingRow }
  | { type: 'UPDATE_ROW'; payload: { id: string; patch: Partial<Omit<HoldingRow, 'id'>> } }
  | { type: 'BULK_UPDATE_ROWS'; payload: { ids: string[]; patch: Partial<Omit<HoldingRow, 'id'>> } }
  | { type: 'DELETE_ROW'; payload: { id: string } }
  | { type: 'SET_SETTINGS'; payload: Settings }
  | { type: 'SET_TARGETS'; payload: AllocationTargets }
  | { type: 'SET_SAVED_VIEWS'; payload: SavedDashboardView[] }
  | { type: 'UPSERT_SNAPSHOT'; payload: PortfolioSnapshot }
  | { type: 'RESET_DATA'; payload: { transactions: HoldingMovement[]; settings: Settings; targets: AllocationTargets } }

const withEditTimestamp = (state: Omit<HoldingsState, 'lastEditedAt'>): HoldingsState => ({
  ...state,
  lastEditedAt: Date.now()
})

export const holdingsReducer = (state: HoldingsState, action: HoldingsAction): HoldingsState => {
  switch (action.type) {
    case 'HYDRATE': {
      const normalizedTransactions = action.payload.transactions.map(normalizeMovement)

      return {
        rows: rebuildRowsFromMovements(normalizedTransactions),
        transactions: normalizedTransactions,
        settings: action.payload.settings,
        targets: action.payload.targets,
        snapshots: action.payload.snapshots,
        savedViews: action.payload.savedViews,
        lastEditedAt: null
      }
    }

    case 'ADD_MOVEMENT': {
      const nextTransactions = [...state.transactions, normalizeMovement(action.payload)]

      return withEditTimestamp({
        rows: rebuildRowsFromMovements(nextTransactions),
        transactions: nextTransactions,
        settings: state.settings,
        targets: state.targets,
        snapshots: state.snapshots,
        savedViews: state.savedViews
      })
    }

    case 'ADD_MOVEMENTS': {
      if (action.payload.length === 0) {
        return state
      }

      const nextTransactions = [...state.transactions, ...action.payload.map(normalizeMovement)]

      return withEditTimestamp({
        rows: rebuildRowsFromMovements(nextTransactions),
        transactions: nextTransactions,
        settings: state.settings,
        targets: state.targets,
        snapshots: state.snapshots,
        savedViews: state.savedViews
      })
    }

    case 'DELETE_MOVEMENT': {
      const linkedIds = new Set<string>()
      const source = state.transactions.find((movement) => movement.id === action.payload.id)

      if (!source) {
        return state
      }

      linkedIds.add(source.id)

      if (source.linkedMovementId) {
        linkedIds.add(source.linkedMovementId)
      }

      state.transactions.forEach((movement) => {
        if (movement.linkedMovementId && linkedIds.has(movement.linkedMovementId)) {
          linkedIds.add(movement.id)
        }
      })

      const nextTransactions = state.transactions.filter((movement) => !linkedIds.has(movement.id))

      return withEditTimestamp({
        rows: rebuildRowsFromMovements(nextTransactions),
        transactions: nextTransactions,
        settings: state.settings,
        targets: state.targets,
        snapshots: state.snapshots,
        savedViews: state.savedViews
      })
    }

    case 'ADD_ROW':
    case 'DUPLICATE_ROW': {
      return withEditTimestamp({
        rows: [...state.rows, action.payload],
        transactions: state.transactions,
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
        transactions: state.transactions,
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
        transactions: state.transactions,
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
        transactions: state.transactions,
        settings: state.settings,
        targets: state.targets,
        snapshots: state.snapshots,
        savedViews: state.savedViews
      })
    }

    case 'SET_SETTINGS': {
      return withEditTimestamp({
        rows: state.rows,
        transactions: state.transactions,
        settings: action.payload,
        targets: state.targets,
        snapshots: state.snapshots,
        savedViews: state.savedViews
      })
    }

    case 'SET_TARGETS': {
      return withEditTimestamp({
        rows: state.rows,
        transactions: state.transactions,
        settings: state.settings,
        targets: action.payload,
        snapshots: state.snapshots,
        savedViews: state.savedViews
      })
    }

    case 'SET_SAVED_VIEWS': {
      return withEditTimestamp({
        rows: state.rows,
        transactions: state.transactions,
        settings: state.settings,
        targets: state.targets,
        snapshots: state.snapshots,
        savedViews: action.payload
      })
    }

    case 'UPSERT_SNAPSHOT': {
      return withEditTimestamp({
        rows: state.rows,
        transactions: state.transactions,
        settings: state.settings,
        targets: state.targets,
        snapshots: upsertSnapshot(state.snapshots, action.payload),
        savedViews: state.savedViews
      })
    }

    case 'RESET_DATA': {
      return withEditTimestamp({
        rows: rebuildRowsFromMovements(action.payload.transactions),
        transactions: action.payload.transactions.map(normalizeMovement),
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
