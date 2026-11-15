/**
 * US-11835 Manage Files
 */

import { expect, test } from "@playwright/test";
import { loginAsSuperAdmin } from "../../utils/Utils";
import { locators } from "../../utils/locators";

test.beforeEach(async ({ page }) => {  

  await loginAsSuperAdmin(page);
});

test("Home Manage Files for Super Admin", async ({
  page
}) => {
  console.log("go to preferences -> manage files");
  await page.locator(locators.headerMenu.topMenu.dropDownMenu).click();
  await page.waitForTimeout(1000);
  await page.locator(locators.headerMenu.topMenu.manageFiles).click();

  await Promise.all([
    page.waitForResponse(
      (response: any) => response.url().includes("/company_files") &&
        response.ok()
    )
  ]);

  await page.locator("#company-files-grid").isVisible();
  
});



