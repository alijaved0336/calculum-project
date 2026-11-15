# Entity Card Procurement Team Edit - Implementation Summary

## Overview

Successfully integrated the `ManageTeamAction` component into the Entity Card Company Details view to allow users to edit the procurement team assignment for suppliers.

## Changes Made

### 1. Template Changes (`EntityCardCompanyDetails.vue`)

#### Structure

**Location:** Lines 69-82

**Before:**
```pug
.col-12.mb-3
  .test.gap-10
    DetailBox(:title="..." :value="supplierDetail.procurementTeam ?? '-'" ...)
    i.fa.fa-pencil.cursor-pointer(@click="editProcurementTeam")
```

**After:**
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

**Note:** The implementation uses a toggle approach instead of a dropdown wrapper for better positioning control.

#### Styles Added

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

**Key positioning changes:**
- Wrapped the pencil icon and dropdown in `.manage-team-wrapper` with `position: relative`
- Changed `.mange-team` positioning from `left: 0; right: 0` to `right: 0` only
- Added `min-width: 400px` to ensure the dropdown has adequate width
- Changed `top` from `3.5vh` to `calc(100% + 0.5rem)` for consistent spacing
- Changed `border-radius` from bottom-only to all corners for better appearance

### 2. Script Changes

#### Imports Added:
```typescript
import CalculumDropdownEditProgramOption from "@/modules/components/utils/CalculumDropdownEditProgramOption.vue";
import ManageTeamAction from "@/modules/components/grid/menuActions/ManageTeamAction.vue";
import { UserSessionActiveCompanyTeam } from "@/types";
import { useToast } from "vue-toastification";
import axios from "@/utils/axios";
import { getBaseApi } from "@/utils/getBaseApi";
import { removeIRI } from "@/utils";
```

#### Components Registered:
```typescript
components: {
  // ... existing components
  CalculumDropdownEditProgramOption,
  ManageTeamAction,
}
```

#### Functions Added:

**1. handleTeamChange:**
```typescript
/**
 * Handle team change from ManageTeamAction component
 * Updates the procurement team for the current supplier
 * 
 * @param keyId - Action key identifier ('manageTeam')
 * @param isEmit - Whether to emit the action
 * @param payload - Contains the selected team and removeGroup flag
 * @param payload.param - Selected team object or null
 * @param payload.removeGroup - Boolean indicating if team should be cleared
 */
async function handleTeamChange(
  keyId: string,
  isEmit: boolean,
  payload: { param: UserSessionActiveCompanyTeam | null; removeGroup: boolean }
) {
  try {
    const selectedTeam = payload.param;
    const teamIri = selectedTeam ? selectedTeam["@id"] : null;

    // Call API to update supplier's procurement team
    const url = getBaseApi() + "/api/spend_parsed_companies/" + removeIRI(props.companyId);
    const params = {
      team: teamIri,
    };

    const response = await axios.patch(url, params, {
      headers: {
        "Content-Type": "application/merge-patch+json",
      },
    });

    if (response.status === 200) {
      if (selectedTeam) {
        data.supplierDetail.procurementTeam = selectedTeam.name;
        toast.success(translate.t("home.entityCard.details.procurementTeamUpdated"));
      } else {
        data.supplierDetail.procurementTeam = "-";
        toast.success(translate.t("home.entityCard.details.procurementTeamCleared"));
      }

      // Close the dropdown
      showManageTeam.value = false;

      // Refresh supplier detail to get updated data
      getSupplierDetail();
    } else {
      toast.error(translate.t("home.entityCard.details.procurementTeamUpdateFailed"));
    }
  } catch (error) {
    if (DEBUG) {
      console.error("Error updating procurement team:", error);
    }
    toast.error(translate.t("home.entityCard.details.procurementTeamUpdateFailed"));
  }
}
```

**2. toggleManageTeam:**
```typescript
function toggleManageTeam() {
  showManageTeam.value = !showManageTeam.value;
}
```

### 3. Translations Added (`en.json`)

**Location:** `src/resources/locales/languages/en.json`

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

## API Endpoint Used

**Endpoint:** `PATCH /api/spend_parsed_companies/{companyId}`

**Payload:**
```json
{
  "team": "/api/teams/{teamId}" // or null to clear
}
```

**Headers:**
```
Content-Type: application/merge-patch+json
```

## Features Implemented

1. **View Teams:** Users can click the pencil icon to open a dropdown showing all available teams
2. **Select Team:** Users can select a team from the list to assign it to the supplier
3. **Create Team:** Users can create new teams directly from the dropdown
4. **Edit Team:** Users can edit existing team names
5. **Delete Team:** Users can delete teams (with confirmation)
6. **Clear Team:** Users can clear the team assignment using the "Clear" button
7. **Real-time Updates:** The UI updates immediately after successful API calls
8. **Error Handling:** Proper error messages are shown if the API call fails
9. **Data Refresh:** Supplier details are refreshed after successful updates

## User Flow

1. User navigates to Entity Card > Company Details
2. User sees the Procurement Team field with current value
3. User clicks the pencil icon next to the Procurement Team field
4. A dropdown opens showing the ManageTeamAction component
5. User can:
   - Select an existing team
   - Create a new team
   - Edit an existing team
   - Delete a team
   - Clear the current team assignment
6. Upon selection, the API is called to update the supplier's team
7. Success/error message is displayed
8. The UI is updated with the new team name
9. The dropdown closes automatically

## Testing Checklist

- [ ] Navigate to Entity Card Company Details
- [ ] Verify pencil icon is visible next to Procurement Team field
- [ ] Click pencil icon and verify dropdown opens
- [ ] Verify ManageTeamAction component loads with available teams
- [ ] Select a team and verify it updates the supplier's procurement team
- [ ] Verify success toast message appears
- [ ] Verify the Procurement Team field updates with new team name
- [ ] Try creating a new team
- [ ] Try editing an existing team
- [ ] Try deleting a team
- [ ] Try clearing the team assignment (Clear button)
- [ ] Verify error handling when API fails
- [ ] Refresh page and verify changes persist
- [ ] Test with different company types (supplier, parent, potential-supplier, potential-parent)

## Notes

- The component uses the same `ManageTeamAction` component used in the grid view
- The component leverages the `gridMenuActionsStore` for team state management
- The API endpoint is the same one used to retrieve supplier details
- The implementation follows the existing pattern used in other parts of the application
- No new API functions were needed - using axios directly in the component
- The dropdown automatically closes after a team is selected (handled by CalculumDropdownEditProgramOption)

## Related Files

- `src/modules/home/entityCard/views/EntityCardCompanyDetails.vue` (modified)
- `src/modules/components/grid/menuActions/ManageTeamAction.vue` (reused)
- `src/modules/components/utils/CalculumDropdownEditProgramOption.vue` (reused)
- `src/resources/locales/languages/en.json` (modified)
- `src/stores/gridMenuActions.ts` (reused)
- `docs/context/change-entity-card-procurement-team-edit.md` (documentation)

## Dependencies

All dependencies were already available in the project:
- ManageTeamAction component (fully functional with CRUD operations)
- CalculumDropdownEditProgramOption component (dropdown wrapper)
- gridMenuActionsStore (team state management)
- useCompany composable (team data access)
- Company team API endpoints (create, update, delete)

## Future Enhancements

Possible improvements for future iterations:
1. Add loading state while API call is in progress
2. Add confirmation dialog before clearing team assignment
3. Add ability to assign multiple teams (if business logic allows)
4. Add team filtering/search for large team lists
5. Add team assignment history/audit log
