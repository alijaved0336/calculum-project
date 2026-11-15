# Persist Disabled Filter Across Operations

## Summary
Ensure that when `disabledFilterValue` is not null in the `gridMenuActions` store, the disabled filter is always sent with API requests, regardless of other filter changes or tab switches.

## Problem
Currently, the disabled filter is only applied when the watcher detects a change in `disabledFilterValue`. However, when users:
- Apply other filters
- Change sorting
- Switch between entity level tabs
- Paginate

The disabled filter may not be included in the API request if `disabledFilterValue` hasn't changed.

## Solution Approach
Modify the filter construction logic to always check and include the disabled filter from the store when building filter objects for API requests.

## Changes Required

### File: `src/modules/home/analyze/views/ListsCFEdit.vue`

#### 1. Create helper function to ensure disabled filter is included
Add a new helper function that ensures the disabled filter is always included when `disabledFilterValue` is not null:

```typescript
/**
 * Ensures disabled filter is included in the filter object if store has a value
 * @param filter - The current filter object
 * @returns Filter object with disabled filter included if needed
 */
function ensureDisabledFilterIncluded(filter: any): any {
  const disabledValue = gridMenuActionsStore.disabledFilterValue;
  
  // If no disabled filter value in store, return filter as-is
  if (disabledValue === null) {
    return filter;
  }
  
  // Ensure proper filter structure
  let currentFilter = filter || { logic: "and", filters: [] };
  
  // If filter is an array, convert to proper structure
  if (Array.isArray(currentFilter)) {
    currentFilter = { logic: "and", filters: [] };
  }
  
  // Ensure filters array exists
  if (!currentFilter.filters) {
    currentFilter.filters = [];
  }
  
  // Check if disabled filter already exists
  const hasDisabledFilter = currentFilter.filters.some(
    (f: any) => f.field === "disabled"
  );
  
  // Add disabled filter if not present
  if (!hasDisabledFilter) {
    currentFilter.filters.push({
      field: "disabled",
      operator: "eq",
      value: disabledValue
    });
  }
  
  return currentFilter;
}
```

#### 2. Update `dataChange` function
Modify the `dataChange` function to ensure disabled filter is included:

**Location:** Around line 1794

**Before:**
```typescript
async function dataChange(filter: any, sort: any) {
  data.selectedItems = [];
  emit('update:selectedItems', data.selectedItems);
  data.filterForPatch = filter;
  switch (data.entityLevelTabSelected) {
    case ENTITY_LEVEL.SPEND_LINES:
      filterSettings.paginationSpends = {
        first: filterSettings.paginationSpends.first,
        after: 0,
        skip: 0
      };
      filterSettings.filterSpends = filter;
      // ...
```

**After:**
```typescript
async function dataChange(filter: any, sort: any) {
  data.selectedItems = [];
  emit('update:selectedItems', data.selectedItems);
  
  // Ensure disabled filter is included if store has a value
  const filterWithDisabled = ensureDisabledFilterIncluded(filter);
  data.filterForPatch = filterWithDisabled;
  
  switch (data.entityLevelTabSelected) {
    case ENTITY_LEVEL.SPEND_LINES:
      filterSettings.paginationSpends = {
        first: filterSettings.paginationSpends.first,
        after: 0,
        skip: 0
      };
      filterSettings.filterSpends = filterWithDisabled;
      // ...
```

#### 3. Update `pageChangeHandler` function
Ensure disabled filter is included when paginating:

**Location:** Around line 1242

Apply `ensureDisabledFilterIncluded` before fetching data in each case.

#### 4. Update `changeTabFromGrid` function
Ensure disabled filter persists when switching tabs:

**Location:** Around line 1840

No changes needed here as it calls `loadGridsData` which uses the stored filter settings.

#### 5. Update filter initialization in `loadGridsData`
Ensure disabled filter is applied on initial load:

**Location:** Around line 887

Add check to include disabled filter when loading grids.

## Data Flow

### Before (Current)
```
User applies filter
    ↓
dataChange(newFilter, sort)
    ↓
filterSettings.filterSpends = newFilter
    ↓
API request (may not include disabled filter)
```

### After (Fixed)
```
User applies filter
    ↓
dataChange(newFilter, sort)
    ↓
ensureDisabledFilterIncluded(newFilter)
    ↓
Check store.disabledFilterValue
    ↓
If not null, add/ensure disabled filter
    ↓
filterSettings.filterSpends = filterWithDisabled
    ↓
API request (always includes disabled filter if store has value)
```

## Benefits

1. **Consistent Filtering**: Disabled filter is always applied when store has a value
2. **No State Loss**: Filter persists across all operations (sort, page, tab change)
3. **Single Source of Truth**: Store value determines if filter should be applied
4. **Backward Compatible**: Doesn't break existing functionality

## Edge Cases Handled

1. **Store value is null**: No disabled filter added (show all items)
2. **Store value is "No"**: Disabled filter always included (hide excluded)
3. **Multiple filters**: Disabled filter combines correctly with other filters
4. **Tab switching**: Disabled filter persists across entity levels
5. **Pagination**: Disabled filter included in paginated requests
6. **Sorting**: Disabled filter maintained when sorting changes

## Testing Checklist

- [ ] Set disabled filter to "No" (hide excluded)
- [ ] Apply another filter (e.g., search by name)
- [ ] Verify disabled filter is still applied
- [ ] Change sorting
- [ ] Verify disabled filter is still applied
- [ ] Switch to different entity level tab
- [ ] Verify disabled filter is applied in new tab
- [ ] Paginate through results
- [ ] Verify disabled filter is applied on all pages
- [ ] Toggle disabled filter off (null)
- [ ] Verify all items are shown
- [ ] Toggle disabled filter on again
- [ ] Verify excluded items are hidden

## Implementation Steps

1. [x] Add `ensureDisabledFilterIncluded` helper function
2. [x] Update `dataChange` to use helper function
3. [x] Update `getSupplierData` to use helper function
4. [x] Update `getParentsData` to use helper function
5. [x] Update `getSpendsData` to use helper function
6. [x] Verify no linter errors
7. [ ] Test all scenarios in checklist
8. [ ] Update documentation if needed

## Implementation Details

### Changes Applied

#### File: `src/modules/home/analyze/views/ListsCFEdit.vue`

**1. Added `ensureDisabledFilterIncluded` helper function (before `applyDisabledFilter`)**

Location: Around line 2353

```typescript
/**
 * Ensures disabled filter is included in the filter object if store has a value
 * @param filter - The current filter object
 * @returns Filter object with disabled filter included if needed
 */
function ensureDisabledFilterIncluded(filter: any): any {
  const disabledValue = gridMenuActionsStore.disabledFilterValue;
  
  // If no disabled filter value in store, return filter as-is
  if (disabledValue === null) {
    return filter;
  }
  
  // Ensure proper filter structure
  let currentFilter = filter || { logic: "and", filters: [] };
  
  // If filter is an array, convert to proper structure
  if (Array.isArray(currentFilter)) {
    currentFilter = { logic: "and", filters: [] };
  }
  
  // Ensure filters array exists
  if (!currentFilter.filters) {
    currentFilter.filters = [];
  }
  
  // Check if disabled filter already exists
  const hasDisabledFilter = currentFilter.filters.some(
    (f: any) => f.field === "disabled"
  );
  
  // Add disabled filter if not present
  if (!hasDisabledFilter) {
    currentFilter.filters.push({
      field: "disabled",
      operator: "eq",
      value: disabledValue
    });
  }
  
  return currentFilter;
}
```

**2. Updated `dataChange` function to use helper**

Location: Around line 1794

Changes:
- Added `const filterWithDisabled = ensureDisabledFilterIncluded(filter);`
- Updated `data.filterForPatch = filterWithDisabled;`
- Updated all three cases to use `filterWithDisabled`:
  - `filterSettings.filterSpends = filterWithDisabled;`
  - `filterSettings.filterSuppliers = filterWithDisabled;`
  - `filterSettings.filterParents = filterWithDisabled;`

**3. Updated `getSupplierData` function**

Location: Around line 1501

Changes:
- Added `const filterWithDisabled = ensureDisabledFilterIncluded(event.filterSuppliers);`
- Changed `graphqlUtils.convertFiltersToGraphQL(event.filterSuppliers)` to use `filterWithDisabled`

**4. Updated `getParentsData` function**

Location: Around line 1657

Changes:
- Added `const filterWithDisabled = ensureDisabledFilterIncluded(event.filterParents);`
- Changed `graphqlUtils.convertFiltersToGraphQL(event.filterParents)` to use `filterWithDisabled`

**5. Updated `getSpendsData` function**

Location: Around line 1787

Changes:
- Added `const filterWithDisabled = ensureDisabledFilterIncluded(event.filterSpends);`
- Changed `graphqlUtils.convertFiltersToGraphQL(event.filterSpends)` to use `filterWithDisabled`

### How It Works

1. **Helper Function Logic:**
   - Checks if `gridMenuActionsStore.disabledFilterValue` is not null
   - If null, returns the filter unchanged (no disabled filter needed)
   - If not null, ensures the filter object has proper structure
   - Checks if disabled filter already exists in the filters array
   - If not present, adds it with the value from the store

2. **Integration in `dataChange`:**
   - Before storing the filter, it passes through `ensureDisabledFilterIncluded`
   - This ensures that whenever filters change (sort, search, etc.), the disabled filter is preserved
   - The enhanced filter is then stored in both `data.filterForPatch` and the appropriate `filterSettings` property

3. **Persistence:**
   - The disabled filter is now automatically included in all filter operations
   - Works across entity level tabs (Spends, Suppliers, Parents)
   - Persists through pagination, sorting, and other filter changes

## Date
February 14, 2026
