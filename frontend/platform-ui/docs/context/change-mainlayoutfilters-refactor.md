# MainLayoutFilters.vue refactor

**Date:** 2026-08-24
**WI:** 19547 (US-1, child of Feature 8642 "Technical Debt/Improvements", Sprint 116)
**Status:** Two PRs so far. PR1 = Phase A subtraction (AC-05/06/07). PR2 (this section) = the first Phase B extraction, `GlobalFilterPanelBarItem.vue` + `PanelBarLevelSelector.vue` (AC-02), collapsing the 33-slot template into one generic component. The rest of Phase B (`useFiltersToBeApplied.ts`, `useGlobalFiltersItemSelection.ts`, etc. — AC-03/AC-04) is still not started.

## Scope of this PR

`apps/ap/src/modules/globalFilters/views/MainLayoutFilters.vue` (6,280 lines, unchanged in this PR — Phase A here is dead-code/console/i18n cleanup, not line-count reduction; that's Phase B's job), `apps/ap/src/modules/globalFilters/types.ts`, `apps/ap/src/modules/globalFilters/composables/useGlobalFiltersSaved.ts`, and the `globalFilters` locale namespace in `packages/design-system/src/locales/languages/{en,es}.json`.

## Verification before touching anything

Every Phase A claim in the WI was checked against the current code (line numbers had drifted only slightly — all within a few lines of what the WI said). One material correction:

- **The WI claims ~57 `console.*` calls, ~40 unguarded by `import.meta.env.DEV`.** The actual count is 61 total, and only **3** are unguarded (6016, 6018, 6210) — 58 were already correctly guarded. AC-06 ("every remaining call is guarded... the two debug lines are gone") only required fixing those 3, not a blanket rewrap of the file's logging.

Everything else the WI listed (the 5 dead `data` keys, the 7 dead `return`-block entries, the two commented-out lines, the fully-dead `globalFiltersTemplatesAPIReadAll`, the 4 hardcoded toast strings, the magic-number locations) checked out essentially as described.

## AC-05 — dead code removed

- **5 write-only `data` keys, removed from both the `reactive<Data>({...})` initializer and the `Data` interface in `types.ts`**: `keyAccordion`, `panelBarForceRerender`, `renderChangeLevel`, `responseCustomPointsArray`, `selectedLevel`. None were read anywhere (not even in the template, which the WI's own claim required checking since the template block ends well before these are declared). The `TargetView` import in `types.ts` became unused after removing `selectedLevel: TargetView` and was dropped.
- **7 entries removed from the `return { ... }` object only** — `clickOutsideRelated`, `filtersAppliedFilters`, `filtersAppliedGrouped`, `getIconNameByLabel`, `isNullOrUndefined`, `smeFeatureEnabled`, `templatesAPICreate`. **Important distinction the WI didn't spell out:** none of these are actually dead code — every one of them (the imported utils, the local computed values, the local function) is used internally elsewhere in `setup()`. They were only over-exposed to the template, which never reads any of them. Only the `return` object lines were deleted; the underlying `const`/`function`/import declarations are untouched and still load-bearing.
- **Two commented-out lines removed**, along with the explanatory comment immediately above each (since the explanation only existed to describe the dead code being removed, leaving it would be stale): `// globalFiltersTemplatesAPIReadAll()` (preceded by `// Reload templates`) in the template-delete success callback, and `// const globalFiltersDialogTarget = ref(null);` (preceded by `// ? - Use for targetting the dialog for the click outside feature`).
- **`globalFiltersTemplatesAPIReadAll` deleted entirely** from `useGlobalFiltersSaved.ts` — confirmed via repo-wide grep that its only reference anywhere was the now-removed commented-out call. Removing it left `globalFiltersStore` (the `useGlobalFiltersStore()` instance) and its import unused in that file too, so both were removed as well.

## AC-06 — no unguarded console output

- Deleted the two literal debug lines `console.log("** watch 3", val)` / `console.log("** watch 4", ...)`. They were sandwiched around a real statement (`globalFiltersDialogIsShowing.value = !globalFiltersDialogIsShowing.value;`) inside a `watch(() => userStore.showGlobalFiltersPanel, ...)` — only the two `console.log` calls were removed; the watcher and its toggle logic are untouched. Also dropped the now-unused `(val, oldVal)` watcher callback params, which existed only to feed the removed logging.
- Guarded the one remaining unguarded call, `console.error("** Error clicking on header-filter elements:", error)` inside `clickHeaderFilter()`'s `catch` block, with `if (import.meta.env.DEV)`. DEV-guarding a `console.*` is one of the two explicitly allowed exceptions to "strictly behaviour-preserving" in the WI's ground rules.

## AC-07 — no hardcoded user-facing English

Four `toast.error(...)` calls previously passed literal English strings, in a component that otherwise sources 100% of its user-facing text from `translate.t(...)`. Added matching keys under the existing `globalFilters` namespace in both locale files and switched the call sites to `translate.t(...)`:

| Call site | Old literal | New key |
|---|---|---|
| `handleClickSave` — duplicate template name | `"Template name already exists"` | `globalFilters.errorTemplateNameExists` |
| `templatesAPICreate` — empty name | `"Filter name field is required"` | `globalFilters.errorTemplateNameRequired` |
| `templatesAPIUpdate` — no active template id | `"Select a template first"` | `globalFilters.errorTemplateNotSelected` |
| `globalFiltersTemplatesAPIDelete` — invalid/empty template list | `"Error: There was an error deleting the template"` | `globalFilters.errorTemplateDeleteInvalid` |

The English values were kept byte-identical (`AC-01` behaviour-preservation for the English locale); Spanish translations were added for the `es.json` counterpart, since AC-07 explicitly asks for real translation, not just relocation of the English string. Note `errorTemplateDeleteInvalid` is deliberately a new key, not a reuse of the existing `globalFilters.errorTemplateDelete` — that key already covers a different call site (the actual API-delete failure callback) with different wording; reusing it would have changed the rendered string at this call site.

## Explicitly deferred (not in this PR)

- **Magic-number naming** (carousel width `250`, `88`/`80` percent, slide offset `±300`, `computedDataPoints: 20` vs the hardcoded `[21..26]` custom-data-point range, z-index `98`/`2040`/`2060`). None of AC-01 through AC-12 requires this — it's mentioned only in the WI's prose. The `computedDataPoints`/`[21..26]` pair in particular touches the same custom-data-point mapping AC-10 explicitly flags as sensitive, and the z-index values are static inline `style` strings that would need converting to bound `:style` objects to reference a named constant — more template surgery than a pure rename. Deferred to a follow-up rather than risking scope creep in a PR meant to be small.
- **The rest of Phase B extraction** (`useFiltersToBeApplied.ts`, `useGlobalFiltersItemSelection.ts`, `useGlobalFiltersTemplates.ts`, `GlobalFiltersBar.vue`, etc.) — not started; the panel-bar-slot component is done, see the PR2 section below. This is most of the remaining 6,280 → ≤1,200 line reduction (AC-03) and the new-composable test coverage (AC-04); tracked as follow-up PRs per the WI's own sequencing.
- **Bug WI 19566** (the four `loadFilterData = true` mislabeled "Disable loading" handlers) — explicitly out of scope; that WI says this refactor must preserve the current (broken) behaviour verbatim, which it does (the four lines are untouched).

## Incident during this session (unrelated to the refactor itself)

While comparing typecheck output before/after this change, a `git stash && ... && git stash pop` one-liner had its `cd apps/ap` fail silently (already in that directory) and, because of a trailing `; git stash pop`, popped a **pre-existing, unrelated stash** — someone's in-progress `columnMenu` work on `GraphqlGridColumnGroup` (AR match grid, `apps/ar/src/modules/match/data/graphqlColumns.ts` + `packages/design-system/src/components/graphql-grid/types.ts`) — into the working tree. Caught immediately via `git status`/`git diff`; the two unrelated files were re-stashed with an explanatory message (`stash@{0}`) rather than discarded. Nothing from that WIP was included in this PR's diff or commit.

## PR1 verification

- `vue-tsc --noEmit` (from `apps/ap`): zero new errors — all output matches the pre-existing baseline (~90 unrelated errors across the app), none touching `MainLayoutFilters.vue`, `types.ts`, or `useGlobalFiltersSaved.ts`.
- `eslint` on the three edited source files: clean.
- Full `vitest run` (from `apps/ap`): 95/95 test files, 1562/1571 tests passing, 9 skipped, zero failures.

---

## PR2 — GlobalFilterPanelBarItem + PanelBarLevelSelector extraction (AC-02)

**Date:** 2026-08-24

The template between (pre-refactor) lines 612-2715 repeated the same Kendo `PanelBar` named-slot block 33-34 times, one per filter field. The WI describes this as "the same slot repeated verbatim 34 times" and estimates the collapse at "~2,100 lines → ~120." Before touching anything, every one of the 34 blocks was read in full (not sampled) and cross-diffed field-by-field, because the WI's "verbatim" framing turned out to be wrong in several material ways:

- **There are 5 body-component types rendered across these slots, not 4.** `entityCompanySize` renders `<CardsOption>` (a different loading skeleton, no `all-items-checked-changed` event) — a type the WI's tally of "19 MultipleCheckboxes / 8 RangeSliderKendo / 5 RadioButtonSelection / 1 TreeView = 33" doesn't count at all (making the real total 34).
- **`item.filterType` (the `FilterType` union: `multipleCheckboxes | treeView | rangeSlider | radioBtn`) does not determine which component a slot renders.** `entityCompanySize` is `filterType: "multipleCheckboxes"` but renders `CardsOption`, proven by grep: `FilterType` has no `cardsOption` member. Slot-to-component mapping is driven purely by field name (i.e. which literal `<template #field>` block existed), so the generic component needed its own field-keyed config table, not a switch on `item.filterType`.
- **The header ("Select Level" + ButtonGroup) is not byte-identical either.** 7 instances (`commodity`, `entityIndustryName`, and all 5 `RadioButtonSelection` fields) wrapped the `ButtonGroup` in an extra classless `<div class="">`; the rest didn't. Functionally and visually identical (no CSS targets that wrapper, no width/positioning is affected by an unstyled block-level div around a single child) — normalized away, since keeping it would have meant a genuinely pointless per-field branch.
- **RangeSliderKendo's header is a structurally different layout** (`d-flex justify-content-between mb-1` instead of `d-flex gap-3 align-items-center`), and **its "Clear" button appears in only 2 of 8 instances** (`modelPaymentTerms`, `customDataPoint21-26`) — not derivable from field name or type, so it's an explicit per-field flag (`showClearButton`) in the config table, not something the header component can infer on its own.
- **`MultipleCheckboxes`'s empty-state guard has 3 different variants** across its 19 slots: plain `!isEmpty(items)` (12 fields), `!hasOneValueAndIsEmpty(items) && !isEmpty(items)` for `programApplied`/`currencyCode`/`box`/`scfBox`/`financialBox`/`vCardBox` (6 fields, which also carry a `${field}CheckBoxesId`-shaped `id` — except `programApplied`, whose id is the irregular `programAppliedGlobalFilterCheckBoxesId`, preserved verbatim rather than derived), and `!isEmpty(items) && !hasEmptyValues(items)` for the dynamic `customDataPoint1-20` range. 4 of the 6 strict-guard fields (`box`/`scfBox`/`financialBox`/`vCardBox`) also pass `is-box-filter="true"`.
- **`planPhaseNames` (the one TreeView instance) has a bespoke "no plans" empty state**, not the universal `<PanelBarItemEmpty>` every other field falls back to.

None of this changed the plan (collapse to one generic component), but it did change its shape: a config-driven field map (`getPanelBarItemFieldConfig`), not a naive switch on `filterType`.

### What landed

- **`apps/ap/src/modules/globalFilters/config/panelBarItemFieldConfig.ts`** (new) — `getPanelBarItemFieldConfig(field)` returns `{ body, id?, isBoxFilter?, strictEmptyGuard?, excludeEmptyValues?, showClearButton? }` per field, reproducing every variant found above. `getAllPanelBarFieldNames(computedDataPoints)` returns the full slot-name list (32 static fields + the two dynamic customDataPoint ranges), replacing the two `v-for="n in ..."` dynamic-slot blocks the original template used only for custom data points — generalized to every field.
- **`apps/ap/src/modules/globalFilters/components/PanelBarLevelSelector.vue`** (new) — the "Select Level" header, presentational (`levels`/`buttonGroupOptions` props in, `level-changed`/`clear` events out). `variant="rangeSlider"` switches to the wider layout with the optional Clear button; the cosmetic wrapper-div difference above is not reproduced (normalized to the unwrapped markup for every field).
- **`apps/ap/src/modules/globalFilters/components/GlobalFilterPanelBarItem.vue`** (new) — the generic body: loading skeleton (2 variants), then a `v-else-if` chain over `config.body` reproducing each of the 5 component types with their exact guard/id/isBoxFilter/showClearButton variant, falling back to `<PanelBarItemEmpty>` (or TreeView's bespoke empty state). All events are forwarded up unchanged in shape (`level-changed`, `clear-filter`, `checkbox-item-changed`, `all-items-checked-changed`, `radio-item-changed`, `tree-view-checked-changed`, `range-slider-include-exclude-null`, `range-slider-min-max-changed`) — the actual handler logic (`panelBarItemSetLevelSelected`, `panelBarItemsMCheckboxesItemSetChecked`, etc.) stays exactly where it was, in `MainLayoutFilters.vue`'s `setup()`; only the markup moved. Given the composable extraction for that logic (`useGlobalFiltersItemSelection.ts` etc.) hasn't happened yet, function props (`getLevels`, `getButtonGroupOptions`, `isClearDisabled`) are passed down from the parent rather than duplicating any of that logic into the new components.
- **`MainLayoutFilters.vue`** — the entire `<PanelBar>` block collapsed from ~2,104 lines to a single `<template v-for="fieldName in panelBarSlotFieldNames" :key="fieldName" #[fieldName]="{ props }">` wrapping one `<GlobalFilterPanelBarItem>`. File dropped from 6,260 to 4,230 lines (of which the removed block was ~2,030 net). 9 now-dead imports/component registrations removed (`ButtonGroup`, `CardsOption`, `MultipleCheckboxes`, `PanelBarItemEmpty`, `RadioButtonSelection`, `RangeSliderKendo`, `SkeletonNCardsOptions`, `SkeletonNTextLines`, `TreeView` — confirmed zero remaining template references to each before removing). `data.rangeSliderIncludeExcludeNull` (write-only before this change, per Phase A's own findings) is still write-only — now set via the RangeSliderKendo slider's forwarded event instead of inline in the old template; not touched further, since it isn't part of this extraction's scope.

### Not touched

`filtersApply`, the feature-flag matrix building `panelBarItemsFormatted`, `panelBarItemOnSelect`'s lazy per-item data fetch, and every function the new components call into (`panelBarItemSetLevelSelected`, `panelBarItemsMCheckboxesItemSetChecked`, etc.) — all stayed exactly where they were and exactly as they were. This PR only moved markup into components and introduced the field-config lookup that markup needed; it did not touch any of the filter-application/API logic those composables (not yet extracted) will eventually own.

### PR2 verification

- `vue-tsc --noEmit` (from `apps/ap`): after fixing 5 new type errors in `GlobalFilterPanelBarItem.vue` (all `any[] | undefined` vs `any[]`, or `number | null | undefined` vs `number | undefined` — normalized with `?? []` / `?? undefined`), output is **byte-for-byte identical** to the Phase A (PR1) baseline: 252 lines, zero diff.
- `eslint` on all 4 new/edited files: clean.
- Full `vitest run` (from `apps/ap`): 95/95 test files, 1562/1571 tests passing, 9 skipped — identical pass count to PR1, zero regressions.
- No component/unit test mounts `MainLayoutFilters.vue` or the PanelBar directly (per the WI's own finding: zero tests do). Manual browser verification of the global-filters panel (every filter type: checkboxes, range sliders, radio buttons, the plan tree, company-size cards, the 26 custom-data-point slots) is the only real coverage until AC-04's composable extraction lands with real specs.

---

## PR3 — useFiltersToBeApplied.ts extraction (AC-04)

**Date:** 2026-08-24

Extracted the "Filters to be applied" block (the `filtersToBeApplied`/`filtersToBeAppliedGetFilter*`/`setFiltersToBeApplied*` family — a pure reducer over `FiltersApplied`, per the WI's own framing) into `apps/ap/src/modules/globalFilters/composables/useFiltersToBeApplied.ts`. This is one of the two composables AC-04 explicitly requires a real spec for.

### Design

- **`filtersToBeApplied` is passed in by reference, not owned by the composable** — same "shared state, don't fork it" pattern as `useEntityPrograms.ts` from the EntityCardOverview refactor (WI 19557). `data.filtersToBeApplied` is read/written in a dozen other places in `MainLayoutFilters.vue` outside this block (the template, `filtersApply()`, `filtersClearAll()`, several watchers, `addFieldToFiltersToBeApplied`/`updateFieldLevelInFiltersToBeApplied` used by `panelBarItemSetLevelSelected`) — none of those call sites moved, so the composable had to keep mutating the exact same object, never reassign it wholesale. One real fix required: the original `filtersToBeAppliedSet` did `data.filtersToBeApplied = ObjectUtils.cloneDeep(filters)` (a full reassignment) — reassigning a *parameter* inside the composable wouldn't propagate back to the caller's object, so it's now `filtersToBeApplied.filters = cloned.filters; filtersToBeApplied.logic = cloned.logic;` (mutate the same object's properties in place). Same final state, no behaviour change, verified by test.
- **`getItems`, `getLevelSelected`, `hasCustomDataPoint`, `getCustomFieldName` are passed in as getter/lookup functions**, not values — `data.items` gets reassigned (not just mutated) elsewhere in the shell (`data.items = data.items.map(...)`, etc.), so a captured array reference would go stale; a getter always reads the current one.
- **Everything the WI's own line range covers moved** (18 functions total): the public reducer API (`filtersToBeAppliedSet`, `setFiltersToBeAppliedAddFilter`, `filtersToBeAppliedGetFilterField`, `globalFiltersToBeAppliedRemoveFiltersGroupByField`, `setFiltersToBeAppliedRemoveFilter`, `setFiltersToBeAppliedCleanEmptyFilters`, `globalFiltersToBeAppliedIsFieldInFiltersToBeApplied`) plus 11 private helpers (`isValidSingleValue`, `isValidRangeValue`, `clearExistingFiltersForField`, `pushSingleValueFilter`, `pushRangeFilter`, `addFirstFilter`, `addNewFieldFilter`, `updateRangeSliderFilter`, `updateSingleValueFilter`, `filtersToBeAppliedGetFilterFieldIdx`, `filtersToBeAppliedGetFilterIdx`) that have zero external callers (confirmed by grep) and stay module-private.
- **Two helper functions just outside the WI's marked block stayed in the shell**: `addFieldToFiltersToBeApplied`/`updateFieldLevelInFiltersToBeApplied` (used only by `panelBarItemSetLevelSelected`) still mutate `data.filtersToBeApplied.filters` directly — safe, since it's the same object reference the composable now also holds.

### A pre-existing bug this surfaced: the `@/utils` barrel is not test-safe

Writing the spec hit a real, pre-existing, previously-undetected issue: any test that imports the bare `"@/utils"` barrel (or anything that transitively needs it — `ObjectUtils`, `StringUtils`, `isNullOrUndefined`, all of which live behind it) crashes with `TypeError: Cannot read properties of undefined (reading 'getRandomInt')` inside `MetricsComponents.vue`. Root cause, traced empirically:

`@/utils/index.ts` imports `FormatData.ts` → `useUserStore` (`@/stores/user.ts`) → `@/services/user/api` → `@/services/api/response.ts` → `@/services/router/Routing` → `@/services/router` (the app's **main router aggregator**, which eagerly imports every route's page component, not lazily) → `AnalyzeRoutes.ts` → `HomeOpportunity.vue` → `HomeAnalyzeProgramOverview.vue` → `MetricsComponents.vue`, whose `props.forRenderKeyComponent` default calls `NumberUtils.getRandomInt()` **at module-evaluation time**. Since `MetricsComponents.vue` imports `NumberUtils` back from the same `@/utils` barrel that is still mid-evaluation (it hasn't reached its own `export {...}` statement yet), that circular re-entry gets an incomplete exports object and `NumberUtils` is `undefined`.

This is genuinely pre-existing (not introduced by this refactor) and already had one known workaround in the codebase — `utils/DateUtils.ts` imports `StringUtils` via a direct path with the comment "Direct import to avoid barrel file issues in tests" — but direct-importing `ObjectUtils`/`StringUtils` individually turned out **not** to reliably dodge it either (both still transitively need `@/utils/index.ts` for `isNullOrUndefined`, and empirically both eventually hit the same crash depending on evaluation order). No test in the whole repo currently imports the bare `@/utils` barrel (confirmed by grep) — every existing test either avoids it entirely or imports a leaf module like `@/utils/StringUtils` directly, which happens to dodge it inconsistently.

**Fix applied (test-only, scoped to this one spec file):** `vi.mock("@/services/router", () => ({ default: { push: vi.fn(), back: vi.fn() } }))` at the top of `useFiltersToBeApplied.spec.ts`. This stubs the actual common choke point (the router aggregator that eagerly loads every page) rather than chasing every individual path into it. The composable itself was left using the normal `@/utils` barrel import, matching the rest of the codebase's convention (including the code it was extracted from) — the workaround lives in the test, where it belongs.

**Flag for follow-up (not fixed here, out of scope for this WI):** this same crash will hit **every other Phase B composable extraction** from this file that needs `ObjectUtils`/`StringUtils`/`isNullOrUndefined` (i.e., most of them) unless their specs copy this same `vi.mock`. Worth either documenting this as a required boilerplate line for future `tests/Composables/*.spec.ts` files touching `@/utils`, or — better, but bigger — fixing the actual root cause (making `@/services/router`'s route imports lazy, which is also a real production perf win: today the whole app's page tree loads eagerly on first script execution).

### PR3 verification

- `vue-tsc --noEmit`: byte-for-byte identical to the PR1/PR2 baseline (252 lines, zero diff).
- `eslint` on all 3 files: clean.
- New spec: 39/39 tests passing, **96.51% line coverage** of `useFiltersToBeApplied.ts` (AC-04 requires ≥80%).
- Full `vitest run`: 96/96 test files, 1601/1610 tests passing (+39 from the new spec), 9 skipped, zero regressions.

---

## PR4 — useGlobalFiltersItemSelection.ts extraction (AC-04)

**Date:** 2026-08-24

The second (and last) AC-04-required composable. Extracted the PanelBar's checkbox/radio/tree-view "which items are checked" mutations from MainLayoutFilters.vue's "Global Filters - Panel Bar" block into `useGlobalFiltersItemSelection.ts`, merging the near-identical radio/checkbox twins as the WI's own description asks for.

### What moved

- `panelBarItemsTreeViewSetCheckedItems` — sets the tree view's checked keys, clears the field's filter group, re-adds one filter per checked key.
- `panelBarItemRadioItemSetChecked` and `panelBarItemsMCheckboxesItemSetChecked` — confirmed (by diffing the two full function bodies) to differ in exactly three places: the function name embedded in DEV error strings, an extra `console.log("** setFiltersToBeAppliedAddFilter", field, key)` present only in the radio version, and the `filterType` (`"radioBtn"` vs `"multipleCheckboxes"`) passed to `setFiltersToBeAppliedAddFilter`. Merged into a private `setItemChecked({ field, key, filterType, logContext })`, with `panelBarItemRadioItemSetChecked`/`panelBarItemsMCheckboxesItemSetChecked` kept as two thin public wrappers with their original names and signatures — nothing calling them (including the `GlobalFilterPanelBarItem.vue` event wiring from PR2) needed to change.
- `panelBarItemSetIsAllItemsChecked` — the "select/deselect all" toggle for MultipleCheckboxes, same family, no twin to merge.

`globalFiltersRangeSliderSetMinMaxSelectedValues` (same section, sets a value rather than a checked/selected state) and the level-selection functions (`panelBarItemSetLevelSelected` and its two small helpers) were deliberately left in the shell — a different concern (range values, and field *level*, not item *selection*).

### Design

Same by-reference/getter pattern as PR3's `useFiltersToBeApplied.ts`: `getItems: () => data.items` (a getter, since `data.items` is reassigned elsewhere, not just mutated), plus the already-extracted `setFiltersToBeAppliedAddFilter`/`setFiltersToBeAppliedRemoveFilter`/`globalFiltersToBeAppliedRemoveFiltersGroupByField` from `useFiltersToBeApplied` (PR3) and `getItemByField` (bound to `useGlobalFilters()`'s `panelBarItemsGetItem`) passed straight through as dependencies, rather than re-implemented.

### PR4 verification

- `vue-tsc --noEmit`: byte-for-byte identical to the PR1-PR3 baseline (zero new errors).
- `eslint` on both files: clean.
- New spec (`useGlobalFiltersItemSelection.spec.ts`): 20/20 tests, **93.27% line coverage** (AC-04 requires ≥80%). Reuses PR3's `vi.mock("@/services/router", ...)` workaround for the same `@/utils` barrel circular-import bug — this is now the second spec needing it, exactly the repeat-pattern flagged in PR3 as a follow-up candidate.
- Full `vitest run`: 97/97 test files, 1621/1630 tests (+20), 9 skipped, zero regressions.

With this PR, **both composables AC-04 names by name now exist with real specs** (`useFiltersToBeApplied` at 96.51%, `useGlobalFiltersItemSelection` at 93.27%, both well over the required 80%).

---

## PR5 — useGlobalFiltersTemplates.ts extraction (biggest remaining single piece)

**Date:** 2026-08-24

The largest remaining Phase B piece: saved-templates CRUD (create/update/delete/set-active) plus the active-template computed and its label-grouping logic. File: 3,257 -> 2,672 lines.

### The two marked sections were mixed-concern, not clean extraction targets

Same pattern as PR2 (the WI's own section markers don't line up with a single concern): `// *** Global Filters Templates ***` (originally ~1048-1667) also contained `vCardEnabled`, the whole carousel (`carouselItemsContainer`/`showCarousel`/`carouselWidth`), and `smeFeatureEnabled` - none of which are about templates. `// *** Global Filters Templates (II) ***` (originally ~2362-2536) was even further off: it's actually the file's entire 13-watcher **WATCH SECTION** plus `prevSlide`/`nextSlide`/`handleClickOutsideDialog`/`onMounted`/`onUnmounted` - only 3 of those 13 watchers (and the `updateGlobalFiltersTemplatesActive` function one of them calls) are template-related. Extracted only the template-specific pieces from both; left the carousel/SME/dialog/other-10-watchers exactly where they were.

### Design

- **`data: Data` passed by reference, whole object** - not per-field getters this time (unlike PR3/PR4). This composable's functions need 5 different `data.*` fields (`loadFilterData`, `filtersTemplatesNewTemplateName`, `globalFiltersTemplatesActiveIsDirty`, `globalFiltersTemplatesSaveOptionSelected`, `globalFiltersTemplatesIsModalSaveShowing`, plus `filtersToBeApplied.filters` in `updateGlobalFiltersTemplatesActive`) and `data` itself is never reassigned wholesale anywhere in the file (only its properties are), so passing the whole reactive object - the same pattern `useEntityPrograms.ts` used in the EntityCardOverview refactor - was simpler and just as safe as threading 5 separate getter options.
- **Calls `useUser()`, `useUserStore()`, `useGlobalFiltersStore()`, `useToast()`, `useI18n(...)`, and `useGlobalFiltersSaved()` internally**, rather than accepting them as options. All six are store/global-singleton-backed composables already called from multiple places elsewhere in the codebase (Pinia stores are singletons by design; `useGlobalFiltersSaved()` itself only wraps `useUser()`) - safe to call again here. This is different from `filtersApplied`/`filtersAppliedFilters`/`getCustomFieldName` (from `useGlobalFilters()`), which stayed as injected options instead, since `useGlobalFilters()` was not verified to be side-effect-free/idempotent across two independent calls and re-deriving that call's ~30 other returned bindings was out of scope for this PR.
- **`groupFiltersByField`, `filtersClearAll`, `toggleGlobalFiltersDialogVisibility` passed in as plain functions** - all three are `function` declarations (hoisted) still living in the shell for concerns this PR doesn't touch (filter grouping shared with a different computed, applied-filters clearing, dialog visibility), so they're injected rather than duplicated or moved.
- **A real type wrinkle**: `filtersApplied` (from `useGlobalFilters()`) is a defensive `computed({get, set})` whose getter can return either `FiltersApplied` or a fallback `{logic: "and", filters: []}` shape for uninitialized-store safety - TypeScript infers a union type for it, not `FiltersApplied` alone. The composable's `filtersApplied` option type had to match that union (`ComputedRef<FiltersApplied | { logic: string; filters: never[] }>`) rather than the cleaner `ComputedRef<FiltersApplied>` I wrote first - a pre-existing quirk in `useGlobalFilters.ts`, not something to "fix" via a cast here.
- **`globalFiltersSavedArray`/`globalFiltersSavedSelected` are re-exposed from this composable** (not `globalFiltersSavedSetSelected`, which nothing outside this composable calls) - the shell's template and a few things this PR doesn't touch (`carouselWidth`, the template dropdown) still need them, and `useGlobalFiltersSaved()` moved entirely into this composable rather than staying called twice.

### Ordering pitfall caught before it shipped

The first attempt placed the composable call at the *original* "Global Filters Templates" position (early in the file) - which broke, because `filtersApplied`/`filtersAppliedFilters`/`getCustomFieldName`/`globalFiltersAppliedGroupedFormatted` (all plain `const`s, not hoisted `function`s) are declared *later* in the file (in the "Filters Applied" and "Global Filters Dialog" sections). A `const` composable call needs its argument values to already exist at that exact point in `setup()`'s synchronous execution - unlike the `function`-declaration extractions in PR3/PR4, closures don't save you here. Moved the actual `useGlobalFiltersTemplates(...)` call to the second block's position instead (well after all four dependencies exist), while leaving the unrelated carousel/SME code at its original earlier position - safe, because those are lazy `computed()`/`function` closures over `globalFiltersSavedArray` etc., which only need the composable's return to exist by the time they're actually *read*, not by the time they're *declared*.

### PR5 verification

- `vue-tsc --noEmit`: identical to the PR1-PR4 baseline (zero new errors) after fixing the `filtersApplied` union-type mismatch above.
- `eslint` on both files: clean.
- Full `vitest run`: 97/97 test files, 1621/1630 tests, 9 skipped, zero regressions (no new spec added - this composable isn't one of the two AC-04 names by name, and it's almost entirely store/API orchestration with `callbackSuccess`/`callbackError` shapes that would need substantial store mocking to test meaningfully; left for a follow-up rather than writing a shallow spec just to have one).
- No manual browser verification requested for this PR; the saved-templates flow (create/rename/activate/delete a template) is worth a manual pass given the size of this move.

---

## PR6 — GlobalFiltersBar.vue extraction

**Date:** 2026-08-24

Extracted the "Filters Bar" template block (135-366 in the WI's original numbering - the saved-template dropdown, the applied-filter-pills carousel, and the clear-all/save-template/filter-toggle buttons) into `GlobalFiltersBar.vue`. Unlike PR2/PR3/PR4/PR5, this one is markup-only - no new composable, no logic changes. File: 2,672 -> 2,474 lines.

### The one real wrinkle: `carouselItemsContainer` crosses a component boundary

`showCarousel(numberOfitems)` (still in the shell - it's carousel logic, out of this PR's scope, and the WI assigns it to a separate future `useGlobalFiltersCarousel.ts`) measures `carouselItemsContainer.value.clientWidth` to decide whether the carousel nav arrows should show. That DOM element now lives inside `GlobalFiltersBar.vue`'s own template, so the shell can no longer hold a `ref` that points to it directly.

Fixed with the standard Vue 3 pattern for this: the child keeps its own `carouselItemsContainer` ref and calls `expose({ carouselItemsContainer })` from its `setup()`; the shell holds a `globalFiltersBarRef` template ref pointing at the *component instance* (`<GlobalFiltersBar ref="globalFiltersBarRef">`), and `showCarousel` now reads `globalFiltersBarRef.value?.carouselItemsContainer?.clientWidth`. No behaviour change - same DOM element, same measurement, just reached through the component boundary instead of directly.

### What moved vs. stayed

Moved: the whole "Filters Bar" div and its contents (template-selector `<select>`, the carousel container/track/pills/nav-buttons, the clear-all/save-template/filter-toggle buttons). `IconFilter2` (only used inside this block) also moved with it - removed from the shell's imports/registrations.

Stayed in the shell: `showCarousel`, `carouselWidth`, `currentIndex`/`itemsForShowCarousel`/`offset` (`data` fields), `prevSlide`/`nextSlide` - all carousel *logic*, passed into the component as props, with clicks emitted back up (`prev-slide`/`next-slide`/`clear-all-click`/`save-template-click`/`toggle-dialog-visibility`/`template-change-active`/`filter-remove`/`filter-group-set-dirty`). Also stayed: `getClassesByLevel`, `filtersAppliedGetFormattedLevel`, `getFieldName` - all still used elsewhere in the shell, passed down as function props rather than duplicated.

Two prop types had to be widened while wiring this up to match the *actual* signatures of `filtersAppliedGetFormattedLevel`/`getFieldName` in `utils/globalFiltersUtils.ts` (`TargetView | undefined | null` and `string | undefined` respectively, not the narrower types first guessed) - caught immediately by `vue-tsc`, not a behaviour risk.

### PR6 verification

- `vue-tsc --noEmit`: identical to the PR1-PR5 baseline (zero new errors, after the two prop-type widenings above).
- `eslint` on both files: clean.
- Full `vitest run`: 97/97 test files, 1621/1630 tests, 9 skipped, zero regressions.
- Manually verified in the browser (2026-08-24, after an earlier backend release that had blocked the user's local login cleared) - the carousel and the saved-template dropdown both work correctly.

---

## PR7 — GlobalFiltersCategoriesSidebar.vue, GlobalFiltersSavedList.vue, GlobalFiltersTemplatesModal.vue

**Date:** 2026-08-24

Three more markup-only extractions, all pure template moves with no logic changes. File: 2,474 -> 2,107 lines.

- **`GlobalFiltersTemplatesModal.vue`** — the second `<CalculumModal>` block (the first, "Clear all applied filters confirmation," is small, self-contained, and not named by the WI - left in the shell). The shell still controls visibility via `v-if="globalFiltersTemplatesIsModalSaveShowing"` on the component itself, so there's no `show` prop. The template-name `<input>`'s `v-model` became an explicit `:value` + `@input` pair wired to a `v-model:new-template-name` on the parent's usage - same two-way binding, just crossing a component boundary. `KRadioButton`/`RadioButtonChangeEvent` moved with it (only used here) and were removed from the shell's imports.
- **`GlobalFiltersCategoriesSidebar.vue`** — the "Left side" categories list (all/active + the dynamic category list, 11 icon components moved with it). **Deviated from the WI here**: the WI's line range for this component also included ~3893-3990 (the footer's "Saved Filters" toggle button), but that markup is a DOM *sibling* one level up (inside a separate Footer div, not nested inside the sidebar's own div) - a single Vue component can't render into two disjoint places in the parent's tree without something like `<Teleport>`, which would be a disproportionate, risky tool for one button. Left that toggle button in the shell instead; noted the deviation rather than silently dropping half the WI's ask.
- **`GlobalFiltersSavedList.vue`** — the "Saved Templates" `v-else` block (loading state / empty state / the templates table with per-template delete). `iconTrash` moved with it. `CalculumLoading` stayed in the shell's imports - it's also used by the *other* loading overlay near the top of the dialog, so it's still needed there.

### PR7 verification

- `vue-tsc --noEmit`: zero errors in any touched file (fresh full-project run; see the note under PR8 about why comparing raw error-count totals against earlier snapshots in this session turned out to be unreliable).
- `eslint` on all 4 files: clean.
- Full `vitest run`: 97/97 test files, 1621/1630 tests, 9 skipped, zero regressions.
- Manually verified in the browser (2026-08-24, same pass as PR6) - the saved-templates modal (save-as-new vs update-existing radio choice) and the categories sidebar (category switching, icon-per-category) both work correctly.

---

## PR8 — useGlobalFiltersCarousel.ts, useGlobalFiltersPanelBarItems.ts, and globalFiltersUtils.ts label-grouping functions

**Date:** 2026-08-24

The last three named Phase B items. File: 2,107 -> 1,940 lines. With this, **every extraction target the WI names by name is done** (the two AC-04 composables, the PanelBar collapse, and all five remaining composables/components/util-extensions it lists) - what's left in the shell is the parts the WI itself repeatedly says not to toutouch (the watch section, `panelBarItemsReset`/`clickHeaderFilter`, `filtersApply`'s plan/version scoping) plus glue code that ties the extracted pieces together.

- **`useGlobalFiltersCarousel.ts`** — `showCarousel`, `carouselWidth`, `prevSlide`, `nextSlide`, and the `globalFiltersBarRef` template ref (the one PR6 introduced to reach across the `GlobalFiltersBar.vue` boundary) all moved together, since they're one cohesive concern. Picked up the WI's suggested magic-number naming for free while relocating this code: `250`/`300`/`88`/`80` are now `CAROUSEL_ITEM_WIDTH_PX`/`CAROUSEL_SLIDE_OFFSET_PX`/`CAROUSEL_WIDTH_PERCENT_NO_TEMPLATES`/`CAROUSEL_WIDTH_PERCENT_WITH_TEMPLATES` constants inside the composable - the PR1 change doc explicitly deferred this exact naming to "a follow-up" to avoid scope creep in Phase A; this is that follow-up, landing naturally as part of moving the code anyway rather than as a separate pass.
- **`useGlobalFiltersPanelBarItems.ts`** — turned the 93-line side-effectful "Initialize panel bar items" `if` block (which mutated `data.items` three times in place) into a pure `buildPanelBarItems(options)` factory that takes every dependency as an option and *returns* the final array; the shell's `if (ArrayUtils.isEmpty(data.items)) { data.items = buildPanelBarItems({...}); }` guard stayed in the shell (deciding *when* to build isn't part of the factory). One real type fix needed: `panelBarItemsDefault`/`panelBarItemsCustomDataPointsDefault` (from `../data`) are a narrower anonymous type than `GlobalFiltersPanelBarItem` (missing `isLoading`/`itemData`/etc., which the `.map()` step adds) - the factory's input type had to match that narrower shape, not the full item type it eventually returns.
- **`groupFiltersByField`/`shouldSkipFilterValue`/`addFilterValueToGroup`** moved into `utils/globalFiltersUtils.ts` (the WI's "extend globalFiltersUtils.ts with label formatters" item). These were already pure, and moving them let `useGlobalFiltersTemplates.ts` (PR5) **import `groupFiltersByField` directly instead of receiving it as an injected option** - simplifying that composable's interface as a side effect. The other candidates in this area (`formatRadioBtnValueLabel`/`formatTreeViewValueLabel`/`formatRangeSliderValueLabel`/`filtersAppliedGetFilterValueLabel`) were deliberately **not** moved - they depend on `translate.t(...)` (needs `useI18n()`) and `analyzeStore.customDataPointTypes` (a Pinia store), which would mean either threading two more Vue-context dependencies into a currently composable-free utils file, or calling `useI18n()`/`useAnalyzeStore()` from inside `utils/`, a pattern this file doesn't otherwise use. Left in the shell rather than force a stretch.
- **A `StringUtils.isEmpty()` call had to become `(f.field as string) === ""`** inside the moved `shouldSkipFilterValue` - `Field` is a strict string-literal union with no `""` member, so TypeScript correctly flags a direct `===` comparison as impossible; the original code only got away with it because `StringUtils.isEmpty(value: string)` is typed loosely enough to accept (and silently widen) a `Field`. Behaviour-identical, just made explicit for the type checker. Also deliberately did **not** import `StringUtils` from the `"@/utils"` barrel into `globalFiltersUtils.ts` to add this check some other way - that file is currently one of the few in this codebase whose own test (`tests/Unit/Utils/globalFiltersUtils.spec.ts`) safely avoids the PR3-documented barrel circular-import bug, and pulling in the barrel here would have put that at risk for zero benefit over the one-line cast.

### A methodology note: raw typecheck error-count diffing became unreliable partway through this session

PR1 through PR6 all verified cleanly using "run `vue-tsc --noEmit`, sort the output, diff against the previous run's sorted output, expect zero lines." Partway through PR7/PR8's work this stopped being trustworthy - two fresh, back-to-back `vue-tsc --noEmit` runs on *identical* code produced very different total line counts (141 vs 252) despite being deterministic when repeated immediately afterward (confirmed by running twice in a row with no changes in between and diffing byte-for-byte identical output). The cause wasn't isolated - possibly incremental-compile caching, possibly something environmental - but it made the sort-and-diff technique unsound for the rest of this session. Switched to a more targeted check instead: run a fresh `vue-tsc --noEmit` and `grep` specifically for the file paths touched in that PR, on the theory that a real regression in code this session touched will always mention that file's path, regardless of how many *other*, unrelated pre-existing errors the run happens to surface. All of PR7/PR8's checks below used this targeted-grep method, not the sorted-diff one.

### PR8 verification

- `vue-tsc --noEmit`: zero matches for any touched file path, after fixing the `PanelBarItemDefault` input-type mismatch and the `Field`/`""` comparison above.
- `eslint` on all 4 touched/new files: clean.
- Full `vitest run`: 97/97 test files, 1621/1630 tests, 9 skipped, zero regressions.
- No manual browser verification needed for `useGlobalFiltersPanelBarItems.ts`/the utils move (pure logic, same as PR3-5). `useGlobalFiltersCarousel.ts` reuses the exact `globalFiltersBarRef`/`carouselItemsContainer` wiring PR6 already flagged as needing a browser check - nothing new to verify there, just relocated.

PR6-PR8 were manually verified end-to-end in the browser on 2026-08-24 (carousel, saved-template dropdown, templates modal, categories sidebar, full templates CRUD) once the backend release that had been blocking the user's local login cleared.

---

## PR9 — AC-03 (function length) and AC-12 (e2e) follow-up

**Date:** 2026-08-24

After PR8, re-checked US-1 against the WI's own AC-01 through AC-12 rather than assuming "done." Two gaps, both fixed or explicitly deferred here; everything else in AC-01/02/04-11 held (verified: zero new `any` in any file this session touched, per a repo-wide grep).

### AC-03 — three functions in `useGlobalFiltersTemplates.ts` still exceeded 60 lines

`templatesAPICreate` (100 lines), `globalFiltersTemplatesAPIDelete` (95 lines), and `templatesAPIUpdate` (77 lines) were verbatim moves from PR5 and had already been this long in the original file - PR5 didn't shorten them because "strictly behaviour-preserving" was the mandate for a pure relocation. Fixed now by extracting each function's `callbackSuccess` body (and, for the delete case, the id-resolution `if`/`else` block) into small named helper functions:

- `templatesAPICreate` (100 -> 55 lines): extracted `resolveTemplateCreateCompanyId()` (8 lines) and `onTemplateCreateSuccess(callbackSuccessData)` (42 lines).
- `templatesAPIUpdate` (77 -> 39 lines): extracted `onTemplateUpdateSuccess(callbackSuccessData)` (43 lines).
- `globalFiltersTemplatesAPIDelete` (95 -> 40 lines): extracted `resolveTemplateIdToDelete(id_template)` (47 lines - the single-template-vs-many `if`/`else` that also unsets the active template and clears filters as a side effect when appropriate) and `onTemplateDeleteSuccess(templateId)` (20 lines).

Every extraction is a pure "cut this callback body out, give it a name, call it by reference" move - same statements, same order, same closures over `data`/`toast`/`translate`/`userStore`/`globalFiltersStore`/`globalFiltersTemplatesActive`. No behaviour change; verified with the full test suite (97/97 files, 1621/1630 tests) plus a fresh `vue-tsc --noEmit` (zero errors touching this file) and `eslint` (clean). Every function in the file is now well under 60 lines (`formatTemplateFiltersGrouped` is the largest survivor at 52, unchanged from before).

### AC-12 — the 14 `e2e/tests/globalFilters/` Playwright specs could not be run locally

Built and served the app (`npm run e2e:serve` - a real production `vite build` + `http-server` on port 9090, confirmed ready) and attempted `npx playwright test e2e/tests/globalFilters/`. The suite's `global-setup.ts` requires `E2E_AUTH_PASSWORD_SINGLE`/`E2E_AUTH_USERNAME_ADMIN`/etc. from `apps/ap/e2e/.env.dev` (or `.env.<test_env>`), and that file is deliberately `.gitignore`d (real test-account credentials) and not present in this checkout - the run failed immediately in `global-setup.ts` on an `undefined.endsWith(...)` before any spec even started.


### PR9 verification

- `vue-tsc --noEmit`: zero errors touching `useGlobalFiltersTemplates.ts` (fresh full-project run).
- `eslint` on `useGlobalFiltersTemplates.ts`: clean.
- Full `vitest run`: 97/97 test files, 1621/1630 tests, 9 skipped, zero regressions.
- e2e: attempted, blocked by missing local credentials (see above) - deferred to CI, not run.
