// Created by Diego Mas
import { expect, test } from "@playwright/test";
import { locators } from "../../utils/locators";
// Global utils
import {
  ensureDefaultLogin,
  loginAsAdminException1
} from "../../utils/Utils";

test.beforeEach(async ({ page }) => {
  
  await loginAsAdminException1(page);
});

 
test("WACC Financing global @ui @settings @wacc", async ({
  page
}) => {
  await Promise.all([
    page.waitForResponse(
      responseName =>
        responseName.url().includes("/api/spendfile/strategies/allowed-status") && responseName.ok()
    ),
    page.locator(locators.sidebar.settings).click()
  ]);

  await expect(page.locator(".loading-modal")).toBeHidden();

  // Waiting for the control the next step acts on, rather than sleeping a
  // fixed 1.5s: the sleep was both the slowest and the least reliable way to
  // reach this click, since nothing guaranteed the tab had mounted when it
  // elapsed.
  const financingTab = page.locator("#setup-financing");
  await expect(financingTab).toBeVisible();

  // The company payload is the one this test branches on below, and several
  // requests share the `api/companies/` prefix, so a URL-only matcher can
  // resolve to a sibling whose body carries no `financingStrategyMethod` —
  // the parse then yields undefined and the test silently takes the wrong
  // branch. Match on the body carrying the field, the same way
  // AnalyzeUtils.waitForGridQuery pins its GraphQL query.
  let [dataResponse] = await Promise.all([
    page.waitForResponse(async responseName => {
      if (!responseName.url().includes("api/companies/") || !responseName.ok()) {
        return false;
      }

      try {
        const body = await responseName.json();

        return body?.financingStrategyMethod !== undefined;
      } catch {
        return false;
      }
    }),
    page.waitForResponse(
      responseName =>
        responseName.url().includes("/api/analyze/programs/") && responseName.ok()
    ),
    financingTab.click()

  ]);

  //-To hide the financing groups
  const financingGroups = page.locator(locators.settings.financingGroups);
  await expect(financingGroups).toBeVisible();
  await financingGroups.click()

  //-To open financing rate options
  await page.locator(locators.settings.financingRate).click()

  let datas = JSON.parse(await dataResponse.text());

  // The branch below is a real decision only if the field arrived; without
  // this the `else` doubles as a silent fallback for a missed response.
  expect(datas.financingStrategyMethod).toBeDefined();

  const waccAfterTax = page.locator(".wacc-options", {
    has: page.getByText("WACC (After-Tax)", { exact: true })
  });
  await expect(waccAfterTax).toBeVisible();
  await waccAfterTax.click()

    await expect 
    .soft(
      page
        .locator(".wacc-options")
        .nth(1)
        .getByTestId("tooltip-icon")
    )
    .toHaveAttribute(
          "data-original-title",
          "The weighted average of a supplier's after-tax cost of equity and after-tax cost of long-term debt."
        );
  
    await expect 
    .soft(
      page
        .locator(".wacc-options")
        .nth(2)
        .getByTestId("tooltip-icon")
    )
    .toHaveAttribute(
          "data-original-title",
          "The weighted average of a supplier's pre-tax cost of equity and pre-tax cost of long-term debt."
        );

  if (datas.financingStrategyMethod === 'fr'){
    await page.getByText('WACC (Pre-Tax)').click();    
  } else {
    await page.getByText('Cost of Debt').click();
  }

  await Promise.all([
    page.waitForResponse(
      responseName =>
        responseName.url().includes("api/companies/") && responseName.ok()
    ),
    page.getByRole('button', { name: 'Save' }).click()
  ])
  
});

test.afterEach(async ({ page }) => {

  await ensureDefaultLogin(page);
});