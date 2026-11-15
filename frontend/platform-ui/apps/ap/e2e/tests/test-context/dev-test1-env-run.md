# E2E run against `dev-test1` environment — blocked by MFA

**Date:** 2026-04-17
**Requested:** run `e2e/tests/admin/features/sme/smeBadgeUi.spec.ts` and `e2e/tests/admin/create-company.spec.ts` against:
 - Front URL: `https://dev-test1-ui.hello-ada.com`
 - Back URL: `https://dev-test1-api.hello-ada.com`

## Setup performed

Created [e2e/.env.dev-test1](../../.env.dev-test1) mirroring `.env.dev` with the two URLs swapped. Invoked via `test_env=dev-test1 npx playwright test …`.

This successfully routes the run to the target environment (confirmed in the run banner):

```
Base URL               :  https://dev-test1-ui.hello-ada.com
Base URL(API)          :  https://dev-test1-api.hello-ada.com
```

## Outcome — BLOCKED in `globalSetup`

`globalSetup` fails on `page.waitForResponse` for `/api/users/{uuid}` (30s timeout) at [e2e/tests/utils/APi2.ts:300](../../utils/APi2.ts#L300), then retries once after 2 min, then throws.

```
TimeoutError: page.waitForResponse: Timeout 30000ms exceeded while waiting for event "response"
  at Api2.processAuthenticationEventFromBrowser (e2e/tests/utils/APi2.ts:300)
  at tryLogin (e2e/global-setup.ts:109)
```

## Root cause — MFA required on dev-test1

Extracting the Playwright trace (`test-results/failed-setup-trace.zip`) and inspecting the final page screenshot, the browser is sitting on a **Microsoft Authenticator "Verification"** page — a QR-code / TOTP enrollment flow — after clicking "Next" on the login form.

The `dev-test1` tenant enforces MFA for `joel+testnotadmin@calculum.ai`; the `dev` tenant (which works today) does not. `globalSetup` only knows how to fill email + password and click `#next`; it has no MFA-handling code. So the auth-callback responses the setup listens for (`/api/session/info`, `/api/users/{uuid}`, `?signin_success=true`) are never emitted, and both test specs are blocked before their first line runs.

This is not a regression in the test or the product — it is an environment-level auth configuration mismatch.

## Consequence for `create-company.spec.ts`

Not executed — it shares the same `globalSetup` and would hit the identical MFA wall. Re-running it against dev-test1 without first resolving auth would only produce the same timeout.

## Paths forward (require action outside this run)

1. **Disable MFA for the E2E service accounts on dev-test1.** Simplest. Matches the dev-app tenant's posture. Needs infra/identity-provider admin.
2. **Provision a dedicated non-MFA test user on dev-test1** and add its credentials to `.env.dev-test1`. Scoped alternative if MFA can't be globally disabled.
3. **Teach `globalSetup` to handle TOTP.** Add the MFA secret to env, compute TOTP in the setup, and type it after the first `#next` click. Higher effort; stores a long-lived secret in env files.
4. **Seed `state.json` from a manual login.** A developer logs in once through the browser, copies the resulting cookies/storage into `e2e/state.json`, and Playwright reuses it. Fragile — expires with session lifetime — but unblocks one-off runs.

## Files touched in this run

- Added [e2e/.env.dev-test1](../../.env.dev-test1). Kept for future re-runs once MFA is resolved; revert by deleting the file.
- No product or test changes. The `SmeDetailBox.vue` fix from [smeBadgeUi.spec.md](smeBadgeUi.spec.md) is still in place and independent of this run.

## Recommended next step

Confirm with infra which of paths 1/2/3 is preferred before attempting another dev-test1 run. Path 1 is lowest-effort and matches how dev-app is already configured.

## Update — 2026-04-17 (same day, after MFA was removed)

MFA was lifted on the E2E service accounts for dev-test1. Re-ran both specs.

| Test | Result |
|---|---|
| `e2e/tests/admin/create-company.spec.ts` (`@us-2172`) | ✅ PASSED (55.3s) |
| `e2e/tests/admin/features/sme/smeBadgeUi.spec.ts` TC10232 (`@tc-10232`) | ❌ FAILED — same assertion as the original dev run |
| `e2e/tests/admin/features/sme/smeBadgeUi.spec.ts` TC10737 (`@tc-10737`) | — did not run (serial suite halted by TC10232) |

### Why `smeBadgeUi` still fails on dev-test1

Playwright runs against the **deployed build** on `dev-test1-ui.hello-ada.com`. The fix for this test is in product code — [src/modules/home/entityCard/components/details/SmeDetailBox.vue:3](../../../../src/modules/home/entityCard/components/details/SmeDetailBox.vue#L3), commit `e641890e72` ("Fixing SME") on branch `fixing-tests-sergio-abril`. Until that branch is merged to `master` and dev-test1 is redeployed, the old DOM (missing `#sme-card-details-sme` / `#sme-card-details-not-sme`) is what the browser sees, so the assertion at [smeBadgeUi.spec.ts:204](../../admin/features/sme/smeBadgeUi.spec.ts#L204) reproduces the pre-fix failure.

Contrast with `create-company.spec.ts`: that fix is entirely test-code (lives in the `.spec.ts` itself), so Playwright executes the fixed spec against whatever backend is deployed — hence it passes on dev-test1 today.

### Action

Merge `fixing-tests-sergio-abril` and wait for the dev-test1 deploy; then re-run `smeBadgeUi.spec.ts` to confirm green. No further local changes required.
