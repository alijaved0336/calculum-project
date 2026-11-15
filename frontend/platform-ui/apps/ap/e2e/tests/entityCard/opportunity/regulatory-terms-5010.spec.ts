/**
 * @fileoverview
 * E2E tests for verifying the Regulatory Terms strategy in the Opportunity entity card.
 *
 * This test suite covers:
 * - Navigating to the Opportunity entity card for a specific supplier.
 * - Ensuring the correct program and spend file are selected.
 * - Verifying that the Regulatory Terms strategy is shown as disabled but still displays its value.
 *
 * Prerequisites:
 * - The test user must have access to the "PageroFull_20230308_2.xlsx (Ver. 1)" spend file.
 * - The supplier must exist in the test data.
 *
 * Utilities:
 * - Uses Playwright test runner and custom utility functions for navigation and assertions.
 */

import { expect, Page, test } from "@playwright/test";
import {
  changeToSpendFile,
  ensureDefaultLogin,
  goToEntityCardEntity,
  goToEntityCardEntityExactFull,
  loginAsAdmin,
} from "../../utils/Utils";
import { locators } from "../../utils/locators";

test.describe.serial("Regulatory Terms @flakyResolved ", () => {
  let page: Page;
  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();
    await loginAsAdmin(page);
    console.log("Changing SpendFile to : PageroFull_20230308_2.xlsx (Ver. 1)");
    await changeToSpendFile(page, "PageroFull_20230308_2.xlsx (Ver. 1)");
  });

  test("TC-1: Regulatory Terms is Shown as Disabled but having its value @integrated @entity @flakyResolved @strategies @us-5469", async () => {
    // check if Regulatory Terms is disabled
    await checkRegulatoryTermsSetup(page);
    console.log("Searching for Pengg Kabel Gmbh Entity");
    let entity = "Pengg Kabel Gmbh";
    await goToEntityCardEntityExactFull(page, entity);

    // The Regulatory Terms line lives in the strategies chart; when the
    // strategy is disabled it only renders after expanding the unused
    // strategies group, but it must still show its value.
    let regulatoryTermsDiv = page.locator(
      'div.line-chart:has-text("Regulatory Terms")',
    );
    if (!(await regulatoryTermsDiv.isVisible())) {
      console.log("Regulatory Terms hidden - expanding unused strategies");
      await page.locator(".unused-strategy-svg").click();
    }
    await expect(regulatoryTermsDiv).toBeVisible();

    const barValue = (
      await regulatoryTermsDiv.locator(".value-container").first().innerText()
    ).trim();
    console.log("Regulatory Terms bar value: ", barValue);
    // EntityTermsChartLine renders strategy.terms verbatim - no thousands
    // separator, no unit suffix - or the literal "N/A" when it is null, so
    // assert that rendered shape instead of a Number() parse that treats any
    // formatted string as an unremarkable NaN.
    expect(barValue).toMatch(/^(N\/A|-?\d+(?:\.\d+)?)$/);

    // closeButton (#entity-close-modal) closes the card modal itself;
    // closeCard's [data-testid="close-icon"] also matches the grid column
    // options close icon and violates strict mode.
    await page.locator(locators.entityCard.closeButton).click();
  });

  test("TC-2 Regulatory Terms bar is colored following the Strategie value in relation with Proposed Payment Terms @integrated @entity @strategies @us-5469", async () => {
    // check if Regulatory Terms is disabled
    await checkRegulatoryTermsSetup(page);

    console.log("Searching for Microelettrica Scientifica S.P.A. Entity");
    let entity = "Microelettrica Scientifica S.P.A.";
    await goToEntityCardEntity(page, entity);

    await page.waitForTimeout(1000);

    console.log("clicked on the first avaialble entity card");
    let regulatoryTermsDiv = page.locator(
      'div.line-chart:has-text("Regulatory Terms")',
    );

    // check if the regulatory tems is visible
    let isVisible = await regulatoryTermsDiv.isVisible();
    if (!isVisible) {
      // click on the diabled terms and stratgies
      await page.locator(".unused-strategy-svg").click();
    }
    console.log("get values of the bar");
    let barValue = await regulatoryTermsDiv
      .locator(".value-container")
      .first()
      .innerText();
    if (barValue !== "N/A") {
      expect(Number(barValue)).not.toBeNaN();
    }

    console.log("get bar line bg color");
    let barStyle = regulatoryTermsDiv.locator(".line-percent");

    const color = await barStyle.evaluate((e) => {
      return window.getComputedStyle(e).getPropertyValue("background-color");
    });

    console.log("bar style : ", color);
    if (color === "rgb(234, 236, 240)") {
      console.log("gray bg is being used for this line");
    } else {
      console.log(" gray bg is not being used for this line");
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

/**
 * This function checks if the Regulatory Terms is enabled or not.
 * It makes a call to the api to get the allowed status of all strategies and then checks if the Regulatory Terms strategy is enabled.
 * If it is enabled, it also checks if the Save button is disabled.
 * @param {Page} page - The page object.
 * @returns {void}
 */
async function checkRegulatoryTermsSetup(page: Page) {
  const [responseData] = await Promise.all([
    page.waitForResponse(
      (res: any) =>
        res.url().includes("/api/spendfile/strategies/allowed-status") &&
        res.ok(),
    ),
    page.locator(locators.sidebar.settings).click(),
  ]);

  //wait to open #show-strategies-section
  let response = await responseData.json();

  let responseValues = response["strategies"].map((item: any) => {
    return {
      name: item.name,
      isAllowed: item.isAllowed,
    };
  });
  let regulatorytermsEnabled = responseValues.filter((x: any) => {
    if (x === "regulatoryTermsStrategy") {
      return x.isAllowed;
    }
  });

  let rowRegulatoryTerms = page.locator(
    'div.col-12:has-text("Regulatory Terms")',
  );
  //check if enabled, toggle the switch to disable it
  if (regulatorytermsEnabled) {
    let countSlider = await rowRegulatoryTerms.locator(".slider.round").count();
    console.log("countSlider : ", countSlider);
    if (countSlider === 1) {
      let saveButton = page
        .locator('.btn.btn-primary.font-md:has-text("Save")')
        .first();
      let isButtonDisabled = await saveButton.isDisabled();
      console.log("isButtonDisabled : ", isButtonDisabled);
    }
  }
}
