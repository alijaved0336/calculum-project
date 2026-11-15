/**
 * AB#20609: what the Overview summary row's two cards are handed. Every figure arrives already
 * formatted (whole days, abbreviated money with its currency symbol, counts without decimals) -
 * the cards only lay it out, so formatting stays in one place: OpportunityOverview.vue.
 */

/** Payment Terms (Days). Absent days arrive as the view's dash; absent captions as null. */
export interface OverviewSummaryPaymentTerms {
  contractual: string
  /** The caption under Contractual - not rendered when null (AB#20321 AF-1). */
  avgDaysPaid: string | null
  opportunity: string
  expected: string
  /** "Payment Float: N" captions - not rendered when null. */
  opportunityPaymentFloat: string | null
  expectedPaymentFloat: string | null
}

/** One money column (Cash Flow, P&L Impact, Economic Profit). An empty value renders "N/A". */
export interface OverviewSummaryMetric {
  id: string
  title: string
  /** This column's paragraph in the card's help tooltip. */
  tooltip: string
  opportunity: string
  expected: string
  highlighted?: boolean
}

export interface OverviewSummaryTrend {
  text: string
  direction: 'up' | 'down'
}
