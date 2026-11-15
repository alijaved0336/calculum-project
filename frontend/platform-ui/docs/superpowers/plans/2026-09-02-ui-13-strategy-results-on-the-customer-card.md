# UC-UI-13 — Strategy results on the Customer Card, and a spends detail view

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended)
> or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Show, on the Customer Card, what each strategy proposed for the entity and the distribution
behind it; let the analyst open that buyer's lines and then one line's full detail with the same
figures per line.

**Architecture:** Three surfaces over `Ada.Ar.Api`'s UC-API-13 routes, all reading the **intermediate**
tables. A strategy panel and a server-paged lines grid are new `ContentBox`es on `CustomerCardView`;
the line detail is its own route so it can be linked. Nothing about a strategy is named in front-end
code — rows and their `inputs` are rendered generically, so UC-OPP-30/32/34 appear here with no change.

**Tech Stack:** Vue 3 `<script setup>`, TypeScript, vue-i18n (keys in `packages/design-system`),
Kendo `Grid` (`@progress/kendo-vue-grid`), vitest + `@vue/test-utils`.

**Spec:** `docs/superpowers/specs/2026-09-02-api-13-ui-13-strategy-results-per-entity-and-spend-design.md`
in the **Ada-Platform** repo (branch `docs/19898-api-13-bookkeeping`, PR 14454).
**Requirement of record:** `docs/requirements/uc-e11-opportunity-screens.md`, UC-UI-13 (same repo).
**Backend:** PR 14463 (`feat/19898-api-13-strategy-results` into `master`). UI-13 cannot be verified in
DEV until that is merged and deployed.

**Work item:** ADO #19899. **Branch:** `feat/19899-ui-13-strategy-results`, cut from `origin/master`
(which already carries PR 14438's resync button). Never commit on `master`.

## Global Constraints

Every task's requirements implicitly include these.

1. **The surfaces read the intermediate tables, never the summary facts.** That is the backend's
   guarantee; the front end's half is to render only what these three responses carry and never to
   fall back to a facts-derived field to fill a gap.
2. **No strategy is ever named in front-end code.** No `peer_group_standard_2_0`, no per-strategy
   branch, no per-strategy column, outside test fixtures. A strategy key is data.
3. **No input key is ever required.** An `inputs` key with no entry in the label map renders
   humanized, never dropped and never a crash. A value that is not a scalar renders as JSON.
4. **Both new panels carry a provisional marker; the card does not.** Identity, size, volume and DPO
   above them are product — marking the whole card provisional would say something false.
5. **Every string is a key in BOTH `en.json` and `es.json`** (`packages/design-system/src/locales/languages/`).
   Spanish addresses the user as **usted** and uses **compañía**, matching `arCustomerCard`'s neighbours.
6. **Green before every commit:** `pnpm --filter ar lint`, `pnpm --filter ar typecheck`,
   `pnpm --filter ar test`. Never `--no-verify`.
7. **No `CHANGELOG.md` entry is written by this plan.** Whether provisional UI belongs in the
   changelog is a question for the developer at PR time — the API-13 half was excluded as temporary
   UI; ask before opening the PR rather than assuming either way.

## Rulings made before execution

**R1 — The panel goes on the Customer Card, not the Entity Card's Company Details tab.**
The spec's section *The front end* says "the Company Details tab", and that label is wrong: the three
panels it names as neighbours (*Size and revenue*, *Volume and payment terms*, *Days payable
outstanding*) exist only on `modules/match/views/CustomerCardView.vue`. The Entity Card's Company
Details tab carries *Company Profile* and *Ratings and Metrics* instead. UC-UI-13's basic flow names
the Customer Card's three, and the screen the developer pointed at was the Customer Card. The
requirement and the screen win over the spec's label. *Cost if wrong:* the panels sit on the wrong
screen — a component move, no data or contract change. The spec's line should be corrected on PR 14454.

**R2 — The line detail is a route under the Customer Card's own path**,
`/match/versions/:versionId/buyers/:buyerId/lines/:lineId`. A route rather than a modal because a
verification screen has to be linkable: you send someone the URL of the line that does not add up.
The collision the spec worried about does not exist here — the Customer Card route has no optional
trailing segment, unlike the Entity Card's `:tab?`.

**R3 — `MatchesTab`'s paging arithmetic is extracted and shared, not copied.** Its `onPageChange`
holds a non-obvious rule (a page-*size* change must derive the offset from the last confirmed `skip`,
plain navigation from the event's own) and a guard against `take: 0`. This repo already has one
written record of what copying a client costs (`src/api/http.ts`'s own header). Extraction also fixes
a live mirror test: `tests/Unit/matchPaging.spec.ts` today re-implements `pageFor` inside the spec and
asserts against its own copy, so it would stay green through any change to the component.

**R4 — `inputs` renders in a canonical order with a humanized fallback.** Known keys first, in the
order a distribution reads — occurrences, min, q1, avg, q3, max, calculationMethod — then any unknown
key, alphabetically. The existing `humanizePascalCase` is not enough: input keys are camelCase, so it
would render `calculationMethod` as "calculation Method". The new humanizer capitalises the first
letter and is its own tested function.

**R5 — A1 and A2 are different states and read differently.** `strategyBreakdown === null` means the
version's strategy chain has not run (UC-API-07 A2); `[]` means it ran and no strategy produced a row
(UC-UI-13 A1). Both show a notice instead of a table, with different text. A row whose `proposedTerm`
is null shows its `applicabilityReason` where the term would be (A2), never a zero.

## File Structure

**Created**
- `apps/ar/src/modules/match/components/customerCard/strategyInputs.ts` — the pure half: key order,
  humanizing, turning one strategy row plus its `inputs` into display rows. No Vue, fully testable.
- `apps/ar/src/modules/match/components/customerCard/StrategyResultsPanel.vue` — the party-grain panel.
- `apps/ar/src/modules/match/components/customerCard/BuyerLinesGrid.vue` — the server-paged lines grid.
- `apps/ar/src/modules/match/views/SaleLineDetailView.vue` — one line, everything it carries, plus its
  strategy rows.

**Modified**
- `apps/ar/src/api/index.ts` — `BuyerCardStrategyResultDto` widened; the line-detail types; two fetchers.
- `apps/ar/src/modules/match/views/CustomerCardView.vue` — two new full-width `ContentBox`es.
- `apps/ar/src/modules/match/MatchRoutes.ts`, `MatchRouting.ts` — the detail route and its opener.
- `apps/ar/src/modules/match/paging.ts` — the shared paging arithmetic.
- `apps/ar/src/modules/match/components/MatchesTab.vue` — uses it.
- `packages/design-system/src/locales/languages/en.json`, `es.json` — the `arCustomerCard.strategyResults`,
  `arCustomerCard.lines` and `arSaleLine` blocks.

**Tests** (`apps/ar/tests/Unit/`)
- `match/strategyInputs.spec.ts`, `match/StrategyResultsPanel.spec.ts`, `match/BuyerLinesGrid.spec.ts`,
  `views/SaleLineDetailView.spec.ts` — created.
- `matchPaging.spec.ts`, `matchRouting.spec.ts`, `api/index.spec.ts` — extended.

---

### Task 1: The API contract

**Files:** modify `apps/ar/src/api/index.ts`; extend `apps/ar/tests/Unit/api/index.spec.ts`.

**Interfaces produced:** `BuyerCardStrategyResultDto` gains `selectionOutcome` and `inputs`;
`SaleLineDetailResponse`, `SaleLineDetailDto`, `SaleLineStrategyResultDto`; `fetchBuyerLines`,
`fetchBuyerLine`. Every later task consumes these.

- [ ] **Step 1** — Widen `BuyerCardStrategyResultDto` with `selectionOutcome: string | null` (UC-OPP-33's
      verdict, which the backend has served for a while and this interface never declared) and
      `inputs: Record<string, unknown> | null`. Document `inputs` as the strategy's own supporting
      figures, as stored (ADR-0012) — deliberately untyped per strategy, which is what lets further
      families appear with no front-end change. Note that the backend serialises a JSON node, so the
      value may in principle be an array or a scalar; the panel narrows before reading keys.
- [ ] **Step 2** — Declare `SaleLineDetailResponse` (`line`, `strategyResults`), `SaleLineDetailDto`
      and `SaleLineStrategyResultDto`, mirroring `Ada.Ar.Api.Models.SaleLineDetailModels`. Carry over
      the two comments a reader of this file cannot reconstruct: the six permanently-null parse-time
      fields (`buyerName`, `buyerCountry`, `supplierEntityName`, `supplierEntityCountry`,
      `invoiceCurrency`, `providedNameWithIso`), and that this route deliberately applies no
      generation predicate, so mid-recalculation a line's figures can move before the card's do.
- [ ] **Step 3** — Add `fetchBuyerLines(versionId, buyerId, page, pageSize)` returning the existing
      `LinesPageResponse`, and `fetchBuyerLine(versionId, buyerId, lineId)` returning
      `SaleLineDetailResponse`. Reuse `LinesPageResponse`/`SaleLineRow` rather than declaring a second
      pair: the backend serves the same `SaleLinesPageResponse`/`SaleLineDto` the Match lines list
      already returns, and a parallel type would drift.
- [ ] **Step 4** — Tests: each fetcher builds the expected path and query, and a 404 surfaces as
      `HttpError` with status 404 — the buyer-not-in-this-version and line-not-found cases both rely
      on the caller seeing the status.
- [ ] **Step 5** — lint, typecheck, test, commit.

---

### Task 2: The pure half of rendering a strategy row

**Files:** create `apps/ar/src/modules/match/components/customerCard/strategyInputs.ts` and
`apps/ar/tests/Unit/match/strategyInputs.spec.ts`.

**Interfaces consumed:** Task 1's widened `BuyerCardStrategyResultDto` and `SaleLineStrategyResultDto`.
**Interfaces produced** (Tasks 3 and 6 both consume these):
- `humanizeInputKey(key: string): string`
- `deriveInputRows(inputs: unknown): { key: string; label: string; value: string }[]`
- A row type carrying the strategy's display name, proposed term, applicability reason, selection
  outcome and its input rows, derived from either DTO — the two are field-identical by design, so one
  derivation serves both grains.

- [ ] **Step 1** — `humanizeInputKey`: capitalise the first character, then split camelCase on the
      lower-to-upper boundary. Reuse `humanizePascalCase`'s regex rather than a second one, importing
      it from `modules/entityCard/components/opportunity/humanize`; this is a wrapper, not a fork.
- [ ] **Step 2** — `deriveInputRows`: returns `[]` for null, for a non-object and for an array (a JSON
      node need not be an object; reading `Object.entries` off a scalar must not throw). Known keys in
      canonical order first — `occurrences`, `min`, `q1`, `avg`, `q3`, `max`, `calculationMethod` —
      then unknown keys alphabetically. A key present in the canonical list but absent from `inputs`
      is omitted, not rendered as empty. Scalars render via `String`; objects and arrays via
      `JSON.stringify`; `null` renders as the shared em-dash marker.
- [ ] **Step 3** — Tests, and two of them are what this design is bought with:
      (a) a strategy nobody has heard of, whose `inputs` keys appear in no map, produces one row per
      key with humanized labels and drops nothing; (b) canonical keys sort ahead of unknown ones, and
      unknown ones sort alphabetically among themselves. Plus: a null, array or scalar `inputs` yields
      `[]`; a nested object renders as JSON rather than `[object Object]`.
- [ ] **Step 4** — lint, typecheck, test, commit.

---

### Task 3: The strategy panel on the Customer Card

**Files:** create `apps/ar/src/modules/match/components/customerCard/StrategyResultsPanel.vue` and
`apps/ar/tests/Unit/match/StrategyResultsPanel.spec.ts`; modify `CustomerCardView.vue` and both
locale files.

**Interfaces consumed:** Task 1's widened `BuyerCardStrategyResultDto`; Task 2's derivation.

- [ ] **Step 1** — The panel takes `strategyBreakdown: BuyerCardStrategyResultDto[] | null` and
      `winningStrategy: string | null`. One row per strategy: its humanized name, proposed term (via
      the existing `formatDays`), selection outcome, and the input rows as labelled figures. Mark the
      winner the way `StrategyList.vue` already does, reusing `deriveStrategyRows`' rule — the winner
      is whichever row equals `winningStrategy`, never guessed from whichever row carries a term.
- [ ] **Step 2** — A1/A2 per R5: `null` renders the "has not been calculated" notice; `[]` renders the
      "no strategy applied to this entity" notice; a row with a null term shows its
      `applicabilityReason` in the term's place.
- [ ] **Step 3** — Full width (`col-12`), not one of the two half columns: one row per strategy with
      seven figures wraps badly in half a row, which is exactly where the numbers have to be read.
      Add it to `CustomerCardView` below the four existing boxes, with the provisional marker in its
      header (a `CustomBadge`, plus one line of body text saying these figures come from the
      calculation's own tables and are here to make the strategy port checkable).
- [ ] **Step 4** — Locale keys under `arCustomerCard.strategyResults` in both files.
- [ ] **Step 5** — Tests: the three states of step 2; a winner is marked and a loser is not; the
      unknown-strategy fixture from Task 2 renders end to end through the component with **no change
      to the component**; the provisional marker is present.
- [ ] **Step 6** — lint, typecheck, test, commit.

---

### Task 4: Share the paging arithmetic

**Files:** modify `apps/ar/src/modules/match/paging.ts` and
`apps/ar/src/modules/match/components/MatchesTab.vue`; rewrite `apps/ar/tests/Unit/matchPaging.spec.ts`.

Behaviour-preserving. Its own task because a reviewer must be able to reject it while approving the
rest, and because Task 5 depends on the result.

**Interfaces produced:** a pure page-from-grid-event function in `paging.ts`, consumed by Task 5.

- [ ] **Step 1** — Move the conversion into `paging.ts` as a pure function taking the grid event's
      `skip` and `take`, the last confirmed `skip`, and the last confirmed `pageSize`, and returning
      the page and size to request — or `null` when the event carries no usable `take`. Carry
      `MatchesTab`'s two comments with it: why `null` rather than a clamp, and why a page-size change
      and plain navigation read the offset from different sources.
- [ ] **Step 2** — `MatchesTab.onPageChange` calls it and keeps `skip` derived from the **response's**
      page size, which is the invariant `paging.ts` already exists to protect.
- [ ] **Step 3** — Point the spec at the real function. Delete its local `pageFor` copy: a spec that
      re-implements the expression it is testing stays green through any change to the component, and
      that is the shape this repo has already been bitten by. Keep the existing page-size assertions.
      Add the page-size-change case, which the inline copy could not express.
- [ ] **Step 4** — lint, typecheck, test, commit.

---

### Task 5: The buyer's lines grid

**Files:** create `apps/ar/src/modules/match/components/customerCard/BuyerLinesGrid.vue` and
`apps/ar/tests/Unit/match/BuyerLinesGrid.spec.ts`; modify `CustomerCardView.vue` and both locale files.

**Interfaces consumed:** Task 1's `fetchBuyerLines`; Task 4's paging function; Task 6's route opener
(add the link last, or stub the opener and wire it in Task 6 — do not duplicate the route name).

- [ ] **Step 1** — A Kendo `Grid`, server-paged, modelled on `MatchesTab` and using the shared
      arithmetic. Eight columns: year, period, start date, end date, volume, currency, actual term,
      contractual term. Sorting stays off, for `MatchesTab`'s own reason — the grid can only sort the
      page it holds, and a sort of 50 rows presented as a sort of the buyer's lines is an answer that
      looks right and is not.
- [ ] **Step 2** — **No strategy data in this grid**, and say so in the component's header comment: a
      column per strategy in a surface promised generic over the tables is what would force it
      rewritten per family. To see a line's figures you open it.
- [ ] **Step 3** — Each row links to the line detail (Task 6's route). Empty state when the buyer has
      no lines; the loading state the grid's neighbours already use.
- [ ] **Step 4** — Add it to `CustomerCardView` as a full-width `ContentBox` below the strategy panel,
      with the same provisional marker.
- [ ] **Step 5** — Tests: it requests page 1 on mount and the requested page on a pager event; a
      buyer with no lines renders the empty state rather than a bare grid; a row click routes to the
      detail with the right ids; no strategy figure appears in any cell.
- [ ] **Step 6** — lint, typecheck, test, commit.

---

### Task 6: The line detail view and its route

**Files:** create `apps/ar/src/modules/match/views/SaleLineDetailView.vue` and
`apps/ar/tests/Unit/views/SaleLineDetailView.spec.ts`; modify `MatchRoutes.ts`, `MatchRouting.ts`,
`apps/ar/tests/Unit/matchRouting.spec.ts` and both locale files.

**Interfaces consumed:** Task 1's `fetchBuyerLine`; Task 2's derivation.
**Interfaces produced:** the route name and `openSaleLineDetail(versionId, buyerId, lineId)`, which
Task 5's row link uses.

- [ ] **Step 1** — Route per R2, `props: true`, behind `requireActiveSession`, plus an
      `openSaleLineDetail` opener beside `openCustomerCard`. Route params stay strings and the view
      parses them with `parsePositiveRouteId`, the contract every other `:id` in this app follows — a
      malformed segment must render "not found", never reach the API as `/lines/NaN`.
- [ ] **Step 2** — The view follows `CustomerCardView`'s load pattern exactly: `useLoadToken` against
      overlapping requests, 404 as "not found", anything else as the load error. A back affordance to
      the Customer Card this line belongs to.
- [ ] **Step 3** — Render the line's fields grouped — identity and dates, volume and terms, negotiation,
      WACC and credit, virtual card, then the enrichment block — and the custom attributes in
      declaration order. The six permanently-null parse-time fields are rendered like any other absent
      field; do not special-case them and do not hide them.
- [ ] **Step 4** — Below it, one card per strategy row, using Task 2's derivation — the same figures
      the party panel shows, one grain down, with A2's reason-in-place-of-term rule. The provisional
      marker on the strategy section.
- [ ] **Step 5** — Locale keys under `arSaleLine` in both files. This is the largest block; group it
      to mirror step 3's sections so a translator reads it in screen order.
- [ ] **Step 6** — Tests: a malformed route param renders not-found without a request; a 404 renders
      not-found; a line whose enrichment block is entirely null still renders (the calculation has
      not reached it); an unknown strategy with unknown input keys renders with **no component
      change**; a key absent from the label map renders humanized rather than being dropped — the
      second of the design's two load-bearing tests, at the grain where it matters most.
- [ ] **Step 7** — lint, typecheck, test, commit.

---

### Task 7: Whole-branch check

- [ ] **Step 1** — `pnpm --filter ar lint`, `typecheck` and `test` from a clean tree; also
      `pnpm --filter @ada/design-system test` if the locale files are covered there.
- [ ] **Step 2** — Confirm by grep that no strategy key and no input key appears in `src/` outside the
      label map, and that both locale files have identical key sets for the new blocks.
- [ ] **Step 3** — Read the diff for anything reading a summary-fact-derived field to fill a gap.
- [ ] **Step 4** — Ask the developer about `CHANGELOG.md` (Global Constraint 7) and about the spec
      correction R1 names, then open the PR against `master` linked to #19899.
