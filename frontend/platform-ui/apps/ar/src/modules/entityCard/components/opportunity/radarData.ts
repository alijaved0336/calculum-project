import type { BuyerCardStrategyResultDto } from '@/api'
import { humanizePascalCase } from './humanize'

/** One axis of the Payment Term Benchmarks radar: a confirmed strategy's proposed term. */
export interface RadarPoint {
  name: string
  term: number
}

/** AC-05: a strategy still pending a decision (no proposed term yet) is simply absent from the
 * chart - never plotted as a zero, which would read as "this strategy proposes no move" rather
 * than "this strategy hasn't decided yet". The axis label is humanized the same way
 * StrategyList's own row is, so the same strategy doesn't read as two different names in the two
 * panels sitting beside each other. */
export function deriveRadarPoints(breakdown: BuyerCardStrategyResultDto[]): RadarPoint[] {
  return breakdown
    .filter((result): result is BuyerCardStrategyResultDto & { proposedTerm: number } => result.proposedTerm !== null)
    .map((result) => ({ name: humanizePascalCase(result.strategy), term: result.proposedTerm }))
}
