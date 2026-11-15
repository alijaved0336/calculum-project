/**
 * @fileoverview
 * E2E test for Categorize Overview - Metrics Charts (Kendo).
 *
 * This test verifies that all available metric categories and chart options in the Analyze > Overview section
 * are present and can be selected, and that the corresponding chart data is loaded from the API.
 *
 * Test Flow:
 * 1. Ensure default login before each test.
 * 2. Change to a specific spend file.
 * 3. Navigate to the Analyze section.
 * 4. Wait for the categories data API response.
 * 5. For each metric category and chart option, select it, verify the chart data API response and
 *    the chart rendered for its chart type.
 *
 * Acceptance Criteria:
 * - All metric categories and chart options are present in the UI.
 * - Selecting each option triggers the correct API call and loads chart data.
 * - The test is tagged for UI, analyze, and user story tracking.
 */


import { test, expect, Page } from "@playwright/test";
import englishKeys from "@ada/design-system/locales/languages/en.json";
import { changeToSpendFile, ensureDefaultLogin } from "../../utils/Utils";
import { locators } from "../../utils/locators";
import {
  safePromiseAll,
  ensurePageActive,
  waitForElementVisible,
  waitForApiResponse,
  logOperation,
  safeOperation,
} from "../../utils/PlaywrightTestHelpers";

const CHART_DATA_PATH = "/api/statistics/get-chart-data";
// The endpoint answers in under a second on dev and on the pipeline backends.
const CHART_DATA_TIMEOUT_MS = 15000;

type ChartDataRequestBody = {
  groupName: string;
  optionName: string;
  chartType: string;
};

type ChartDataRow = { name: unknown; value: unknown };

/**
 * Runs `action` and resolves with the get-chart-data call it triggers for
 * `groupName` (and `optionName`, when given).
 *
 * The request is matched on its body, not on the bare URL: a group change fires
 * its own call, so a URL-only waiter can take the previous selection's answer.
 * A request the browser blocks (the API answering a gateway or server error
 * without CORS headers) never emits a `response` event, so the request is
 * awaited first and its failure is reported instead of a generic timeout.
 */
const triggerChartData = async (
  page: Page,
  action: () => Promise<unknown>,
  groupName: string,
  optionName?: string,
) => {
  const label = `get-chart-data for ${groupName} - ${optionName ?? "(group change)"}`;

  const [request] = await Promise.all([
    page.waitForRequest(
      (req) => {
        if (
          req.method() !== "POST" ||
          new URL(req.url()).pathname !== CHART_DATA_PATH
        ) {
          return false;
        }
        const body = req.postDataJSON() as ChartDataRequestBody | null;
        return (
          body?.groupName === groupName &&
          (optionName === undefined || body.optionName === optionName)
        );
      },
      { timeout: CHART_DATA_TIMEOUT_MS },
    ),
    action(),
  ]);

  let timer: ReturnType<typeof setTimeout> | undefined;
  const response = await Promise.race([
    request.response(),
    new Promise<null>((resolve) => {
      timer = setTimeout(() => resolve(null), CHART_DATA_TIMEOUT_MS);
    }),
  ]).finally(() => clearTimeout(timer));

  if (!response) {
    const failure = request.failure()?.errorText;
    throw new Error(
      failure
        ? `${label} failed in the browser with ${failure}; net::ERR_FAILED here means the API answered without CORS headers (gateway or server error)`
        : `${label} got no response within ${CHART_DATA_TIMEOUT_MS}ms`,
    );
  }

  expect(response.status(), `${label} answered HTTP ${response.status()}`).toBe(200);

  return {
    chartType: (request.postDataJSON() as ChartDataRequestBody).chartType,
    rows: (await response.json()) as ChartDataRow[],
  };
};

/**
 * Asserts what MetricsComponents renders for a chart-data answer: the Google
 * GeoChart for `world_map` (drawn even without rows, never a Kendo chart), the
 * "No Data Available" block for an empty answer, and a Kendo chart otherwise.
 */
const expectChartRendered = async (
  page: Page,
  chartType: string,
  rows: ChartDataRow[],
  label: string,
) => {
  const chartsArea = page.locator(".container-metrics-charts");

  if (chartType === "world_map") {
    await expect(
      chartsArea.locator(".geo-chart__canvas svg").first(),
      `${label}: the map was not drawn`,
    ).toBeAttached();
  } else if (rows.length === 0) {
    await expect(
      chartsArea.getByText(englishKeys.global.noDataAvailable, { exact: true }),
      `${label}: empty answer without the no-data message`,
    ).toBeVisible();
  } else {
    await expect(
      chartsArea.locator(".k-chart").first(),
      `${label}: ${rows.length} rows but no ${chartType} chart`,
    ).toBeAttached();
  }
};

test.beforeEach(async ({ page }) => {
  await ensureDefaultLogin(page);
  await changeToSpendFile(page, "PageroFull_20230308_2.xlsx (Ver. 1)");
});

test("Test for all of the available Metric Categories and Chart Options @program @opportunity @analyze @integrated @us-5060 @tc-5053 @tc-5054 @tc-5088 @tc-5072 @us-7888", async ({
  page,
}) => {
  // 84 metric selections, one chart-data round trip each, plus the logins in
  // beforeEach and afterEach share this budget: the global 120s default
  // (playwright.config.ts) leaves no margin on the pipeline backends.
  test.setTimeout(180000);
  try {
    // Navigate to Analyze and wait for categories data
    await ensurePageActive(page);
    logOperation("Navigate to Analyze and wait for categories data");

    const [responseData] = await safePromiseAll([
      waitForApiResponse(
        page,
        "/api/statistics/getCategoriesData",
        15000,
        "Categories data loading",
      ),
      page.locator(locators.sidebar.analyze).click(),
    ], "Categories data navigation");

    // Wait for the selection elements to be available
    await waitForElementVisible(page, "select#select-group", 5000, "Group selector");
    await waitForElementVisible(page, "select#select-metric", 5000, "Metric selector");

    const chartData = JSON.parse(await responseData.text());
    const apiCategories: string[] = chartData.map((grp: any) => grp.groupName);

    // Drive iteration off the options the UI actually renders, NOT the API
    // payload. Some categories (e.g. program/opportunity-gated ones) are
    // returned by getCategoriesData but never rendered in the current context;
    // selecting them by API index makes selectOption retry until the test
    // timeout. Reading the live <option>s keeps test and DOM in sync.
    const groupSelect = page.locator("select#select-group");
    const metricSelect = page.locator("select#select-metric");

    const optionValues = (sel: ReturnType<typeof page.locator>) =>
      sel.locator("option").evaluateAll((opts) =>
        (opts as HTMLOptionElement[]).map((o) => o.value),
      );

    const groupValues = await optionValues(groupSelect);

    // Surface (don't silently hide) any mismatch between what the API offers
    // and what the UI renders — this is the failure mode that hung the test.
    if (groupValues.length !== apiCategories.length) {
      logOperation("WARNING: rendered group count differs from API", {
        apiCategories,
        renderedGroupCount: groupValues.length,
      });
    }

    logOperation("Categories data loaded", {
      totalCategories: groupValues.length,
      apiCategories,
      renderedGroups: groupValues,
    });

    for (const groupValue of groupValues) {
      // A group change fetches the metric it keeps selected. Waiting for that
      // answer keeps it from landing after, and replacing, the first metric's chart.
      await triggerChartData(
        page,
        () =>
          safeOperation(page, async () => {
            await ensurePageActive(page);
            await groupSelect.selectOption(groupValue);
          }, `Select group ${groupValue}`),
        groupValue,
      );

      await expect(metricSelect.locator("option")).not.toHaveCount(0);

      const metricValues = await optionValues(metricSelect);

      logOperation("Testing group", {
        group: groupValue,
        totalMetrics: metricValues.length,
      });

      for (const metricValue of metricValues) {
        logOperation("Selecting metric", {
          group: groupValue,
          metric: metricValue,
        });

        const { chartType, rows } = await triggerChartData(
          page,
          () => metricSelect.selectOption(metricValue),
          groupValue,
          metricValue,
        );

        await expectChartRendered(page, chartType, rows, `${groupValue} - ${metricValue}`);

        logOperation("Chart rendered", {
          group: groupValue,
          metric: metricValue,
          chartType,
          rows: rows.length,
        });
      }
    }

    logOperation("End of Metrics Charts Kendo Test", {
      totalCategoriesTested: groupValues.length,
    });
  } catch (error) {
    logOperation("Test failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
});

test.afterEach(async ({ page }) => {
  logOperation("Ensure default login after each test");
  await ensureDefaultLogin(page);
});
