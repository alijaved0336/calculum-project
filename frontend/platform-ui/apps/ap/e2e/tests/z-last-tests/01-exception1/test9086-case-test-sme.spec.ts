import { expect, test } from "@playwright/test";
import {
  ensureDefaultLogin,
  goToEntityCardEntity,
  loginAsAdminException1,
  removeAllBuyerStandardGroups,
} from "../../utils/Utils";

import { locators } from "../../utils/locators";

const buyerStandardStrategyValue = 31;

// The second test reads back the group the first one saves, so a failed setup must
// stop the run rather than let the read-back report an unrelated failure.
test.describe.configure({ mode: "serial" });

test.beforeEach(async ({ page }) => {
  await loginAsAdminException1(page);
});

test("Creating a New Buying Entity Standard Group with SME @settings @us-9086", async ({
  page,
}) => {
  console.log("Clicked on Settings");
  await page.waitForTimeout(1000);
  await page.locator(locators.sidebar.settings).click();

  console.log("Clicked on Buying Entity Standard Group");

  await Promise.all([
    page.waitForResponse(
      (response: any) =>
        response.url().includes("/api/rules/get-fields-data") && response.ok(),
    ),
    page.waitForResponse(
      (response: any) =>
        response.url().includes("/buyer_standard_groups") && response.ok(),
    ),
    page.locator(locators.settings.buyerStandardGroup.buyerTab).click(),
  ]);

  await removeAllBuyerStandardGroups(page);

  console.log("Clicked on Add a group");
  await page.locator(locators.settings.buyerStandardGroup.addGRoup).click();
  console.log("add SME group");
  await page.locator(".group-row >> .group-name").first().fill("SME");
  await page
    .locator(".group-row >> .group-days")
    .first()
    .fill(buyerStandardStrategyValue.toString());

  // Choose option
  await page.locator("div.open-options").first().click();
  await page.locator(locators.dropdown.fieldSelection).click();
  await page.waitForTimeout(1000);
  await page.locator(locators.filter.field.sme).first().click();
  await page.locator("label:nth-child(2) > .radio").click();
  // The condition panel saves with `.save-changes-filter`. The global filters'
  // "Show Results" button that `locators.filter.saveChanges` resolves to is a
  // different control and stays disabled on this screen.
  await page.locator(locators.filter.saveCondition).click();
  console.log("Saving all");
  await Promise.all([
    page.waitForResponse(
      (res: any) => res.url().includes("update-buyer-standard") && res.ok(),
    ),
    page.locator(locators.settings.buyerStandardGroup.save).click(),
  ]);
  await expect(
    page.getByText(
      "Successfully saved! Changes will impact existing spend lines, suppliers, and par",
    ),
  ).toBeVisible();
});

test("check 3A Composites Mobility S.A has applied SME filter @settings @us-9086", async ({
  page,
}) => {
  console.log("Clicked on Settings");
  const [response2] = await Promise.all([
    page.waitForResponse(
      (res: any) =>
        res.url().includes("/chart/payment-terms-opportunity/supplier") &&
        res.ok(),
    ),
    page.waitForResponse(
      (res: any) => res.url().includes("/ada-bot/all") && res.ok(),
    ),
    goToEntityCardEntity(page, "3A Composites Mobility S.A."),
  ]);
  let data2 = JSON.parse(await response2.text());

  const buyerStandardStrategy = data2.strategies.find(
    (item: any) => item.key === "buyerStandardStrategy",
  );
  console.log("buyerStandardStrategy: ", buyerStandardStrategy);
  // Asserted rather than guarded behind an `if`: an absent strategy means the SME
  // group the previous test saved never reached this supplier, which is the
  // regression this test exists to catch, so it has to fail instead of passing.
  expect(buyerStandardStrategy).toBeDefined();
  expect(buyerStandardStrategy.terms).toEqual(buyerStandardStrategyValue);
});

test.afterEach(async ({ page }) => {
  console.log("***Finishing test***");
  await ensureDefaultLogin(page);
});
