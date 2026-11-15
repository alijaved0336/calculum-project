/**
 * E2E test suite for verifying custom data points functionality in global filters.
 *
 * @file Custom Data Points test for global filters.
 * @module tests/globalFilters/custom-data-points-7785.spec
 *
 * @remarks
 * - Ensures default login and switches to the "MY_DEMO.xlsx (Ver. 1)" spend file before each test.
 * - Clears all filters after each test to maintain test isolation.
 *
 * @tags
 * - @ts7785
 * - @us7736
 * - @intergrated
 *
 * @test
 * - Opens the global filters modal and selects the "Custom Fields" category.
 * - Waits for the "Tax Reported" custom data point field to load.
 * - Applies the "California" filter to the "Tax Reported" field.
 * - Verifies that the filter badge displays the correct key and value.
 *
 * @see GlobalFiltersUtils
 * @see ensureDefaultLogin
 * @see changeToSpendFile
 */
import { expect, test } from "@playwright/test";
import {
  changeToSpendFile,
  ensureDefaultLogin,
} from "../utils/Utils";
import { GlobalFiltersUtils } from "../utils";

test.beforeEach(async ({ page }) => {
  await ensureDefaultLogin(page);
  await changeToSpendFile(page, "MY_DEMO.xlsx (Ver. 1)");
  await page.waitForSelector(".loading-modal", { state: "detached" });
});
test("Custom Data Points @ts7785 @us7736 @intergrated", async ({ page }) => {
  await GlobalFiltersUtils.clearAllFiltersFromNavbar(page);

  console.log("open filter dialog and select custom fields category");
  await GlobalFiltersUtils.openModal(page);

  console.log('click on the "Custom Fields" category');
  await GlobalFiltersUtils.openCategory(page, "Custom Fields");

  await Promise.all([
    GlobalFiltersUtils.waitForFieldResponse(page, "customDataPoint3"),
    GlobalFiltersUtils.openField(page, "Tax Reported"),
  ]);
  await GlobalFiltersUtils.clickShowResult(page, "California", "Tax Reported");
  console.log("check the new applied Filter Badge Container");
  let taxReportedBadge = page.locator(".filter-applied-badge");
  let key = await taxReportedBadge
    .locator("span.mr-1.text-capitalize")
    .innerText();
  let value = await taxReportedBadge
    .locator("span.text-capitalize.font-medium")
    .innerText();

  console.log("key : ", key, "value : ", value);
  expect(key).toBe("Tax Reported :");
  expect(value).toBe("California");
});

test.afterEach(async ({ page }) => {
  await GlobalFiltersUtils.clearAllFiltersFromNavbar(page);
});
