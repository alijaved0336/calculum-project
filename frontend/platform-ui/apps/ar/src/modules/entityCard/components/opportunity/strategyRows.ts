import type { BuyerCardStrategyResultDto } from '@/api'

/** One strategy's row in UC-UI-07's full breakdown: every strategy evaluated, the winner marked,
 * every loser carrying its reason. */
export interface StrategyRow {
  strategy: string
  proposedTerm: number | null
  applicabilityReason: string | null
  isWinner: boolean
}

/** `winningStrategy` null means no strategy applied at all (UC-OPP-12 A1/A2), so every row is a
 * loser - never guessed from whichever row happens to carry a term. */
export function deriveStrategyRows(
  breakdown: BuyerCardStrategyResultDto[],
  winningStrategy: string | null,
): StrategyRow[] {
  return breakdown.map((result) => ({
    strategy: result.strategy,
    proposedTerm: result.proposedTerm,
    applicabilityReason: result.applicabilityReason,
    isWinner: winningStrategy !== null && result.strategy === winningStrategy,
  }))
}
