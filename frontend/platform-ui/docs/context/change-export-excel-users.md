# Excel export for user lists (Manage Team + Company Users) – implemented

## Summary
Excel export is enabled for both user list views using the existing global filter export API.

## Implementation

### Manage Team (HomeManageTeam.vue)
- `:allowExportExcel="true"` and `@exportCSV="exportUsersToExcel"` on CalculumGridGraphql.
- Ref `lastGridFilter` stores the current grid filter in `dataChangeHandler`; ref `loadExport` for loading state.
- `exportUsersToExcel()` builds `filters_grid`: `telerikFilter` (from `formatData.convertFiltersToREST(lastGridFilter.value)`), `globalFilter: null`, `companyUuid` (current company). Calls `homeStore.exportData` with `section: 'home'`, `level: 'CompanyUserGraphQL'`. On success, `saveExcel` with filename `Manage_Team_Users` and columns that have a `field`.

### Company Users (CompanyUsers.vue)
- Same grid props; uses existing `filterSettings` as the grid filter.
- `exportUsersToExcel()` builds `filters_grid` with `telerikFilter`, `globalFilter: null`, `entityUuid: companyUuid`. Calls `homeStore.exportData` with `section: 'adminBackend'`, `level: 'CompanyUserGraphQL'`. On success, `saveExcel` with filename `Company_Users`.

### Backend
- No changes. `POST /api/{section}/{targetView}/export` already supports `section=home` and `section=adminBackend` with `targetView=CompanyUserGraphQL`; security and scope (company/entity) are applied in GlobalFilterController and GlobalFilterManager.
