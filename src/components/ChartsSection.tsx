import { useMemo } from 'react'
import {
  Bar,
  BarChart,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts'
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

const PIE_COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#f97316', '#8b5cf6', '#ef4444', '#14b8a6', '#64748b']

const currencyTooltipFormatter = (value: number) => formatUsd(value)
const formatPercentage = (value: number): string => `${value.toFixed(2)}%`

export const ChartsSection = ({ byType, bySubasset, byAccount }: ChartsSectionProps) => {
  const bySubassetWithPercentage = useMemo(() => {
    const total = bySubasset.reduce((accumulator, item) => accumulator + item.value, 0)

    return bySubasset.map((item) => ({
      ...item,
      percentage: total > 0 ? (item.value / total) * 100 : 0
    }))
  }, [bySubasset])

  const subassetMeta = useMemo(() => {
    const map = new Map<string, { percentage: number; value: number }>()

    bySubassetWithPercentage.forEach((item) => {
      map.set(item.name, {
        percentage: item.percentage,
        value: item.value
      })
    })

    return map
  }, [bySubassetWithPercentage])

  return (
    <section className="charts-grid" aria-label="Gráficos">
      <article className="chart-card">
        <h2>Distribución por Tipo (USD Financiero)</h2>
        <div className="chart-container">
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie data={byType} dataKey="value" nameKey="name" innerRadius={65} outerRadius={95} paddingAngle={2}>
                {byType.map((entry, index) => (
                  <Cell key={`${entry.name}-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={currencyTooltipFormatter} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </article>

      <article className="chart-card">
        <h2>Distribución por Subactivo (USD Financiero)</h2>
        <div className="chart-container">
          <ResponsiveContainer width="100%" height={320}>
            <PieChart>
              <Pie
                data={bySubassetWithPercentage}
                dataKey="value"
                nameKey="name"
                innerRadius={70}
                outerRadius={105}
                paddingAngle={2}
              >
                {bySubassetWithPercentage.map((entry, index) => (
                  <Cell key={`${entry.name}-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value, _name, item) => {
                  const percentage = (item.payload as { percentage?: number })?.percentage ?? 0
                  return [`${formatUsd(Number(value))} (${formatPercentage(percentage)})`, 'USD Financiero']
                }}
              />
              <Legend
                formatter={(value) => {
                  const meta = subassetMeta.get(String(value))

                  if (!meta) {
                    return value
                  }

                  return `${value} · ${formatPercentage(meta.percentage)} · ${formatUsd(meta.value)}`
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </article>

      <article className="chart-card chart-card-wide">
        <h2>Totales por Cuenta (USD Financiero)</h2>
        <div className="chart-container">
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={byAccount} margin={{ top: 4, right: 12, left: 8, bottom: 56 }}>
              <XAxis dataKey="name" angle={-20} textAnchor="end" interval={0} height={70} />
              <YAxis tickFormatter={(value) => `$${Math.round(value / 1000)}k`} width={70} />
              <Tooltip formatter={currencyTooltipFormatter} />
              <Bar dataKey="value" fill="#0ea5e9" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </article>
    </section>
  )
}
