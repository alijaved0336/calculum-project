# Change: Add FEATURE_SUPPLIER_STANDARD

## Summary
Added new feature role `FEATURE_SUPPLIER_STANDARD` following the same integration pattern as `NINE_BOXES_FINANCING`.

## Checklist (completed)

- [x] `src/constants/featureRoles.ts`: Added `SUPPLIER_STANDARD: "FEATURE_SUPPLIER_STANDARD"` and export `FEATURE_SUPPLIER_STANDARD`
- [x] `src/types/index.ts`: Added `SupplierStandardFeatureRole` type, `featureSupplierStandard: boolean` to `CompanySettingsCompaniesGridData`, and to `UserSessionFeatureRole` union
- [x] `src/utils/featureRoleUtils.ts`: Added `hasSupplierStandardFeature()`, added category `supplier_standard` in `getFeatureCategories()`
- [x] `src/modules/adminBackend/views/CompaniesAdmin.vue`: Added `featureSupplierStandard: hasFeatureRole(company.roles, FEATURE_ROLES.SUPPLIER_STANDARD)` in company mapping
- [x] `src/modules/adminBackend/data/columnsCompaniesAdmin.ts`: Added column `featureSupplierStandard` with cell and translation key
- [x] `src/modules/components/grid/CalculumGrid.vue`: Added template slot `#featureSupplierStandard` with `ColumnCheckbox`
- [x] `src/modules/adminBackend/utils/CompaniesUtils.ts`: Added `featureSupplierStandard` to `CompaniesGridModuleFieldName`, `getRoleFromFieldName` case, and import `FEATURE_SUPPLIER_STANDARD`
- [x] Locales: Added `supplierStandard` under `adminBackend.companiesAdmin.columnsTitles.features` in en.json and es.json
- [x] `src/constants/README.md`: Documented `SUPPLIER_STANDARD` in Feature Roles section

## Usage

- Backend must expose role value `FEATURE_SUPPLIER_STANDARD` for companies/users that should have this feature.
- Admin grid: new column "F16. Supplier Standard" (en) / "F12. Supplier Standard" (es) with checkbox to toggle the role per company.
- In app code: `hasSupplierStandardFeature(userRoles)` or `hasFeatureRole(roles, FEATURE_ROLES.SUPPLIER_STANDARD)`.

## PEER_GROUP_STANDARD (added later)

- Constant: `FEATURE_PEER_GROUP_STANDARD` / `FEATURE_ROLES.PEER_GROUP_STANDARD`
- Same integration: types, utils (`hasPeerGroupStandardFeature`), admin grid column "F17. Peer Group Standard" (en) / "F13. Peer Group Standard" (es), CalculumGrid slot, CompaniesUtils.
- Backend role value: `FEATURE_PEER_GROUP_STANDARD`.
