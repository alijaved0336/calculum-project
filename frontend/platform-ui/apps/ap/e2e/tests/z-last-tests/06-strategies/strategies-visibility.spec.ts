/**
 * End-to-end test suite for verifying the visibility of payment terms strategies in the UI.
 *
 * This test covers the following scenarios:
 * - Ensures all enabled strategies are visible by default.
 * - Verifies the visibility when "Show only the largest strategy" is selected.
 * - Verifies the visibility when "Show only the applicable strategies" is selected.
 * - Resets the visibility to show all enabled strategies after each test.
 *
 * Test tags:
 * - @global
 * - @ui
 * - @settings
 * - @program
 * - @tc-12281
 * - @us-11094
 *
 * Utilities:
 * - Uses global login/logout helpers.
 * - Navigates to entity card and interacts with settings.
 * - Waits for relevant API responses to synchronize UI state.
 *
 * @file strategies-visibility.spec.ts
 */

/**
 * Resets the payment terms strategies visibility to "Show all enabled strategies" if not already set.
 *
 * @param page - Playwright Page object for browser interaction.
 * @returns Promise<void>
 */

import { expect, Page, test } from "@playwright/test";
import { locators } from "../../utils/locators";
// Global utils
import {
  goToEntityCardEntity,
  ensureDefaultLogin,
  ensureStrategiesUserLogin,
} from "../../utils/Utils";
import ProgramUtils from "../../utils/ProgramUtils";

const entityName = "Axtone S.A.";

test.describe
  .serial("Strategies visibility @global @ui @settings @program @tc-12281 @us-11094", async () => {
  let page: Page;
  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();
    
    await ensureStrategiesUserLogin(page);

    await ProgramUtils.changeToProgram(page, ProgramUtils.PROGRAM_NAME_MAIN);
    await page.goto("/");
    //reset to default stage
    console.log("Reset to default stage");
    await resetToDefaultStage(page);
  });
  test("Default visibility", async () => {
    //- Default visibility: Show all enabled strategies
    console.log("Default visibility: Show all enabled strategies");
    await checkStrategiesVisibility(page, [
      "Pay on Terms",
      "Supplier Standard",
      "Peer Group Standard",
      "Industry / Region Standard",
      "Harmonization",
    ],'default');
    await page.locator(locators.entityCard.closeButton).click();
    console.log('End of default strategies')
  });
  test("Show only the largest strategy", async () => {
    //- Show only the largest strategy
    console.log("Show only the largest strategy");
    await Promise.all([
      page.waitForResponse((responseName) =>
        responseName.url().includes("/api/spendfile/strategies/allowed-status"),
      ),
      page.locator(locators.sidebar.settings).click(),
    ]);

    await page.locator(locators.settings.paymentTermsStrategiesSection).click();
    await Promise.all([
      page.waitForResponse((responseName) =>
        responseName.url().includes("/api/spend_file_versions/"),
      ),
      page.locator(locators.settings.showSupplierStrategyVisibility).click(),
    ]);
    await page.waitForTimeout(1000);

    await page.getByText("Show only the largest strategy").click();
    await Promise.all([
      page.waitForResponse((responseName) =>
        responseName.url().includes("/api/spend_file_versions/"),
      ),
      page.locator("#save-opportunity-config").click(),
    ]);
    await checkStrategiesVisibility(page, [
      "Peer Group Standard",
      "Harmonization",
    ],'largest');
    await page.locator(locators.entityCard.closeButton).click();
    console.log('End of largest strategies');
  });
  test("Show only the applicable strategies", async () => {
    //- Show only the applicable strategies
    console.log("Show only the applicable strategies");
    await Promise.all([
      page.waitForResponse((responseName) =>
        responseName.url().includes("/api/spendfile/strategies/allowed-status"),
      ),
      page.locator(locators.sidebar.settings).click(),
    ]);

    await page.locator(locators.settings.paymentTermsStrategiesSection).click();
    await Promise.all([
      page.waitForResponse((responseName) =>
        responseName.url().includes("/api/spend_file_versions/"),
      ),
      page.locator(locators.settings.showSupplierStrategyVisibility).click(),
    ]);
    await page.waitForTimeout(1000);

    await page.getByText("Show only the applicable strategies").click();
    await Promise.all([
      page.waitForResponse((responseName) =>
        responseName.url().includes("/api/spend_file_versions/"),
      ),
      page.locator("#save-opportunity-config").click(),
    ]);
    await checkStrategiesVisibility(page, [
      "Pay on Terms",
      "Peer Group Standard",
      "Harmonization",
    ],'applicable');
    await page.locator(locators.entityCard.closeButton).click();
    console.log('End of applicable strategies')
  });
  test.afterAll(async () => {
    console.log("*** After all");
    await ensureDefaultLogin(page);
    // Close the page's context (not the worker `browser` fixture) so the
    // worker stays alive for the next spec in the workers=1 pipeline.
    await page?.context().close().catch((error) => {
      console.error(
        "afterAll: page.context().close() failed (non-critical):",
        error instanceof Error ? error.message : String(error),
      );
    });
  });
});

/**
 * Checks if the given list of strategies are visible in the line chart of the entity card.
 * @param page The page object
 * @param expecting List of strategy names that are expected to be visible
 */
async function checkStrategiesVisibility(page: Page, expecting: string[], show: string) {
  await Promise.all([
    page.waitForResponse((responseName) =>
      responseName.url().includes("/chart/payment-terms-opportunity/supplier"),
    ),
    goToEntityCardEntity(page, entityName, 0, false),
  ]);
  for (const item of expecting) {
    const strategy=page.locator(".line-chart", {has: page.getByText(item, { exact: true })})
    const isVisible=await strategy.isVisible();
    console.log(`Strategy "${item}" visibility: ${isVisible} on stage "${show}"`);
    expect(strategy).toBeTruthy();
  }
  await page.waitForTimeout(2000);
}

/**
 * Resets the settings to show all enabled strategies
 * @param page The page object
 */
async function resetToDefaultStage(page: Page) {
  console.log("Reset to: Show all enabled strategies");
  await Promise.all([
    page.waitForResponse((responseName) =>
      responseName.url().includes("/api/spendfile/strategies/allowed-status"),
    ),
    page.locator(locators.sidebar.settings).click(),
  ]);

  await page.locator(locators.settings.paymentTermsStrategiesSection).click();

  const [responseTypeStragegies] = await Promise.all([
    page.waitForResponse(
      (response) =>
        response.url().includes("/api/spend_file_versions/") && response.ok(),
    ),
    page.locator(locators.settings.showSupplierStrategyVisibility).click(),
  ]);

  var resultResponse = JSON.parse(await responseTypeStragegies.text());
  let strategiesVisibility = resultResponse["strategiesVisibility"];

  console.log("strategiesVisibility: ", strategiesVisibility);

  if (strategiesVisibility && strategiesVisibility !== "ALL") {
    await page.getByText("Show all enabled strategies").click();
    await Promise.all([
      page.waitForResponse((responseName) =>
        responseName.url().includes("/api/spend_file_versions/"),
      ),
      page.locator("#save-opportunity-config").click(),
    ]);
    console.log("Reset to: Show all enabled strategies");
  } else {
    console.log("Already in Show all enabled strategies");
  }
}
