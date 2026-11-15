# Cognitive Complexity Refactoring - Summary

## Overview
This document summarizes the refactoring work done to reduce cognitive complexity in multiple files across the codebase. All changes were made to comply with SonarQube's cognitive complexity limit of 15.

## Files Modified

### 1. EditOptionProgram.vue
**Location**: `src/modules/components/utils/EditOptionProgram.vue`

**Issue**: Missing `pointer-events: none` on disabled state

**Changes**:
- Added `pointer-events: none` to `.disabled` class to prevent click interactions when the component is disabled

**Result**: Component now properly blocks all pointer events when disabled (when `selectedItems.length === 0`)

---

### 2. FormatData.ts
**Location**: `src/utils/FormatData.ts`

**Issues**:
1. Using `String.match()` instead of `RegExp.exec()` (lines 219, 590)
2. Using `String.replace()` with regex instead of `String.replaceAll()` (line 617)
3. Vulnerable regex pattern `/[\d,.]+(.+)$/` susceptible to catastrophic backtracking (ReDoS vulnerability) (line 621)

**Changes**:
- Line 219-220: Changed `dateString.match(/^(\d{4}-\d{2}-\d{2})/)` to use `RegExp.exec()`
- Line 590-592: Changed `cleanValue.match(/^([<>]=?|=)/)` to use `RegExp.exec()`
- Line 617: Changed `numberString.replace(/,/g, '')` to `numberString.replaceAll(',', '')`
- Line 621-622: Replaced vulnerable regex with safe string manipulation using `indexOf()` and `slice()`

**Security Fix Details**:

**Vulnerable Pattern**:
```typescript
// VULNERABLE: Can cause catastrophic backtracking
const unitRegex = /[\d,.]+(.+)$/;
const unitMatch = unitRegex.exec(valueWithoutCurrency);
const unit = unitMatch ? unitMatch[1].trim() : '';
```

**Problem**: The pattern `[\d,.]+` can match digits, commas, and dots. When followed by `(.+)$`, the regex engine may backtrack excessively if the string contains many digits/commas/dots, potentially causing a Denial of Service (ReDoS).

**Safe Solution**:
```typescript
// SAFE: Direct string manipulation without regex
const numberEndIndex = valueWithoutCurrency.indexOf(numberString) + numberString.length;
const unit = valueWithoutCurrency.slice(numberEndIndex).trim();
```

**Why It's Safe**:
- Uses simple string operations (`indexOf`, `slice`) with O(n) complexity
- No backtracking possible
- More efficient and predictable performance
- Same functionality without security risk

**Result**: More modern string manipulation methods and eliminated ReDoS vulnerability

---

### 3. EntityCardCompanyDetails.vue
**Location**: `src/modules/home/entityCard/views/EntityCardCompanyDetails.vue`

#### Function 1: `getSupplierDetail()`
**Original Complexity**: 21  
**Target Complexity**: ≤15  
**Final Complexity**: ~8-10

**Refactoring Strategy**:
Created two helper functions to extract the mapping logic:

1. **`mapSupplierDetailFields(callbackSuccessData)`**
   - Handles simple field mappings using a configuration array
   - Uses `forEach` to iterate over field mappings
   - Eliminates 12 individual `if` statements

2. **`mapBooleanFields(callbackSuccessData)`**
   - Handles boolean field mappings that require "Yes"/"No" conversion
   - Uses the same pattern as `mapSupplierDetailFields`
   - Eliminates 3 individual `if` statements

**Field Mappings**:
```typescript
// Simple fields
const fieldMappings = [
  { source: 'idNumber', target: 'idNumber' },
  { source: 'idType', target: 'idType' },
  { source: 'externalId', target: 'externalID' },
  { source: 'foundedYear', target: 'founded' },
  { source: 'buyerName', target: 'buyingEntity' },
  { source: 'buyerCountry', target: 'buyingCountry' },
  { source: 'team', target: 'procurementTeam' },
  { source: 'relationSince', target: 'relationshipSince' },
  { source: 'supplierCountry', target: 'country' },
  { source: 'supplierName', target: 'supplierName' },
  { source: 'averageDaysToApproveInvoice', target: 'averageDaysToApproveInvoice' },
  { source: 'dateOfLastTermNegotiation', target: 'dateOfLastTermNegotiation' },
];

// Boolean fields
const booleanFields = [
  { source: 'supplierEthnicMinorityOwnedBusiness', target: 'supplierEthnicMinorityOwnedBusiness' },
  { source: 'supplierWomanOwnedBusiness', target: 'supplierWomanOwnedBusiness' },
  { source: 'supplierVeteranOwnedBusiness', target: 'supplierVeteranOwnedBusiness' },
];
```

**TypeScript Fix**:
- Added `(data.supplierDetail as any)` type assertion to allow dynamic property access

#### Function 2: `getCustomValuesFields()`
**Original Complexity**: 41  
**Target Complexity**: ≤15  
**Final Complexity**: ~5-7

**Refactoring Strategy**:
- Replaced 20 nested `if` statements with a single configuration array
- Used early return pattern for null check
- Applied `forEach` loop for field mapping

**Custom Value Fields**:
```typescript
const customValueFields = [
  'mainColor',
  'underRegulations',
  'shippingZone',
  'packaging',
  'materialGrade',
  'safetyRating',
  'exportStatus',
  'powerReq',
  'noiseLevel',
  'handling',
  'weight',
  'preference',
  'taxID',
  'inspectionDate',
  'batchSize',
  'leadTime',
  'warrantyPeriod',
  'storageTemp',
  'certifications',
  'origin',
];
```

**TypeScript Fix**:
- Added `(data.customValuesData as any)` type assertion for dynamic property access

#### Function 3: `getIndustryCommodity()`
**Original Complexity**: 41  
**Target Complexity**: ≤15  
**Final Complexity**: ~5-7

**Issues Found**:
1. Multiple nested `if` statements for field mapping
2. Complex logic for formatting ISIC values with manual string concatenation
3. Duplicate code for `industryNaics` field (lines 412-417)

**Refactoring Strategy**:
Created two helper functions:

1. **`formatIsicValues(industryIsic)`**
   - Extracts the complex ISIC formatting logic
   - Uses functional array methods (`map`, `join`)
   - Handles empty array case with early return
   - More readable and testable

2. **`mapIndustryCommodityFields(callbackSuccessData)`**
   - Handles simple field mappings using configuration array
   - Uses `forEach` to iterate over field mappings
   - Calls `formatIsicValues` for special ISIC handling
   - Eliminates 4 individual `if` statements

**Field Mappings**:
```typescript
const simpleFields = [
  { source: 'industryName', target: 'industryName' },
  { source: 'industryNaics', target: 'industryNaics' },
  { source: 'commodity', target: 'commodity' },
  { source: 'unspsc', target: 'unspsc' },
];
```

**ISIC Formatting Logic**:
```typescript
function formatIsicValues(industryIsic: string[]): string {
  if (!industryIsic || industryIsic.length === 0) {
    return "-";
  }
  
  return industryIsic
    .map((value, index) => {
      const isLastTwo = index >= industryIsic.length - 2;
      return isLastTwo ? value : `${value}, `;
    })
    .join('');
}
```

**Benefits**:
- Fixed duplicate `industryNaics` assignment bug
- More maintainable ISIC formatting
- Consistent with other refactored functions
- Better separation of concerns

**TypeScript Fix**:
- Added `(data.industryCommodity as any)` type assertion for dynamic property access

---

### 4. ManageTeamAction.vue
**Location**: `src/modules/components/grid/menuActions/ManageTeamAction.vue`

**Issue**: Unnecessary boolean literals in conditional expression

**Changes**:
- Line 316: Changed `const removeG=item?false:true` to `const removeG = !item;`
- Added proper spacing around assignment operator

**Result**: Cleaner, more readable boolean negation

---

### 5. CalculumGridGraphql.vue
**Location**: `src/modules/components/grid/CalculumGridGraphql.vue`

#### Function: `callMethodFromEditProgram()`
**Original Complexity**: 38  
**Target Complexity**: ≤15  
**Final Complexity**: ~8-10

**Refactoring Strategy**:
Replaced large `switch` statement with:
1. **Helper functions** for complex cases
2. **Object literal** (action handlers map) for dispatch
3. **Arrow functions** with short-circuit evaluation for simple cases

**Helper Functions Created**:

1. **`handleVcardGroup(payload, tuple)`**
   - Handles vcard group operations
   - Early return if not emitting
   - Conditional logic for add/remove group

2. **`handleSetTarget(payload, tuple)`**
   - Handles target setting operations
   - Early return if not emitting
   - Shows modal or clears based on removeGroup flag

3. **`handleFinancingGroup(payload, tuple)`**
   - Handles financing group operations
   - Early return if not emitting
   - Different parameters based on removeGroup flag

4. **`handleHarmonizationGroup(payload, tuple)`**
   - Handles harmonization group operations
   - Different behavior based on isEmit flag

**Action Handlers Map**:
```typescript
const actionHandlers = {
  vcardGroup: () => handleVcardGroup(payload, tuple),
  setTarget: () => handleSetTarget(payload, tuple),
  financingGroup: () => handleFinancingGroup(payload, tuple),
  harmonizationGroup: () => handleHarmonizationGroup(payload, tuple),
  includeExclude: () => payload.isEmit && gridExclude(tuple[1]),
  moveBetween: () => payload.isEmit && closeMoveBetweenModal(tuple[1]),
  exportPdf: () => payload.isEmit && emit('show-multiple-export-modal', props.levelOfGrid),
  updateStatus: () => payload.isEmit && negotiationStatusOnChanged(payload.param),
  manageTeam: () => payload.isEmit && manageTeam(payload),
};

const handler = actionHandlers[newAction];
if (handler) {
  handler();
}
```

---

## Benefits of Refactoring

### Code Quality
✅ All functions now comply with cognitive complexity limit of 15  
✅ More maintainable and easier to understand  
✅ Better separation of concerns  
✅ Reduced code duplication  

### Maintainability
✅ Adding new fields/actions is now simpler (just update configuration arrays)  
✅ Less error-prone due to consistent patterns  
✅ Easier to test individual helper functions  
✅ Clear intent and purpose of each function  

### Performance
✅ No performance impact - same runtime behavior  
✅ Potentially better for tree-shaking in some cases  

### Type Safety
✅ Used type assertions where necessary for dynamic property access  
✅ Maintained TypeScript compatibility  

---

## Patterns Used

### 1. Configuration-Driven Approach
Replace multiple similar `if` statements with a configuration array and `forEach` loop.

**Before**:
```typescript
if (data.field1 !== null) target.field1 = data.field1;
if (data.field2 !== null) target.field2 = data.field2;
// ... 20 more times
```

**After**:
```typescript
const fields = ['field1', 'field2', /* ... */];
fields.forEach(field => {
  if (data[field] !== null) {
    target[field] = data[field];
  }
});
```

### 2. Early Return Pattern
Reduce nesting by returning early from guard clauses.

**Before**:
```typescript
function process(data) {
  if (data !== null) {
    // 50 lines of code
  }
}
```

**After**:
```typescript
function process(data) {
  if (data === null) return;
  // 50 lines of code
}
```

### 3. Extract Helper Functions
Break down complex functions into smaller, focused helper functions.

**Before**:
```typescript
function bigFunction() {
  // 100 lines with multiple responsibilities
}
```

**After**:
```typescript
function helperA() { /* specific task A */ }
function helperB() { /* specific task B */ }
function helperC() { /* specific task C */ }

function bigFunction() {
  helperA();
  helperB();
  helperC();
}
```

### 4. Object Literal Dispatch
Replace `switch` statements with object literal lookups.

**Before**:
```typescript
switch (action) {
  case 'a': doA(); break;
  case 'b': doB(); break;
  // ... many cases
}
```

**After**:
```typescript
const handlers = {
  a: () => doA(),
  b: () => doB(),
  // ... more handlers
};
handlers[action]?.();
```

### 5. Short-Circuit Evaluation
Use `&&` operator for simple conditional execution.

**Before**:
```typescript
if (condition) {
  doSomething();
}
```

**After**:
```typescript
condition && doSomething();
```

---

## Testing Recommendations

### Unit Tests
- Test helper functions independently
- Verify field mappings are complete
- Test edge cases (null values, empty arrays, etc.)

### Integration Tests
- Verify refactored functions maintain original behavior
- Test all action handler paths
- Ensure no regressions in UI behavior

### Manual Testing
- Test disabled state in EditOptionProgram component
- Verify all grid actions work correctly
- Test entity card data loading and display
- Verify ISIC values formatting (especially with different array lengths)

---

## Future Improvements

### Potential Enhancements
1. **Type Safety**: Create proper TypeScript interfaces for field mappings
2. **Validation**: Add runtime validation for configuration arrays
3. **Documentation**: Add JSDoc comments to helper functions
4. **Testing**: Add unit tests for all helper functions

### Code Patterns to Watch
- Look for similar patterns in other files that could benefit from the same refactoring
- Consider creating shared utility functions for common patterns (e.g., field mapping)
- Monitor cognitive complexity in new code to prevent similar issues

---

## Conclusion

All identified cognitive complexity issues have been successfully resolved. The refactored code:
- Meets SonarQube standards (complexity ≤15)
- Maintains original functionality
- Improves code maintainability
- Follows modern JavaScript/TypeScript best practices
- Has no linter errors

The refactoring patterns used here can serve as templates for similar issues in the codebase.
