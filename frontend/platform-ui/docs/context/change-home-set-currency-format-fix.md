# Fix: home-set-currency-format.spec.ts

## Root Causes Found

### 1. `await` inside `Promise.all` (anti-pattern)
The original code used `await` inside the `Promise.all` array:
```typescript
await Promise.all([
  page.waitForResponse(...),
  await page.locator("...").click(), // ← wrong: click fires before waitForResponse registers
]);
```
Fix: remove `await` from the click action inside `Promise.all`.

### 2. Wrong API endpoint → 403 Forbidden
`HomePreferences.vue`'s `savePreference()` called `welcomeStore.companyUserInfo()` without
`isFromUserPanel: true`, causing it to use `/api/admin/users/{uuid}`.
Non-admin users (e.g. `joel+testnotadmin@calculum.ai`) get **403 Forbidden** on that endpoint.
`waitForResponse` required `response.ok()`, so it waited forever for a 200 that never came.

**Frontend fix** (`src/modules/home/views/HomePreferences.vue`):
Added `isFromUserPanel: true` to `savePreference()` params so the correct `/api/users/{uuid}` endpoint is used.

**Test fix**: updated `waitForResponse` predicate to match `/api/users/` (excluding `who_am_i`).

### 3. Unsaved-changes confirmation modal race condition
When the route-leave guard fires (e.g. previous failed save left `unsavedChanges = true`),
a "Confirm – You have made some modifications" modal appears. In that case the API call only
happens when the **modal's** Save button is clicked, not the form's.

**Test fix**: extracted `clickSavePreferences(page)` helper that:
1. Checks if the confirm modal is already visible → clicks modal Save.
2. Otherwise clicks the form's bottom Save button.
3. Waits 2 s to see if the modal appears after the click → clicks modal Save if it does.

### 4. Stale state between runs
A previous failed run could leave Albania selected in the database, causing the test to
start in an unexpected state.

**Test fix**: reads `#currencyFormat` current value at the start and resets to `US` before
the actual test steps if needed.

## Files Modified
- `e2e/tests/home/home-set-currency-format.spec.ts`
- `src/modules/home/views/HomePreferences.vue` (added `isFromUserPanel: true`)
