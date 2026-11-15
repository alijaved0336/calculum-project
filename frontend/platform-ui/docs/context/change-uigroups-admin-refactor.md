# UIGroupsAdmin.vue Refactoring Plan

## Objective
Refactor `UIGroupsAdmin.vue` (~1200 lines) using Vue 3 Composition API best practices to improve maintainability. Extract logic into composables and new components without changing behavior.

## Current Issues
- **Single large component**: List, create form, edit form, modals, and filter logic in one file
- **Duplicated template**: Create and edit forms are ~90% identical (only title and button label differ)
- **Monolithic state**: 40+ reactive properties in one `reactive()` object
- **Complex validation**: `validateName()` and `checkIfNameExists()` have high cognitive complexity and nested conditionals
- **Mixed concerns**: UI state, API calls, validation, and form handling intertwined
- **Types**: Interface `UIGroupsAdmin` defined inside setup(); not reusable
- **Dead code**: Watcher on `listOfCompanies` with empty body

---

## Refactoring Strategy

### 1. Types (adminBackend/types or local types file)
- [ ] Add/export types: `UiGroup`, `UiGroupFormState`, `CompanyForFilter`, `ViewMode` ('list' | 'create' | 'edit')
- [ ] Move form default constants to a shared place (e.g. `DEFAULT_PRIMARY_COLOR`, `MIN_USERS`, `MAX_USERS`, `MAX_FILE_SIZE_MB`)

### 2. New composables

#### 2.1 `useUiGroupsList` (views/composables/useUiGroupsList.ts)
- [ ] State: `listGroups`, `loading`, `checkedGroups`, `sumKeyForList`, `columns`
- [ ] Actions: `getGroups()`, `parseData()`, `formatDate()`, `getCompanyNames()`
- [ ] Uses: adminBackendStore.getUiGroups, DateUtils, user language for formatDate
- [ ] Returns parsed list ready for grid

#### 2.2 `useUiGroupForm` (views/composables/useUiGroupForm.ts)
- [ ] State: `groupNameInput`, `nameIsEmpty`, `colors`, `limitUser`, `minUsersAllowed`, `maxUsersAllowed`, `allowedDomains`, `file` (ref), `selectedImage`, `imageUrl`, `fileSizeTooBig`, `allowedMimeTypes`, `isSavingUiGroup`
- [ ] Computed: `showLogo`, `checkingDomains` (parsed domains array)
- [ ] Actions: `onChangeLogo()`, `onClickModifyLogo()`, `setColor()`, `checkInputError()`, `resetForm()`, `checkDomains()` (validation)
- [ ] Constants: default primary color, user limits, max file size 50MB
- [ ] Fill form from UiGroup for edit mode

#### 2.3 `useUiGroupCompaniesFilter` (views/composables/useUiGroupCompaniesFilter.ts)
- [ ] State: `listOfCompanies`, `loadingListOfCompaniesForFilter`, `filterWasActivated`
- [ ] Actions: `getListOfCompaniesForFilter()`, `saveAndCloseFilter()`, `closeFilter()`, `resetSelection()`
- [ ] Uses: adminBackendStore.getListOfCompaniesForFilter

#### 2.4 `useUiGroupModals` (views/composables/useUiGroupModals.ts)
- [ ] State: `isDeleteModalShowing`, `tempObjDeleteId`, `isFilterShowing`, `isModalUiGroupShowing`, `currentUiGroupObj`, `uiGroupModalSelectedCompanies`, `forSpecificUiGroup`, `forEditViewUiGroup`
- [ ] Actions: `showModalForDelete()`, `hideDeleteModal()`, `deleteUiGroup()`, `showFilter()`, `toggleFilter()`, `toggleFilterForEditView()`, `closeFilter()`, `showConfirmModal()`, `hideConfirmModal()`, `showModalForUiCompanies()`
- [ ] Depends on: useUiGroupsList (getGroups), store (deleteSelectedUiGroup)

#### 2.5 `useUiGroupValidation` (views/composables/useUiGroupValidation.ts)
- [ ] Simplify `validateName()`: extract small functions (e.g. `isNameEmpty()`, `shouldCheckNameExists()`, `buildSelectedCompaniesForEdit()`)
- [ ] Simplify `checkIfNameExists()`: keep API call, simplify success branch with early returns and helper to "proceed with save/update"
- [ ] Reduce nesting in validateName/checkIfNameExists so each branch is clear

#### 2.6 `useUiGroupApi` (views/composables/useUiGroupApi.ts) – optional
- [ ] Group: `updateGridUiGroup()`, `saveCreatedUiGroup()`, `uploadCompanyLogo()`
- [ ] These depend on form state, companies filter, and modals; can stay in main component or be passed as deps to a composable that only builds params and calls store

**Decision**: Keep `updateGridUiGroup`, `saveCreatedUiGroup`, `uploadCompanyLogo` in the main component or in a single composable that receives form + companies + callbacks, to avoid circular dependencies. Prefer **orchestration in view** and composables for **state + pure helpers**.

### 3. New components

#### 3.1 `UIGroupFormCard.vue` (components/UIGroupFormCard.vue)
- [ ] **Purpose**: Single form for both Create and Edit modes
- [ ] **Props**: `mode: 'create' | 'edit'`, `formState` (reactive ref or props for groupName, colors, limitUser, allowedDomains, showLogo, companyNameFirstLetter, nameIsEmpty, fileSizeTooBig, isSavingUiGroup, etc.)
- [ ] **Slots or props**: First letter for avatar, logo URL, file input handler, color, limits, domains
- [ ] **Emits**: `save`, `cancel`, `add-companies`, `upload-image`
- [ ] **Template**: One form layout; title and button label depend on `mode`
- [ ] **Styles**: Move form-specific scoped styles from UIGroupsAdmin (circle_default, custom_input, etc.) into this component

#### 3.2 `UIGroupsListView.vue` (components/UIGroupsListView.vue) – optional
- [ ] **Purpose**: List + empty state + grid + "New group" button
- [ ] **Props**: `listGroups`, `loading`, `checkedGroups`, `columns`, `sumKeyForList`
- [ ] **Emits**: `create-new`, `edit`, `edit-companies`, `delete`, `show-error`
- [ ] **Reduces**: UIGroupsAdmin template size and keeps list logic in one place

### 4. Main view refactor (UIGroupsAdmin.vue)

- [ ] Use `<script setup lang="ts">` and Composition API only
- [ ] Compose: `useUiGroupsList`, `useUiGroupForm`, `useUiGroupCompaniesFilter`, `useUiGroupModals`, `useUiGroupValidation`
- [ ] View state: `isViewGroupsShowing`, `isCreatingGroupViewShowing`, `isForEditViewUiGroup`, `isDeleting`, `isUploadingCustomLogo` – keep in view or in a small `useUiGroupViewState` composable
- [ ] Replace duplicated create/edit form blocks with one `<UIGroupFormCard>` (create) and one `<UIGroupFormCard>` (edit) or a single one with v-if by mode
- [ ] Keep modals (CalculumUiGroupModal, CalculumAnalyzeFilter, CalculumConfirmModal) in UIGroupsAdmin; pass props and emit handlers from composables
- [ ] Remove empty watcher on `listOfCompanies`
- [ ] Set `document.title` in `onMounted` or use a composable like `useDocumentTitle` if it exists
- [ ] Ensure all text stays i18n (`$t`)

### 5. Validation simplification (detailed)

- [ ] **validateName()**  
  - If create: if name empty → toast, stop. Else → checkIfNameExists().  
  - If edit:  
    - If name empty and no filter change → toast, stop.  
    - If name not empty and no filter change → get current group companies, then update (or check name if name changed).  
    - If filter was activated → get selected companies from list, then update (with file size check).  
  - Extract "get selected companies for current group" and "get selected companies from filter" into helpers.
- [ ] **checkIfNameExists()**  
  - On success: if name exists → toast. Else → one place that calls either `saveCreatedUiGroup()` or `updateGridUiGroup()` with the right payload (and file size check).  
  - Reduce duplication of "if (!fileSizeTooBig) update else toast" by a small helper.

### 6. File structure after refactor

```
src/modules/adminBackend/
  views/
    UIGroupsAdmin.vue          # Orchestrator, ~200–350 lines
    composables/
      useUiGroupsList.ts
      useUiGroupForm.ts
      useUiGroupCompaniesFilter.ts
      useUiGroupModals.ts
      useUiGroupValidation.ts
  components/
    UIGroupFormCard.vue         # Create/Edit form
    UIGroupsListView.vue        # Optional: list + grid + empty state
  types/
    index.ts                    # Add UiGroup, form types
  data/
    columns.ts                  # unchanged
```

### 7. Testing and regression

- [ ] No change to store or API contracts
- [ ] Manual test: list groups, create group (with companies, logo, theme, limits, domains), edit group, delete group, open companies modal and save
- [ ] If E2E tests exist for admin UI groups, run them after refactor
- [ ] Remove any unused imports and dead code (e.g. `saveEditedUiGroup` if it only sets one flag and that can be inlined)

### 8. Form logic in UIGroupFormCard + defineComponent (done)
- [x] Form logic moved into `UIGroupFormCard.vue`: uses `useUiGroupForm` internally, emits `submit` with `UiGroupFormPayload`.
- [x] `UIGroupsAdmin.vue` converted from `<script setup>` to `defineComponent` with `setup()`.
- [x] Computed `showLoadingBlock` added for loading block visibility (replaces long condition at line 81).
- [x] Parent uses payload from card for `validateName`, `checkIfNameExists`, `saveCreatedUiGroup`, `handleUpdateGridUiGroup`; modal save gets form via `formCardRef.getFormPayload()`.
- [x] Type `UiGroupFormPayload` added in `adminBackend/types` (includes `fileSizeTooBig`).

### 9. Edge cases to preserve

- [ ] Edit without changing filter: use existing group companies for update
- [ ] Edit with filter activated: use selected companies from filter
- [ ] File size > 50MB: block save and show message
- [ ] Allowed domains validation (empty vs invalid domain format)
- [ ] Logo upload after create/edit (companyIdForImageUpload, isUploadingCustomLogo)
- [ ] Loading states: list, deleting, uploading logo

---

## Execution order (completed)

1. ✅ Add types and constants (adminBackend/types, composables/constants.ts)
2. ✅ Implement composables (useUiGroupsList, useUiGroupForm, useUiGroupCompaniesFilter, useUiGroupModals); validation helpers in validationHelpers.ts
3. ✅ Create UIGroupFormCard.vue and replace both create/edit form blocks in UIGroupsAdmin
4. ✅ Create UIGroupsListView.vue and use it in UIGroupsAdmin
5. ✅ Refactor UIGroupsAdmin.vue to `<script setup>`, composables, and new components; removed duplicate template and dead watcher
6. ✅ Move form-related styles to UIGroupFormCard and UIGroupsListView
7. ✅ Linter errors fixed (ref unwrapping, modal types, showLogo)
8. Manual regression and E2E recommended

---

## Summary for review

| Item | Action |
|------|--------|
| **Types** | New types in `adminBackend/types` or `views/types` for UiGroup, form state, view mode |
| **Composables** | 5 composables: list, form, companies filter, modals, validation |
| **Components** | 1 mandatory: `UIGroupFormCard` (create + edit). 1 optional: `UIGroupsListView` |
| **UIGroupsAdmin.vue** | Becomes orchestrator with `<script setup>`, uses composables + UIGroupFormCard |
| **Behavior** | Unchanged; only structure and maintainability improved |

If you confirm this plan, the next step is to implement it in the order above and keep the checklist updated.

---

## API error message (400 with hydra:description)

When the API returns 400 with a body containing `hydra:description` (e.g. "The UI Group \"...\" has a maximum of 1 user(s). The selected companies have 29 unique active user(s)..."), the update UI Group error callback shows that description in the toast instead of the generic `errorUpdatedUiGroup` translation. Implementation: in `UIGroupsAdmin.vue`, inside `callbackError` of `updateGridUiGroup`, use `error?.data['hydra:description']` when present and a string, otherwise fall back to `t('adminBackend.uiGroupsAdmin.errorUpdatedUiGroup')`. The store passes the full `ApiResponse` (`{ success, code, data }`) to `callbackError`, so the API body is in `error.data`.
