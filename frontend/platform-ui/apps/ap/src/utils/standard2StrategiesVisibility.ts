/**
 * AB#20488 — TEMPORARY gate.
 *
 * Supplier Standard 2.0 and Peer Group Standard 2.0 are still being validated, so
 * only super admins (`ROLE_ADMIN` / `isSuperAdmin`) may see them in the AP: the Setup
 * › Payment Terms Strategies rows and the "(Strategy)" grid columns. The back end
 * applies the same rule to the Entity Card Opportunity tab
 * (`StrategiesCalculations::isStandard2StrategyVisibleForUser`).
 *
 * Remove this module and its call sites once both strategies are validated.
 */

/** Setup strategy keys of the two 2.0 strategies. */
export const STANDARD_2_STRATEGY_KEYS: readonly string[] = [
  "supplierStandard2Strategy",
  "peerGroupStandard2Strategy",
];

/**
 * Whether the current user may see the 2.0 strategies at all.
 *
 * @param allowedByFeature - the company feature flag the caller already checks
 *   (`useFeatureSupplierStandard` / `useFeaturePeerGroupStandard`).
 * @param isSuperAdmin - `userIsSuperAdmin` from `useUser()`.
 */
export function isStandard2StrategyVisibleForUser(
  allowedByFeature: boolean,
  isSuperAdmin: boolean,
): boolean {
  return allowedByFeature && isSuperAdmin;
}

/**
 * Drop the 2.0 strategies from the Setup list for non-admin users.
 *
 * Leaving them out of the list also leaves them out of the save payload, and
 * `api/spendfile/strategies/allowed/update` only touches the 2.0 strategies it
 * receives, so a non-admin saving Setup never changes their stored value.
 *
 * @param strategies - strategies returned by the Setup endpoint.
 * @param isSuperAdmin - `userIsSuperAdmin` from `useUser()`.
 * @returns the same array for admins, a filtered copy otherwise.
 */
export function removeStandard2StrategiesForNonAdmin<T extends { key: string }>(
  strategies: T[],
  isSuperAdmin: boolean,
): T[] {
  if (isSuperAdmin) {
    return strategies;
  }
  return strategies.filter(
    (strategy) => !STANDARD_2_STRATEGY_KEYS.includes(strategy.key),
  );
}
