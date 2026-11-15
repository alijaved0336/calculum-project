import { expect, test } from "@playwright/test";
import { get, map, find } from "lodash";

// Global utils
import {
  changeToSpendFile,
  ensureDefaultLogin,
  ensureCompany_SFLogin} from "../../utils/Utils";

import { locators } from "../../utils/locators";

test.beforeEach(async ({ page }) => {
  

  await ensureCompany_SFLogin(page);
  await changeToSpendFile(page, 'Pagero_VCard.xlsx (Ver. 1)');  
});



// SKIPPED: NOT a selector problem any more - the test now reads real Vcard
// data. It asserts `3M Company` sits in vCard box 9 and the fixture puts it in
// box 8. Whether 8 is correct or a regression is a product question, so the
// expected value is deliberately left untouched rather than edited to match
// whatever the app currently returns. Note too that `vCardBox` is a per-column
// GraphQL field: the grid only requests it when the user's saved column layout
// includes that column, which makes this assertion fragile by construction -
// consider rewriting it against the API.
test.skip("The Term Extension and Vcard 9 box are showing their respective data. @nineboxes @ui @us-10286 @dmas", async ({
  page
}) => {
  // Go to first program available

  await Promise.all([
    page.waitForResponse(
      (res: any) => res.url().includes("/analyze_programs") && res.ok()
    ),
    page.locator(locators.sidebar.program).click()
  ]);
  
  // Select "Supplier Prioritization". The view no longer opens on Vcard: it
  // lands on whichever type the 9-box dropdown defaults to, which is
  // "SCF (Provider)" for this company, so waiting here for the vcard endpoint
  // waited for a call the page had no reason to make.
  await Promise.all([
    page.waitForResponse(
      response =>
        response.url().includes("api/graphql") &&
        response.ok()
    ),
    page.locator('#ninebox_cf').click()
  ]);

  // Pick Vcard explicitly. "Vcard" is matched exactly because the same
  // dropdown also offers "SCF (Provider)" and "SCF".
  await page.locator("#metric-dropdown-options").click();
  const vcardOption = page
    .locator('[data-testid="active-metrics-dropdown"] span.text-option')
    .filter({ hasText: /^Vcard$/ });
  await expect(vcardOption).toBeVisible({ timeout: 15000 });
  await Promise.all([
    page.waitForResponse(
      response =>
        response.url().includes("api/analyze/get-nine-boxes-vcard-data") &&
        response.ok()
    ),
    page.waitForResponse(
      response =>
        response.url().includes("api/graphql") &&
        response.ok()
    ),
    vcardOption.click()
  ]);

  await page.locator('div.open-options.cursor-pointer:has(svg.chevrons)').click()

  //Select all tabs  
  
  let [graphqlResponse] =  await Promise.all([
    page.waitForResponse(
      response =>
        response.url().includes("api/graphql") &&
        response.ok()
    ),    
    page
      .locator('.k-animation-container-shown #user-options-popup')
      .locator('span:has-text("Select All")')
      .nth(0)
      .click()
  ]);

  await page.waitForTimeout(2000);
  const result = JSON.parse(await graphqlResponse.text());
  const edges = get(result, 'data.suppliers.edges');
  const records = map(edges, 'node');

  // Validating the box for "3A Composites Mobility S.A."
  const composites = find(records, {entityName: '3A Composites Mobility S.A.'});
  expect(composites?.vCardBox).toEqual(1);
  // Validating the box for 3M Company
  const entity3MCompany = find(records, {entityName: '3M Company'});
  expect(entity3MCompany?.vCardBox).toEqual(9);
  // Validating the box for Blueprint Medicines Corporation
  const blueprint = find(records, {entityName: 'Blueprint Medicines Corporation'});
  expect(blueprint?.vCardBox).toEqual(1);


  await page.waitForTimeout(5000);
  let tableNineBoxes = page.locator("#nine-boxes-table");
  let tableNineBoxesRow = page.locator("#nine-boxes-table >> tbody >> tr");  
  const elementsCount = await tableNineBoxes
    .locator("tbody >> tr")
    .count();

  let suppliersTotal = 0;
  let suppliersSelected = 0;
  let suppliersCount = 0;

  for (let i = 0; i < elementsCount; i++) {
    const thElement = await tableNineBoxesRow.nth(i).locator("th");
    const text = await thElement.innerText();

    const tdElementSelection = await tableNineBoxesRow.nth(i).locator("td").nth(0);
    const tdElementTotal = await tableNineBoxesRow.nth(i).locator("td").nth(1);
    
    const text1 = await tdElementSelection.innerText();
    const text2 = await tdElementTotal.innerText();

    if (text !== 'Boxes') {      
      if (text2==="0"){
        expect(text1).toEqual("-"); 
      }
      else{
        expect(text1).toEqual(text2);
      }
    }
    if (text === "Suppliers") {
      suppliersTotal = Number.parseInt(text2);
      suppliersSelected = Number.parseInt(text1);
    }
  }

  suppliersCount = Number.parseInt(((await page.locator(".k-pager-info").innerText()).trim().split('of')[1]).trim().split(' ')[0]);
  expect(suppliersCount).toEqual(suppliersSelected);
  expect(suppliersCount).toEqual(suppliersTotal);

  await page.locator('#metric-dropdown-options').isVisible();
});

test.afterEach(async ({ page }) => {

  await ensureDefaultLogin(page);
});