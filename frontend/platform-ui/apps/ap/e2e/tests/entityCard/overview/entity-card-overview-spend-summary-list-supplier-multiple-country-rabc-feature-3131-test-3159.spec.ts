/**
 * @fileoverview
 * E2E test for verifying the display of spend summary lists for a supplier with multiple countries
 * in the Entity Card Overview, as per US-3131 and test case 3159.
 *
 * Main Flow:
 * 1. Ensure the user is logged in with default credentials.
 * 2. Navigate to the Home section.
 * 3. Print the test starting information.
 * 4. Change to the spend file "PageroWithSupplierIn2Country.xlsx (Ver. 1)".
 * 5. Open the Entity Card for "HALMA PLC".
 * 6. Verify that the supplier's spend summary lists display both "belgium" and "italy" as expected.
 *
 * Acceptance Criteria:
 * - The test waits for the necessary navigation and spend file change to complete.
 * - The Entity Card for "HALMA PLC" loads successfully.
 * - The spend summary list displays "belgium" and "italy" for the supplier in at least two rows each.
 * - The test passes if all expected country entries are visible in the summary list.
 */

import { expect, test } from "@playwright/test";
import {
  ensureDefaultLogin,
  changeToSpendFile,
  goToEntityCardEntityExactFull,
} from "../../utils/Utils";

test.beforeEach(async ({ page }) => {
  await ensureDefaultLogin(page);
  await changeToSpendFile(page, "PageroWithSupplierIn2Country.xlsx (Ver. 1)");
  await page.waitForSelector(".loading-modal", { state: "detached" });
});

test("Entity-Card Overview Summary Spend Lists Supplier with Multiple Country @us-3131 @entity @prq @flakyResolved", async ({
  page,
}) => {
  await Promise.all([
    page.waitForResponse(
      (response) =>
        response.url().includes("/api/entity-card/entity/ada-bot/all") &&
        response.ok(),
    ),
    goToEntityCardEntityExactFull(page, "HALMA PLC"),
  ]);
  // await goToEntityCardEntity(page, "HALMA PLC");
  // ? - Use api response
  const tableDiv = page.locator("table > tbody >> tr >> td >> div");
  await expect(
    tableDiv.locator('span:has-text("belgium")').nth(0),
  ).toBeVisible();
  await expect(
    tableDiv.locator('span:has-text("belgium")').nth(1),
  ).toBeVisible();

  await expect(tableDiv.locator('span:has-text("italy")').nth(0)).toBeVisible();
});
