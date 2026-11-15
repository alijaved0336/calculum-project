import { test, expect } from "@playwright/test";
import { locators } from "../utils/locators";

// Global utils
import { ensureDefaultLogin, changeToSpendFile, ensureSuperAdminLogin} from "../utils/Utils";


// This spec does not fit the 120s default: it walks Settings and Opportunity
// twice, saving the visibility flag each time, and every one of those steps
// waits on the shared backend. The run of 2026-09-20 was cut at the cap with
// the last `get-chart-data` request already in flight, and the attempt that
// passed on retry still took 115s end to end. The preamble alone accounts for
// roughly half of it: `ensureSuperAdminLogin` logs the previous spec's user
// out and signs in again through B2C, which measured 58s in that run.
//
// `beforeEach` spends the test's own budget, so the timeout is raised there and
// not only in the body: on the 120s default a preamble that slow is at risk of
// being cut before the body ever starts.
const TEST_BUDGET_MS = 240_000;

test.beforeEach(async ({ page }) => {
  test.setTimeout(TEST_BUDGET_MS);
  await ensureSuperAdminLogin(page);
  await changeToSpendFile(page, "Pagero_Full_SME.xlsx (Ver. 1)");
});

test("Enable/Disable Expected Opportunity Values @ui @settings", async ({
  page
}) => {
      test.setTimeout(TEST_BUDGET_MS);

      await Promise.all([
        page.waitForResponse(responseName =>
          responseName.url().includes("/api/spendfile/strategies/allowed-status")
        ),
        page.locator(locators.sidebar.settings).click()
      ]);
      await page.locator(locators.settings.paymentTermsStrategiesSection).click()

      await page.locator(locators.settings.opportunityVisibilitySection).click()

      
      await page.waitForTimeout(3500);
      console.log("** Clicking on ONLY_OPPORTUNITY")
      await page.locator('#ONLY_OPPORTUNITY').click()
      await page.waitForTimeout(3500);

      console.log("** Clicked on SAVE")

      await Promise.all(
        [
        page.waitForResponse(
          response => response.url().includes("api/spend_file_versions") && response.ok()
        ),
        page.locator('#save-opportunity-config').click()
      ]);

      await page.waitForTimeout(3500);
      console.log("** Go to Program")
      await Promise.all(
        [
        page.waitForResponse(
          response => response.url().includes("api/statistics/get-chart-data") && response.ok()
        ),
        page.locator(locators.sidebar.program).click()
      ]);

      await page.waitForTimeout(3500);

      console.log("** Check if Expected is not visible")
      await expect(
          page.locator(".expected-section-values", { hasText: "Expected" }),
        ).toHaveCount(0);
        
    console.log("** Go to Settings")
    await Promise.all([
        page.waitForResponse(responseName =>
          responseName.url().includes("/api/spendfile/strategies/allowed-status")
        ),
        page.locator(locators.sidebar.settings).click()
      ]);

      console.log("** Go to Settings - Opportunity Visibility")
      
      await page.locator(locators.settings.paymentTermsStrategiesSection).click()
      await page.locator(locators.settings.opportunityVisibilitySection).click()

      console.log("** Click on OPPORTUNITY_AND_EXPECTED")
      await page.waitForTimeout(3500);
      await page.locator('#OPPORTUNITY_AND_EXPECTED').click()
      await page.waitForTimeout(3500);

      console.log("** Click on SAVE")
      await Promise.all(
        [
        page.waitForResponse(
          response => response.url().includes("api/spend_file_versions") && response.ok()
        ),
        page.locator('#save-opportunity-config').click()
      ]);
      await page.waitForTimeout(3500);
      console.log("** Go to Program 2nd time")
      await Promise.all(
        [
        page.waitForResponse(
          response => response.url().includes("api/statistics/get-chart-data") && response.ok()
        ),
        page.locator(locators.sidebar.program).click()
      ]);

      await page.waitForTimeout(3500);

      console.log("** Check if Expected is visible")
      let expectedCounts = await page
      .locator(
        ".expected-section-values"
      )
      .count();

      expect(expectedCounts).toBe(2);


});

test.afterEach(async ({ page }) => {
  await ensureDefaultLogin(page);
});
