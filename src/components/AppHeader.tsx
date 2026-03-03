import { formatTime } from '../utils/number'

interface AppHeaderProps {
  lastSavedAt: number | null
  lastEditedAt: number | null
  onOpenSettings: () => void
  onResetData: () => void
  onRestoreDemo: () => void
  userEmail?: string
  onLogout?: () => void
}

export const AppHeader = ({
  lastSavedAt,
  lastEditedAt,
  onOpenSettings,
  onResetData,
  onRestoreDemo,
  userEmail,
  onLogout
}: AppHeaderProps) => {
  return (
    <header className="dashboard-header">
      <div>
        <h1>Personal Finance Dashboard</h1>
        <p className="muted-text">
          Guardado local ✓ · Última edición: {formatTime(lastEditedAt)} · Último guardado: {formatTime(lastSavedAt)}
        </p>
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
