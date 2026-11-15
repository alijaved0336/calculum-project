# changeToCurrency / changeToUSD audit

> Phase 5 of the currency-format consolidation plan
> (`2026-05-01-currency-format-consolidation.md`).
> Generated: 2026-05-01

## Summary

- Total call sites: **51**
- CORRECT (keep): **35**
- REDUNDANT (remove): **0**
- CONSOLIDATABLE (refactor to formatBigCurrency): **0**
- CHANGE-TO-USD-FOR-BACKEND (keep): **16**

No call sites were found that needed editing. The migration in Phases 2-4
covered every display-bound call site; what remains in `changeToCurrency`
land is either:

1. Filter-rule round-trip plumbing where the **user-currency** value is
   reverted to **native** for a backend POST (`changeToUSD`), or
2. GET-response normalization for values that are subsequently compared,
   edited, or sent back to the backend — never re-formatted via
   `StringUtils.formatBigCurrency` (which would double-convert), or
3. Dead code in `CategorizeParseCharts.ts` (no importers outside the
   typedoc artifacts in `docs/`).

## Detail

### `src/modules/components/filter/CalculumAnalyzeFilter.vue`

| Line | Call | Source | Downstream | Bucket | Action |
|------|------|--------|------------|--------|--------|
| 888  | `FormatData.changeToUSD(props.editFilterObj?.filterOne.value)` | `editFilterObj` from parent (filter being edited) | Stored in `filterRuleOneValue`; submitted with `convertValue` on save (line 1213) | CHANGE-TO-USD-FOR-BACKEND | keep |
| 899  | `FormatData.changeToUSD(props.editFilterObj?.filterTwo.value)` | same | Stored in `filterRuleTwoValue`; submitted with `convertValue` on save (line 1224) | CHANGE-TO-USD-FOR-BACKEND | keep |
| 1132 | `FormatData.changeToCurrency(val)` (helper `convertValue`) | User input value typed in the filter form | Result stored on `ruleone.value` / `ruletwo.value`, emitted via `saveChosenConditionFilter` to the BE | CORRECT (TODO: revisit) | keep |

Note on line 1132: the helper takes a user-typed number and multiplies
by the currency rate, then sends the result to the BE. This is the
opposite direction from the rest of the filter round-trip in this file
(lines 888 / 899 use `changeToUSD` for the same field). Behavior is
unchanged by Phase 5 — flagged as `TODO: revisit`. Marked CORRECT per
the audit rule (when ambiguous, keep).

### `src/modules/home/entityCard/views/EntityCardOverviewTab.vue`

| Line | Call | Source | Downstream | Bucket | Action |
|------|------|--------|------------|--------|--------|
| 369  | `formatData.changeToCurrency(parseFloat(spend.spend_volume ?? 0))` | `getSpendsBySupplier` GET response (no `currencyRate` body, BE returns native) | Assigned to `newSpend.spend_volume`; pushed into `entityCardOverviewTab.spendsBySupplier`. Array is **not** consumed in this template (only `loadingFlags.spendsBySupplier` is read). No `formatBigCurrency` consumer downstream. | CORRECT | keep |
| 371  | `formatData.changeToCurrency(parseFloat(spend.model_cash_flow ?? 0))` | same | same | CORRECT | keep |
| 373  | `formatData.changeToCurrency(parseFloat(spend.approach_buyer_savings ?? 0))` | same | same | CORRECT | keep |

Note: the `spendsBySupplier` array populated by `retrieveAllSpends()`
appears to be effectively unused — the children `<TreeCards>` and
`<ListNegotiation>` load their own data. Removing the conversion here
would not affect any current display. Kept as-is (CORRECT) because (a)
the values originate native and the conversion is semantically right
for any future consumer, and (b) Phase 5's contract for CORRECT is
explicit: "value is native at source, converted to user currency for
downstream use".

### `src/modules/home/analyze/views/HomeAnalyzeProgramToPlan1.vue`

| Line | Call | Source | Downstream | Bucket | Action |
|------|------|--------|------------|--------|--------|
| 405 | `formatData.changeToUSD(homeAnalyzeProgramToPlan1.amount)` | Form state (user-currency) on plan creation POST | POST body `amount` field | CHANGE-TO-USD-FOR-BACKEND | keep |
| 522 | `formatData.changeToCurrency(parseFloat(callbackSuccessData.amount))` | `getPlan` GET response (no rate sent) | Stored as `amount` (user-currency); used in numeric comparison vs `amountMax` and form input | CORRECT | keep |
| 531 | `formatData.changeToCurrency(callbackSuccessData.amount)` | same | Stored as `amountMax` (user-currency); compared vs `amount` | CORRECT | keep |
| 563 | `formatData.changeToCurrency(response.potentialCashFlow)` | `getProgramPotentialCashFlow` GET response | `amount` (user-currency) | CORRECT | keep |
| 572 | `formatData.changeToCurrency(response.potentialCashFlow)` | same | `amountMax` (user-currency) | CORRECT | keep |
| 582 | `formatData.changeToCurrency(cfToFixed)` | same (different code path) | `amount` (user-currency) | CORRECT | keep |
| 590 | `formatData.changeToCurrency(cfToFixed)` | same | `amountMax` (user-currency) | CORRECT | keep |
| 643 | `formatData.changeToUSD(homeAnalyzeProgramToPlan1.amount)` | Form state on plan PATCH | PATCH body `amount` field | CHANGE-TO-USD-FOR-BACKEND | keep |

Note: `amount` and `amountMax` are stored in user-currency for the
duration of the form's lifecycle. They are never displayed via
`StringUtils.formatBigCurrency` (the template uses
`formatData.getNumberWithDecimals` and direct numeric comparison only).
This is the textbook CORRECT pattern: GET → convert once → operate in
user-currency → before POST/PATCH → revert.

### `src/modules/home/analyze/views/HomeAnalyzeSetupCompleted.vue`

All 8 calls follow the same pattern: a user-typed `SPEND_VOLUME` filter
value (in user currency) is reverted to native (USD) before being
embedded in a setup POST body. CHANGE-TO-USD-FOR-BACKEND.

| Line | Call | Source | Downstream | Bucket | Action |
|------|------|--------|------------|--------|--------|
| 187  | `FormatData.changeToUSD(item.filterOne.value)` | financingRules (template create) | `postGenerateTemplateSetup` body | CHANGE-TO-USD-FOR-BACKEND | keep |
| 190  | `FormatData.changeToUSD(item.filterTwo.value)` | same | same | CHANGE-TO-USD-FOR-BACKEND | keep |
| 213  | `FormatData.changeToUSD(category.filterOne.value)` | inclusiveExclusiveRules (template create) | same | CHANGE-TO-USD-FOR-BACKEND | keep |
| 216  | `FormatData.changeToUSD(category.filterTwo.value)` | same | same | CHANGE-TO-USD-FOR-BACKEND | keep |
| 269  | `FormatData.changeToUSD(item.filterOne.value)` | financingRules (program create) | `postGenerateProgramSetup` body | CHANGE-TO-USD-FOR-BACKEND | keep |
| 272  | `FormatData.changeToUSD(item.filterTwo.value)` | same | same | CHANGE-TO-USD-FOR-BACKEND | keep |
| 308  | `FormatData.changeToUSD(category.filterOne.value)` | inclusiveExclusiveRules (program create) | same | CHANGE-TO-USD-FOR-BACKEND | keep |
| 311  | `FormatData.changeToUSD(category.filterTwo.value)` | same | same | CHANGE-TO-USD-FOR-BACKEND | keep |

### `src/modules/home/analyze/components/HarmonizationComponent.vue`

| Line | Call | Source | Downstream | Bucket | Action |
|------|------|--------|------------|--------|--------|
| 318 | `FormatData.changeToUSD(item.filterOne.value)` | termGroups financingRules (user-currency) | term-harmonization save POST body | CHANGE-TO-USD-FOR-BACKEND | keep |
| 321 | `FormatData.changeToUSD(item.filterTwo.value)` | same | same | CHANGE-TO-USD-FOR-BACKEND | keep |

### `src/modules/home/analyze/components/FinancingComponent.vue`

| Line | Call | Source | Downstream | Bucket | Action |
|------|------|--------|------------|--------|--------|
| 334 | `formatData.changeToUSD(item.filterOne.value)` | financingGroups financingRules (user-currency) | financing save POST body | CHANGE-TO-USD-FOR-BACKEND | keep |
| 337 | `formatData.changeToUSD(item.filterTwo.value)` | same | same | CHANGE-TO-USD-FOR-BACKEND | keep |

### `src/modules/home/categorize/store/CategorizeParseCharts.ts`

This entire module appears to be dead code. A repo-wide grep
(`CategorizeParseCharts`) under `src/` returns no importers; the only
hits outside `src/` are typedoc HTML artifacts in `docs/typedoc/`.
The 25 `changeToCurrency` calls below are therefore unreachable, and
the formatter contract is irrelevant to them. They are marked
CORRECT (no-op): if the module is ever re-introduced, the pattern is
"GET response → multiply rate → emit chart datapoint". Whether the
chart binding then routes through pure `formatBigNumbers` or through
`formatBigCurrency` would need to be re-audited at that time.

| Line | Call | Bucket | Action |
|------|------|--------|--------|
| 218  | `formatData.changeToCurrency(item.spend)` (parseSpendPerProcurementTeam) | CORRECT (dead code) | keep |
| 229  | `formatData.changeToCurrency(item.buyerAmount)` (parseSpendPerBuyingEntity) | CORRECT (dead code) | keep |
| 240  | `formatData.changeToCurrency(item.total)` (parseSpendPerCountry) | CORRECT (dead code) | keep |
| 251  | `formatData.changeToCurrency(item.spend)` (parseSpendPerRegion) | CORRECT (dead code) | keep |
| 262  | `formatData.changeToCurrency(item.total)` (parseSpendPerIndustry) | CORRECT (dead code) | keep |
| 273  | `formatData.changeToCurrency(item.total)` (parseSpendPerCommodity) | CORRECT (dead code) | keep |
| 284  | `formatData.changeToCurrency(item.spend)` (parseSpendPerCreditScore) | CORRECT (dead code) | keep |
| 295  | `formatData.changeToCurrency(item.total)` (parseSpendPerMateriality) | CORRECT (dead code) | keep |
| 405  | `formatData.changeToCurrency(item.buyerAmount)` (parseSpendConcentrationPerBuyingEntity) | CORRECT (dead code) | keep |
| 416  | `formatData.changeToCurrency(item.spend)` (parseSpendConcentrationPerTeam) | CORRECT (dead code) | keep |
| 427  | `formatData.changeToCurrency(item.total)` (parseSpendConcentrationPerCountry) | CORRECT (dead code) | keep |
| 438  | `formatData.changeToCurrency(item.spend)` (parseSpendConcentrationPerRegion) | CORRECT (dead code) | keep |
| 449  | `formatData.changeToCurrency(item.total)` (parseSpendConcentrationPerIndustry) | CORRECT (dead code) | keep |
| 460  | `formatData.changeToCurrency(item.total)` (parseSpendConcentrationPerCommodity) | CORRECT (dead code) | keep |
| 471  | `formatData.changeToCurrency(item.total)` (parseSpendConcentrationPerCreditScore) | CORRECT (dead code) | keep |
| 482  | `formatData.changeToCurrency(item.total)` (parseSpendConcentrationPerMateriality) | CORRECT (dead code) | keep |
| 493  | `formatData.changeToCurrency(item.outstanding)` (parseOutstandingPerBuyingEntity) | CORRECT (dead code) | keep |
| 504  | `formatData.changeToCurrency(item.outstanding)` (parseOutstandingPerProcurementTeam) | CORRECT (dead code) | keep |
| 515  | `formatData.changeToCurrency(item.outstanding)` (parseOutstandingPerCountry) | CORRECT (dead code) | keep |
| 526  | `formatData.changeToCurrency(item.outstanding)` (parseOutstandingPerRegion) | CORRECT (dead code) | keep |
| 537  | `formatData.changeToCurrency(item.outstanding)` (parseOutstandingPerIndustry) | CORRECT (dead code) | keep |
| 548  | `formatData.changeToCurrency(item.outstanding)` (parseOutstandingPerCommodity) | CORRECT (dead code) | keep |
| 559  | `formatData.changeToCurrency(item.outstanding)` (parseOutstandingPerCreditScore) | CORRECT (dead code) | keep |
| 570  | `formatData.changeToCurrency(item.outstanding)` (parseOutstandingPerMateriality) | CORRECT (dead code) | keep |
| 581  | `formatData.changeToCurrency(item.spend)` (parseSpendConcentrationsPerTopSuppliers) | CORRECT (dead code) | keep |

## Concerns

1. **`CalculumAnalyzeFilter.vue:1132`** — The `convertValue` helper applies
   `changeToCurrency` on save while the inverse `changeToUSD` is applied on
   edit-load (lines 888/899). The directions are inconsistent unless the
   stored backend value is actually in the user's chosen display currency
   (which would be unusual for filter rules). Kept as-is per the
   "ambiguous = CORRECT" rule. Suggest opening a separate work item to
   re-validate the filter round-trip semantics for `SPEND_VOLUME`.

2. **`EntityCardOverviewTab.vue:369-373`** — The `entityCardOverviewTab.spendsBySupplier`
   array is populated but never referenced in the template (only the
   loading flag is read). The pre-conversion is therefore inert. Worth
   considering removal of the data fetch entirely in a future cleanup.

3. **`CategorizeParseCharts.ts`** — Module appears to be entirely dead.
   No `import` references exist under `src/`. Recommendation for a future
   cleanup PR: delete the file (and its sibling `CardEntityParseCharts.ts`
   pending similar verification).

## Result

No `REDUNDANT` or `CONSOLIDATABLE` cases were found. Phase 5 is complete
without code edits in this dimension; the only mechanical change made
alongside this audit was a docs-only fix to the `no-restricted-imports`
ESLint message in `package.json` to point at the canonical plan path
(`docs/superpowers/plans/2026-05-01-currency-format-consolidation.md`).
