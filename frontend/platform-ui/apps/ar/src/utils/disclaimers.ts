/**
 * UC-UI-21: appends a caveat sentence to a field's existing explanatory tooltip, rather than
 * replacing it, and only when there is a real value on screen to caveat (AF-1) - the shared shape
 * behind every "this figure already has a tooltip, and now also needs a disclaimer" call site.
 * Pulled out after two independent copies of this same append-when-present logic drifted apart:
 * one checked only the buyer's own credit limit and missed the parent limit shown right beside it
 * in the same tooltip's scope.
 */
export function withDisclaimer(explanation: string, disclaimer: string, hasValue: boolean): string {
  return hasValue ? [explanation, disclaimer].filter(Boolean).join(' ') : explanation
}
