/**
 * CUSTOM FIELDS
 */

import { expect, test } from "@playwright/test";
import { locators } from "../../utils/locators";
// Global utils
import {
  changeToSpendFile,
  ensureDefaultLogin,
  ensureLogin,
} from "../../utils/Utils";

const spendFile = "Pagero_Privacy-1.xlsx (Ver. 1)";



test.beforeEach(async ({ page }) => {
  
  await ensureLogin(page, process.env.E2E_AUTH_USERNAME_BULK_SUPER!, process.env.E2E_AUTH_PASSWORD_BULK_SUPER!, "ensure BULK User Login");
  await changeToSpendFile(page, spendFile);
});

test("V-Card @global @ui @settings @vcards @us-10433", async ({ page }) => {


  console.log("GO TO SETUP");
  await page.locator(locators.sidebar.settings).click();

  expect(page.locator(locators.settings.vCard.tab)).toBeVisible();

  const [, setupData] = await Promise.all([
    page.waitForResponse(
      (response) =>
        response.url().includes("/api/rules/get-fields-data") && response.ok(),
    ),
    page.waitForResponse(
      (response) =>
        response.url().includes("/api/vcard/setup/") && response.ok(),
    ),
    page.locator(locators.settings.vCard.tab).click(),
  ]);
  await page.waitForTimeout(5000);

  let resultResponse = JSON.parse(await setupData.text());

  let vCardEnabled = resultResponse.vCardGroupsEnabled;
  
  if (!vCardEnabled) {
    page.locator("#vCardsGroupsEnabled").first().click();
  }
  await page.waitForTimeout(1500);
  expect( resultResponse.vCardMinimumProbabilityOfSuccess).toBeGreaterThanOrEqual(0.2);
});

test.afterEach(async ({ page }) => {
  await ensureDefaultLogin(page);
});