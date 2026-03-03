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

export const ChartsSection = ({ byType, bySubasset, byAccount }: ChartsSectionProps) => {
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
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie data={bySubasset} dataKey="value" nameKey="name" innerRadius={65} outerRadius={95} paddingAngle={2}>
                {bySubasset.map((entry, index) => (
                  <Cell key={`${entry.name}-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={currencyTooltipFormatter} />
              <Legend />
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
