# E2E Test Update: Tree Family Card

## Objective
Update the E2E test `tree-family-card.spec.ts` to work with the new grid-based layout of the Corporate Tree cards, which now uses CSS Grid instead of the previous column-based layout.

## Context
The Corporate Tree UI was recently refactored to improve the layout distribution:
- **Old Structure**: Used Bootstrap columns (`.col-5`, `.col-4`) with flex layout
- **New Structure**: Uses CSS Grid (`.tree-card-grid`) with `.grid-cell` elements and vertically centered spend alias

## Changes Required

### 1. Parent Card Selectors (Lines 51-85)
- [x] Parent name selector: Works (uses `.row >> nth=0 >> span >> nth=0`)
- [x] Volume selector: Update from `.text-gray-700 >> nth=0` to target the correct grid cell
- [x] Cash Flow selector: Update from `.text-gray-700 >> nth=2`
- [x] Contractual PT selector: Update from `.text-gray-700 >> nth=3`
- [x] Proposed PT selector: Update from `.text-gray-700 >> nth=4`

### 2. Supplier Card Selectors (Lines 88-122)
- [x] Supplier name selector: Works (uses `.row >> nth=0 >> span >> nth=0`)
- [x] Volume selector: Update from `.text-gray-700 >> nth=0`
- [x] Cash Flow selector: Update from `.text-gray-700 >> nth=2`
- [x] Contractual PT selector: Update from `.text-gray-700 >> nth=3`
- [x] Proposed PT selector: Update from `.text-gray-700 >> nth=4`

### 3. Spend Card Selectors (Lines 125-220)
Need to update all spend card selectors to work with new grid structure:

#### Spend 1 (Lines 127-158)
- [x] Volume: `.card-for-spend >> nth=0 >> .col-5...` → Use grid cell selector
- [x] Cash Flow: `.card-for-spend >> nth=0 >> .col-5...` → Use grid cell selector
- [x] Contractual PT: `.card-for-spend >> nth=0 >> .col-4...` → Use grid cell selector
- [x] Proposed PT: `.card-for-spend >> nth=0 >> .col-4...` → Use grid cell selector

#### Spend 2 (Lines 162-189)
- [x] Volume: `.card-for-spend >> nth=1 >> .col-5...`
- [x] Cash Flow: `.card-for-spend >> nth=1 >> .col-5...`
- [x] Contractual PT: `.card-for-spend >> nth=1 >> .col-4...`
- [x] Proposed PT: `.card-for-spend >> nth=1 >> .col-4...`

#### Spend 3 (Lines 193-220)
- [x] Volume: `.card-for-spend >> nth=2 >> .col-5...`
- [x] Cash Flow: `.card-for-spend >> nth=2 >> .col-5...`
- [x] Contractual PT: `.card-for-spend >> nth=2 >> .col-4...`
- [x] Proposed PT: `.card-for-spend >> nth=2 >> .col-4...`

## New Selector Strategy

### For Parent/Supplier Cards (using tree-card-grid):
```typescript
// Grid structure: 2 columns, each data item in a .grid-cell
.tree-family-card >> nth=X >> .tree-card-grid >> .grid-cell >> nth=Y >> span.font-weight-600
```

Where:
- Grid cells are ordered: Volume, Contractual PT, Country, Proposed PT, Cash Flow
- Each cell has label (font-weight-400) and value (font-weight-600)

### For Spend Cards (using tree-card-grid):
```typescript
// Grid structure: 2 columns (40% / 60%), data in .grid-cell elements
.card-for-spend >> nth=X >> .tree-card-grid >> .grid-cell >> nth=Y >> span.spend-details.font-weight-600
```

Grid cell order for spend cards:
1. Volume (Column 1, Row 1) - Index 0
2. Cash Flow (Column 2, Row 1) - Index 1
3. Contractual PT (Column 1, Row 2) - Index 2
4. Buying Entity (Column 2, Row 2) - Index 3 (new field)
5. Proposed PT (Column 1, Row 3) - Index 4
6. Commodity (Column 2, Row 3) - Index 5 (new field)

## Implementation Plan
1. [x] Create this checklist document
2. [x] Update Parent card selectors (lines 51-94)
3. [x] Update Supplier card selectors (lines 96-140)
4. [x] Update Spend 1 card selectors (lines 142-179)
5. [x] Update Spend 2 card selectors (lines 181-218)
6. [x] Update Spend 3 card selectors (lines 220-257)
7. [x] Verify no linter errors
8. [x] Update this document with final status

## Implementation Summary

### ✅ Completed Changes

All selectors in the E2E test `tree-family-card.spec.ts` have been successfully updated to work with the new CSS Grid layout.

#### Parent Card (Lines 51-94)
Updated selectors to target `.tree-card-grid >> .grid-cell` with correct indices:
- Volume: Grid cell index 0
- Contractual PT: Grid cell index 1
- Proposed PT: Grid cell index 3
- Cash Flow: Grid cell with `.span-2` class

#### Supplier Card (Lines 96-140)
Same structure as Parent card with updated selectors for:
- Volume, Contractual PT, Proposed PT, and Cash Flow

#### Spend Cards (Lines 142-257)
Updated all three spend cards (Spend 1, Spend 2, Spend 3) with selectors targeting:
- Volume: Grid cell index 0
- Cash Flow: Grid cell index 1
- Contractual PT: Grid cell index 2
- Proposed PT: Grid cell index 4 (skipping index 3 which is Buying Entity)

### Key Selector Patterns

**Parent/Supplier Cards:**
```typescript
.tree-family-card >> nth=X >> .tree-card-grid >> .grid-cell >> nth=Y >> span.text-sm.font-semibold.text-gray-700
```

**Spend Cards:**
```typescript
.card-for-spend >> nth=X >> .tree-card-grid >> .grid-cell >> nth=Y >> span.spend-details.font-weight-600
```

### Notes
- ✅ The excluded tag check (line 259-262) still works correctly as it targets `.excluded` class
- ✅ All expected values remain unchanged, only selectors were updated
- ✅ No linter errors detected
- ⚠️ The Cash Flow field may use skeleton loader when `programIsRecalculating` is true
- 🎯 Test is ready to run against the updated UI

### Status: ✅ **COMPLETE AND READY FOR TESTING**

---

## Refactoring with PlaywrightTestHelpers (2025-11-12)

### Objective
Refactor the test to use PlaywrightTestHelpers and remove old patterns according to Playwright rules.

### Changes Made

#### 1. Added Imports
- Imported helper functions: `waitForElementVisible`, `waitForElementAttached`, `checkMultipleElementsVisible`, `logOperation`, `safeOperation`, `ensurePageActive`

#### 2. Removal of `waitForTimeout(5000)`
- ✅ Replaced with `checkMultipleElementsVisible()` to wait for critical tree elements
- ✅ Removed generic `.org-tree-node` selector that caused strict mode violation
- ✅ Kept only specific selectors that target unique elements

#### 3. Waits Before Assertions
- ✅ Added `waitForElementVisible()` before each assertion group:
  - Parent Data: Waits for name and grid elements
  - Supplier Data: Waits for supplier name
  - Spend 1, 2, 3: Waits for volume elements before assertions
  - Excluded tag: Uses `waitForElementAttached()` for the badge

#### 4. Structured Logging
- ✅ Added `logOperation()` at:
  - Test start
  - Before waiting for tree load
  - Before each validation section (Parent, Supplier, Spend 1-3, Excluded tag)
  - When test completes successfully

#### 5. Protected Critical Operations
- ✅ `goToEntityCardEntity()` wrapped in `safeOperation()` with `ensurePageActive()`
- ✅ `goToCorporateTree()` wrapped in `safeOperation()` with `ensurePageActive()`

#### 6. Error Corrections
- ✅ Fixed strict mode violation error by removing generic `.org-tree-node` selector
- ✅ Kept only specific selectors that target unique elements

### Final Status

✅ **Refactoring Complete**
- All old patterns have been replaced
- The test uses PlaywrightTestHelpers appropriately
- Waits are specific and robust
- Logging is structured
- Critical operations are protected

⚠️ **Execution Note**
- The test was executed in headed mode
- Found and fixed a strict mode violation error
- Subsequent execution failed due to environment authentication issue (not related to the test)
- Code is ready to run when the environment is available

