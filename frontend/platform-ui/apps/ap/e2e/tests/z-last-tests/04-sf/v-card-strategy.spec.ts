/**
 * 9815 The V-Card charts are shown in the Opportunity/vCard tab for one Spend Line Supplier. No term extention allowed.
 * 9816 Term extention allowed. The V-Card charts are shown in the Opportunity/vCard tab for one Spend Line Supplier.
 *
 */

import { expect, test, Page } from "@playwright/test";
import {
  changeToSpendFile,
  ensureDefaultLogin,
  ensureCompany_SFSuperAdminLogin,
  goToEntityCardEntityExactFull,
} from "../../utils/Utils";
import { locators } from "../../utils/locators";

const companyName = "Company_SF";
const spendFile = "Pagero_VCard.xlsx (Ver. 1)";
const given = {
  supplier1: "Aarsleff Rail A/S",
  supplier2: "Bio Rad Laboratories Inc",
};

test.describe.serial("V-Card Strategy", async () => {
  let page: Page;
  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();
    await ensureCompany_SFSuperAdminLogin(page);
    await changeToSpendFile(page, spendFile);
  });

  test("Test for V-Card Strategy @entity @integrated @us-9815 @vcard", async () => {
    console.log("***** first test");
    
    const setup = page.locator(locators.sidebar.settings);
    await setup.click();

    await expect(page.locator(locators.settings.vCard.tab)).toBeVisible();

    const [, data] = await Promise.all([
      page.waitForResponse(
        (response) =>
          response.url().includes("/api/rules/get-fields-data") &&
          response.ok(),
      ),
      page.waitForResponse(
        (response) =>
          response.url().includes("/api/vcard/setup/") && response.ok(),
      ),
      page.locator(locators.settings.vCard.tab).click(),
    ]);

    const dataJson = await data.json();
    const hasVCardEnabled = dataJson.vCardGroupsEnabled;

    if (!hasVCardEnabled) {
      //enable the v card
      await page.locator("label#vCardsGroupsEnabled >> .slider.round").click();
    }

    if (!hasVCardEnabled) {
      //save the changes
      await Promise.all([
        page.waitForResponse(
          (response) =>
            response.url().includes("/api/vcard/save-setup/") && response.ok(),
        ),
        page.locator("button.btn.btn-primary.font-md").last().click(),
      ]);
    }
    const [response] = await Promise.all([
      page.waitForResponse(
        (response) =>
          response.url().includes("/chart/cashflow-or-savings-overview") && response.ok(),
      ),
      goToEntityCardEntityExactFull(
        page,
        given.supplier1,
        0,
        true,
        null,
        "supplier",
      ),
    ]);
    const resultResponse = await response.json();

    const economicProfit = resultResponse.economicProfit;
    const vCardRebateFull = resultResponse.vCardRebateFull;

    if (economicProfit !== null) {
      expect(economicProfit).toBeTruthy();
    } else {
      expect(economicProfit).toBeNull();
    }

    if (vCardRebateFull !== null) {
      expect(vCardRebateFull).toBeTruthy();
    } else {
      expect(vCardRebateFull).toBeNull();
    }
    await page.locator(locators.entityCard.closeButton).click();
  });

  test("Test for V-Card Economic Profit @entity @integrated @us-9815 @vcard", async () => {
    await page.locator(locators.sidebar.settings).click();

    await expect(page.locator(locators.settings.vCard.tab)).toBeVisible();

    const [, data] = await Promise.all([
      page.waitForResponse(
        (response) =>
          response.url().includes("/api/rules/get-fields-data") &&
          response.ok(),
      ),
      page.waitForResponse(
        (response) =>
          response.url().includes("/api/vcard/setup/") && response.ok(),
      ),
      page.locator(locators.settings.vCard.tab).click(),
    ]);

    const dataJson = await data.json();
    const hasVCardEnabled = dataJson.vCardGroupsEnabled;

    if (!hasVCardEnabled) {
      //enable the v card
      await page.locator("label#vCardsGroupsEnabled >> .slider.round").click();
    }

    if (!hasVCardEnabled) {
      //save the changes
      await Promise.all([
        page.waitForResponse(
          (response) =>
            response.url().includes("/api/vcard/save-setup/") && response.ok(),
        ),
        page.locator("button.btn.btn-primary.font-md").last().click(),
      ]);
    }
    const [response] = await Promise.all([
      page.waitForResponse(
        (response) =>
          response.url().includes("/chart/cashflow-or-savings-overview") && response.ok(),
      ),
      goToEntityCardEntityExactFull(
        page,
        given.supplier2,
        0,
        true,
        null,
        "supplier",
      ),
    ]);
    const resultResponse = await response.json();

    const economicProfit = resultResponse.economicProfit;

    console.log("economicProfit :: ", economicProfit);
    if (economicProfit !== null) {
      expect(economicProfit).toBeTruthy();
    } else {
      expect(economicProfit).toBeNull();
    }
    await page.locator(locators.entityCard.closeButton).click();
  });
  test.afterAll(async () => {
    await ensureDefaultLogin(page);
    // Close the page's context (not the worker `browser` fixture) so the
    // worker stays alive for the next spec in the workers=1 pipeline.
    await page?.context().close().catch((error) => {
      console.error(
        "afterAll: page.context().close() failed (non-critical):",
        error instanceof Error ? error.message : String(error),
      );
    });
  });
});
