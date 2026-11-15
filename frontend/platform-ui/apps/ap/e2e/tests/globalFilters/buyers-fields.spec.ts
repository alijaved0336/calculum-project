/**
 * @fileoverview
 * E2E tests for the Buyers fields in Global Filters.
 *
 * This test suite validates the correct display and interaction of the "Buying Entity Country"
 * field in the Global Filters dialog, ensuring that the field is present, options are loaded,
 * and filters can be applied as expected.
 *
 * Test Flow:
 * 1. Launch a browser and open the application.
 * 2. Ensure the user is logged in and the correct spend file is selected.
 * 3. Open the Global Filters dialog and expand the "Geography" category.
 * 4. Open the "Buying Entity Country" field and wait for the API response.
 * 5. If options are available, select the first option and apply the filter.
 *
 * Acceptance Criteria:
 * - The "Buying Entity Country" field is visible in the Global Filters dialog.
 * - The API returns a list of available options for the field.
 * - The user can select an option and apply the filter successfully.
 *
 * Test tags:
 * - @api
 * - @global-filters
 * - @us-11029
 */

import { test, Page } from "@playwright/test";
import { changeToSpendFile, ensureDefaultLogin } from "../utils/Utils";

import { GlobalFiltersUtils } from "../utils";
import {
  safeOperation,
  logOperation,
  ensurePageActive,
} from "../utils/PlaywrightTestHelpers";

const spendFileName = "Pagero_DifferentBuyers.xlsx (Ver. 1)";
const categoryGeography = "Geography";

test.describe
  .serial("Global filters -> BUYERS Fields @api @global-filters @us-11029", async () => {
  let page: Page;
  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();
    await ensureDefaultLogin(page);
    await changeToSpendFile(page, spendFileName);
  });

  test("Global Filter Buying Entity Country is showing in global filters dialog ", async () => {
    await safeOperation(page, async () => {
      await ensurePageActive(page);
      logOperation("Checking for close icon and closing modal if present");
      
      const closeIcon = page
        .locator("calculum-modal-content-custom")
        .locator("close-icon");
      const exists = (await closeIcon.count()) > 0;
      const isVisible = exists && (await closeIcon.isVisible());
      if (exists && isVisible) {
        logOperation("Close icon found, closing modal", { exists, isVisible });
        await closeIcon.click();
      }
    }, "Close modal if present");

    await safeOperation(page, async () => {
      await ensurePageActive(page);
      logOperation("Opening Global Filters modal");
      await GlobalFiltersUtils.openModal(page);
    }, "Open Global Filters modal");

    await safeOperation(page, async () => {
      await ensurePageActive(page);
      logOperation("Opening Geography category and Buying Entity Country field");
      await GlobalFiltersUtils.openCategoryThenField(
        page,
        {
          categoryName: categoryGeography,
          fieldName: "Buying Entity Country",
        },
        "buyerCountry",
      );
    }, "Open category and field");
  });

  test("Global Filter Buying Entity Region is showing in global filters dialog ", async () => {
    await safeOperation(page, async () => {
      await ensurePageActive(page);
      logOperation("Checking for close icon and closing modal if present");
      
      const closeIcon = page
        .locator("calculum-modal-content-custom")
        .locator("close-icon");

      const exists = (await closeIcon.count()) > 0;
      const isVisible = exists && (await closeIcon.isVisible());
      if (exists && isVisible) {
        logOperation("Close icon found, closing modal", { exists, isVisible });
        await closeIcon.click();
      }
    }, "Close modal if present");

    await safeOperation(page, async () => {
      await ensurePageActive(page);
      logOperation("Opening Global Filters modal");
      await GlobalFiltersUtils.openModal(page);
    }, "Open Global Filters modal");

    await safeOperation(page, async () => {
      await ensurePageActive(page);
      logOperation("Opening Geography category and Buying Entity Region field");
      await GlobalFiltersUtils.openCategoryThenField(
        page,
        {
          categoryName: categoryGeography,
          fieldName: "Buying Entity Region",
        },
        "buyerRegion",
      );
    }, "Open category and field");
  });

  // Clean up
  test.afterEach(async () => {
    await safeOperation(page, async () => {
      await ensurePageActive(page);
      logOperation("Clearing all filters from navbar");
      await GlobalFiltersUtils.clearAllFiltersFromNavbar(page);
    }, "Clear all filters");

    await safeOperation(page, async () => {
      await ensurePageActive(page);
      logOperation("Restoring default login");
      await ensureDefaultLogin(page);
    }, "Restore default login");
  });
});
