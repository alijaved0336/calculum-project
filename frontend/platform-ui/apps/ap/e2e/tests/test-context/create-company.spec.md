# admin/create-company.spec.ts — run summary

**Date:** 2026-04-17
**Environment:** `test_env=dev` → `https://dev-app.hello-ada.com` (API: `https://dev-api.hello-ada.com`)
**Test:** `e2e/tests/admin/create-company.spec.ts` — "Create Company One Step flow" (`@flakyResolved @api @integrated @admin @us-2172`)

## Initial result — FAILED

On line 95: `await teamLoc.fill("team name news")` threw:

```
locator.fill: Error: Cannot type text into input[type=number]
  - waiting for getByPlaceholder('Insert name new team').first()
  - locator resolved to <input min="1" max="1000" type="number" id="limit-user" ...>
```

## Root cause

The test expected two separate inputs:

1. A team-name **text** input with placeholder "Insert name new team"
2. A distinct `#limit-user` **number** input

In the current `CreateCompanyAdminNewFlow.vue` only one element carries that placeholder — `#limit-user` itself (a numeric input). `.first()` matched that element, then `fill("team name news")` was rejected by Playwright because the input is `type="number"`.

**Why:** commit `ed49e8737c` ("refactor(company): remove team from company admin flows", 2026-02-16) intentionally removed the `<input#company-team-new>` team-name text field from the one-step create-company flow. The test was not updated to match.

## Classification

- **Primary cause — test-code problem.** The test drives an input that no longer exists in the product after a deliberate refactor.
- **Adjacent platform bug (cosmetic, not the failure cause).** `#limit-user` still uses `:placeholder="$t('welcomeTeam.form.teamNew')"` → "Insert name new team" on a numeric user-limit field. Same issue in `EditCompanyAdmin.vue`.

## Fixes applied

1. **Test fix** — [e2e/tests/admin/create-company.spec.ts:93-95](../../admin/create-company.spec.ts#L93-L95): removed the 3-line team-name block; `#limit-user` interaction retained.
2. **Global-setup robustness** — [e2e/global-setup.ts:86](../../../global-setup.ts#L86): removed the unconditional `throw error;` so a successful retry after a transient login flake no longer kills the run. Only a second failure now propagates.
3. **Platform cosmetic bug** — filed in Azure DevOps rather than changed in this run (risk of unrelated scope creep in an E2E-fix task).

## Re-run result — PASSED

```
✓  1 [chromium] › e2e/tests/admin/create-company.spec.ts:38:5 › Create Company One Step flow ... (39.5s)
1 passed (58.0s)
```

The newly created company was cleaned up via the DELETE API call in the test body; the `afterEach` hook restored the default login.

## Azure DevOps bug filed

- **ID:** 14965
- **URL:** https://dev.azure.com/calculum/ADA/_workitems/edit/14965
- **Title:** Stale placeholder "Insert name new team" shown on user-limit input in Create/Edit Company admin form
- **Type / State:** Bug / New
- **Area / Iteration:** ADA / `ADA\Sprint 107`
- **Priority / Severity:** 3 / 4 - Low
- **Parent:** Feature #13739 ("Bugs P(1)-P(3)") — linked via `Child` relation (verified on both sides)
- **Affected files:**
  - `src/modules/adminBackend/views/CreateCompanyAdminNewFlow.vue` line 206
  - `src/modules/adminBackend/views/EditCompanyAdmin.vue` line 209
- **Suggested fix:** replace `:placeholder="$t('welcomeTeam.form.teamNew')"` with an appropriate i18n key describing the numeric user limit (e.g. reuse `adminBackend.createCompanyAdmin.form.limitUserInput` or add a dedicated key).
