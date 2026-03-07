import { type CSSProperties, useMemo } from 'react'
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { PortfolioSnapshot } from '../types'
import { buildSnapshotVariations, getSnapshotDateKey } from '../utils/snapshots'
import { formatPlainNumber, formatTime, formatUsd } from '../utils/number'
import { AppButton } from './ui/AppButton'

interface SnapshotHistorySectionProps {
  snapshots: PortfolioSnapshot[]
  totalUsdFinanciero: number
  totalUsdOficial: number
  liquidUsdFinanciero: number
  illiquidUsdFinanciero: number
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

const PERIOD_HELPERS: Record<'daily' | 'weekly' | 'monthly', string> = {
  daily: 'Se requieren 2 snapshots para variación diaria.',
  weekly: 'Se requieren snapshots separados por 7 días para variación semanal.',
  monthly: 'Se requieren snapshots separados por 30 días para variación mensual.'
}

export const SnapshotHistorySection = ({
  snapshots,
  totalUsdFinanciero,
  totalUsdOficial,
  liquidUsdFinanciero,
  illiquidUsdFinanciero,
  onCaptureSnapshot
}: SnapshotHistorySectionProps) => {
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
    { key: 'daily' as const, label: 'Variación diaria', value: variations.daily },
    { key: 'weekly' as const, label: 'Variación semanal', value: variations.weekly },
    { key: 'monthly' as const, label: 'Variación mensual', value: variations.monthly }
  ]

  return (
    <section className="hero-section" aria-label="Patrimonio y evolución">
      <div className="hero-kpi-grid">
        <article className="hero-kpi-card hero-kpi-main">
          <p className="hero-kpi-label">Patrimonio total</p>
          <p className="hero-kpi-value">{formatUsd(totalUsdFinanciero)}</p>
          <p className="hero-kpi-secondary">USD financiero</p>
          <p className="hero-kpi-subvalue">Oficial: {formatUsd(totalUsdOficial)}</p>
          <p className="hero-kpi-subvalue">Líquido: {formatUsd(liquidUsdFinanciero)}</p>
          <p className="hero-kpi-subvalue">Ilíquido: {formatUsd(illiquidUsdFinanciero)}</p>
        </article>

        <article className="hero-kpi-card hero-kpi-cta-card">
          <div>
            <p className="hero-kpi-label">Snapshot diario</p>
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
        </article>
      </div>

      <div className="hero-variations-grid">
        {variationCards.map((item) => {
          if (!item.value) {
            return (
              <article key={item.label} className="hero-variation-card">
                <h3>{item.label}</h3>
                <p className="muted-text">{PERIOD_HELPERS[item.key]}</p>
              </article>
            )
          }

          return (
            <article key={item.label} className="hero-variation-card">
              <h3>{item.label}</h3>
              <p className={`snapshot-variation-value ${item.value.financiero.delta > 0 ? 'is-positive' : item.value.financiero.delta < 0 ? 'is-negative' : ''}`}>
                {formatSignedUsd(item.value.financiero.delta)} ({formatSignedPct(item.value.financiero.deltaPct)})
              </p>
              <p className="muted-text">base: {formatDateLong(item.value.baseDate)}</p>
            </article>
          )
        })}
      </div>

      {chartData.length === 0 ? (
        <p className="empty-state">Guardá snapshots para ver la evolución del patrimonio.</p>
      ) : (
        <div className="chart-container hero-chart">
          <ResponsiveContainer width="100%" height={320}>
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
              <Line
                type="monotone"
                dataKey="totalUsdFinanciero"
                name="totalUsdFinanciero"
                stroke="var(--accent)"
                strokeWidth={3}
                dot={{ r: 2 }}
                activeDot={{ r: 5 }}
              />
              <Line
                type="monotone"
                dataKey="totalUsdOficial"
                name="totalUsdOficial"
                stroke="var(--warning)"
                strokeWidth={2}
                dot={{ r: 2 }}
                activeDot={{ r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </section>
  )
}
