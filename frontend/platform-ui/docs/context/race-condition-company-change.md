# Race Condition Fix: Company Change & Inconsistent API Calls

## Overview

This document describes the race condition bugs discovered during company switching in the
Opportunity Overview tab (and related List tabs), the root causes, the full data flow, and
every fix applied.

---

## The Problem

When a user switches between companies rapidly, the frontend fired API calls with **mismatched
context**: a `targetProgramUuid` from one company paired with an `activeSpendFileVersion` from
a different company. The backend rejected these combinations with **HTTP 500**.

Symptoms observed:
- `GET /api/filters/program/parents/summary` → 500
- `GET /api/filters/program/spends/summary` → 500
- `POST /api/graphql` → 500 ("Invalid targetProgramUuid")

---

## Root Cause Analysis

### Company change sequence (happy path)

```
User selects Company B
│
├─► HomeNavbar.changeCompany()
│     ├─ cleanupBeforeCompanyChange()        → setDisableWatchers(true)
│     ├─ userStore.postUserCompany()         [API call #1: set active company]
│     └─ callbackSuccess
│           └─ userStore.whoAmI()            [API call #2: refresh user session]
│                 └─ callbackSuccess
│                       ├─ user.activeSpendFileVersion ← NEW company's SFV  ✓
│                       └─ getMaxDateSpend(…, onComplete=cleanupAfterCompanyChange)
│                             └─ changeCurrencyRate(…, onComplete)
│                                   ├─ goToHomeDashboard() → router.push()
│                                   └─ onComplete() → setDisableWatchers(false)  ✓
│
└─► (simultaneously) Route updates → props.selectedProgramId = Company B's program UUID
      └─ HomeOpportunity.watch(props)
            └─ getInitProgramAPI()
                  └─ analyzeStore.getProgram()    [API call #3: fetch program data]
                        └─ callbackSuccess
                              └─ keyTabsViews++   → triggers tab remount
```

### The race condition

`getProgram()` (API call #3) and `whoAmI()` (API call #2) run **concurrently** with no
coordination. Depending on network latency, either can finish first:

```
SCENARIO A — getProgram() finishes BEFORE whoAmI()            ← CAUSES 500

  t=0    setDisableWatchers(true)
  t=300  getProgram() responds → keyTabsViews++
           → ChartsLists.vue remounts (Overview tab)
           → ListsByChartsValue.vue mounts
           → onMounted() → loadGridsData() → fetchTotalsbyLevel()
               targetProgramUuid       = Company B   ← correct (from route)
               activeSpendFileVersion  = Company A   ← STALE (whoAmI not done yet)
               → Backend: "SFV does not belong to this program" → HTTP 500

  t=800  whoAmI() responds → user.activeSpendFileVersion = Company B's SFV
           → setDisableWatchers(false)
           (too late — the bad request already fired)


SCENARIO B — whoAmI() finishes BEFORE getProgram()            ← No error

  t=0    setDisableWatchers(true)
  t=500  whoAmI() responds → user.activeSpendFileVersion = Company B's SFV ✓
           → setDisableWatchers(false)
  t=800  getProgram() responds → keyTabsViews++
           → ListsByChartsValue.vue mounts
           → onMounted() → loadGridsData() → fetchTotalsbyLevel()
               targetProgramUuid      = Company B  ✓
               activeSpendFileVersion = Company B  ✓
               → HTTP 200
```

### Secondary race: unguarded reactive watchers

Even without the `onMounted` timing issue, several `watch()` callbacks throughout the app
reacted to store mutations that fire DURING a company change (e.g. `getFiltersApplied`
being reset to `[]`). Without a guard, these watchers fired immediately with:

- New `spendFileVersionActiveId` (just updated)
- Old `selectedProgramId` (route not yet updated)

or vice-versa, again producing mismatched API requests.

---

## The Fix: Two-Layer Defense

### Layer 1: `getDisableWatchers` Guard Pattern (timing-based)

Prevents ALL reactive work during the company/SFV transition window.
Applied in Vue watchers and lifecycle hooks.

### Layer 2: `isProgramSfvConsistent()` Check (data-based)

Validates that `targetProgramUuid` belongs to `activeSpendFileVersion` by checking against
`analyzeStore.allPrograms` before any API call fires. Applied at the API function layer.
This catches any mismatch that slips through Layer 1 — e.g., a new watcher added without
the `getDisableWatchers` guard. See `src/utils/validation/programSfvConsistency.ts` and
`docs/plans/program-sfv-consistency-check.md` for full details.

**Guarded API files:**

- `src/modules/home/api/index.ts` — `getUniqueData()`, `postChartData()`
- `src/modules/home/analyze/api/index.ts` — 9 functions (waterfall, potentials, payment terms, distribution, spend info, nine boxes, config update, stats agreed, status cards)
- `src/modules/globalFilters/api/index.ts` — `fieldAPIRead()`
- `src/utils/graphqlUtils.ts` — `getCollectionData()` (covers ALL GraphQL queries with program+SFV params, extracted via regex from query string)

---

## Layer 1 Details: `getDisableWatchers` Guard Pattern

### What it does

`globalFiltersStore.getDisableWatchers` is a boolean flag that is set to `true` at the
START of a company or spend-file change, and reset to `false` once the new context is
fully established (after `whoAmI()` or `changeActualFile()` callbacks complete).

While `true`, **no component should fire data-loading API calls**, because the store
is in a transitional state where `selectedProgramId` and `activeSpendFileVersion` may
belong to different companies.

### Lifecycle of the flag

```
setDisableWatchers(true)            ← set in cleanupBeforeCompanyChange() / changeCurrentSpendFileVersion()
  │
  │   [API calls in flight: postUserCompany, whoAmI, getMaxDateSpend, changeCurrencyRate, ...]
  │
  │   [goToHomeDashboard() → sectionTogo() → router.push()]
  │
setDisableWatchers(false)           ← set in cleanupAfterCompanyChange(), called as onComplete callback
                                       AFTER goToHomeDashboard() inside changeCurrencyRate.callbackSuccess
                                       / changeActualFile callbackSuccess
```

**Important timing detail:** `cleanupAfterCompanyChange()` is NOT called synchronously in
`whoAmI.callbackSuccess`. Instead it is passed as an `onComplete` callback through
`getMaxDateSpend() → changeCurrencyRate()`, and only called AFTER `goToHomeDashboard()`
returns. This ensures the flag stays `true` for the entire async chain (whoAmI → getMaxDateSpend
→ changeCurrencyRate → goToHomeDashboard → router.push), preventing stale mounted components
from firing API calls during the navigation sequence.

Safety fallback: a 15-second `setTimeout` re-enables the flag if any error path fails
to call `cleanupAfterCompanyChange()`.

---

## Files Fixed

### 1. `src/modules/home/analyze/components/list/ListsByChartsValue.vue`

Used by: `ChartsLists.vue` → `HomeAnalyzeProgramOverview.vue` (the **Overview tab**).

**Problems fixed:**

| Location | Problem | Fix |
|---|---|---|
| `onMounted()` | Called `loadGridsData()` unconditionally on every mount, including mounts triggered by `keyTabsViews++` during company change | Added `getDisableWatchers` guard; skips load if flag is true |
| `watch(entitySelectedTrackingNumber)` | Reacted to entity tracking number changes during company change | Added `getDisableWatchers` guard |
| `watch(() => props.keyLists)` | Reacted to `keyLists++` from `ChartsLists.vue.onMounted` during tab remount | Added `getDisableWatchers` guard |
| `watch(getFiltersApplied)` | Reacted to filter reset (`[]`) that fires during `cleanupBeforeCompanyChange()` | Added `getDisableWatchers` guard |
| `watch(gridColumnsSpends)` | `getCustomHeaderTitles()` in `onMounted` sets columns before the guard check; watcher fires and calls `fetchDataSpends(true)` with mismatched context | Added `getDisableWatchers` guard |
| `watch(gridColumnsSuppliers)` | Same as `gridColumnsSpends` — calls `fetchDataSuppliers(true)` without guard | Added `getDisableWatchers` guard |
| `watch(gridColumnsParents)` | Same as `gridColumnsSpends` — calls `fetchDataParents(true)` without guard | Added `getDisableWatchers` guard |
| `watch(props.itemSelectedInCharts)` | Called `loadGridsData(true)` on chart selection changes without guard | Added `getDisableWatchers` guard |

> **Note on `watch(getDisableWatchers)` recovery watcher:** A recovery watcher was initially
> added to reload data when the flag transitions `true → false`. It was removed because it
> fired **before** the route updates to the new company's program (route update happens via
> `getMaxDateSpend()` which is called before `cleanupAfterCompanyChange()`, but the watcher
> fires on the same tick as the flag change). This caused `props.selectedProgramId` to still
> hold the OLD company's value → new mismatch → HTTP 500. The `onMounted` guard is sufficient:
> the component is always remounted after the route stabilizes, at which point
> `getDisableWatchers` is already false.

### 2. `src/modules/home/analyze/views/Lists.vue`

Used by: `HomeAnalyzeProgramList.vue` (the **List tab**, kept alive in background by
`<keep-alive>` in `HomeOpportunity.vue`).

Same set of problems and identical fixes as `ListsByChartsValue.vue`.

### 3. `src/modules/home/analyze/views/HomeAnalyzeProgramOverview.vue`

**Problem fixed:** `watch(filtersApplied)` reacted to the filter reset fired during
`cleanupBeforeCompanyChange()`, triggering `getInitProgramAPI()` with stale program UUID.

**Fix:** Added `getDisableWatchers` guard inside the watcher callback.

### 4. `src/modules/home/analyze/views/HomeOpportunity.vue`

**Problem fixed:** `watch(getFiltersApplied)` triggered `getInitProgramAPI()` during
company change when filters were reset to `[]`.

**Fix:** Added `getDisableWatchers` guard.

### 5. `src/modules/globalFilters/composables/useGlobalFilters.ts`

**Problem fixed:** The `globalFiltersApplied` computed setter and the `globalFiltersAppliedFilters`
computed getter/setter were propagating filter state mutations during company change,
causing cascading reactive updates across all filter-dependent components.

**Fix:** Added `getDisableWatchers` guard in all four get/set paths.

### 6. `src/modules/home/views/HomeDashBoard.vue`

**Problem fixed:** `watch(globalFiltersData)` reacted to filter reset during company
change, firing `reactiveFnsByProgram()` with stale context.

**Fix:** Added `getDisableWatchers` guard.

### 7. `src/modules/components/metrics/MetricsComponents.vue`

**Problem fixed:** `watch(getFiltersApplied)` called `postCategoriesData()` during
company change.

**Fix:** Added `getDisableWatchers` guard.

### 8. `src/modules/home/plan/components/PlanLists.vue`

**Problem fixed:** `watch(getFiltersApplied)` called GraphQL queries during company
change with mixed context.

**Fix:** Added `getDisableWatchers` guard.

### 9. `src/modules/home/categorize/views/Lists.vue`

**Problem fixed:** Same as `PlanLists.vue` — `watch(getFiltersApplied)` fired GraphQL
queries during company change.

**Fix:** Added `getDisableWatchers` guard.

### 10. `src/modules/home/entityCard/views/EntityCard.vue`

**Problem fixed:** `watch(currentGlobalFilters)` called `setGlobalFiltersFn()` during
company change.

**Fix:** Added `getDisableWatchers` guard.

### 11. `src/modules/home/manageModule/views/Overview.vue`

**Problem fixed:** `watch(getFiltersApplied)` called `reactiveFns()` during company
change.

**Fix:** Added `getDisableWatchers` guard.

---

## Key Data Flows

### Flow 1: Tab remount via `keyTabsViews`

```
HomeNavbar.changeCompany()
  │
  ├─ setDisableWatchers(true)
  │
  ├─ postUserCompany() → whoAmI()
  │     └─ user.activeSpendFileVersion = NEW company's SFV
  │         → getMaxDateSpend() → changeCurrencyRate() → goToHomeDashboard()
  │             setDisableWatchers(false)   ← via onComplete after goToHomeDashboard()
  │
  └─ (route update) → HomeOpportunity.watch(props)
        └─ getInitProgramAPI() → analyzeStore.getProgram()
              └─ callbackSuccess → keyTabsViews++
                    │
                    └─ <keep-alive :key="currentTab + keyTabsViews">
                          │
                          └─ HomeAnalyzeProgramOverview remounts
                                └─ ChartsLists remounts
                                      ├─ onMounted → keyLists++
                                      │
                                      └─ ListsByChartsValue remounts
                                            ├─ onMounted()
                                            │   [GUARD: skip if getDisableWatchers]
                                            │   [NEW WATCHER: reload when flag → false]
                                            │
                                            ├─ watch(keyLists)
                                            │   [GUARD: skip if getDisableWatchers]
                                            │
                                            └─ watch(entitySelectedTrackingNumber)
                                                [GUARD: skip if getDisableWatchers]
```

### Flow 2: Filter reset cascade during `cleanupBeforeCompanyChange`

```
cleanupBeforeCompanyChange()
  │
  ├─ setDisableWatchers(true)
  │
  └─ globalFiltersStore.setFiltersApplied({ filters: [], logic: "and" })
        │
        └─ Triggers all watchers observing getFiltersApplied:
              ├─ HomeAnalyzeProgramOverview.watch(filtersApplied)  [GUARD]
              ├─ HomeOpportunity.watch(getFiltersApplied)          [GUARD]
              ├─ HomeDashBoard.watch(globalFiltersData)            [GUARD]
              ├─ MetricsComponents.watch(getFiltersApplied)        [GUARD]
              ├─ PlanLists.watch(getFiltersApplied)                [GUARD]
              ├─ categorize/Lists.watch(getFiltersApplied)         [GUARD]
              ├─ EntityCard.watch(currentGlobalFilters)            [GUARD]
              ├─ Overview.watch(getFiltersApplied)                 [GUARD]
              ├─ analyze/Lists.watch(getFiltersApplied)            [GUARD]
              └─ ListsByChartsValue.watch(getFiltersApplied)       [GUARD]
              (all return early — no API calls fired)
```

---

## Guard Pattern Reference

Every place `getDisableWatchers` is checked should include this comment block to explain
why it exists. See the individual file sections below.

### Standard guard (watcher that loads data)

```typescript
watch(() => someReactiveValue, (newValue) => {
  /**
   * RACE CONDITION GUARD
   *
   * During a company or spend-file change, the store goes through a transitional
   * state where selectedProgramId (from the route) and activeSpendFileVersion
   * (from the user session) may belong to DIFFERENT companies.
   *
   * setDisableWatchers(true) is set at the START of changeCompany() /
   * changeCurrentSpendFileVersion(), and reset to false only after whoAmI() /
   * changeActualFile() callbacks complete — i.e., when both pieces of context
   * are guaranteed to be consistent.
   *
   * Firing API calls during this window causes the backend to receive a
   * targetProgramUuid that does not match the activeSpendFileVersion, resulting
   * in HTTP 500 errors.
   *
   * See: docs/race-condition-company-change.md
   */
  if (globalFiltersStore.getDisableWatchers) {
    return;
  }
  // ... normal logic
});
```

### Guard in `onMounted` (paired with re-trigger watcher)

```typescript
onMounted(async () => {
  // ...setup...

  /**
   * RACE CONDITION GUARD — onMounted
   *
   * This component can be remounted by keyTabsViews++ in HomeOpportunity.vue,
   * which fires inside analyzeStore.getProgram() callbackSuccess. That callback
   * can run BEFORE whoAmI() has finished updating user.activeSpendFileVersion
   * to the new company's value.
   *
   * If we call loadGridsData() here while getDisableWatchers is true, we risk
   * sending targetProgramUuid (new company) + activeSpendFileVersion (old company)
   * to the backend → HTTP 500.
   *
   * The paired watch(getDisableWatchers) below will call loadGridsData() once
   * the flag transitions false, guaranteeing both values are consistent.
   *
   * See: docs/race-condition-company-change.md
   */
  if (!globalFiltersStore.getDisableWatchers) {
    await loadGridsData(true);
  }
});

// Re-trigger data load after company change completes
watch(
  () => globalFiltersStore.getDisableWatchers,
  (newValue, oldValue) => {
    /**
     * RACE CONDITION RECOVERY
     *
     * When getDisableWatchers transitions from true → false, it means the
     * company change is fully complete: whoAmI() has returned and
     * user.activeSpendFileVersion now belongs to the same company as
     * selectedProgramId (from the route).
     *
     * This watcher handles the case where onMounted() was skipped above
     * because the flag was still true at mount time (i.e. getProgram()
     * returned before whoAmI()). Without this recovery, the grids would
     * remain empty after the company change completes.
     *
     * See: docs/race-condition-company-change.md
     */
    if (oldValue === true && newValue === false) {
      loadGridsData(true);
    }
  }
);
```

---

## Where `setDisableWatchers` is Set

| File | Location | Set to | Trigger |
|---|---|---|---|
| `useCompanyChangeOptimizer.ts` | `cleanupBeforeCompanyChange()` | `true` | Start of company change |
| `useCompanyChangeOptimizer.ts` | `cleanupAfterCompanyChange()` | `false` | Called as `onComplete` after `goToHomeDashboard()` in `changeCurrencyRate.callbackSuccess` |
| `useCompanyChangeOptimizer.ts` | safety `setTimeout` 15s | `false` | Fallback if error skips cleanup |
| `HomeNavbar.vue` | `changeCurrencyRate.callbackSuccess` (after `goToHomeDashboard()`) | `false` | Via `onComplete?.()` — `cleanupAfterCompanyChange` passed as callback |
| `HomeNavbar.vue` | `changeCurrencyRate.callbackError` | `false` | Via `onComplete?.()` — prevents flag stuck at `true` on API error |
| `HomeNavbar.vue` | `changeCurrentSpendFileVersion()` start | `true` | Start of spend file change |
| `HomeNavbar.vue` | `changeActualFile` callbackSuccess | `false` | After spend file API completes |
| `HomeNavbar.vue` | `changeActualFile` callbackError | `false` | On error path |
| `HomeNavbar.vue` | safety `setTimeout` 15s | `false` | Fallback if error skips cleanup |

---

## Testing

Verified with Playwright stress tests cycling through 10 companies at:
- **Slow** (1200–2000 ms intervals): 0 errors
- **Medium** (500–900 ms intervals): 0 errors
- **Fast** (200–400 ms intervals): 0 critical errors (500s eliminated)
- **Very fast** (100–200 ms intervals): 0 critical errors

`ERR_ABORTED` on `analyze_programs` requests are **expected and correct** — they are
intentionally cancelled when the user changes company before the previous response arrives
(axios `cancelToken` mechanism).
