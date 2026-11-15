# Fix: Kendo Grid Column Menu Click Flakiness

## Problem
`filterByField` in `e2e/tests/utils/kendoChartRelated.ts` (lines 31-33) has a flaky
`.click()` on the Kendo Grid column menu link.

```typescript
const column = page.getByRole("link", {name: `${propertyName} Column Menu`})
await column.click();  // ← flaky
```

## Root Cause
Kendo Grid column menu links (`<a role="link" name="X Column Menu">`) are:
1. Always in the DOM but **CSS-hidden** (opacity 0) until the user hovers the column header.
2. May be **outside the viewport** when the grid has many columns.
3. `page.click()` without `force: true` requires the element to be visible → fails when
   Playwright checks visibility before the hover state is applied.

## Fix
- Use `scrollIntoViewIfNeeded()` to ensure the column header is in the viewport.
- Use `force: true` on the click to bypass the CSS-visibility check (the element IS in
  the DOM; the CSS opacity/display is a Kendo hover effect).
- Wrap the click + menu-open verification inside `retryOperation` (3 attempts) so
  transient timing issues are automatically retried.
- After clicking, wait for the filter popup (first `getByLabel` target) to be visible
  before proceeding.

## Also Fixed
- Removed leftover `await page.pause()` from `manageTab.spec.ts` (debugging artifact).

## Files Modified
- `e2e/tests/utils/kendoChartRelated.ts`
- `e2e/tests/admin/features/manageTab.spec.ts`
