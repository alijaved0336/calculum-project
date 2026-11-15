import { test, expect } from "@playwright/test";
import {
  changeToSpendFile,
  ensureDefaultLogin,
  changeActiveCurrency,
  goToMatchSection
} from "../utils/Utils";
import { locators } from "../utils/locators";


test.beforeEach(async ({ page }) => {
  await ensureDefaultLogin(page);  
  await changeToSpendFile(page, "Spend Contractual Value.xlsx (Ver. 3)");
  await page.waitForSelector(".loading-modal", { state: "detached" });
  await page.goto("/");  
  console.log("Restoring the Currency to USD");
  await changeActiveCurrency(page,"USD");
});

test("metric overview card is showing properly with number of spends metric selected @match @ui @tc-7147 @us-6978", async ({ // SKIPPED: Flaky test - 2026-01-08
  page
}) => {
  const [response] = await Promise.all([
    page.waitForResponse(
      (res: any) => res.url().includes("/api/data-match/info") && res.ok()
    ),
    page.locator(locators.sidebar.match).click()
  ]);
  const result = await response.json(); 

  // Select metric
  const dropdownMetric = page.locator("#selected-category")
  await dropdownMetric.selectOption("Number of Spend Lines");

  const metricOverviewNumberOfSpends = Object.entries(result.lineChart.numberOfSpends)
  .map(([key, value]) => {
    // Validate
    if (value === null || typeof value !== "number") {
      console.log("** Error initializing lineChart: value is not a number");

      return {
        key,
        value: 0
      };
    }

    return {
      key,
      value
    };
  });

  const metricOverviewNumberOfSpendsTotal = metricOverviewNumberOfSpends.reduce(
    (total, item) => total + item.value,
    0
  );

  // Total is visible and correct
  await expect(
    page
      .locator(".card")
      .first()
      .getByText(`${metricOverviewNumberOfSpendsTotal}`).first()
  ).toBeVisible();
});

test("matched vs unmatched pie chart is showing properly with number of spends metric selected @match @ui @tc-7147 @us-6978", async ({
  page
}) => {
  const [response] = await Promise.all([
    page.waitForResponse(
      (res: any) => res.url().includes("/api/data-match/info") && res.ok()
    ),
    goToMatchSection(page)
  ]);

  const result = await response.json();

  

  // Select metric
  await page
    .getByRole("combobox", { name: "Metric" })
    .selectOption("Number of Spend Lines");

  const matchedVsUnmatchedNumberOfSpends = Object.entries(
    result.matchedPieChart.numberOfSpends
  ).map(([key, value]) => {
    // Validate
    if (value === null || typeof value !== "number") {
      console.log("** Error initializing lineChart: value is not a number");

      return {
        key,
        value: 0
      };
    }

    return {
      key,
      value
    };
  });

  const matchedVsUnmatchedNumberOfSpendsTotal = matchedVsUnmatchedNumberOfSpends.reduce(
    (total, item) => total + item.value,
    0
  );

  // Title is visible
  await expect(
    page
      .locator(".card")
      .nth(2)
      .getByText("Matched vs Unmatched Data")
  ).toBeVisible();

  // Total is visible and correct
  await expect(
    page
      .locator(".card")
      .nth(2)
      .getByText(`${matchedVsUnmatchedNumberOfSpendsTotal}`).first()
  ).toBeVisible();
});
