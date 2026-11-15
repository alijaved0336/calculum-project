# Checklist: Refactoring paymentCycleFloatUi.spec.ts

## Analysis of the Current Test

**File:** `e2e/tests/z-last-tests/04-sf/paymentCycleFloatUi.spec.ts`

### Problems Identified:
1. ❌ Use of `waitForTimeout(5000)` on lines 52 and 64
2. ❌ Does not use helper functions from `PlaywrightTestHelpers.ts`
3. ❌ Does not have structured logging with `logOperation()`
4. ❌ Critical operations are not wrapped in `safeOperation()`
5. ❌ Does not verify that the page is active before operations
6. ❌ Non-specific waits instead of waits for elements

## Planned Changes

### 1. Replace `waitForTimeout()` with specific waits

- Line 52: Replace with `waitForElementVisible()` or `waitForElementAttached()` to wait for specific elements

- Line 64: Replace with wait for a specific element after a click

### 2. Add PlaywrightTestHelpers imports

- Import: `waitForElementVisible`, `waitForElementAttached`, `safeOperation`, `logOperation`, `ensurePageActive`

### 3. Wrap critical operations

- Wrap clicks and navigation in `safeOperation()`

- Add `ensurePageActive()` before critical operations

### 4. Add structured logging

- Add `logOperation()` at key points in the flow

- Start of each test
- Before and after important operations

### 5. Improve element waits

- Replace timeout waits with Specific element waits

- Use `waitForElementVisible()` for elements that need to be visible

- Use `waitForElementAttached()` for elements that only need to be in the DOM

### 6. Improved Validations

- Add explicit validations with appropriate helpers

## Additional Improvements Made (Current Review)

### 1. ✅ Replaced `page.waitForResponse` with a helper

- Replaced direct use of `page.waitForResponse` with the `waitForApiResponse` helper

- Improves error handling and code consistency

- Improved URL pattern to a more specific regular expression: `/\/api\/entity-card\/entity\/.*\/all/` instead of "/all"

### 2. ✅ Improved click behavior for waiting for visible elements

- All clicks now wait for elements to be visible before interacting

- Click on sidebar program (lines 72-78): waits for visibility before clicking

- Click on SHOW button (lines 103-109): waits for visibility before clicking

### 3. ✅ Structure Verification

- All clicks use `waitForElementVisible` before interacting

- All critical operations are wrapped in `safeOperation`

- Timeouts are reasonable (5000ms for normal operations, 10000ms for navigation)

## Post-Refactoring Validations

- [x] No `waitForTimeout()` in the code

- [x] All critical operations use `safeOperation()` or are protected

- [x] Element waits use `waitForElementVisible()` or `waitForElementAttached()`

- [x] `logOperation()` was added at key points in the flow

- [x] No direct use of `page.waitForResponse` (uses `waitForApiResponse` helper)
- [x] All clicks wait for elements to be visible before interacting
- [ ] Test passes successfully in `--headed` mode (running)
- [ ] No timeout errors or missing elements (pending verification)