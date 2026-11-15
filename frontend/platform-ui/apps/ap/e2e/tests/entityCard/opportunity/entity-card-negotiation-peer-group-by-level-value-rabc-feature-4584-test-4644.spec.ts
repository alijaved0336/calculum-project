/**
 * @fileoverview
 * E2E test for verifying the "Peer Group Standard" value in the Negotiation tab of the Opportunity entity card.
 *
 * User Story 4684: As a user, I want to see the correct "Peer Group Standard" value at the supplier level
 * in the Negotiation tab, so that I can compare the supplier's payment terms to its peer group.
 *
 * This test covers:
 * - Navigating to the Opportunity entity card for a specific supplier.
 * - Ensuring the correct program and spend file are selected.
 * - Verifying that the "Peer Group Standard" value is displayed as expected in the Negotiation tab.
 *
 * Prerequisites:
 * - The test user must have access to the "Pagero_DSO_TEST.xlsx (Ver. 1)" spend file.
 * - The supplier "Axtone S.A." must exist in the test data.
 *
 * Utilities:
 * - Uses Playwright test runner and custom utility functions for navigation and assertions.
 */


import { Page, expect, test } from "@playwright/test";
import {
  ensureDefaultLogin,
  changeToSpendFile,
  goToEntityCardEntity,
  changeToProgram,
  findEntityCard,
} from "../../utils/Utils";
import Api2 from "../../utils/APi2";
import { locators } from "../../utils/locators";

test.describe.serial("Peer Group Standard", async () => {
  let page: Page;
  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();

    await ensureDefaultLogin(page);
    await page.goto("/");

    await changeToSpendFile(page, "Pagero_DSO_TEST.xlsx (Ver. 1)");

    // Wait for loading modal to be hidden
    await page.waitForSelector(".loading-modal", { state: "detached" });
    expect(page.locator(".loading-modal")).not.toBeVisible();
  });

  test("Entity-Card Negotiation Peer Group Standard by Supplier Showing Value @entity @integrated @us-4684", async () => {
    // Goto EntityCards (Entity)
    await goToEntityCardEntity(page, "Axtone S.A.");

    await Promise.all([
      page.waitForResponse(
        (response: any) =>
          response.url().includes("api/entity-card/entity/ada-bot/all/") &&
          response.ok(),
      ),
      changeToProgram(page, "Test Adabot (NO TOCAR)", false),
    ]);

    await page.getByText("Unused, Disabled or Unavailable Strategies").click();
    const element = page
      .locator(`${locators.entityCard.oportunity.adabotChartLine}`)
      .filter({ hasText: "Peer Group Standard" });
    await expect(element).toBeVisible();
    await element.click();
    await expect(element.filter({ hasText: "60" })).toBeVisible();

    // Success
    Api2.printSuccess(
      "Peer Group Standard's labels found CORRECTLY, and value too",
    );

    console.log("close the entity modal");
    await page.locator(locators.entityCard.closeButton).click();
  });
  test("Entity-Card Negotiation Peer Group Standard by Parent Showing Value @entity @integrated @us-4684 @pending", async () => {
    // Goto EntityCards (Entity)
    //await goToEntityCardEntity(page, "ASSA ABLOY AB");
    await findEntityCard(page, "ASSA ABLOY AB");
    await Promise.all([
      page.waitForResponse(
        (response: any) =>
          response.url().includes("api/entity-card/entity/ada-bot/all/") &&
          response.ok(),
      ),
      changeToProgram(page, "Test Adabot (NO TOCAR)", false),
      page.locator("div.card-body").first().click(),
    ]);

    await page.getByText("Unused, Disabled or Unavailable Strategies").click();
    const element = page
      .locator(`${locators.entityCard.oportunity.adabotChartLine}`)
      .filter({ hasText: "Peer Group Standard" });
    await expect(element).toBeVisible();
    await element.click();
    await expect(element.filter({ hasText: "60" })).toBeVisible();

    // Success
    Api2.printSuccess(
      "Peer Group Standard's labels found CORRECTLY, and value too",
    );
  });
  test.afterAll(async () => {
    await page?.context().close().catch((error) => {
      console.error(
        "afterAll: page.context().close() failed (non-critical):",
        error instanceof Error ? error.message : String(error),
      );
    });
  });
});
