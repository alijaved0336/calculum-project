import { formatCashFlow, formatUSD, formatSupplierCount, formatExactCount, formatDays } from './formatters'
import type { WorkingCapitalComparisonResult } from '../types'

export interface KpiCardSubLine {
  text: string
  tooltip?: string
}

export interface KpiCard {
  title: string
  bigValue: string
  bigValueTooltip?: string
  subLines: (string | KpiCardSubLine)[]
  progressPct?: number
}

type Translate = (key: string, params?: Record<string, unknown>) => string

/**
 * Builds the 4 Working Capital KPI cards (Working Capital Improvement, Suppliers
 * Improved, WAPT Gain, Target Achievement) from a comparison result.
 *
 * Shared by `WorkingCapitalDashboard.vue` (the live dashboard) and
 * `WorkingCapitalExportPDF.vue` (the PDF export) so the exported report always
 * matches the live cards exactly — no duplicated formatting logic to drift out
 * of sync (Story 2's Fidelity NFR).
 */
export function buildKpiCards(result: WorkingCapitalComparisonResult | null, t: Translate): KpiCard[] {
  const cardTitles = [
    t('home.workingCapital.kpiCards.wciTitle'),
    t('home.workingCapital.kpiCards.suppliersImprovedTitle'),
    t('home.workingCapital.kpiCards.waptGainTitle'),
    t('home.workingCapital.kpiCards.targetAchievementTitle'),
  ]

  if (!result) {
    return cardTitles.map((title, i) => ({
      title,
      bigValue: '—',
      bigValueTooltip: undefined,
      subLines: [],
      progressPct: i === 3 ? 0 : undefined,
    }))
  }

  const shortfall = result.targetCashFlow - result.totalImprovedCashFlow
  const suppliersMatched = result.suppliersImproved + result.suppliersMatchNotIncreased
  const pctOfAnalyzed = result.totalAnalyzed > 0
    ? ((result.suppliersImproved / result.totalAnalyzed) * 100).toFixed(1)
    : '0.0'
  // Explicit "+" only for a non-negative gain — formatDays already carries the
  // minus for a negative one. Same rule as WAPTImprovementChart's buildBadge().
  const gainSign = result.waptGainDays >= 0 ? '+' : ''

  return [
    {
      title: cardTitles[0],
      bigValue: formatCashFlow(result.totalImprovedCashFlow),
      bigValueTooltip: formatUSD(result.totalImprovedCashFlow),
      subLines: [{
        text:    t('home.workingCapital.kpiCards.improvedCashFlowLine', { shortfall: formatCashFlow(shortfall) }),
        tooltip: t('home.workingCapital.kpiCards.improvedCashFlowLine', { shortfall: formatUSD(shortfall) }),
      }],
      progressPct: undefined,
    },
    {
      title: cardTitles[1],
      bigValue: formatSupplierCount(result.suppliersImproved),
      bigValueTooltip: formatExactCount(result.suppliersImproved),
      subLines: [{
        text:    t('home.workingCapital.kpiCards.matchedAnalyzedLine', { matched: formatSupplierCount(suppliersMatched), pct: pctOfAnalyzed }),
        tooltip: t('home.workingCapital.kpiCards.matchedAnalyzedLine', { matched: formatExactCount(suppliersMatched), pct: pctOfAnalyzed }),
      }],
      progressPct: undefined,
    },
    {
      title: cardTitles[2],
      bigValue: `${gainSign}${formatDays(result.waptGainDays, t)}`,
      // Same value at 1-decimal precision — a no-op today (backend already returns
      // whole WAPT days) but keeps every KPI card's big value consistently hoverable,
      // and stays correct if a future data path ever carries more precision.
      bigValueTooltip: `${gainSign}${formatDays(result.waptGainDays, t, 1)}`,
      subLines: [{
        text:    t('home.workingCapital.kpiCards.weightedTermsLine', { from: formatDays(result.waptFromDays, t), to: formatDays(result.waptToDays, t) }),
        tooltip: t('home.workingCapital.kpiCards.weightedTermsLine', { from: formatDays(result.waptFromDays, t, 1), to: formatDays(result.waptToDays, t, 1) }),
      }],
      progressPct: undefined,
    },
    {
      title: cardTitles[3],
      bigValue: `${result.targetAchievementPct}%`,
      // The backend's percentage is already rounded to a whole number; the tooltip
      // recomputes it client-side at 1-decimal precision from the same two raw
      // amounts (a ratio, so currency conversion cancels out and needs no formatter).
      bigValueTooltip: result.targetCashFlow > 0
        ? `${((result.totalImprovedCashFlow / result.targetCashFlow) * 100).toFixed(1)}%`
        : undefined,
      subLines: [{
        text:    t('home.workingCapital.kpiCards.achievedOfTargetLine', { improved: formatCashFlow(result.totalImprovedCashFlow), target: formatCashFlow(result.targetCashFlow) }),
        tooltip: t('home.workingCapital.kpiCards.achievedOfTargetLine', { improved: formatUSD(result.totalImprovedCashFlow), target: formatUSD(result.targetCashFlow) }),
      }],
      progressPct: result.targetAchievementPct,
    },
  ]
}
