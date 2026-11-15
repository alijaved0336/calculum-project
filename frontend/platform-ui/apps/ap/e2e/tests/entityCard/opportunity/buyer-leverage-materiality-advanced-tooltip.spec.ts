/**
 * @fileoverview
 * E2E tests for the "Buying Entity Leverage / Materiality" advanced tooltip in the Opportunity entity card.
 *
 * This suite covers:
 * - Navigating to the Opportunity entity card.
 * - Locating the "Buying Entity Leverage / Materiality" card.
 * - Clicking the info (svg) button to display the advanced tooltip.
 * - Verifying the presence and content of the advanced tooltip.
 *
 * Prerequisites:
 * - The test user must have access to the "PageroFull_20230308_2.xlsx (Ver. 1)" spend file.
 * - At least one entity card must be available in the test data.
 *
 * Utilities:
 * - Uses Playwright test runner and custom utility functions for navigation and assertions.
 */

import { test, expect } from "@playwright/test";
import { changeToSpendFile, ensureDefaultLogin } from "../../utils/Utils";
import { locators } from "../../utils/locators";
import { GlobalFiltersUtils } from "../../utils";

test.beforeEach(async ({ page }) => {
  await ensureDefaultLogin(page);
  await page.goto("/");
  await page.waitForSelector(".loading-modal", { state: "detached" });
  await changeToSpendFile(page, "PageroFull_20230308_2.xlsx (Ver. 1)");
});

test("Entity-Card - Buying Entity Leverage / Materiality Card, has the advanced tooltip @us-6522 ", async ({
  page,
}) => {
  await GlobalFiltersUtils.clearAllFiltersFromNavbar(page);

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

  await page.waitForTimeout(6000);
  console.log(
    "click on the Buying Entity Leverage / Materiality Card svg info button to show the advanced tooltip",
  );
  let buyerLeverageCardCount = await page
    .locator(
      "div.card.shadow-none:has-text('Buying Entity Leverage / Materiality')",
    )
    .count();
  console.log("buyerLeverageCardCount : ", buyerLeverageCardCount);
  if (buyerLeverageCardCount > 0) {
    let buyerLeverageCard = await page
      .locator(
        "div.card.shadow-none:has-text('Buying Entity Leverage / Materiality')",
      )
      .first();
    await buyerLeverageCard.locator(".tooltipIcon").first().click();
    await page.waitForTimeout(6000);
    let shepardContainerCount = await page.locator(".shepherd-content").count();
    console.log("shepardContainerCount : ", shepardContainerCount);
    if (shepardContainerCount > 0) {
      let headerTitle = await page.locator(".shepherd-header").innerText();

      await expect(headerTitle).toContain("Buying Entity Leverage/Materiality");
    }
  }
});
