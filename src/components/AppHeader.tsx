import { formatTime } from '../utils/number'
import { AppButton } from './ui/AppButton'

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
        <AppButton tone="secondary" className="header-action-button" onClick={onOpenSettings}>
          Ajustes
        </AppButton>
        <AppButton
          tone="tertiary"
          className="header-action-button"
          aria-disabled={!canUndo}
          onClick={() => {
            if (!canUndo) {
              return
            }

            onUndo()
          }}
          title="Ctrl/Cmd + Z"
        >
          Deshacer
        </AppButton>
        <AppButton
          tone="tertiary"
          className="header-action-button"
          aria-disabled={!canRedo}
          onClick={() => {
            if (!canRedo) {
              return
            }

            onRedo()
          }}
          title="Ctrl/Cmd + Shift + Z"
        >
          Rehacer
        </AppButton>
        <AppButton tone="tertiary" className="header-action-button" onClick={onToggleTheme}>
          Tema: {theme === 'dark' ? 'Oscuro' : 'Claro'}
        </AppButton>
        <AppButton tone="danger" className="header-action-button" onClick={onResetData}>
          Resetear datos
        </AppButton>
        {onLogout ? (
          <AppButton tone="tertiary" className="header-action-button" onClick={onLogout}>
            Cerrar sesión
          </AppButton>
        ) : null}
      </div>
    </header>
  )
}
