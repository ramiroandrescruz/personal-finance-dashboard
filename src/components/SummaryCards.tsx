import type { HoldingType } from '../types'
import { formatPlainNumber, formatUsd } from '../utils/number'

interface SummaryCardsProps {
  totalUsdFinanciero: number
  totalsByType: Record<HoldingType, number>
  deltasByType?: Partial<Record<HoldingType, number>>
}

const CATEGORY_ORDER: HoldingType[] = ['Cash', 'Investments', 'Crypto']

export const SummaryCards = ({ totalUsdFinanciero, totalsByType, deltasByType }: SummaryCardsProps) => {
  return (
    <section aria-label="Resumen por categoría" className="summary-grid summary-grid-compact">
      {CATEGORY_ORDER.map((category) => {
        const value = totalsByType[category]
        const percentage = totalUsdFinanciero <= 0 ? 0 : (value / totalUsdFinanciero) * 100
        const delta = deltasByType?.[category] ?? null

        return (
          <article key={category} className="summary-card summary-card-category">
            <h2>{category}</h2>
            <p>{formatUsd(value)}</p>
            <div className="summary-card-meta">
              <span>{formatPlainNumber(percentage)}% del total</span>
              <span>
                {delta === null ? 'Delta s/dato' : `Delta ${delta > 0 ? '+' : ''}${formatPlainNumber(delta)}%`}
              </span>
            </div>
          </article>
        )
      })}
    </section>
  )
}
