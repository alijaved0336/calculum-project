/**
 *
 * Test Nine Boxes UI Update
 *
 */

import { test, expect } from "@playwright/test";
import {
  changeToSpendFile,
  changeToProgram,
  ensureDefaultLogin,
} from "../../utils/Utils";
import { locators } from "../../utils/locators";


test.beforeEach(async ({ page }) => {
  

  await ensureDefaultLogin(page);
  await page.goto("/");
  await page.waitForSelector(".loading-modal", { state: "detached" });
  await changeToSpendFile(page, "Pagero_Full_Home.xlsx (Ver. 1)");
});

test("The Term Extension and Vcard 9 box are showing their respective data in No Vcard company. @nine-box @program  @us-6847 @tc-10476", async ({
  page,
}) => {
  await Promise.all([
    page.waitForResponse(
      (responsePrograms) =>
        responsePrograms.url().includes("/analyze_programs") &&
        responsePrograms.ok(),
    ),
    await page.locator(locators.sidebar.program).click(),
  ]);

  const programName = "All Spends CF";
  await changeToProgram(page, programName);

  // Clicking the Supplier Prioritization (NineBoxesCF) tab loads the Term
  // Extension boxes via the get-nine-boxes-terms-extension-data REST call.
  // (The api/graphql requests fire earlier, during program-page load, so
  // waiting on graphql here would never resolve — see TC-10476.)
  await Promise.all([
    page.waitForResponse(
      (response: any) =>
        response
          .url()
          .includes("api/analyze/get-nine-boxes-terms-extension-data") &&
        response.ok(),
    ),
    page.locator("#ninebox_cf").click(),
  ]);

  console.log("check the current selected level");
  let currentSelectedLevel = await page
    .locator(".custom_cursor_pointer.level-tab.mx-auto.active")
    .innerText();
  console.log("current selected level : ", currentSelectedLevel);

  const countSelectedBoxes = await page.locator("div.nine-box-card.nine-box-card--selected").count();
  console.log("selected boxes # : ", countSelectedBoxes);
  if (countSelectedBoxes > 0) {
    let firstSelectBox = await page.locator("div.nine-box-card--selected").first();
    let boxNumberInfo = await firstSelectBox.locator(".nine-box-card__badge").innerText();
    console.log("box number : ", boxNumberInfo);
    await expect(Number(boxNumberInfo)).not.toBeNaN();
    let spanTextLevel = await firstSelectBox
      .locator(".nine-box-card__row-label")
      .last()
      .innerText();
    console.log("span text level : ", spanTextLevel);
    if (currentSelectedLevel === "Spend Lines") {
      await expect(spanTextLevel).toContain("Spend Lines");
    } else if (currentSelectedLevel === "Suppliers") {
      await expect(spanTextLevel).toContain("Suppliers");
    } else {
      await expect(spanTextLevel).toContain("Parents");
    }

    console.log("has some selected");
    const boxesTitle = await page
      .locator(".table.table-bordered >> tr >> th")
      .nth(1)
      .innerText();
    console.log("boxes: ", boxesTitle);
    await expect(boxesTitle).toBe("Selection");
  } else {
    console.log("no boxes selected");
    const nothingSelectedContainer = await page
      .locator(".nothing-selected-container")
      .count();
    await expect(nothingSelectedContainer).toBe(1);
  }
});
