import type { AllocationTargets, HoldingType } from '../types'
import { HOLDING_TYPES } from '../types'
import { buildDeviationRows, summarizeAlerts } from '../utils/allocation'
import { clampTargetPercent } from '../utils/allocationTargets'
import { formatUsd, formatPlainNumber } from '../utils/number'

interface DistributionPoint {
  name: string
  value: number
}

interface AllocationTargetsPanelProps {
  byType: DistributionPoint[]
  bySubasset: DistributionPoint[]
  targets: AllocationTargets
  onTargetsChange: (targets: AllocationTargets) => void
  onClose?: () => void
}

const sumValues = (values: number[]): number => values.reduce((accumulator, value) => accumulator + value, 0)

const updateTargetMap = (map: Record<string, number>, key: string, value: number): Record<string, number> => {
  const next = { ...map }

  if (!Number.isFinite(value) || value <= 0) {
    delete next[key]
    return next
  }

  next[key] = clampTargetPercent(value)
  return next
}

export const AllocationTargetsPanel = ({
  byType,
  bySubasset,
  targets,
  onTargetsChange,
  onClose
}: AllocationTargetsPanelProps) => {
  const threshold = clampTargetPercent(targets.alertThresholdPct)

  const typeRows = buildDeviationRows(byType, targets.byType, threshold)
  const subassetRows = buildDeviationRows(bySubasset, targets.bySubasset, threshold, { onlyWithTarget: true })

  const alerts = summarizeAlerts([...typeRows, ...subassetRows])

  const typeTargetSum = sumValues(Object.values(targets.byType).map((value) => value ?? 0))
  const subassetTargetSum = sumValues(Object.values(targets.bySubasset))

  const allSubassetKeys = Array.from(new Set([...Object.keys(targets.bySubasset), ...bySubasset.map((row) => row.name)])).sort((a, b) =>
    a.localeCompare(b, 'es', { sensitivity: 'base' })
  )

  return (
    <section className="allocation-panel" aria-label="Objetivos de asignación">
      <div className="allocation-header">
        <div>
          <h2>Objetivos de Asignación</h2>
          <p className="muted-text">Definí metas y detectá desvíos automáticamente</p>
        </div>

        <div className="allocation-header-actions">
          <div className="allocation-threshold">
            <label htmlFor="alert-threshold">Umbral alerta (%)</label>
            <input
              id="alert-threshold"
              type="number"
              step="0.1"
              min="0"
              max="100"
              value={formatPlainNumber(threshold).replace(',', '.')}
              onChange={(event) => {
                const parsed = Number(event.target.value)
                onTargetsChange({
                  ...targets,
                  alertThresholdPct: clampTargetPercent(Number.isFinite(parsed) ? parsed : 0)
                })
              }}
            />
          </div>
          {onClose ? (
            <button type="button" className="pf-btn pf-btn-tertiary" onClick={onClose}>
              Cerrar
            </button>
          ) : null}
        </div>
      </div>

      <div className={`allocation-alert-summary ${alerts.alerts > 0 ? 'has-alert' : 'ok'}`}>
        {alerts.alerts > 0
          ? `${alerts.alerts} desvíos superan el umbral de ${formatPlainNumber(threshold)}%`
          : `Sin desvíos críticos (umbral ${formatPlainNumber(threshold)}%)`}
      </div>

      <div className="allocation-grid">
        <article className="allocation-card">
          <h3>Objetivos por Tipo</h3>
          <p className="muted-text">Suma objetivo: {formatPlainNumber(typeTargetSum)}%</p>

          <div className="allocation-targets-list">
            {HOLDING_TYPES.map((type) => (
              <label key={type} className="allocation-target-row">
                <span>{type}</span>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={targets.byType[type] ?? ''}
                  placeholder="0"
                  onChange={(event) => {
                    const parsed = Number(event.target.value)
                    const nextByType = updateTargetMap(targets.byType as Record<string, number>, type, parsed)

                    onTargetsChange({
                      ...targets,
                      byType: nextByType as Partial<Record<HoldingType, number>>
                    })
                  }}
                />
              </label>
            ))}
          </div>

          <div className="allocation-table-wrap">
            <table className="allocation-table">
              <thead>
                <tr>
                  <th>Tipo</th>
                  <th>Actual</th>
                  <th>Objetivo</th>
                  <th>Desvío</th>
                  <th>USD</th>
                </tr>
              </thead>
              <tbody>
                {typeRows.map((row) => (
                  <tr key={row.name}>
                    <td>{row.name}</td>
                    <td>{formatPlainNumber(row.currentPct)}%</td>
                    <td>{formatPlainNumber(row.targetPct)}%</td>
                    <td>
                      <span
                        className={`deviation-pill ${row.isAlert ? 'is-alert' : ''} ${
                          row.deviationPct > 0 ? 'is-positive' : row.deviationPct < 0 ? 'is-negative' : ''
                        }`}
                      >
                        {row.deviationPct > 0 ? '+' : ''}
                        {formatPlainNumber(row.deviationPct)}%
                      </span>
                    </td>
                    <td>{formatUsd(row.usdValue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>

        <article className="allocation-card">
          <h3>Objetivos por Subactivo</h3>
          <p className="muted-text">
            Suma objetivo: {formatPlainNumber(subassetTargetSum)}% · opcional (solo alerta si tiene target)
          </p>

          <div className="allocation-targets-list allocation-targets-list-subasset">
            {allSubassetKeys.length === 0 ? <p className="muted-text">No hay subactivos en los filtros actuales.</p> : null}

            {allSubassetKeys.map((subasset) => (
              <label key={subasset} className="allocation-target-row">
                <span>{subasset}</span>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={targets.bySubasset[subasset] ?? ''}
                  placeholder="0"
                  onChange={(event) => {
                    const parsed = Number(event.target.value)
                    const nextBySubasset = updateTargetMap(targets.bySubasset, subasset, parsed)

                    onTargetsChange({
                      ...targets,
                      bySubasset: nextBySubasset
                    })
                  }}
                />
              </label>
            ))}
          </div>

          <div className="allocation-table-wrap">
            <table className="allocation-table">
              <thead>
                <tr>
                  <th>Subactivo</th>
                  <th>Actual</th>
                  <th>Objetivo</th>
                  <th>Desvío</th>
                  <th>USD</th>
                </tr>
              </thead>
              <tbody>
                {subassetRows.map((row) => (
                  <tr key={row.name}>
                    <td>{row.name}</td>
                    <td>{formatPlainNumber(row.currentPct)}%</td>
                    <td>{formatPlainNumber(row.targetPct)}%</td>
                    <td>
                      <span
                        className={`deviation-pill ${row.isAlert ? 'is-alert' : ''} ${
                          row.deviationPct > 0 ? 'is-positive' : row.deviationPct < 0 ? 'is-negative' : ''
                        }`}
                      >
                        {row.deviationPct > 0 ? '+' : ''}
                        {formatPlainNumber(row.deviationPct)}%
                      </span>
                    </td>
                    <td>{formatUsd(row.usdValue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>
      </div>
    </section>
  )
}
