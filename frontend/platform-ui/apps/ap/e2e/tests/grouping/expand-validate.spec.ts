import { locators } from "../utils/locators";
/**
 * Author: Diego Mas
 */
import { test, expect, Page } from "@playwright/test";
import {
  changeToSpendFile,
  goToAnalyzeSection,
  goToProgramSection,
  ensureDefaultLogin
} from "../utils/Utils";
import Api2 from "../utils/APi2";
import AnalyzeUtils from "../utils/AnalyzeUtils";

const spendFileName = "PageroFull_20230308_2.xlsx (Ver. 1)";

/**
 * Make every column of the active list grid visible.
 *
 * Analyze/List keeps one grid per level mounted, so `.choose-columns-grid-button`
 * and the `#options-columns` panel each exist three times (the id is duplicated).
 * Both have to be scoped to the visible grid — `button >> text=Select All`
 * used to resolve to the hidden Spend Lines panel and never became clickable.
 */
async function selectAllColumns(page: Page) {
  await page.locator(".choose-columns-grid-button:visible").first().click();
  await page
    .locator("#options-columns:visible")
    .getByRole("button", { name: "Select All" })
    .click();
  // "Select All" applies and closes the panel; give the grid time to re-render.
  await page.waitForTimeout(3000);
}

/**
 * Resolve a column's position by its header title.
 *
 * Column order is not stable — "Received Supplier Name" was inserted after
 * "Supplier Name", which pushed the spend count from index 3 (now "Status")
 * to index 4. The leading expand column contributes an empty `.k-column-title`,
 * so header indexes line up with `td` indexes.
 */
async function getColumnIndex(page: Page, title: string): Promise<number> {
  const headers = await page
    .locator(".k-grid-aria-root:visible .k-column-title")
    .allInnerTexts();
  const index = headers.findIndex(header => header.trim() === title);

  expect(
    index,
    `Column "${title}" not found. Headers: ${JSON.stringify(headers)}`
  ).toBeGreaterThan(-1);

  return index;
}

// this line always for login in calculum page
test.describe.serial("TestGrouping @prq", async () => {


test.beforeEach(async ({ page }) => {
  

    await ensureDefaultLogin(page);
    await page.goto("/");
    await page.waitForSelector(".loading-modal", { state: "detached" });
    await changeToSpendFile(page, spendFileName);
  });

  test("expand validate categorize list @integrated @analyze", async ({
    page
  }) => {
    await goToAnalyzeSection(page, "List", true, "Suppliers", false);
    // Wait grid fill and Table gets rows
    await page.waitForTimeout(1500);
    await selectAllColumns(page);
    const spendLineColumn = await getColumnIndex(page, "Spend Line");
    const repeatedProviderTRs = page.locator(".k-master-row:visible");
    const numRows = await repeatedProviderTRs.count();
    for (let i = 0; i < numRows; i++) {
      const expand =  repeatedProviderTRs
        .nth(i)
        .locator("td")
        .nth(0);
      const numSpend = await repeatedProviderTRs
        .nth(i)
        .locator("td")
        .nth(spendLineColumn)
        .innerText();
      
      if (parseInt(numSpend) > 1) {
        await expect(expand.locator(".k-icon.k-svg-icon.k-svg-i-plus")).toBeVisible()
      } else {
        await expect(expand.locator(".k-icon.k-svg-icon.k-svg-i-plus")).not.toBeVisible()
      }
    }
    //await page.pause()
  });

  test("click expand validate num of childs categorize list: @integrated @analyze", async ({
    page
  }) => {
    await goToAnalyzeSection(page, "List", true, "Suppliers", false);
    // Wait grid fill and Table gets rows
    await page.waitForTimeout(1500);
    await selectAllColumns(page);
    const spendLineColumn = await getColumnIndex(page, "Spend Line");
    const repeatedProviderTRs = page.locator(".k-master-row:visible");
    const numRows = await repeatedProviderTRs.count();
    for (let i = 0; i < numRows; i++) {
      const numSpend = await repeatedProviderTRs
        .nth(i)
        .locator("td")
        .nth(spendLineColumn)
        .innerText();
      const expand = repeatedProviderTRs
        .nth(i)
        .locator("td")
        .nth(0);
      if (parseInt(numSpend) > 1) {
        // Match on the response payload, not just the URL: every grid query
        // posts to /api/graphql, so a sibling level's query still in flight
        // would otherwise be picked up here.
        const [response] = await Promise.all([
          AnalyzeUtils.waitForGridQuery(page, "Suppliers"),
          expand.locator(".k-icon.k-svg-icon.k-svg-i-plus").click()
        ]);
        const result = JSON.parse(await response.text());
        expect(result.data.suppliers.totalCount).toBe(parseInt(numSpend));
        // Collapsing again: the toggle renders as a minus once expanded.
        await expand.locator(".k-icon.k-svg-icon.k-svg-i-minus").click();
      }
    }
  });

  
});
