# formatBigNumbers Migration Map

> Drives Phase 3 of the currency-format consolidation plan
> (`2026-05-01-currency-format-consolidation.md`).
> Generated: 2026-05-01

## Scope reminder

This map enumerates ONLY callers of the legacy `FormatData.formatBigNumbers`
(implicit-conversion variant). Calls that resolve to
`StringUtils.formatBigNumbers` (pure formatter) are out of scope and have
already been migrated in earlier passes.

In-scope resolution rules:
- A named import `{ formatBigNumbers }` from `@/utils/FormatData` produces a
  bare `formatBigNumbers(...)` call — IN SCOPE.
- A namespace import `import * as formatData from "@/utils/FormatData"`
  produces a `formatData.formatBigNumbers(...)` call — IN SCOPE.
- A `FormatData` namespace re-exported from `@/utils` followed by
  `FormatData.formatBigNumbers(...)` — IN SCOPE. (No occurrences found
  in the current tree.)
- A `StringUtils.formatBigNumbers(...)` call — OUT OF SCOPE.

## Summary

- Files with in-scope calls: 3
- Total in-scope call sites: 8
- already-converted: 3
- native: 5
- non-monetary: 0
- unclear: 0

The plan's appendix (file-level call-count reference) reflects total
`formatBigNumbers` occurrences across both variants. Most of those files
already use `StringUtils.formatBigNumbers` exclusively today; only the three
files below still hold legacy `FormatData.formatBigNumbers` invocations.

## Detail

### `src/modules/home/entityCard/components/modals/ModalResults.vue`

Imports `formatBigNumbers` via namespace (`import * as formatData from "@/utils/FormatData"` — line 282).

| Line | Call | Bucket | Note |
|---|---|---|---|
| 509 | `formatData.formatBigNumbers(currentSpend.spend_volume, 1)` | native | `currentSpend` from `props.retrieveAllSpends`, populated by `entityCardStore.getSpendsBySupplier` (GET, no `currencyRate` sent) — value is native USD |
| 576 | `formatData.formatBigNumbers(spendLine.spend_volume, 1)` | native | same `props.retrieveAllSpends` source as line 509 — native USD |
| 621 | `formatData.formatBigNumbers(currentSpend.spend_volume, 1)` | native | same `props.retrieveAllSpends` source as line 509 — native USD |
| 1186 | `formatData.formatBigNumbers(api.negotiatedPotentialCashFlow, 1)` | native | `api` is the response of `entityCardStore.getSpendNewTerms` (GET `/api/entity_card_spend_new_terms/{id}`, no `currencyRate` sent) — native USD |
| 1191 | `formatData.formatBigNumbers(api.negotiatedPotentialSaving, 1)` | native | same `getSpendNewTerms` GET response — native USD |

### `src/modules/home/entityCard/components/opportunity/StrategiesComponent.vue`

Imports `formatBigNumbers` via named import (`import { formatBigNumbers, ... } from "@/utils/FormatData"` — lines 302-307).

| Line | Call | Bucket | Note |
|---|---|---|---|
| 489 | `formatBigNumbers(value)` | already-converted | `value` is `card.value` from `props.data.infoCards`. Parent `EntityPaymentTermsStrategies.vue` populates `infoCards` from `getPaymentTermsOpportunity` POST response (helper sends `currencyRate`, BE applies rate). Switch cases reaching this branch: `cashFlowOpportunity`, `withoutCashDiscount`, `withCashDiscount`, `contractualWithCashDiscount`, `contractualWithoutCashDiscount` — all monetary, BE-converted |

### `src/modules/home/analyze/components/NineBoxesBox.vue`

Imports `formatBigNumbers` via named import (`import { formatBigNumbers, getNumberWithDecimals } from "@/utils/FormatData"` — line 36).

Both call sites pass `isCurrency=false` positionally — the writer explicitly disabled the legacy formatter's `changeToCurrency` step, signalling the input is already in display currency.

| Line | Call | Bucket | Note |
|---|---|---|---|
| 117 | `formatBigNumbers(value, 1, "en-US", false)` | already-converted | inside `formatDataForNineBoxes`, called from `boxInfoFormatted` over `props.boxInfo.{cashFlow,discounts,volume,potentialSCFRevenue}`. The `isCurrency=false` arg is the explicit signal that the parent already converted the box values; preserves single-conversion contract |
| 188 | `formatBigNumbers(props.boxInfo.rebateCashFlow, 1, "en-US", false)` | already-converted | same nine-boxes data flow; `isCurrency=false` again signals already-converted |

## Migration recipe (cross-reference)

Per Phase 3 of the consolidation plan:

| Bucket | Replacement |
|---|---|
| already-converted | `StringUtils.formatBigNumbers(value, options?)` (drop legacy `isCurrency` arg) |
| native | `StringUtils.formatBigCurrency(value, options?)` (Phase 2 helper) |
| non-monetary | `StringUtils.formatBigNumbers(value, options?)` |

Positional `maximumFractionDigits` arguments translate to the options-object form, e.g. `formatBigNumbers(x, 1)` → `StringUtils.formatBigCurrency(x)` when bucket is native (the default `maximumFractionDigits=1` matches the new pure formatter's default, so the explicit `1` argument is redundant after migration).

## Files inspected and excluded

The following files appear in the consolidation plan's appendix (Phase 0
file-level call-count reference) but contain ZERO in-scope
`FormatData.formatBigNumbers` calls in the current tree — every
`formatBigNumbers` call in them resolves to `StringUtils.formatBigNumbers`
(out of scope). These were re-grepped during this map's compilation:

- `src/modules/home/entityCard/views/EntityCardNegotiation.vue`
- `src/modules/home/entityCard/views/EntityCardCalculator.vue`
- `src/modules/home/entityCard/views/EntityCardFinancing.vue`
- `src/modules/home/entityCard/views/EntityCardSupplierInsights.vue`
- `src/modules/home/entityCard/views/EntityCardOverviewTab.vue`
- `src/modules/home/entityCard/components/TreeCards.vue`
- `src/modules/home/entityCard/components/ScenariosCards.vue`
- `src/modules/home/entityCard/components/EntityCardRecentSearchCompany.vue`
- `src/modules/home/analyze/views/HomeAnalyzeProgramOverview.vue` (named import retained but only re-exposed to template; no live call site)
- `src/modules/home/analyze/views/HomeAnalyzeVcard.vue`
- `src/modules/home/analyze/components/AnalyzeProgramNineBoxesTableVcard.vue`
- `src/modules/home/analyze/components/NineBoxesModal.vue`
- `src/modules/home/analyze/composables/useNineBoxesTableLogic.ts`
- `src/modules/home/plan/components/PlanPhaseOverview.vue`
- `src/modules/home/components/PlanSummaryCards.vue`
- `src/modules/home/components/HomeStackedBar.vue`
- `src/modules/home/manageModule/views/Overview.vue`
- `src/modules/home/manageModule/views/EmailNegotiations.vue`
- `src/modules/home/manageModule/components/CardsByStatus.vue`
- `src/modules/home/overview/components/OverviewCharts.vue`
- `src/modules/home/overview/components/OverviewLocation.vue`
- `src/modules/home/overview/components/OverviewLocationNew.vue`
- `src/modules/home/views/HomeDashBoard.vue`
- `src/modules/home/categorize/views/CategorizeOverview.vue`
- `src/modules/components/charts/kendo/HorizontalBarChart.vue`
- `src/modules/components/charts/kendo/HorizontalBarChartNew.vue`
- `src/modules/components/charts/kendo/LineBarChart.vue`
- `src/modules/components/charts/kendo/PieChart.vue`
- `src/modules/components/charts/kendo/VerticalBarChart.vue`
- `src/modules/components/charts/kendo/WaterfallChart.vue`
- `src/modules/components/metrics/MetricsComponents.vue`
- `src/modules/components/metrics/MetricsComponentsNew.vue`
- `src/modules/components/metrics/MetricsComponentsNew2.vue`
- `src/modules/components/metrics/MetricsComponentsNew3.vue`
- `src/modules/components/table/SupplierImpactTable.vue`
- `src/modules/components/BarsTricolor.vue`
- `src/modules/components/cards/CardTitleValue.vue`
- `src/modules/components/utils/filterRelated.ts`
- `src/modules/valueProposition/componentes/HomeStackedBar.vue`
- `src/modules/valueProposition/componentes/PieChartComponent.vue`
- `src/modules/valueProposition/componentes/DataDisplayComponent.vue`
- `src/modules/globalFilters/views/MainLayoutFilters.vue`
- `src/utils/ForecastUtils.ts`
- `src/utils/kendoChartRelated.ts`

For these files, Phase 3 will only need to remove dead `formatBigNumbers`
named imports (where present). No call-site rewrites are required.

## Internal call inside `FormatData.ts`

`src/utils/FormatData.ts:656` contains a single internal usage of the
legacy formatter (`parts.push(formatBigNumbers(number));`). This is removed
in Phase 4 of the consolidation plan when the legacy function itself is
deleted; it is not part of the Phase 3 migration map.
