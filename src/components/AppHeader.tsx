import { Menu } from '@mantine/core'
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
  onResetData,
  theme,
  onToggleTheme,
  userEmail,
  onLogout
}: AppHeaderProps) => {
  const syncStatus =
    syncMode === 'firebase'
      ? cloudSyncError
        ? 'Error de sync cloud'
        : isCloudSyncing
          ? 'Sincronizando...'
          : 'Cloud sincronizado'
      : 'Guardado local'

  return (
    <header className="dashboard-header">
      <div className="header-brand">
        <h1>Personal Finance Dashboard</h1>
        <p className="muted-text">
          {syncStatus} · Editado {formatTime(lastEditedAt)} · Guardado {formatTime(lastSavedAt)}
          {syncMode === 'firebase' ? ` · Última sync cloud: ${formatTime(lastCloudSyncAt ?? lastSavedAt)}` : ''}
        </p>
        {cloudSyncError ? (
          <p className="sync-error-text" role="status">
            Sync Firebase: {cloudSyncError}
          </p>
        ) : null}
      </div>

      <div className="header-actions header-actions-compact">
        <AppButton tone="tertiary" className="header-action-button" onClick={onToggleTheme}>
          {theme === 'dark' ? 'Modo oscuro' : 'Modo claro'}
        </AppButton>

        <Menu shadow="md" width={230} position="bottom-end" withinPortal>
          <Menu.Target>
            <AppButton tone="tertiary" className="header-action-button">
              {userEmail ? `Cuenta · ${userEmail}` : 'Menú'}
            </AppButton>
          </Menu.Target>
          <Menu.Dropdown>
            <Menu.Label>{userEmail ? userEmail : 'Acciones'}</Menu.Label>
            <Menu.Item onClick={onOpenSettings}>Ajustes</Menu.Item>
            <Menu.Item color="red" onClick={onResetData}>
              Resetear datos
            </Menu.Item>
            {onLogout ? <Menu.Item onClick={onLogout}>Cerrar sesión</Menu.Item> : null}
          </Menu.Dropdown>
        </Menu>
      </div>
    </header>
  )
}
