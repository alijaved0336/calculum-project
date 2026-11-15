## Checklist: Extract async helpers from stores to module scope

### Context
Some async functions inside Pinia stores (`home.ts`, `entityCard.ts`) do not use store state and are flagged by the reviewer to be moved to the outer scope. We will extract them to module-level helpers in the **same files** and reuse them from the store bodies.

### Functions to extract
- `fetchResultAnalysisReferenceDate(params)` from `src/stores/home.ts`
- `updateResultAnalysisReferenceDate(params)` from `src/stores/home.ts`
- `getPaymentTermsVolumeHistory(params)` from `src/stores/entityCard.ts`

### Plan
- [x] Create this checklist in `docs/context`.
- [x] In `home.ts`, move the two async functions above the store definition as plain helpers and reference them from the store body.
- [x] In `entityCard.ts`, move `getPaymentTermsVolumeHistory` to module scope and reference it from inside the store.
- [x] Run lints on both files to confirm suggestions are resolved.
- [ ] Update this doc to mark items as done (or delete if merged into a broader store refactor doc).

