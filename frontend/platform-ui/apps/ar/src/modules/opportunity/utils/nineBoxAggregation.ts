/**
 * UC-UI-04: client-side aggregation of `OpportunityPortfolioRow[]` into the nine-box's cells.
 *
 * A pure function, not a fetch — because there is no backend cell-aggregate endpoint yet (see
 * `fetchOpportunities`'s own doc comment and the WI 19231 plan doc), this is computed from the
 * same per-buyer rows the drill-down list already needs, so nothing extra is fetched to get it.
 */
import type { OpportunityPortfolioRow, OpportunityTier } from '@/api'

/** Row-then-column order the UI renders the grid in: probability descending (top row first,
 * "the top-right cell first" per UC-UI-04), impact ascending (so the highest-priority cell -
 * high probability, high value - lands top-right). */
export const PROBABILITY_TIERS_TOP_TO_BOTTOM: OpportunityTier[] = ['High', 'Medium', 'Low']
export const CASH_FLOW_IMPACT_TIERS_LEFT_TO_RIGHT: OpportunityTier[] = ['Low', 'Medium', 'High']

export interface NineBoxCell {
  probabilityTier: OpportunityTier
  cashFlowImpactTier: OpportunityTier
  buyerCount: number
  totalValue: number
  buyers: OpportunityPortfolioRow[]
}

export interface NineBoxAggregate {
  /** Always exactly 9, in `PROBABILITY_TIERS_TOP_TO_BOTTOM` × `CASH_FLOW_IMPACT_TIERS_LEFT_TO_RIGHT`
   * order - a cell with zero buyers is drawn at zero rather than omitted, same reasoning UC-OPP-13's
   * A1 already documents for the sibling waterfall bucketing. */
  cells: NineBoxCell[]
  /** UC-OPP-17 A1: either tier absent, or a tier value outside Low/Medium/High. Surfaced
   * separately, never silently dropped. */
  unranked: {
    buyerCount: number
    totalValue: number
    buyers: OpportunityPortfolioRow[]
  }
}

function cellKey(probabilityTier: OpportunityTier, cashFlowImpactTier: OpportunityTier): string {
  return `${probabilityTier}/${cashFlowImpactTier}`
}

/**
 * `row.value` is what's summed per cell (an opportunity's recommended-term value) - not
 * `economicProfitImpact`, which is a different figure the sibling Entity Card opportunity tab
 * (UC-UI-07, not yet built) is expected to show alongside it. Not confirmed against a spec (none
 * names which figure "the value" the nine-box cell means) - the same kind of documented judgment
 * call as `matchSettings.ts`'s field choice, easy to swap if it proves wrong.
 */
export function aggregateNineBox(rows: OpportunityPortfolioRow[]): NineBoxAggregate {
  const byCell = new Map<string, NineBoxCell>()
  for (const probabilityTier of PROBABILITY_TIERS_TOP_TO_BOTTOM) {
    for (const cashFlowImpactTier of CASH_FLOW_IMPACT_TIERS_LEFT_TO_RIGHT) {
      byCell.set(cellKey(probabilityTier, cashFlowImpactTier), {
        probabilityTier,
        cashFlowImpactTier,
        buyerCount: 0,
        totalValue: 0,
        buyers: [],
      })
    }
  }

  const unranked: NineBoxAggregate['unranked'] = { buyerCount: 0, totalValue: 0, buyers: [] }

  for (const row of rows) {
    if (row.probabilityTier === null || row.cashFlowImpactTier === null) {
      unranked.buyerCount += 1
      unranked.totalValue += row.value ?? 0
      unranked.buyers.push(row)
      continue
    }

    const cell = byCell.get(cellKey(row.probabilityTier, row.cashFlowImpactTier))
    // Every combination of the two tiers was seeded above; a miss here would mean the backend
    // sent a tier value outside Low/Medium/High. UC-OPP-17 A1's "never silently dropped" covers
    // this too, not just an absent tier - routed into `unranked` alongside those rather than
    // skipped, so the buyer still shows up somewhere instead of disappearing from the screen.
    if (!cell) {
      unranked.buyerCount += 1
      unranked.totalValue += row.value ?? 0
      unranked.buyers.push(row)
      continue
    }

    cell.buyerCount += 1
    cell.totalValue += row.value ?? 0
    cell.buyers.push(row)
  }

  const cells = PROBABILITY_TIERS_TOP_TO_BOTTOM.flatMap((probabilityTier) =>
    CASH_FLOW_IMPACT_TIERS_LEFT_TO_RIGHT.map(
      (cashFlowImpactTier) => byCell.get(cellKey(probabilityTier, cashFlowImpactTier))!,
    ),
  )

  return { cells, unranked }
}
