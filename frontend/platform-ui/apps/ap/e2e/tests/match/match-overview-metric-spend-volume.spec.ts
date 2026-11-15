import { test, expect, Page } from "@playwright/test";
import { StringUtils } from "../utils";
import {
  changeActiveCurrency,
  changeToSpendFile,
  ensureDefaultLogin,
  goToMatchSection,
} from "../utils/Utils";
import { locators } from "../utils/locators";

test.describe.serial("Macth Overveiw Metric", async () => {
  let page: Page;
  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();
    await ensureDefaultLogin(page);
    await changeToSpendFile(page, "Spend Contractual Value.xlsx (Ver. 3)");
    await page.waitForSelector(".loading-modal", { state: "detached" });
    await page.goto("/");
    //Select USD
    console.log("Select currency");
    await changeActiveCurrency(page,"USD");
  });
  test("metric overview card is showing properly with spend volume metric selected @match @ui @tc-7147 @us-6978", async () => {
    // Go to macth section
    const [response] = await Promise.all([
      page.waitForResponse(
        (res: any) => res.url().includes("/api/data-match/info") && res.ok(),
      ),
      page.locator(locators.sidebar.match).click(),
    ]);

    const result = await response.json();
    // Select metric
    await page
      .getByRole("combobox", { name: "Metric" })
      .selectOption("Spend Volume");

    const metricOverviewSpendVolume = Object.entries(
      result.lineChart.spendVolume,
    ).map(([key, value]) => {
      // Validate
      if (value === null || typeof value !== "number") {
        console.log("** Error initializing lineChart: value is not a number");

        return {
          key,
          value: 0,
        };
      }

      return {
        key,
        value,
      };
    });

    const metricOverviewSpendVolumeTotal = metricOverviewSpendVolume.reduce(
      (total, item) => total + item.value,
      0,
    );

    const metricOverviewSpendVolumeTotalFormatted =
      StringUtils.formatBigNumbers(metricOverviewSpendVolumeTotal);

    // Total is visible and correct
    await expect(
      page
        .locator(".card")
        .first()
        .getByText(`${metricOverviewSpendVolumeTotalFormatted}`)
        .first(),
    ).toBeVisible();
  });

  test("matched vs unmatched pie chart is showing properly with spend volume metric selected @match @ui @tc-7147 @us-6978", async () => {
    // Go to first program available

    await Promise.all([
      page.waitForResponse(
        (res: any) => res.url().includes("/analyze_programs") && res.ok(),
      ),
      page.locator(locators.sidebar.program).click(),
    ]);
    // Go to macth section
    const [response] = await Promise.all([
      page.waitForResponse(
        (res: any) => res.url().includes("/api/data-match/info") && res.ok(),
      ),
      page.locator(locators.sidebar.match).click(),
    ]);

    const result = await response.json();

    // Select metric
    await page
      .getByRole("combobox", { name: "Metric" })
      .selectOption("Spend Volume");

    const matchedVsUnmatchedSpendVolume = Object.entries(
      result.matchedPieChart.spendVolume,
    ).map(([key, value]) => {
      // Validate
      if (value === null || typeof value !== "number") {
        return {
          key,
          value: 0,
        };
      }

      return {
        key,
        value,
      };
    });

    const matchedVsUnmatchedSpendVolumeTotal =
      matchedVsUnmatchedSpendVolume.reduce(
        (total, item) => total + item.value,
        0,
      );

    const matchedVsUnmatchedSpendVolumeTotalFormatted =
      StringUtils.formatBigNumbers(matchedVsUnmatchedSpendVolumeTotal);

    // Title is visible
    await expect(
      page.locator("h6").getByText("Matched vs Unmatched Data"),
    ).toBeVisible();

    // Total is visible and correct
    await expect(
      page
        .locator("p")
        .nth(3)
        .getByText(`${matchedVsUnmatchedSpendVolumeTotalFormatted}`),
    ).toBeVisible();
  });
});
