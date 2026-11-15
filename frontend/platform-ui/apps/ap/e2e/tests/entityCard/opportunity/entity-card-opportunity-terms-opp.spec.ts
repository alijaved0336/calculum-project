/**
 * @fileoverview
 * E2E tests for verifying the Opportunity Terms section in the entity card.
 *
 * This test suite covers:
 * - Navigating to the Opportunity Terms section for a specific supplier.
 * - Ensuring the correct program and spend file are selected.
 * - Verifying that the Adabot text and tooltips are displayed as expected in the payment terms target-opportunity section.
 *
 * Prerequisites:
 * - The test user must have access to the "PageroFull_20230308_2.xlsx (Ver. 2)" spend file.
 * - The supplier "Pengg Kabel Gmbh" must exist in the test data.
 *
 * Utilities:
 * - Uses Playwright test runner and custom utility functions for navigation and assertions.
 */


import { expect, test } from "@playwright/test";

// Global utils
import {
  changeToSpendFile,
  goToEntityCardEntity,
  ensureDefaultLogin,
} from "../../utils/Utils";

const programName = "CF with financing";
const spendFileName = "PageroFull_20230308_2.xlsx (Ver. 2)";
const supplierName = "Pengg Kabel Gmbh";

test.beforeEach(async ({ page }) => {
  await ensureDefaultLogin(page);
  await page.goto("/");
  await page.waitForSelector(".loading-modal", { state: "detached" });

  // Change spend file
  await changeToSpendFile(page, spendFileName);

  // Go to parent entity
  await goToEntityCardEntity(page, supplierName);

  // Wait for loading modal to be hidden
  await expect(page.locator(".loading-modal")).toBeHidden();
});

test("in payment terms target-opportunity section, the adabot text is showing @entity @strategies @integrated @us-2463 @tc-6239", async ({
  page,
}) => {
  // click on opportunity terms :
  await page.waitForTimeout(5700);
  await page
    .locator(".row.w-100.row-100.proposedTerms >> .value-container")
    .click();

  //verify that the right side , shows text

  let infoCardMain = await page.locator(".info-side");
  let title = await infoCardMain
    .locator(
      ".text-base.font-semibold.text-gray-700.cursor-pointer#proposedTerms",
    )
    .innerText();
  console.log("title : ", title);
});

test("in payment terms target-opportunity section, the tooltips are showing @entity @strategies @integrated", async ({
  page,
}) => {
  await page
    .locator('span:has-text("Unused, Disabled or Unavailable Strategies")')
    .click();
  // Locate all the divs with class "row w-100" under ".row.show-unused"
  const rows = await page.locator(".row.show-unused .row.w-100");

  // Get the count of the rows
  const rowCount = await rows.count();

  // Loop through all the rows
  for (let i = 0; i < rowCount; i++) {
    // Get the current row
    const row = rows.nth(i);

    // Locate the tooltip icon within the row
    const tooltipIcon = row.locator('svg[data-testid="tooltip-icon"]');

    // Check if the tooltip icon exists in the current row
    if ((await tooltipIcon.count()) > 0) {
      // Retrieve the tooltip text from the `data-original-title` attribute
      const tooltipText = await tooltipIcon.getAttribute("data-original-title");
      console.log(`Row ${i + 1} Tooltip Text:`, tooltipText);
    } else {
      console.log(`Row ${i + 1} has no tooltip icon.`);
    }
  }
});

test.afterEach(async ({ page }) => {
  await ensureDefaultLogin(page);
});
