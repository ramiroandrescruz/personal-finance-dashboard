import { formatTime } from '../utils/number'

interface AppHeaderProps {
  lastSavedAt: number | null
  lastEditedAt: number | null
  syncMode: 'local' | 'firebase'
  cloudSyncError?: string | null
  lastCloudSyncAt?: number | null
  isCloudSyncing?: boolean
  onOpenSettings: () => void
  onUndo: () => void
  onRedo: () => void
  canUndo: boolean
  canRedo: boolean
  onResetData: () => void
  theme: 'dark' | 'light'
  onToggleTheme: () => void
  userEmail?: string
  onLogout?: () => void
}

export const AppHeader = ({
  lastSavedAt,
  lastEditedAt,
  syncMode,
  cloudSyncError,
  lastCloudSyncAt,
  isCloudSyncing,
  onOpenSettings,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  onResetData,
  theme,
  onToggleTheme,
  userEmail,
  onLogout
}: AppHeaderProps) => {
  const persistenceLabel =
    syncMode === 'firebase'
      ? cloudSyncError
        ? 'Sync Firebase con error'
        : isCloudSyncing
          ? 'Sincronizando Firebase...'
          : 'Sync Firebase ✓'
      : 'Guardado local ✓'

  return (
    <header className="dashboard-header">
      <div>
        <h1>Personal Finance Dashboard</h1>
        <p className="muted-text">
          {persistenceLabel} · Última edición: {formatTime(lastEditedAt)} · Último guardado: {formatTime(lastSavedAt)}
          {syncMode === 'firebase' ? ` · Última sync cloud: ${formatTime(lastCloudSyncAt ?? lastSavedAt)}` : ''}
        </p>
        {cloudSyncError ? (
          <p className="sync-error-text" role="status">
            Sync Firebase: {cloudSyncError}
          </p>
        ) : null}
      </div>

      <div className="header-actions">
        {userEmail ? (
          <span className="user-pill" title={userEmail}>
            {userEmail}
          </span>
        ) : null}
        <button type="button" className="pf-btn pf-btn-secondary" onClick={onOpenSettings}>
          <span className="pf-btn-label">Ajustes</span>
        </button>
        <button
          type="button"
          className={`pf-btn pf-btn-tertiary ${!canUndo ? 'is-disabled' : ''}`}
          aria-disabled={!canUndo}
          onClick={() => {
            if (!canUndo) {
              return
            }

            onUndo()
          }}
          title="Ctrl/Cmd + Z"
        >
          <span className="pf-btn-label">Deshacer</span>
        </button>
        <button
          type="button"
          className={`pf-btn pf-btn-tertiary ${!canRedo ? 'is-disabled' : ''}`}
          aria-disabled={!canRedo}
          onClick={() => {
            if (!canRedo) {
              return
            }

            onRedo()
          }}
          title="Ctrl/Cmd + Shift + Z"
        >
          <span className="pf-btn-label">Rehacer</span>
        </button>
        <button type="button" className="pf-btn pf-btn-tertiary" onClick={onToggleTheme}>
          <span className="pf-btn-label">Tema: {theme === 'dark' ? 'Oscuro' : 'Claro'}</span>
        </button>
        <button type="button" className="pf-btn pf-btn-danger" onClick={onResetData}>
          <span className="pf-btn-label">Resetear datos</span>
        </button>
        {onLogout ? (
          <button type="button" className="pf-btn pf-btn-tertiary" onClick={onLogout}>
            <span className="pf-btn-label">Cerrar sesión</span>
          </button>
        ) : null}
      </div>
    </header>
  )
}
