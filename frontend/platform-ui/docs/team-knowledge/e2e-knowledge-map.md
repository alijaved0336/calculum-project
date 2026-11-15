# Where End-to-End Test Knowledge Lives

**Applies to:** Playwright end-to-end tests under `apps/ap/e2e/`
**Last updated:** 2026-09-28
**Verified on:** 2026-08-20 (the QA runner timeout sentence: 2026-09-28, from the 2026-09-24 QA report)

## 1. The fact

End-to-end knowledge is not kept in this directory. It is kept next to the tests, because it
changes with them. This note exists only so that it can be found from here.

| Location | What it holds |
|---|---|
| [apps/ap/e2e/context/README.md](../../apps/ap/e2e/context/README.md) | Index of the E2E notebook and the rule for updating it. |
| [apps/ap/e2e/context/lessons-learned.md](../../apps/ap/e2e/context/lessons-learned.md) | Chronological session log and the root-cause library — B2C logout and login races, Kendo popup interception, Kendo row-scope violations, budget exhaustion, the `state.json` Pinia trap — plus the anti-patterns already tried and rejected. |
| [apps/ap/e2e/context/running-tests-locally.md](../../apps/ap/e2e/context/running-tests-locally.md) | Shell and PATH quirks on this machine, the duplicated Playwright runner failure and its fix, how to target one environment, and the base URL per environment. |
| [apps/ap/e2e/context/reading-the-qa-report.md](../../apps/ap/e2e/context/reading-the-qa-report.md) | How to extract per-test errors from the published QA results page. |
| [apps/ap/e2e/context/aftereach-cleanup-rule.md](../../apps/ap/e2e/context/aftereach-cleanup-rule.md) | When an `afterEach` cleanup step may suppress its errors and when it must not. |
| [.cursor/rules/one-program-per-spend-file.md](../../.cursor/rules/one-program-per-spend-file.md) | Hard rule — program create, delete, and clone flows are gone; each spend file has exactly one program. Read before editing any test that touches a program. |

Configuration and shared code: `apps/ap/playwright.config.ts` — test timeout 120 seconds, action
timeout 15 seconds, one worker. The QA pipeline runner does not apply that action timeout: in the
2026-09-24 report every action ran without one, with 1 retry and a 1800x1024 viewport (see the
2026-09-28 entry of `lessons-learned.md`). Give an action that can meet a missing element an
explicit `timeout`, or it waits for the whole test budget there. Selectors are centralised in
`apps/ap/e2e/tests/utils/locators.ts`, and shared flows such as `changeToSpendFile` and
`changeCompany` live in `apps/ap/e2e/tests/utils/Utils.ts`. A single stale locator in either file
cascades into roughly a hundred failures, so a large failure count is evidence about the shared
helpers rather than about the specs.

`e2e/state.json` is no longer tracked in git — commit `4a8ce22743`. Global setup regenerates it.

## 2. Why it matters

The two most expensive habits in E2E work on this repo are re-diagnosing a root cause already
written down, and running tests locally before reading the failure artifact from the pipeline.
Both are avoidable by reading the folder above first.

## 3. How to apply

- Before diagnosing any failing Playwright test, read `lessons-learned.md` — especially for
  authentication, Kendo grid, or login and logout symptoms.
- Fetch the Playwright HTML report or the QA report before running anything locally.
- After a session that touches E2E tests, append to `lessons-learned.md`. Other sessions append
  concurrently, so re-read the tail before editing, and do not rewrite older entries.

## 4. Related notes

- [Monorepo layout](monorepo-layout.md) — why the old `e2e/` paths no longer resolve
- [Sentry issue triage](sentry-issue-triage.md)
