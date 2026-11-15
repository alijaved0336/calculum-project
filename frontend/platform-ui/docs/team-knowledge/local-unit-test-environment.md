# Local Unit Test Environment

**Applies to:** Front-End repository, `pnpm test` (turbo) across `apps/ap`, `apps/ar`, `apps/apv2`
**Last updated:** 2026-09-28
**Verified on:** 2026-09-28, Node v25.9.0, macOS

## 1. The fact

Two environmental problems make the unit suites fail locally even when the code is correct.

| Symptom | Cause | Workaround |
|---|---|---|
| 34 `apps/ar` test files fail to load with `TypeError: this.storage.getItem is not a function`, thrown from `SecureLS` in `packages/core/src/createAppPinia.ts` | Node 25 enables its built-in Web Storage by default. Its global `localStorage` has no methods unless `--localstorage-file` is given, and it shadows the jsdom one. `apps/ap/tests/setup.ts` replaces `global.localStorage` with a mock, so AP is unaffected; `apps/ar/tests/setup.ts` does not. | Run with `NODE_OPTIONS=--no-experimental-webstorage`, or use Node 22. |
| 6 `apps/ap` test files fail to load with `FirebaseError: auth/invalid-api-key` | Firebase initializes at import in `apps/ap/src/composables/firebase/config.ts`, and the local `apps/ap/.env` defines no `VITE_*_FB` keys. | Export placeholder values for `VITE_API_KEY_FB`, `VITE_AUTH_DOMAIN_FB`, `VITE_PROJECT_ID_FB`, `VITE_STORAGE_BUCKET_FB`, `VITE_MESSAGING_SENDER_ID_FB`, `VITE_APP_ID_FB`. |

The repository pins no Node version (no `.nvmrc`, no `engines` field), so nothing warns about the
first one.

Two further traps in the same run: `pnpm test -- --run` is rejected by turbo (`unexpected argument
'--run'`), and when one package fails turbo cancels the others, so a failing AR run hides the AP
result. Set `CI=true` instead — vitest then runs once without watch mode.

## 2. Why it matters

The pre-commit rule (`.cursor/rules/pre-commit-tests.md`) blocks a commit on any test failure.
Both failures are identical with or without the change being committed, so reading them as a
regression wastes time, and bypassing the rule is not allowed.

## 3. How to apply

Run the full suite locally as:

```bash
NODE_OPTIONS=--no-experimental-webstorage \
VITE_API_KEY_FB=placeholder VITE_AUTH_DOMAIN_FB=placeholder.firebaseapp.com \
VITE_PROJECT_ID_FB=placeholder VITE_STORAGE_BUCKET_FB=placeholder.appspot.com \
VITE_MESSAGING_SENDER_ID_FB=000000000000 VITE_APP_ID_FB=1:000000000000:web:placeholder \
CI=true pnpm test
```

On 2026-09-28 this passed: AP 198 files / 2824 tests, AR 116 files / 1422 tests (7 skipped),
APv2 1 file / 5 tests. If a failure remains, confirm it also fails without your change before
calling it pre-existing.

After merging master, run `pnpm install --frozen-lockfile` if `pnpm-lock.yaml` changed —
`node_modules` lagging the lockfile shows up as unresolved imports (for example `swiper/vue`).

The Node 25 problem expires if `apps/ar/tests/setup.ts` gains a `localStorage` mock like AP's, or
if a Node version is pinned. Re-verify against those two files.

## 4. Related notes

- [Monorepo layout](monorepo-layout.md) — why the suites run through turbo
