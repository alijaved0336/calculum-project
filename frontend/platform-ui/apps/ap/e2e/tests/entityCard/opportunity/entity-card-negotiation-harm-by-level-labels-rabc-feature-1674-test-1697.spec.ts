/**
 * @fileoverview
 * E2E tests for verifying the display of harmonization labels by supplier and parent level
 * in the Negotiation tab of the Opportunity entity card.
 *
 * User Story 1697: As a user, I want to see the correct harmonization labels at both
 * supplier and parent levels in the Negotiation tab, so that I can clearly distinguish
 * between harmonization by supplier and by parent.
 *
 * This suite covers:
 * - Navigating to the Opportunity entity card for a specific supplier or parent.
 * - Ensuring the correct program and spend file are selected.
 * - Verifying that the "Harmonization (Supplier Level)" and "Harmonization (Parent Level)" labels
 *   are displayed as expected in the Negotiation tab.
 *
 * Prerequisites:
 * - The test user must have access to the "20221026_DISCOUNT_TEST.xlsx (Ver. 1)" spend file.
 * - The supplier "Axtone S.A." and its parent must exist in the test data.
 *
 * Utilities:
 * - Uses Playwright test runner and custom utility functions for navigation and assertions.
 */


import { expect, test } from "@playwright/test";
import {
  changeToProgram,
  ensureDefaultLogin,
  changeToSpendFile,
  goToEntityCardEntity,
} from "../../utils/Utils";
import Api2 from "../../utils/APi2";
import { locators } from "../../utils/locators";

test.beforeEach(async ({ page }) => {
  await ensureDefaultLogin(page);
  await page.goto("/");
  await changeToSpendFile(page, "20221026_DISCOUNT_TEST.xlsx (Ver. 1)");
});

// The Harmonization Level info card is only rendered after the Harmonization
// strategy row is expanded, so each test clicks the strategy bar first and
// then asserts on the card produced by CardTitleValue.vue (h6 title +
// sibling value div). The value is "Supplier"/"Suppliers" or
// "Parent"/"Parents" depending on the program's harmonization configuration.
const harmonizationLevelCard = (page: any) =>
  page.locator(".custom-card", { hasText: "Harmonization Level" });

async function openHarmonizationDetails(page: any) {
  await page.locator(locators.entityCard.menu.opportunity).click();
  await page.waitForTimeout(2000);
  await page
    .locator(':text("Harmonization")')
    .first()
    .click();
  await expect(harmonizationLevelCard(page)).toBeVisible();
}

test("Entity-Card Negotiation Harmonization by Supplier Showing Labels @us-1697 @entity @integrated", async ({
  page,
}, testInfo) => {
  // Starting
  Api2.printStarting(testInfo);

  // Goto EntityCards (Entity)
  await goToEntityCardEntity(page, "Axtone S.A.");

  // Ensure program: 'RABC-CF-Test-Multiple-Spend-By-Provider'
  await changeToProgram(page, "RABC-CF-Test-Multiple-Spend-By-Provider");

  await openHarmonizationDetails(page);

  await expect(harmonizationLevelCard(page)).toContainText(/Supplier(s)?/i);

  // Success
  Api2.printSuccess("Harmonization by Supplier's labels found CORRECTLY");
});

test("Entity-Card Negotiation Harmonization by Parent Showing Labels @us-1697 @entity @integrated)", async ({
  page,
}, testInfo) => {
  // Starting
  Api2.printStarting(testInfo);

  // Goto EntityCards (Entity)
  await goToEntityCardEntity(page, "Axtone S.A.");

  // Ensure program: 'RABC-CF-Test-Multiple-Spend-By-Parent'
  await changeToProgram(page, "RABC-CF-Test-Multiple-Spend-By-Parent");

  await openHarmonizationDetails(page);

  await expect(harmonizationLevelCard(page)).toContainText(/Parent(s)?/i);

  // Success
  Api2.printSuccess("Harmonization by Parent's labels found CORRECTLY");
});
