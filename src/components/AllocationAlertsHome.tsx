import type { AllocationDeviationRow } from '../utils/allocation'
import { formatPlainNumber, formatUsd } from '../utils/number'
import { AppButton } from './ui/AppButton'

interface AllocationAlertsHomeProps {
  thresholdPct: number
  alerts: Array<AllocationDeviationRow & { scope: 'Tipo' | 'Subactivo' }>
  onOpenConfig: () => void
}

type AlertSeverity = 'leve' | 'moderada' | 'alta'

const getAlertSeverity = (deviationPct: number, thresholdPct: number): AlertSeverity => {
  const absDeviation = Math.abs(deviationPct)

  if (absDeviation >= thresholdPct * 2.4) {
    return 'alta'
  }

  if (absDeviation >= thresholdPct * 1.6) {
    return 'moderada'
  }

  return 'leve'
}

export const AllocationAlertsHome = ({ thresholdPct, alerts, onOpenConfig }: AllocationAlertsHomeProps) => {
  const topAlerts = alerts.slice(0, 8)

  return (
    <section className="allocation-alerts-home allocation-alerts-home-compact" aria-label="Alertas de desvío">
      <div className="allocation-alerts-home-header">
        <div>
          <h2>Alertas de asignación</h2>
          <p className="muted-text">Desvíos mayores a {formatPlainNumber(thresholdPct)}%</p>
        </div>

        <AppButton type="button" tone="tertiary" onClick={onOpenConfig}>
          Configurar objetivos
        </AppButton>
      </div>

      {alerts.length === 0 ? (
        <p className="allocation-alerts-ok">Sin alertas activas para el filtro actual.</p>
      ) : (
        <div className="allocation-alerts-list allocation-alerts-list-compact">
          {topAlerts.map((row) => {
            const severity = getAlertSeverity(row.deviationPct, thresholdPct)

            return (
              <article key={`${row.scope}-${row.name}`} className={`allocation-alert-item severity-${severity}`}>
                <div className="allocation-alert-headline">
                  <span className="allocation-alert-scope">{row.scope}</span>
                  <h3>{row.name}</h3>
                  <span className={`severity-pill severity-${severity}`}>{severity}</span>
                </div>
                <p>
                  Actual {formatPlainNumber(row.currentPct)}% · Objetivo {formatPlainNumber(row.targetPct)}% · Diferencia{' '}
                  {row.deviationPct > 0 ? '+' : ''}
                  {formatPlainNumber(row.deviationPct)}% · {formatUsd(row.usdValue)}
                </p>
              </article>
            )
          })}
          {alerts.length > topAlerts.length ? <p className="muted-text">Y {alerts.length - topAlerts.length} alertas más.</p> : null}
        </div>
      )}
    </section>
  )
}
