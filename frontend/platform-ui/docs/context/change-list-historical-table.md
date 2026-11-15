# Checklist: ListHistorical – Table with CalculumGridGraphql

## Context
Implement the historical payment terms table in `ListHistorical.vue` using `CalculumGridGraphql.vue`, with columns and mock data as per the design image.

## Columns (from image)
1. Contractual Payment
2. Avg Days Paid
3. Contractual with Discount
4. Description
5. Date of agreement
6. Effective date
7. Source
8. PT Status (header: blue background)
9. Recently Agreed (header: blue background)
10. Spend Volume (currency)
11. Achieved Cash Flow (currency)

## Checklist
- [x] Define grid columns with field, title, width; headerClassName for PT Status and Recently Agreed (blue).
- [x] Create mock data (5 rows) matching image.
- [x] Use CalculumGridGraphql with gridData, gridColumns, filter=[], section, total, minimal toolbar.
- [x] Optional: style PT Status column cells (pink) via column className if supported.
- [x] Move column definitions to `entityCard/data/columns.ts` as `columnsListHistorical` and consume them in ListHistorical.vue.
- [x] Prepare for GraphQL: add `entityUuid` prop, `loadHistorical`, `getHistoricalQueryString()`, `fetchHistoricalData()`, `gridDataRef`, `onDataChange`, `onMounted` fetch; keep mock data as source until backend is ready.

## Files
- `src/modules/home/entityCard/components/opportunity/ListHistorical.vue`
- `src/modules/home/entityCard/data/columns.ts` (export `columnsListHistorical`)

## GraphQL preparation (when backend is ready)
- Replace placeholder in `getHistoricalQueryString()` with real query/collection name.
- In `fetchHistoricalData()`: call `graphqlUtils.getCollectionData(queryString)`, map `response.data.entityPaymentTermsHistory.edges` to `HistoricalRecord[]`, assign to `gridDataRef`.
- Parent passes `entityUuid` via `configId` to ListHistorical.
