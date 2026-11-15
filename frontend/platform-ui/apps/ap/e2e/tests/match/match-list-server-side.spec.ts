/**
 * E2E Playwright test suite for validating server-side pagination in the Match List section.
 *
 * @file match-list-server-side.spec.ts
 * @module tests/match/match-list-server-side
 * 
 * @description
 * - Ensures that the correct number of items are displayed when changing the page size in the Match List.
 * - Verifies API responses and UI updates for different pagination options.
 * - Handles login, spend file selection, and navigation to the Match List tab.
 * - Includes utility function to validate the page size against the API response.
 *
 * @tags @flakyResolved @match @tc-11801
 */

/**
 * Checks that the number of items returned in the GraphQL response matches the expected page size.
 *
 * @param page - The Playwright Page object.
 * @param result - The Playwright Response object for the GraphQL query.
 * @param expectedElementCount - The expected number of items per page.
 * @param summary - The Playwright Response object for the summary API.
 * @returns Promise<void>
 * @throws Error if the summary response is not OK or the response structure is invalid.
 */
import { Page, Response, expect, test } from "@playwright/test";
import { changeToSpendFile, ensureDefaultLogin } from "../utils/Utils";
import { locators } from "../utils/locators";

const given = {
  company: "Company Test",
  spendFile: "Pagero_Full_SME.xlsx (Ver. 1)",
  pagination: [25, 50],
};

/**
 * Matches the HTTP response that carries the Match List suppliers query.
 *
 * `/api/graphql` is a single multiplexed endpoint: the Match Overview tab,
 * the saved-filters bar and other widgets all POST to it. Matching on the
 * URL alone races and can capture an unrelated operation whose body lacks
 * `data.suppliers.edges` — the cause of the intermittent
 * "Invalid response structure: missing data.suppliers.edges" failure.
 * The Match List query is the only one whose request body references
 * `collectionQueryMatchLists`, so we disambiguate on that marker.
 */
const isMatchListGraphQl = (response: Response): boolean =>
  response.url().includes("api/graphql") &&
  response.request().method() === "POST" &&
  (response.request().postData() ?? "").includes("collectionQueryMatchLists") &&
  response.ok();
test.describe.serial("Match server side test", async () => {
  test.setTimeout(180000);
  let page: Page;
  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();
    await ensureDefaultLogin(page);
    await changeToSpendFile(page, given.spendFile);
  });
  test("Match server side @flakyResolved @match @tc-11801", async () => {
    // Go to macth section
    await Promise.all([
      page.waitForResponse(
        (res: any) => res.url().includes("/api/data-match/info") && res.ok(),
      ),
      page.locator(locators.sidebar.match).click(),
    ]);
    const firstElement = given.pagination[0];
    console.log("** Selecting page size", firstElement);
    const responseGraphQl = page.waitForResponse(isMatchListGraphQl);
    const responseGraphQlSummary = page.waitForResponse((response) =>
      response.url().includes("api/filters/match/spends/summary"),
    );

    console.log("Selecting tab");
    // Select List tab
    const [response, summary] = await Promise.all([
      responseGraphQl,
      responseGraphQlSummary,
      page.locator("a#matchListTab").click(),
    ]);

    await checkSelectedPageSize(page, response, firstElement, summary);
  });
  test("Match server side second pagination @flakyResolved @match @tc-11801", async () => {
    const secondElement = given.pagination[1];
    console.log("Selecting page size", secondElement);

    // Wait for new responses AFTER changing page size
    const responseGraphQl50 = page.waitForResponse(isMatchListGraphQl);
    const responseGraphQlSummary50 = page.waitForResponse((response) =>
      response.url().includes("api/filters/match/spends/summary"),
    );

    // Click on dropdown to open page size options
    await page
      .locator('.k-dropdownlist[aria-label="Select page"] .k-button')
      .click();

    // Wait for dropdown to open and find the option with text "50"
    const textToFind = "50";
    await page.waitForSelector(".k-list-item-text", { timeout: 10000 });

    // Use locator to find element with specific text
    const targetElement = page
      .locator(".k-list-item-text")
      .filter({ hasText: textToFind });

    // Check if element exists
    const count = await targetElement.count();

    if (count === 0) {
      console.log(
        `** No k-list-item-text element found containing text "${textToFind}"`,
      );
      throw new Error(
        `No k-list-item-text element found containing text "${textToFind}"`,
      );
    }

    console.log(
      `** Found ${count} k-list-item-text element(s) containing text "${textToFind}"`,
    );

    // Click on the first matching element
    await targetElement.first().click();

    console.log(
      `** Successfully clicked on k-list-item-text element containing "${textToFind}"`,
    );

    // Wait a bit for the page size change to take effect
    await page.waitForTimeout(1000);

    // Wait for the new responses after changing page size
    const [response50, summary50] = await Promise.all([
      responseGraphQl50,
      responseGraphQlSummary50,
    ]);

    // Validate the new page size
    await checkSelectedPageSize(page, response50, secondElement, summary50);
  });
  test.afterAll(async () => {
    console.log("***Finishing test***");
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

/**
 * Verifies that the selected page size matches the expected element count.
 * 
 * @param {Page} page - The playwright page object.
 * @param {any} result - The response object from the GraphQL query.
 * @param {number} expectedElementCount - The expected number of elements in the response.
 * @param {any} summary - The response object from the GraphQL query for the summary.
 * 
 * @returns {Promise<void>} - A promise that resolves when the validation is complete.
 */

async function checkSelectedPageSize(
  page: Page,
  result: any,
  expectedElementCount: number,
  summary: any,
): Promise<void> {
  try {
    // Wait for responses to be processed
    await page.waitForTimeout(2000);

    // Check if summary response is ok
    const summaryOk = await summary.ok();
    console.log(`** Expecting summary response will be True ==> ${summaryOk}`);

    if (!summaryOk) {
      console.log(`** Test fail because summary is ==> ${summaryOk}`);
      throw new Error(`Summary response failed: ${summaryOk}`);
    }

    // Get response body
    let responseBody: any = await result.json();

    // Validate response structure
    if (!responseBody?.data?.suppliers?.edges) {
      throw new Error(
        "Invalid response structure: missing data.suppliers.edges",
      );
    }

    const actualCount = responseBody.data.suppliers.edges.length;
    console.log(`** responseBody edges length: ${actualCount}`);

    // Log comparison
    console.log(`** Matching datas (expected === actual):`);
    console.log(
      `** Expected: ${expectedElementCount} === Actual: ${actualCount}`,
    );

    // Assert the count matches
    expect(actualCount).toBe(expectedElementCount);

    console.log(
      `** ✅ Page size validation passed: ${expectedElementCount} items found`,
    );
  } catch (error) {
    console.error(`** ❌ Error in checkSelectedPageSize:`, error);
    throw error; // Re-throw to fail the test
  }
}
