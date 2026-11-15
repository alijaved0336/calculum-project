# Checklist: Fix Flaky Test - Template Delete Row Count

## Date: 2024-12-19

## Objective
Fix intermittent failure in `template-delete.spec.ts` where row count assertion fails because the UI hasn't updated after deletion.

## Problem
The test expects 0 rows after deletion, but sometimes receives 1 row. This happens because:
- The API response is awaited, but the UI update (DOM removal) may not have completed yet
- The row count is checked immediately after the API response, without waiting for the DOM to reflect the deletion

## Required Changes

### 1. Add wait for row count to be 0
- [x] After delete API response, wait for `.k-master-row` count to be 0
- [x] Use `page.waitForFunction()` to wait for the count condition
- [x] Set appropriate timeout (10000ms)

### 2. Improve deletion flow
- [x] Ensure API response is fully awaited before checking row count
- [x] Add explicit wait for DOM update after deletion
- [x] Use helper functions from PlaywrightTestHelpers if applicable

### 3. Add retry logic (if needed)
- [x] Added error handling with logging for the wait operation
- [x] Add logging to track deletion completion

## Implementation Plan
1. After line 135 (delete button click with API wait), add a wait for row count to be 0
2. Use `page.waitForFunction()` to check that `.k-master-row` count is 0
3. Then perform the assertion

## Edge Cases to Consider
- Multiple rows exist before deletion - ensure we wait for the correct count
- Network delays - use sufficient timeout
- UI animation delays - wait for actual DOM update, not just API response

## Execution
- [x] Run test in `--headed` mode multiple times to verify fix
- [x] Ensure test passes consistently
- [x] Verify no performance degradation

## Implementation Details
- Added `page.waitForFunction()` after delete button click to wait for DOM update
- The function checks that `.k-master-row` count is 0 before proceeding
- Timeout set to 10000ms to handle network and UI update delays
- Added error handling and logging for better debugging

## Result
✅ **Test fixed successfully!**
- Test executed in `--headed` mode and passed consistently
- Row count assertion now waits for DOM update before checking
- No more intermittent failures
- Execution time: ~51.3s (within acceptable range)

## Summary
The fix ensures that after deleting a template, the test waits for the UI to update (DOM removal) before asserting the row count. This prevents race conditions where the API responds but the UI hasn't updated yet.

**Key takeaway**: Always wait for DOM updates, not just API responses, when asserting UI state changes.

