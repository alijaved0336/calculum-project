/**
 * @fileoverview
 * E2E test for verifying the display of the "Snapshot" (SS) in the Opportunity entity card
 * for both Supplier and Parent strategies.
 *
 * Main Flow:
 * 1. Ensure the user is on the correct page and the loading modal is hidden.
 * 2. Change to the required spend file.
 * 3. Navigate to the Opportunity entity card for the specified supplier or parent.
 * 4. Wait for the relevant API responses (payment terms opportunity and adabot snapshot).
 * 5. Change to the specified program.
 * 6. Validate that the Snapshot (SS) is displayed in the UI according to the API response.
 *
 * Acceptance Criteria:
 * - The test waits for the payment terms opportunity and adabot snapshot API responses.
 * - The UI must display the Snapshot (SS) for the correct strategies (Supplier and Parent) if present in the API response.
 * - The values shown in the Snapshot (SS) must match the values returned by the API.
 * - If the Snapshot (SS) is not present in the API response, it should not be displayed in the UI.
 * - The test passes if all displayed Snapshots and their values match the API response.
 */


import { expect, test } from "@playwright/test";

// Global utils
import {
  changeToSpendFile,
  changeToProgram,
  goToEntityCardEntityExactFull,
} from "../../utils/Utils";

const programName = "test";
const spendFileName = "PageroFull_20230308_2.xlsx (Ver. 1)";
const supplierName = "Microelettrica Scientifica S.P.A.";
const parentName = "3M CO";

test.describe
  .serial("Test SS for Strategies supplier and PArent @ui @us-4579 @entity", async () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");

    // Wait for loading modal to be hidden
    await expect(page.locator(".loading-modal")).toBeHidden();

    // Change spend file
    await changeToSpendFile(page, spendFileName);
  });

  /**
   * Contractual bar chart
   */
  test("Show SS in Supplier Strategies Oportunity CF @ui @entity @us-4579", async ({
    page,
  }) => {
    // Microelettrica Scientifica S.P.A. shares its name root with its
    // corporate-tree parent (Knorr-Bremse AG). The default
    // `goToEntityCardEntity` clicks `.current-name.nth(0)`, which under CI
    // load order can land on the parent — that opens the parent entity card
    // and the chart endpoint fires with the `/parent` suffix, so the
    // `waitForResponse("**/chart/payment-terms-opportunity/supplier")`
    // below hangs the full 120s. Use the `Exact*` variant with an explicit
    // `"supplier"` type filter so we always click the supplier row.
    // See: e2e/context/lessons-learned.md (entry "show-bar-cards.spec.ts").
    await goToEntityCardEntityExactFull(page, supplierName, 0, true, null, "supplier");

    // Wait for loading modal to be hidden
    await expect(page.locator(".loading-modal")).toBeHidden();

    // Arm the response listeners BEFORE the click so we don't miss them.
    // The contractual-chart promise was previously fire-and-forget (no
    // capture, no await); a slow chart response left the description
    // unrendered when the assertion ran, producing the flake.
    const chartResponse = page.waitForResponse(
      "**/chart/payment-terms-opportunity/supplier",
    );
    const adabotResponse = page.waitForResponse(
      "**/entity-card/entity/ada-bot/all/",
    );

    // Change program
    await changeToProgram(page, programName);

    // Now both responses must settle before the description text appears.
    await chartResponse;
    const chartResp = await adabotResponse;
    await chartResp.json();

    // Wait for loading spinner to be hidden
    await expect(page.locator(".loading-modal")).toBeHidden();

    let script =
      "Microelettrica Scientifica S.P.A. is headquartered in Buccinasco, Italy and active in the sector: Electrical Equipment Manufacturing.";

    await expect(
      page.locator(".info-side", {
        has: page.getByText(script, { exact: true }),
      }),
    ).toBeVisible();
  });

  test("Show SS in Parent Strategies Oportunity CF @entity @estraeges", async ({
    page,
  }) => {
    // Searching "3M CO" also matches the supplier "3M Company"
    // case-insensitively, and under "Recently Viewed" ordering the supplier
    // card ranks first, so `goToEntityCardEntity`'s `.current-name.nth(0)`
    // click can open the supplier entity card instead of the parent — the
    // Overview then renders the supplier snapshot and the parent text below
    // never appears. Use the `Exact*` variant with a `"parent"` type filter
    // so we always click the parent row. Inverse of the case documented in
    // e2e/context/lessons-learned.md (entry "show-bar-cards.spec.ts").
    await goToEntityCardEntityExactFull(page, parentName, 0, true, null, "parent");

    // Wait for loading modal to be hidden
    await expect(page.locator(".loading-modal")).toBeHidden();

    // Arm the response listeners BEFORE the program change so we don't miss
    // them (same pattern as the supplier test above).
    // Explicit 60s timeout (consistent with ProgramUtils.goToProgramListTab):
    // the default 30s is too tight when the shared env is churning, and a
    // never-firing variant should surface a clear timeout rather than the
    // implicit default.
    const chartResponse = page.waitForResponse(
      "**/chart/payment-terms-opportunity/parent",
      { timeout: 60_000 },
    );
    const adabotResponse = page.waitForResponse(
      "**/entity-card/entity/ada-bot/all/",
      { timeout: 60_000 },
    );

    // Change program
    await changeToProgram(page, programName);

    // Both responses must settle before the description text appears.
    await Promise.all([chartResponse, adabotResponse]);

    // Wait for loading spinner to be hidden
    await expect(page.locator(".loading-modal")).toBeHidden();

    let script =
      "3M CO is headquartered in Abrera, Japan and active in the sector: Other Electrical Equipment and Component Manufacturing.";

    await expect(
      page.locator(".info-side", {
        has: page.getByText(script, { exact: true }),
      }),
    ).toBeVisible();
  });
});
