# HomeNavbar.vue Refactor (Sprint 116, US-2)

## Overview

`HomeNavbar.vue` was one of the 7 largest components in `apps/ap` (3,517 lines: 238 template
+ 2,583 script + 694 style) with zero real unit-test coverage and 10 Pinia stores, 22
watchers, and a 43-key `data` blob living inside a single `setup()`. This refactor is
**strictly behavior-preserving**: no change to rendered output, emitted events, store writes,
or request payloads, with the two allowed exceptions listed in Phase A below. It followed the
ground rules and structural targets from the Sprint 116 planning document (subtraction first,
then one extraction per commit; `<script>` ≤ 800–1,000 lines; no new `any`; real specs that
import the extracted code instead of mirroring it).

**Result:** `HomeNavbar.vue` is now 1,364 total lines with a **959-line `<script>` block**
(under the ≤ 1,000 target), down from 3,517 / 2,583. All logic moved into 6 new composables
and 2 new presentational components, each covered by a real spec that imports the extracted
code — no mirror tests were added.

## Files created

| File | What it owns |
|---|---|
| `apps/ap/src/modules/home/composables/usePilotAccount.ts` | Pilot-account gating (`disableElementPilotIsExpired`, `getLimitTime`, `isPilotCompanyBeingUsed`) |
| `apps/ap/src/modules/home/composables/useRecalculationStatus.ts` | Program/plan/spend-file recalculation state, its 4 `subscribeStore` watchers, `cleanValues` |
| `apps/ap/src/modules/home/composables/useCurrencySwitcher.ts` | Currency list/switching, `getMaxDateSpend`, `goToHomeDashboard`, `loadCurrencies` |
| `apps/ap/src/modules/home/composables/useUnreadNotifications.ts` | Notifications fetch/pagination/mark-as-read/delete, the 3 count-sync watchers |
| `apps/ap/src/modules/home/components/HomeNavbarNotifications.vue` | Notifications dropdown template + its scoped CSS (presentational) |
| `apps/ap/src/modules/home/components/NavbarUserMenu.vue` | The 8 permission-gated user-menu links (presentational) |
| `apps/ap/src/modules/home/composables/useCompanySwitcher.ts` | `changeCompany`, `selectCompany`, the `companyActive` watcher |
| `apps/ap/src/modules/home/composables/useSpendFileVersionSwitcher.ts` | `changeCurrentSpendFileVersion`, the subscription guard, `validateSpendFilesActive`, the dropdown's selection flow |
| `apps/ap/src/modules/home/composables/useSessionBootstrap.ts` | Main `onMounted` login/refresh bootstrap, `getWhoAmI`/`firtCallsOrWhoAmI`/`getSessionInfo`, `setUserfirebase`, `getVCardGroups`, `menuPopup` |

Plus a spec per file in `apps/ap/tests/Composables/` / `apps/ap/tests/Component/`, and a
rewrite of `apps/ap/tests/Unit/Utils/subscribeSpendFileGuard.spec.ts` (see below).

## Phase A — subtraction (dead code removed)

All verified dead against the live file before removal (not from the sprint-planning doc's
10-day-old snapshot):

- Unused `const route = useRoute()` and `useShownotys()`/`showProgramNotys` (their only use).
- Dead functions `callbackLoadingChangeSpendFile`, `openRelasesAcademy`.
- Write-only `data` keys: `isLoadingMarkAsReadAllFiles`, `showNoCurrentSpend`,
  `showSelectOtherCompany`, `showNothingToSelect`, `actionUserChange`, `spendFileList`, and the
  inert `setGlobalLoading` key inside `data` (permanently shadowed by the real `ref` of the same
  name declared at setup level).
- A stale Spanish comment describing a watcher that was never added.
- Dead scoped CSS: `.messageChoopedUpShow`, `.bodyScroll`, `.notifications-scroll-container` (+
  its scrollbar pseudo-elements), `.notification-indicator`, `.unread-dot` (+ its now-orphaned
  `@keyframes pulse`), `.icon-wrapper`.
- 3 more dead return bindings surfaced later, while extracting notifications:
  `getNotificationDisplayContent`, `getNotificationContentSegments`,
  `getNotificationSanitizedContentHtml` — exposed via `return` but never wired to any template
  expression, before or after the extraction.

One correction to the sprint doc while verifying: the `console.log` at the old line 1389-1390
was already wrapped in `if (import.meta.env.DEV) { ... }` — it was not actually unguarded, so no
fix was needed there.

## Phase B — the cross-composable "bridge" pattern

Splitting one 3,500-line `setup()` into 9 files surfaces dependencies that go in both
directions — e.g. the recalculation-status watcher needs to call into the spend-file switcher,
which is constructed later in the same `setup()`; the spend-file switcher needs
`commonApiCalls`/`getWhoAmI`, which live in session-bootstrap, constructed even later. None of
this is resolvable by picking a construction order, because the cycles go both ways.

The fix is a single plain object, `bridge`, created once at the top of `HomeNavbar.vue`'s
`setup()` and passed into whichever composable needs to call forward into a piece built later:

```ts
const bridge: RecalculationStatusBridge & { /* ...other composables' needs... */ } = {};
```

Each composable's dependency type declares only the slice of the bridge it actually reads
(structural typing), and calls through it lazily (`bridge.getMaxDateSpend?.(...)`) instead of
capturing a value at construction time. Once the function it points to is actually defined,
`HomeNavbar.vue` assigns it (`bridge.getMaxDateSpend = getMaxDateSpend;`). This is safe because
nothing on the bridge is ever invoked during `setup()` itself — only later, from watchers,
lifecycle hooks, or user interaction, by which point every assignment has already happened.

The same technique, with a plain `let` + a getter closure instead of a shared object, is used
twice for **values** rather than functions: `useRecalculationStatus` and
`useUnreadNotifications` both need `spendFileVersionActive`/`spendFileVersionActiveId`, which
are owned by `useSpendFile()`/`useSpendFileVersionSwitcher`, constructed later — moving either
composable's construction point earlier or later would have reordered its internal `watch()`
registrations relative to every other watcher in the file, which the "do not touch" invariants
below rule out. A getter reading a `let` that gets assigned once the real ref exists avoids that
reordering entirely.

## Invariants preserved exactly

- **`changeCurrentSpendFileVersion`** (now in `useSpendFileVersionSwitcher.ts`): same-version
  guard → `globalFiltersStore.setDisableWatchers(true)` + 5s safety timer →
  store resets including `closeSubscription(SUBSCRIPTION_KEYS.plan)` → `globalThis.gc()` →
  `goToHomeDashboard()` → the `changeActualFile` PATCH, whose `callbackSuccess` and
  `callbackError` both re-enable watchers. This is one half of the contract documented in
  `docs/context/race-condition-company-change.md`; `changeCompany` (in `useCompanySwitcher.ts`)
  is the other half.
- `setDisableWatchers` is still set `true` in exactly one place and cleared in exactly three
  (the safety timer, the PATCH success callback, the PATCH error callback).
- The Firebase listener single-ownership comment and its `onUnmounted` cleanup
  (`fnUnsubscribeToSpendFiles`/`fnSetUnsubscribeProgram`) moved into `useSessionBootstrap.ts`
  unchanged; the original single `onUnmounted` was split into two independent `onUnmounted`
  calls (one per file) since Vue runs both in registration order and neither depends on the
  other's cleanup.
- The 5-branch `else if` chain in the `spendFileVersionsFormatted` watcher kept its exact order
  and overlapping conditions.
- `onClickNotificationMarkAsRead`/`onClickNotificationDelete`'s ~50 byte-identical lines were
  deduplicated into one `removeNotificationLocally(iri)` helper without changing what either
  caller does (mark-as-read still calls `postNotificationsMarkAsRead`, delete still calls
  `deleteSingleNotification`).
- The 3-write-site sync between the notifications store's unread count and the local list length
  was **not** consolidated into a single source of truth, despite the sprint doc suggesting it —
  that would be an internal behavior change, out of scope for a behavior-preserving extraction.

## Known bugs found, documented, and deliberately NOT fixed

Per the ground rule that this refactor stay strictly behavior-preserving, the following
pre-existing issues were found while moving the code and are reported here rather than fixed
(matching the sprint doc's own B4/B7 bug entries):

- **`changeCompany` (sprint-doc Bug B7):** validates the `companySelectedId` *parameter* but
  builds the request from `data.selectedCompany` instead — works today only because every call
  site sets `data.selectedCompany` immediately before calling. Now in `useCompanySwitcher.ts`.
- **Case-sensitive private-file gating (Bug B7):** `filterSpendfiles`' regex
  `/@calculum\.ai$/` is case-sensitive, while `userIsCalculumUser` (used for the status-dot
  UI elsewhere) is case-insensitive — an `@Calculum.ai` address can see status dots for spend
  files it can't actually list. Now in `useSpendFileVersionSwitcher.ts`.
- **`document.body` click listener double-add (Bug B4):** `firtCallsOrWhoAmI`'s fromlogin
  branch and `getWhoAmI`'s success callback both call
  `document.body.addEventListener("click", menuPopup)`; only one `removeEventListener` exists.
  The two call sites are normally mutually exclusive per mount, but nothing prevents a
  double-add. Now in `useSessionBootstrap.ts`.
- **`data.isMarkingAsRead` never toggled:** the "mark as read" button's `:disabled` binding is
  wired to `isMarkingAsRead`, which is initialized `false` and never written anywhere — only
  `isLoadingNotificationMarkAsRead` (a different key) actually tracks the in-flight request.
  Not in the sprint doc's original bug list; found while extracting `useUnreadNotifications.ts`.
  Left as-is (relocated verbatim) since fixing it would change the button's disabled behavior.
- **Documentation-only mismatch:** `docs/context/race-condition-company-change.md` states the
  safety-timer fallback is 15 seconds; the real code (`HomeNavbar.vue`'s original
  `changeCurrentSpendFileVersion`, and `useCompanyChangeOptimizer.ts`) has always used 5000ms.
  The code is consistent with itself; only the doc's stated value is stale. Not corrected as
  part of this change (out of scope for a HomeNavbar.vue refactor), flagged here for whoever
  next touches that doc.

## Decision: the company/spend-file dropdowns were not migrated to `SearchableDropdown`

The sprint doc suggested unifying the company, spend-file, and currency dropdowns onto
`packages/design-system/src/components/SearchableDropdown.vue`. Company and spend-file are
structurally close to it; currency's "most used + full list" layout is not, so unifying all
three was dropped early.

For company/spend-file specifically: both wrap their trigger and option list in Kendo's
`<Tooltip>` (`@progress/kendo-vue-tooltip`), which replaces the browser's native title tooltip
with a themed one. `SearchableDropdown.vue` doesn't use that wrapper, and its one other current
consumer (`AdminUploadDataReceivables.vue`) doesn't either — adopting it as-is would have
changed the hover-tooltip's rendering (a real, if minor, visible difference); wrapping
`SearchableDropdown.vue` itself in Kendo's `Tooltip` would have changed behavior for that other
consumer instead. Neither option is behavior-neutral, so the dropdowns were left as they are in
`HomeNavbar.vue` (their debounce/keyboard-nav/highlighted-index code, ~120 lines, stays where it
was). An optional `item` scoped slot was drafted for `SearchableDropdown.vue` to make a future
migration easier, then reverted before committing — with no consumer and no test infrastructure
in that package yet, it was speculative code with nothing exercising it.

## `showAlerts` emit typed

`apps/ap/src/modules/home/types.ts` now exports:

```ts
export const HOME_ALERT = {
  NONE: 0,
  NO_ACTIVE_SPEND_FILE: 1,
  SELECT_OTHER_COMPANY: 2,
  NOTHING_TO_SELECT: 3,
  FORBIDDEN: 4,
  PILOT_EXPIRED: 5,
} as const;
export type HomeAlertLevel = (typeof HOME_ALERT)[keyof typeof HOME_ALERT];
```

Names come from `HomeAlerts.vue`'s own `v-if="typeAlert === N"` branches and the
`home.components.navbar.alerts.*` locale strings they render (verified against
`packages/design-system/src/locales/languages/en.json`), not guessed from context. All 17
`emit("showAlerts", N, bool)` call sites (across `HomeNavbar.vue` and the 3 composables that
also emit it), `HomeNavbar.vue`'s `emits` declaration, every composable's `emit` dependency
type, and `HomeBackend.vue`'s `showAlertsFn` parameter now use `HomeAlertLevel` — the integers
on the wire are unchanged.

## Testing

Ground rule: no new mirror tests: every extracted unit has a spec that **imports** it.

- `usePilotAccount.spec.ts` (8 tests), `useRecalculationStatus.spec.ts` (29),
  `useCurrencySwitcher.spec.ts` (15), `useUnreadNotifications.spec.ts` (20),
  `HomeNavbarNotifications.spec.ts` (11, `mountWithProviders`), `NavbarUserMenu.spec.ts` (9,
  `mountWithProviders`), `useCompanySwitcher.spec.ts` (11), `useSpendFileVersionSwitcher.spec.ts`
  (22), `useSessionBootstrap.spec.ts` (13, using a mounted host component for the
  `onMounted`/`onUnmounted`-dependent behavior).
- `tests/Unit/Utils/subscribeSpendFileGuard.spec.ts` was rewritten to import the real
  `subscribetoSpendFile` guard (from `useSpendFileVersionSwitcher`) and the real "ready"
  recalculation guard (from `useRecalculationStatus`) instead of mirroring both as local pure
  functions "to avoid mounting the full component" — no longer necessary now that each guard
  lives in its own composable with no Vue component attached. Two of its old test cases
  asserted on a `getAuthFirestoreUser` precondition that no longer exists in the real code
  (WI#19104 removed it) — dropped rather than carried forward as stale coverage.
- A recurring test-infra note: `@/utils` (the barrel) has a circular-import chain — documented
  in `docs/context/documentation-standards.md` — that resolves fine inside the running app but
  crashes module loading in an isolated Vitest module graph (a totally unrelated `.vue` file's
  prop default throws `Cannot read properties of undefined`). Every new spec that needs
  `removeIRI`/`isNullOrUndefined`/`StringUtils`/etc. mocks just those exports instead of
  importing the real barrel.

**Verification (final state):** `pnpm --filter @ada/ap typecheck` clean; `pnpm --filter @ada/ap
lint` shows only pre-existing template-formatting warnings (attribute order, one missing
`v-for` key) that already existed before this refactor and were deliberately left untouched
(template reformatting is out of scope — see below); `test:unit` 942 passing; `test:component`
730 passing (9 pre-existing skips, unrelated to this change).

## Explicitly out of scope

- **Template formatting.** `HomeNavbar.vue`'s template is not Prettier-formatted
  (`singleAttributePerLine`); reformatting it would turn ~130 remaining template lines into
  roughly 10x that, and mixing a pure-formatting diff into a logic-relocation refactor makes
  both harder to review. Left untouched, as agreed before starting.
- **The 3 known bugs above** (B4, B7 x2) and the notifications count's 3-write-site sync — all
  tracked as behavior, not fixed, per the strictly-behavior-preserving ground rule.
- **The `SearchableDropdown` migration** for company/spend-file — see the decision above.
