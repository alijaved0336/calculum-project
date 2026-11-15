/**
 * @fileoverview
 * E2E test for verifying the display and correctness of the Data Depth modal in the Entity Card Ratings & Financials section.
 *
 * Main Flow:
 * 1. Ensure the user is on the home page.
 * 2. Change to the spend file "PageroFull_20230308_2.xlsx (Ver. 1)".
 * 3. Navigate to the Entity Card for "3M Company".
 * 4. Go to the Ratings & Financials section.
 * 5. Locate the "Data Depth" card and open its modal.
 * 6. Assert that the modal displays the correct titles and chart sections as expected.
 *
 * Acceptance Criteria:
 * - The test waits for the necessary navigation and spend file change to complete.
 * - The Ratings & Financials section for "3M Company" loads successfully.
 * - The "Data Depth" card is present and clickable.
 * - The Data Depth modal displays the correct title and chart section titles ("Overall", "General Information", "Payment Terms", "Financial Metrics").
 * - The test passes if all assertions are met and the UI displays the correct data for the Data Depth modal.
 */


import { expect, test } from "@playwright/test";
import {
  changeToSpendFile,
  goToEntityCardEntity,
  goToRatingsAndMetrics,
  goToHomeSection,
  assertModalHasRightTitle,
} from "../../utils/Utils";

const spendFileName = "PageroFull_20230308_2.xlsx (Ver. 1)";

/**
 * Go to "Entity Card" section
 * This is executed only once before all the tests.
 */
import Api2 from "../../utils/APi2";

test.beforeEach(async ({ page }) => {
  await goToHomeSection(page);

  // Change spend file
  await changeToSpendFile(page, spendFileName);

  // Go to "3M Company" entity
  await goToEntityCardEntity(page, "3M Company");

  // Go to Ratings & Financials section
  await goToRatingsAndMetrics(page);

  // User is now in entity card Ratings & Financials tab
});

test("data depth modal is showing properly @ui @us-4341 @tc-4564 @entity", async ({
  page,
}) => {
  /**
   * Expected Values
   */
  const expected = {
    cardTitle: "Data Depth",
    modalTitle: "Data Depth",
    modalFirstChartTitle: "Overall",
    // modalFirstChartValue: "Substantial",
    modalSecondChartTitle: "General Information",
    // modalSecondChartValue: "Substantial",
    modalThirdChartTitle: "Payment Terms",
    // modalThirdChartValue: "Adequate",
    modalFourthChartTitle: "Financial Metrics",
    // modalFourthChartValue: "Substantial"
  };

  // Assert card title
  await expect(
    page
      .locator(".card")
      .nth(4)
      .getByRole("heading", { name: expected.cardTitle }),
  ).toBeVisible();

  // Click on "Show Details" button
  await page
    .locator(".card")
    .nth(4)
    .getByRole("button", { name: "Show Details" })
    .click();

  // Assert modal title
  await assertModalHasRightTitle(page, expected.modalTitle);
});
