import { AuthUtils, ProgramUtils, StringUtils } from "../../utils";
import { goToHomeSection, ensureDefaultLogin } from "../../utils/Utils";
import { test, expect } from "@playwright/test";

const USERNAME = process.env.E2E_AUTH_USERNAME_SF_1!;
const PASSWORD = process.env.E2E_AUTH_PASSWORD_SF_1!;

test.beforeEach(async ({ page }) => {

  
  await goToHomeSection(page);

  expect(USERNAME).toBeTruthy();

  expect(PASSWORD).toBeTruthy();

  await AuthUtils.ensureLoginByUser(page, {
    email: USERNAME,
    password: PASSWORD,
  });
});

test("vcard tab is visible in the opportunity section @program @integrated @vcard @us-9742", async ({
  page,
}) => {
  await goToHomeSection(page);

  await ProgramUtils.goToProgramNameAndAction(page);

  await ProgramUtils.assertProgramTabIsVisible(
    page,
    ProgramUtils.ProgramTabName.VCard,
  );
});

test("vcard economic profit and rebate are visible in the opportunity section overview tab @us-10032 @tc-10066 @vcard @program @integrated", async ({
  page,
}) => {
  await goToHomeSection(page);

  const [dataResponse] = await Promise.all([
    page.waitForResponse(
      (response) =>
        response.url().includes("/analyze/programs/potentials-cost") &&
        response.ok(),
    ),
    ProgramUtils.goToProgramSection(page),
  ]);

  const resultResponse = await dataResponse.json();

  console.log("Result Response: ", resultResponse);

  console.log("Asserting Economic Profit ...");

  const economicProfitLocatorValue = await page
    .locator(".card")
    .nth(1)
    .locator(".cash-flow-no-border")
    .getByRole("paragraph")
    .textContent();

  const economicProfitAsBigNumber = StringUtils.formatBigNumbers(
    resultResponse.economicProfit,
  );

  expect.soft(economicProfitLocatorValue).toBe(economicProfitAsBigNumber);

  console.log("Asserting VCard Rebate Full ...");

  const vCardRebateFullLocatorValue = await page
    .locator(".card")
    .nth(1)
    .locator(".col-xl-6")
    .nth(1)
    .getByRole("paragraph")
    .textContent();

  const vCardRebateFullAsBigNumber = StringUtils.formatBigNumbers(
    resultResponse.vCardRebateFull,
  );

  expect.soft(vCardRebateFullLocatorValue).toBe(vCardRebateFullAsBigNumber);
});

test.afterEach(async ({ page }) => {
  await ensureDefaultLogin(page);
});
