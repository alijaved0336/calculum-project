# rolesByCompany: add company name

## Summary
Extended GraphQL field `rolesByCompany` to include the company name per company, so the frontend can show "roles by company" with the company name without extra lookups.

## Format change
- **Before:** `rolesByCompany: { [companyUuid]: string[] }` (companyUuid → list of roles)
- **After:** `rolesByCompany: { [companyUuid]: { roles: string[], companyName: string } }`

## Backend changes
1. **CompanyUserCollectionResolver.php**  
   Subquery for `roles_by_company` now uses `json_build_object('roles', ..., 'companyName', cug.company_name)` so each key maps to an object with `roles` and `companyName`.

2. **CompanyUserGraphQL.php**  
   `getRolesByCompany()` now returns `[ companyUuid => ['roles' => $this->roles, 'companyName' => $this->companyName] ]` so the filtered (single-row) response has the same shape.

3. **CompanyUserGroupedItem.php**  
   Docblocks updated: `rolesByCompany` is now `array<string, array{roles: array<int, string>, companyName: string}>`.

## Frontend
- No code change required. The grid uses the `roles` field for the "Access" column; `rolesByCompany` is passed through in row data. Consumers can use `row.rolesByCompany[uuid].companyName` and `row.rolesByCompany[uuid].roles` when needed.
