import { type CSSProperties, useMemo } from 'react'
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { PortfolioSnapshot } from '../types'
import { buildSnapshotVariations, getSnapshotDateKey } from '../utils/snapshots'
import { formatPlainNumber, formatTime, formatUsd } from '../utils/number'
import { AppButton } from './ui/AppButton'

interface SnapshotHistorySectionProps {
  snapshots: PortfolioSnapshot[]
  onCaptureSnapshot: () => void
}

const toDate = (dateKey: string): Date => new Date(`${dateKey}T00:00:00`)

const formatDateLabel = (dateKey: string): string =>
  new Intl.DateTimeFormat('es-AR', {
    day: '2-digit',
    month: '2-digit'
  }).format(toDate(dateKey))

const formatDateLong = (dateKey: string): string =>
  new Intl.DateTimeFormat('es-AR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  }).format(toDate(dateKey))

const formatSignedUsd = (value: number): string => {
  const absValue = Math.abs(value)
  const formatted = formatUsd(absValue)

  if (value > 0) {
    return `+${formatted}`
  }

  if (value < 0) {
    return `-${formatted}`
  }

  return formatted
}

const formatSignedPct = (value: number | null): string => {
  if (value === null) {
    return '—'
  }

  const sign = value > 0 ? '+' : ''
  return `${sign}${formatPlainNumber(value)}%`
}

export const SnapshotHistorySection = ({ snapshots, onCaptureSnapshot }: SnapshotHistorySectionProps) => {
  const sortedSnapshots = useMemo(() => {
    return [...snapshots].sort((left, right) => left.date.localeCompare(right.date))
  }, [snapshots])

  const variations = useMemo(() => buildSnapshotVariations(sortedSnapshots), [sortedSnapshots])

  const latestSnapshot = sortedSnapshots[sortedSnapshots.length - 1] ?? null
  const todaySnapshotDate = getSnapshotDateKey()
  const hasTodaySnapshot = latestSnapshot?.date === todaySnapshotDate

  const chartData = useMemo(() => {
    return sortedSnapshots.map((snapshot) => ({
      ...snapshot,
      dateLabel: formatDateLabel(snapshot.date)
    }))
  }, [sortedSnapshots])

  const tooltipStyle: CSSProperties = {
    background: 'var(--tooltip-bg)',
    border: '1px solid var(--tooltip-border)',
    borderRadius: 10,
    boxShadow: 'var(--tooltip-shadow)',
    color: 'var(--tooltip-text)'
  }

  const tooltipTextStyle: CSSProperties = {
    color: 'var(--tooltip-text)'
  }

  const variationCards = [
    { label: 'Variación diaria', value: variations.daily },
    { label: 'Variación semanal', value: variations.weekly },
    { label: 'Variación mensual', value: variations.monthly }
  ] as const

  return (
    <section className="snapshot-section" aria-label="Snapshots de patrimonio">
      <div className="snapshot-header">
        <div>
          <h2>Snapshots de Patrimonio</h2>
          <p className="muted-text">Cierre manual diario (usa cartera completa, no filtros).</p>
          {latestSnapshot ? (
            <p className="muted-text">
              Último cierre: {formatDateLong(latestSnapshot.date)} · {formatTime(latestSnapshot.capturedAt)}
            </p>
          ) : (
            <p className="muted-text">Aún no hay snapshots guardados.</p>
          )}
        </div>

        <AppButton type="button" tone="primary" onClick={onCaptureSnapshot}>
          {hasTodaySnapshot ? 'Actualizar snapshot de hoy' : 'Guardar snapshot de hoy'}
        </AppButton>
      </div>

      <div className="snapshot-variations-grid">
        {variationCards.map((item) => {
          if (!item.value) {
            return (
              <article key={item.label} className="snapshot-variation-card">
                <h3>{item.label}</h3>
                <p className="snapshot-variation-empty">Sin base histórica suficiente.</p>
              </article>
            )
          }

          return (
            <article key={item.label} className="snapshot-variation-card">
              <h3>{item.label}</h3>
              <p className="muted-text">vs {formatDateLong(item.value.baseDate)}</p>
              <p className={`snapshot-variation-value ${item.value.financiero.delta > 0 ? 'is-positive' : item.value.financiero.delta < 0 ? 'is-negative' : ''}`}>
                Fin.: {formatSignedUsd(item.value.financiero.delta)} ({formatSignedPct(item.value.financiero.deltaPct)})
              </p>
              <p className={`snapshot-variation-value ${item.value.oficial.delta > 0 ? 'is-positive' : item.value.oficial.delta < 0 ? 'is-negative' : ''}`}>
                Ofic.: {formatSignedUsd(item.value.oficial.delta)} ({formatSignedPct(item.value.oficial.deltaPct)})
              </p>
            </article>
          )
        })}
      </div>

      {chartData.length === 0 ? (
        <p className="empty-state">Guardá al menos un snapshot para ver la evolución histórica.</p>
      ) : (
        <div className="chart-container">
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData} margin={{ top: 8, right: 12, left: 8, bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" />
              <XAxis dataKey="dateLabel" />
              <YAxis tickFormatter={(value) => `$${Math.round(Number(value) / 1000)}k`} width={70} />
              <Tooltip
                formatter={(value, name) => [formatUsd(Number(value)), name === 'totalUsdFinanciero' ? 'USD Financiero' : 'USD Oficial']}
                labelFormatter={(_label, payload) => {
                  const snapshotDate = payload?.[0]?.payload?.date as string | undefined
                  return snapshotDate ? formatDateLong(snapshotDate) : 'Fecha'
                }}
                contentStyle={tooltipStyle}
                labelStyle={tooltipTextStyle}
                itemStyle={tooltipTextStyle}
              />
              <Legend
                formatter={(value) => {
                  if (value === 'totalUsdFinanciero') {
                    return 'USD Financiero'
                  }

                  if (value === 'totalUsdOficial') {
                    return 'USD Oficial'
                  }

                  return String(value)
                }}
              />
              <Line
                type="monotone"
                dataKey="totalUsdFinanciero"
                name="totalUsdFinanciero"
                stroke="#0ea5e9"
                strokeWidth={2}
                dot={{ r: 3 }}
                activeDot={{ r: 5 }}
              />
              <Line
                type="monotone"
                dataKey="totalUsdOficial"
                name="totalUsdOficial"
                stroke="#f97316"
                strokeWidth={2}
                dot={{ r: 3 }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </section>
  )
}
