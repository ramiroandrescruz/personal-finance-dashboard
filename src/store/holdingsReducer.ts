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
  | { type: 'UPDATE_MOVEMENT'; payload: { id: string; patch: Partial<Omit<HoldingMovement, 'id'>> } }
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

    case 'UPDATE_MOVEMENT': {
      let hasChanges = false
      const source = state.transactions.find((movement) => movement.id === action.payload.id)
      const linkedId = source?.linkedMovementId

      const hasLinkedSharedPatch = Boolean(
        linkedId &&
          (
            'date' in action.payload.patch ||
            'moneda' in action.payload.patch ||
            'monto' in action.payload.patch ||
            'cantidad' in action.payload.patch ||
            'tipo' in action.payload.patch ||
            'subactivo' in action.payload.patch ||
            'liquidity' in action.payload.patch ||
            'tags' in action.payload.patch ||
            'note' in action.payload.patch ||
            'valuationDate' in action.payload.patch ||
            'valuationCurrency' in action.payload.patch ||
            'valuationSource' in action.payload.patch
          )
      )

      const linkedPatch: Partial<Omit<HoldingMovement, 'id'>> = hasLinkedSharedPatch
        ? {
            ...(('date' in action.payload.patch ? { date: action.payload.patch.date } : {}) as Partial<Omit<HoldingMovement, 'id'>>),
            ...(('moneda' in action.payload.patch ? { moneda: action.payload.patch.moneda } : {}) as Partial<Omit<HoldingMovement, 'id'>>),
            ...(('monto' in action.payload.patch ? { monto: action.payload.patch.monto } : {}) as Partial<Omit<HoldingMovement, 'id'>>),
            ...(('cantidad' in action.payload.patch ? { cantidad: action.payload.patch.cantidad } : {}) as Partial<Omit<HoldingMovement, 'id'>>),
            ...(('tipo' in action.payload.patch ? { tipo: action.payload.patch.tipo } : {}) as Partial<Omit<HoldingMovement, 'id'>>),
            ...(('subactivo' in action.payload.patch ? { subactivo: action.payload.patch.subactivo } : {}) as Partial<Omit<HoldingMovement, 'id'>>),
            ...(('liquidity' in action.payload.patch ? { liquidity: action.payload.patch.liquidity } : {}) as Partial<Omit<HoldingMovement, 'id'>>),
            ...(('tags' in action.payload.patch ? { tags: action.payload.patch.tags } : {}) as Partial<Omit<HoldingMovement, 'id'>>),
            ...(('note' in action.payload.patch ? { note: action.payload.patch.note } : {}) as Partial<Omit<HoldingMovement, 'id'>>),
            ...(('valuationDate' in action.payload.patch ? { valuationDate: action.payload.patch.valuationDate } : {}) as Partial<Omit<HoldingMovement, 'id'>>),
            ...(('valuationCurrency' in action.payload.patch
              ? { valuationCurrency: action.payload.patch.valuationCurrency }
              : {}) as Partial<Omit<HoldingMovement, 'id'>>),
            ...(('valuationSource' in action.payload.patch ? { valuationSource: action.payload.patch.valuationSource } : {}) as Partial<Omit<HoldingMovement, 'id'>>)
          }
        : {}

      const nextTransactions = state.transactions.map((movement) => {
        if (movement.id !== action.payload.id) {
          if (linkedId && movement.id === linkedId && hasLinkedSharedPatch) {
            hasChanges = true
            return normalizeMovement({
              ...movement,
              ...linkedPatch
            })
          }

          return movement
        }

        hasChanges = true
        return normalizeMovement({
          ...movement,
          ...action.payload.patch
        })
      })

      if (!hasChanges) {
        return state
      }

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
