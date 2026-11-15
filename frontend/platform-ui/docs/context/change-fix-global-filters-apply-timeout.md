# Fix: Global Filters Apply Filters Timeout Issue

## Problem
Test timeout of 120000ms exceeded when calling `GlobalFiltersUtils.applyFilters()`. The `page.waitForResponse` is waiting for a `/test_filter` endpoint response that never arrives or times out.

## Root Causes Identified
1. **Missing timeout**: `waitForResponse` doesn't have an explicit timeout, relying on test timeout (120000ms)
2. **Button state**: The "Show Results" button might be disabled when clicked (`filtersToBeApplied.filters.length === 0`)
3. **Response timing**: The response might come before `waitForResponse` is set up, or might fail (not ok())
4. **No validation**: No check if button is enabled/visible before clicking

## Solution Plan

### 1. Improve `applyFilters` function in `GlobalFiltersUtils.ts`
   - [x] Add explicit timeout to `waitForResponse` (e.g., 30000ms)
   - [x] Wait for button to be enabled before clicking
   - [x] Wait for button to be visible before clicking
   - [x] Add better error handling and logging
   - [x] Verify filters are actually selected before applying

### 2. Add defensive checks
   - [x] Check if dialog is visible (via button visibility check)
   - [x] Check if button exists and is enabled
   - [ ] Add retry logic if needed (not implemented, may add if needed)

### 3. Improve error messages
   - [x] Add descriptive error messages for debugging
   - [x] Log button state before clicking
   - [x] Log response status if received but failed (via waitForResponse ok() check)

### 4. Additional improvements
   - [x] Added timeout to `waitForFilterValidationResponse` method
   - [x] Improved `clickShowResult` method with similar checks

## Implementation Details

### Changes to `e2e/tests/utils/GlobalFiltersUtils.ts`
- Modify `applyFilters` method to:
  1. Wait for button to be visible and enabled
  2. Add timeout to `waitForResponse` (30000ms)
  3. Add error handling for failed responses
  4. Add logging for debugging

## Expected Outcome
- Test should complete successfully within timeout
- Better error messages if button is disabled or response fails
- More reliable test execution

## Implementation Summary

### Changes Made

1. **`applyFilters` method** (`e2e/tests/utils/GlobalFiltersUtils.ts`):
   - Added explicit timeout (30000ms) to `waitForResponse`
   - Added wait for button visibility before clicking
   - Added check for button enabled state
   - Added descriptive error message if button is disabled
   - Added logging for debugging

2. **`waitForFilterValidationResponse` method**:
   - Added explicit timeout (30000ms) to `waitForResponse`

3. **`clickShowResult` method**:
   - Added wait for button visibility
   - Added check for button enabled state
   - Added explicit timeout (30000ms) to `waitForResponse`
   - Added error handling if button is disabled

### Key Improvements
- **Timeout**: Reduced from 120000ms (test timeout) to 30000ms for API response wait
- **Reliability**: Button state validation prevents clicking disabled buttons
- **Debugging**: Better logging and error messages
- **Consistency**: All methods that wait for `/test_filter` response now have timeouts

### Testing
The test should now:
1. Fail faster (30s instead of 120s) if the response doesn't come
2. Provide clear error if button is disabled
3. Be more reliable by ensuring button is ready before clicking

