/**
 * Created By Carlos O. (COB)
 * Test for Feature: 2748
 */

import { test, expect } from "@playwright/test";
import {
  changeToSpendFile,  
  goToAnalyzeSection,
  ensureDefaultLogin
} from "../utils/Utils";

import Api2 from "../utils/APi2";

test.beforeEach(async ({ page }) => {
  

  await page.goto("/");
  await ensureDefaultLogin(page)
  await page.waitForSelector(".loading-modal", { state: "detached" });
  await changeToSpendFile(page, "PageroFull_20230308_2.xlsx (Ver. 1)");
});

test("Lists clear filters applied us-5980 @ui @lists @review", async ({
  page
}) => {
  await goToAnalyzeSection(page, "List", true, 'Suppliers', false);

  // The analyze List grid is server-side paginated and renders one grid per tab
  // (Spend Lines/Suppliers/Parents) in the DOM, so `.k-master-row` counts rows
  // across all of them and only shows the current page. Assert on the visible
  // grid's pager total instead — `.k-pager-info` renders "<from> - <to> of <N>
  // items" (CalculumGrid.vue), where N is the real filtered total.
  const pagerTotal = async (): Promise<number> => {
    const info = page.locator(".k-pager-info:visible").first();
    const txt = (await info.innerText().catch(() => "")).trim();
    const match = txt.match(/of\s+([\d,]+)\s+items/i);
    return match ? parseInt(match[1].replace(/,/g, ""), 10) : NaN;
  };
  const clearAllFilters = page.getByTitle("Clear all filters").first();

  // Value filters persist server-side per spend file/user, so a prior run can
  // leave filters applied. Start from a clean slate before measuring.
  if (await clearAllFilters.isVisible().catch(() => false)) {
    await Promise.all([
      page.waitForResponse(r => r.url().includes("/api/graphql") && r.ok()),
      clearAllFilters.click()
    ]);
  }
  await expect.poll(pagerTotal, { timeout: 20_000 }).toBeGreaterThan(1);
  const baseline = await pagerTotal();

  // Apply an entityName value filter via the current Select component
  // (ColumnMenuGraphql.vue): open the column menu, search the value in
  // #searchSelectFilter, check it, and apply with #filter-results — the same
  // flow as utils/filterByFieldInGrid used by the active plan specs. The old
  // 'Select'/'Filter'/getByTitle('… Column Menu').locator('span') path is stale.
  await Promise.all([
    page.waitForResponse(
      response => response.url().endsWith("/entityName") && response.ok()
    ),
    page.getByRole("link", { name: "entityName Column Menu" }).click()
  ]);

  const searchInput = page.locator("#searchSelectFilter");
  await expect(searchInput).toBeVisible();
  await searchInput.fill("3M Company");
  await page.waitForTimeout(2500);
  await page.getByLabel("3M Company").first().check();

  await Promise.all([
    page.waitForResponse(
      response => response.url().includes("/api/graphql") && response.ok()
    ),
    page.locator("#filter-results").click()
  ]);

  // The applied filter narrows the result set.
  await expect.poll(pagerTotal, { timeout: 20_000 }).toBeLessThan(baseline);

  // Clearing all filters restores the original result set
  // (CalculumGridGraphql.clearFilters()).
  await Promise.all([
    page.waitForResponse(
      response => response.url().includes("/api/graphql") && response.ok()
    ),
    page.getByTitle("Clear all filters").first().click()
  ]);

  await expect.poll(pagerTotal, { timeout: 20_000 }).toBe(baseline);
});
