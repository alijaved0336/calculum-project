# Change: SCF Boolean Columns Translation

## Context
The two new SCF-related columns (`onSCF` and `scfAccepted`) in the grids are currently displaying raw boolean values ("true"/"false") instead of the ADA standard format for booleans ("Yes"/"No").

## Problem
- Column `onSCF` (Using SCF): Shows "true"/"false" instead of "Yes"/"No"
- Column `scfAccepted` (SCF Accepted): Shows "true"/"false" instead of "Yes"/"No"
- This is inconsistent with other boolean columns in ADA that use the standard "Yes"/"No" format

## Current Implementation

### Column Definitions (globalColumns.ts)

**Lines 802-814: `onSCF` column**
```typescript
export const onSCF = [
  {
    field: "onSCF",
    title: translate.t("home.analyze.table.usingSCF"),
    width: "100px",
    allowHide: true,
    hidden: false,
    sortable: true,
    filter: "text",
    resizable: true,
    className: "text-center",
  }
];
```

**Lines 816-831: `scfAccepted` column**
```typescript
export const scfAccepted = [
  {
    field: "scfAccepted",
    title: translate.t("global.scfAccepted"),
    width: "120px",
    allowHide: true,
    hidden: false,
    sortable: true,
    filter: "boolean",
    resizable: true,
    className: "text-center",
    aggregates: ["count"],
    footerCell: "customAggregateFooterCell",
    groupFooterCell: "customAggregateGroupFooterCell",
  }
];
```

**Issue:** Neither column has a `cell` property defined, so they display raw boolean values.

## Solution

### Option 1: Use Existing Boolean Cell Template (Recommended)
Look for existing cell templates that handle boolean values and apply them to these columns.

### Option 2: Create New Cell Template
If no suitable template exists, create a new cell component that translates boolean values to "Yes"/"No".

## Investigation Needed

### 1. Find Existing Boolean Cell Templates
Search for existing cell templates that handle boolean values:
- Look in grid components for cell templates
- Check if there's a `booleanCell` or similar template
- Review how other boolean columns (like `isSME`, `isPilot`, `disabled`) handle display

### 2. Check Translation Keys
Verify that translation keys exist for "Yes" and "No":
- `global.yes`
- `global.no`

## Implementation Plan

### Step 1: Research Existing Boolean Cells
- Search for boolean cell templates in the codebase
- Identify how `isSME` column displays boolean values (line 512-526 in globalColumns.ts)
- Check if there's a reusable cell component

### Step 2: Apply Cell Template to SCF Columns
- Add `cell` property to `onSCF` column definition
- Add `cell` property to `scfAccepted` column definition (if not already using one)
- Ensure the cell template translates `true` → "Yes", `false` → "No", `null` → "-"

### Step 3: Verify Translation Keys
- Confirm `global.yes` and `global.no` exist in translation files
- If not, add them to `en.json` and other language files

### Step 4: Test in All Grids
Test the changes in all grids that use these columns:
- Analyze module grids
- Plan module grids
- Entity Card grids
- Categorize module grids

## Files to Modify

### Primary File
- `src/modules/home/data/globalColumns.ts` (lines 802-831)

### Potential Additional Files
- Grid cell template component (if creating new one)
- Translation files (if keys don't exist)

## Expected Behavior

### Before
| onSCF | scfAccepted |
|-------|-------------|
| true  | true        |
| false | false       |
| null  | null        |

### After
| Using SCF | SCF Accepted |
|-----------|--------------|
| Yes       | Yes          |
| No        | No           |
| -         | -            |

## Implementation Summary

### Changes Made

#### 1. Created New Cell Component: `BooleanYesNoColumn.vue`

**File:** `src/modules/components/grid/columns/BooleanYesNoColumn.vue`

**Purpose:** Generic cell component to display boolean values as "Yes"/"No" in grids

**Implementation:**
```vue
<template>
  <td class="text-center">
    <span v-if="dataItem[field] === true">{{ $t('global.yes') }}</span>
    <span v-else-if="dataItem[field] === false">{{ $t('global.no') }}</span>
    <span v-else>-</span>
  </td>
</template>
```

**Logic:**
- `true` → Displays "Yes" (using `global.yes` translation key)
- `false` → Displays "No" (using `global.no` translation key)
- `null`/`undefined` → Displays "-"

#### 2. Updated `onSCF` Column Definition

**File:** `src/modules/home/data/globalColumns.ts` (lines 802-814)

**Change:** Added `cell: "booleanYesNoColumn"` property

**Before:**
```typescript
export const onSCF = [
  {
    field: "onSCF",
    title: translate.t("home.analyze.table.usingSCF"),
    width: "100px",
    allowHide: true,
    hidden: false,
    sortable: true,
    filter: "text",
    resizable: true,
    className: "text-center",
  }
];
```

**After:**
```typescript
export const onSCF = [
  {
    field: "onSCF",
    title: translate.t("home.analyze.table.usingSCF"),
    width: "100px",
    allowHide: true,
    hidden: false,
    sortable: true,
    filter: "text",
    resizable: true,
    className: "text-center",
    cell: "booleanYesNoColumn"  // ← ADDED
  }
];
```

#### 3. Updated `scfAccepted` Column Definition

**File:** `src/modules/home/data/globalColumns.ts` (lines 816-831)

**Change:** Added `cell: "booleanYesNoColumn"` property

**Before:**
```typescript
export const scfAccepted = [
  {
    field: "scfAccepted",
    title: translate.t("global.scfAccepted"),
    width: "120px",
    allowHide: true,
    hidden: false,
    sortable: true,
    filter: "boolean",
    resizable: true,
    className: "text-center",
    aggregates: ["count"],
    footerCell: "customAggregateFooterCell",
    groupFooterCell: "customAggregateGroupFooterCell",
  }
];
```

**After:**
```typescript
export const scfAccepted = [
  {
    field: "scfAccepted",
    title: translate.t("global.scfAccepted"),
    width: "120px",
    allowHide: true,
    hidden: false,
    sortable: true,
    filter: "boolean",
    resizable: true,
    className: "text-center",
    cell: "booleanYesNoColumn",  // ← ADDED
    aggregates: ["count"],
    footerCell: "customAggregateFooterCell",
    groupFooterCell: "customAggregateGroupFooterCell",
  }
];
```

### Translation Keys Used

**Existing keys from `en.json`:**
- `global.yes` = "Yes" (line 2445)
- `global.no` = "No" (line 1844)

No new translation keys needed.

### Files Modified

1. **Created:** `src/modules/components/grid/columns/BooleanYesNoColumn.vue`
2. **Modified:** `src/modules/home/data/globalColumns.ts` (lines 802-831)

### Grids Affected

These columns are used in multiple modules via imports from `globalColumns.ts`:
- **Analyze module:** `src/modules/home/analyze/data/graphqlColums.ts`
- **Plan module:** `src/modules/home/plan/data/graphqlColumns.ts`
- **Entity Card module:** Indirectly through Analyze/Plan grids
- **Categorize module:** `src/modules/home/categorize/data/columns.ts`
- **9 Boxes module:** `src/modules/home/analyze/data/9boxesGraphQlColumns.ts`

All grids that include these columns will now display "Yes"/"No" instead of "true"/"false".

## Testing Checklist
- [ ] `onSCF` column shows "Yes" when value is `true`
- [ ] `onSCF` column shows "No" when value is `false`
- [ ] `onSCF` column shows "-" when value is `null`
- [ ] `scfAccepted` column shows "Yes" when value is `true`
- [ ] `scfAccepted` column shows "No" when value is `false`
- [ ] `scfAccepted` column shows "-" when value is `null`
- [ ] Columns display correctly in all grid views (Analyze, Plan, Entity Card, Categorize)
- [ ] Sorting still works correctly
- [ ] Filtering still works correctly
- [ ] Footer aggregates still work (for `scfAccepted`)
- [ ] Grid component properly registers `booleanYesNoColumn` cell template

## Notes
- The `scfAccepted` column already has footer cells defined (`customAggregateFooterCell`, `customAggregateGroupFooterCell`), which are preserved
- The `onSCF` column has `filter: "text"` while `scfAccepted` has `filter: "boolean"` - this difference is maintained
- Both columns are used in multiple modules (Analyze, Plan, Entity Card, Categorize), so the change affects all of them
- The new `BooleanYesNoColumn` component is reusable for any future boolean columns that need "Yes"/"No" display
- The component uses strict equality checks (`===`) to handle `true`, `false`, and `null`/`undefined` values correctly

## Grid Component Registration

### Files Modified for Component Registration

#### 1. CalculumChildGrid.vue

**Import added (line 650):**
```typescript
import BooleanYesNoColumn from './columns/BooleanYesNoColumn.vue'
```

**Component registered (line 683):**
```typescript
components: {
  // ... other components
  BooleanYesNoColumn,
  // ... other components
}
```

**Template added (after line 609):**
```vue
<template #booleanYesNoColumn="{ props }">
  <BooleanYesNoColumn
    v-if="props.rowType !== 'groupHeader'"
    :data-item="props.dataItem"
    :field="props.field"
  />
</template>
```

#### 2. CalculumGridGraphql.vue

**Import added (line 975):**
```typescript
import BooleanYesNoColumn from "./columns/BooleanYesNoColumn.vue";
```

**Component registered (line 1051):**
```typescript
components: {
  // ... other components
  BooleanYesNoColumn,
  // ... other components
}
```

**Template added (after line 778):**
```vue
<template #booleanYesNoColumn="{ props }">
  <BooleanYesNoColumn v-if="props.rowType !== 'groupHeader'" :data-item="props.dataItem" :field="props.field" />
</template>
```

### Summary of All Files Modified

1. **Created:** `src/modules/components/grid/columns/BooleanYesNoColumn.vue`
2. **Modified:** `src/modules/home/data/globalColumns.ts` (lines 802-831)
3. **Modified:** `src/modules/components/grid/CalculumChildGrid.vue` (import, component, template)
4. **Modified:** `src/modules/components/grid/CalculumGridGraphql.vue` (import, component, template)

### Linter Status

- ✅ No critical linter errors introduced
- ⚠️ 2 pre-existing formatting warnings in `CalculumChildGrid.vue` (unrelated to changes)

The component is now fully integrated and ready to use in all grids.
