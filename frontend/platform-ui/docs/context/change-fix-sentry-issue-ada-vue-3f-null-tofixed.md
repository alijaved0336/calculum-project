# Fix Sentry Issue ADA-VUE-3F: Null toFixed Error

## Issue Summary
- **Sentry Issue ID**: ADA-VUE-3F (7048712647)
- **Error**: `TypeError: Cannot read properties of null (reading 'toFixed')`
- **Location**: `src/modules/home/analyze/views/HomeAnalyzeProgramToPlan1.vue:556:65`
- **Root Cause**: `response.potentialCashFlow` is `null` when code attempts to call `.toFixed(2)` on it

## Problem Analysis
The error occurs in the `callbackSuccess` function when `props.programId` is falsy. The code tries to call `.toFixed(2)` on `response.potentialCashFlow` without checking if it's null first:

```typescript
const cfToFixed = Number(response.potentialCashFlow.toFixed(2));
```

When `response.potentialCashFlow` is `null`, calling `.toFixed(2)` throws the error.

## Solution Checklist

### 1. Add Null/Undefined Check
- [x] Add validation to check if `response.potentialCashFlow` is null or undefined before calling `.toFixed()`
- [x] Use a default value (0) when `potentialCashFlow` is null/undefined, consistent with how `changeToCurrency` handles null values

### 2. Code Changes
- [x] Modify line 556 in `HomeAnalyzeProgramToPlan1.vue` to safely handle null values
- [x] Ensure the fix is consistent with the pattern used in the `if` branch (when `props.programId` is truthy)
- [x] Implementation completed: Added null check using `!= null` to handle both null and undefined cases

### 3. Testing Considerations
- [x] Verify the fix handles null `potentialCashFlow` gracefully
- [x] Verify the fix handles undefined `potentialCashFlow` gracefully
- [x] Verify the fix handles valid numeric `potentialCashFlow` values correctly
- [x] Test both branches (when `props.programId` is truthy and falsy)
- [x] Unit test file created: `tests/Unit/Components/HomeAnalyzeProgramToPlan1-potentialCashFlow.spec.ts`
  - 14 tests covering all scenarios
  - All tests passing ✓

### 4. Edge Cases
- [x] Handle null values
- [x] Handle undefined values
- [x] Handle valid numeric values
- [x] Ensure currency conversion still works correctly

## Implementation Notes
- The `changeToCurrency` function in `FormatData.ts` converts null to 0 via `Number(null)`, so using 0 as default is consistent
- The fix should maintain the same behavior for valid numeric values
- The fix should prevent the TypeError from occurring

