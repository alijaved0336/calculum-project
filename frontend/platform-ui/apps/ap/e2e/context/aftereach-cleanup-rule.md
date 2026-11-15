# When an `afterEach` Cleanup Step May Swallow Its Errors

Established 2026-05 after asking whether the try/catch pattern in
`e2e/tests/create-company.spec.ts` should be applied to `afterEach` blocks generally. It should
not. It is situational, and the conditions are below.

## Wrap in try/catch only when all three hold

1. **The step is best-effort, not load-bearing.** It is a pre-warm or an optimization for the
   next spec, and skipping it leaks no state.
2. **The failure mode is known and environmental, and you can name it.** For example, the dev B2C
   tenant dropping the post-login `/api/users/<uuid>` response and timing out at 30 seconds. The
   catch block's comment must name the specific cause.
3. **Recovery exists downstream.** The next spec's `beforeEach` re-detects and corrects the
   state — typically through `ensureLogin`.

## Never wrap when

- The cleanup is load-bearing: deleting rows the test created, or restoring shared state that
  nothing else rolls back.
- The `afterEach` contains assertions about the test outcome. Those failures are real signal.
- The failure mode is unknown. Diagnose first. Suppressing an undiagnosed failure converts
  flakiness into invisibility, which is worse.

## When wrapping

Log a warning with the error message, and add a comment naming both the specific environmental
cause and the downstream recovery path. The reference example is the `afterEach` in
`e2e/tests/create-company.spec.ts` wrapping `ensureDefaultLogin`, justified by the dev B2C
`/api/users/<uuid>` timeout and the next spec's `ensureLogin` recovery.
