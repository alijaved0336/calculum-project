/**
 * Pure helpers for the Payment Terms vs Price Calculator's "Spend Volume"
 * mini-form (potential suppliers — both manual and AF-1 sub-cases).
 */

export function shouldIncludeSpendVolumeInPayload(
  changeValue: number | null | undefined,
): boolean {
  return changeValue !== null && changeValue !== undefined && changeValue !== 0;
}
