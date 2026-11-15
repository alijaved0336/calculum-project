export type NegotiationStatus = "analyzed" | "onHold" | "planned" | "contacted" | "agreed" | "agreedExtended";

export type TransitionTier = "forward" | "tier1Backward" | "tier2ABackward" | "tier2BReclassify";

export type RequiredModal = "plan" | "agreedTerms";

export const STATUS_CODES: Record<NegotiationStatus, number> = {
  analyzed: 100,
  onHold: 150,
  planned: 200,
  contacted: 300,
  agreed: 400,
  agreedExtended: 500
};

// Single source of truth for column order — mirrors Overview.vue's columnOrder ref.
export const STATUS_COLUMN_ORDER: NegotiationStatus[] = [
  "analyzed",
  "onHold",
  "planned",
  "contacted",
  "agreed",
  "agreedExtended"
];

const AGREED_SET = new Set<NegotiationStatus>(["agreed", "agreedExtended"]);

/**
 * The Tier2B check must run before comparing codes: agreed(400) and agreedExtended(500)
 * differ numerically, so without it agreed->agreedExtended would look like a plain
 * forward move instead of the reclassification the spec requires in both directions.
 */
export function classifyTransition(source: NegotiationStatus, target: NegotiationStatus): TransitionTier | null {
  if (source === target) return null;

  if (AGREED_SET.has(source) && AGREED_SET.has(target)) return "tier2BReclassify";

  const sourceCode = STATUS_CODES[source];
  const targetCode = STATUS_CODES[target];

  if (AGREED_SET.has(source) && targetCode < sourceCode) return "tier2ABackward";

  if (targetCode < sourceCode) return "tier1Backward";

  return "forward";
}

export function requiresModal(target: NegotiationStatus): RequiredModal | null {
  if (target === "planned") return "plan";
  if (AGREED_SET.has(target)) return "agreedTerms";
  return null;
}

export function useStatusTransitions() {
  return {
    classifyTransition,
    requiresModal,
    STATUS_CODES,
    STATUS_COLUMN_ORDER
  };
}
