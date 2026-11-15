/**
 * The bar color for one strategy/term key inside a strategy drill-down panel - a port of AP's own
 * `PaymentTermsStrategiesUtils.getColorByStrategyKeyDetailsSection`
 * (`apps/ap/src/modules/paymentTermsAndTermsStrategies/utils`), so AP's and AR's drill-downs paint
 * the same key the same color. Hex values are AP's `ColorsUtils` palette entries, inlined because
 * that palette lives in AP, not in this package.
 */

/** AP's `ColorsUtils.graycool[600]`. */
const CONTRACTUAL_COLOR = "#475569";
/** AP's `ColorsUtils.cyan[400]`. */
const ACTUAL_COLOR = "#22ccee";
/** AP's `ColorsUtils.blueDark[800]` - the v1 standards' own color in `getColorByStrategyKey`. */
const V1_STANDARD_COLOR = "#0040c1";
/** AP's `scfStandardStrategy` color in `getColorByStrategyKey`. */
const SCF_STANDARD_COLOR = "#FFB524";
/** AP's `ColorsUtils.blue[500]` - every other strategy, including both apps' 2.0 standards. */
const DEFAULT_STRATEGY_COLOR = "#3B82F6";
const PROPOSED_TERMS =  "#6366f1";
const AGREED_TERMS =  "#22C55E";
/** AP's `ColorsUtils.teal[700]` - `targetTerms` in `getColorByStrategyKeyDetailsSection`. */
const TARGET_TERMS = "#107569";


const STRATEGY_BAR_COLORS: Record<string, string> = {
  contractualTerms: CONTRACTUAL_COLOR,
  currentTerms: ACTUAL_COLOR,
  actualTerms: ACTUAL_COLOR,
  proposedTerms: PROPOSED_TERMS,
  opportunityTerms: PROPOSED_TERMS,
  targetTerms: TARGET_TERMS,
  supplierStandardStrategy: V1_STANDARD_COLOR,
  peerGroupAvgStrategy: V1_STANDARD_COLOR,
  scfStandardStrategy: SCF_STANDARD_COLOR,
};

export function getStrategyBarColor(strategyKey: string): string {
  return STRATEGY_BAR_COLORS[strategyKey] ?? DEFAULT_STRATEGY_COLOR;
}
