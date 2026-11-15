import { expect, test, Page } from "@playwright/test";

// Utils
import {
  changeToSpendFile,
  ensureDefaultLogin,
} from "../utils/Utils";

import { GlobalFiltersUtils } from "../utils";
import {
  logOperation,
  safeOperation,
} from "../utils/PlaywrightTestHelpers";

const spendFileName =
  "Pagero_GlobalFilterTest-TwoBuyers_One_Program_Test_Company_Tree.xlsx (Ver. 1)";

const categoryName = "Plan & Manage";

test.describe.serial("Plan & Manage Category", async () => {
  let page: Page;
  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();
    await ensureDefaultLogin(page);
    await changeToSpendFile(page, spendFileName);
  });
  // *** Procurement Team ***

  test("procurement team field is showing in global filters dialog @api @global-filters @us-6474", async () => {
    const fieldNameInAPIResponse = "teamName";
    const fieldName = "Procurement Team";

    await GlobalFiltersUtils.openModal(page);
    await GlobalFiltersUtils.openCategory(page, categoryName);

    const [response] = await Promise.all([
      GlobalFiltersUtils.waitForFieldResponse(page, fieldNameInAPIResponse),
      GlobalFiltersUtils.openField(page, fieldName),
    ]);

    const result = await response.json();
    expect(result.value.length).toBeGreaterThan(0);

    // Close the dialog so the next serial test starts from a clean state.
    await GlobalFiltersUtils.openModal(page);
  });

  // *** END Procurement Team ***

  // *** Plan ***

  test("plan field is showing in global filters dialog @api @global-filters @us-7719 @tc-7845", async () => {
    const fieldName = "Plan";
    await GlobalFiltersUtils.openModal(page);
    
    await GlobalFiltersUtils.openCategoryThenField(page, {
      categoryName,
      fieldName,
    },"/planPhaseNames");

    // Expand first node
    logOperation("Expanding first node Plan-1");
    
    // Wait for the treeitem to be visible before clicking
    await safeOperation(
      page,
      async () => {
        const treeItem = page.getByRole("treeitem", { name: "Plan-1" });
        
        // Wait for the treeitem to be visible
        await treeItem.waitFor({ state: "visible", timeout: 30000 });
        logOperation("Plan-1 treeitem is visible");
        
        // Wait for the spans to be attached
        const spans = treeItem.locator("span");
        await spans.first().waitFor({ state: "attached", timeout: 30000 });
        
        const spanCount = await spans.count();
        logOperation("Plan-1 treeitem spans count", { count: spanCount });
        
        // Wait for the second span (expand button) to be visible if it exists
        if (spanCount > 1) {
          await spans.nth(1).waitFor({ state: "visible", timeout: 30000 });
          await spans.nth(1).click();
          logOperation("Clicked on Plan-1 treeitem expand span (nth(1))");
        } else {
          logOperation("Only one span found, clicking on first span");
          await spans.first().click();
        }
      },
      "click Plan-1 treeitem expand"
    );
  });
  
  test.afterAll(async () => {
    await ensureDefaultLogin(page);
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

// *** END Plan ***
