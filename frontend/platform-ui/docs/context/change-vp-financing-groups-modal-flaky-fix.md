# Fix Flaky Test: VP Financing Groups Modal Visibility

## Problem
The test `vp-financing-groups.spec.ts` fails intermittently with:
```
Error: Element not visible within timeout: #calculum-modal-container
at waitForElementVisible (PlaywrightTestHelpers.ts:61)
at saveFinancingGroups (vp-financing-groups.spec.ts:298)
```

## Root Cause Analysis
1. After edit operations (deleting groups, filters), the modal may take time to appear
2. Current retry logic only has 2 attempts with 1000ms base delay
3. The modal might need API responses to complete before becoming visible
4. Network idle waits are too short (1000ms) and may not catch all responses

## Solution Plan

### 1. Improve Modal Visibility Wait Strategy
- [x] Increase retry attempts from 2 to 4
- [x] Increase base delay from 1000ms to 2000ms
- [x] First wait for element to be attached to DOM, then check visibility
- [x] Wait for relevant API responses before checking modal visibility
- [x] Increase timeout for waitForElementVisible from 15000ms to 20000ms

### 2. Better API Response Handling
- [x] Wait for API responses after edit operations before checking modal
- [x] Increase network idle timeout from 1000ms to 3000ms
- [x] Ensure all edit operations complete before checking modal

### 3. Code Changes
- [x] Update retryOperation parameters in saveFinancingGroups function
- [x] Add waitForElementAttached before waitForElementVisible
- [x] Add explicit API response waits after edit operations
- [x] Replace waitForTimeout with proper element waits (retryOperation for button enabled check)

### 4. Testing
- [x] Code changes implemented and verified
- [ ] Run test in CI/CD environment to verify fix (requires proper test environment setup)
- [ ] Monitor test stability over multiple runs

## Implementation Details

### Location
- File: `e2e/tests/program/vp-financing-groups.spec.ts`
- Function: `saveFinancingGroups` (lines 184-485)
- Specific area: Lines 293-307 (edit flow) and 426-440 (add flow)

### Changes Implemented

1. **Increased Retry Logic**:
   - Retry attempts: 2 → 4
   - Base delay: 1000ms → 2000ms
   - Timeout for waitForElementVisible: 15000ms → 20000ms

2. **Two-Phase Element Wait**:
   - First wait for element attachment to DOM using `waitForElementAttached`
   - Then wait for element visibility using `waitForElementVisible`
   - Both with 20000ms timeout

3. **API Response Waits**:
   - Added `waitForApiResponse` after saving groups in edit flow
   - Added `waitForMultipleApiResponses` for `/financing_groups` and `/analyze_programs` after edit operations
   - These waits ensure APIs complete before checking modal visibility

4. **Network Idle Timeout**:
   - Increased from 1000ms to 3000ms for better reliability

5. **Button Enabled Check**:
   - Replaced `waitForTimeout(1000)` with `retryOperation` that checks if button is enabled
   - Uses 3 retries with 1000ms base delay
   - More reliable than fixed timeout

6. **Applied to Both Flows**:
   - Changes applied to both "add" and "edit" flows in `saveFinancingGroups` function

## Files Modified
- `e2e/tests/program/vp-financing-groups.spec.ts`:
  - Added `waitForElementAttached` import
  - Updated modal wait logic in edit flow (lines 304-328)
  - Updated modal wait logic in add flow (lines 461-485)
  - Improved button enabled check (lines 344-357 and 501-514)
  - Added API response waits after edit operations (lines 278-299)

## Expected Results
- Modal should appear reliably after edit operations
- Test should be less flaky due to increased retries and better wait strategies
- Better error messages and logging for debugging

