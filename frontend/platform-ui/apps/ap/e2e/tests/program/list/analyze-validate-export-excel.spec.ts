/**
 * @fileoverview
 * E2E tests for validating the "Export to Excel" button visibility in the Program List section,
 * according to user roles (admin vs non-admin) and US-4181 requirements.
 *
 * Tests:
 *  - Non-admin users should not see the "Export to Excel" button.
 *  - Admin users should see two "Export to Excel" buttons.
 *
 * Utilities:
 *  - Uses Playwright for browser automation.
 *  - Relies on custom utility functions for login, navigation, and file selection.
 *
 * Author: Diego Mas
 */
import { expect, test } from '@playwright/test';
import { ensureDefaultLogin,  changeToSpendFile, ensureSuperAdminLogin, changeToCompany, DEFAULT_COMPANY_NAME } from '../../utils/Utils'
import { locators } from '../../utils/locators';
import ProgramUtils from '../../utils/ProgramUtils';



/**
 * Test: Validate 1 export to excel for not admin: @ui @us-4181
 *
 * This test verifies that non-admin users do not see the "Export to Excel" button
 * in the Program List section. The test performs the following steps:
 *  1. Logs in as a default (non-admin) user.
 *  2. Navigates to the home page and waits for loading to complete.
 *  3. Changes to a specific spend file.
 *  4. Navigates to the Program section and, if necessary, clicks the first available "Show" button.
 *  5. Navigates to the "List" section.
 *  6. Asserts that the "Export to Excel" button is not present (count is 0) None of the tabs should have the button.
 *
 * Tags: @ui @us-4181
 */
test('Validate 1 export to excel for not admin: @ui @us-4181', async({ page }) => {

  await ensureDefaultLogin(page)
  await page.goto('/')
  await page.waitForSelector('.loading-modal', { state: 'detached' })
  await changeToSpendFile(page, "PageroFull_20230308_2.xlsx (Ver. 1)");
  await ProgramUtils.goToProgramSection(page, {
    wait: false
  });
  await page.waitForTimeout(2000);
  let urlValue = page.url();
  if (urlValue.includes("/home/analyze")) {
    console.log("click on first availale SHOW btn");
    await Promise.all([
      page
        .locator(locators.headerMenu.programHeader.allPrograms)
        .first()
        .click(),
      page.getByRole("button", { name: "Show", exact: true }).first().click(),
    ]);
    await page.waitForTimeout(6000);
  }
  // Navigate to List without gating on api/graphql (grid served from the SPA store, the
  // response does not reliably refire here); mirror the passing admin sibling which clicks
  // the header List button and settles with a timeout.
  await page.locator(locators.headerMenu.programHeader.list).click();

  console.log("Going to List Section");
  // Let the List grid settle before asserting the *absence* of the export button,
  // so an empty count reflects "button not rendered" rather than "grid not loaded yet".
  await page.waitForTimeout(3000);
  const numButtons = await page.locator(locators.list.openGridOptions).count();
  // first validation
  expect(numButtons).toBe(0);
});


/**
 * Test: Validate 2 export to excel for admin: @ui @us-4181
 *
 * This test verifies that admin users see two "Export to Excel" buttons
 * in the Program List section. The test performs the following steps:
 *  1. Logs in as a super admin user.
 *  2. Navigates to the home page and waits for loading to complete.
 *  3. Changes to a specific spend file.
 *  4. Navigates to the Program section and, if necessary, clicks the first available "Show" button.
 *  5. Navigates to the "List" section.
 *  6. Asserts that the "Export to Excel" button is present (count is 3) one for each tab (spends, suppliers, parents).
 *
 * Tags: @ui @us-4181
 */
test("Validate 2 export to excel for admin: @ui @us-4181", async ({ page }) => {

  console.log("Admin Login...");
  await ensureSuperAdminLogin(page);
  console.log("Going to /...");
  await changeToCompany(page, DEFAULT_COMPANY_NAME);
  await changeToSpendFile(page, "PageroFull_20230308_2.xlsx (Ver. 1)");
  console.log("Changing to Pagero_Small.xlsx (Ver. 1)...");
  await ProgramUtils.goToProgramSection(page, {
    wait: true
  });
  await page.waitForTimeout(2000);
  await page.locator(locators.headerMenu.programHeader.list).click();
  console.log("Going to List Section");

  await page.waitForTimeout(3000);

  const numButtons = await page.locator(locators.list.openGridOptions).count();
  // first validation
  expect(numButtons).toBe(3);
});

test.afterEach(async({ page }) => {
  await ensureDefaultLogin(page);
})
