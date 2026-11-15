# Checklist: AdaBot Cash Discount Conversion Test Refactoring

## Date: 2024-12-19

## Objective
Refactor the test `adabot-cash-discount-conversion-rabc-feature-8919-test-8957.spec.ts` to use PlaywrightTestHelpers and remove old patterns.

## Required Changes

### 1. Helper Imports
- [x] Add PlaywrightTestHelpers imports
- [x] Import functions: `safePromiseAll`, `waitForMultipleApiResponses`, `waitForElementVisible`, `waitForElementAttached`, `logOperation`, `safeOperation`

### 2. Remove `waitForTimeout()`
- [x] Replace `page.waitForTimeout(12000)` on line 107 with specific element or API waits

### 3. Replace direct `Promise.all()`
- [x] Lines 51-62: Replace with `waitForMultipleApiResponses()` and `safePromiseAll()`
- [x] Lines 92-104: Replace with `waitForMultipleApiResponses()` and `safeOperation()`

### 4. Improve element waits
- [x] Replace direct `.waitFor({ state: "visible" })` with `waitForElementVisible()` or `waitForElementAttached()`
- [x] Apply to all element waits (element101, element102, element103, element104, elementWith, element201, element202, element203)

### 5. Add structured logging
- [x] Add `logOperation()` at key points in the flow
- [x] Keep existing console.log but enhance with logOperation

### 6. Wrap critical operations
- [x] Use `safeOperation()` for clicks and critical navigation
- [x] Use `ensurePageActive()` before important operations

### 7. Validations
- [x] Verify no `waitForTimeout()` remain in the code
- [x] Verify all critical operations use helpers
- [x] Verify API waits use `waitForMultipleApiResponses()`

## Edge Cases to Consider
- Long timeouts on some elements (25000ms) - keep them but use helpers
- Multiple sequential clicks - ensure each one waits for the previous to complete
- Mathematical calculation validation - maintain existing logic

## Execution
- [x] Run test in `--headed` mode after refactoring
- [x] Fix errors found
- [x] Ensure test passes successfully

