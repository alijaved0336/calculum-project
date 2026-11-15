# Optimization: compare-company.spec.ts

## Issues Found

### 1. Massive code duplication (9 near-identical functions)
`enterDpo`, `enterDso`, `enterDio`, `enterC2c`, `enterInventory`, `enterRecivable`,
`enterPayable`, `enterRevenue`, `enterCostOfGoods` — each does the exact same thing:
read input value → skip if matches → clear/fill/press Enter → waitForApiResponse.
**Fix:** Single generic `enterFieldValue(page, fieldId, year, value)` driven by a data table.

### 2. `waitForTimeout` everywhere
- `goToPrefererences`: 6000ms / 15000ms blind wait before opening dropdown.
- Each `enterXxx` function: 1500ms at the end (even when value was already correct).
- Navigation: 1000ms and 1500ms / 5000ms blind waits.
**Fix:** Replace with `waitForSelector(".loading-modal", detached)`,
`waitForElementVisible`, and `waitForApiResponse` from PlaywrightTestHelpers.

### 3. `page.pause()` in `clearCompanies`
Debugging artifact — hangs CI. **Fix:** Removed.

### 4. `await JSON.parse(...)` — unnecessary await
`JSON.parse` is synchronous. **Fix:** Remove `await`.

### 5. `await expect(...)` — unnecessary await
Playwright `expect` assertions are synchronous. **Fix:** Remove `await`.

### 6. Redundant `let myData = resultArray`
`myData` was never used differently from `resultArray`. **Fix:** Removed.

### 7. Typo in function name `goToPrefererences`
**Fix:** Renamed to `goToFinancialData`.

### 8. `Promise.all` with 3 elements discarding 2nd response
The main Promise.all captured `find_compare_company` + `graphql` + click, but
`graphql` response was never used. **Fix:** Only wait for the one response we need
(`find_compare_company`); the `graphql` call completes as a side effect.

### 9. Missing null guard on `entity2023`
If no data for year 2023, the `toEqual` assertions would throw confusingly.
**Fix:** Added `expect(entity2023).toBeDefined()` before field assertions.

## Files Modified
- `e2e/tests/preference/FinancingData/compare-company.spec.ts`
