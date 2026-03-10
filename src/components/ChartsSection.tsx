import { type CSSProperties, useMemo } from 'react'
import { Bar, BarChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { formatUsd } from '../utils/number'

interface ChartPoint {
  name: string
  value: number
}

interface ChartsSectionProps {
  byType: ChartPoint[]
  bySubasset: ChartPoint[]
  byAccount: ChartPoint[]
}

const PIE_COLORS = ['#22d3ee', '#14b8a6', '#f59e0b', '#f97316', '#f43f5e', '#3b82f6', '#10b981', '#eab308']
const SUBASSET_PIE_THRESHOLD = 6

const currencyTooltipFormatter = (value: number) => formatUsd(value)
const formatPercentage = (value: number): string => `${value.toFixed(2)}%`

const truncateLabel = (value: string, maxLength: number = 16): string => {
  if (value.length <= maxLength) {
    return value
  }

  return `${value.slice(0, maxLength - 1)}…`
}

const sortDesc = (rows: ChartPoint[]): ChartPoint[] => {
  return [...rows].sort((left, right) => right.value - left.value)
}

interface PieLegendProps {
  rows: ChartPoint[]
}

const PieLegend = ({ rows }: PieLegendProps) => {
  const total = rows.reduce((accumulator, row) => accumulator + row.value, 0)

  return (
    <ul className="pie-legend-list" aria-label="Montos por categoría">
      {rows.map((entry, index) => {
        const percentage = total > 0 ? (entry.value / total) * 100 : 0
        return (
          <li key={entry.name} className="pie-legend-item">
            <span className="pie-legend-left">
              <span className="pie-legend-dot" style={{ backgroundColor: PIE_COLORS[index % PIE_COLORS.length] }} aria-hidden="true" />
              <span className="pie-legend-name" title={entry.name}>
                {entry.name}
              </span>
            </span>
            <span className="pie-legend-value">{formatUsd(entry.value)}</span>
            <span className="pie-legend-pct">{formatPercentage(percentage)}</span>
          </li>
        )
      })}
    </ul>
  )
}

export const ChartsSection = ({ byType, bySubasset, byAccount }: ChartsSectionProps) => {
  const sortedByType = useMemo(() => sortDesc(byType), [byType])
  const sortedBySubasset = useMemo(() => sortDesc(bySubasset), [bySubasset])
  const sortedByAccount = useMemo(() => sortDesc(byAccount), [byAccount])

  const bySubassetWithPercentage = useMemo(() => {
    const total = sortedBySubasset.reduce((accumulator, item) => accumulator + item.value, 0)

    return sortedBySubasset.map((item) => ({
      ...item,
      percentage: total > 0 ? (item.value / total) * 100 : 0
    }))
  }, [sortedBySubasset])

  const subassetBarData = useMemo(() => {
    if (sortedBySubasset.length <= SUBASSET_PIE_THRESHOLD) {
      return sortedBySubasset
    }

    const top = sortedBySubasset.slice(0, 8)
    const remaining = sortedBySubasset.slice(8)
    const othersValue = remaining.reduce((accumulator, item) => accumulator + item.value, 0)

    if (othersValue <= 0) {
      return top
    }

    return [...top, { name: 'Otros', value: othersValue }]
  }, [sortedBySubasset])

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

  return (
    <section className="charts-grid" aria-label="Distribuciones">
      <article className="chart-card">
        <h2>Distribución por tipo</h2>
        {sortedByType.length === 0 ? (
          <p className="empty-state">Sin datos para los filtros actuales.</p>
        ) : (
          <div className="chart-container chart-with-legend">
            <div className="chart-with-legend-plot">
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie data={sortedByType} dataKey="value" nameKey="name" innerRadius={70} outerRadius={98} paddingAngle={2}>
                    {sortedByType.map((entry, index) => (
                      <Cell key={`${entry.name}-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={currencyTooltipFormatter}
                    contentStyle={tooltipStyle}
                    labelStyle={tooltipTextStyle}
                    itemStyle={tooltipTextStyle}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <PieLegend rows={sortedByType} />
          </div>
        )}
      </article>

      <article className="chart-card">
        <h2>Distribución por subactivo</h2>
        {bySubassetWithPercentage.length === 0 ? (
          <p className="empty-state">Sin datos para los filtros actuales.</p>
        ) : bySubassetWithPercentage.length <= SUBASSET_PIE_THRESHOLD ? (
          <div className="chart-container chart-with-legend">
            <div className="chart-with-legend-plot">
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie data={bySubassetWithPercentage} dataKey="value" nameKey="name" innerRadius={74} outerRadius={108} paddingAngle={2}>
                    {bySubassetWithPercentage.map((entry, index) => (
                      <Cell key={`${entry.name}-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value, _name, item) => {
                      const percentage = (item.payload as { percentage?: number })?.percentage ?? 0
                      return [`${formatUsd(Number(value))} (${formatPercentage(percentage)})`, 'USD financiero']
                    }}
                    contentStyle={tooltipStyle}
                    labelStyle={tooltipTextStyle}
                    itemStyle={tooltipTextStyle}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <PieLegend rows={sortedBySubasset} />
          </div>
        ) : (
          <div className="chart-container">
            <ResponsiveContainer width="100%" height={Math.min(420, Math.max(280, subassetBarData.length * 34))}>
              <BarChart data={subassetBarData} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 6 }}>
                <XAxis type="number" tickFormatter={(value) => `$${Math.round(value / 1000)}k`} />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={120}
                  tickFormatter={(value) => truncateLabel(String(value), 14)}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  formatter={currencyTooltipFormatter}
                  labelFormatter={(value) => String(value)}
                  contentStyle={tooltipStyle}
                  labelStyle={tooltipTextStyle}
                  itemStyle={tooltipTextStyle}
                />
                <Bar dataKey="value" fill="var(--accent)" radius={[0, 8, 8, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </article>

      <article className="chart-card chart-card-wide">
        <h2>Totales por cuenta</h2>
        {sortedByAccount.length === 0 ? (
          <p className="empty-state">Sin datos para los filtros actuales.</p>
        ) : (
          <div className="chart-container">
            <ResponsiveContainer width="100%" height={Math.min(500, Math.max(320, sortedByAccount.length * 34))}>
              <BarChart data={sortedByAccount} layout="vertical" margin={{ top: 6, right: 16, left: 8, bottom: 10 }}>
                <XAxis type="number" tickFormatter={(value) => `$${Math.round(value / 1000)}k`} />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={140}
                  tickFormatter={(value) => truncateLabel(String(value), 18)}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  formatter={currencyTooltipFormatter}
                  labelFormatter={(value) => String(value)}
                  contentStyle={tooltipStyle}
                  labelStyle={tooltipTextStyle}
                  itemStyle={tooltipTextStyle}
                />
                <Bar dataKey="value" fill="var(--bar-fill)" radius={[0, 8, 8, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </article>
    </section>
  )
}
