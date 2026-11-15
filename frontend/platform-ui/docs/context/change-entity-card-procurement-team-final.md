# Entity Card - Procurement Team Edit - Final Implementation

## Overview

Successfully integrated the `ManageTeamAction` component into Entity Card Company Details to allow users to edit the procurement team assignment for suppliers/parents. The implementation uses `analyzeStore.postProgramSpendConfigurationbyGroups()` to maintain consistency with the rest of the application.

## Final Implementation Details

### 1. Imports Added

```typescript
// Stores
import { useAnalyzeStore } from "@/stores/analyze";
import { useGlobalFiltersStore } from "@/stores/globalFilters";
import { useGridMenuActionsStore } from "@/stores/gridMenuActions";

// Components
import ManageTeamAction from "@/modules/components/grid/menuActions/ManageTeamAction.vue";

// Types
import { UserSessionActiveCompanyTeam } from "@/types";
import { ActionFromEditProgram } from "@/modules/components/types";

// Utilities
import { removeIRI } from "@/utils";
import { useToast } from "vue-toastification";
```

### 2. Stores Initialized

```typescript
const analyzeStore = useAnalyzeStore();
const globalFiltersStore = useGlobalFiltersStore();
const gridMenuActionsStore = useGridMenuActionsStore();
const toast = useToast();
```

### 3. Template Structure

```pug
.col-12.mb-3
  .test.gap-10
    DetailBox(:title="..." :value="supplierDetail.procurementTeam ?? '-'" ...)
    .manage-team-wrapper
      i.fa.fa-pencil.cursor-pointer(@click="toggleManageTeam")
      .mange-team(v-if="showManageTeam")
        ManageTeamAction(
          :option="'manageTeam'"
          @call-action="handleTeamChange"
        )
```

### 4. Complete handleTeamChange Function

```typescript
function handleTeamChange(keyId: ActionFromEditProgram, isEmit: boolean, payload: any) {
  const selectedTeam = payload.param;
  const teamIri = selectedTeam ? selectedTeam["@id"] : null;
  
  // Prepare the changed parameter for the API
  const changed = {
    key: keyId,
    value: teamIri ? removeIRI(teamIri) : null,
  };

  // Prepare program UUID and level
  const programUuid = removeIRI(props.programUuid);
  let levelOfGrid = props.companyType;
  if (levelOfGrid === "parent") {
    levelOfGrid = "parents";
  } else if (levelOfGrid === "supplier") {
    levelOfGrid = "suppliers";
  }

  // Prepare filters for the API call
  const filters = {
    telerikFilter: null, // No telerik filter in Entity Card context
    targetProgramUuid: programUuid,
    globalFilter: formatData.convertFiltersToREST(
      globalFiltersStore.getFiltersApplied
    ),
    currencyRate: appStore.getCurrencyAmount,
  };

  if (DEBUG) {
    console.log("handleTeamChange - filters:", filters);
    console.log("handleTeamChange - globalFiltersApplied:", globalFiltersStore.getFiltersApplied);
  }

  const params = {
    program: programUuid,
    changed: changed,
    uuids: [removeIRI(props.companyId)], // Array with the single supplier UUID
    level: levelOfGrid, // Level is suppliers/parents
    filters: filters,
    all: false,
    callbackSuccess: () => {
      // Update local state
      if (selectedTeam) {
        data.supplierDetail.procurementTeam = selectedTeam.name;
        toast.success(translate.t("home.entityCard.details.procurementTeamUpdated"));
      } else {
        data.supplierDetail.procurementTeam = "-";
        toast.success(translate.t("home.entityCard.details.procurementTeamCleared"));
      }

      // Close the dropdown
      showManageTeam.value = false;

      // Update store for coordination with other components
      const newPayload = { ...payload, isEmit, levelOfGrid: props.companyType };
      gridMenuActionsStore.changeAction(keyId as ActionFromEditProgram, newPayload);

      // Refresh supplier detail to get updated data from server
      getSupplierDetail();

      if (DEBUG) {
        console.log("handleTeamChange - Success: Team updated");
      }
    },
    callbackError: (error: any) => {
      toast.error(translate.t("home.entityCard.details.procurementTeamUpdateFailed"));
      
      if (DEBUG) {
        console.error("handleTeamChange - Error updating procurement team:", error);
      }
    }
  };

  if (DEBUG) {
    console.log("handleTeamChange - Calling analyzeStore with params:", params);
  }

  // Call the analyze store method
  analyzeStore.postProgramSpendConfigurationbyGroups(params);
}
```

### 5. Key Parameters Explained

#### `changed` Object
```typescript
{
  key: "manageTeam",           // Action identifier
  value: "team-uuid" | null    // Team UUID (without IRI) or null to clear
}
```

#### `filters` Object
```typescript
{
  telerikFilter: null,                    // No grid filter in Entity Card
  targetProgramUuid: "program-uuid",      // Current program UUID
  globalFilter: "{...}",                  // Converted global filters from store
  currencyRate: 1.23                      // Current currency rate from appStore
}
```

#### `params` Object
```typescript
{
  program: "program-uuid",                // Program UUID (without IRI)
  changed: { key, value },                // Change to apply
  uuids: ["supplier-uuid"],               // Array with supplier UUID (without IRI)
  level: "suppliers" | "parents",         // Entity level
  filters: { ... },                       // Filters object
  all: false,                             // Not updating all records
  callbackSuccess: () => { ... },         // Success handler
  callbackError: (error) => { ... }       // Error handler
}
```

### 6. Level Mapping

The function maps `companyType` prop to the correct level:

```typescript
"supplier" → "suppliers"
"parent" → "parents"
"potential-supplier" → "potential-suppliers" (if needed)
"potential-parent" → "potential-parents" (if needed)
```

### 7. Filters Integration

The filters are obtained from:

1. **Global Filters**: `globalFiltersStore.getFiltersApplied`
   - Converted to REST format using `formatData.convertFiltersToREST()`
   - Includes all global filters applied by the user

2. **Currency Rate**: `appStore.getCurrencyAmount`
   - Current currency conversion rate

3. **Target Program**: `props.programUuid`
   - The current program context

4. **Telerik Filter**: `null`
   - Not applicable in Entity Card context (no grid)

### 8. Flow Diagram

```
User clicks pencil icon
  ↓
Dropdown opens (showManageTeam = true)
  ↓
User selects team in ManageTeamAction
  ↓
ManageTeamAction emits @call-action
  ↓
handleTeamChange receives event
  ↓
Extracts team IRI from payload
  ↓
Prepares changed object { key: "manageTeam", value: teamId }
  ↓
Determines level (suppliers/parents)
  ↓
Builds filters object with:
  - Global filters from store
  - Currency rate
  - Target program UUID
  ↓
Calls analyzeStore.postProgramSpendConfigurationbyGroups(params)
  ↓
Backend updates supplier/parent team
  ↓
callbackSuccess executes:
  - Updates local state
  - Shows success toast
  - Closes dropdown
  - Updates gridMenuActionsStore
  - Refreshes supplier details
```

### 9. Styles

```scss
.manage-team-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.mange-team {
  position: absolute;
  top: calc(100% + 0.5rem);
  right: 0;
  min-width: 400px;
  background: white;
  border: 1px solid #eaecf0;
  border-radius: 0.375rem;
  box-shadow: 0 0.5rem 1rem rgba(0, 0, 0, 0.15);
  z-index: 99999;
}
```

### 10. Translations

```json
{
  "home": {
    "entityCard": {
      "details": {
        "procurementTeamUpdated": "Procurement team updated successfully",
        "procurementTeamCleared": "Procurement team cleared successfully",
        "procurementTeamUpdateFailed": "Failed to update procurement team"
      }
    }
  }
}
```

## Testing Checklist

- [ ] Open Entity Card for a supplier
- [ ] Click pencil icon next to Procurement Team
- [ ] Verify dropdown opens on the right side
- [ ] Select an existing team
- [ ] Verify success toast appears
- [ ] Verify team name updates in UI
- [ ] Verify dropdown closes automatically
- [ ] Refresh page and verify team persists
- [ ] Try clearing team with "Clear" button
- [ ] Verify "-" appears when team is cleared
- [ ] Try with a parent company
- [ ] Verify global filters are applied correctly
- [ ] Test with different currency rates
- [ ] Test error handling (disconnect network)
- [ ] Verify DEBUG logs in console (if DEBUG mode)

## Key Features

✅ Uses `analyzeStore.postProgramSpendConfigurationbyGroups()` for consistency
✅ Includes global filters from `globalFiltersStore`
✅ Uses current currency rate from `appStore`
✅ Supports both suppliers and parents
✅ Proper level mapping (supplier → suppliers, parent → parents)
✅ Complete error handling with callbacks
✅ Toast notifications for user feedback
✅ Automatic dropdown close after selection
✅ Store coordination with `gridMenuActionsStore`
✅ Data refresh after successful update
✅ DEBUG logging for troubleshooting
✅ Proper positioning (right side of icon)

## Related Files

- `src/modules/home/entityCard/views/EntityCardCompanyDetails.vue` - Main implementation
- `src/modules/components/grid/menuActions/ManageTeamAction.vue` - Team management component
- `src/stores/analyze.ts` - Store with `postProgramSpendConfigurationbyGroups()`
- `src/stores/globalFilters.ts` - Global filters store
- `src/stores/gridMenuActions.ts` - Grid menu actions coordination
- `src/resources/locales/languages/en.json` - Translations
- `docs/context/change-team-crud-api-integration.md` - Team CRUD documentation

## Notes

- The implementation follows the same pattern as `ListsCFEdit.vue` and `ListNegotiation.vue`
- Filters are essential for the backend to apply the correct context
- The `level` parameter must match the entity type (suppliers/parents)
- The `all` parameter is always `false` since we're updating a single entity
- The `uuids` array contains only one UUID (the current supplier/parent)
