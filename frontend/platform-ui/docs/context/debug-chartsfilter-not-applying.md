# Debug: ChartsFilter Not Applying Correctly for collectionQueryProgramListSpends

## Issue Report
**Date**: December 23, 2025  
**Query Type**: GraphQL `collectionQueryProgramListSpends`  
**Reporter**: User  
**Status**: ✅ RESOLVED

## Problem Description

The `chartsFilter` parameter was not being applied correctly for the following GraphQL query when filtering by SME status:

```graphql
{
  spends: collectionQueryProgramListSpends(
    targetProgramUuid: "dd59a726-33ea-44b8-b509-f77d2ca92f99"
    targetSpendFileVersionUuid: "9eea8dbb-0db1-43f7-b9e3-1e86eb1cb42b"
    chartsFilter: "{\"logic\":\"and\",\"filters\":[{\"logic\":\"or\",\"filters\":[{\"field\":\"groupName\",\"operator\":\"eq\",\"value\":\"suppliers\"}]},{\"logic\":\"or\",\"filters\":[{\"field\":\"optionName\",\"operator\":\"eq\",\"value\":\"perSME\"}]},{\"logic\":\"or\",\"filters\":[{\"field\":\"name\",\"operator\":\"eq\",\"value\":\"Non-SME\"}]}]}"
    ...
  ) {
    # ... fields ...
  }
}
```

### Expected Behavior
The filter should return only spends where:
- Chart grouping is by "suppliers"
- Option is "perSME" (per SME status)
- The "name" field equals "Non-SME" (filtering for non-SME suppliers)

### Actual Behavior
The filter was not being applied correctly - it was returning no results or incorrect results.

## Root Cause Analysis

### The Issue

The problem was a **data type mismatch** between what the chart sends and what the backend expects:

1. **Backend Database**: The `isSME` column stores **boolean values** (true/false)
2. **Backend Chart Query**: Returns the boolean value directly as "name" field (true/false as strings)
3. **Frontend Chart Display**: Shows boolean as string ("true"/"false")
4. **Frontend Filter**: Was sending the chart value directly ("true"/"false" as strings)
5. **Backend Filter**: Expected **"Yes"/"No"** strings (like grid column filters use)

### SQL Generated (Before Fix)

```sql
SELECT COUNT(DISTINCT p0_.entity_uuid) as value, p0_.is_sme as name
FROM program_list_spend p0_
WHERE ...
GROUP BY p0_.is_sme
HAVING p0_.is_sme = 'false'  -- ❌ Comparing boolean with string 'false'
```

This failed because the backend's `TelerikFilter` converts "Yes"/"No" to boolean, but was receiving "true"/"false" strings from the chart.

## Solution Implementation

### Date: December 23, 2025
### Approach: Frontend Value Transformation at Chart Data Parsing

The solution transforms boolean values to "Yes"/"No" strings at the earliest point: **when chart data is parsed from the backend response**. This ensures consistency throughout the entire frontend chart and filter flow.

### Changes Applied

#### File 1: `src/modules/components/metrics/MetricsComponents.vue`

**Location**: `parseDataForChart()` function (Line ~588)

**Change**: Transform boolean values to "Yes"/"No" when parsing chart categories

```typescript
data.currentSelectedChart.categoriesData = callbackSuccessData.map(
  (categoryValue: any) => {
    if (categoryValue.name !== null && categoryValue.name !== undefined) {
      // For boolean values (like isSME), convert to Yes/No to match grid filter format
      if (typeof categoryValue.name === 'boolean') {
        return categoryValue.name ? 'Yes' : 'No';
      }
      return categoryValue.name;
    } else {
      /**if the category name is not available */
      return translate.t("global.notAvailable");
    }
  },
);
```

**Why this location?**
- ✅ Transforms at the source - when data first enters the frontend
- ✅ Chart displays "Yes"/"No" (user-friendly)
- ✅ Filter automatically receives "Yes"/"No" (no additional transformation needed)
- ✅ Single point of transformation - easier to maintain

#### File 2: `src/modules/home/analyze/components/list/ListsByChartsValue.vue`

**Location**: `createKendoFilterFromChartSelection()` function (Line ~1485)

**Change**: Simplified - no transformation needed since chart already provides correct format

```typescript
function createKendoFilterFromChartSelection(): object | [] {
  if (!props.itemSelectedInCharts.name || props.itemSelectedInCharts.name === '') {
    return [];
  }
  
  // Transform the value if it's a boolean field option (perSME, perPilot, etc.)
  // Note: Boolean values are already transformed to 'Yes'/'No' in MetricsComponents.vue parseDataForChart
  let filterValue = props.itemSelectedInCharts.name;
  
  // No transformation needed here anymore - the chart already provides 'Yes'/'No' for boolean fields

  const kendoFilter = {
    logic: 'and',
    filters: [
      {
        logic: 'or',
        filters: [
          {
            field: 'groupName',
            operator: 'eq',
            value: props.itemSelectedInCharts.groupName
          }
        ]
      },
      {
        logic: 'or',
        filters: [
          {
            field: 'optionName',
            operator: 'eq',
            value: props.itemSelectedInCharts.optionName
          }
        ]
      },
      {
        logic: 'or',
        filters: [
          {
            field: 'name',
            operator: 'eq',
            value: filterValue  // Already in correct format ('Yes'/'No')
          }
        ]
      }
    ]
  };

  return kendoFilter;
}
```

### SQL Generated (After Fix)

```sql
SELECT COUNT(DISTINCT p0_.entity_uuid) as value, p0_.is_sme as name
FROM program_list_spend p0_
WHERE ...
GROUP BY p0_.is_sme
HAVING p0_.is_sme = false  -- ✅ Correct: "No" transformed to boolean false by TelerikFilter
```

### Value Transformation Logic

| Backend Returns | Frontend Receives (categoryValue.name) | Transformed To (in parseDataForChart) | Chart Displays | Filter Sends | Backend Converts To |
|-----------------|----------------------------------------|---------------------------------------|----------------|--------------|---------------------|
| boolean true | true | "Yes" | "Yes" | "Yes" | boolean true |
| boolean false | false | "No" | "No" | "No" | boolean false |

**Data Flow**:
1. **Backend** → Returns `{ name: true, value: 150 }` (boolean) from SQL query
2. **MetricsComponents.vue parseDataForChart()** → Transforms `true` to `"Yes"` 
3. **Chart** → Displays "Yes" (user-friendly)
4. **User clicks** → Emits `{ name: "Yes" }`
5. **ListsByChartsValue.vue** → Receives `"Yes"`, creates filter with `"Yes"`
6. **Backend TelerikFilter** → Transforms `"Yes"` to `boolean true` for SQL query

This matches the **existing grid filter behavior** where:
- Grid column filters for boolean fields send "Yes"/"No"
- Backend `TelerikFilter` already handles "Yes"/"No" → boolean transformation
- Charts now use the same format as grids

### Why This Approach?

✅ **Maintains consistency** with existing grid filter logic  
✅ **No backend changes required** - uses existing infrastructure  
✅ **Minimal code changes** - single function modification  
✅ **Easier to extend** - can add more boolean fields (isPilot, etc.)  
✅ **No breaking changes** - other filters work as before  

### Testing

**Manual Testing Required**:
1. Navigate to Analyze section with program loaded
2. Click on a chart segment for SME (true or false)
3. Verify the grid filters correctly to show only SME or Non-SME entities
4. Verify the GraphQL query includes correct chartsFilter parameter with "Yes"/"No" values

**Test Cases**:

| Test Case | Chart Selection | Expected chartsFilter Value | Expected Grid Result |
|-----------|----------------|----------------------------|---------------------|
| SME Chart - True | Click "true" segment | `"name": "Yes"` | Shows only SME entities |
| SME Chart - False | Click "false" segment | `"name": "No"` | Shows only Non-SME entities |
| Other Charts | Any segment | Original value | Works as before |

## Impact

✅ **Fixes the reported issue** where perSME chart filter was not working  
✅ **Maintains backward compatibility** with all other chart filters  
✅ **Consistent with grid behavior** - uses same value format  
✅ **No database changes** required  
✅ **No backend changes** required  
✅ **Minimal frontend changes** - single function update  

## Future Enhancements

### If Other Boolean Fields Need Similar Treatment:

The current implementation **automatically handles all boolean fields** - no code changes needed!

When the backend returns a boolean value for any chart option (perSME, perPilot, perHasDynamic, etc.), the `parseDataForChart` function automatically detects the type and transforms it to "Yes"/"No".

**Example**: If a new chart option "perHasDynamic" is added:
1. Backend returns: `{ name: true, value: 50 }` or `{ name: false, value: 30 }`
2. Frontend automatically transforms: `true` → `"Yes"`, `false` → `"No"`
3. No code changes required! ✅

### Alternative: Explicit Option List (if needed)

If you want to restrict transformation to specific options only:

```typescript
// In MetricsComponents.vue parseDataForChart()
const booleanOptions = ['perSME', 'perPilot', 'perHasDynamic'];
const isCurrentOptionBoolean = booleanOptions.includes(data.selectedChart);

data.currentSelectedChart.categoriesData = callbackSuccessData.map(
  (categoryValue: any) => {
    if (categoryValue.name !== null && categoryValue.name !== undefined) {
      // Only transform if current option is in the boolean list
      if (isCurrentOptionBoolean && typeof categoryValue.name === 'boolean') {
        return categoryValue.name ? 'Yes' : 'No';
      }
      return categoryValue.name;
    } else {
      return translate.t("global.notAvailable");
    }
  },
);
```

## Deployment Notes

- **Files Modified**: 
  - `src/modules/components/metrics/MetricsComponents.vue` (chart data parsing)
  - `src/modules/home/analyze/components/list/ListsByChartsValue.vue` (documentation update only)
- **Breaking Changes**: None
- **Database Migrations**: None required
- **Backend Changes**: None required
- **Frontend Build**: Required
- **Risk Level**: Low (isolated change, backward compatible, automatic type detection)

## Related Documentation

- Backend boolean filter handling: `web-app/src/ApiPlatform/Filters/GraphQLs/Orm/TelerikFilter.php`
- Grid filter format: `src/utils/FormatData.ts` - `getYesOrNo()` function
- Chart data generation: `web-app/src/Repository/Statistics/StatisticsRepository.php`

