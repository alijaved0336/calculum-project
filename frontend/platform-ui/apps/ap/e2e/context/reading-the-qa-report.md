# Reading the Published QA Results Report

Verified on 2026-09-28.

The QA pipeline publishes a Playwright HTML report at
`https://qa-test-results.hello-ada.com/<folder>/index.html` — for example `/sergio/`. No
credentials are needed. Read it **before** running anything locally: a local re-run on a
different environment often produces different symptoms and wastes an iteration.

## Extracting the data instead of clicking through it

The HTML page is a shell. All test data is embedded in it as a base64-encoded zip. Clicking
through the UI for a run with dozens of failures is slow; unpacking it takes one script.

1. Fetch `index.html`.
2. Regex out the payload of `<template id="playwrightReportBase64">data:application/zip;base64,…`
   and decode it. On 2026-08-18 the payload was a `window.playwrightReportBase64 = "…"`
   assignment; the report served on 2026-09-28 (Playwright 1.62) uses the template element.
3. Unzip the result. `report.json` holds the run statistics and, per test file, a `fileId`.
4. `<fileId>.json` holds the individual tests of that file, each with its error message and
   stack.
5. Attachments are not embedded. Each result lists them with a `path` such as
   `data/<sha1>.zip`, served next to the page:
   `https://qa-test-results.hello-ada.com/<folder>/data/<sha1>.zip` for traces, `.png` for
   screenshots, `.md` for the error context. A trace zip holds `test.trace` (test steps),
   `<n>-trace.trace` (actions, DOM snapshots, screencast frames) and `<n>-trace.network`
   (requests and responses, bodies under `resources/<sha1>`). The timeline of a hang is
   usually readable from those files without opening the trace viewer.

## What to do with it

Group the failures by error signature rather than reading them in order. Shared root causes
surface immediately that way, and on this repo they usually are shared: a stale selector in
`tests/utils/locators.ts`, or a broken shared flow in `tests/utils/Utils.ts`, cascades into
roughly a hundred failing tests that look unrelated in the UI.

Once the cluster is identified, look it up in [lessons-learned.md](lessons-learned.md) before
diagnosing it from scratch — several of the recurring signatures are already written up there
with their fix.
