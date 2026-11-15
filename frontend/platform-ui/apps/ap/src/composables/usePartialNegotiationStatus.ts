export interface StageBreakdownEntry {
  stageCode: number;
  count: number;
  avgPaymentTerms: number;
  avgPaymentTermsWithoutDiscount: number;
  cashFlowTarget: number;
  vCardRebateFull: number | null;
}

export function getDistinctStatusCodes(codes: string | null | undefined): string[] {
  return (codes ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export function isPartialEntity(codes: string | null | undefined): boolean {
  return getDistinctStatusCodes(codes).length > 1;
}

export function getStageBreakdownEntry(
  stageBreakdown: StageBreakdownEntry[] | null | undefined,
  status: string
): StageBreakdownEntry | null {
  return stageBreakdown?.find((s) => s.stageCode === Number(status)) ?? null;
}

// Distinct from every existing status color (onHold=bg-warning-500, planned=bg-bluelight-500,
// contacted=bg-teal-500, analyzed=bg-graycool-500, agreed=bg-violet-200/600) to avoid a visual
// collision — "Partial" is a cross-cutting meta-label, never a real backend status value.
export const PARTIAL_PILL_COLOR_CLASSES = "font-medium text-white-0 bg-orange-500";

export function usePartialNegotiationStatus() {
  return { getDistinctStatusCodes, isPartialEntity, getStageBreakdownEntry, PARTIAL_PILL_COLOR_CLASSES };
}
