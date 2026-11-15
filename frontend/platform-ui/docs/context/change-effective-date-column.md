## Checklist: Add \"Effective Date\" column before \"Next Review Date\" in all grids

### Context
Requirement: All grids that currently show a \"Next Review Date\" column must include a new \"Effective Date\" column immediately to its left.

### Places to update
- [ ] Global grid column definitions (if any) for `nextReviewDate` (likely in `modules/home/data/globalColumns.ts`).
- [ ] Plan module GraphQL columns: `src/modules/home/plan/data/graphqlColumns.ts` (uses `...globalColumns.nextReviewDate`).
- [ ] Entity card GraphQL columns: `src/modules/home/entityCard/data/graphqlColums.ts` (also uses `...globalColumns.nextReviewDate`).
- [ ] Any specific grid configs that define a `nextReviewDate` column inline instead of via `globalColumns`.

### Implementation steps
- [ ] Add a reusable `effectiveDate` column definition in `globalColumns` (field, title, width, etc.).
- [ ] Ensure translations exist for the new column label (e.g. `home.entityCard.results.effectiveDate` or a global key if reused).
- [ ] Wherever `...globalColumns.nextReviewDate` is used in column arrays, inject `effectiveDate` immediately before it (e.g. `[...globalColumns.effectiveDate, ...globalColumns.nextReviewDate]` or adjust groups).
- [ ] For any grid that defines `nextReviewDate` directly (not via `globalColumns`), insert an `effectiveDate` column immediately before its definition.
- [ ] Run lints and visually verify at least one grid per area (plan grids, entity card grids) to confirm ordering and labels.

### Files
- `src/modules/home/data/globalColumns.ts` (or equivalent global definitions)
- `src/modules/home/plan/data/graphqlColumns.ts`
- `src/modules/home/entityCard/data/graphqlColums.ts`
- Any other module where `nextReviewDate` appears in grid column configs.