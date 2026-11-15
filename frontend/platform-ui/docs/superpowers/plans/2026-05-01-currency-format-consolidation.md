# Currency Format Consolidation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminate the silent double-currency-conversion bug in number formatting AND the duplication between `FormatData.formatBigNumbers` and `StringUtils.formatBigNumbers`, by consolidating to a single pure formatter (`StringUtils.formatBigNumbers`) plus an explicit currency-aware formatter (`StringUtils.formatBigCurrency`). Also fix the related backend bug in `EntityCardService::calculatePotentialSavingsOrCashFlow` where currency-converted and native values are compared.

**Architecture:**
- Two coexisting `formatBigNumbers` functions today (one in `StringUtils`, one in `FormatData`) with the same name but different behavior is the root of every currency-display anomaly users have reported. The `StringUtils` version is already a pure formatter; the `FormatData` version applies `changeToCurrency()` implicitly by default. We keep the pure one and delete the implicit-conversion one. Sites that today rely on the implicit conversion are migrated explicitly to a new `formatBigCurrency` helper that pairs `changeToCurrency` with `formatBigNumbers`. Sites whose values are already converted by the backend stop double-converting and start showing correct numbers in non-USD currencies.
- The backend bug is independent in scope but lives in the same user-visible flow (the entity-card cashflow chart on the left), so we fix it in the same plan.

**Tech Stack:** Frontend = Vue 3 + TypeScript + Vue CLI 5 + Vitest + Playwright. Backend = Symfony 6.4 + PHPUnit + Doctrine ORM.

**Repos:**
- Frontend: `D:\repos\code\frontend`
- Backend (web-app): `D:\repos\code\web-app`

**Out of scope (deliberately deferred):**
- Wider `StringUtils` vs `FormatData` reorganization (date utilities, percent helpers, etc.). This plan only consolidates the `formatBigNumbers` duplication.
- Replacing `changeToCurrency` / `changeToUSD` themselves. They remain as utility primitives.
- Touching i18n strings or templates beyond what's required to swap a function call.

---

## Inventory snapshot (recorded for the executor — do not re-derive)

### Two `formatBigNumbers` definitions exist today

- **A — Pure formatter (KEEP):** `D:\repos\code\frontend\src\utils\StringUtils.ts:79-143`. Signature `formatBigNumbers(value, options?)`. No currency math. Options object: `{ maximumFractionDigits?, minimumFractionDigits?, lang? }`.
- **B — Implicit-conversion formatter (DELETE):** `D:\repos\code\frontend\src\utils\FormatData.ts:417-450`. Signature `formatBigNumbers(value, maximumFractionDigits=1, lang="en-US", isCurrency=true, minimumFractionDigits=1)`. Calls `changeToCurrency(value)` on line 432 when `isCurrency` is truthy. **This is the source of the double-conversion bug.**

### Total `formatBigNumbers` call sites: 177 occurrences across 48 files

This count includes BOTH variants. The migration only touches sites that import from `@/utils/FormatData` (variant B). Sites that go through `StringUtils.formatBigNumbers` are already correct.

The complete file-level breakdown lives in the appendix at the bottom of this plan.

### `changeToCurrency` / `changeToUSD` call sites: 54 occurrences across 8 files

These remain untouched in this plan except where the executor finds a redundant pre-conversion that becomes obsolete after migration. Files with these calls:
- `src\utils\FormatData.ts` (definitions + 1 internal use to be removed in Phase 4)
- `src\modules\home\analyze\views\HomeAnalyzeSetupCompleted.vue` (filter values for backend round-trip — KEEP)
- `src\modules\home\analyze\views\HomeAnalyzeProgramToPlan1.vue` (mix of GET response conversion and POST send-to-backend — KEEP)
- `src\modules\home\categorize\store\CategorizeParseCharts.ts` (GET response conversion — REVIEW Phase 5)
- `src\modules\components\filter\CalculumAnalyzeFilter.vue` (filter values for backend round-trip — KEEP)
- `src\modules\home\analyze\components\HarmonizationComponent.vue` (filter values — KEEP)
- `src\modules\home\analyze\components\FinancingComponent.vue` (filter values — KEEP)
- `src\modules\home\entityCard\views\EntityCardOverviewTab.vue` (GET response conversion before display — REVIEW Phase 5)

### Backend bug location (independent fix)

- File: `D:\repos\code\web-app\src\Services\EntityCard\EntityCardService.php`
- Method: `calculatePotentialSavingsOrCashFlow` (lines 218-313)
- Defect: Line 247 calls `getSumOfCashFlowByProgram($program, false, false)` returning native-currency total; line 248 calls `getSumOfCashFlowByProgramAndEntity($program, $entity, $currencyRate)` returning user-currency total. The two are then divided in `resolveChartReference` (lines 373-375) producing a `percentage` artificially scaled by `currencyRate`, and used to look up a chart-reference threshold in a fixed-currency table (`findCashFlowChartReference`).
- Output fields affected: `valueToDisplay`, `cashFlowImpactRate`, `description`, `color`.
- Other potentially-affected fields are NOT affected: `realValue`, `maxValue`, `equivalentDiscount`, `agreedCashFlow`, `economicProfit`, `vCardRebateFull` are correctly handled (verified during pre-plan audit).

---

## Phase 0 — Pre-flight verification (4 tasks)

Required to establish baseline and disambiguate variants before any code changes.

### Task 0.1: Verify the two `formatBigNumbers` definitions exist as described

**Files:**
- Read: `D:\repos\code\frontend\src\utils\StringUtils.ts:79-143`
- Read: `D:\repos\code\frontend\src\utils\FormatData.ts:417-450`

- [ ] **Step 1: Read both files; confirm signatures and behaviors match the inventory above.**

Run:
```bash
grep -n "formatBigNumbers" D:/repos/code/frontend/src/utils/StringUtils.ts
grep -n "formatBigNumbers" D:/repos/code/frontend/src/utils/FormatData.ts
```
Expected: `StringUtils.ts` shows the static method on the class; `FormatData.ts` shows the `export const formatBigNumbers = ...` and the line `if (isCurrency) value = changeToCurrency(value) ?? value;`.

- [ ] **Step 2: If either differs from the inventory, STOP and update this plan before proceeding.**

### Task 0.2: Build the canonical migration map (FormatData.formatBigNumbers callers)

The migration in Phase 3 is driven by this map. The executor cannot proceed without it.

**Files:**
- Create: `D:\repos\code\frontend\docs\superpowers\plans\2026-05-01-currency-format-migration-map.md`

- [ ] **Step 1: Identify every file that imports `formatBigNumbers` from `@/utils/FormatData` (NOT through `StringUtils`).**

Use the Grep tool with these two patterns and merge the results:
```
Pattern A: from ['"]@/utils/FormatData['"]\s*[\s\S]{0,300}?formatBigNumbers
Pattern B: import \* as FormatData from
```
Pattern A finds explicit named imports; Pattern B finds `import * as FormatData` namespace imports (callers use `FormatData.formatBigNumbers(...)` or `formatData.formatBigNumbers(...)`). For Pattern B, also confirm the file actually invokes `formatBigNumbers` on the namespace.

- [ ] **Step 2: For each file found, list every line that calls the imported `formatBigNumbers`.**

Use Grep on each file to find calls. Format the output as one row per call:
```
file_path | line | call_text | data_source_field | classification
```

- [ ] **Step 3: Classify each call into exactly one of these three buckets.**

Buckets:
- **already-converted** — value comes from a POST endpoint that sent `currencyRate` (BE applies rate). Migration target: `StringUtils.formatBigNumbers(value, options?)` — pure formatting, no conversion.
- **native** — value comes from a GET endpoint that does not send `currencyRate`, or from a local computation that is already in native (USD) units. Migration target: `StringUtils.formatBigCurrency(value, options?)` — explicit conversion + formatting.
- **non-monetary** — value is a percentage, day count, score, ratio, or other non-money number. Migration target: `StringUtils.formatBigNumbers(value, options?)` — pure formatting, no conversion.

To classify, follow the data field back to its source by tracing assignments. Do not guess. If the field flows through a generic `:value` chart prop, trace the parent that bound the prop. If after one round of tracing the data source is still ambiguous, mark as **unclear** and add a one-sentence note about what's ambiguous; the executor will resolve unclear items in Task 5.x interactively.

- [ ] **Step 4: Cross-check classifications against the API helper bucketing.**

API helpers that send `currencyRate` (response is already-converted):
- `getEntityFinancingTabbyLevel`
- `getPaymentTermsOpportunity`
- `getPotentialSavingsbyCompanyProgram`
- `getPotentialCashFlowInNegotiationBySpendConfig`
- `getSpendInK`
- `getSupplierSpendInK`
- `getSupplierTreeFamily`
- `getFullAdaBot`
- `postChartData` (when programUUID supplied)
- `getUniqueData`
- `validateGlobalFilters`
- `exportCSV`
- `postGetCalculateData`

API helpers that DO NOT send `currencyRate` (response is native — caller must convert if displaying as currency):
- `getSpendsBySupplier`
- `getSpendsBySupplierWihtoutProgram`
- `getCurrentAndProposedPaymentTerms`
- `getDetailFinancialMetrics`
- `getEntityCardSpendInformation`
- All other GET helpers in `entityCard/api/index.ts`

If a classification disagrees with the bucket of its data source, prefer the bucket inferred from the data source.

- [ ] **Step 5: Save the migration map.**

Save the table to `D:\repos\code\frontend\docs\superpowers\plans\2026-05-01-currency-format-migration-map.md`. Commit it.

```bash
cd D:/repos/code/frontend
git add docs/superpowers/plans/2026-05-01-currency-format-migration-map.md
git commit -m "docs: migration map for currency format consolidation"
```

### Task 0.3: Take a non-USD baseline screenshot

We need a manual visual baseline so the executor can verify Phase 6 fixes, not just refactor without checking.

**Files:** none (manual)

- [ ] **Step 1: Start the FE dev server.**

```bash
cd D:/repos/code/frontend
npm run serve
```

- [ ] **Step 2: Open the entity card for any supplier with non-zero values.**

Manually navigate to: a Spend File → an Entity Card → the Negotiation/Opportunity tab. Confirm the right-side panel info-cards display values.

- [ ] **Step 3: Switch currency to a non-USD currency (e.g., EUR) via the navbar selector.**

Wait for the page to reload to the home dashboard, then re-open the same entity card.

- [ ] **Step 4: Capture screenshots of:**
- The "Cash Flow Opportunity" main card on the left.
- The "Spend Volume" card on the left.
- The right-side panel "Cash Flow Opportunity" info-card after clicking the Opportunity row.
- The right-side panel "Cash Flow Opportunity" info-card after clicking the Supplier Standard row.
- The AdaBot text panel describing the same supplier (the "If we would increase our payment terms..." block).

Save screenshots to `D:/tmp/currency-format-baseline-eur/`. These are the pre-fix reference. Do NOT commit them.

- [ ] **Step 5: Capture the same screenshots in USD as the "correct" reference.**

Save to `D:/tmp/currency-format-baseline-usd/`.

### Task 0.4: Lock current `StringUtils.formatBigNumbers` behavior with characterization tests

We're going to leave `StringUtils.formatBigNumbers` alone, but we add tests so any later accidental change is caught.

**Files:**
- Create: `D:\repos\code\frontend\tests\Unit\utils\StringUtils.formatBigNumbers.spec.ts`

- [ ] **Step 1: Write the failing test file.**

```ts
import { describe, it, expect } from "vitest";
import StringUtils from "@/utils/StringUtils";

describe("StringUtils.formatBigNumbers (pure formatter)", () => {
  it("formats sub-thousand integers without a suffix", () => {
    expect(StringUtils.formatBigNumbers(135.9)).toBe("135.9");
    expect(StringUtils.formatBigNumbers(0)).toBe("0");
    expect(StringUtils.formatBigNumbers(-42)).toBe("-42.0");
  });

  it("uses k / m / b / t / q / i / s suffixes at the right thresholds", () => {
    expect(StringUtils.formatBigNumbers(1_000)).toBe("1.0k");
    expect(StringUtils.formatBigNumbers(1_500_000)).toBe("1.5m");
    expect(StringUtils.formatBigNumbers(2.5e9)).toBe("2.5b");
    expect(StringUtils.formatBigNumbers(3e12)).toBe("3.0t");
  });

  it("does NOT apply currency conversion regardless of any global state", () => {
    // The pure formatter must never multiply by a rate.
    // We verify the output equals the same value formatted as a literal.
    const value = 1_234_567;
    expect(StringUtils.formatBigNumbers(value)).toBe("1.2m");
  });

  it("respects custom fraction digits via options", () => {
    expect(
      StringUtils.formatBigNumbers(1_234_567, { maximumFractionDigits: 2, minimumFractionDigits: 2 }),
    ).toBe("1.23m");
  });
});
```

- [ ] **Step 2: Run and confirm tests pass (this is a characterization, not a TDD red-first).**

```bash
cd D:/repos/code/frontend
npx vitest run tests/Unit/utils/StringUtils.formatBigNumbers.spec.ts
```
Expected: 4 tests pass.

If any fail, the function does not behave as documented — STOP and reconcile with the executor before continuing.

- [ ] **Step 3: Commit.**

```bash
cd D:/repos/code/frontend
git add tests/Unit/utils/StringUtils.formatBigNumbers.spec.ts
git commit -m "test: characterize StringUtils.formatBigNumbers pure formatter"
```

---

## Phase 1 — Backend bug fix (independent of FE migration) (4 tasks)

This phase fixes a separate but visually-related bug. It can be merged before, after, or in parallel with the FE phases. It's listed first because it's small and self-contained.

### Task 1.1: Add a failing PHPUnit test for `calculatePotentialSavingsOrCashFlow` with non-USD rate

**Files:**
- Create: `D:\repos\code\web-app\tests\Unit\Services\EntityCard\EntityCardServiceCurrencyTest.php`

- [ ] **Step 1: Write the test.**

```php
<?php

namespace App\Tests\Unit\Services\EntityCard;

use App\Tests\Common\UnitTestCase;
use App\Services\EntityCard\EntityCardService;
// (use statements for fixtures, mocked repositories, etc.)

class EntityCardServiceCurrencyTest extends UnitTestCase
{
    /**
     * When currencyRate != 1, the percentage in the response must equal
     * (companyCashFlow_native / programCashFlow_native), NOT
     * (companyCashFlow_native * rate / programCashFlow_native).
     *
     * Regression for the cashflow-or-savings-overview chart.
     */
    public function testPercentageDoesNotScaleWithCurrencyRate(): void
    {
        // Arrange: native company cash flow = 1_000_000, native program cash flow = 10_000_000.
        // Expected percentage = 0.1 regardless of currencyRate.
        // Use an in-memory or mocked repository that returns these fixed values for both
        // getSumOfCashFlowByProgram(...)        -> 10_000_000 (no rate applied)
        // getSumOfCashFlowByProgramAndEntity(.., 1.0)  -> 1_000_000 (no rate applied)
        // getSumOfCashFlowByProgramAndEntity(.., 0.92) -> 920_000 (rate applied)
        // Use the existing EntityCardServiceTest scaffolding for the SUT setup.

        // Act: call calculatePotentialSavingsOrCashFlow with currencyRate=0.92.

        // Assert: result['valueToDisplay'] / 100 == 0.1 (within 1e-9), NOT 0.092.
        // Assert: result['realValue'] == 920_000 (correctly converted output).
        // Assert: result['maxValue'] == 9_200_000 (program total converted at output).
    }
}
```

The detailed setup (mocking the spend file version, program, entity, and `EntityCardRepository`) follows the pattern already in `tests\Unit\Services\EntityCard\EntityCardServiceTest.php` (read it first to copy the harness).

- [ ] **Step 2: Run the test and confirm it fails on the percentage assertion.**

```bash
cd D:/repos/code/web-app
php bin/phpunit tests/Unit/Services/EntityCard/EntityCardServiceCurrencyTest.php
```
Expected: FAIL — `valueToDisplay` is ~0.092 (or thereabouts) instead of 0.1.

- [ ] **Step 3: Commit the failing test.**

```bash
cd D:/repos/code/web-app
git add tests/Unit/Services/EntityCard/EntityCardServiceCurrencyTest.php
git commit -m "test(WI#XXXX): failing regression for cashflow chart currency scaling"
```

### Task 1.2: Fix `calculatePotentialSavingsOrCashFlow`

**Files:**
- Modify: `D:\repos\code\web-app\src\Services\EntityCard\EntityCardService.php:218-313`

- [ ] **Step 1: Replace the mixed-currency block with a same-currency comparison.**

Current code (lines 246-274):
```php
} else {
    $valueFromProgram = $configRepo->getSumOfCashFlowByProgram($program, false, false);
    $valueFromCompany = $configRepo->getSumOfCashFlowByProgramAndEntity($program, $entity, $currencyRate);
}

// Calculate equivalent discount using WACC
$equivalentDiscount = $this->calculateEquivalentDiscount(
    $entity, $sumOfVolume, $valueFromCompany, $currencyRate
);

// Convert to millions for chart reference lookup
$valueFromProviderInMls = null;
if ($valueFromCompany !== null) {
    $valueFromProviderInMls = $valueFromCompany / 1000000;
} else {
    $valueFromCompany = 0;
}

$valueFromProgramInMls = null;
if ($valueFromProgram !== null) {
    $valueFromProgramInMls = $valueFromProgram / 1000000;
} else {
    $valueFromProgram = 0;
}

// Resolve chart reference (color, description, percentage)
[$percentage, $description, $color] = $this->resolveChartReference(
    $program, $valueFromProviderInMls, $valueFromProgramInMls
);
```

New code:
```php
} else {
    $valueFromProgram = $configRepo->getSumOfCashFlowByProgram($program, false, false);
    // Compare native-vs-native; convert at output only.
    $valueFromCompanyNative = $configRepo->getSumOfCashFlowByProgramAndEntity($program, $entity, 1.0);
    $valueFromCompany = ($valueFromCompanyNative ?? 0) * $currencyRate;
}

// Calculate equivalent discount using WACC
$equivalentDiscount = $this->calculateEquivalentDiscount(
    $entity, $sumOfVolume, $valueFromCompany, $currencyRate
);

// Both inputs to the chart-reference comparison are in native (USD) currency.
// The reference table thresholds are stored in fixed units (USD) — see
// ChartReferencePotentialCashFlowEntityCardRepository::findOneByMillions.
$valueFromProviderInMls = $valueFromCompanyNative !== null
    ? $valueFromCompanyNative / 1_000_000
    : null;
if ($valueFromCompanyNative === null) {
    $valueFromCompany = 0;
}

$valueFromProgramInMls = $valueFromProgram !== null
    ? $valueFromProgram / 1_000_000
    : null;
if ($valueFromProgram === null) {
    $valueFromProgram = 0;
}

[$percentage, $description, $color] = $this->resolveChartReference(
    $program, $valueFromProviderInMls, $valueFromProgramInMls
);
```

The same change is needed for the dynamic-discount branch (line 244-245):
```php
if ($program->getProgramTarget() == Program::TARGET_DYNAMIC_DISCOUNT) {
    $valueFromProgram = $configRepo->getSumOfBuyerSavingByProgram($program);
    $valueFromCompanyNative = $configRepo->getSumOfBuyerSavingsByProgramAndEntity($program, $entity, 1.0);
    $valueFromCompany = ($valueFromCompanyNative ?? 0) * $currencyRate;
}
```

(The else branch already handles `$valueFromCompanyNative` for cash flow — make sure both branches assign `$valueFromCompanyNative` so the post-block lookup works for both.)

- [ ] **Step 2: Run the regression test.**

```bash
cd D:/repos/code/web-app
php bin/phpunit tests/Unit/Services/EntityCard/EntityCardServiceCurrencyTest.php
```
Expected: PASS.

- [ ] **Step 3: Run the full EntityCardService test suite to check for collateral regressions.**

```bash
cd D:/repos/code/web-app
php bin/phpunit tests/Unit/Services/EntityCard/
```
Expected: all green.

- [ ] **Step 4: Commit.**

```bash
cd D:/repos/code/web-app
git add src/Services/EntityCard/EntityCardService.php
git commit -m "fix(WI#XXXX): use native-currency comparison for cashflow chart reference

The percentage and description/color of the cashflow-or-savings-overview chart
were computed by dividing a user-currency value by a native-currency value,
which scaled the percentage by currencyRate. Likewise the chart-reference
threshold lookup compared a user-currency value against fixed-USD thresholds.
Both lookups now use native-currency values; only realValue/maxValue are
converted to user currency at output."
```

### Task 1.3: Audit (read-only) sibling files for the same pattern

**Files:**
- Read: `D:\repos\code\web-app\src\Services\EntityCard\EntityCardSupplierManager.php`
- Read: `D:\repos\code\web-app\src\Services\valueProposition\ValuePropositionManager.php` (or equivalent path)

- [ ] **Step 1: Search for the same anti-pattern in each file.**

```
Grep pattern: getSumOfCashFlowByProgram\b|getSumOfBuyerSavingByProgram\b
```
For each match, confirm whether the surrounding code also calls `...ByProgramAndEntity(..., $currencyRate)` and divides them. If yes, the same fix applies; create a follow-up task in this plan (insert as Task 1.4, 1.5, ...).

If no occurrences with the dividing pattern are found in those files, mark this task done with a comment in the commit message explaining nothing else needed fixing.

- [ ] **Step 2: If sibling fixes are added, write tests and apply the same fix shape as Task 1.1/1.2.**

- [ ] **Step 3: Commit any sibling fixes individually with the same commit-message template.**

---

## Phase 2 — New API surface in `StringUtils` (1 task)

This adds the missing piece. After this phase, every caller has a clean target to migrate to.

### Task 2.1: Add `StringUtils.formatBigCurrency`

**Files:**
- Modify: `D:\repos\code\frontend\src\utils\StringUtils.ts:79` (add new method right after `formatBigNumbers`)
- Test: `D:\repos\code\frontend\tests\Unit\utils\StringUtils.formatBigCurrency.spec.ts`

- [ ] **Step 1: Write the failing test.**

```ts
import { describe, it, expect, beforeEach } from "vitest";
import { setActivePinia, createPinia } from "pinia";
import { useAppStore } from "@/stores/app";
import StringUtils from "@/utils/StringUtils";

describe("StringUtils.formatBigCurrency (currency-aware formatter)", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it("multiplies by getCurrencyAmount before formatting", () => {
    const app = useAppStore();
    app.setCurrencyAmount(0.92);
    app.setCurrencyTo("EUR");

    // 100 native USD -> 92 EUR -> "92.0"
    expect(StringUtils.formatBigCurrency(100)).toBe("92.0");
  });

  it("returns plain pure formatting when rate is 1", () => {
    const app = useAppStore();
    app.setCurrencyAmount(1);
    app.setCurrencyTo("USD");

    expect(StringUtils.formatBigCurrency(135.9)).toBe("135.9");
    expect(StringUtils.formatBigCurrency(1_500_000)).toBe("1.5m");
  });

  it("forwards options to the underlying formatter", () => {
    const app = useAppStore();
    app.setCurrencyAmount(1);
    expect(
      StringUtils.formatBigCurrency(1_234_567, {
        maximumFractionDigits: 2,
        minimumFractionDigits: 2,
      }),
    ).toBe("1.23m");
  });

  it("treats null/undefined as 0", () => {
    const app = useAppStore();
    app.setCurrencyAmount(0.92);
    expect(StringUtils.formatBigCurrency(null as any)).toBe("0");
    expect(StringUtils.formatBigCurrency(undefined as any)).toBe("0");
  });
});
```

- [ ] **Step 2: Run to verify failure.**

```bash
cd D:/repos/code/frontend
npx vitest run tests/Unit/utils/StringUtils.formatBigCurrency.spec.ts
```
Expected: FAIL with "formatBigCurrency is not a function" or similar.

- [ ] **Step 3: Implement `formatBigCurrency` in StringUtils.**

Add this method to the `StringUtils` class right after `formatBigNumbers` (after line 143):

```ts
  /**
   * Formats a monetary number into a string with a suffix (k, m, b, t, q, i, s),
   * applying the user's selected currency rate first.
   *
   * Use this when the input value is in native currency (e.g. USD) and the UI
   * needs to display it in the user's selected currency. If the value is
   * already in the user's currency (e.g. it came from a backend endpoint that
   * applied the rate server-side), use {@link formatBigNumbers} instead.
   *
   * @param value The number to format, expressed in native currency.
   * @param options Same shape as {@link formatBigNumbers}.
   */
  static formatBigCurrency(
    value: number | null | undefined,
    options?: Partial<{
      maximumFractionDigits: number;
      lang: string;
      minimumFractionDigits: number;
    }>,
  ): string {
    if (value === null || value === undefined || Number.isNaN(value)) {
      return "0";
    }
    // Imported lazily to avoid a circular import between StringUtils and FormatData.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { changeToCurrency } = require("./FormatData");
    return StringUtils.formatBigNumbers(changeToCurrency(value), options);
  }
```

NOTE: If the eslint rule about `require` is too strict, replace with a top-of-file import. The lazy require is only needed if `FormatData` imports `StringUtils` (it doesn't today — verify with Grep before deciding).

- [ ] **Step 4: Re-run tests.**

```bash
cd D:/repos/code/frontend
npx vitest run tests/Unit/utils/StringUtils.formatBigCurrency.spec.ts
```
Expected: 4 tests pass.

- [ ] **Step 5: Commit.**

```bash
cd D:/repos/code/frontend
git add src/utils/StringUtils.ts tests/Unit/utils/StringUtils.formatBigCurrency.spec.ts
git commit -m "feat: add StringUtils.formatBigCurrency (explicit conversion + format)"
```

---

## Phase 3 — Migrate `FormatData.formatBigNumbers` callers (multiple tasks)

The migration map produced in Task 0.2 drives every task in this phase. Each task migrates ONE file. Each file's task follows the same shape; the executor repeats it for every entry in the map.

The list below groups files by module to make the work tractable. The executor MUST do the migration file-by-file (one commit per file) so each commit is reviewable on its own and can be reverted independently if a regression slips in.

### Task 3.x — Generic per-file migration template

**Files:**
- Modify: `<file>` (per migration-map row)

- [ ] **Step 1: Read the file's import block.**

Identify the line that imports `formatBigNumbers` from `@/utils/FormatData` (or `import * as FormatData`). Note other named imports kept in the same statement.

- [ ] **Step 2: Replace the import.**

If the import is named:
```ts
// before
import { formatBigNumbers, formatPercentage } from "@/utils/FormatData";

// after
import { formatPercentage } from "@/utils/FormatData";
import StringUtils from "@/utils/StringUtils";
```
If `StringUtils` is already imported in the file, just remove the named `formatBigNumbers`.

If the import is namespace (`import * as FormatData from "..."`), keep the namespace import (it's used by other functions like `changeToCurrency`) and ALSO add `import StringUtils from "@/utils/StringUtils";` if not already present.

- [ ] **Step 3: For each call to `formatBigNumbers(value, ...)` (or `FormatData.formatBigNumbers(...)`) in the file, look up the row in the migration map and apply the mapping:**

| Bucket | Replacement |
|---|---|
| **already-converted** | `StringUtils.formatBigNumbers(value)` (drop legacy `isCurrency` arg) |
| **native** | `StringUtils.formatBigCurrency(value)` |
| **non-monetary** | `StringUtils.formatBigNumbers(value)` |

If the original call passed `maximumFractionDigits` or `minimumFractionDigits` positionally (e.g. `formatBigNumbers(x, 2)`), translate those to the options-object form:
```ts
// before
formatBigNumbers(x, 2)
// after
StringUtils.formatBigNumbers(x, { maximumFractionDigits: 2 })
```

If the original passed `isCurrency=false` explicitly (e.g. NineBoxesBox.vue), the new call is just `StringUtils.formatBigNumbers(value, options)` (no conversion).

- [ ] **Step 4: Type-check and lint the file in isolation.**

```bash
cd D:/repos/code/frontend
npx eslint <file>
```
Expected: no errors. If lint complains about an unused import (`formatBigNumbers`, `FormatData`), remove it.

- [ ] **Step 5: If the file has unit/component tests, run them.**

```bash
cd D:/repos/code/frontend
npx vitest run <test-file-if-any>
```

- [ ] **Step 6: Commit just this file.**

```bash
cd D:/repos/code/frontend
git add <file>
git commit -m "refactor: migrate <component> to StringUtils.formatBigNumbers/formatBigCurrency

<Component> previously used FormatData.formatBigNumbers which silently
multiplied by the active currency rate. After migration, currency-aware
sites use formatBigCurrency explicitly; already-converted and non-monetary
sites use the pure formatBigNumbers."
```

### Files to migrate (group A — Entity Card module)

The migration-map will pin exact line numbers and bucket per call; this list pre-identifies the files in scope so the executor can sequence them. Within each file, ALL `formatBigNumbers` calls (only those imported from `FormatData`, NOT `StringUtils.*`) must be migrated atomically.

- [ ] Task 3.A.1: `src\modules\home\entityCard\components\opportunity\StrategiesComponent.vue`
- [ ] Task 3.A.2: `src\modules\home\entityCard\components\modals\ModalResults.vue`
- [ ] Task 3.A.3: `src\modules\home\entityCard\views\EntityCardOverviewTab.vue` (also see Phase 5 for `changeToCurrency` cleanup)
- [ ] Task 3.A.4: `src\modules\home\entityCard\views\EntityCardNegotiation.vue`
- [ ] Task 3.A.5: `src\modules\home\entityCard\views\EntityCardSupplierInsights.vue`
- [ ] Task 3.A.6: `src\modules\home\entityCard\views\EntityCardCalculator.vue`
- [ ] Task 3.A.7: `src\modules\home\entityCard\views\EntityCardFinancing.vue`
- [ ] Task 3.A.8: `src\modules\home\entityCard\components\TreeCards.vue`
- [ ] Task 3.A.9: `src\modules\home\entityCard\components\ScenariosCards.vue`
- [ ] Task 3.A.10: `src\modules\home\entityCard\components\EntityCardRecentSearchCompany.vue`

### Files to migrate (group B — Analyze, Plan, Categorize, Manage modules)

- [ ] Task 3.B.1: `src\modules\home\analyze\views\HomeAnalyzeProgramOverview.vue`
- [ ] Task 3.B.2: `src\modules\home\analyze\views\HomeAnalyzeVcard.vue`
- [ ] Task 3.B.3: `src\modules\home\analyze\components\AnalyzeProgramNineBoxesTableVcard.vue`
- [ ] Task 3.B.4: `src\modules\home\analyze\components\NineBoxesBox.vue` (already passes `isCurrency=false` — migrate signature only)
- [ ] Task 3.B.5: `src\modules\home\analyze\components\NineBoxesModal.vue`
- [ ] Task 3.B.6: `src\modules\home\analyze\composables\useNineBoxesTableLogic.ts`
- [ ] Task 3.B.7: `src\modules\home\plan\components\PlanPhaseOverview.vue`
- [ ] Task 3.B.8: `src\modules\home\components\PlanSummaryCards.vue`
- [ ] Task 3.B.9: `src\modules\home\manageModule\views\Overview.vue`
- [ ] Task 3.B.10: `src\modules\home\manageModule\components\CardsByStatus.vue`
- [ ] Task 3.B.11: `src\modules\home\manageModule\views\EmailNegotiations.vue`
- [ ] Task 3.B.12: `src\modules\home\overview\components\OverviewCharts.vue`
- [ ] Task 3.B.13: `src\modules\home\overview\components\OverviewLocation.vue`
- [ ] Task 3.B.14: `src\modules\home\overview\components\OverviewLocationNew.vue`
- [ ] Task 3.B.15: `src\modules\home\views\HomeDashBoard.vue`
- [ ] Task 3.B.16: `src\modules\home\components\HomeStackedBar.vue`
- [ ] Task 3.B.17: `src\modules\home\categorize\views\CategorizeOverview.vue`

### Files to migrate (group C — Charts, components, value proposition)

- [ ] Task 3.C.1: `src\modules\components\charts\kendo\HorizontalBarChart.vue`
- [ ] Task 3.C.2: `src\modules\components\charts\kendo\HorizontalBarChartNew.vue`
- [ ] Task 3.C.3: `src\modules\components\charts\kendo\LineBarChart.vue`
- [ ] Task 3.C.4: `src\modules\components\charts\kendo\PieChart.vue`
- [ ] Task 3.C.5: `src\modules\components\charts\kendo\VerticalBarChart.vue`
- [ ] Task 3.C.6: `src\modules\components\charts\kendo\WaterfallChart.vue`
- [ ] Task 3.C.7: `src\modules\components\metrics\MetricsComponents.vue`
- [ ] Task 3.C.8: `src\modules\components\metrics\MetricsComponentsNew.vue`
- [ ] Task 3.C.9: `src\modules\components\metrics\MetricsComponentsNew2.vue`
- [ ] Task 3.C.10: `src\modules\components\metrics\MetricsComponentsNew3.vue`
- [ ] Task 3.C.11: `src\modules\components\table\SupplierImpactTable.vue`
- [ ] Task 3.C.12: `src\modules\components\BarsTricolor.vue`
- [ ] Task 3.C.13: `src\modules\components\cards\CardTitleValue.vue`
- [ ] Task 3.C.14: `src\modules\components\utils\filterRelated.ts`
- [ ] Task 3.C.15: `src\modules\valueProposition\componentes\HomeStackedBar.vue`
- [ ] Task 3.C.16: `src\modules\valueProposition\componentes\PieChartComponent.vue`
- [ ] Task 3.C.17: `src\modules\valueProposition\componentes\DataDisplayComponent.vue`
- [ ] Task 3.C.18: `src\modules\globalFilters\views\MainLayoutFilters.vue`
- [ ] Task 3.C.19: `src\utils\ForecastUtils.ts`
- [ ] Task 3.C.20: `src\utils\kendoChartRelated.ts`

**Important:** chart components often format `e.value` from Kendo events, where `e.value` is a chart-axis tick value derived from data fed to the chart. Whether to use `formatBigNumbers` or `formatBigCurrency` here depends on whether the chart's data series was bound with already-converted or native values. The migration map (Task 0.2) must classify these per-file by tracing the chart's data binding. If the parent component bound already-converted data (the common case for entity-card charts), use `formatBigNumbers`; if the chart was bound with native values, use `formatBigCurrency`.

---

## Phase 4 — Delete the legacy and prevent regressions (3 tasks)

Once Phase 3 is complete and verified, drop the deprecated implementation.

### Task 4.1: Confirm zero remaining call sites import `formatBigNumbers` from `@/utils/FormatData`

**Files:** none (verification only)

- [ ] **Step 1: Grep for any remaining named or namespace import.**

```bash
cd D:/repos/code/frontend
grep -rn "from.*['\"]@/utils/FormatData['\"]" src/ | grep -i "formatBigNumbers"
```
Expected: zero results.

```bash
cd D:/repos/code/frontend
grep -rn "FormatData\.formatBigNumbers\|formatData\.formatBigNumbers" src/
```
Expected: zero results.

- [ ] **Step 2: If any results remain, treat as a Phase 3 task that was missed; STOP and migrate them.**

### Task 4.2: Remove `formatBigNumbers` from `FormatData.ts`

**Files:**
- Modify: `D:\repos\code\frontend\src\utils\FormatData.ts:417-450`

- [ ] **Step 1: Delete the function.**

Remove lines 417-450 (the entire `export const formatBigNumbers = ...` block) and the JSDoc above it.

- [ ] **Step 2: Run typecheck across the project.**

```bash
cd D:/repos/code/frontend
npx vue-tsc --noEmit
```
Expected: 0 errors. If errors appear, re-grep for missed call sites.

- [ ] **Step 3: Run all unit and component tests.**

```bash
cd D:/repos/code/frontend
npm run test:unit
npm run test:component
```
Expected: all green.

- [ ] **Step 4: Commit.**

```bash
cd D:/repos/code/frontend
git add src/utils/FormatData.ts
git commit -m "refactor: remove FormatData.formatBigNumbers (replaced by StringUtils.formatBigNumbers + StringUtils.formatBigCurrency)"
```

### Task 4.3: Add an ESLint rule to prevent re-introduction

**Files:**
- Modify: `D:\repos\code\frontend\.eslintrc.js` (or equivalent — `.eslintrc.cjs` / `eslint.config.js`)

- [ ] **Step 1: Identify the project's ESLint config file.**

```bash
ls D:/repos/code/frontend/.eslintrc.* 2>/dev/null
ls D:/repos/code/frontend/eslint.config.* 2>/dev/null
```

- [ ] **Step 2: Add a `no-restricted-imports` and `no-restricted-syntax` rule.**

```js
{
  rules: {
    "no-restricted-imports": ["error", {
      paths: [{
        name: "@/utils/FormatData",
        importNames: ["formatBigNumbers"],
        message: "Use StringUtils.formatBigNumbers (pure) or StringUtils.formatBigCurrency (with currency conversion) instead. See docs/superpowers/plans/2026-05-01-currency-format-consolidation.md."
      }]
    }],
    "no-restricted-syntax": ["error", {
      selector: "MemberExpression[object.name=/^(formatData|FormatData)$/][property.name='formatBigNumbers']",
      message: "Use StringUtils.formatBigNumbers or StringUtils.formatBigCurrency instead."
    }]
  }
}
```

- [ ] **Step 3: Run lint to confirm no new violations.**

```bash
cd D:/repos/code/frontend
npx eslint src/
```
Expected: clean.

- [ ] **Step 4: Commit.**

```bash
cd D:/repos/code/frontend
git add <eslint-config-file>
git commit -m "chore: lint-block re-introduction of FormatData.formatBigNumbers"
```

---

## Phase 5 — Audit and remove redundant `changeToCurrency` pre-conversions (1 task)

After Phase 3, some sites that today wrap a backend value with `changeToCurrency()` BEFORE storing/displaying it through the legacy `formatBigNumbers` (which would have converted again) are now over-converting. This phase finds and fixes those.

### Task 5.1: Reconcile `changeToCurrency` calls against the new contract

**Files:**
- Audit: `src\modules\home\entityCard\views\EntityCardOverviewTab.vue:368-373`
- Audit: `src\modules\home\categorize\store\CategorizeParseCharts.ts` (multiple lines, ~25 `changeToCurrency` calls)
- Audit: `src\modules\home\analyze\views\HomeAnalyzeProgramToPlan1.vue` (mixed conversion direction)

- [ ] **Step 1: For each file, decide the correct shape.**

Decision rule:
- If the value flows into a chart/UI display, it should reach the display ONCE-converted. Either the storage already converts (then display uses `formatBigNumbers`), OR storage stays native and display uses `formatBigCurrency`. Pick one consistently per file.
- If the value flows into a request body (sent back to BE), it should be in native currency. Use `changeToUSD` to convert from user-currency to native; KEEP these calls.

- [ ] **Step 2: Apply the decision per file.**

Most likely outcomes:
- `EntityCardOverviewTab.vue:368-373` — KEEP `changeToCurrency` (the source GET endpoint returns native, the storage needs to be converted, downstream displays use the legacy formatter which is going away — after Phase 3, the displays use `formatBigNumbers` against the already-converted storage). Verify by tracing each `spend.spend_volume` consumer.
- `CategorizeParseCharts.ts` — KEEP if the rendered chart values then go through `StringUtils.formatBigNumbers` (pure). Remove if downstream uses `formatBigCurrency` (would double-convert).
- `HomeAnalyzeProgramToPlan1.vue` — case-by-case; comments in the code already note "we need to convert because is a get request" — confirm those still hold.

- [ ] **Step 3: Run typecheck + dev server smoke check after each file.**

```bash
cd D:/repos/code/frontend
npx vue-tsc --noEmit
npm run serve
```
Manually verify the affected screens in non-USD currency.

- [ ] **Step 4: Commit per file.**

```bash
cd D:/repos/code/frontend
git add <file>
git commit -m "refactor: remove redundant changeToCurrency wrap now that formatBigCurrency converts"
```
or
```bash
git commit -m "chore: keep changeToCurrency (value is consumed by pure formatter — single conversion is correct)"
```
The commit message must state explicitly which case applied.

---

## Phase 6 — End-to-end verification (2 tasks)

### Task 6.1: Visual regression against the Phase 0 baseline

**Files:** none (manual)

- [ ] **Step 1: Restart the dev server and capture the same screenshots from Task 0.3 in EUR (and a second non-USD currency, e.g. GBP, if available).**

Save to `D:/tmp/currency-format-after-eur/` and `D:/tmp/currency-format-after-gbp/`.

- [ ] **Step 2: Compare against the USD baseline (which is the truth):**

The EUR-after value should be `usd_baseline_value * eur_rate` for every monetary number on screen, formatted with the same suffix logic. Spot-check at least:
- Cash Flow Opportunity main card (left)
- Spend Volume card (left)
- Right panel info-card "Cash Flow Opportunity" for proposedTerms
- Right panel info-card "Cash Flow Opportunity" for supplierStandardStrategy
- AdaBot text mentioning a EUR amount with the supplier's data

- [ ] **Step 3: For each screen with a discrepancy, reopen the migration map and re-classify the relevant call sites, then patch in a follow-up task.**

### Task 6.2: Run all FE tests + a lint of the whole tree

**Files:** none

- [ ] **Step 1:**

```bash
cd D:/repos/code/frontend
npm run test:unit
npm run test:component
npm run test:integration
npx eslint src/
npx vue-tsc --noEmit
```

- [ ] **Step 2: All green or fix-and-retry.**

- [ ] **Step 3: Final commit if any docs need updating (e.g. CHANGELOG).**

---

## Self-review notes

- **Spec coverage:**
  - Option-3 refactor (remove implicit conversion from `formatBigNumbers`) — covered by Phase 2 (new API) + Phase 3 (migration) + Phase 4 (deletion).
  - StringUtils ↔ FormatData dedupe for `formatBigNumbers` — covered by Phase 2 (StringUtils gains `formatBigCurrency`) + Phase 4 (FormatData loses `formatBigNumbers`). After this plan, only `StringUtils` exposes `formatBigNumbers` / `formatBigCurrency`. Other duplicated methods (e.g. `formatPercentage`) are out of scope.
  - Backend bug fix — covered by Phase 1.
- **No placeholders:** every step has a concrete command, code block, or file path. The migration map (Task 0.2) is the only deferred enumeration; that deferral is intentional because the executor produces it as the first deliverable and uses it to drive Phase 3.
- **Type/method consistency:** `StringUtils.formatBigNumbers(value, options?)` and the new `StringUtils.formatBigCurrency(value, options?)` share identical signatures. Both accept `Partial<{ maximumFractionDigits, minimumFractionDigits, lang }>`. The legacy `FormatData.formatBigNumbers(value, max, lang, isCurrency, min)` positional signature is deleted entirely; nothing else uses that order.

---

## Appendix — File-level call-count reference

(For executor convenience. Counts come from `grep -c formatBigNumbers` against each file; some files mix `StringUtils.formatBigNumbers` and `FormatData.formatBigNumbers` — only the latter requires migration. The migration map produced in Task 0.2 will disambiguate per-line.)

| File | total formatBigNumbers occurrences |
|---|---|
| src\utils\FormatData.ts | 2 (definition + internal use) |
| src\utils\StringUtils.ts | 1 (definition) |
| src\modules\home\entityCard\views\EntityCardNegotiation.vue | 9 |
| src\modules\home\analyze\views\HomeAnalyzeProgramOverview.vue | 9 |
| src\modules\home\components\PlanSummaryCards.vue | 8 |
| src\modules\home\analyze\views\HomeAnalyzeVcard.vue | 7 |
| src\modules\home\views\HomeDashBoard.vue | 7 |
| src\modules\home\entityCard\views\EntityCardCalculator.vue | 7 |
| src\modules\home\analyze\components\AnalyzeProgramNineBoxesTableVcard.vue | 14 |
| src\modules\home\overview\components\OverviewCharts.vue | 12 |
| src\modules\home\analyze\composables\useNineBoxesTableLogic.ts | 10 |
| src\modules\components\charts\kendo\HorizontalBarChart.vue | 6 |
| src\modules\components\charts\kendo\HorizontalBarChartNew.vue | 6 |
| src\modules\valueProposition\componentes\DataDisplayComponent.vue | 6 |
| src\modules\home\plan\components\PlanPhaseOverview.vue | 5 |
| src\modules\home\entityCard\components\modals\ModalResults.vue | 5 |
| src\modules\valueProposition\componentes\HomeStackedBar.vue | 4 |
| src\modules\home\entityCard\components\TreeCards.vue | 4 |
| src\modules\components\table\SupplierImpactTable.vue | 4 |
| src\modules\home\manageModule\views\Overview.vue | 4 |
| src\modules\home\manageModule\components\CardsByStatus.vue | 3 |
| src\modules\home\entityCard\views\EntityCardFinancing.vue | 3 |
| src\modules\components\charts\kendo\VerticalBarChart.vue | 3 |
| src\modules\home\analyze\components\NineBoxesBox.vue | 3 |
| src\modules\home\entityCard\views\EntityCardSupplierInsights.vue | 2 |
| src\modules\components\charts\kendo\WaterfallChart.vue | 2 |
| src\modules\components\charts\kendo\LineBarChart.vue | 2 |
| src\modules\globalFilters\views\MainLayoutFilters.vue | 2 |
| src\utils\kendoChartRelated.ts | 2 |
| src\modules\home\categorize\views\CategorizeOverview.vue | 2 |
| src\modules\home\overview\components\OverviewLocationNew.vue | 2 |
| src\modules\home\overview\components\OverviewLocation.vue | 2 |
| src\modules\home\manageModule\views\EmailNegotiations.vue | 2 |
| src\utils\ForecastUtils.ts | 2 |
| src\modules\home\entityCard\components\opportunity\StrategiesComponent.vue | 2 |
| src\modules\components\BarsTricolor.vue | 1 |
| src\modules\valueProposition\componentes\PieChartComponent.vue | 1 |
| src\modules\components\utils\filterRelated.ts | 1 |
| src\modules\home\analyze\components\NineBoxesModal.vue | 1 |
| src\modules\home\entityCard\components\EntityCardRecentSearchCompany.vue | 1 |
| src\modules\home\entityCard\components\ScenariosCards.vue | 1 |
| src\modules\components\metrics\MetricsComponentsNew3.vue | 1 |
| src\modules\components\metrics\MetricsComponentsNew2.vue | 1 |
| src\modules\components\metrics\MetricsComponentsNew.vue | 1 |
| src\modules\components\metrics\MetricsComponents.vue | 1 |
| src\modules\components\cards\CardTitleValue.vue | 1 |
| src\modules\components\charts\kendo\PieChart.vue | 1 |
| src\modules\home\components\HomeStackedBar.vue | 1 |

Total: 177 occurrences across 48 files.
