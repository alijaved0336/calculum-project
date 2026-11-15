# Entity Card - Integrate ManageTeamAction Component for Procurement Team Editing

## Context

The Entity Card Company Details view currently has a pencil icon (`i.fa.fa-pencil`) at line 72 that triggers an `editProcurementTeam` function (which doesn't exist). This needs to be replaced with the `ManageTeamAction` component to allow users to edit the procurement team assignment for a company.

## Current State

**File:** `src/modules/home/entityCard/views/EntityCardCompanyDetails.vue`

- Line 72: Has a pencil icon with `@click="editProcurementTeam"` (function not implemented)
- Line 71: Shows `DetailBox` with procurement team information
- The component displays procurement team data but has no way to edit it

## Goal

Replace the pencil icon with the `ManageTeamAction` component to enable:
1. Viewing available teams
2. Selecting a team to assign to the company
3. Creating new teams
4. Editing existing teams
5. Deleting teams

## Implementation Checklist

### Phase 1: Analyze ManageTeamAction Component Requirements ✅

**File:** `src/modules/components/grid/menuActions/ManageTeamAction.vue`

The component requires:
- **Props:**
  - `option`: String of type `ActionFromEditProgram` (required)
- **Emits:**
  - `call-action`: Emitted when a team is selected with parameters `(keyId, isEmit, payload)`
- **Dependencies:**
  - Uses `useCompany()` composable to get `companyActiveTeams` and `companyActiveIri`
  - Uses `gridMenuActionsStore` to manage team state
  - Requires API functions: `postCompanyTeam`, `patchCompanyTeam`, `deleteCompanyTeam`

### Phase 2: Determine Integration Strategy

**Options:**
1. **Use CalculumDropdownEditProgramOption wrapper** (similar to grid usage)
   - Pros: Consistent with existing usage, provides dropdown UI
   - Cons: Might be overkill for entity card context
   
2. **Use ManageTeamAction directly with custom modal/dropdown**
   - Pros: More flexible, better UX for entity card
   - Cons: Requires custom wrapper component

**Decision:** Use option 1 (CalculumDropdownEditProgramOption) for consistency and to leverage existing functionality.

### Phase 3: Update EntityCardCompanyDetails Template ✅

**File:** `src/modules/home/entityCard/views/EntityCardCompanyDetails.vue`

**Changes completed:**

1. **Imported required components:**
   - `CalculumDropdownEditProgramOption`
   - `ManageTeamAction`
   - `UserSessionActiveCompanyTeam` type
   - `useToast` from vue-toastification
   - `axios`, `getBaseApi`, `removeIRI` utilities

2. **Replaced pencil icon (lines 70-72) with dropdown:**
   - Added `CalculumDropdownEditProgramOption` wrapper
   - Added `ManageTeamAction` component in slot
   - Connected `@call-action` event to `handleTeamChange` function

### Phase 4: Add Script Logic ✅

**File:** `src/modules/home/entityCard/views/EntityCardCompanyDetails.vue`

**Changes completed:**

1. **Imported necessary utilities and types:**
   - `UserSessionActiveCompanyTeam` type
   - `useToast` composable
   - `axios`, `getBaseApi`, `removeIRI` utilities

2. **Implemented handleTeamChange function:**
   - Handles team selection from ManageTeamAction component
   - Calls API endpoint `/api/spend_parsed_companies/{companyId}` with PATCH method
   - Updates local state with new team name
   - Shows success/error toast messages
   - Refreshes supplier detail after successful update

3. **Added to return statement:**
   - Exported `handleTeamChange` function

4. **Added toast instance:**
   - Initialized `useToast()` in setup

### Phase 5: Identify API Endpoint for Updating Procurement Team ✅

**Research completed:**

**API Endpoint identified:**
- PATCH `/api/spend_parsed_companies/{companyId}`
- Payload: `{ team: teamIri }` (IRI format: `/api/teams/{teamId}`)
- Content-Type: `application/merge-patch+json`

**Notes:**
- The endpoint is the same one used to get supplier details
- The `team` field accepts an IRI reference to a team entity
- Setting `team: null` clears the team assignment
- The API returns the updated supplier object

### Phase 6: Implement API Call ✅

**Implementation completed:**

1. **No separate API function needed** - Using axios directly in component
2. **Implemented handleTeamChange with API call:**
   - Constructs URL: `/api/spend_parsed_companies/{companyId}`
   - Sends PATCH request with `{ team: teamIri }` payload
   - Uses `application/merge-patch+json` content type
   - Handles both team selection and clearing (null value)
   - Updates local state on success
   - Shows translated toast messages
   - Refreshes supplier detail to ensure data consistency
   - Includes error handling with DEBUG logging

3. **Added translations:**
   - `home.entityCard.details.procurementTeamUpdated`
   - `home.entityCard.details.procurementTeamCleared`
   - `home.entityCard.details.procurementTeamUpdateFailed`

### Phase 7: Testing

**Manual Testing:**
1. Navigate to Entity Card Company Details
2. Locate the Procurement Team field
3. Click the pencil icon to open the team management dropdown
4. Verify the dropdown opens and shows available teams
5. Select a team and verify it updates the company's procurement team
6. Try creating a new team
7. Try editing an existing team
8. Try deleting a team
9. Try clearing the team assignment (using "Clear" button)
10. Verify all operations update the UI correctly
11. Refresh the page and verify the changes persist

**Edge Cases:**
- No teams available
- API errors
- Network errors
- Concurrent updates

### Phase 8: Code Review and Cleanup

- Remove any unused code
- Ensure proper error handling
- Verify TypeScript types are correct
- Check for console errors
- Verify accessibility (keyboard navigation, screen readers)

## Dependencies

- `ManageTeamAction.vue` component (already implemented)
- `CalculumDropdownEditProgramOption.vue` component (already implemented)
- `useCompany` composable (already implemented)
- `gridMenuActionsStore` (already implemented)
- API endpoint for updating company's procurement team (needs verification)

## Notes

- The `ManageTeamAction` component is already fully functional with CRUD operations
- The component uses the `gridMenuActionsStore` to manage team state
- The component emits `call-action` event when a team is selected
- The payload includes `param` (selected team or null) and `removeGroup` (boolean)
- Need to identify the correct API endpoint for updating a company's procurement team

## Related Files

- `src/modules/components/grid/menuActions/ManageTeamAction.vue`
- `src/modules/components/utils/CalculumDropdownEditProgramOption.vue`
- `src/stores/gridMenuActions.ts`
- `src/composables/useCompany.ts`
- `docs/context/change-team-crud-api-integration.md`
- `docs/context/change-manage-team-crud-functions.md`
