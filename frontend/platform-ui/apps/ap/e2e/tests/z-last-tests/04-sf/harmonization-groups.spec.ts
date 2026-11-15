/**
 * CUSTOM FIELDS
 */

import { expect, test } from "@playwright/test";
import { locators } from "../../utils/locators";
// Global utils
import {
  changeToSpendFile,
  ensureDefaultLogin,
  ensureLogin
} from "../../utils/Utils";

const spendFile = "Pagero_VCard.xlsx (Ver. 1)";


test.beforeEach(async ({ page }) => {
  
  await ensureLogin(page, process.env.E2E_AUTH_USERNAME_SF_SUPER!, process.env.E2E_AUTH_PASSWORD_SF_SUPER!, "ensure SF User Login");
  await changeToSpendFile(page, spendFile);
});

test("Harmonization Groups in Setup @global @ui @settings @program @tc-11974 @us-11929", async ({ page }) => {
    await page.evaluate(() => {
      (document.body.style as any).zoom = "1.0"; 
    });
    await Promise.all([
      page.waitForResponse((responseName) =>
        responseName.url().includes("/api/spendfile/strategies/allowed-status"),
      ),
      page.locator(locators.sidebar.settings).click(),
    ]);

    await page.locator(locators.settings.paymentTermsStrategiesSection).click()

    await Promise.all([
      page.waitForResponse((responseName) =>
        responseName.url().includes("/harmonization_groups"),
      ),
      page.locator(locators.settings.harmonizationGroups).click()
    ]);

  });

test.afterEach(async ({ page }) => {
  await ensureDefaultLogin(page);
});
