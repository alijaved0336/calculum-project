# Checklist: Custom column companyUiGroupName with badges

## Context
- Column `companyUiGroupName` in `defaultCompaniesUsersGridColumns` (admin backend) shows group names.
- Value can be: empty, single word, or comma-separated list.
- Requirement: render one badge per comma-separated value.

## Planned changes
1. **columns.ts**: Change `companyUiGroupName` cell from `'textTemplate'` to `'companyUiGroupNameBadges'`.
2. **New component** `CompanyUiGroupNameColumn.vue`: 
   - Props: `dataItem`, `field`.
   - Get value with `getNestedValue(field, dataItem)`.
   - If empty/null/undefined: show "-".
   - If string: split by comma, trim, filter empty strings, render a badge per item.
3. **CalculumGridGraphql.vue**: Register template `#companyUiGroupNameBadges` and use `CompanyUiGroupNameColumn`; add import and component.

## Edge cases
- Empty string → "-"
- Null/undefined → "-"
- Single word (no comma) → one badge
- Multiple words (comma-separated) → one badge each
- Trailing/leading spaces in segments → trim before display
- Empty segments (e.g. "A,,B") → filter out empty

## Status
- [x] Checklist created
- [x] Component created
- [x] Grid template registered
- [x] columns.ts updated
