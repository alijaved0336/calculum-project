# Team CRUD - API Integration and Store Management

## Summary
Implementation of complete team CRUD operations with API integration and centralized state management in the store. This includes creating missing API endpoints, integrating them with the ManageTeamAction component, and managing team state through the gridMenuActions store.

## Context

### Current State
- **useCompany.ts**: Provides `companyActiveTeams` computed property that reads teams from user session
- **ManageTeamAction.vue**: Has UI for CRUD operations but no API integration
- **gridMenuActions.ts**: Has `activeTeams` ref but it's not populated or managed
- **company.ts API**: Has `getCompanyTeams()` and `postCompanyTeam()` but missing PATCH and DELETE

### Required Changes
1. Add missing API endpoints (PATCH, DELETE) to `company.ts`
2. Populate store with teams from `useCompany`
3. Integrate API calls in ManageTeamAction component
4. Update store after successful API operations
5. Handle errors and show user feedback

## Implementation Checklist

### Phase 1: Add Missing API Endpoints ✅

#### File: `src/modules/adminBackend/api/company.ts`

- [x] **Add `patchCompanyTeam` function** (after line 353)
  - Endpoint: `PATCH /api/teams/{teamUuid}`
  - Headers: `Content-Type: application/merge-patch+json`
  - Parameters: `teamUuid: string`, `teamName: string`
  - Body: `{ name: teamName }`
  - Returns: `Promise<ApiResponse>`
  - Permissions: `ROLE_ADMIN` or `ROLE_COMPANY_ADMIN`

- [x] **Add `deleteCompanyTeam` function** (after `patchCompanyTeam`)
  - Endpoint: `DELETE /api/teams/{teamUuid}`
  - Parameters: `teamUuid: string`
  - Returns: `Promise<ApiResponse>`
  - Permissions: `ROLE_ADMIN` or `ROLE_COMPANY_ADMIN`

### Phase 2: Update Store Management ✅

#### File: `src/stores/gridMenuActions.ts`

- [x] **Add action to initialize teams**
  - Function: `initializeTeams(teams: UserSessionActiveCompanyTeam[])`
  - Purpose: Populate `activeTeams` from `useCompany`
  - Should replace existing array

- [x] **Add action to add team to store**
  - Function: `addTeam(team: UserSessionActiveCompanyTeam)`
  - Purpose: Add newly created team to `activeTeams`
  - Should push to array

- [x] **Add action to update team in store**
  - Function: `updateTeam(teamId: string, updatedTeam: Partial<UserSessionActiveCompanyTeam>)`
  - Purpose: Update existing team in `activeTeams`
  - Should find by `@id` and update

- [x] **Add action to remove team from store**
  - Function: `removeTeam(teamId: string)`
  - Purpose: Remove deleted team from `activeTeams`
  - Should filter out by `@id`

### Phase 3: Initialize Store in ManageTeamAction ✅

#### File: `src/modules/components/grid/menuActions/ManageTeamAction.vue`

- [x] **Initialize store with teams on component mount**
  - Use `onMounted` lifecycle hook
  - Call `gridMenuActionsStore.initializeTeams(companyActiveTeams.value)`
  - Added null check for safety

- [x] **Update local items ref to use store**
  - Changed to: `const items = computed(() => activeTeams.value)`
  - Made it reactive to store changes

### Phase 4: Integrate Create API ✅

#### File: `src/modules/components/grid/menuActions/ManageTeamAction.vue`

- [x] **Import API function**
  - Added: `import { postCompanyTeam } from '@/modules/adminBackend/api/company';`

- [x] **Update `addNewItem` function**
  - Added loading state: `const isCreating = ref(false)`
  - Validate team name is not empty
  - Set `isCreating.value = true`
  - Get company IRI: `const { companyActiveIri } = useCompany()`
  - Call API: `const response = await postCompanyTeam(newItemName.value.trim(), companyActiveIri.value)`
  - Check if response is successful: `if (response.success)`
  - Add team to store: `gridMenuActionsStore.addTeam(response.data)`
  - Show success toast: `toast.success('Team added successfully')`
  - Reset form: `newItemName.value = ''; isAddingNew.value = false;`
  - Handle errors with toast
  - Set `isCreating.value = false` in finally block

### Phase 5: Integrate Update API ✅

#### File: `src/modules/components/grid/menuActions/ManageTeamAction.vue`

- [x] **Import API function**
  - Added: `import { patchCompanyTeam } from '@/modules/adminBackend/api/company';`

- [x] **Update `saveEdit` function**
  - Added loading state: `const isUpdating = ref(false)`
  - Validate team name is not empty
  - Set `isUpdating.value = true`
  - Call API: `const response = await patchCompanyTeam(editingItemId.value, editingItemName.value.trim())`
  - Check if response is successful: `if (response.success)`
  - Update team in store: `gridMenuActionsStore.updateTeam(editingItemId.value, { name: editingItemName.value.trim() })`
  - Show success toast: `toast.success('Team updated successfully')`
  - Exit edit mode: `cancelEdit()`
  - Handle errors with toast
  - Set `isUpdating.value = false` in finally block

### Phase 6: Integrate Delete API ✅

#### File: `src/modules/components/grid/menuActions/ManageTeamAction.vue`

- [x] **Import API function**
  - Added: `import { deleteCompanyTeam } from '@/modules/adminBackend/api/company';`

- [x] **Update `deleteItem` function**
  - Added loading state per item: `const deletingItems = ref<Set<string>>(new Set())`
  - Set `deletingItems.value.add(itemId)`
  - Call API: `const response = await deleteCompanyTeam(itemId)`
  - Check if response is successful: `if (response.success)`
  - Remove team from store: `gridMenuActionsStore.removeTeam(itemId)`
  - Show success toast: `toast.success('Team deleted successfully')`
  - Handle errors with toast
  - Remove from deletingItems: `deletingItems.value.delete(itemId)` in finally block

### Phase 7: Add Loading States to UI ✅

#### File: `src/modules/components/grid/menuActions/ManageTeamAction.vue`

- [x] **Disable add button while creating**
  - Added `:disabled="isCreating"` to input
  - Added `:class="{ 'disabled': isCreating }"` to check and cancel icons

- [x] **Disable edit button while updating**
  - Added `:disabled="isUpdating"` to input
  - Added `:class="{ 'disabled': isUpdating }"` to check and cancel icons

- [x] **Disable delete button while deleting**
  - Added `:class="{ 'disabled': deletingItems.has(item['@id']) }"` to pencil and trash icons

### Phase 8: Add Helper Utilities ✅

#### File: `src/modules/components/grid/menuActions/ManageTeamAction.vue`

- [x] **Import StringUtils**
  - Added: `import { StringUtils } from '@/utils';`
  - Note: API functions already use `removeIRI()` internally

### Phase 9: Error Handling ✅

#### File: `src/modules/components/grid/menuActions/ManageTeamAction.vue`

- [x] **Add try-catch blocks to all API calls**
  - Wrapped all API calls in try-catch
  - Log errors to console for debugging
  - Show user-friendly error messages
  - Don't update store if API call fails

- [x] **Handle network errors**
  - Check for `response.success`
  - Show appropriate error messages
  - Keep UI in consistent state

- [x] **Handle validation errors**
  - Show validation error for empty names
  - Show generic error messages for API failures

### Phase 10: Update Types (if needed) ✅

#### File: `src/types/index.ts`

- [x] **Verify UserSessionActiveCompanyTeam interface**
  - Interface already exists with: `@id: string`, `@type: string`, `name: string`
  - No additional changes needed

### Phase 11: Testing ⏳

- [ ] **Test Create Operation**
  - Open ManageTeamAction component
  - Click "+" icon
  - Enter team name
  - Click check icon
  - Verify API call is made
  - Verify team appears in list
  - Verify success toast is shown
  - Verify store is updated

- [ ] **Test Update Operation**
  - Click pencil icon on existing team
  - Change team name
  - Click check icon
  - Verify API call is made
  - Verify team name is updated in list
  - Verify success toast is shown
  - Verify store is updated

- [ ] **Test Delete Operation**
  - Click trash icon on existing team
  - Verify API call is made
  - Verify team is removed from list
  - Verify success toast is shown
  - Verify store is updated

- [ ] **Test Error Scenarios**
  - Test with invalid team name
  - Test with network error (disconnect)
  - Test with server error (500)
  - Verify error toasts are shown
  - Verify UI remains consistent

- [ ] **Test Loading States**
  - Verify buttons are disabled during operations
  - Verify UI is not clickable during operations

- [ ] **Test Store Synchronization**
  - Verify store is initialized on mount
  - Verify store updates after each operation
  - Verify multiple components can read from store
  - Verify store persists across component remounts

## API Endpoint Details

### 1. Create Team (Already Exists)
```typescript
// POST /api/teams
postCompanyTeam(teamName: string, companyId: string): Promise<ApiResponse>

// Request Body:
{
  "name": "Team name",
  "company": "/api/companies/{companyUuid}"
}

// Response: Team object with @id, @type, name
```

### 2. Update Team (To Be Created)
```typescript
// PATCH /api/teams/{teamUuid}
patchCompanyTeam(teamUuid: string, teamName: string): Promise<ApiResponse>

// Headers:
{
  "Content-Type": "application/merge-patch+json"
}

// Request Body:
{
  "name": "New team name"
}

// Response: Updated team object
```

### 3. Delete Team (To Be Created)
```typescript
// DELETE /api/teams/{teamUuid}
deleteCompanyTeam(teamUuid: string): Promise<ApiResponse>

// Response: 204 No Content on success
```

### 4. Get Teams (Already Exists)
```typescript
// GET /api/companies/{companyUuid}/teams
getCompanyTeams(companyId: string): Promise<ApiResponse>

// Response: Array of team objects
```

## Store Actions Details

### initializeTeams
```typescript
function initializeTeams(teams: UserSessionActiveCompanyTeam[]) {
  activeTeams.value = teams;
}
```

### addTeam
```typescript
function addTeam(team: UserSessionActiveCompanyTeam) {
  activeTeams.value.push(team);
}
```

### updateTeam
```typescript
function updateTeam(teamId: string, updatedTeam: Partial<UserSessionActiveCompanyTeam>) {
  const index = activeTeams.value.findIndex(t => t['@id'] === teamId);
  if (index !== -1) {
    activeTeams.value[index] = { ...activeTeams.value[index], ...updatedTeam };
  }
}
```

### removeTeam
```typescript
function removeTeam(teamId: string) {
  activeTeams.value = activeTeams.value.filter(t => t['@id'] !== teamId);
}
```

## Error Handling Strategy

### API Response Structure
```typescript
interface ApiResponse {
  success: boolean;
  data?: any;
  error?: string;
  status?: number;
}
```

### Error Messages
- **Create**: "Failed to create team. Please try again."
- **Update**: "Failed to update team. Please try again."
- **Delete**: "Failed to delete team. Please try again."
- **Network**: "Network error. Please check your connection."
- **Validation**: Show specific validation error from API

### Success Messages
- **Create**: "Team added successfully"
- **Update**: "Team updated successfully"
- **Delete**: "Team deleted successfully"

## Notes

1. **UUID Extraction**: Use `StringUtils.removeIRI()` to extract UUID from IRI format
2. **Company IRI**: Get from `useCompany().companyActiveIri.value`
3. **Store Reactivity**: Ensure store updates trigger component re-renders
4. **Permissions**: Backend validates permissions, frontend should handle 403 errors gracefully
5. **Optimistic Updates**: Consider optimistic UI updates for better UX (update UI before API response)
6. **Rollback**: If using optimistic updates, implement rollback on API failure

## Dependencies

- `@/modules/adminBackend/api/company` - API functions
- `@/stores/gridMenuActions` - State management
- `@/composables/useCompany` - Company context
- `@/utils` - Utility functions (StringUtils)
- `vue-toastification` - Toast notifications
- `@/types` - TypeScript interfaces

## Related Files

- `src/composables/useCompany.ts` - Source of truth for company teams
- `src/modules/components/grid/menuActions/ManageTeamAction.vue` - UI component
- `src/stores/gridMenuActions.ts` - State management
- `src/modules/adminBackend/api/company.ts` - API endpoints
- `src/types/index.ts` - Type definitions

## Implementation Summary

### Changes Made

#### 1. API Endpoints (`src/modules/adminBackend/api/company.ts`)
- **Added `patchCompanyTeam(teamUuid, teamName)`**: Updates team name via PATCH request
- **Added `deleteCompanyTeam(teamUuid)`**: Deletes team via DELETE request
- Both functions use `removeIRI()` to extract UUID from IRI format
- Both functions follow existing API patterns with try-catch and `giveAnswer()`

#### 2. Store Actions (`src/stores/gridMenuActions.ts`)
- **Added `initializeTeams(teams)`**: Replaces entire teams array
- **Added `addTeam(team)`**: Pushes new team to array
- **Added `updateTeam(teamId, updatedTeam)`**: Finds and updates team by @id
- **Added `removeTeam(teamId)`**: Filters out team by @id
- All actions exported in store return object

#### 3. Component Integration (`src/modules/components/grid/menuActions/ManageTeamAction.vue`)

**Imports Added:**
- `onMounted` from Vue
- `postCompanyTeam`, `patchCompanyTeam`, `deleteCompanyTeam` from API
- `StringUtils` from utils
- `companyActiveIri` from useCompany

**State Added:**
- `isCreating: ref<boolean>` - Loading state for create operation
- `isUpdating: ref<boolean>` - Loading state for update operation
- `deletingItems: ref<Set<string>>` - Loading state for delete operations per item

**Lifecycle:**
- `onMounted()` - Initializes store with teams from useCompany (with null check)

**Computed:**
- Changed `items` from `ref` to `computed(() => activeTeams.value)` for reactivity

**Functions Updated:**
- `addNewItem()` - Now async, calls API, updates store, shows toasts, handles errors
- `saveEdit()` - Now async, calls API, updates store, shows toasts, handles errors
- `deleteItem()` - Now async, calls API, updates store, shows toasts, handles errors

**Template Updates:**
- Added `:disabled` bindings to inputs during operations
- Added `:class="{ 'disabled': ... }"` to all action icons
- Icons are visually disabled and non-clickable during operations

**Styles Added:**
- `.disabled` class with opacity 0.5, cursor not-allowed, pointer-events none

### Key Features

1. **Optimistic UI Updates**: Store is updated only after successful API response
2. **Error Handling**: Try-catch blocks with user-friendly error messages
3. **Loading States**: Visual feedback during operations (disabled buttons)
4. **Null Safety**: Checks for null values before operations
5. **Reactive Store**: Component automatically updates when store changes
6. **Toast Notifications**: Success and error messages for all operations
7. **Validation**: Empty name validation before API calls

### API Flow

#### Create Flow:
1. User enters team name and clicks check icon
2. Validate name is not empty
3. Set `isCreating = true` (disables UI)
4. Call `postCompanyTeam(name, companyIri)`
5. If successful: add to store, show success toast, reset form
6. If failed: show error toast
7. Set `isCreating = false` (enables UI)

#### Update Flow:
1. User clicks pencil icon, edits name, clicks check icon
2. Validate name is not empty
3. Set `isUpdating = true` (disables UI)
4. Call `patchCompanyTeam(teamId, name)`
5. If successful: update in store, show success toast, exit edit mode
6. If failed: show error toast
7. Set `isUpdating = false` (enables UI)

#### Delete Flow:
1. User clicks trash icon
2. Add teamId to `deletingItems` set (disables UI for this item)
3. Call `deleteCompanyTeam(teamId)`
4. If successful: remove from store, show success toast
5. If failed: show error toast
6. Remove teamId from `deletingItems` set (enables UI)

### Testing Notes

- All linter errors have been resolved
- TypeScript compilation successful
- Manual testing required to verify:
  - API endpoints work correctly
  - Store updates propagate to UI
  - Loading states work as expected
  - Error handling works correctly
  - Toast notifications appear

### Next Steps

1. **Manual Testing**: Test all CRUD operations in development environment
2. **E2E Tests**: Create Playwright tests for team management
3. **Confirmation Dialog**: Consider adding confirmation before delete
4. **Duplicate Check**: Consider preventing duplicate team names
5. **Undo/Redo**: Consider adding undo functionality for deletions

### UI Enhancement - Text Truncation (Added)

**File:** `src/modules/components/utils/InitialLettersText.vue`

**Changes:**
- Added `.text-truncate-ellipsis` class to the text span inside the component
- Text truncates with ellipsis (...) when exceeds `max-width: 120px`
- Name text shows ellipsis for long names (> 7 characters approximately)
- No changes needed in `ManageTeamAction.vue` - truncation is handled internally by the component

**CSS Added:**
```scss
.text-truncate-ellipsis {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 120px;
}
```

**Template Change:**
```pug
span.font-weight-bold.text-truncate-ellipsis {{ text }}
```

**Usage:** The component automatically truncates long text without any additional wrapper or configuration needed.

### Loading State Implementation (Added)

**File:** `src/modules/components/grid/menuActions/ManageTeamAction.vue`

**Changes:**
- Imported `CalculumLoading` component
- Added `.manage-team-container` wrapper with `position: relative`
- Added `isLoading` computed property that checks if any operation is in progress
- Loading indicator displays with `block` prop (centered within container, not global)

**Computed Property:**
```typescript
const isLoading = computed<boolean>(() => {
  return isCreating.value || isUpdating.value || deletingItems.value.size > 0;
});
```

**Template Structure:**
```pug
.manage-team-container
    CalculumLoading(v-if="isLoading" block)
    .header-container
        // ... rest of content
```

**CSS Added:**
```scss
.manage-team-container {
  position: relative;
  min-height: 300px;
}
```

**Behavior:**
- Loading spinner appears when creating, updating, or deleting teams
- Spinner is centered within the component container (not fullscreen)
- Uses `block` prop from CalculumLoading for local positioning
- Automatically shows/hides based on operation state

## Date
February 16, 2026
