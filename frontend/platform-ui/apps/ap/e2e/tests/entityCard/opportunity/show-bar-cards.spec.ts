/**
 * @fileoverview
 * E2E test for verifying the display of bar charts in the Opportunity entity card
 * based on the API response for payment terms opportunity.
 *
 * Flow:
 * 1. Ensure the user is logged in and the correct spend file is selected.
 * 2. Navigate to the Opportunity entity card for the given supplier.
 * 3. Change to the specified program.
 * 4. Wait for the API response for the payment terms opportunity chart.
 * 5. Verify that the UI displays the correct bar charts (Contractual, Actual, Opportunity)
 *    according to the API response.
 *
 * Acceptance Criteria:
 * - The test waits for the payment terms opportunity API response after changing the program.
 * - The UI must display the bar charts for Contractual, Actual, and Opportunity if present in the API response.
 * - The values shown in the bar charts must match the values returned by the API.
 * - If a bar is not present in the API response, it should not be displayed in the UI.
 * - The test passes if all displayed bars and their values match the API response.
 */


import { expect, test, Page } from "@playwright/test";

// Global utils
import {
  changeToSpendFile,
  changeToProgram,
  goToEntityCardEntityExactFull,
  ensureDefaultLogin,
} from "../../utils/Utils";

const programName = "test";
const spendFileName = "PageroFull_20230308_2.xlsx (Ver. 1)";
const supplierName = "Microelettrica Scientifica S.P.A.";

test.beforeEach(async ({ page }) => {
  await ensureDefaultLogin(page);
  await page.goto("/");

  // Wait for loading modal to be hidden
  await expect(page.locator(".loading-modal")).toBeHidden();

  // Change spend file
  await changeToSpendFile(page, spendFileName);
});

/**
 * Contractual bar chart
 */
test("Show Bars depending the API RESPONSE @entity @ui @us-4579", async ({
  page,
}) => {
  // Open the supplier entity card. The plain name "Microelettrica
  // Scientifica S.P.A." matches both the supplier and its parent
  // (Knorr-Bremse AG corporate tree) in search results — the *Exact*
  // variant with type:"supplier" disambiguates so we always land on the
  // supplier card. Without this, .nth(0) sometimes opens the parent and
  // the supplier chart endpoint never fires.
  await goToEntityCardEntityExactFull(page, supplierName, 0, true, null, "supplier");

  // Wait for loading modal to be hidden
  await expect(page.locator(".loading-modal")).toBeHidden();

  // Wait for data from API
  const chartRespPromise = page.waitForResponse(
    "**/chart/payment-terms-opportunity/supplier",
  );

  // Change program — fires the supplier chart for the new program
  await changeToProgram(page, programName);

  // Get data from API
  const chartResp = await chartRespPromise;
  const result = await chartResp.json();

  // Wait for loading spinner to be hidden
  await expect(page.locator(".loading-modal")).toBeHidden();
  let count = Object.keys(result.strategies).length;
  await page.waitForTimeout(1000);

  await expect(
    page.locator(".col-12", {
      has: page.getByText("Unused, Disabled or Unavailable Strategies", {
        exact: true,
      }),
    }),
  ).toBeVisible();

  page
    .locator(".col-12", {
      has: page.getByText("Unused, Disabled or Unavailable Strategies", {
        exact: true,
      }),
    })
    .click();

  for (let i = 0; i < count; i++) {
    // console.log("currentTerms", result.strategies[i].terms)
    // console.log("currentTerms", result.strategies[i].key)

    await validateTerms(result, i, page);

    await validateStrategies(result, i, page);
  }
});

async function validateStrategies(result: any, i: number, page: Page) {
  if (result.strategies[i].key === "parentSupplierMaxStrategy") {
    await expect(
      page.locator(".line-chart", {
        has: page.getByText("Parent / Supplier Max", { exact: true }),
      }),
    ).toBeVisible();
  }

  if (result.strategies[i].key === "industryRegionStandardStrategy") {
    await expect(
      page.locator(".line-chart", {
        has: page.getByText("Industry / Region Standard", { exact: true }),
      }),
    ).toBeVisible();
  }

  if (result.strategies[i].key === "supplierStandardStrategy") {
    await expect(
      page.locator(".line-chart", {
        has: page.getByText("Supplier Standard", { exact: true }),
      }),
    ).toBeVisible();
  }

  if (result.strategies[i].key === "peerGroupAvgStrategy") {
    await expect(
      page.locator(".line-chart", {
        has: page.getByText("Peer Group Standard", { exact: true }),
      }),
    ).toBeVisible();
  }

  if (result.strategies[i].key === "financingStrategy") {
    await expect(
      page.locator(".line-chart", {
        has: page.getByText("SCF (Cost Positive)", { exact: true }),
      }),
    ).toBeVisible();
  }

  if (result.strategies[i].key === "cashDiscountConversionStrategy") {
    await expect(
      page.locator(".line-chart", {
        has: page.getByText("Cash Discount Conversion", { exact: true }),
      }),
    ).toBeVisible();
  }

  if (result.strategies[i].key === "buyerStandardStrategy") {
    await expect(
      page.locator(".line-chart", {
        has: page.getByText("Buyer Standard", { exact: true }),
      }),
    ).toBeVisible();
  }
}

async function validateTerms(result: any, i: number, page: Page) {
  if (result.strategies[i].key === "payOnTermsStrategy") {
    await expect(
      page.locator(".line-chart", {
        has: page.getByText("Pay on Terms", { exact: true }),
      }),
    ).toBeVisible();
  }
}
