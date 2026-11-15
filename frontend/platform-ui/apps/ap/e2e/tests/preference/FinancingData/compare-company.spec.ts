/**
 * TC-8646 The Financial Data is NOT found in the Capital IQ ingested table
 * so that the Manual information is entered.
 */

import { expect, test, Page } from "@playwright/test";
import { ensureSuperAdminLogin } from "../../utils/Utils";
import { locators } from "../../utils/locators";
import {
  logOperation,
  waitForElementVisible,
  waitForApiResponse,
  safePromiseAll,
} from "../../utils/PlaywrightTestHelpers";

// ----- Constants -------------------------------------------------------

const YEAR = 2023;
const UPDATE_API = "/api/compare/update_compare_company";
const FIND_API   = "/api/compare/find_compare_company";

/** Fields to enter/verify for YEAR. `id` matches the DOM id segment. */
const FIELDS_2023: Array<{ id: string; value: number }> = [
  { id: "dpo",             value: 60       },
  { id: "dso",             value: 45       },
  { id: "dio",             value: 47       },
  { id: "c2c",             value: 60       },
  { id: "inventory",       value: 10000000 },
  { id: "tradeReceivable", value: 2000000  },
  { id: "tradePayable",    value: 1000000  },
  { id: "totalRevenue",    value: 1000000  },
  { id: "costOfGoods",     value: -500000  },
];

const KEYS_TO_EXTRACT = [
  "DPO", "DIO", "DSO", "C2C",
  "COST_OF_GOOD", "INV", "TOTAL_REVENUE",
  "TRADE_PAYABLE", "TRADE_RECEIVABLE",
];

// ----- Setup -----------------------------------------------------------

test.beforeEach(async ({ page }) => {
  await ensureSuperAdminLogin(page);
});

// ----- Test ------------------------------------------------------------

test("Home Financing Data - Enter Data Manually  @tc-8646", async ({ page }) => {
  logOperation("Navigate to Financial Data preferences");
  await goToFinancialData(page);
  await enterManualData(page);

  // Navigate to Company Info and back to Financial Data to verify persisted values
  logOperation("Navigate to Company Info");
  await page.locator(locators.headerMenu.topMenu.dropDownMenu).click();
  await page.locator(locators.headerMenu.topMenu.companyInfo).click();

  // Wait for Company Info page to be ready before navigating back
  await page.waitForSelector(".loading-modal", { state: "detached", timeout: 15000 });

  logOperation("Navigate back to Financial Data");
  const [dataResponse] = await safePromiseAll([
    waitForApiResponse(page, FIND_API, 15000, "reload financial data"),
    (async () => {
      await page.locator(locators.headerMenu.topMenu.dropDownMenu).click();
      await page.locator(locators.headerMenu.topMenu.financialData).click();
    })(),
  ], "open Financial Data with API capture");

  // Parse and structure the API response by year
  const json = JSON.parse(await dataResponse.text());
  const extractedData: Record<number, Record<string, number | undefined>> = {};

  KEYS_TO_EXTRACT.forEach(key => {
    if (Object.prototype.hasOwnProperty.call(json, key)) {
      (json[key] as Array<{ year: number; value: number }>).forEach(item => {
        if (!extractedData[item.year]) {
          extractedData[item.year] = { year: item.year };
        }
        extractedData[item.year][`${key}Value`] = item.value;
      });
    }
  });

  const resultArray = Object.values(extractedData).sort(
    (a: any, b: any) => a.year - b.year,
  );

  const entity2023 = resultArray.find((item: any) => item.year === YEAR);

  expect(entity2023, `No data found for year ${YEAR}`).toBeDefined();
  expect(entity2023!.DPOValue).toEqual(60);
  expect(entity2023!.DIOValue).toEqual(47);
  expect(entity2023!.DSOValue).toEqual(45);
  expect(entity2023!.C2CValue).toEqual(60);
  expect(entity2023!.COST_OF_GOODValue).toEqual(-500000);
  expect(entity2023!.INVValue).toEqual(10000000);
  expect(entity2023!.TOTAL_REVENUEValue).toEqual(1000000);
  expect(entity2023!.TRADE_PAYABLEValue).toEqual(1000000);
  expect(entity2023!.TRADE_RECEIVABLEValue).toEqual(2000000);
});

// ----- Helpers ---------------------------------------------------------

/**
 * Navigates to the Financial Data section and waits for it to fully load.
 */
async function goToFinancialData(page: Page): Promise<void> {
  // Ensure home page has finished loading before interacting with the top menu
  await page.waitForSelector(".loading-modal", { state: "detached", timeout: 30000 });

  await safePromiseAll([
    waitForApiResponse(page, FIND_API, 15000, "load financial data"),
    (async () => {
      await page.locator(locators.headerMenu.topMenu.dropDownMenu).click();
      await page.locator(locators.headerMenu.topMenu.financialData).click();
    })(),
  ], "open Financial Data");

  // Wait for the first input to confirm the form is ready
  await waitForElementVisible(
    page,
    `#my-input-dpo-${YEAR}`,
    15000,
    "financial data form ready",
  );
}

/**
 * Enters (or skips if already correct) all manual financial data fields for YEAR.
 */
async function enterManualData(page: Page): Promise<void> {
  logOperation("Entering manual financial data", { year: YEAR, fields: FIELDS_2023.length });
  for (const { id, value } of FIELDS_2023) {
    await enterFieldValue(page, id, YEAR, value);
  }
}

/**
 * Fills a single financial input field and waits for the API to confirm the save.
 * Skips silently when the field already contains the expected value.
 */
async function enterFieldValue(
  page: Page,
  fieldId: string,
  year: number,
  value: number,
): Promise<void> {
  const selector = `#my-input-${fieldId}-${year}`;
  logOperation("Enter field value", { fieldId, year, value });

  await waitForElementVisible(page, selector, 10000, `input ${fieldId}-${year} visible`);

  // Currency-style fields (inventory, tradeReceivable, ...) render via
  // Intl.NumberFormat, so the visible value can be e.g. "10,000,000.0".
  // Strip thousand separators before comparing — otherwise Number(current)
  // is NaN, the skip is missed, and re-entering the same underlying value
  // leaves the v-model unchanged so the save API never fires.
  const current = await page.locator(selector).inputValue();
  const currentNumeric = Number(current.replace(/,/g, ""));
  if (currentNumeric === value) {
    logOperation("Field already set, skipping", { fieldId, value });
    return;
  }

  await safePromiseAll([
    waitForApiResponse(page, UPDATE_API, 10000, `save ${fieldId}`),
    (async () => {
      await page.locator(selector).click();
      await page.locator(selector).clear();
      await page.locator(selector).fill(String(value));
      await page.locator(selector).press("Enter");
    })(),
  ], `save field ${fieldId}`);

  logOperation("Field saved", { fieldId, value });
}
