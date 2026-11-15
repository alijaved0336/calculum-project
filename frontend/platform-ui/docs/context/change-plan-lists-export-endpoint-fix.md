# Fix Plan Lists Export Endpoint

## Issue
The export functionality in Plan Lists is calling the wrong endpoint (`/api/export/csv`) instead of using the same logic as Analyze and Program lists which use `/api/{section}/{level}/export`.

## Root Cause
- `PlanLists.vue` uses `HomeAPI.exportCSV()` which calls `/api/export/csv`
- `Lists.vue` (analyze) and `ListsNineboxes.vue` use `homeStore.exportData()` which calls `/api/{section}/{level}/export`

## Solution
Update `PlanLists.vue` export function to use the same pattern as analyze/program lists:
1. Replace `HomeAPI.exportCSV()` call with `homeStore.exportData()`
2. Use the same parameter structure as analyze lists
3. Include `targetPlanUuid` and `targetPhaseUuid` in filters_grid
4. Set `section: "plan"` in params
5. Use callbacks for success/error handling

## Changes Required
- [x] Update `exportCSV` function in `PlanLists.vue` to match analyze/program export logic
- [x] Ensure filters_grid includes planId and phaseId
- [x] Use homeStore.exportData() instead of HomeAPI.exportCSV()
- [x] Maintain same error handling and loading states

## Implementation Complete
The export function in `PlanLists.vue` has been updated to use `homeStore.exportData()` which calls the correct endpoint `/api/plan/{level}/export` instead of the incorrect `/api/export/csv`. The implementation now matches the pattern used in `Lists.vue` (analyze) and `ListsNineboxes.vue`.

## Files Modified
- `src/modules/home/plan/components/PlanLists.vue`

