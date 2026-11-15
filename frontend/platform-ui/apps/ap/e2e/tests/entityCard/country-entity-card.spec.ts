/**
 * @fileoverview
 * E2E tests for verifying the display of Country information in the Entity Card List and Entity Card Overview Tree Chart.
 *
 * Main Flows:
 * 1. Ensure the user is logged in with default credentials.
 * 2. Navigate to the home page and wait for loading to complete.
 * 3. Change to the spend file "Spend Contractual Value.xlsx (Ver. 3)".
 * 4. Open the Entity Card list and verify that each card displays the country in a tag.
 * 5. Open the Entity Card Overview Tree Chart and verify that the country is displayed correctly.
 *
 * Acceptance Criteria:
 * - The test waits for the necessary navigation and spend file change to complete.
 * - The Entity Card list loads successfully and each card displays the country in a tag.
 * - The Entity Card Overview Tree Chart loads and displays the country information as expected.
 * - The test passes if all assertions are met and the UI displays the correct country data in both the card list and the overview tree chart.
 */

import { Page, test, expect } from "@playwright/test";
import {
  changeToSpendFile,
  goToEntityCard,
  ensureDefaultLogin,
} from "../utils/Utils";
import { locators } from "../utils/locators";

test.describe
  .serial("Test for Display Country @flakyResolved @us-237", async () => {
  let page: Page;
  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();
    await ensureDefaultLogin(page);
    await changeToSpendFile(page, "Spend Contractual Value.xlsx (Ver. 3)");
  });

  test("Test for Display Country in a tag for each card in Entity Card List @ui @entity @us-237 @flakyResolved", async () => { // SKIPPED: Flaky test - 2026-01-08
    // await page.pause();
    // Click text=Analyze
    const [response] = await Promise.all([
      page.waitForResponse(
        (response) =>
          response.url().includes("/api/entity-card/get-recent-entity-cards") &&
          response.ok(),
      ),
      page.waitForResponse(
        (response) =>
          response.url().includes("/api/entity-card/get-entity-cards") &&
          response.ok(),
      ),
      goToEntityCard(page, false),
    ]);
    expect(response.status()).toBe(200);
    const countryLoc = page.locator("div.card-body >> .country-text").first();
    const countryName = await countryLoc.innerText();
    console.log("country count: ", countryName.length);
    expect(countryName.length).toBeGreaterThan(2);
  });
  test("Test for Display Country in a Entity Card Overview Tree Chart @ui @entity @us-237 @flakyResolved", async () => { // SKIPPED: Flaky test - 2026-01-08
    let entityCardCount = await page.locator("div.card-body").count();
    if (entityCardCount > 0) {
      console.log("has entity card(s)");
      let countryName = await page
        .locator("span.country-text")
        .first()
        .innerText();
      expect(countryName.length).toBeGreaterThan(1);
      await page.locator("div.card-body").first().click();
      await Promise.all([
        page.waitForResponse(
          (res: any) =>
            res.url().includes("api/entity-card/entity/ada-bot/all/") &&
            res.ok(),
        ),
      ]);
      await Promise.all([
        page.waitForResponse(
          (res: any) => res.url().includes("family_tree") && res.ok(),
        ),
        page.locator(locators.entityCard.menu.corporateTree).click(),
      ]);
      const alpha3codeLoc = page
        .locator(".org-tree >> span.country-text")
        .first();
      const alpha3Code = await alpha3codeLoc.innerText();

      expect(alpha3Code.length).toBe(3);
    } else {
      console.log("Fail no entity cards available");
      expect(true).toBe(false);
    }
  });
});
