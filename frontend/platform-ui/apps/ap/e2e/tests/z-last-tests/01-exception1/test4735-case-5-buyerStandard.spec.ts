import { expect, test } from "@playwright/test";
import { ensureDefaultLogin, removeAllBuyerStandardGroups, loginAsAdminException1 } from "../../utils/Utils";
import { locators } from "../../utils/locators";

test.beforeEach(async ({ page }) => {
  
  await loginAsAdminException1(page);
});

test("Case 5: Input error name @settings @integrated @us-4545", async ({
  page
}) => {
  await page.waitForTimeout(5000);
  console.log("Clicked on Settings");
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

  await removeAllBuyerStandardGroups(page);

  await page.waitForTimeout(1000);
  console.log("Clicked on Add a group");
  await page.locator(locators.settings.buyerStandardGroup.addGRoup).click();
  let groupsShowingCount = await page
    .locator(".open-options.cursor-pointer")
    .count();
  console.log("groups showing : ", groupsShowingCount);

  await page
    .locator(".group-row >> .group-name")
    .first()
    .fill("");
  await page
    .locator(".group-row >> .group-days")
    .first()
    .fill("45");

  console.log("Clicked on Add a group");
  await page.locator(locators.settings.buyerStandardGroup.addGRoup).click();

  await page.waitForTimeout(1000);

  console.log("expecting an error div and class to appear");
  let errorNameCount = await page.locator(".errors-name").count();
  await expect(errorNameCount).toBeGreaterThan(0);
});

test.afterEach(async ({ page }) => {
  await ensureDefaultLogin(page);
});
