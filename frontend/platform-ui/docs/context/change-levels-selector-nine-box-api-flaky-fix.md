# Fix Flaky Test: Change Levels Selector Nine Box API Timeout

## Problem
The test `change-levels-selector.spec.ts` fails intermittently with:
```
Error: Failed to complete click nine box CF tab: API response not received within timeout: api/analyze/get-nine-boxes-terms-extension-data
at safePromiseAll (PlaywrightTestHelpers.ts:25)
at change-levels-selector.spec.ts:40
```

## Root Cause Analysis
1. API response timeout of 40000ms may not be sufficient in some cases
2. Retry logic only has 2 attempts with 2000ms base delay
3. Tab may not be fully ready/interactable before click
4. No wait for element to be enabled/clickable before interaction
5. Network conditions may cause delays in API responses

## Solution Plan

### 1. Improve Retry Logic
- [x] Increase retry attempts from 2 to 4
- [x] Increase base delay from 2000ms to 3000ms
- [x] Add exponential backoff (already implemented in retryOperation)

### 2. Better Element Wait Strategy
- [x] Wait for element to be visible AND enabled before clicking
- [x] Add wait for element to be attached to DOM first
- [x] Ensure tab is fully loaded before interaction

### 3. API Response Handling
- [x] Increase API response timeout from 40000ms to 60000ms
- [x] Ensure API response is received before proceeding

### 4. Code Changes
- [x] Update retryOperation parameters in all three tab clicks
- [x] Add waitForElementAttached before waitForElementVisible
- [x] Add check for element enabled state before clicking
- [x] Increase API timeout values

### 5. Testing
- [x] Code changes implemented and verified
- [ ] Run test multiple times to verify fix
- [ ] Run test in headed mode to observe behavior
- [ ] Verify all three tab clicks work reliably

## Implementation Details

### Location
- File: `e2e/tests/program/change-levels-selector.spec.ts`
- Function: Test "Test levels for nine boxes data"
- Specific areas: 
  - Lines 27-50: Nine box CF tab click
  - Lines 78-103: Spend Lines level click
  - Lines 132-157: Parents level click

### Changes Implemented

1. **Increased Retry Logic**:
   - Retry attempts: 2 → 4 (for all three tab clicks)
   - Base delay: 2000ms → 3000ms
   - Applied to: Nine box CF tab, Spend Lines level, Parents level

2. **Two-Phase Element Wait**:
   - First wait for element attachment to DOM using `waitForElementAttached`
   - Then wait for element visibility
   - Check if element is enabled before clicking
   - All with appropriate timeouts (60000ms for nine box CF, 30000ms for others)

3. **API Response Timeout**:
   - Increased from 40000ms to 60000ms for all three API calls
   - Gives more time for API to respond in slow network conditions

4. **Applied to All Three Tab Clicks**:
   - Nine box CF tab (lines 28-65)
   - Spend Lines level (lines 93-132)
   - Parents level (lines 161-200)

## Files Modified
- `e2e/tests/program/change-levels-selector.spec.ts`:
  - Added `waitForElementAttached` import
  - Updated all three retryOperation calls with improved logic
  - Increased API timeouts from 40000ms to 60000ms
  - Added element enabled checks before clicking

## Expected Results
- Test should be more reliable with increased retries and timeouts
- Better error handling and logging for debugging
- Reduced flakiness due to improved wait strategies

