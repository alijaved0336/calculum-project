/**
 * Collection queries whose backend resources are tenant-scoped. They require a
 * non-empty `targetSpendFileVersionUuid`; the backend rejects the request otherwise.
 *
 * `spendFileVersionActiveId` resolves to "" until the user store has loaded the active
 * spend file version, so a view that fetches on mount can emit a query with an empty
 * scope. The backend used to silently fall back to the caller's active version; it now
 * answers 400 (WI#18809). Skipping the call is better than surfacing an error the user
 * can do nothing about — the view refetches once the store settles.
 *
 * This is a defense-in-depth check, in the same spirit as `isProgramSfvConsistent`.
 * The primary defense is `useConsistentFetch`, which already blocks on a falsy sfvId.
 */
export const TENANT_SCOPED_COLLECTIONS = [
  "collectionQueryAnalyzeListSuppliers",
  "collectionQueryAnalyzeListParents",
  "collectionQueryAnalyzeListSpends",
  "collectionQueryProgramListSuppliers",
  "collectionQueryProgramListParents",
  "collectionQueryProgramListSpends",
  "collectionQueryProgramListWaterfallSpends",
  "collectionQueryMatchLists",
  "collectionQueryEmailNegotiationLists",
] as const;

/**
 * Values that reach the query string when an undefined ref is interpolated into a
 * template literal. They are not valid uuids and would only earn a 400.
 */
const PLACEHOLDER_UUIDS = new Set(["undefined", "null"]);

/**
 * Returns `true` when the query targets a collection that the backend scopes by
 * spend file version.
 */
export function isTenantScopedCollectionQuery(queryString: string): boolean {
  return TENANT_SCOPED_COLLECTIONS.some((collection) => queryString.includes(collection));
}

/**
 * Returns `true` when the extracted `targetSpendFileVersionUuid` is usable as a scope.
 *
 * The null/empty check is inlined rather than taken from `StringUtils`: that module imports
 * the `@/utils` barrel, which would drag component code into this guard and force every
 * consumer's unit test to mock the barrel.
 */
export function hasUsableTenantScope(sfvUuid: string | null | undefined): boolean {
  if (sfvUuid === null || sfvUuid === undefined) {
    return false;
  }

  const trimmed = sfvUuid.trim();

  return trimmed !== "" && !PLACEHOLDER_UUIDS.has(trimmed);
}
