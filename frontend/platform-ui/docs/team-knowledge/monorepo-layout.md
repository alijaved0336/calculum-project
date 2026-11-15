# Monorepo Layout and the Stale Root Guidance

**Applies to:** Front-End repository, all apps and packages
**Last updated:** 2026-08-20
**Verified on:** 2026-08-20

## 1. The fact

The repository was restructured into a pnpm workspace with turbo — "Merged PR 13122: Create:
monorepo", commit `6db1a203cd`, around June 2026. What used to be the repository root is now
`apps/ap`.

| Path | Contents |
|---|---|
| `apps/ap` | The main Accounts Payable app. Its `src/`, `e2e/`, and `tests/` are the former repository root. |
| `apps/ar` | Accounts Receivable app, with its own unit tests. |
| `apps/apv2` | Second-generation AP shell. |
| `packages/auth`, `packages/core`, `packages/design-system` | Shared packages consumed by the apps. |

Workspace configuration lives in `pnpm-workspace.yaml` and `turbo.json` at the root.

## 2. What is stale because of it

`src/services/...`, `e2e/tests/...`, `tests/Helpers/...`, `vitest.config.ts`, and
`vue.config.js` as if they were at the repository root. They are not — the root has no `src/`
directory at all.

The architectural content of that file is still broadly correct for `apps/ap`. Only the paths
are wrong.

## 3. Why it matters

Every path in the root guidance resolves to nothing from a fresh shell, and a search that starts
from a wrong path returns an empty result rather than an error. The failure mode is silent: work
proceeds on the assumption that a file was deleted or a convention abandoned, when it simply
moved one level down.

## 4. How to apply

  relying on it.
- Run app-level commands from the app directory, not from the root. Playwright config is
  `apps/ap/playwright.config.ts`; unit test config is under the same app.
- Use `pnpm` at the root. A plain `npm install` at the workspace root has produced a duplicated
  Playwright runner before — the symptom and fix are recorded in
  [apps/ap/e2e/context/running-tests-locally.md](../../apps/ap/e2e/context/running-tests-locally.md).
  the same change. A full refresh of that file is separate, deliberate work.

## 5. Related notes

- [E2E knowledge map](e2e-knowledge-map.md)
- [Sibling repositories](sibling-repositories.md)
