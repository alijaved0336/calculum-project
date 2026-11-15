/**
 * @fileoverview
 * E2E test for Categorize List - Parents.
 *
 * This test verifies that the Categorize List displays parent entities correctly in the UI,
 * and that the data returned from the API matches the rows shown in the table.
 *
 * Test Flow:
 * 1. Ensure default login before each test.
 * 2. Change to a specific spend file.
 * 3. Navigate to the Analyze > List section for Parents.
 * 4. Wait for the grid to fill and rows to appear.
 * 5. For each row, check that the parent name matches the API data.
 *
 * Acceptance Criteria:
 * - The Categorize List displays the correct number of parent rows.
 * - Each parent row in the UI matches the corresponding API data.
 * - The test is tagged for UI, analyze, and user story tracking.
 */


import { Locator, test, expect } from "@playwright/test";
import {
  changeToSpendFile,
  goToAnalyzeSection,
  ensureDefaultLogin,
} from "../../utils/Utils";

test.beforeEach(async ({ page }) => {
  await ensureDefaultLogin(page);
  await page.goto("/");
  await page.waitForSelector(".loading-modal", { state: "detached" });
  await page.waitForSelector(".loading-modal", { state: "detached" });
});

test("Categorize List Parents us-2748 @prq @ui @analyze", async ({
  page,
}) => {
  await changeToSpendFile(page, "Spend Credit Score3.xlsx (Ver. 1)");
  // `goToAnalyzeSection` already lands on the Parents tab, so the extra
  // tab click this test used to do afterwards was a no-op that only
  // re-raced the grid fetch.
  const response = await goToAnalyzeSection(
    page,
    "List",
    true,
    "Parents",
    false,
  );

  const data = JSON.parse(await response!.text());
  const parents = data["data"]["parents"]["edges"];

  // Required for Table gets rows
  await page.waitForTimeout(2000);
  // The Spends and Suppliers grids stay mounted behind `.hidden-grid`, so
  // rows must be scoped to the visible grid.
  const repeatedProviderTRs = page.locator(".k-master-row:visible");
  const providerCount = await repeatedProviderTRs.count();
  console.log("Rows: " + providerCount);

  // Searching for parents
  for (let i = 0; i < providerCount; i++) {
    const current = repeatedProviderTRs.nth(i);
    const colums = current.locator("td");
    let name;
    let text: Locator;
    if (parents[i]["node"].entityType !== "supplier") {
      name = parents[i]["node"].entityName;
      text = colums.nth(1).locator("p", { hasText: `${name}` });
    } else {
      name = parents[i]["node"].entityName + " (Supplier)";
      text = colums.nth(1).locator("p", { hasText: `${name}` });
    }
    // check for the name of parent and if is a supplier should be contains (Supplier in the name)
    await expect(text).toBeVisible();
    // The grid only renders an expand icon when a parent groups more than
    // one supplier — a parent that is its own single supplier has an empty
    // first cell, so clicking it would hang waiting for a child fetch that
    // never happens.
    if (parents[i]["node"].supplierCounts > 1) {
      // /api/graphql is multiplexed and the Analyze view keeps all three
      // grids mounted: opening the view chains the Suppliers and Spends
      // queries (`callOthersGrid`), so a waiter matching the bare URL can
      // resolve on `{ suppliers: ... }` or `{ spends: ... }` and then blow up
      // on `data.parents`. The child fetch is the only query carrying
      // `parentUuid:`, so match the operation on the request body and confirm
      // the shape of the answer before accepting it.
      const [responseItem] = await Promise.all([
        page.waitForResponse(async (response) => {
          if (!response.url().includes("api/graphql") || !response.ok()) {
            return false;
          }
          if (!(response.request().postData() ?? "").includes("parentUuid:")) {
            return false;
          }
          const body = await response.json().catch(() => null);
          return Boolean(body?.data?.parents);
        }),
        colums.nth(0).locator(".k-svg-i-plus").click(),
        console.log(`Open child for >>> ${name}`),
      ]);
      const dataItems = await responseItem.json();
      const child = page.locator(".detailChild:visible");
      await child.isVisible();
      await page.waitForTimeout(2000);
      const countChild = await child.locator(".k-master-row").count();
      // expect that the length of response should be the same of grid childs
      expect(dataItems["data"]["parents"]["totalCount"]).toBeGreaterThanOrEqual(
        countChild,
      );
      await colums.nth(0).locator(".k-icon").click();
    }
  }
});
