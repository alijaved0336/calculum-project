# Toggle Exclude/Include Filter Implementation

## Summary
Implemented functionality for the "Hide Exclude" / "Show Exclude" button in `EditOptionProgram.vue` to toggle a filter on the `disabled` field, allowing users to show or hide excluded items in the grid.

## Problem
The `toggleExcludeInclude` function only changed the button text between "Hide Exclude" and "Show Exclude" but didn't apply any filter to the grid data.

## Solution Approach
Used Vue's **provide/inject** pattern to allow `EditOptionProgram` (grandchild) to communicate directly with `ListsCFEdit` (grandparent) without needing `HomeAnalyzeProgramList` as an intermediary.

## Changes Applied

### File 1: `src/modules/components/utils/EditOptionProgram.vue`

#### 1. Updated imports (Line 11)
```typescript
import { defineComponent, PropType, reactive, toRefs, computed, inject } from "vue";
```

**Added:** `inject` to receive the filter function from parent

#### 2. Injected filter function (Line 27)
```typescript
const applyDisabledFilter = inject<((value: string | null) => void) | undefined>('applyDisabledFilter');
```

**Purpose:** Receives the `applyDisabledFilter` function provided by `ListsCFEdit`

#### 3. Updated toggleExcludeInclude function (Lines 33-41)
```typescript
function toggleExcludeInclude() {
  const isHiding = data.textIncludeExclude === "Hide Exclude";
  data.textIncludeExclude = isHiding ? "Show Exclude" : "Hide Exclude";
  
  // Apply filter: "No" to hide excluded items, null to show all
  if (applyDisabledFilter) {
    applyDisabledFilter(isHiding ? "No" : null);
  }
}
```

**Logic:**
- When button shows "Hide Exclude" → User clicks → Apply filter `disabled = "No"` (hide excluded)
- When button shows "Show Exclude" → User clicks → Remove filter (show all)

### File 2: `src/modules/home/analyze/views/ListsCFEdit.vue`

#### 1. Updated imports (Line 304)
```typescript
import {
  computed,
  defineComponent,
  onMounted,
  provide,        // NEW
  reactive,
  ref,
  toRefs,
  watch
} from "vue";
```

**Added:** `provide` to share filter function with child components

#### 2. Created applyDisabledFilter function (Lines 2359-2394)
```typescript
/**
 * Apply or remove filter on disabled field to show/hide excluded items
 * @param value - "No" to hide excluded items, null to show all items
 */
function applyDisabledFilter(value: string | null) {
  let currentFilter = data.filterForPatch || { logic: "and", filters: [] };
  
  // Ensure filters array exists
  if (!currentFilter.filters) {
    currentFilter.filters = [];
  }
  
  // Remove existing disabled filter
  currentFilter.filters = currentFilter.filters.filter(
    (f: any) => f.field !== "disabled"
  );
  
  // Add new disabled filter if value is provided
  if (value !== null) {
    currentFilter.filters.push({
      field: "disabled",
      operator: "eq",
      value: value
    });
  }
  
  // Apply filter (keep current sort)
  const currentSort = data.entityLevelTabSelected === ENTITY_LEVEL.SPEND_LINES 
    ? filterSettings.sortSpends 
    : data.entityLevelTabSelected === ENTITY_LEVEL.SUPPLIERS 
      ? filterSettings.sortSuppliers 
      : filterSettings.sortParents;
  
  dataChange(currentFilter, currentSort);
}
```

**Features:**
- Preserves existing filters (doesn't overwrite them)
- Removes only the `disabled` filter when toggling off
- Maintains current sort order
- Works with all entity levels (Spends, Suppliers, Parents)

#### 3. Provided function to child components (Line 2397)
```typescript
provide('applyDisabledFilter', applyDisabledFilter);
```

**Purpose:** Makes the filter function available to all descendant components via inject

## Data Flow

```
User clicks "Hide Exclude" button
         ↓
EditOptionProgram.toggleExcludeInclude()
         ↓
Calls injected applyDisabledFilter("No")
         ↓
ListsCFEdit.applyDisabledFilter("No")
         ↓
Creates/updates filter: { field: "disabled", operator: "eq", value: "No" }
         ↓
Calls dataChange(filter, sort)
         ↓
Updates filterSettings for current entity level
         ↓
Fetches filtered data from API
         ↓
Grid displays only non-excluded items
         ↓
Button text changes to "Show Exclude"
```

## Filter Structure

### When Hiding Excluded Items (disabled = "No")
```json
{
  "logic": "and",
  "filters": [
    {
      "field": "disabled",
      "operator": "eq",
      "value": "No"
    }
  ]
}
```

### When Showing All Items (no disabled filter)
```json
{
  "logic": "and",
  "filters": []
}
```

### With Other Filters Combined
```json
{
  "logic": "and",
  "filters": [
    {
      "field": "supplierName",
      "operator": "contains",
      "value": "Acme"
    },
    {
      "field": "disabled",
      "operator": "eq",
      "value": "No"
    }
  ]
}
```

## Technical Details

### Provide/Inject Pattern
- **Advantage**: Direct communication between grandparent and grandchild
- **Avoids**: Props drilling through intermediate components
- **Type-safe**: Uses TypeScript generics for type checking
- **Flexible**: Child components can optionally use the provided function

### Filter Merging Strategy
1. Start with existing filter or create new one
2. Remove any existing `disabled` filter
3. Add new `disabled` filter if value is not null
4. Preserve all other filters
5. Maintain current sort order

### Entity Level Support
- Automatically detects current entity level (Spends, Suppliers, Parents)
- Applies appropriate sort settings for each level
- Filter persists when switching between entity levels (handled by `dataChange`)

## Button States

| Button Text | Current State | On Click | Filter Applied |
|-------------|---------------|----------|----------------|
| "Hide Exclude" | Showing all items | Hide excluded | `disabled = "No"` |
| "Show Exclude" | Hiding excluded | Show all | No filter |

## Benefits

1. **Clean Architecture**: Uses Vue's built-in provide/inject pattern
2. **No Props Drilling**: Direct communication without intermediate components
3. **Filter Preservation**: Doesn't overwrite existing filters
4. **Entity Level Aware**: Works correctly across all entity levels
5. **Type Safe**: TypeScript ensures correct function signature
6. **Maintainable**: Clear separation of concerns

## Testing Checklist

- [x] No linter errors
- [x] TypeScript compilation successful
- [ ] Manual testing needed:
  - [ ] Click "Hide Exclude" → Grid shows only non-excluded items
  - [ ] Button text changes to "Show Exclude"
  - [ ] Click "Show Exclude" → Grid shows all items
  - [ ] Button text changes to "Hide Exclude"
  - [ ] Filter works on Spend Lines tab
  - [ ] Filter works on Suppliers tab
  - [ ] Filter works on Ultimate Parents tab
  - [ ] Filter combines correctly with other filters (search, etc.)
  - [ ] Filter persists when switching entity level tabs
  - [ ] Sort order is maintained when toggling filter
  - [ ] No console errors

## Edge Cases Handled

1. **No existing filter**: Creates new filter structure
2. **Existing filters**: Preserves them while adding/removing disabled filter
3. **Multiple toggles**: Correctly adds/removes filter on each click
4. **Entity level switching**: Filter reapplies correctly
5. **Sort preservation**: Maintains current sort order

## Related Components

- `EditOptionProgram.vue` - Initiates filter toggle
- `ListsCFEdit.vue` - Applies filter to grid
- `HomeAnalyzeProgramList.vue` - No changes needed (transparent pass-through)
- Grid components (ParentCFEdit, SupplierCFEdit, SpendCFEdit) - Receive filtered data

## Date
February 13, 2026
