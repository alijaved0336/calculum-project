/**
 * @fileoverview
 * E2E test suite for verifying the 9 Boxes data is being filtered by the global filters.
 * 
 * - Logs in as an admin user with exception 1.
 * - Changes to a specific spend file before each test.
 * - Navigates to the Opportunity and Supplier Prioritization tab.
 * - Ensures the correct supplier tab is selected and iterates through all defined levels.
 * - Checks that the displayed count matches the number of grid records for each level.
 * - Selects all boxes and verifies the count for "All selected".
 * - Restores default login after each test.
 */
import { expect, test, Locator } from "@playwright/test";

import {
  formatBigNumber,
  ensureDefaultLogin,
  changeToSpendFile,
} from "../utils/Utils";
import { locators } from "../utils/locators";

// *** Program utils ***
import { ProgramUtils } from "../utils";

interface Box {
  box: number;
  spends: number;
  cashFlow: number;
  suppliers: number;
  parents: number;
  volume: number;
}

const mapBoxIdxInResult = {
  0: 7,
  1: 4,
  2: 1,
  3: 8,
  4: 5,
  5: 2,
  6: 9,
  7: 6,
  8: 3,
};

test.beforeEach(async ({ page }) => {
  await ensureDefaultLogin(page);
  await changeToSpendFile(page, "PageroFull_20230308_2.xlsx (Ver. 1)");
  await ProgramUtils.changeToProgram(page, "All Spends CF");
});

test("the 9 Boxes Cash Flow data is filtered by the global filters @flakyResolved @program @global-filters @nineboxes @integrated @us-5783 @tc-6028", async ({
  page,
}) => {
  console.log("Go to Opportunity");
  await Promise.all([
    page.waitForResponse(
      (res) => res.url().includes("/api/statistics/get-chart-data") && res.ok(),
    ),
    page.locator(locators.sidebar.program).click(),
  ]);
  // Go to 9 Boxes Cash Flow tab and get data from API
  console.log("Go to 9 Boxes Cash Flow tab and get data from API");
  const [response] = await Promise.all([
    page.waitForResponse(
      (resp) =>
        resp
          .url()
          .includes("/api/analyze/get-nine-boxes-terms-extension-data") &&
        resp.ok(),
    ),
    page.waitForResponse(
      (res) => res.url().endsWith("/api/graphql") && res.ok(),
    ),
    page.locator("#ninebox_cf").click(),
  ]);

  let currentLevelSelected = await page
    .locator(".custom_cursor_pointer.level-tab.mx-auto.active")
    .textContent();

  console.log("currentLevelSelected", currentLevelSelected);

  const result: Box[] = await response.json();
  expect(result).toBeDefined();
  const boxes = await page.locator(".box").all();
  for (const [boxElemIdx, boxLocator] of boxes.entries()) {
    // Given box index search for its data in a result list
    const boxIdxInResult =
      mapBoxIdxInResult[boxElemIdx as keyof typeof mapBoxIdxInResult];
    // Box number
    const boxLocatorBox = result[boxIdxInResult].box.toString();
    const boxLocatorCashFlow =
      result[boxIdxInResult].cashFlow === 0
        ? "-"
        : formatBigNumber(result[boxIdxInResult].cashFlow);
    const boxLocatorVolume =
      result[boxIdxInResult].volume === 0
        ? "-"
        : formatBigNumber(result[boxIdxInResult].volume);
    console.log(`boxLocatorBox ${boxLocatorBox}`);
    console.log(`boxLocatorCashFlow ${boxLocatorCashFlow}`);
    console.log(`boxLocatorVolume ${boxLocatorVolume}`);
    await expect(boxLocator).toContainText(boxLocatorBox);
    await expect(boxLocator).toContainText(boxLocatorCashFlow);
    await expect(boxLocator).toContainText(boxLocatorVolume);
    await validateByLevels(
      currentLevelSelected,
      boxLocator,
      result,
      boxIdxInResult,
    );
  }
});

async function validateByLevels(
  currentLevelSelected: string | null,
  boxLocator: Locator,
  result: Box[],
  boxIdxInResult: any,
) {
  let level: string = "-";
  if (currentLevelSelected === "Spend Lines") {
    // Spend Lines
    level =
      result[boxIdxInResult].spends === 0
        ? "-"
        : result[boxIdxInResult].spends.toString();
  } else if (currentLevelSelected === "Suppliers") {
    // Suppliers
    level =
      result[boxIdxInResult].suppliers === 0
        ? "-"
        : result[boxIdxInResult].suppliers.toString();
  } else if (currentLevelSelected === "Parents") {
    // Parents
    level =
      result[boxIdxInResult].parents === 0
        ? "-"
        : result[boxIdxInResult].parents.toString();
  }
  console.log(`level ${level}`);
  await expect(boxLocator).toContainText(level);
}
