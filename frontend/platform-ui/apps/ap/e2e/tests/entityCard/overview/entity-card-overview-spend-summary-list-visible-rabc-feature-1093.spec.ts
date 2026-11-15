/**
 * @fileoverview
 * E2E test for verifying the visibility of spend summary lists in the Entity Card Overview as per US-1093.
 *
 * Main Flow:
 * 1. Ensure the user is logged in with default credentials.
 * 2. Initialize the API utility instance.
 * 3. Navigate to the home page and wait for loading to complete.
 * 4. Print the test starting information.
 * 5. Change to the spend file "Company Testing.xlsx (Ver. 1)".
 * 6. Open the Entity Card for "ABB AG - (3)".
 * 7. Wait for the page to load.
 * 8. Assert that the spend summary lists "Spend 1" and "Spend 2" are visible in the results tabs.
 *
 * Acceptance Criteria:
 * - The test waits for the necessary navigation and spend file change to complete.
 * - The Entity Card for "ABB AG - (3)" loads successfully.
 * - The spend summary lists "Spend 1" and "Spend 2" are visible in the UI.
 * - The test passes if both expected spend summary tabs are present and visible.
 */


import { expect, test } from "@playwright/test";
import {
  ensureDefaultLogin,
  changeToSpendFile,
  goToEntityCardEntityExactFull,
} from "../../utils/Utils";

import Api2 from "../../utils/APi2";

let api: Api2 | null = null;

test.beforeEach(async ({ page }) => {
  await ensureDefaultLogin(page);
  api = await Api2.getInstance(page);
  await page.goto("/");
  await page.waitForSelector(".loading-modal", { state: "detached" });
});

test("Entity-Card Overview Summary Spend Lists Visible @us-1093 @ entity @ui @prq", async ({
  page,
}, testInfo) => {
  // Starting
  Api2.printStarting(testInfo);

  await changeToSpendFile(page, "Company Testing.xlsx (Ver. 1)");

  // Open the supplier "ABB AG - (3)" explicitly. The previous helper
  // `goToEntityCardEntity` clicked `.current-name >> nth=0` (whichever
  // card the backend returned first), and the search results for "ABB AG
  // - (3)" sometimes ranked the parent "ABB Ltd" first — opening a
  // parent-level card silently. The negotiation TabStrip is gated by
  // `v-if="!inRecalculation && companyType !== 'parent'"`
  // ([EntityCardNegotiation.vue:119](../../../../apps/ap/src/modules/home/entityCard/views/EntityCardNegotiation.vue#L119)),
  // so on a parent neither `.inProgram.results-tabs` nor its container
  // ever render and the assert below has nothing to wait on.
  // `goToEntityCardEntityExactFull` matches the exact name and filters
  // by `companyType` from the `/api/entity-card/get-entity-cards`
  // response, picking the supplier card deterministically.
  //
  // The spend tabs are populated from
  // `/api/analyze/get-spend-program-configs-by-provider`. Attach the
  // listener before clicking the card so the response (fired during
  // navigation) can't slip past us.
  const spendProgramConfigsResponse = page.waitForResponse(
    (res) =>
      res
        .url()
        .includes("/api/analyze/get-spend-program-configs-by-provider") &&
      res.ok(),
    { timeout: 90_000 },
  );

  await goToEntityCardEntityExactFull(
    page,
    "ABB AG - (3)",
    0,
    true,
    null,
    "supplier",
  );

  await spendProgramConfigsResponse;

  await expect(
    page.locator('.inProgram.results-tabs:has-text("Spend 1")'),
  ).toBeVisible({ timeout: 30_000 });
  await expect(
    page.locator('.inProgram.results-tabs:has-text("Spend 2")'),
  ).toBeVisible({ timeout: 30_000 });
});
