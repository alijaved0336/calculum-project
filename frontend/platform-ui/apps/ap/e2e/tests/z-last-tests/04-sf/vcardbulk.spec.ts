/**
 * *
 * TC 9985 - The bulk vCard group belonging is working
 * @company = "Company_SF".

    @Spendfile = "Pagero_VCard.xlsx (Ver. 1)" //Already existent, and additionally attached here.
    @program = "Main Program." //Created by default.
    @g1 = vCard group with two conditions: All Acceptance Types and the Spend volumen Grather or Equal to 20 000. (Already Created)
    @g2 = vCard group with two conditions: All Acceptance Types and the Spend volumen Less than to 20 000. (Already Created)
 */

import * as kendoChartRelated from "../../utils/kendoChartRelated";
import { test } from "@playwright/test";
import {
  changeToProgram,
  changeToSpendFile,
  ensureCompany_SFSuperAdminLogin,
  ensureDefaultLogin
} from "../../utils/Utils";
import { locators } from "../../utils/locators";

let spendFileUuid = "5b77ef88-cc19-4777-9fd4-db8d28adea80";



test.beforeEach(async ({ page }) => {
  
  await ensureCompany_SFSuperAdminLogin(page);
  await changeToSpendFile(page, "Pagero_VCard.xlsx (Ver. 1)");

  await page.locator(locators.sidebar.settings).click();
  //go to vcard

  await Promise.all([
    page.waitForResponse(
      (response) =>
        response.url().includes("/api/vcard/setup") && response.ok(),
    ),
    page.locator(locators.settings.vCard.tab).click(),
  ]);

  console.log('inside the vcard settings');
  await page.waitForTimeout(3500);
  let value = await page.getByRole('textbox').nth(1).inputValue();

  let inputValue = 5;
  if (Number(value) !== 10) {
    inputValue = 10;
  }
  //modify the groups
  await page.getByRole('textbox').nth(1).clear();
  await page.getByRole('textbox').nth(1).fill(inputValue.toString());
  await page.getByText('Card Groups').click();
  await Promise.all([
    page.waitForResponse(
      (response) =>
        response.url().includes("/api/vcard/save-setup") && response.ok(),
    ),
    page.locator(locators.settings.vCard.saveBtn).click(),

  ]);
  console.log('clicked on save btn');
});

// SKIPPED: two things stand between this test and a run.
//
// The control it drives moved: `setVCardBulk` still looks for the grid's
// selection-column menu, which no longer mounts in the program edit grid. The
// replacement is `#dropdown-edit-program-option-vcardGroup` in the
// "Selected: N" bar; the note on `setVCardBulk` in utils/kendoChartRelated.ts
// carries the full trail and the selectors.
//
// And the test asserts nothing: it drives the grid, goes back to Setup and
// clicks Save, with no expect() anywhere, so recovering it means writing the
// assertion too - the vCard group of the filtered rows has to come back empty
// after the bulk removal.
test.skip("TC 9985 - The bulk vCard group belonging is working", async ({
  page,
}) => {
  console.log('Start Test');
  await page.waitForTimeout(10000);
  //go to program
  await page.locator(locators.sidebar.program).click();
  if (
    await page.locator(locators.dropdown.conditionLogicalOperator).isVisible()
  ) {

    await changeToProgram(page, "Main Program.");
  }

  //go to edit list
  await page
    .locator(locators.headerMenu.programHeader.keebabMenuButton)
    .click();

  await page.locator(locators.headerMenu.programHeader.dropDown.edit).click();

  // go to edit view
  await Promise.all([
    page.waitForResponse(
      (response) =>
        response.url().includes("/api/analyze/programs/") && response.ok(),
    ),
    page.waitForResponse(
      (response) => response.url().includes("api/graphql") && response.ok(),
    ),
    page.waitForResponse(
      (response) => response.url().includes("api/graphql") && response.ok(),
    ),
    page.waitForResponse(
      (response) => response.url().includes("api/graphql") && response.ok(),
    ),
   // page.locator('span:has-text("Continue")').click(),

  ]);
  await page.waitForTimeout(10000);

  // select supplier tab
  await page.getByRole('tab', { name: 'Suppliers' }).locator('span').click();
  console.log('5.1');
  await kendoChartRelated.filterByField(
    page,
    "C2, 25D, 5%, g1",
    "vCardGroupName",
  );

  await page.waitForTimeout(1400);
  await page.getByRole("checkbox", { name: "Select All Rows" }).check();
  await page.waitForTimeout(1400);

  let removeGroups = true;

  let myGroup = { propertyString: null, removeGroups: removeGroups };

  await page.waitForTimeout(1400);

  await kendoChartRelated.setVCardBulk(page, myGroup);

  //go back to setup
  await page.waitForTimeout(3000);

  await page.locator(locators.sidebar.settings).click();

  //go to vcard
  await Promise.all([
    page.waitForResponse(
      (response) =>
        response.url().includes("/api/vcard/setup/") && response.ok(),
    ),
    page.locator(locators.settings.vCard.tab).click(),
  ]);

  await Promise.all([
    page.waitForResponse(
      (response) =>
        response.url().includes("/api/vcard/save-setup") && response.ok(),
    ),
    page.locator(locators.settings.vCard.saveBtn).click(),
  ]);
});

test.afterEach(async ({ page }) => {
  await ensureDefaultLogin(page);
});
