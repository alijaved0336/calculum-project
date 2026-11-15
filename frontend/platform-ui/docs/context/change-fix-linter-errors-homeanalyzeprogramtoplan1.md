# Fix Linter Errors in HomeAnalyzeProgramToPlan1.vue

## Issues Found

### Critical Errors (16 errors)
- **Lines 695, 698, 701, 703, 709, 711, 719, 721, 729, 731, 737, 739, 746, 748**: Unexpected side effects in computed function
  - The `messageError` computed property is modifying reactive state (`formValidation`) which violates Vue's computed property rules
  - Computed properties should be pure functions that only return values

### Warnings (3 warnings)
- **Line 222**: Unused variable `spendFileVersionPlansAmount`
- **Line 682**: Unnecessary boolean literal in conditional expression (`props.planId ? true : false`)
- **Line 691**: Cognitive complexity too high (19 vs 15 allowed)

## Solution Checklist

### 1. Fix Side Effects in Computed Property
- [x] Refactor `messageError` computed to be pure (only return validation result)
- [x] Create a separate method `updateFormValidation()` to update formValidation state
- [x] Use a watcher or call the method when needed instead of modifying state in computed

### 2. Fix Minor Issues
- [x] Remove unused variable `spendFileVersionPlansAmount` from destructuring
- [x] Simplify boolean expression on line 682: `props.planId ? true : false` → `!!props.planId`
- [x] Consider breaking down `messageError` computed to reduce cognitive complexity

### 3. Implementation Strategy
- [x] Keep the computed property for validation result calculation only
- [x] Create a method that updates formValidation based on validation results
- [x] Call the validation update method in appropriate places (formValidator, watchers, etc.)

## Implementation Summary

### Changes Made:
1. **Removed unused variable**: Removed `spendFileVersionPlansAmount` from destructuring (line 222)
2. **Simplified boolean expression**: Changed `props.planId ? true : false` to `!!props.planId` (line 682)
3. **Refactored computed property**: Made `messageError` a pure computed that only calculates validation result without side effects
4. **Created updateFormValidation method**: Separated validation state updates into a dedicated method
5. **Simplified computed logic**: Used array-based validation checks to reduce cognitive complexity and eliminate duplicate code blocks

### Result:
- All 16 critical errors (side effects in computed) fixed
- All 3 warnings fixed
- Code is now compliant with Vue best practices
- Validation logic is cleaner and more maintainable

