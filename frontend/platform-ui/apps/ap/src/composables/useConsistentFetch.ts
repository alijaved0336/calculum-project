import { watch, onMounted } from 'vue';
import { useAnalyzeStore } from '@/stores/analyze';
import { useGlobalFiltersStore } from '@/stores/globalFilters';

/**
 * Centralizes data-fetch orchestration for views that depend on programs,
 * a selected program, and an active spend-file-version (SFV).
 *
 * **What it solves:**
 * 1. Race condition on mount — programs may not be loaded yet, causing
 *    `isProgramSfvConsistent` to skip the call.  The `onMounted` hook
 *    handles the case where programs are already loaded at mount time,
 *    and the reactive watch handles the case where they load later.
 * 2. Company-change guard — respects `getDisableWatchers` to avoid
 *    firing while the session is in a transitional state.
 * 3. Deduplication — tracks the last `programId:sfvId` pair so that
 *    the same combination isn't fetched twice (unless forced).
 *
 * **Covered scenarios:**
 * - First mount / page refresh (F5)
 * - Program change (combo / route)
 * - Spend-file-version change (combo)
 * - Company change (programs reload → watch fires)
 * - Manual re-fetch via `triggerFetch()` (e.g. keyLists, filters)
 *
 * @param fetchFns     Array of fetch functions to execute
 * @param getProgramId Getter returning the current program UUID
 * @param getSfvId     Getter returning the current SFV UUID
 * @returns            `{ triggerFetch }` — call with no args to force a re-fetch
 */
export function useConsistentFetch(
  fetchFns: Array<() => void>,
  getProgramId: () => string | null | undefined,
  getSfvId: () => string | null | undefined
): { triggerFetch: () => void } {
  const analyzeStore = useAnalyzeStore();
  const globalFiltersStore = useGlobalFiltersStore();

  let lastFetchKey = '';

  function tryFetch(force = false) {
    // Block during company-change transition
    if (globalFiltersStore.getDisableWatchers) return;

    const programs = analyzeStore.getAllPrograms;
    const programId = getProgramId();
    const sfvId = getSfvId();

    if (!(programs?.length > 0 && programId && sfvId)) return;

    // Dedup: skip if same context was already fetched (unless forced)
    const fetchKey = `${programId}:${sfvId}`;
    if (!force && fetchKey === lastFetchKey) return;
    lastFetchKey = fetchKey;

    fetchFns.forEach(fn => {
      try {
        // Cast needed: fetchFns are typed as () => void but may return promises
        const result = fn() as unknown;
        // Catch abort errors from async fetch functions (expected during rapid transitions)
        if (result && typeof (result as Promise<unknown>).catch === 'function') {
          (result as Promise<unknown>).catch((err: any) => {
            if (err?.name === 'AbortError' || err?.message?.includes('aborted')) return;
            if (import.meta.env.DEV) console.warn('[useConsistentFetch] Fetch error:', err);
          });
        }
      } catch (err: any) {
        if (err?.name === 'AbortError' || err?.message?.includes('aborted')) return;
        if (import.meta.env.DEV) console.warn('[useConsistentFetch] Fetch error:', err);
      }
    });
  }

  // Reactive watch: fires when programs, programId, or sfvId change.
  // Covers: program/SFV combo changes, company change (programs reload).
  watch(
    [() => analyzeStore.getAllPrograms, getProgramId, getSfvId],
    () => tryFetch()
  );

  // onMounted: covers first mount and F5 refresh.
  // Runs AFTER the component is fully set up (auth tokens ready, DOM mounted),
  // so API calls won't fail with "Failed to fetch".
  // If programs aren't loaded yet, this is a no-op and the watch above
  // will catch the transition when programs arrive.
  onMounted(() => tryFetch());

  return {
    /** Force a re-fetch (e.g. on keyLists change, filter reset, etc.) */
    triggerFetch: () => tryFetch(true),
  };
}
