/**
 * TC9959 - show VCard Related Columns in Program List View
 */

import { test } from "@playwright/test";
import {
  changeToSpendFile,
  ensureDefaultLogin,
  ensureCompany_SFLogin,
  ensureCompany_SFSuperAdminLogin,
} from "../../utils/Utils";
import { locators } from "../../utils/locators";


test.beforeEach(async ({ page }) => {
  
  await ensureCompany_SFSuperAdminLogin(page);
  await page.waitForSelector(".loading-modal", { state: "detached" });
});

test("show VCard Related Columns in Program List View @program @tc9959 @vcard", async ({
  page,
}) => {
  await changeToSpendFile(page, "Pagero_VCard.xlsx (Ver. 1)");

  await page.locator(locators.sidebar.settings).click();

  const [dataVCard] = await Promise.all([
    page.waitForResponse(
      (response: any) =>
        response.url().includes("/api/vcard/setup") && response.ok(),
    ),
    page.locator(locators.settings.vCard.tab).click(),
  ]);

  let parsedInfo = JSON.parse(await dataVCard.text());
  let vCardEnabled = parsedInfo.vCardGroupsEnabled ?? false;

  if (!vCardEnabled) {
    await page.locator("span.slider.round").click();
    await page.locator(locators.settings.vCard.addGroup).click();
    await page.locator(".form-control.group-name").fill("Example_Company_SF");
    await page.locator(".form-control.group-days").nth(0).fill("10");
    await page.locator(".form-control.group-days").nth(1).fill("20");
    await page.locator(".form-control.group-days").nth(3).fill("30");

    await page.locator(".open-options").click();
    await page.locator(locators.dropdown.fieldSelection).click();
    await page.locator(locators.filter.field.creditRating).first().click();
    await page.waitForTimeout(1000);

    await page.locator("span.custom").nth(2).click();
    await page.locator("span.custom").nth(3).click();

    await Promise.all([
      page.waitForResponse(
        (response: any) =>
          response.url().includes("/api/vcard/setup/") && response.ok(),
      ),
      page.locator(".save-changes-filter").click(),
    ]);
  }

  await ensureCompany_SFLogin(page);

  await changeToSpendFile(page, "Pagero_VCard.xlsx (Ver. 1)");

  await Promise.all([
    page.waitForResponse(
      (response1) =>
        response1.url().includes("/api/analyze/programs/payment-terms") &&
        response1.ok(),
    ),
    page.locator(locators.sidebar.program).click(),
  ]);

  await Promise.all([
    page.waitForResponse(
      (response2) => response2.url().includes("/api/graphql") && response2.ok(),
    ),
    page.waitForResponse(
      (response2) => response2.url().includes("/api/graphql") && response2.ok(),
    ),
    page.waitForResponse(
      (response2) => response2.url().includes("/api/graphql") && response2.ok(),
    ),
    page.locator(locators.program.list).click(),
  ]);

  await page.waitForTimeout(3000);
});

test.afterEach(async ({ page }) => {
  await ensureDefaultLogin(page);
});
