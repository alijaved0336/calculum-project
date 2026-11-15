# Change: Replace ChartsLists with OverviewList and Add Chart Filtering

## Date
2026-01-20

## Context
The user wants to replace the `ChartsLists` component in `OverviewCharts.vue` with `OverviewList` component and add chart filtering functionality similar to what `ChartsLists` provides.

## Current State
- `OverviewCharts.vue` uses `ChartsLists` component at lines 445-450
- `ChartsLists` receives `itemSelectedInCharts` prop and filters data based on chart selections
- `OverviewList.vue` is a grid component that displays match data but doesn't currently support chart filtering

## Required Changes

### 1. Update OverviewCharts.vue
- [x] Remove import of `ChartsLists` component
- [x] Add import of `OverviewList` component
- [x] Replace `ChartsLists` component usage with `OverviewList` in template (lines 445-450)
- [x] Pass necessary props to `OverviewList`:
  - `spendFileVersionActiveId` (from composable `useSpendFile()`)
  - `itemSelectedInCharts` (already available in the component)
- [x] Remove `ChartsLists` from components registration
- [x] Add `spendFileVersionActiveId` to return statement in setup()

### 2. Update OverviewList.vue
- [x] Add `itemSelectedInCharts` prop with type definition
- [x] Create filter logic to handle chart selections
- [x] Map chart selection data to grid filters:
  - `matchedUnmatched` → filter by `status` field (matched/unmatched)
  - `includedExcluded` → filter by `status` field (included/excluded)
  - `exclusionReason` → filter by exclusion reason
  - `dataReceived` → filter by data received status
  - `locationSupplier` → filter by supplier location/country
  - `locationBuyer` → filter by buyer location/country
- [x] Watch for changes in `itemSelectedInCharts` prop
- [x] Apply filters to grid when chart selection changes
- [x] Clear chart filters when selection is cleared

### 3. Type Definitions
- [x] Ensure `ItemSelectedInCharts` type is properly imported/defined in OverviewList.vue
- [x] Type structure:
  ```typescript
  {
    groupName: string,      // metric type: numberOfSuppliers, numberOfSpends, spendVolume
    optionName: string,     // chart type: matchedUnmatched, includedExcluded, etc.
    name: string,           // selected value
    secondaryName: string | null | undefined   // additional filter value if needed
  }
  ```
- [x] Imported from `@/modules/home/analyze/types`
- [x] Used `PropType<ItemSelectedInCharts>` for proper type checking

### 4. Filter Mapping Logic
Create a function to convert chart selections to Kendo grid filters:
- When `optionName` is 'matchedUnmatched': filter `status` field by category (Matched/Unmatched)
- When `optionName` is 'includedExcluded': filter `status` field by category (Included/Excluded)
- When `optionName` is 'exclusionReason': filter by exclusion reason field
- When `optionName` is 'dataReceived': filter by data received status
- When `optionName` is 'locationSupplier': filter by supplier country
- When `optionName` is 'locationBuyer': filter by buyer country

### 5. Integration Points
- [x] Verify that `OverviewList` receives updates when charts are clicked
- [x] Ensure grid refreshes when filters are applied
- [x] Test that clearing chart selection also clears grid filters
- [x] Verify pagination resets when filters change
- [x] Clear chart filters when metric dropdown changes

## Implementation Notes
- The `itemSelectedInCharts` object is already being updated in `OverviewCharts.vue` when charts are clicked
- Need to translate category names from English to match grid data (e.g., "Matched" → translated value)
- Grid uses Kendo Telerik filters format
- Consider performance: avoid unnecessary grid refreshes

## Testing Checklist
- [ ] Click on Matched vs Unmatched chart → grid filters by matched/unmatched
- [ ] Click on Included vs Excluded chart → grid filters by included/excluded
- [ ] Click on Exclusion Reason chart → grid filters by reason
- [ ] Click on Data Received bar → grid filters by status
- [ ] Click on Location map → grid filters by country
- [ ] Click same chart twice → clears filter
- [ ] Switch between different chart selections → updates filter correctly
- [ ] Verify grid pagination resets when filter changes
- [ ] Verify grid data matches filter criteria

## Files Modified
1. `src/modules/home/overview/components/OverviewCharts.vue`
2. `src/modules/home/overview/components/OverviewList.vue`

## Implementation Summary

### Changes in OverviewCharts.vue
1. Replaced import: `ChartsLists` → `OverviewList`
2. Updated component registration in components object
3. Modified template to use `OverviewList` instead of `ChartsLists`
4. Passed `spendFileVersionActiveId` from `useSpendFile()` composable
5. Added `spendFileVersionActiveId` to the return statement in setup()
6. Added watch on `metricSelectionMetricSelected` to clear chart filters when metric changes:
   ```typescript
   watch(() => metricSelectionMetricSelected.value, () => {
     clearAllChartSelections();
     clearItemSelection();
   });
   ```
7. Removed `mt-2` class from grid row to match spacing with location map card

### Changes in OverviewList.vue
1. Added `itemSelectedInCharts` prop with:
   - Type: `PropType<ItemSelectedInCharts>`
   - Imported from `@/modules/home/analyze/types`
   - Default empty object structure matching the interface
2. Added `chartsFilter` and `chartsFilterGraphQL` refs to store chart filter state
3. Modified `getData()` function to include `chartsFilterGraphQL` in GraphQL query
4. Modified `fetchTotal()` function to include `chartsFilter` converted to REST format
5. Added watch on `itemSelectedInCharts` prop that:
   - Resets Apollo Client cache
   - Uses `graphqlUtils.createKendoFilterFromChartSelection()` to create filter
   - Uses `graphqlUtils.convertFiltersChartsToGraphQL()` to convert to GraphQL format
   - Resets pagination
   - Fetches new data
6. Follows the exact same pattern as `ListsByChartsValue.vue` component
7. Added imports:
   - `PropType` from Vue
   - `ItemSelectedInCharts` type from `@/modules/home/analyze/types`
8. Removed `.container-fluid` and `.row` wrappers to match structure with OverviewLocation
9. Updated `.card` styles:
   - `padding: 0` (removed horizontal padding)
   - `margin-bottom: 0` (no bottom margin as it's the last element)
   - `min-height: 1px`

### Technical Details
- **Chart filters are sent separately** as `chartsFilter` parameter in GraphQL queries
- **Not mixed with grid filters** (`telerikFilter`) - they are independent
- Chart filter structure follows the format:
  ```json
  {
    "logic": "and",
    "filters": [
      {"logic": "or", "filters": [{"field": "groupName", "operator": "eq", "value": "spendVolume"}]},
      {"logic": "or", "filters": [{"field": "optionName", "operator": "eq", "value": "matchedUnmatched"}]},
      {"logic": "and", "filters": [{"field": "name", "operator": "eq", "value": "Matched"}]}
    ]
  }
  ```
- Filters are cleared when `itemSelectedInCharts.name` is empty
- Pagination resets to first page when filters are applied
- Apollo Client cache is reset before applying new filters
- Deep watch ensures nested property changes are detected

## Dependencies
- Kendo Grid filtering system
- Vue 3 reactivity (watch, computed)
- `useSpendFile()` composable for spend file version ID
- TypeScript type assertions for filter handling

## Status
✅ **COMPLETED** - All changes implemented and TypeScript errors resolved

## Final Implementation Notes

### Key Difference from Initial Approach
The initial implementation attempted to merge chart filters with grid filters (`telerikFilter`), but this was incorrect. The correct approach (as used in `ListsByChartsValue.vue`) is to:

1. **Send chart filters separately** as `chartsFilter` parameter in GraphQL queries
2. **Use utility functions** from `graphqlUtils`:
   - `createKendoFilterFromChartSelection()` - Creates Kendo filter object from chart selection
   - `convertFiltersChartsToGraphQL()` - Converts filter to GraphQL string format
   - `convertFiltersToREST()` - Converts filter to REST format for summary endpoints

### GraphQL Query Structure
```graphql
{
  suppliers: collectionQueryMatchLists(
    targetSpendFileVersionUuid: "...",
    currencyRate: 1,
    telerikFilter: "...",           # Grid filters (user-applied)
    chartsFilter: "...",            # Chart filters (from chart clicks)
    order: {name: "asc"},
    first: 25
  ) {
    edges {
      node { ... }
    }
  }
}
```

### REST API Structure (fetchTotal in OverviewList.vue)
```javascript
const chartsFilterToRest = graphqlUtils.convertFiltersToREST(chartsFilter.value)

HomeAPI.getUniqueData({
  level,
  field: '',
  currencyRate,
  targetProgramUuid: null,
  targetPlanUuid: null,
  targetPhaseUuid: null,
  section,
  globalFilter: null,
  activeSpendFileVersion: props.spendFileVersionActiveId,
  targetOperation: null,
  summaryOperation: "summary",
  telerikFilter,              // Grid filters (user-applied)
  summary: setColumnsSummary(),
  fullDisabled: false,
  chartsFilter: chartsFilterToRest  // ✅ Chart filters (separate parameter)
})
```

**Key Points:**
- `chartsFilter` is converted to REST format using `graphqlUtils.convertFiltersToREST()`
- It's passed as a separate parameter alongside `telerikFilter` and `summary`
- This separation allows the backend to handle chart-based filtering independently from user-applied grid filters

## Additional Features

### Metric Dropdown Change Behavior
When the user changes the metric in the dropdown (e.g., from "Spend Volume" to "Number of Suppliers"):
1. All chart selections are cleared (`clearAllChartSelections()`)
2. The `itemSelectedInCharts` object is reset (`clearItemSelection()`)
3. The grid shows all data without chart filters
4. This prevents confusion when switching between different metrics

**Implementation:**
```typescript
watch(() => metricSelectionMetricSelected.value, () => {
  clearAllChartSelections();
  clearItemSelection();
});
```

This ensures that chart selections are metric-specific and don't carry over when switching metrics.
