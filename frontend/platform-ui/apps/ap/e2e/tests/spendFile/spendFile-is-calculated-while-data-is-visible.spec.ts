/**
 * The user logs in as adminException1
 * The user is told to recalculate the spendFile Pagero_ToRecalculate-2.xlsx (Ver. 1)
 * While the spendFile is being recalculated, the user searches for the supplier Axtone.
 * Verifies that the opportunity and agree options for the previous supplier can be clicked.
 * Closes the supplier and goes to the plan section.
 * Clicks on create a plan.
 */

import { expect, test } from "@playwright/test";
import Api2 from "../utils/APi2";
import {
  ensureDefaultLogin,
  changeToSpendFile,
  loginAsAdminException1,
  goToHomeSection,
  goToEntityCardEntity, goToAdminConsoleDataController
} from "../utils/Utils";
import { locators } from "../utils/locators";
import AdminConsoleUtils from "../utils/AdminConsoleUtils";
import * as kendoChartRelated from "../utils/kendoChartRelated";
//
let api: Api2 | null = null;
test.beforeEach(async ({ page }) => {
  await loginAsAdminException1(page);
  await changeToSpendFile(page,"Anonymous-Recalculate.xlsx");
});

test("A Spend File is recalculated while de data is visible @api @admin @us-12885 @tc12925 @heavy", async ({
  page
}) => {
  await goToAdminConsoleDataController(page);
  await page.waitForTimeout(5000);
/*  await page.getByRole('link', { name: 'spendFileName Column Menu' }).click();
  await page.getByRole('textbox', { name: 'Search' }).click();
  await page.getByRole('textbox', { name: 'Search' }).fill('Anonymous-Recalculate');
  await page.locator('label').filter({ hasText: 'Anonymous-Recalculate.xlsx' }).click();
  await page.getByRole('button', { name: 'Filter' }).click();*/
  await kendoChartRelated.filterByField(page, "Anonymous-Recalculate.xlsx", "spendFileName");
  await page.waitForTimeout(2000);
  await page.getByRole('button', { name: 'Recalculate' }).first().click();
  await goToHomeSection(page);
  const updatingInProgress = page.locator(
    "span.pending-recalculation",
  );
  await updatingInProgress.first().isVisible()
  console.log('Go to Opportunity')
  await Promise.all([
    page.waitForResponse((res) =>
      res.url().includes("/api/statistics/get-chart-data") && res.ok()
    ), page.locator(locators.sidebar.program).click()
  ])
  await page.locator(".opportunity-cashFlow").isVisible()
  expect(page.locator(".three-dots-icon.my-auto")).not.toBeVisible();
  expect(await page.locator(".three-dots-icon.my-auto").isDisabled()).not.toBeTruthy();
  await goToEntityCardEntity(page,"A & E Television Networks LLC");
  await page.getByRole('img', { name: 'Add Target' }).locator('path').click();
  await page.getByTestId('close-icon').nth(1).click();
  await page.getByRole('img', { name: 'Add Results' }).click();
  await page.getByRole('button', { name: 'Cancel' }).click();
  await page.getByTitle('Notes').first().click();
  await page.getByTestId('modal').getByTestId('close-icon').locator('path').click();
  await page.locator(`${locators.entityCard.closeButton} path`).click();
  await page.locator('a').filter({ hasText: 'Plan' }).click();
  await page.locator('div').filter({ hasText: /^New Plan$/ }).nth(2).click();
  const recalculatingInProgress = page.locator(
    "span.recalculating-in-progress",
  );
  if (await recalculatingInProgress.first().isVisible()) {
    console.log("*** recalculatingInProgress is visible");
    await page.waitForSelector("span.recalculating-in-progress", {
      state: "hidden",
    }); // Wait for recalculating to disappear
  } else {
    console.log("*** recalculatingInProgress is not visible");
    await page.waitForTimeout(4000); // Wait for the UI to update
  }
  await changeToSpendFile(page,"Pagero_ToRecalculate-2.xlsx");
});


test.afterEach(async ({ page }) => {
  await ensureDefaultLogin(page);
});
