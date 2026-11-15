/**
 * @fileoverview
 * E2E tests for Buyer Leverage on the Company Details Entity Card.
 *
 * This test suite validates the correct calculation and display of the buyer leverage
 * metric for buying entities in the entity card modal. It checks that the leverage
 * description ("Low", "Medium", "High") matches the expected value based on the
 * leverage percentage, and that the UI displays the correct label for specific companies.
 *
 * Test Flow:
 * 1. Ensure default login before each test.
 * 2. Change to a specific spend file.
 * 3. Open the entity card for a given company.
 * 4. Fetch and validate the buyer leverage data from the API.
 * 5. Assert that the UI displays the correct leverage description.
 *
 * Acceptance Criteria:
 * - The buyer leverage description matches the expected value for the leverage percentage.
 * - The UI displays the correct leverage label for the tested companies.
 * - The test is tagged for UI, entity, and user story tracking.
 */

import { Page, expect, test } from "@playwright/test";
import {
  ensureDefaultLogin,
  changeToSpendFile,
  getAllApiDataResponsesFromModalEntityOnLoad,
  findEntityCard,
  closeEntityModal,
} from "../../utils/Utils";
import {
  logOperation,
  ensurePageActive,
} from "../../utils/PlaywrightTestHelpers";

test.describe.serial("Buying Entity Leverage Table Referenece Updated", () => {
  let page: Page;
  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();
    await ensureDefaultLogin(page);
    await changeToSpendFile(page, "PageroVolumeMillions.xlsx (Ver. 1)");
  });
  test("Buying Entity Leverage Table Referenece Updated @flakyResolved @ui @entity @us-5337", async () => {
    await findEntityCard(page, "Aarsleff Rail A/S");
    logOperation("Finding entity card", { entityName: "Aarsleff Rail A/S" });
    const [response]: any = await getAllApiDataResponsesFromModalEntityOnLoad(
      page,
      "chartPotentialCashNegotiation",
    );

    const data = await response.json();

    const leverage = data.buyerLeverage;
    const value = leverage.value / 100;

    logOperation("Buyer leverage data", {
      value: leverage.value,
      calculatedValue: value,
      description: leverage.description,
    });

    if (value > 0 && value <= 0.0101) {
      expect(leverage.description).toBe("Low");
      logOperation("Leverage validation passed", { expected: "Low", actual: leverage.description });
    } else if (value > 0.0101 && value <= 0.0501) {
      expect(leverage.description).toBe("Medium");
      logOperation("Leverage validation passed", { expected: "Medium", actual: leverage.description });
    } else if (value > 0.0501 && value <= 1) {
      expect(leverage.description).toBe("High");
      logOperation("Leverage validation passed", { expected: "High", actual: leverage.description });
    }
    await closeEntityModal(page);
  });
  test("Buying Entity Leverage Adjustment > 100 millions @flakyResolved @ui @entity @us-5598 @tc-5718", async () => {
    await findEntityCard(page, "LIBERTY REPORTING INC");
    logOperation("Finding entity card", { entityName: "LIBERTY REPORTING INC" });
    await getAllApiDataResponsesFromModalEntityOnLoad(page, "adaBotAll");
  
    await expect(
      page.locator("#gradeLevelText").filter({ hasText: "Medium" }),
    ).toBeVisible();
    logOperation("Leverage grade validation passed", { expected: "Medium" });
    await closeEntityModal(page);
  });
  
  test("Buying Entity Leverage Adjustment > 500 millions @flakyResolved @ui @entity @us-5598  @tc-5718", async () => {
    await findEntityCard(page, "Advantage Resources Inc.");
    logOperation("Finding entity card", { entityName: "Advantage Resources Inc." });
    await getAllApiDataResponsesFromModalEntityOnLoad(page, "adaBotAll");
    await expect(
      page.locator("#gradeLevelText").filter({ hasText: "High" }),
    ).toBeVisible();
    logOperation("Leverage grade validation passed", { expected: "High" });
    await closeEntityModal(page);
  });
  test.afterAll(async ({ browser }) => {
    logOperation("***Finishing test***");
    const cleanupTimeout = 30000; // 30 seconds max for cleanup
    
    try {
      // Ensure page is still available and active
      if (page && !page.isClosed()) {
        await ensurePageActive(page);
      } else {
        logOperation("Page is closed, skipping cleanup");
      }
    } catch (error) {
      logOperation("Error during cleanup", { error: error instanceof Error ? error.message : String(error) });
    } finally {
      if (page && !page.isClosed()) {
        try {
          await page.close();
        } catch (error) {
          logOperation("Error closing page", { error: error instanceof Error ? error.message : String(error) });
        }
      }
      logOperation("***Finished***");
    }
  });
});
