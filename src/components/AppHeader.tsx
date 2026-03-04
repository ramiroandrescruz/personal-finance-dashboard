import { formatTime } from '../utils/number'

interface AppHeaderProps {
  lastSavedAt: number | null
  lastEditedAt: number | null
  syncMode: 'local' | 'firebase'
  cloudSyncError?: string | null
  lastCloudSyncAt?: number | null
  isCloudSyncing?: boolean
  onOpenSettings: () => void
  onResetData: () => void
  onRestoreDemo: () => void
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
  onResetData,
  onRestoreDemo,
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
        <button type="button" className="btn btn-secondary" onClick={onOpenSettings}>
          Ajustes
        </button>
        <button type="button" className="btn btn-tertiary" onClick={onToggleTheme}>
          Tema: {theme === 'dark' ? 'Oscuro' : 'Claro'}
        </button>
        <button type="button" className="btn btn-tertiary" onClick={onRestoreDemo}>
          Restaurar demo
        </button>
        <button type="button" className="btn btn-danger" onClick={onResetData}>
          Resetear datos
        </button>
        {onLogout ? (
          <button type="button" className="btn btn-tertiary" onClick={onLogout}>
            Cerrar sesión
          </button>
        ) : null}
      </div>
    </header>
  )
}
