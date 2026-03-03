import type { HoldingType } from '../types'
import { formatUsd } from '../utils/number'

interface SummaryCardsProps {
  totalUsdFinanciero: number
  totalUsdOficial: number
  totalsByType: Record<HoldingType, number>
}

export const SummaryCards = ({ totalUsdFinanciero, totalUsdOficial, totalsByType }: SummaryCardsProps) => {
  return (
    <section aria-label="Resumen" className="summary-grid">
      <article className="summary-card accent-cyan">
        <h2>Patrimonio Total (USD Financiero)</h2>
        <p>{formatUsd(totalUsdFinanciero)}</p>
      </article>

      <article className="summary-card accent-orange">
        <h2>Patrimonio Total (USD Oficial)</h2>
        <p>{formatUsd(totalUsdOficial)}</p>
      </article>

      <article className="summary-card">
        <h2>Cash</h2>
        <p>{formatUsd(totalsByType.Cash)}</p>
      </article>

      <article className="summary-card">
        <h2>Investments</h2>
        <p>{formatUsd(totalsByType.Investments)}</p>
      </article>

      <article className="summary-card">
        <h2>Crypto</h2>
        <p>{formatUsd(totalsByType.Crypto)}</p>
      </article>
    </section>
  )
}
