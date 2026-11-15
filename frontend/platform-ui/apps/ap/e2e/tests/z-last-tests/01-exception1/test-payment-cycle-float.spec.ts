// Created by Josh
import { Page, Response, test } from "@playwright/test";
import {
  ensureDefaultLogin,
  goToEntityCardEntity,
  loginAsAdminException1} from "../../utils/Utils";
import { locators } from "../../utils/locators";


test.beforeEach(async ({ page }) => {
  
  await loginAsAdminException1(page);
});

test("Case 1: Putting value in Payment Cicle @integrated @api @us-6075 @tc-6235 @heavy", async ({
  page
}) => {


  await page.waitForTimeout(5000);

  await page.locator(locators.sidebar.entities).click();

  await Promise.all([
    page.waitForResponse(
      (response: any) =>
        response.url().includes("/entity-card/") &&
        response.ok()
    ),
    goToEntityCardEntity(page,'Microelettrica Scientifica S.P.A.',0,false)
  ])


  await page.locator(locators.entityCard.closeButton).click(); //Making the bar visible.

  await page.waitForTimeout(5000);

  await putValuePaymentCycle(page, 15); //Set to 15 days the Float

  await page.waitForTimeout(5000)

  console.log('waiting for recalculation in progress');

  await Promise.all([
    page.waitForResponse(
      (response: any) =>
        response.url().includes("/chart/cashflow-or-savings-overview/") &&
        response.ok()
    ),
    goToEntityCardEntity(page,'Microelettrica Scientifica S.P.A.',0,false)  
  ]);


  await page.waitForTimeout(5000);
  
  await page.locator(locators.entityCard.closeButton).click(); //Making the bar visible.

  await putValuePaymentCycle(page, 0); //Reset to Default
});

async function putValuePaymentCycle(page: Page, value: number) {
  
  await page.locator(locators.sidebar.settings).click()
 
  console.log('Clicked on Payment Cicle')

  await Promise.all([
    page.waitForResponse(
      (response: any) =>
        response.url().includes("/api/companies/") &&
        response.ok()
    ),  
  page.locator(locators.settings.buyerStandardGroup.paymentCycleTab).click() 
  ])

  switch (value) {
    case 15:
    await page.locator("#selectPaymentCycle").selectOption({ label: 'Monthly' });
    
    await page.getByRole("button", { name: "Save" }).click();
    break;

    case 0:
    await page.locator("#selectPaymentCycle").selectOption({ label: 'Daily' });
    
    await page.getByRole("button", { name: "Save" }).click();
    break;
  }

  await Promise.all([
    page.waitForResponse(
      (response: Response) =>
        response.url().includes("/api/companies/") &&
        response.ok()
    ),  
    page.getByRole('button', { name: 'Save' }).click()
  ]);  
}

test.afterEach(async ({ page }) => {

  await ensureDefaultLogin(page);
});
