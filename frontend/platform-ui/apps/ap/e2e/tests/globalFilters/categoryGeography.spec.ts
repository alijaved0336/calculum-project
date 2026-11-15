
/**
 * Test suite for verifying the "Geography" category in the global filters dialog.
 *
 * @fileoverview
 * This test suite uses Playwright to automate UI and API checks for the Geography category
 * in the global filters dialog. It ensures that the category and its fields ("Supplier Region" and
 * "Supplier Country") are present and populated as expected.
 *
 * @remarks
 * - The tests are marked as serial to ensure state consistency.
 * - Uses utility functions for login, file selection, and global filter interactions.
 * - Includes checks for API responses and UI elements.
 *
 * @tags
 * - @us-6474
 * - @api
 * - @global-filters
 * - @flakyResolved
 */

/**
 * Checks that a specific field in the global filters dialog is present and populated.
 *
 * @param page - The Playwright Page object.
 * @param fieldNameInAPIResponse - The field name as returned in the API response.
 * @param fieldName - The display name of the field in the UI.
 *
 * @remarks
 * - Waits for the API response for the field.
 * - Opens the field in the global filters dialog.
 * - Asserts that the field has at least one option.
 * - Verifies that the first option is truthy and present in the UI.
 */
import {Page, expect, test} from "@playwright/test";

// Utils
import {
  changeToSpendFile,
  ensureDefaultLogin,
} from "../utils/Utils";
import {GlobalFiltersUtils} from "../utils";

const spendFileName = "PageroFull_20230308_2.xlsx (Ver. 1)";

const categoryName = "Geography";

test.describe.serial("Geography Category @us-6474 @flakyResolved", () => {
  let page: Page;
  test.beforeAll(async ({browser}) => {
    page = await browser.newPage();
    await ensureDefaultLogin(page);
    await changeToSpendFile(page, spendFileName);
    await page.waitForSelector(".loading-modal", {state: "detached"});
  });

  test("geography category is showing in global filters dialog @api @global-filters @us-6474", async () => {
    await GlobalFiltersUtils.openModal(page);
    await GlobalFiltersUtils.openCategory(page, categoryName);
  });

  // *** Supplier Region ***

  test("supplier region field is showing in the global filters dialog @flakyResolved @global-filters @api @us-6474", async () => {
    const fieldNameInAPIResponse = "entityRegion";
    const fieldName = "Supplier Region";
    await checkToGlobalFiltersDialog(page, fieldNameInAPIResponse, fieldName);
  });

  // *** Supplier Country ***

  test("supplier country field is showing in the global filters dialog @flakyResolved @global-filters @api @us-6474", async () => {
    const fieldNameInAPIResponse = "entityCountryName";
    const fieldName = "Supplier Country";
    await checkToGlobalFiltersDialog(page, fieldNameInAPIResponse, fieldName);
  });

  test.afterAll(async () => {
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

async function checkToGlobalFiltersDialog(
  page: Page,
  fieldNameInAPIResponse: string,
  fieldName: string,
) {
  const [response] = await Promise.all([
    GlobalFiltersUtils.waitForFieldResponse(page, fieldNameInAPIResponse),
    GlobalFiltersUtils.openField(page, fieldName),
  ]);

  const result = await response.json();
  console.log("result", result.value.length);
  expect(result.value.length).toBeGreaterThan(0);

  const optionName = result.value[0];
  console.log("optionName", optionName);
  expect(optionName).toBeTruthy();

  await GlobalFiltersUtils.checkOptionInField(page, {
    optionName,
    fieldName,
  });
}
