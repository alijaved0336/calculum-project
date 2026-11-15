# Checklist: Rename "Actual Payment Terms" to "Avg. Days Paid"

## Objective
Rename the label from "Actual Payment Terms" to "Avg. Days Paid" across entity cards, chart components (EntityTermsChartLine.vue), grid column headers, global filters, tooltips, chart categories, 9-box tables, and i18n so the UI shows "Avg. Days Paid" consistently.

## Scope
- **Entity Card Opportunity chart**: Label on the Actual Payment Terms bar in Entity Card → "Avg. Days Paid". Title comes from `home.entityCard.strategies.currentTerms` and subtitle uses `global.averageDaysPaidAcronym`.
- **i18n**: Update `global.actualPaymentTerms`, `global.entityCard.charts.*.actualPaymentTerms`, `global.averageDaysPaidAcronym`, and all other keys that display "Actual Payment Terms" or "Avg Actual Payment Terms" to "Avg. Days Paid".
- **Component**: EntityTermsChartLine.vue receives `title` as prop and uses `$t('global.averageDaysPaidAcronym')` for contractual bar subtitle; no component code change if i18n is updated.

## Checklist

- [x] Identify all i18n keys in en.json and es.json that show "Actual Payment Terms" or "Avg Actual Payment Terms"
- [x] Update en.json: replace label strings with "Avg. Days Paid" (with period after "Avg")
- [x] Update es.json: replace Spanish labels with "Prom. días pagados"
- [x] Ensure home.entityCard.strategies.currentTerms = "Avg. Days Paid" (en) for Entity Card chart bar title
- [x] Ensure global.averageDaysPaidAcronym = "Avg. Days Paid" (en) for subtitle in EntityTermsChartLine
- [x] Verify no hardcoded "Actual Payment Terms" in Vue/TS files (only i18n keys)
- [x] E2E test categorySpendVolAndPT.spec.ts: fieldName updated to "Avg. Days Paid"
- [x] EntityTermsChartLine.vue: no code change; title from parent (getTitle uses i18n), subtitle uses global.averageDaysPaidAcronym

## Files to modify
- `src/resources/locales/languages/en.json`
- `src/resources/locales/languages/es.json`

## Tooltips updated (follow-up)
- **global.actualPaymentTermsTooltip** and **home.entityCard.calculator.actualPaymentTermsTooltip**: Already use "Avg. Days Paid" nomenclature.
- **home.entityCard.strategies.currentTermsTooltip** (entity card strategies): Updated to "Avg. Days Paid is the current average number of days the buyer takes to pay the supplier." (en) / "Prom. días pagados es el número promedio actual de días que el comprador tarda en pagar al proveedor." (es).
- **modeledNewPaymentTermsTooltip**: Updated to reference "(Avg. Days Paid)" in the formula and description (en/es).
- **maxTooltip, minTooltip, third_quartileTooltip**: Replaced "actual payment terms" with "Avg. Days Paid" / "Prom. días pagados".
- **maxOppoTxt**: "contractual/actual payment terms" → "contractual/Avg. Days Paid" (en) / "contractuales/Prom. días pagados" (es).

## Hardcoded strings removed (follow-up)
- **SetTargetAction.vue** (line 46): `name` property of the actualPaymentTerms radio option now uses `translate.t("global.setTargetOptions.actualPaymentTerms")` instead of hardcoded "Avg. Days Paid".
- **ColumnMenuActions.vue** (line 137): radio input `name` attribute now uses `:name="$t('global.setTargetOptions.actualPaymentTerms')"` for i18n consistency.
- **kendoChartRelated.ts** (lines 225-226): chart category comparison updated from `"Actual Payment Terms"` / `"Actual\nPayment\nTerms"` to `"Avg. Days Paid"` / `"Avg.\nDays\nPaid"` to match the new label.

## Edge cases
- Tooltips (e.g. actualPaymentTermsTooltip): keep descriptive text; only change if they reference the label name.
- "Avg Actual Payment Terms with Cash Discount" → "Avg. Days Paid with Cash Discount".
- Chart category titles "Actual Payment Terms per X" → "Avg. Days Paid per X".
- Export/back-end labels: front-end only; back-end exports are out of scope unless same i18n keys are used.
