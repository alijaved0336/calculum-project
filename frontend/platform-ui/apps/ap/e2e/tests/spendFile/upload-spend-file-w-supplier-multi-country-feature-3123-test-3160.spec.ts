/**
 * Created By Rolando Abel Bravo Cabrera (RABC)
 * Test for Feature: 3123 (Test: 3160)
 * Reviewed: 10/03/2023 by RABC
 */
import { test, expect } from "@playwright/test";
import Api2, { IprocessedResponse } from "../utils/APi2";
import {
  changeToSpendFile,
  goToAnalyzeSection,
  ensureDefaultLogin,
  loginAsSuperAdmin
} from "../utils/Utils";

let spendFileName = "";
let spendFileVersion = 0;
let spendfileUUID = "";

let api: Api2 | null = null;



test.beforeEach(async ({ page }) => {
  
  await loginAsSuperAdmin(page);
  api = await Api2.getInstance(page);
  await page.goto("/");
  await page.waitForSelector(".loading-modal", { state: "detached" });
});

/**
 * SKIPPED — blocked on the backend fixture, not on this test.
 *
 * The two test-level defects it did have are fixed below (the sole assertion was
 * not awaited, and its row locator was not scoped to the visible grid), but the
 * ingest itself cannot succeed: the backend rejects its own canned fixture
 * `spend_file_update_original`, served by
 * `GET /api/spendfile/add-new-test-file/spend_file_update_original`, during
 * integrity verification. Observed on dev 2026-08-03:
 *
 *   status='errorProcessing'
 *   description='FAILS: Verifying uploaded File Integrity [0/17], Now Counting :3
 *                errors in all sheets, 0%, Total: 6 :, Processing: 6, failed: 6'
 *
 * The dev ingest pipeline itself is healthy — the active
 * upload-spend-file-w-spend-potentia-suppliers-feature.spec.ts reaches `ready`
 * on the `spend_file_potential_suppliers` fixture. Only this fixture is bad, and
 * upload-spend-file-w-spend-updates-feature-4061-test-5675.spec.ts uses the same
 * one. Unskip once the backend fixture passes its own integrity rules.
 */
test.skip("Upload SpendFile with Supplier in Multiple country from API @us-3123 @tc-3160 @api @data-ingestion @heavy @backend-fixture", async ({
  page
}, testInfo) => {
  // One full ingest plus two logins and the Analyze navigation do not fit the
  // default per-test budget.
  test.setTimeout(600000);

  // Starting
  Api2.printStarting(testInfo);

  const parsingResponse = await api!.doGet(
    "/api/spendfile/add-new-test-file/spend_file_update_original"
  );
  const parseResponseProcessed: IprocessedResponse = {
    data: null,
    status: null,
    result: false,
    body: null
  };
  await Api2.processApiResponse(
    parsingResponse,
    "Upload and Parsing SpendFile",
    parseResponseProcessed
  );

  expect(parseResponseProcessed.data).toBeDefined();
  const dataCasted = <
    { spendFile: null; spendFileVersion: null; version: null; name: null }
  >parseResponseProcessed.data;
  expect(dataCasted.spendFile).toBeDefined();
  expect(dataCasted.spendFileVersion).toBeDefined();
  spendfileUUID = dataCasted.spendFileVersion!;
  expect(dataCasted.version).toBeDefined();
  spendFileVersion = dataCasted.version!;
  expect(dataCasted.name).toBeDefined();
  spendFileName = dataCasted.name!;

  // Wait SpendFile is ready. pollSpendFileReadyDetailed instead of
  // waitSpendFileReady so a stalled ingest names the pipeline stage it stopped
  // at, and so an environment stall is distinguishable from a parse failure
  // rather than surfacing as an opaque "not ready after N polls".
  const ingest = await api!.pollSpendFileReadyDetailed(spendfileUUID, 600000);
  expect(
    ingest.ready,
    `Spend file ${spendfileUUID} did not become ready: status='${ingest.status}' ` +
      `description='${ingest.statusDescription}' polls=${ingest.polls} ` +
      `failed=${ingest.failed} stalled=${ingest.stalled}`
  ).toBe(true);
  Api2.printSuccess("Spend File Parsed.");

  await ensureDefaultLogin(page);

  await changeToSpendFile(page, `${spendFileName} (Ver. ${spendFileVersion})`);

  await expect(page).toHaveURL(/.*\/home\/home-dashboard/);
  await goToAnalyzeSection(page, "List", true, "Suppliers");

  console.log("Looking for suppliers...");

  // Scope to the visible grid. The List sub-tabs mount every Kendo grid, and the
  // hidden ones hold real rows and sit earlier in the DOM, so a page-wide row
  // locator can bind to a display:none table — see e2e/context/lessons-learned.md.
  // toHaveCount also polls, which is what the removed waitForTimeout(2000) was
  // standing in for.
  const suppliersGrid = page.locator(".k-grid:visible").first();

  await expect(
    suppliersGrid.locator("tr.k-master-row:visible").filter({
      has: page.locator(
        'td >> div >> p:has-text("Bureau D Electronique Appliquee")'
      )
    })
  ).toHaveCount(2);

  Api2.printSuccess("2 Supplier Found with same name, different country.");
});

test.afterEach(async ({ page }) => {
  Api2.printHeader("Cleaning Enviroment...");
  const response = await api!.doDelete(
    "/api/spend_file_versions/" + spendfileUUID
  );
  expect(response.ok()).toBeTruthy();
  Api2.printHeader("Enviroment cleaned.");
  await ensureDefaultLogin(page);
});
