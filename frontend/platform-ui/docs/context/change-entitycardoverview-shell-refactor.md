# EntityCardOverview shell + Corporate-Tree tab refactor

**Date:** 2026-08-21
**WI:** 19557 (US-7, child of Feature 8642 "Technical Debt/Improvements", Sprint 116)
**Status:** Phase A (subtraction) and Phase B (extraction) complete and verified. The `fromDifferentSupplier` watcher redundancy was resolved by hand-testing in the browser. `selectedTabIndex` (AC-06) is now fully decoupled: `EntityCardNegotiation.vue` no longer takes it as a prop (owns its own `ref(0)`), and every trace of it in the shell — the prop, the `data` field, the `:selectedIndex` binding, and the now-inert plumbing in `changeButton`/`changeData`/`redirectToNavigation`/`useEntityPrograms.ts` — has been removed. See that section below for the real bug this investigation surfaced instead (unrelated to this shell/tab pair).

## Scope

Two files: `EntityCardOverview.vue` (the entity-card shell/top-menu, 2,032 → ~1,450 lines) and its Corporate-Tree tab, renamed `EntityCardOverviewTab.vue` → `EntityCardCorporateTreeTab.vue` (576 → 111 lines).

## Corporate-Tree tab (landed first, per the WI's own PR sequencing)

- Renamed the file and its `name:` to `EntityCardCorporateTreeTab` (previously three different names existed across two files: `EntityCardTopMenu`, `EntityCardOverview`, and the import alias `EntityCardCorporateTree`).
- Deleted the four dead REST calls (`retrieveCurrentAndProposedPaymentTerms`, `retrievePotentialCashFlow`, `retrieveSupplierSpendInK`, `retrieveAllSpendsWithoutProgram`/`retrieveAllSpends`) whose results were never rendered — removes 4 network round-trips per Corporate-Tree tab open.
- Deleted the unreachable credit-rating modal (`isModalEntityCreditRatingShowing` never set `true`), the dead Google-Charts config, 7 dead component registrations, and the deep vendor import.
- **Kept `creditData` and `domain` declared as props even though now unused.** Both were previously excluded from `$attrs` because they were declared. Removing the declaration would push them into the automatic `inheritAttrs` fallthrough onto the component's single root `<div>`, adding stray DOM attributes that don't exist today — a real (if inert) observable diff. Left declared-but-unread instead; worth revisiting once the shell's Phase B settles the "every tab gets the union of all props" problem generally.
- **Left `window.onresize = ...` and the dead `chartKey` field untouched**, even though `chartKey` is never read. Removing the handler would stop this component from clobbering `window.onresize` while mounted — changing the documented Bug (window.onresize assigned, not addEventListener, clobbering across `<KeepAlive>` siblings) in a way this refactor must not touch.
- **The entire `<style scoped>` block (140 lines) was dead** — none of its selectors (`.char__table`, `.card-entity-card__overview`, `.card-body-disabled`, `.circle`, etc.) match anything in this component's own template, in the original 576-line file or the trimmed one. Removed entirely; zero visual effect since scoped CSS can only affect this component's own markup.
- **Correction to the WI:** the WI's Phase A list for `EntityCardOverview.vue` calls the CSS under `// *** Deprecated - Below this line ***` (in the shell, not the tab file) dead. It is not — `.bg-white`/`.bg-gray`, `.flag-country-entity-card`, `.container-activity-icon`/`.icon-activity`/`.icon-activity-badge-wrapper`/`.activity-unread-badge`, and `#supplier-insights-tab .badge-beta` are all live selectors used by the header row and the supplier-insights beta badge. Only the misleading comment was removed; the CSS itself was left alone.

## Shell — Phase A (subtraction)

Dead component registrations (`CalculumTooltipIcon`, `CalculumTypeProgram`, `NotePencilSvg`, `CalculumModal`), unused imports/bindings (`fontIcons`, `Routing`, `useHomeStore`, the unused `Note` interface), dead returns (`programInrecalculationComputed`, `programPendingRecalculationComputed`, `changeTab`), dead `data` fields (`newTermsActive`, `noFooter`, `inRecalculation`, `refreshTabValue`, `tabs`), dead emits (`loadedPrograms`, `programSelected`), the unread `options` prop, a stale comment, and a commented-out line — all removed. `useGlobalFiltersStore()` is now called once and cached instead of three times inline.

## Shell — Phase B (extraction)

New composables under `src/modules/home/entityCard/composables/`:

- **`useEntityCardTitle.ts`** — `setBrowserTitlebyTab(page)`, pure. Has a spec (`tests/Composables/useEntityCardTitle.spec.ts`).
- **`useEntityActivityLogs.ts`** — owns the activity-panel log/comment state (`logsByEntity`, `mentionableUsers`, unread count, pagination, etc.) and its two watchers (mark-as-read-once, reset-on-company-change). Takes `companyId`/`itemsPerPage`/`isActivityPanelOpen`/`activePanelTab` as getters so it stays reactive to the shell's own state without owning it.
- **`useEntityPrograms.ts`** — `getUserSupplierPrograms`, `selectProgram`, `retrieveProgramData`. Deliberately takes the shell's `data` reactive object **by reference** (not its own copy) plus a `getCreditScore` callback, because `currentPrograms`/`selectedProgramUri`/`programTarget`/etc. are read all over the rest of the shell (template, `topMenuTabs`, `isFinancingEnabled`) — splitting them onto isolated composable state would have meant keeping two objects in sync. `getCreditScore`/`retrieveAllSpends` stay in the shell (per the WI's "move `getCreditScore` verbatim" note, its in-place API-response mutation is untouched) and are injected as a callback.
- **`useTopMenuTabs.ts`** — exports pure, individually-testable `buildTopMenuTabShowFlags`, `isTopMenuTabActive`, `roundingByPosition`, plus the Vue-facing `useTopMenuTabs()` that assembles the `visibleTopMenuTabs` array (i18n labels, `onClick` handlers — including the two bespoke `changeTabOverview`/`changeTabRatingNMetrics` handlers that bypass `changeButton`, preserved verbatim).

New component: **`components/EntityCardTabBar.vue`** — the tabs-row markup only (`<div class="tabs-row">...`), taking `tabs`/`potentialTheme` as props. **Scoped narrower than the WI's literal line range** (47–94 in the original numbering): that range also covers the recalculation-status pill, the program dropdown, the activity/IA-bot icons and the options menu — unrelated concerns that don't belong in something named "TabBar." Extracted only the tab row itself.

`resetState()` no longer hand-lists ~26 fields. **It is not a literal duplicate of the initial `reactive()` shape** — the original `resetState()` never reset `hasSCF`, `showExportPDFModal`, `dataSupplier`, `loadingNewContent` or `keyComponent`, unlike the initial state. A shared factory (`createResettableEntityCardState`) now produces exactly the subset both call sites actually use; the initial `reactive()` call spreads it and adds the four extra fields itself. Behaviour of both call sites is unchanged — verified by diffing the original field lists before writing the factory.

### AC-07 — mirror specs now import real code

`tests/Component/EntityCardOverviewTopMenuTabs.spec.ts` and `EntityCardOverviewCalculatorTab.spec.ts` previously re-implemented the tab show/active/rounding rules locally. Both now import `buildTopMenuTabShowFlags`/`isTopMenuTabActive`/`roundingByPosition` from `useTopMenuTabs.ts`. The drifted `supplier-options-tab` case (a 9th tab that no longer exists in production) is gone; a test for the `!!potentialTheme` cast (a non-boolean truthy value still resolving to `true`) was added.

## Watchers — resolved 2026-08-21

The user removed the redundant unconditional `fromDifferentSupplier` watcher by hand after manually testing the flow in the browser (switching top-menu tabs, cross-supplier navigation, everything else covered in this doc). One `fromDifferentSupplier`-specific watcher remains (the guarded one, `if (props.fromDifferentSupplier) { resetState(); redirectToNavigation(...) }`), alongside the whole-`props` deep watcher. Verified clean afterwards (typecheck, lint, full test suite — no new failures).

## `selectedTabIndex` — investigated, WI's premise didn't hold, resolved by removal

AC-06 asks to consolidate `selectedTabIndex`'s "three simultaneous owners" into one. Tracing every read/write site showed this framing didn't match what the code actually did:

- **`EntityCardOverview.vue`'s `data.selectedTabIndex`** was passed as `:selectedIndex` to whichever top-level tab was mounted — but only `EntityCardNegotiation.vue` ever declared a matching prop; none of the other 10 tabs (`EntityCardCalculator`, `EntityCardFinancing`, `EntityCardCompanyDetails`, `EntityCardRatingsAndMetrics`, `EntityCardSupplierController`, `EntityCardNews`, `EntityCardCorporateTree`, the three `ReceivablesMockup*`) read it.
- **`EntityCardNegotiation.vue`'s local `selectedTabIndex` ref** (`ref(props.selectedIndex)`) was **not a duplicate of the shell's value** — it's Negotiation's *own* internal state for its spend-row tab strip, seeded once from the prop and then managed independently as the user clicks between spend tabs. The user decided this seeding wasn't needed and changed it to `ref(0)`, removing the prop from Negotiation entirely (2026-08-21, tested manually in the browser).
- **`entityCardStore.selectedTabIndex` / `setSelectedTabIndex` / `getSelectedTabIndex`** is a third, *separate* ref, unaffected by either of the above. `getSelectedTabIndex` has **zero readers anywhere in the codebase** — it is pure write-only dead state (left as-is; see the bug below).

Once Negotiation stopped reading the prop, the shell's `data.selectedTabIndex` had no consumer left anywhere. Removed entirely: the `selectedTabIndex` prop, the `data` field (interface + `createResettableEntityCardState`), the `:selectedIndex` template binding, the `data.selectedTabIndex = 0` line in `changeButton`, the same line in `useEntityPrograms.ts`'s `selectProgram`, and `changeData`'s now-unused `tabSelected` parameter (and `redirectToNavigation`'s now-unused `spendAlias` parameter, which only existed to feed `changeData`). Verified clean afterwards (typecheck, lint, full test suite — no new failures).

While tracing the (unrelated) third leg I found what looked at first like a real bug: in `EntityColumn.vue` (`modalHelper()`), clicking an entity/parent name called `entityCardStore.setSelectedTabIndexSpend(selectedSpend.selected)` and `entityCardStore.setSelectedTabIndex(selectedSpend.selected)`, then immediately called `entityCardStore.setSelectedEntity({...})` **without including `selectedTabIndex` in that object** — even though `EntityCard.SelectedEntityObj` has an optional `selectedTabIndex?: number` field for exactly this, and `ModalEntity.vue:22` reads `entityComputed.selectedTabIndex` to seed the modal's `selected-tab-index` prop. Net effect: clicking a specific spend row and opening the entity-card modal always opened at tab 0 regardless of which spend was clicked.

**Resolved 2026-08-21, not as a bug fix but as a decision:** the user confirmed opening at tab 0 is fine as the default. Checking `getSelectedTabIndexSpend` (like `getSelectedTabIndex`) turned up **zero readers anywhere in the codebase** — same dead-write pattern, one field wider. Since nothing anywhere ever reads either value, the two calls in `EntityColumn.vue` were provably inert; removed them (and the now-unused `selectedSpend`/`selectedSpendNumberInAlias` locals that fed them) from both branches of `modalHelper()`. Verified with typecheck/lint (zero errors, down from the pre-existing baseline) and the full test suite (1511/1511).

`entityCardStore.setSelectedTabIndexSpend` still has two other write sites, `HomeNavbar.vue:2483` and `HomeBackend.vue:190` — same dead-write shape, left untouched as out of scope for this WI/file. Worth a follow-up cleanup pass (and, if both go, deleting `selectedTabIndex`/`selectedTabIndexSpend`/`setSelectedTabIndex`/`setSelectedTabIndexSpend`/`getSelectedTabIndex`/`getSelectedTabIndexSpend` from `stores/entityCard.ts` entirely).

## Verification performed this session

- `vue-tsc --noEmit`: no new errors on either file (one pre-existing, unrelated error on `EntityCardOverview.vue:109` about `EntityType`/`"pilot"`, present before this refactor).
- `eslint`: no new errors (one pre-existing, unrelated `no-restricted-imports` error on the `FormatData` wildcard import, present before this refactor).
- `tests/Component`, `tests/Unit`, `tests/Composables`: 1511/1511 real tests passing throughout every step of this refactor. Four unrelated suites fail to even load in this sandbox on a `Denied ID ... question-tooltip.svg?url` error — confirmed pre-existing and unrelated to entityCard (one of them, `useKanbanDragAndDrop.spec.ts`, has nothing to do with this module).

## Files touched

- `src/modules/home/entityCard/views/EntityCardOverview.vue` (modified)
- `src/modules/home/entityCard/views/EntityCardOverviewTab.vue` → `EntityCardCorporateTreeTab.vue` (renamed + rewritten)
- `src/modules/home/entityCard/types/index.ts` (trimmed the `EntityCardOverview` interface to match the tab file)
- `src/modules/home/entityCard/composables/useEntityCardTitle.ts` (new)
- `src/modules/home/entityCard/composables/useEntityActivityLogs.ts` (new)
- `src/modules/home/entityCard/composables/useEntityPrograms.ts` (new)
- `src/modules/home/entityCard/composables/useTopMenuTabs.ts` (new)
- `src/modules/home/entityCard/components/EntityCardTabBar.vue` (new)
- `src/modules/home/entityCard/views/EntityCardNegotiation.vue` (modified by the user directly: dropped the `selectedIndex` prop, `selectedTabIndex` now seeds from `ref(0)` instead)
- `src/modules/components/grid/columns/graphql/EntityColumn.vue` (removed the dead `setSelectedTabIndexSpend`/`setSelectedTabIndex` calls in `modalHelper()`, see "selectedTabIndex" section above)
- `tests/Composables/useEntityCardTitle.spec.ts` (new)
- `tests/Component/EntityCardOverviewTopMenuTabs.spec.ts` (rewritten to import real logic)
- `tests/Component/EntityCardOverviewCalculatorTab.spec.ts` (rewritten to import real logic)
