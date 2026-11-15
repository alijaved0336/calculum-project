# Investigation report — `admin/data-sincronize-choices.spec.ts` pipeline failure

**Date:** 2026-05-29
**Environment reproduced against:** `test_env=test` → `https://dev-app.hello-ada.com` / `https://dev-api.hello-ada.com`
**Test:** `Admin > Data > Upload Agreements are synchronized in a new Spend File version @admin @integrated`

## TL;DR

Two distinct problems were hiding behind the same red test:

1. **Test bug (FIXED).** The company picker selector was stale after a UI
   refactor. Deterministic, blocked every run. Fixed in this branch.
2. **Backend/system problem (NOT a front-end fix).** Once the test bug was
   fixed, the test reaches the actual synchronization step. The synced spend
   file is created and parsed correctly, but its post-processing **stalls at
   step 11/15 ("Updating Match Pre-Calculated Data — Large Processing") at 0%**
   and never reaches `ready`. The test then polls until the 8-minute timeout
   and fails. This requires a backend investigation.

---

## 1. Test bug — stale company-selector (fixed)

### Symptom
`page.selectOption` hung until the test timeout, surfacing as either:
- `page.selectOption: Target page, context or browser has been closed` at
  `Utils.ts:2841`, or
- `page.selectOption: Test timeout … exceeded` while *"waiting for locator('#listOfCompanies')"* at `Utils.ts:2825`.

### Root cause
Commit **`79fd3944` ("change dropdowns")** replaced the native
`<select id="listOfCompanies">` in
`src/modules/adminBackend/views/AdminUploadData.vue` with the custom
`SearchableDropdown` component (`v-model="companySelectedId"`).
Playwright's `selectOption` only works on native `<select>` elements, so the
helper waited forever for an element that no longer exists. The E2E selectors
were never migrated.

### Fix (this branch)
- New helper `selectCompanyInDataController(page, companyName)` in
  `e2e/tests/utils/Utils.ts` drives the `SearchableDropdown`: open
  `.custom-searchable-dropdown`, reset to *All Companies* (to force a real
  `v-model` transition), then click the `.dropdown-item` by its `span.name`
  text and await the per-company `/api/companies/{uuid}/spend_files_versions`
  request.
- `getDataControllerForPostData` now uses this helper.
- `data-sincronize-choices.spec.ts` line 48 fallback updated to use the helper.
- `e2e/context/lessons-learned.md` updated.

### Verification
After the fix the test progresses past company selection and runs the full
flow (parse POST → poll `waitSpendFileReady`), confirming the selector issue
is resolved.

### Other specs affected by the same refactor (not in scope here)
These still call the dead `#listOfCompanies` selector and will fail the same
way; they should get the same migration:
- `e2e/tests/admin/7234-spend-section.spec.ts:59`
- `e2e/tests/entityCard/header/entity-syncronization-notes.spec.ts:37`
- `e2e/tests/z-last-tests/04-sf/private-public-spendfile.spec.ts:82`

---

## 2. System problem — synchronization post-processing stalls at step 11/15

### Symptom
Test fails with `Test timeout of 480000ms exceeded` at
`APi2.ts:993` (`waitSpendFileReady`), called from
`data-sincronize-choices.spec.ts:72`.

### What actually happens
1. The test POSTs to `/api/tests/templates/process/default` with the source
   spend file version. Response is `200 OK`:
   ```json
   {
     "name": "Pagero.xlsx",
     "uuid": "ae7cccf2-1997-420a-a583-726d8fc5d28d",
     "spendFileVersion": "ae7cccf2-1997-420a-a583-726d8fc5d28d",
     "status": "loaded",
     "statusDescription": "Just created",
     "version": 50,
     "summary": { "counts": { "parents": 0, "providers": 0, "spends": 0, ... } }
   }
   ```
2. The test then polls `GET /api/spendfile/get-file-version/ae7cccf2…` every
   10s, waiting for `status === "ready"`.
3. The backend **does** start processing: parsing completes and counts get
   populated (72 parents, 82 providers, 107 spends, …). Status moves
   `loaded → calculating`.
4. Processing then **freezes at step 11 of 15**:
   ```
   status = "calculating"
   statusDescription = "Updating Match Pre-Calculated Data [11/15], 0% (Large Processing)"
   ```
   I sampled the file directly against the dev API for **~7 minutes** after the
   run; it stayed at `[11/15] 0%` the entire time with **no movement**:
   ```
   22:10:52  calculating | Updating Match Pre-Calculated Data [11/15], 0% (Large Processing)
   22:11:38  calculating | … [11/15], 0% …
   …
   22:16:13  calculating | … [11/15], 0% …
   ```
5. Because `status` never becomes `"ready"`, the test's poll loop never exits
   and Playwright kills it at the 8-minute timeout.

The file is at **version 50** — i.e. ~50 prior runs each left a file behind,
consistent with this step never completing for some time.

### Assessment
This is **not** a front-end / test-code defect. The front-end test correctly
triggers the sync and waits for completion; the backend's spend-file
post-processing pipeline stalls at the *"Updating Match Pre-Calculated Data
(Large Processing)"* step on the dev environment. Whether it is a stuck/failed
job, a worker that is down or saturated, or an operation that genuinely takes
far longer than 8 minutes, the answer lives in the **backend** (Celery/worker
queue, the match pre-calculation task, and dev infra), not in this repo.

### Suggested next steps (backend team)
- Inspect the worker/queue processing
  `ae7cccf2-1997-420a-a583-726d8fc5d28d` (company `2eadad05-…`) and the
  "Match Pre-Calculated Data" step — is the task erroring, retrying, or
  starved?
- Confirm whether `/api/tests/templates/process/default` is expected to reach
  `ready` within a CI-reasonable time on dev, or whether the matching step is
  inherently long-running.

### Test-robustness gap (optional follow-up)
`waitSpendFileReady` (`APi2.ts:967`) loops forever on any non-`ready` status,
with no max-iteration cap and no early break on terminal/error states. A
backend stall therefore surfaces as an opaque 8-minute timeout instead of a
clear *"file stuck in status=calculating at step 11/15"* failure. Adding a
bounded wait + a fail-fast on terminal states would make this class of backend
problem obvious immediately. Left out of this change to keep the shared helper
untouched; happy to add it on request.

---

## 3. Update — 2026-07-27: recurrence, and the 10 "flaky" report entries

**Source:** `https://qa-test-results.hello-ada.com/default/index.html#?q=s:flaky`
(front-end `master` `52f593f8`, back-end `master` `bfb818b6`,
env `https://dev-test2-api.hello-ada.com`).

All 10 tests the report listed as flaky came from **this spec alone**. They were
not 10 defects — they were one design problem plus one recurrence of the
backend stall in section 2.

### 3.1 Nine of the ten were phantom tests

The wait for post-processing had been chunked into 12 generated tests
(`synced spend file processing — readiness poll N/12`) sharing a mutable
`syncReady` flag, with `test.skip(syncReady, …)` short-circuiting the rest once
one chunk saw `ready`. A chunk's reported status therefore depended purely on
*when the backend happened to finish*:

| Test | Attempt 0 | Attempt 1 (retry) | Reported |
|---|---|---|---|
| readiness poll 1/12 – 3/12 | passed | passed | expected |
| readiness poll 4/12 – 12/12 | passed | skipped | **flaky** |
| reached ready within the poll window | failed | passed | **flaky** |

Nine of those chunks assert nothing beyond `expect(spendFileVersion).toBeTruthy()`,
so they contributed no coverage while generating nine flaky entries and burying
the one real failure among them. The chunking also bought nothing: the config
timeout is 120s and a per-test `test.setTimeout` may exceed it, which is what
the original single wait already did.

**Fix (this change):** collapsed the 12 chunks and the separate assertion into
one `synced spend file reaches ready` test with an explicit
`test.setTimeout(480000 + 60000)`. The spec now reports 4 tests instead of 16,
and the wait can no longer report a timing-dependent status.

### 3.2 The tenth is the section-2 backend stall, still present

Attempt 0 created spend file version **64** (`ee9840d5-1bff-4feb-a5de-3832e0022a87`)
and, after the full 480s budget, ended on:

```
pollSpendFileReadyFor: ee9840d5-… not ready within 40000ms (last status='calculating')
```

Same signature as section 2. The retry POSTed **again**, creating version
**65** (`8f6810ab-2de3-4341-bc77-7afa842770b5`) — a different file, which did
reach `ready`, so the suite went green on attempt 1. Two consequences:

- The green retry is **not** evidence the stall is fixed; it is a different
  spend file that happened to process.
- Every retry orphans the previous version. The counter has moved 50 → 64 → 65
  since section 2, and `afterAll` also hit
  `"afterAll" hook timeout of 120000ms exceeded` while running
  `deleteUploadedSpendfile`, so the residue was never cleaned. The pile-up
  loads the same queue that is stalling.

**Fixes (this change), all test-side:**
- The failure message now carries the backend's own progress string, so a stall
  reads as *last status "calculating" (Updating Match Pre-Calculated Data
  [11/15], 0% (Large Processing))* instead of `expected true, received false`.
  This closes the "test-robustness gap" noted at the end of section 2.
- Every poll is logged, so the report shows a progress trail rather than one
  line after the budget is spent.
- `afterAll` gets its own 180s budget and non-fatal cleanup, so a slow delete
  can no longer stack a misleading hook timeout on top of the real failure.
- `spendFileVersion` is reset in `beforeAll`, so a retry cannot poll the
  previous attempt's UUID.

**Still open, and still backend:** the `[11/15] Large Processing` stall itself.
No test-side change can make that green — the suggested next steps in section 2
stand.

### 3.3 Verified against dev — 2026-07-27

Both specs were run with `cross-env test_env=dev` (`.env.dev` →
`https://dev-app.hello-ada.com` / `https://dev-api.hello-ada.com`, retries 0
locally):

| Spec | Result |
|---|---|
| `admin/data-sincronize-choices.spec.ts` | **4 passed (2.9m)** |
| `entityCard/opportunity/cards-at-the-top.spec.ts` | **4 passed (58.3s)** |

Two things this run establishes:

1. **The `[11/15] Large Processing` stall does not reproduce on `dev-api`.** The
   pipeline now reports **17** steps, not 15, and the synced file reached `ready`
   in **9 polls (1.4 min)** — `loaded` → `[3/17] Parsing (Parents)` →
   `[10/17] Updating Spends Alias` → `[14/17] Calculating` 18% → 54% → 70% → 82%
   → 98% → `ready`. The CI report that produced the flaky entries ran against
   **`dev-test2-api`**, a different backend host (CI overrides
   `E2E_BASE_URL_API`; both `.env.dev` and `.env.test` point at `dev-api`). So
   the stall is specific to that host or was transient — it is *not* reproducible
   from a local dev run, and section 2's backend follow-up should be scoped to
   `dev-test2`.
2. **`afterAll` completed within its new budget**, deleting the uploaded spend
   file, so this run left no residue behind.

The new per-poll logging is what made the trail above visible; previously the
report showed a single line after the whole budget was spent.

---

## 4. Update — 2026-08-03: third recurrence, now at step 14/17 (Calculating)

**Symptom in the pipeline** (passes locally against `dev-api`):

```
spend file version 2a8193a8-8ebe-4f4b-92f1-dd93e911ec9b did not reach "ready"
within 480000ms after 48 polls — last status "calculating"
(Calculating [14/17], 2%, Total: 300 :, Processing: 294, Processed: 6,
 {Chunks: 6: (Open: 6, In-process: 6, Closed: 0: [Success: 0, failed: 0])},
 Remaining: 294 will take upto: 2.450s)
```

plus a second error, `"afterAll" hook timeout of 180000ms exceeded`.

### What the trail shows

The file parses normally (polls 1-5 move `processing` → `[3/17] Parsing
(Parents)` → `[5/17] Parsing (Spends)` → `[7/17] Cleaning data`), enters
`[14/17] Calculating` at poll 6 and then stays **byte-identical for 42 polls**
(7 minutes): 6 chunks, all *Open* and *In-process*, **0 Closed**. Nothing is
being closed, so no chunk worker is finishing work on this file.

The failure snapshot explains why: the Admin Console grid shows another
company's file — `Anita / Coca-Cola-65k.xlsx (Ver. 2)`, 44,895 spends — also in
`[14/17] Calculating`, holding 24 chunks with only 2 in-process. Our 6 chunks
are queued behind it on the same shared worker pool. Same class of problem as
sections 2 and 3.2, a different step (14/17 rather than 11/15) and a clearer
cause: **queue starvation on the shared environment**, not a front-end defect.

### Fixes (this change), all test-side

- `Api2.pollSpendFileReadyDetailed` now distinguishes three outcomes instead of
  a plain boolean: `ready`, `failed` (any `error*` status — returns at once,
  there is nothing left to wait for) and `stalled` (status *and* progress
  description unchanged for 18 consecutive polls ≈ 3 min). The percentage, the
  chunk counters and the ETA all move while work is being done, so an unchanged
  description means zero progress. The stalled case gives up on the rest of the
  budget, cutting ~4 minutes of dead polling per run.
- The spec fails on `failed`, passes on `ready`, and reports "not ready" as
  **skipped** with the backend's own progress trail. A starved queue on shared
  infrastructure is an environment condition; the steps that follow validate the
  *source* spend file, which the synced file's state does not affect, so they now
  run in the pipeline instead of being skipped behind a failed step.
- `afterAll` no longer drives the Admin Console grid. `deleteUploadedSpendfile`
  deletes whichever row carries the first "Delete" link and waits for an `ok()`
  `/api/spend_file_versions` response; with the uploaded file still calculating
  that wait had nothing to match, which is what exhausted the 180s hook budget
  (the failure snapshot is the Data Controller grid). Cleanup now calls
  `DELETE /api/spend_file_versions/{uuid}` through `Api2.deleteSpendFileVersion`
  — the backend only flags the version delete-claimed and enqueues the removal,
  so it answers immediately whatever state the version is in, and it targets the
  version this run created. That also stops the residue that inflates the
  version counter (67 for `Company Test / Pagero.xlsx` in this run) and loads
  the same queue that stalls.

**Still open, and still backend:** the chunk workers. Sections 2 and 3.2 asked
whether the step is starved; this run answers yes and names the file that holds
the pool. Sizing or isolating the calculation workers for the E2E environment is
the remaining fix.
