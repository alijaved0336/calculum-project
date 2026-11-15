/**
 * @fileoverview
 * E2E tests for verifying the display of the Modal Entity in the Entity Card.
 *
 * Main Flows:
 * 1. Ensure the user is logged in with default credentials.
 * 2. Change to the spend file "PageroFull_20230308_2.xlsx (Ver. 1)".
 * 3. Navigate to the Entity Card for "3M Company".
 * 4. Assert that the Modal Entity is displayed correctly.
 *
 * Acceptance Criteria:
 * - The test waits for the necessary navigation and spend file change to complete.
 * - The Entity Card for "3M Company" loads successfully.
 * - The Modal Entity is displayed correctly.
 * - The test passes if all assertions are met and the UI displays the correct Modal Entity data.
 */

import { test, expect } from "@playwright/test";
import { changeToSpendFile } from "../utils/Utils";
import { locators } from "../utils/locators";
import { GlobalFiltersUtils } from "../utils";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector(".loading-modal", { state: "detached" });
  await changeToSpendFile(page, "PageroFull_20230308_2.xlsx (Ver. 1)");
});

test("Entity-Card - Modal - 6522 @integrated @entity @tc-6522", async ({
  page,
}) => {
  console.log(
    "Check the new Modal Entity is working when clickin on Entity Card , it should not redirect, but show the modal",
  );

  await GlobalFiltersUtils.clearAllFiltersFromNavbar(page);

  console.log("After clear all filters go to Enity Card and Corporate Tree");
  await Promise.all([
    page.waitForResponse(
      (res: any) =>
        res.url().includes("/api/entity-card/get-entity-cards") && res.ok(),
    ),
    page.locator(locators.sidebar.entities).click(),
  ]);

  console.log("click on the first available entity card");
  await Promise.all([
    page.waitForResponse(
      (res: any) => res.url().includes("/credit-score") && res.ok(),
    ),
    page.locator("div.card-body").first().click(),
  ]);

  console.log("Count the Modal Entity Container");
  let count = await page
    .locator(
      ".calculum-modal.higher-z-index >> .calculum-modal-content-custom.content-higher-z-index",
    )
    .count();

  await expect(count).toBe(1);
});
