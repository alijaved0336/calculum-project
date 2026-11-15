# admin/features/sme/smeBadgeUi.spec.ts — run summary

**Date:** 2026-04-17
**Environment:** `test_env=dev` → `https://dev-app.hello-ada.com` (API: `https://dev-api.hello-ada.com`)
**Test:** `e2e/tests/admin/features/sme/smeBadgeUi.spec.ts`
 - TC10232 — "The SME feature can be enabled and disabled" (`@tc-10232`)
 - TC10737 — "SME Test is adjusted so entities from Switzerland, India, Brazil, the United Kingdom, and Singapore are considered as SME" (`@tc-10737`)

## Initial result — FAILED

TC10232 failed at [smeBadgeUi.spec.ts:204](../../admin/features/sme/smeBadgeUi.spec.ts#L204):

```
Error: expect(received).toBeTruthy()
Received: false

  202 |       .locator("#sme-card-details-not-sme")
  203 |       .isVisible();
> 204 |     await expect(cardSectionSMEAvailable).toBeTruthy();
```

TC10737 did not run (serial suite halted after TC10232's failure).

Badge visibility on the supplier list (line 190) passed for the first test entity ("2N Telekomunikace A.S.", `isSME=false`). The failure was on the subsequent assertion that, once the Company Details tab opens, the `#sme-card-details-not-sme` section is rendered.

## Root cause

The ids `#sme-card-details-not-sme` and `#sme-card-details-sme` no longer exist anywhere in the app.

Commit `c2f90b4c7a` ("fix SME Teaser when feature disabled", 2026-03-08) deleted `src/modules/home/entityCard/components/details/SMEDetails.vue` — which carried both ids — and consolidated the rendering into [SmeDetailBox.vue](../../../../src/modules/home/entityCard/components/details/SmeDetailBox.vue). The new component renders both SME and non-SME states through the same `v-if="smeFeatureEnabled"` block, with only the `SmeBadge` vs `SmeBadgeExcluded` icon distinguishing them (both share the `.sme-badge-icon` class).

The E2E test was not updated in that commit, so its details-tab assertions have been broken since 2026-03-08.

## Classification

- **Primary cause — product-code regression in test hooks.** The refactor dropped DOM ids that the E2E suite depended on. The ids were not user-facing, but they were stable test contracts. Test itself remains semantically correct.
- **Secondary observation — E2E auth flakiness.** During re-verification, `global-setup.ts` hit repeated `page.waitForResponse` 30s timeouts on the auth callback against `dev-app.hello-ada.com`. Unrelated to this fix; matches prior notes in [create-company.spec.md](create-company.spec.md).

## Fix applied

[src/modules/home/entityCard/components/details/SmeDetailBox.vue:3](../../../../src/modules/home/entityCard/components/details/SmeDetailBox.vue#L3) — added a conditional id on the outer `.row` of the feature-enabled branch:

```pug
template(v-if="smeFeatureEnabled")
    .row(:id="isSME ? 'sme-card-details-sme' : 'sme-card-details-not-sme'")
```

This restores the two DOM hooks (`sme-card-details-sme` / `sme-card-details-not-sme`) the test expects, without altering layout, behavior, or styling. No other callers referenced these ids (verified via grep across the repo).

No test-code changes.

## Re-run result — BLOCKED (infrastructure)

Two re-runs against `dev-app.hello-ada.com` failed in `globalSetup` with an auth-callback timeout before any test body ran:

```
TimeoutError: page.waitForResponse: Timeout 30000ms exceeded while waiting for event "response"
  at Api2.processAuthenticationEventFromBrowser (e2e/tests/utils/APi2.ts:300)
  at tryLogin (e2e/global-setup.ts:109)
```

The fix itself is a pure DOM-hook restoration and is analytically verified against the initial failure mode: the assertion checked `isVisible()` on `#sme-card-details-not-sme`, and that id is now emitted whenever the feature is enabled and `isSME === false`. **Recommend re-running once the dev auth endpoint is responsive**:

```bash
npx playwright test e2e/tests/admin/features/sme/smeBadgeUi.spec.ts --reporter=list
```

Expected outcome: both TC10232 and TC10737 pass (TC10737 already uses `.sme-badge-icon`, unaffected by this change).
