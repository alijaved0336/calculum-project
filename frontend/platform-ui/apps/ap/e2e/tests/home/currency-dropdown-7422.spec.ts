/***
 *
 * Test for the new currency dropwdown and the popover tooltip
 */

import {expect, test} from "@playwright/test";
import {changeToSpendFile, ensureDefaultLogin, goToHomeSection, goToProgramSection} from "../utils/Utils";
import {ProgramUtils} from "../utils";
import englishKeys from "@ada/design-system/locales/languages/en.json";

const given = {
  program: '9 boxes CF (Read Only)',
  spendFile: "Pagero_20230124.xlsx (Ver. 1)",
  currency: {
    usd: 13203892.2,
    jpy: 1731228851.8,
    jpyRate: 131.11504
  },
  entity: {
    name: "3M Company",
    spendVolume: 1768.9
  }
}
import Api2 from "../utils/APi2";

test.beforeEach(async ({ page }) => {
  await ensureDefaultLogin(page);

  // Defense-in-depth: clear the pinia-persisted program/SFV selection so the
  // reload below starts from the backend default instead of stale state left
  // by a prior run (a stale persisted selectedProgram is what deep-links the
  // SPA off the dashboard). The real guarantee that we end up on the dashboard
  // with its program dropdown is the explicit goto + visibility wait further
  // down. secure-ls falls back to the default when the key is missing, so
  // removing it is safe.
  await page.evaluate(() => {
    try {
      localStorage.removeItem("ada-app");
      localStorage.removeItem("ada-home");
      localStorage.removeItem("ada-analyze");
    } catch {
      // localStorage may be unavailable; the page reload below will
      // just use whatever default state the server provides.
    }
  });

  // Hard reload picks up the cleared persistence and re-renders the
  // dashboard with the backend default program. Bound the
  // loading-modal detach wait at 60s (try/catch) — on slow envs the
  // QA report 2026-05-18 saw 205× polls until the 120s test budget.
  // A stuck modal will surface as a downstream assertion failure with
  // a clearer signature than a generic waitForSelector timeout.
  await page.goto("/");
  try {
    await page.waitForSelector(".loading-modal", {
      state: "detached",
      timeout: 60000,
    });
  } catch {
    console.warn(
      "[currency-dropdown-7422] .loading-modal did not detach within 60s — proceeding; downstream assertions will surface a real issue if one exists.",
    );
  }
  await changeToSpendFile(page, given.spendFile);

  // ROOT CAUSE of the @us-7422 flake (timeout at the body's first
  // `waitForResponse(/spend-info)`): the body drives the home-dashboard program
  // dropdown ([data-testid="active-program-dropdown"]), but after login + the
  // spend-file switch the SPA sometimes lands on the program *panel*
  // (Analyze/Opportunity "All Programs" cards) instead of the dashboard. That
  // dropdown is rendered ONLY by the dashboard, so off-dashboard
  // ProgramUtils.changeToProgram() bails with "Only one Program, nothing to
  // change...", fires no /spend-info, and waitForResponse hangs the full 120s.
  // goToHomeSection() can't catch this — it accepts ANY /home/* URL as
  // "in Home". (Confirmed via the failure screenshot: program-panel page, no
  // dropdown; the currency checks still pass because the currency selector
  // lives in the always-present global banner, not the dashboard body.)
  //
  // /home/home-dashboard has no route guard, so this goto reliably lands and
  // sticks. Then wait for the dropdown to actually render — it is
  // `v-if listOptions.length > 1`, populated only once programs load for the
  // active SFV — so a stuck/absent dropdown now surfaces as a clear "not
  // visible" error here instead of an opaque 120s response timeout downstream.
  await page.goto("/home/home-dashboard");
  await expect(
    page.locator('[data-testid="active-program-dropdown"]'),
  ).toBeVisible({ timeout: 30000 });
});

test("Test for currency dropdown @home @us-7422", async ({page}) => {
  console.log("the custom currency dropdown is displaying");
  await page.waitForTimeout(6000);
  let currenctCurrency = await page
    .locator("span.currency-selected-prefix")
    .innerText();
  console.log("currenctCurrency : ", currenctCurrency);
  expect(currenctCurrency).toContain("USD");
  await page.locator("span.currency-selected-prefix").click();
  let mostUsesCurrencies = page.locator(".custom-currency-dropdown");
  let usdWithCheckMark = await page
    .locator(".current-currency-container >> .check-svg")
    .count();
  console.log("usdWithCheckMark : ", usdWithCheckMark);
  await expect(mostUsesCurrencies).toBeVisible();
  expect(usdWithCheckMark).toBe(1);

  //<editor-fold desc="Tooltip">
  console.log("click on the info tootlip for the currency ");
  await page.locator(".popover-custom-currency-info").click();

  await page.waitForTimeout(5000);
  let headerCurrency = await page.locator(".shepherd-header >> .shepherd-title").innerText();
  console.log("header currency : ", headerCurrency);
  expect(headerCurrency).toContain("Currency");
  let firstSectionTitle = await page
    .locator("h4.mb-1.text-lg.font-semibold")
    .first()
    .innerText();
  console.log("first section title : ", firstSectionTitle);
  await page.waitForTimeout(1000);
  expect(firstSectionTitle).toContain("User-selected Currency");
  await page.locator('button.shepherd-cancel-icon').click();
  //</editor-fold>
  //<editor-fold desc="Change to program">
  console.log(`Select program ${given.program}`)
  //</editor-fold>
  //<editor-fold desc="Check totalSpendUsd">
  console.log('Getting SpendInfo USD')
  const [totalSpendUsdResponse] = await Promise.all([
    page.waitForResponse((response) =>
      response.url().endsWith("/api/analyze/programs/spend-info")),
    ProgramUtils.changeToProgram(page, given.program)
  ]);
  if (!totalSpendUsdResponse.ok()) {
    throw new Error("Could not get total spend usd");
  }

  let responseBody = await totalSpendUsdResponse.json();
  console.log(`totalSpendUsd--> ${responseBody.totalSpend}`);
  console.log("select JPY for the currency");
  await page.locator("span.currency-selected-prefix").click();
  await page.waitForTimeout(1000);
  const [jpyRateResponse] = await Promise.all([
    page.waitForResponse(
      response =>
        response.url().includes("/api/externals-apis/currency-layer/convert") &&
        response.ok()
    ),
    page.waitForResponse((response) =>
      response.url().endsWith("/api/analyze/programs/spend-info")),
    page.locator(".currency-item-container:has-text('JPY')").first().click()
  ])

  const [totalSpendJpyResponse] = await Promise.all([
    page.waitForResponse((response) =>
      response.url().endsWith("/api/analyze/programs/spend-info")),
    ProgramUtils.changeToProgram(page, given.program)
  ])

  if (!jpyRateResponse.ok()) {
    throw new Error("Could not get JPY rate");
  }
  const jpyRate = (await jpyRateResponse.json()).result
  console.log('JPY currency rate: ', jpyRate);
  expect(jpyRate).toBe(given.currency.jpyRate)

  await page.waitForTimeout(6000);
  let jpyIsCurrentCurrency = await page
    .locator("span.currency-selected-prefix")
    .innerText();
  
  console.log(`Expecting ${jpyIsCurrentCurrency} === JPY`)
  expect(jpyIsCurrentCurrency).toContain("JPY");
  if (!totalSpendJpyResponse.ok()) {
    throw new Error("Could not get total spend jpy");
  }

  responseBody = await totalSpendJpyResponse.json();
  console.log(`totalSpendJpy--> ${responseBody.totalSpend}`);
  const totalSpendJpy = responseBody.totalSpend
  expect(totalSpendJpy).toBe(given.currency.jpy)

  await page.waitForTimeout(3000);
  console.log("select the default currency");
  await page.locator("span.currency-selected-prefix").click();
  await page.waitForTimeout(1000);
  await page.locator(".currency-item-container:has-text('USD')").first().click()
  const search = page.getByPlaceholder(
    englishKeys.home.components.navbar.search
  );
  //clear the input first
  await search.fill("");
  await page.waitForTimeout(500);
  // Type company name
  await search.fill(given.entity.name);
  const [entity] =await Promise.all([
    page.waitForResponse((response) =>
      response.url().endsWith("/api/entity-card/get-entity-cards"),
    ),
    search.press("Enter"),
  ]);

  if (!entity.ok()) {
    throw new Error("Could not get spend volume");
  }

  responseBody = await entity.json();
  console.log(responseBody)
  const spendVolume = responseBody[0].volume
  console.log(`spendVolume--> ${spendVolume}`);
  expect(spendVolume).toBe(given.entity.spendVolume)
});

