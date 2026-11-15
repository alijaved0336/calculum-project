# EntityCardCalculator refactor (Payment Terms vs Price)

**Date:** 2026-09-02
**Status:** Phase A confirmed. Phase B1 implemented. Phase B2 implemented. Phase B3 implemented. Phase C implemented.

## Branch

All calculator work lives on **`refactor/entity-card-calculator`** (from `master`). Phases are commits on this branch. One PR to `master` when the user asks. Do not use `refactor/incremental`. Do not create per-phase branches.

(2026-09-03: collapsed mistaken `phase-a` / `phase-b1` names onto this single topic branch. Empty `phase-a` deleted.)

## What this tab is

`EntityCardCalculator.vue` is **not** a standalone page. It is the **Payment Terms vs Price** tab inside the Entity Card shell:

- Shell: `apps/ap/src/modules/home/entityCard/views/EntityCardOverview.vue` (`name: EntityCardTopMenu`).
- Tab id: `#entity-card-calculator`. Label: i18n `home.entityCard.topMenu.paymentTermsVsPrice`.
- Shown when `programTarget === "cashFlow"` **or** `potentialTheme`. Wired in `useTopMenuTabs.ts`.
- Opened via `ModalEntity.vue` overlay, or route `/home/entity_card/overview/:companyId`, then this tab.
- Feature flag `useFeaturePaymentTermsvsPrice` gates real UI vs `TeaserView`.

## KeepAlive name constraint

The shell mounts tabs with `<KeepAlive><component :is="effectiveSelectedButton">`. The SFC `name` **must stay** `EntityCardCalculator`. Do not rename the component, the file’s `name:` option, or the KeepAlive identity as part of this refactor.

## Scope of this PR (Phase A only)

Subtract **verified unused** code from `EntityCardCalculator.vue` and the calculator-only `DataInterface` so later extracts do not inherit dead Slider/Accordion state. Guard remaining `console.*`. No composable/SFC extraction. No control replacement. No calculator math or payload “fixes.”

Every deletion below was proven against **template, `components:{}`, `return{}`, runtime `:is`, and CSS** — not a static-search guess.

## Phase A — removed (proven unused)

### `Slider` / `SliderLabel`

- Imported from `@progress/kendo-vue-inputs` and registered in `components:{}`.
- Template has **no** `<Slider>` / `<SliderLabel>`.
- No dynamic `:is` anywhere in this SFC (the only `:is` in the entity-card views is the shell’s KeepAlive `:is="effectiveSelectedButton"`).
- Removed the import and the two `components:{}` entries. `NumericTextBox` stays.

### `Accordion` wrapper (not `AccordionPanel`)

- Imported `Accordion.vue` and registered in `components:{}`.
- Template uses **`AccordionPanel` only** (impact-analysis “calculation” view). `AccordionPanel` itself mounts `AccordionItem`, not `Accordion`.
- Unregistered the wrapper here. **Did not delete** `components/Accordion.vue`.

### Slider `DataInterface` fields

`DataInterface` in `apps/ap/src/modules/home/entityCard/types/index.ts` is calculator-specific (only `EntityCardCalculator.vue` imports it). These fields were initialized on `reactive<DataInterface>` and leaked to the template via `...toRefs(data)`, but **neither the template nor the remaining script** read them (grep of identifiers, not only the interface):

`stepValue`, `sliderValuePrice` / `sliderValueTerms`, `minValuePrice` / `minValueTerms`, `maxValuePrice` / `maxValueTerms`, `defaultValuePrice` / `defaultValueTerms`, `labelValuesPrice` / `labelValuesTerms`, `isSomeSliderChanged`.

Removed from the interface **and** the initializer.

### `.refresh-btn` scoped CSS

~40-line `.refresh-btn` block (including nested `i.fa`, `:hover`, `:disabled`). Template has **no** `refresh-btn` class. Scoped CSS cannot affect siblings (`HomeNavbarNotifications.vue` has its own unscoped `.refresh-btn`). Deleted the block.

### Over-exposed `return {}` keys

Used in `setup()`, unused as template bindings. **Deleted only the `return` line**; kept the `const` / `function` / import:

| Return key | Why it looked live |
|---|---|
| `buyerAnnualVolume`, `buyerAnnualVolumeFormatted` | Used by other computeds (`headerAnnualSpendVolumeFormatted`, spend-volume freeze). Template binds the formatted/header variants, not these. |
| `callDatasAPIRead` | Called from apply/reset. Template never invokes it. |
| `emptyValues` (`buyerEmptyValues`) | Feeds `buyerHasEmptyValues` / tax / WACC empty flags. Template uses those flags. |
| `NumberUtils` | Used in setup rounding. Template never calls it. |
| `vCardGroupName` | Template binds `vCardGroupNameFormatted`. |
| `supplierTaxRate`, `supplierWacc` | Word-boundary false positive: template only reads `manualFieldErrors.supplierTaxRate` / `.supplierWacc` (error-object fields) plus the `*Input` / `*MinMaxValues` refs. The `Ref<CalculationTypeValue>` values themselves are setup-only. |

### Console

Scanned every `console.*`. All skip-logs (`Skipping API call` / `Skipping apply` / `Skipping save`) and error/warn calls were **already** behind `import.meta.env.DEV`. The one-line `if (import.meta.env.DEV)` without braces around `impactAnalysisOptionSelectedOnChange` was already guarded; added braces only. **Did not delete** functional skip-logs.

## Phase A — left alone (still live, or not proven dead enough to delete)

- **`AccordionPanel`** — live in impact-analysis “calculation” view.
- **`components/Accordion.vue` file** — unregistered here only; not deleted.
- **`name: "EntityCardCalculator"`** — KeepAlive identity.
- **`...toRefs(data)`** — after removing slider fields, remaining data keys that the template does not bind (`tabsData`, `spendProgramConfigs`, `levelType`, `allSpendsTab`, `spendConfigurationUuid`, `belongtoProgram`, `loadingMatrix`, `forecastVolumeApplied`) are **over-exposed**, not dead: they are read/written in setup. Replacing the spread with an explicit template-only list would be more than deleting a return line; left for B1+ when `data` is owned by composables.
- **`span.tooltip-position` scoped CSS** — unused in this template (same class of finding as `.refresh-btn`) but not in the Phase A candidate list; left as-is.
- **Payload builders, empty-value gates, duplicate `additionalFields` objects** — shapes differ between calculate-data and calculate-table; not “cleanup.”
- **Commented `// callDatasAPIRead();` call sites** — not in the candidate list.
- **Calculator math, skipped E2E, hardcoded English in the new-scenario modal** — out of scope.
- **Overview props, `useTopMenuTabs`, store HTTP** — untouched.

## Phase B1 — domain helpers + tests

User confirmed Phase A left the calculator tab visually and behaviourally unchanged. Continued on `refactor/entity-card-calculator` (same working tree as Phase A; not a new merge to `master`).

Moved **pure** calculator rules into `apps/ap/src/modules/home/entityCard/utils/calculatorUtils.ts`. No Pinia, axios, or i18n in that file. Shell still owns stores, watchers, API callbacks, and `translate.t` for chart labels.

Reused (not rewritten): `useManualCalculatorValidation.ts`, `useSpendVolumeCalculator.ts` (`shouldIncludeSpendVolumeInPayload`). Did not stuff rules into `entityCard/utils/index.ts` (join/CR helpers).

### Extracted

| Helper | Notes |
|---|---|
| `isManualInputMode` | `potentialTheme === true && StringUtils.isNullUndefinedOrEmpty(programUuid)` |
| `shouldShowSpendVolumeForm` | `potentialTheme === true` (manual + AF-1) |
| `buildAdditionalFields` / `buildVCardAdditionalFields` / `buildScfAdditionalFields` | Kind `table` and `save` include `groupName`; kind `data` omits it for both vCard and scf. **Not unified.** |
| `buildCalculateTableParams` / `buildCalculateDataParams` / `buildCalculatorSaveParams` | Preserve each call site's current shape (table has no `changeInTerms`/`priceChange`; data has them; save nests `calculatorValues`) |
| `clampNumber` / `clampMin` + min-max constants | Same NumericTextBox bounds as before. `scfRateSet` left in the shell (it still overwrites after the clamp checks). |
| `mapCalculatorChartRows` | `{ xAxis: Number(value), yAxis: name }` with empty-array fallback. Shell still translates `item.name`. |
| `hasBuyerEmptyValues` / `isBuyerTaxRateEmpty` / `isBuyerWaccEmpty` / `shouldShowTabsInfo` | Pure functions of already-computed flags/values |

### Payload preservation (vCard `groupName`)

- **calculate-table** `additionalFields` for vCard: `{ groupName, paymentCycleFloat, rebate, supplierCardCost }`
- **calculate-data** `additionalFields` for vCard: `{ paymentCycleFloat, rebate, supplierCardCost }` — **no `groupName`**
- **save** `calculatorValues.additionalFields` for vCard: same as table (includes `groupName`)
- SCF follows the same split (table/save include `groupName`; data omits it)

### Tests

- New: `apps/ap/tests/Unit/Utils/calculatorUtils.spec.ts` (run by `test:unit`)
- Retargeted `EntityCardCalculatorManualMode.spec.ts` to import `isManualInputMode` from the util (stub-mounts kept; SFC not full-mounted)
- Retargeted `EntityCardCalculatorSpendVolume.spec.ts` to import `shouldShowSpendVolumeForm`; still uses `shouldIncludeSpendVolumeInPayload`
- Left `useManualCalculatorValidation.spec.ts` and `useSpendVolumeCalculator.spec.ts` unchanged

## Files touched (Phase A)

- `apps/ap/src/modules/home/entityCard/views/EntityCardCalculator.vue`
- `apps/ap/src/modules/home/entityCard/types/index.ts`
- `docs/context/change-entitycardcalculator-refactor.md` (this file)

## Files touched (Phase B1)

- `apps/ap/src/modules/home/entityCard/utils/calculatorUtils.ts` (new)
- `apps/ap/src/modules/home/entityCard/views/EntityCardCalculator.vue`
- `apps/ap/tests/Unit/Utils/calculatorUtils.spec.ts` (new)
- `apps/ap/tests/Component/EntityCardCalculatorManualMode.spec.ts`
- `apps/ap/tests/Component/EntityCardCalculatorSpendVolume.spec.ts`
- `docs/context/change-entitycardcalculator-refactor.md` (this file)

## Phase B2 — application composables

Continued on `refactor/entity-card-calculator` (same working tree as A + B1). Extracted four Vue application composables that share shell `data` **by reference**. Store HTTP stays on `stores/entityCard.ts`. No presentational SFCs (B3). Shell is still `defineComponent` + `setup()` (not `<script setup>`). KeepAlive `name` remains `EntityCardCalculator`.

Shared refs that more than one composable needs live in the shell and are passed in: `calculateDataData`, `calculatorDefaultTypes`, `calculatorSavedValues`, `calculatorValuesInitialDataIsLoading`, `calculatorValuesIsSaving`, `userInputIsDirty`. Reverse edges (form → API/scenarios) use a shell-owned `cross` object assigned after those composables exist — no `let x!` circular init.

| Composable | Owns |
|---|---|
| `useCalculatorSpendTabs` | TabStrip `tabs` / `selectedTabIndex` / `entityCardNegotiationTabsOnTabSelect`, spend-config uuid, `postSpendsBySupplierAndButProgram` orchestration |
| `useCalculatorForm` | Inputs, min/max, dirty flag, manual-mode field state, spend-volume inputs, calculation-type dropdown, apply / reset-to-defaults / undo, clamps via `calculatorUtils` |
| `useCalculatorApi` | `getCalculateDataAPIRead`, `getCalculateTableAPIRead`, `calculatorGetInitialDataAPIRead`, `callDatasAPIRead`, `initCalls` (feature-flag short-circuit). Builds payloads with B1 utils; calls store methods |
| `useCalculatorScenarios` | `showScenarios` / `scenariosByConfig` (on `data`), select / delete / save / update, `calculatorSaveOnClick`, new-scenario title **state**. Modal markup stays in the shell |

`useFeaturePaymentTermsvsPrice` still gates `initCalls` and `callDatasAPIRead` (no calculator HTTP when the teaser is showing). Skip-apply / skip-save / skip-calculate-data while initial values are loading is `shouldSkipCalculatorActionWhileInitialDataLoading` in `calculatorUtils`.

### Tests

- Extended `apps/ap/tests/Unit/Utils/calculatorUtils.spec.ts` (skip-while-loading, teaser network gate)
- `apps/ap/tests/Composables/useCalculatorForm.spec.ts` — skip apply while loading
- `apps/ap/tests/Composables/useCalculatorApi.spec.ts` — teaser `initCalls`, manual vs standard init, skip calculate-data while loading
- `apps/ap/tests/Composables/useCalculatorSpendTabs.spec.ts` — tab select resets scenario fields on `data`
- `apps/ap/tests/Composables/useCalculatorScenarios.spec.ts` — skip save while loading

Did not full-mount the SFC. Did not rewrite Playwright.

## Files touched (Phase B2)

- `apps/ap/src/modules/home/entityCard/composables/useCalculatorSpendTabs.ts` (new)
- `apps/ap/src/modules/home/entityCard/composables/useCalculatorForm.ts` (new)
- `apps/ap/src/modules/home/entityCard/composables/useCalculatorApi.ts` (new)
- `apps/ap/src/modules/home/entityCard/composables/useCalculatorScenarios.ts` (new)
- `apps/ap/src/modules/home/entityCard/utils/calculatorUtils.ts`
- `apps/ap/src/modules/home/entityCard/views/EntityCardCalculator.vue`
- `apps/ap/tests/Unit/Utils/calculatorUtils.spec.ts`
- `apps/ap/tests/Composables/useCalculatorForm.spec.ts` (new)
- `apps/ap/tests/Composables/useCalculatorApi.spec.ts` (new)
- `apps/ap/tests/Composables/useCalculatorSpendTabs.spec.ts` (new)
- `apps/ap/tests/Composables/useCalculatorScenarios.spec.ts` (new)
- `docs/context/change-entitycardcalculator-refactor.md` (this file)

## Phase B3 — presentational SFCs

Continued on `refactor/entity-card-calculator` (same working tree as A + B1 + B2). Extracted six presentational children under `apps/ap/src/modules/home/entityCard/components/calculator/`. New SFCs use `<script setup lang="ts">` and typed prop bags. Shell stays `defineComponent` + `setup()` (Phase C). KeepAlive `name` remains `EntityCardCalculator`.

Layout roots stay on the children (`col-xl-6`, `col-xl-2`, `row` / `col-10` inside the tabs bar). Matching scoped CSS moved with the markup (`!important` kept). No DS swap, no restyle.

| Child | Region |
|---|---|
| `CalculatorSpendTabsBar` | Spend `TabStrip` + Show/Hide Scenarios. Ids: `kendo-k-tabstrib-items-entiticard-calculator`, `show-hide-scenarios-btn` |
| `CalculatorEmptyState` | `showTabsInfo` / `.no-data-available` |
| `CalculatorInputsCard` | Left `col-xl-6` card (NumericTextBox / CalculumDropDownList / CalculumDropDownButton) |
| `CalculatorEconomicProfitCard` | Right `col-xl-6` card (`.card-right-container`, `.status-box`) |
| `CalculatorImpactAnalysis` | Chart / matrix / calculation / descriptions. Id: `matrix-calculator`. Reuses `VerticalBarChart`, `MatrixTable`, `AccordionPanel`, `Descriptions` |
| `CalculatorScenariosSidebar` | `col-xl-2` sidebar. Id: `new-scenario-btn`. Reuses `ScenariosCards` |

Shell still owns: Teaser, `CalculumLoading` overlay, new-scenario `CalculumModal`, PT-impact modal, composable wiring. Comment at the spend-tabs call site: `useCalculatorSpendTabs` must be constructed before `useCalculatorApi` (both watch `tabsDataTabSelected`; API reads spend-config uuid written by spend-tabs).

Children do not call the store. User actions emit (`select-tab`, `toggle-scenarios`, `apply`, `undo`, `show-details`, `new-scenario`, …) or go through a typed handlers bag on the inputs card (NumericTextBox / dropdown change).

Did not full-mount the SFC. Did not rewrite Playwright. `#entity-card-calculator` locator unchanged.

## Files touched (Phase B3)

- `apps/ap/src/modules/home/entityCard/components/calculator/calculator-view-types.ts` (new)
- `apps/ap/src/modules/home/entityCard/components/calculator/CalculatorSpendTabsBar.vue` (new)
- `apps/ap/src/modules/home/entityCard/components/calculator/CalculatorEmptyState.vue` (new)
- `apps/ap/src/modules/home/entityCard/components/calculator/CalculatorInputsCard.vue` (new)
- `apps/ap/src/modules/home/entityCard/components/calculator/CalculatorEconomicProfitCard.vue` (new)
- `apps/ap/src/modules/home/entityCard/components/calculator/CalculatorImpactAnalysis.vue` (new)
- `apps/ap/src/modules/home/entityCard/components/calculator/CalculatorScenariosSidebar.vue` (new)
- `apps/ap/src/modules/home/entityCard/views/EntityCardCalculator.vue`
- `docs/context/change-entitycardcalculator-refactor.md` (this file)

## Phase C — shell `<script setup>`

Continued on `refactor/entity-card-calculator` (same working tree as A + B1–B3). Converted **only** the shell SFC to `<script setup lang="ts">`. Children were already script-setup from B3. Overview / Negotiation were not converted.

KeepAlive identity is set with `defineOptions({ name: "EntityCardCalculator" })`. Same public props as before (`companyId`, `companyType`, `country`, `creditData`, `entityCharacteristics`, `entityDetails`, `isLoadingEntityCard`, `overviewTabEventUUID`, `programData`, `programIsPendingRecalculation`, `programIsRecalculating`, `potentialTheme`, `programTarget`, `programUuid`, `retrieveAllSpends`). No new emits. Children register via script-setup imports (no `components:{}`). Dropped unused scoped `span.tooltip-position` CSS.

Did not extract more presentational pieces. Did not add DS controls or rewrite E2E.

### Files touched (Phase C)

- `apps/ap/src/modules/home/entityCard/views/EntityCardCalculator.vue`
- `docs/context/change-entitycardcalculator-refactor.md` (this file)

Do not merge to `master` until the user asks.
