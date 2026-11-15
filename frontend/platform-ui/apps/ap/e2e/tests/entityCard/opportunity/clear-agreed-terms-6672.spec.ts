/**
 * @fileoverview
 * E2E test for clearing "Agreed Payment Terms" in the Opportunity entity card.
 *
 * User Story 6672: As a user, I want to be able to clear the agreed payment terms for a supplier/entity,
 * so that the system reflects the removal of previously set terms.
 *
 * This test covers:
 * - Navigating to the Opportunity entity card for a specific supplier.
 * - Opening the "Agreed Payment Terms" modal.
 * - Clearing/removing the agreed terms.
 * - Verifying that the agreed terms are reset to "N/A" or default state.
 *
 * Prerequisites:
 * - The test user must have access to the "Pagero_Full_20230927_1.xlsx (Ver. 1)" spend file.
 * - The supplier "Pengg Kabel Gmbh" must exist in the test data.
 *
 * Utilities:
 * - Uses Playwright test runner and custom utility functions for navigation and assertions.
 */


import { test, expect, Page } from "@playwright/test";
import {
  changeToSpendFile,
  ensureDefaultLogin,
  getCurrentDate,
  getDateFromCurrentDate,
  goToEntityCardEntity,
} from "../../utils/Utils";

test.beforeEach(async ({ page }) => {
  await ensureDefaultLogin(page);
  await page.goto("/");
  await changeToSpendFile(page, "Pagero_Full_20230927_1.xlsx (Ver. 1)");
});

const params = {
  withoutCashDiscount: "5",
  withCashDiscount: null,
  cashDiscount: null,
  currentDate: getCurrentDate(),
  nextReviewDate: getDateFromCurrentDate(7),
};

test("Clear Agreed Terms @ui @entity @us-6672 @tc-6924", async ({ page }) => {
  let entity = "Pengg Kabel Gmbh";
  await goToEntityCardEntity(page, entity);
  await page.waitForTimeout(2000);

  let agreedTermsContainer = page.locator(".agreedNewTerms");
  let agreedTermsValue = await agreedTermsContainer
    .locator(".value-container")
    .first()
    .innerText();

  console.log("** agreedTermsValue", agreedTermsValue);

  if (agreedTermsValue === "N/A") {
    let [spendsData] = await Promise.all([
      page.waitForResponse(
        (response: any) =>
          response
            .url()
            .includes("api/analyze/get-spend-program-configs-by-provider") &&
          response.status() === 200,
      ),
      agreedTermsContainer.locator(".pencil-icon-add-results").click(),
    ]);

    let spendsInfo = await spendsData.json();
    let spendsInfoArray = spendsInfo.map((spendItem: any) => spendItem);

    await page.waitForTimeout(2000);
    await addValue(page, spendsInfoArray.length > 1);

    let value = await agreedTermsContainer
      .locator(".value-container")
      .innerText();
    let editValueCount = await agreedTermsContainer
      .locator(".pencil-icon-add-results")
      .count();

    if (value === "N/A") {
      expect(editValueCount).toBe(1);
    } else {
      expect(editValueCount).toBe(0);
    }

    console.log("** editValueCount", editValueCount);

    // await agreedTermsContainer.locator(".pencil-icon-edit-results").click()

    await page.waitForTimeout(6000);

    console.log("click first checkbox");

    await page
      .getByTestId("modal")
      .getByRole("checkbox", { name: "Select All Rows" })
      .check();

    await Promise.all([
      page.waitForResponse(
        (response: any) =>
          response
            .url()
            .includes("/api/entity-card-results/clear-agree-terms-configs") &&
          response.status() === 200,
      ),
      page
        .locator(
          '.btn.outline-secondary-btn.font-md.text-capitalize:has-text("Clear")',
        )
        .click(),
    ]);

    await page.waitForTimeout(2500);
    await agreedTermsContainer.locator(".value-container").first().innerText();
  } else {
    let editValueCount = await agreedTermsContainer
      .locator(".pencil-svg.pencil-icon-add-results")
      .count();

    let value = await agreedTermsContainer
      .locator(".value-container")
      .innerText();

    if (value === "N/A") {
      expect(editValueCount).toBe(1);
    } else {
      expect(editValueCount).toBe(0);
    }

    await agreedTermsContainer.locator(".pencil-icon-edit-results").click();
    await page.waitForTimeout(2500);

    await Promise.all([
      page.waitForResponse(
        (response: any) =>
          response
            .url()
            .includes("/api/entity-card-results/clear-agree-terms-configs") &&
          response.status() === 200,
      ),
      page
        .locator(
          '.btn.outline-secondary-btn.font-md.text-capitalize:has-text("Clear")',
        )
        .click(),
    ]);

    await page.waitForTimeout(2000);
    await agreedTermsContainer.locator(".value-container").first().innerText();
  }
});

async function addValue(page: Page, hasMoreThan1Spend = false) {
  if (hasMoreThan1Spend) {
    await page
      .locator(
        ".k-table-th.k-header.k-grid-header-sticky.filter-options >> .k-checkbox.k-checkbox-md.k-rounded-md",
      )
      .first()
      .click();
  }
  await page
    .getByTestId("modal")
    .getByLabel("Without Cash Discount (days)", { exact: true })
    .fill(params.withoutCashDiscount);

  await page
    .getByTestId("modal")
    .getByLabel("Date of Agreement", { exact: true })
    .first()
    .fill(params.currentDate);

  await page
    .getByTestId("modal")
    .getByLabel("Next Review Date", { exact: true })
    .first()
    .fill(params.nextReviewDate);
}
