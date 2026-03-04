import type { AllocationDeviationRow } from '../utils/allocation'
import { formatPlainNumber, formatUsd } from '../utils/number'

interface AllocationAlertsHomeProps {
  thresholdPct: number
  alerts: Array<AllocationDeviationRow & { scope: 'Tipo' | 'Subactivo' }>
  onOpenConfig: () => void
}

export const AllocationAlertsHome = ({ thresholdPct, alerts, onOpenConfig }: AllocationAlertsHomeProps) => {
  const topAlerts = alerts.slice(0, 6)

  return (
    <section className="allocation-alerts-home" aria-label="Alertas de desvío">
      <div className="allocation-alerts-home-header">
        <div>
          <h2>Alertas de Asignación</h2>
          <p className="muted-text">Mostrando desvíos mayores a {formatPlainNumber(thresholdPct)}%</p>
        </div>

        <button type="button" className="btn btn-secondary" onClick={onOpenConfig}>
          Configurar objetivos
        </button>
      </div>

      {alerts.length === 0 ? (
        <p className="allocation-alerts-ok">Sin alertas activas para el filtro actual.</p>
      ) : (
        <div className="allocation-alerts-list">
          {topAlerts.map((row) => (
            <article key={`${row.scope}-${row.name}`} className="allocation-alert-item">
              <div>
                <span className="allocation-alert-scope">{row.scope}</span>
                <h3>{row.name}</h3>
              </div>
              <p>
                Desvío: {row.deviationPct > 0 ? '+' : ''}
                {formatPlainNumber(row.deviationPct)}% · Actual {formatPlainNumber(row.currentPct)}% · Objetivo{' '}
                {formatPlainNumber(row.targetPct)}% · {formatUsd(row.usdValue)}
              </p>
            </article>
          ))}
          {alerts.length > topAlerts.length ? (
            <p className="muted-text">Y {alerts.length - topAlerts.length} alertas más.</p>
          ) : null}
        </div>
      )}
    </section>
  )
}
