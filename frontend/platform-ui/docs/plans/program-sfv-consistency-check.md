# Plan: Program–SFV Consistency Check (Defense in Depth)

## Context

The `getDisableWatchers` flag prevents API calls during company/SFV changes by gating
reactive watchers. This works well but is **timing-based** — it requires every watcher to
include the guard manually, and any new watcher added without the guard re-introduces the
race condition.

This plan adds a **data-based** safety net: before any API call that sends both
`targetProgramUuid` and `targetSpendFileVersionUuid`, validate that the program actually
belongs to the SFV. If they don't match, skip the call silently. This catches mismatches
regardless of their origin — forgotten guards, new watchers, edge cases in timing.

### Why both layers?

| Layer | What it prevents | Weakness |
|-------|-----------------|----------|
| `getDisableWatchers` flag | ALL reactive work during transition (perf + correctness) | Must be added to every watcher manually |
| Consistency check | Mismatched program+SFV reaching the backend | Only covers calls with both params; needs `allPrograms` loaded |

They are complementary. The flag is the primary defense; the consistency check is the last
line of defense before the HTTP request fires.

---

## Data Available for Validation

### `analyzeStore.allPrograms`

- **Type:** `Array<any>` (actually `Program[]`)
- **Source:** Fetched via `GET /api/spend_file_versions/{SFV}/analyze_programs`
- **Updated by:** `useProgram` composable watches `spendFileVersionActiveId` changes
- **Reset:** `analyzeStore.setInitialState()` sets it to `[]`

Each `Program` object contains:

```typescript
{
  "@id": "/api/analyze/programs/{uuid}",
  "id": string,                          // UUID (derived from @id)
  "spendFileVersion": {
    "@id": "/api/spend_file_versions/{sfv-uuid}",
    "@type": string,
    "version": number,
    "name": string
  }
}
```

### Validation logic

```
Given: targetProgramUuid, activeSpendFileVersion (both as plain UUIDs, IRI already stripped)

1. If targetProgramUuid is null/empty   → PASS (call doesn't target a specific program)
2. If activeSpendFileVersion is null/empty → PASS (call doesn't target a specific SFV)
3. If allPrograms is empty              → FAIL (programs not loaded yet = transitional state)
4. Find program in allPrograms where removeIRI(program["@id"]) === targetProgramUuid
   - Not found                          → FAIL (program doesn't belong to current context)
   - Found: check removeIRI(program.spendFileVersion["@id"]) === activeSpendFileVersion
     - Match                            → PASS
     - Mismatch                         → FAIL (program belongs to different SFV)
```

On FAIL: return early without making the API call. Log a warning in DEBUG mode.

---

## Implementation

### Step 1: Create the validation utility

**File:** `src/utils/validation/programSfvConsistency.ts` (new)

```typescript
import { useAnalyzeStore } from "@/stores/analyze";
import { StringUtils } from "@/utils/StringUtils";

const DEBUG = import.meta.env.DEV;

/**
 * Validates that a targetProgramUuid belongs to the given activeSpendFileVersion
 * by checking against the currently loaded programs in the analyze store.
 *
 * Returns `true` if the call is safe to proceed, `false` if the parameters are
 * inconsistent and the call should be skipped.
 *
 * This is a defense-in-depth check — the primary defense is the `getDisableWatchers`
 * flag in globalFiltersStore. This function catches any mismatches that slip through.
 *
 * See: docs/context/race-condition-company-change.md
 * See: docs/plans/program-sfv-consistency-check.md
 */
export function isProgramSfvConsistent(
  targetProgramUuid: string | null | undefined,
  activeSpendFileVersion: string | null | undefined
): boolean {
  // If either param is absent, the call doesn't pair them — no risk
  if (!targetProgramUuid || !activeSpendFileVersion) {
    return true;
  }

  const analyzeStore = useAnalyzeStore();
  const programs = analyzeStore.getAllPrograms;

  // Programs not loaded yet — transitional state, skip the call
  if (!programs || programs.length === 0) {
    if (DEBUG) {
      console.warn(
        "[consistency-check] Skipping API call: allPrograms is empty " +
        "(transitional state). targetProgramUuid:", targetProgramUuid,
        "activeSpendFileVersion:", activeSpendFileVersion
      );
    }
    return false;
  }

  // Normalize: strip IRI prefixes for comparison
  const normalizedProgramId = StringUtils.removeIRI(targetProgramUuid);
  const normalizedSfvId = StringUtils.removeIRI(activeSpendFileVersion);

  // Find the program in the loaded list
  const program = programs.find(
    (p: any) => StringUtils.removeIRI(p["@id"]) === normalizedProgramId
  );

  if (!program) {
    if (DEBUG) {
      console.warn(
        "[consistency-check] Skipping API call: program", normalizedProgramId,
        "not found in allPrograms (", programs.length, "programs loaded).",
        "activeSpendFileVersion:", normalizedSfvId
      );
    }
    return false;
  }

  // Validate the program's SFV matches the active SFV
  const programSfvId = StringUtils.removeIRI(program.spendFileVersion?.["@id"] ?? "");

  if (programSfvId !== normalizedSfvId) {
    if (DEBUG) {
      console.warn(
        "[consistency-check] Skipping API call: MISMATCH.",
        "Program", normalizedProgramId, "belongs to SFV", programSfvId,
        "but active SFV is", normalizedSfvId
      );
    }
    return false;
  }

  return true;
}
```

### Step 2: Add the check to `getUniqueData()`

**File:** `src/modules/home/api/index.ts`
**Function:** `getUniqueData()` (line ~812)
**Call sites covered:** 9 (ListsByChartsValue, Lists, ListsCFEdit, ListsNineboxes, categorize/Lists, OverviewList, PlanEditLists, PlanLists, ListCatalog)

```typescript
import { isProgramSfvConsistent } from "@/utils/validation/programSfvConsistency";

export async function getUniqueData({ ... }: GetUniqueDataParams): Promise<ApiResponse> {
  // Defense-in-depth: validate program belongs to the active SFV
  if (!isProgramSfvConsistent(targetProgramUuid, activeSpendFileVersion)) {
    return { data: null, status: 0 } as ApiResponse; // Silent skip
  }

  // ... existing implementation unchanged ...
}
```

> **Return value on skip:** Return a neutral response object that calling code can handle
> gracefully (no data, no error). Check what `ApiResponse` looks like and match the
> "empty but not error" shape. The callers already handle `null`/empty data from the API.

### Step 3: Add the check to analyze API functions

**File:** `src/modules/home/analyze/api/index.ts`
**Functions to guard (9 total):**

| # | Function | Line | Program param | SFV param |
|---|----------|------|---------------|-----------|
| 1 | `getWaterfallDataForChart` | 32 | `programUUID` | `spendFileVersion` |
| 2 | `getProgramPotentialsPost` | 242 | `programId` | `targetSpendFileVersionUuid` |
| 3 | `getProgramPaymentTerms` | 343 | `programId` | `targetSpendFileVersionUuid` |
| 4 | `getProgramDistribution` | 372 | `programId` | `targetSpendFileVersionUuid` |
| 5 | `getProgramSpendInfo` | 402 | `programId` | `targetSpendFileVersionUuid` |
| 6 | `nineBoxesDataAPIReadAll` | 484 | `programId` | `spendFileVersionId` |
| 7 | `spendProgramConfigurationAPIUpdate` | 974 | `filters.targetProgramUuid` | `filters.targetSpendFileVersionUuid` |
| 8 | `getStatsAgreed` | 1089 | `programId` | `targetSpendFileVersionUuid` |
| 9 | `getStatusCardsNumber` | 1131 | `programId` | `targetSpendFileVersionUuid` |

For each function, add at the top:

```typescript
if (!isProgramSfvConsistent(programId, targetSpendFileVersionUuid)) {
  return { data: null, status: 0 } as ApiResponse; // or appropriate empty return
}
```

> **Note:** Parameter names vary per function. Map them correctly:
> - `getWaterfallDataForChart`: `isProgramSfvConsistent(programUUID, spendFileVersion)`
> - `nineBoxesDataAPIReadAll`: `isProgramSfvConsistent(programId, spendFileVersionId)`
> - `spendProgramConfigurationAPIUpdate`: `isProgramSfvConsistent(filters.targetProgramUuid, filters.targetSpendFileVersionUuid)`

### Step 4: Add the check to remaining API files

**File:** `src/modules/globalFilters/api/index.ts`
**Function:** `fieldAPIRead()` (line 12)

```typescript
if (!isProgramSfvConsistent(targetProgramUuid, targetSpendFileVersionUuid)) {
  return { data: null, status: 0 };
}
```

**File:** `src/stores/home.ts`
**Function:** `postChartData()` (line ~829)

```typescript
if (!isProgramSfvConsistent(programUUID, spendFileUUID)) {
  return;
}
```

### Step 5: Add the check to GraphQL queries

**File:** `src/utils/graphqlUtils.ts`
**Function:** `getCollectionData()` — the single entry point for ALL GraphQL queries

GraphQL queries embed `targetProgramUuid` and `targetSpendFileVersionUuid` as string
interpolations in the query string (e.g. `targetProgramUuid: "uuid-123"`). Since the
parameters are baked into the string, the check extracts them via regex before firing.

```typescript
import { isProgramSfvConsistent } from "@/utils/validation/programSfvConsistency";

const programUuidRegex = /targetProgramUuid:\s*"([^"]+)"/;
const sfvUuidRegex = /targetSpendFileVersionUuid:\s*"([^"]+)"/;

export const getCollectionData = async (queryString: string, abortSignal?: AbortSignal | null) => {
  const programMatch = queryString.match(programUuidRegex);
  const sfvMatch = queryString.match(sfvUuidRegex);

  if (programMatch && sfvMatch) {
    if (!isProgramSfvConsistent(programMatch[1], sfvMatch[1])) {
      // Return empty data — callers access response.data.<collection>.edges
      // which will throw, caught by their existing try/catch blocks
      return { data: {} };
    }
  }

  // ... existing apolloClient.query() ...
};
```

**Why `{ data: {} }` instead of null:** All callers do `response.data.suppliers.edges.map()`.
Returning `{ data: {} }` causes `response.data.suppliers` to be `undefined`, which throws
a `TypeError` caught by each caller's `try/catch` block that already handles errors
gracefully (logs in DEBUG, resets loading state).

**Call sites covered:** All GraphQL queries across 17+ components including:

- `ListsByChartsValue.vue` — `getSpendsData`, `getSupplierData`, `getParentsData`
- `Lists.vue` — same pattern
- Grid components (`SupplierGridAnalyze`, `ParentGridAnalyze`, etc.)
- `PlanLists.vue`, `PlanEditLists.vue`, `ListsCFEdit.vue`, `ListsNineboxes.vue`

### Step 6: Handle the "empty programs" edge case

When `allPrograms` is `[]` (during store reset via `setInitialState()` or before first load),
the consistency check will **block all calls** that include a `targetProgramUuid`. This is the
correct behavior during company change. However, after navigation completes and the new
programs load, calls will automatically succeed again.

**Verify this doesn't block initial page load:**
- On first page load, `allPrograms` is `[]` until `useProgram` fetches them
- During this time, do components try to call `getUniqueData()` with a `targetProgramUuid`?
- If yes: the call will be blocked, and the component needs to retry when programs load
- The existing `watch(spendFileVersionActiveId)` in `useProgram.ts` triggers program fetch,
  and components already re-render when `keyTabsViews++` fires after `getProgram()` completes
- **Expected behavior:** Components mount → skip call (programs empty) → programs load →
  `keyTabsViews++` → components remount → call succeeds (programs now loaded) — no issue

### Step 6: Update documentation

Update `docs/context/race-condition-company-change.md` to document the consistency check
as the second layer of defense.

---

## Files to Create/Modify

| Action | File | Description |
|--------|------|-------------|
| CREATE | `src/utils/validation/programSfvConsistency.ts` | Validation utility function |
| MODIFY | `src/modules/home/api/index.ts` | Add check in `getUniqueData()`, `postChartData()` |
| MODIFY | `src/modules/home/analyze/api/index.ts` | Add check in 9 functions |
| MODIFY | `src/modules/globalFilters/api/index.ts` | Add check in `fieldAPIRead()` |
| MODIFY | `src/utils/graphqlUtils.ts` | Add check in `getCollectionData()` (covers all GraphQL queries) |
| MODIFY | `docs/context/race-condition-company-change.md` | Document the new layer |

---

## Testing Strategy

1. **Manual smoke test:** Switch companies normally — all data should load correctly
2. **Stress test (Playwright):** Run the company-switching stress test at all speed tiers
   - Verify 0 HTTP 500 errors across all rounds
   - Verify `[consistency-check]` warnings appear in console during fast switches (expected)
3. **Edge case:** Open the app directly on a program URL (deep link) — verify data loads
   after programs are fetched (not blocked permanently)
4. **Unit test:** Test `isProgramSfvConsistent()` with:
   - `null` program → returns `true`
   - `null` SFV → returns `true`
   - Empty `allPrograms` → returns `false`
   - Program not in list → returns `false`
   - Program in list, SFV matches → returns `true`
   - Program in list, SFV mismatch → returns `false`

---

## Future Developer Guide

### When to use `getDisableWatchers` guard

Add this guard to any **watcher or lifecycle hook** that triggers API calls loading data.
It prevents unnecessary work during company/SFV transitions.

```typescript
watch(() => someReactiveValue, () => {
  if (globalFiltersStore.getDisableWatchers) { return; }
  // ... load data
});
```

### When the consistency check protects you automatically

If your API call goes through one of the guarded functions (`getUniqueData`, analyze API
functions, etc.), the consistency check runs automatically. **You don't need to do anything
extra** — mismatched program+SFV combinations are silently blocked.

### When to add a NEW consistency check

If you create a **new API function** that sends both `targetProgramUuid` and
`targetSpendFileVersionUuid` to the backend, add the check at the top:

```typescript
import { isProgramSfvConsistent } from "@/utils/validation/programSfvConsistency";

export async function myNewApiCall(programId: string, sfvId: string, ...): Promise<...> {
  if (!isProgramSfvConsistent(programId, sfvId)) {
    return { data: null, status: 0 };
  }
  // ... normal implementation
}
```

### Debugging

In development mode (`import.meta.env.DEV`), the consistency check logs warnings to the
console with the `[consistency-check]` prefix. These warnings are expected during rapid
company switching and indicate the safety net is working. They should NOT appear during
normal single-company usage.

If you see persistent `[consistency-check]` warnings after a company change completes:
1. Check that `allPrograms` is being populated after navigation
2. Check that the program UUID in the route matches a program in `allPrograms`
3. Check that the programs' `spendFileVersion["@id"]` matches `spendFileVersionActiveId`

### Architecture diagram

```
                          LAYER 1: Timing Guard              LAYER 2: Data Guard
                          (getDisableWatchers)               (isProgramSfvConsistent)

User clicks              ┌─────────────────────┐
"Change Company"  ──────►│ setDisableWatchers   │
                         │ (true)               │
                         └────────┬────────────┘
                                  │
                    Watchers blocked here
                    (no reactive triggers)
                                  │
                         ┌────────▼────────────┐
                         │ whoAmI + navigation  │
                         │ async chain          │
                         └────────┬────────────┘
                                  │
                         ┌────────▼────────────┐
                         │ setDisableWatchers   │
                         │ (false)              │
                         └────────┬────────────┘
                                  │
                    Watchers re-enabled ──────────► API call attempted
                                                         │
                                                 ┌───────▼───────────────┐
                                                 │ isProgramSfvConsistent│
                                                 │ (targetProgramUuid,   │
                                                 │  activeSpendFileVer)  │
                                                 └───────┬───────────────┘
                                                         │
                                                   ┌─────┴─────┐
                                                   │           │
                                                PASS         FAIL
                                                   │           │
                                            API call      Silent skip
                                            proceeds      (log warning)
```

### Decision matrix: which guard to use where

| Location | `getDisableWatchers` | `isProgramSfvConsistent` |
|----------|---------------------|-------------------------|
| Vue watcher that loads data | YES (add guard) | Automatic (if API function is guarded) |
| `onMounted` that loads data | YES (add guard) | Automatic (if API function is guarded) |
| API function with program+SFV | Not applicable | YES (add check at top) |
| API function without program+SFV | Not applicable | Not applicable |
| Store action triggering API | Consider adding | Automatic (if API function is guarded) |

---

## Rollback Plan

If the consistency check causes unexpected blocking of legitimate API calls:

1. The check is isolated in `isProgramSfvConsistent()` — a single function
2. To disable: make it always return `true`
3. The `getDisableWatchers` guards remain as the primary defense
4. Console warnings in DEV mode help identify false positives quickly
