import { expect, test } from "@playwright/test";
import { ensureDefaultLogin, loginAsAdminException1, removeAllBuyerStandardGroups } from "../../utils/Utils";
import { locators } from "../../utils/locators";


test.beforeEach(async ({ page }) => {
  

 await loginAsAdminException1(page);
});

test("Case: 1 Improvements in Preferences - Buying Entity Standard Group @ui @setup @us-5208 @tc-5343", async ({
  page
}) => {
  console.log("Clicked on Settings");
  await page.waitForTimeout(5000);
  await page.locator(locators.sidebar.settings).click();

  console.log("Clicked on Buying Entity Standard Group");
  await Promise.all([
    page.waitForResponse(
      (response: any) =>
        response.url().includes("/get-fields-data") && response.ok()
    ),
    page.waitForResponse(
      (response: any) =>
        response.url().includes("buyer_standard_groups") && response.ok()
    ),
    page.locator(locators.settings.buyerStandardGroup.buyerTab).click()
  ]);

  await page.waitForTimeout(2000);

  await removeAllBuyerStandardGroups(page);

  await page.waitForTimeout(1000);

  console.log("Clicked on Add a group");
  await page.locator(locators.settings.buyerStandardGroup.addGRoup).click();

  const termsWithoutCashDiscount = page.locator("#terms-without-cash-discount");
  const itemsTexBoxPaymentermsDays = page.locator("input.group-days").all();
  const countItems = (await itemsTexBoxPaymentermsDays).length;
  if (countItems > 0) {
    let count = 0;

    for (const elemento of await itemsTexBoxPaymentermsDays) {
      const posicionXLabel = await termsWithoutCashDiscount.boundingBox();
      const posicionXInput = await elemento.boundingBox();

      let position1 = posicionXLabel!.x;
      let position2 = posicionXInput!.x;
      console.log(`Position termsWithoutCashDiscount X: ${position1}`);
      console.log(`Position Element ${count++} X: ${position2}`);
      let range =
        parseInt(position2.toFixed(0)) - parseInt(position1.toFixed(0));
      expect(range).toBeLessThanOrEqual(30);
      if (count == countItems) {
        await elemento.type("366");
        console.log("Checking Raiser Error");
        expect(
          page.locator(
            'span:has-text("Enter a number 0-365")'
          )
        ).toHaveCount(1);
      }
    }
  }
});

test.afterEach(async ({ page }) => {
  await ensureDefaultLogin(page);
});
