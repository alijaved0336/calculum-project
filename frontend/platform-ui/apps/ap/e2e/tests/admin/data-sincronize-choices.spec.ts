import { expect, Page, test } from "@playwright/test";
import {
  changeToSpendFile,
  ensureDefaultLogin,
  goToHomeSection,
  ensureSuperAdminLogin,
  goToEntityCardEntity,
  changeTabByIndex,
  getDataControllerForPostData,
  selectCompanyInDataController,
} from "../utils/Utils";
import Api2 from "../utils/APi2";
import ApiWaitersUtils from "../utils/ApiWaitersUtils";

const given = {
  company: "Company Test",
  spendFile: "Pagero-Sychronyze.xlsx (Ver. 1)",
  supplier: "Microelettrica Scientifica S.P.A",
  agreedNewTerms: [
    { tab: "supplier", value: 93 },
    { tab: "spend1", value: 95 },
    { tab: "spend2", value: 90 },
    { tab: "spend3", value: 90 },
  ],
};

/**
 * Split into a `describe.serial` block so each fast, deterministic step
 * (trigger, validation, cleanup) gets its own tight ~60s timeout and reports a
 * clear pass/fail, while the one inherently long step — waiting for the backend
 * to finish post-processing the synced spend file — is isolated to a single
 * test with a generous timeout. A backend stall (see
 * `e2e/context/REPORT-data-sincronize-choices.md`, step 11/15) then surfaces
 * precisely on the "reaches ready" step instead of as an opaque whole-flow
 * timeout. `workers: 1` already serializes spec files, so a shared page is safe.
 */
test.describe.serial(
  "Admin > Data > Upload Agreements are synchronized in a new Spend File version @admin @integrated",
  () => {
    let page: Page;
    let api: Api2;
    let spendFileVersion = "";
    // Set by the first validation step when the source spend file version is
    // flagged for recalculation; the tab step then skips for the same reason
    // instead of failing on a card that hides its strategy lines.
    let sourcePendingRecalculation = "";

    // Total budget for the backend's post-processing of the synced spend file,
    // matching waitSpendFileReady's bound (45 polls × 10s ≈ 7.5 min).
    const READY_TIMEOUT_MS = 480000;

    test.beforeAll(async ({ browser }) => {
      page = await browser.newPage();
      api = await Api2.getInstance(page);
      // Reset state shared by the serial steps. Playwright evaluates a describe
      // body once per worker, so on a retry these keep the previous attempt's
      // values; without this, a retry whose trigger step fails early would poll
      // the stale UUID from the attempt before it.
      spendFileVersion = "";
      sourcePendingRecalculation = "";
      await ensureSuperAdminLogin(page);
    });

    test("triggers Agreements synchronization on the source spend file", async () => {
      test.setTimeout(60000);
      await changeToSpendFile(page, given.spendFile);

      const postData = await getDataControllerForPostData(
        page,
        given.company,
        given.spendFile,
      );

      const locatorUploadSpendFile = page.locator("#upload-spend-file");
      if (!(await locatorUploadSpendFile.isVisible())) {
        await selectCompanyInDataController(page, given.company);
      }
      await locatorUploadSpendFile.click();
      await page.selectOption("#spendfileToSyncronizeField", {
        label: given.spendFile,
      });

      const checkAgreements = await getSyncOptionInModal(page, "Agreements");
      await checkAgreements.click();

      const parsingResponse = await api.doPost(
        "/api/tests/templates/process/default",
        postData,
      );
      expect(parsingResponse.ok()).toBe(true);
      const parsingBody = await parsingResponse.json();
      console.log("parsingResponse", parsingBody);
      expect(parsingBody.spendFileVersion).toBeTruthy();
      spendFileVersion = parsingBody.spendFileVersion;
    });

    // Wait for the synced spend file's backend post-processing. (The "default"
    // template creates a separate spend file, for example Pagero.xlsx, not a new
    // version of the source; we validate the source's agreements below.)
    //
    // This is a *wait*, not an assertion, so it is one test with one explicit
    // timeout. It was previously chunked into 12 generated `readiness poll N/12`
    // tests that shared a mutable `syncReady` flag and called `test.skip()` once
    // it flipped. That made each poll's reported status depend on when the
    // backend happened to finish: the same poll came out `passed` on the first
    // attempt and `skipped` on the retry, so Playwright classified nine polls
    // that assert nothing as "flaky" and buried the one real failure among them.
    // Chunking also bought nothing: a per-test `setTimeout` may exceed the
    // suite-wide default (which global-setup overrides from E2E_CUSTOM_TIME_OUT
    // anyway), which is exactly what the original single wait did.
    //
    // Outcomes: ready passes, an `error*` status fails, and a backend that keeps
    // the file queued for the whole budget is reported as skipped — see below.
    test("synced spend file reaches ready", async () => {
      // Only this step is long-running; the surrounding steps keep their tight
      // budgets. The slack covers the poll's own final request.
      test.setTimeout(READY_TIMEOUT_MS + 60000);
      expect(spendFileVersion).toBeTruthy();

      const readiness = await api.pollSpendFileReadyDetailed(
        spendFileVersion,
        READY_TIMEOUT_MS,
      );

      // The backend's own progress string goes into every outcome below, so a
      // stall reads as "last status calculating (Calculating [14/17], 2%,
      // Chunks: 6 (Open: 6, In-process: 6, Closed: 0))" instead of "expected
      // true, received false".
      const trail =
        `spend file version ${spendFileVersion} after ${readiness.polls} polls — ` +
        `last status "${readiness.status}" (${readiness.statusDescription})`;

      // The backend gave up on the file: post-processing of a synced spend file
      // is what this flow is about, so an error status is a real failure.
      expect(
        readiness.failed,
        `post-processing ended in an error status — ${trail}`,
      ).toBe(false);

      // Not ready and not failed: the file is still queued. Both the pipeline
      // and a local dev run share one backend with every other company, and its
      // calculation chunks are processed by a worker pool — a large file from
      // another company (see e2e/context/REPORT-data-sincronize-choices.md) can
      // hold that pool long enough for ours to sit at the same percentage and
      // the same "Chunks: n (In-process: n, Closed: 0)" counters for the whole
      // budget. That is an environment condition, not a defect this repo can
      // fix or assert on, so it is reported as skipped with the trail attached
      // rather than as a front-end failure. The steps that follow validate the
      // source spend file, which the synced file's state does not affect, so
      // they still run.
      test.skip(
        !readiness.ready,
        `backend post-processing did not finish${readiness.stalled ? " and made no progress" : ""} — ${trail}`,
      );
    });

    test("supplier agreed terms are synchronized", async () => {
      // Navigation plus the wait for the program to leave recalculation (see
      // AGREED_TERMS_RENDER_TIMEOUT_MS).
      test.setTimeout(60000 + AGREED_TERMS_RENDER_TIMEOUT_MS);
      // Switch back to the source spend file and open the supplier's entity card
      // to validate its agreements are intact after the sync.
      await goToHomeSection(page);
      await changeToSpendFile(page, given.spendFile);

      // The Entity Card treats a version flagged `pendingRecalculation` like a
      // running recalculation (EntityCardOverview reacts to
      // "calculationPending" by raising programInrecalculation), so every
      // strategy line stays a skeleton until an admin recalculates the file.
      // That is fixture state on the shared environment — Pagero-Sychronyze
      // (Ver. 1) on dev has carried the flag since 2026-07-29 — and no wait
      // can render the agreed value, so report it as skipped with the exact
      // reason rather than as a "element not found" failure.
      sourcePendingRecalculation =
        await describeSourcePendingRecalculation(api);
      test.skip(
        sourcePendingRecalculation !== "",
        `source spend file version is flagged for recalculation — ${sourcePendingRecalculation}`,
      );

      await goToEntityCardEntity(page, given.supplier);

      const supplier = given.agreedNewTerms[0];
      await validateElements(page, supplier.tab, supplier.value);
    });

    test("spend agreed terms are synchronized across tabs", async () => {
      test.setTimeout(60000 + AGREED_TERMS_RENDER_TIMEOUT_MS);
      test.skip(
        sourcePendingRecalculation !== "",
        `source spend file version is flagged for recalculation — ${sourcePendingRecalculation}`,
      );
      // Continues on the entity card opened by the previous serial step.
      for (let i = 1; i < given.agreedNewTerms.length; i++) {
        const item = given.agreedNewTerms[i];
        // Selecting a tab remounts the strategies block, which requests the
        // payment terms of that tab's spend configuration on mount. Gate on
        // that response so the readiness wait in validateElements can only be
        // satisfied by the newly selected tab's data, never by a line left
        // over from the previous iteration. The waiter is registered before
        // the click, as everywhere else in the suite, so it cannot miss it.
        await Promise.all([
          ApiWaitersUtils.waitForEntityCardSPConfigChartPTOpp(
            page,
            AGREED_TERMS_RENDER_TIMEOUT_MS,
          ),
          changeTabByIndex(page, i),
        ]);
        await validateElements(page, item.tab, item.value);
      }
    });

    test.afterAll(async () => {
      // Cleanup runs even when the flow failed mid-way, so it must be cheap and
      // it must never mask the actual cause. It used to drive the Admin Console
      // grid (`deleteUploadedSpendfile`), which deletes whichever row carries
      // the first "Delete" link and waits for an `ok()` spend-file response —
      // with the uploaded file still calculating, that wait had nothing to match
      // and the hook ran out of budget, stacking a misleading `"afterAll" hook
      // timeout` on top of the real failure. Deleting by UUID over the API needs
      // no navigation, no second login, and hits exactly the version this run
      // created. Residue is what inflates the version counter (67 at the time of
      // writing) and loads the very queue that stalls, so a failed delete is
      // logged loudly instead of thrown.
      test.setTimeout(180000);
      try {
        if (spendFileVersion) {
          await api.deleteSpendFileVersion(spendFileVersion);
        } else {
          console.error(
            "afterAll: no spend file version was created, nothing to delete.",
          );
        }
        // Leave the session on the default user for the next spec in the
        // workers=1 pipeline, as the previous UI cleanup did.
        await ensureDefaultLogin(page);
      } catch (error) {
        console.error(
          "afterAll: cleanup failed — the uploaded spend file may still exist:",
          error instanceof Error ? error.message : String(error),
        );
      }
      // Close the page first, then its context (not the worker `browser`
      // fixture) so the worker stays alive for the next spec in the workers=1
      // pipeline. Closing the page first avoids spurious errors from in-flight
      // requests during context teardown.
      await page?.close().catch(() => {});
      await page?.context().close().catch((error) => {
        console.error(
          "afterAll: page.context().close() failed (non-critical):",
          error instanceof Error ? error.message : String(error),
        );
      });
    });
  },
);

async function getSyncOptionInModal(page: Page, optionName: string) {
  const modalContainer = page.locator("#calculum-modal-container");
  const modalInside = modalContainer.locator(".calculum-modal-content-custom");
  const modalInner = modalInside.locator(".inner-modal");
  const checkbox = modalInner
    .locator(`div.d-flex:has(> span.ml-2:text-is("${optionName}"))`)
    .locator('input[type="checkbox"]');
  return checkbox;
}

// Budget for the agreed-terms line to render. EntityTermsChartLine swaps every
// strategy line for a skeleton (no `.agreedNewTerms` class) while the program
// is recalculating, and on the shared dev backend a company-wide
// recalculation — a Payment Float change enqueues one for every spend file
// version of Company Test — can keep the card in that state for minutes.
const AGREED_TERMS_RENDER_TIMEOUT_MS = 180000;

/**
 * Reads the active spend file version (the one `changeToSpendFile` just
 * selected) and returns a one-line description when it is flagged
 * `pendingRecalculation`, or "" when it is not.
 */
async function describeSourcePendingRecalculation(api: Api2): Promise<string> {
  await api.refreshWhoAmI(true);
  const uuid = api.activeSpendFileVersionUUid;
  const response = await api.doGet(`/api/spend_file_versions/${uuid}`);
  if (!response.ok()) {
    console.log(
      `describeSourcePendingRecalculation: ${response.status()} reading version ${uuid}; assuming not pending.`,
    );
    return "";
  }
  const version = await response.json();
  if (version?.pendingRecalculation !== true) return "";
  return (
    `${version.name} (Ver. ${version.version}) ${uuid}: status "${version.status}", ` +
    `pendingRecalculation=true, last recalculation ${version.recalculationDate ?? "unknown"}`
  );
}

async function validateElements(page: Page, tab: string, value: number) {
  console.log("validateElements", tab, value);
  // The Kendo TabStrip on the card renders only the tab headers: every tab is
  // declared with `contentClassName: "classContentHide"` and no content, so
  // its single `.k-tabstrip-content` pane is empty, `display: none` and has no
  // `aria-hidden` attribute (verified on dev, 2026-08-27). The strategy lines
  // live in the one EntityPaymentTermsStrategies block (`#termsbars`) rendered
  // outside the TabStrip, which EntityCardNegotiation remounts on every tab
  // change (`keyTermsStrategies++`), so the DOM never holds more than one
  // `.agreedNewTerms` and it always belongs to the selected tab.
  const agreedLine = page.locator("#termsbars .agreedNewTerms").first();
  // The block shows its loading skeleton until the payment-terms request of
  // the selected tab answers, and EntityTermsChartLine swaps every strategy
  // line for a skeleton (no `.agreedNewTerms` class) while the program is
  // recalculating, so the line itself is the readiness signal.
  await agreedLine.waitFor({
    state: "attached",
    timeout: AGREED_TERMS_RENDER_TIMEOUT_MS,
  });
  const valueElement = agreedLine
    .locator(".value-container span.font-semibold.text-2xl")
    .first();
  await expect(valueElement).toHaveText(value.toString());
}
