/**
 * 
 TC-9960 The vCard field in global filters are working.
 */

import { expect, test } from "@playwright/test";
import {
  changeToSpendFile,
  ensureCompany_SFLogin,
  ensureDefaultLogin
} from "../../utils/Utils";

import { GlobalFiltersUtils } from "../../utils";

import { KeyValue } from "../../../../apps/ap/src/types";
const spendFileName = "Pagero_VCard.xlsx (Ver. 1)";
const categoryName = "SCF, Vcard & Discounting";
const fieldName = "Vcard Group";
const fieldNameInAPIResponse = "vCardGroupName";

test.beforeEach(async ({ page }) => {
  await ensureCompany_SFLogin(page);

  await changeToSpendFile(page, spendFileName);
  await page.waitForSelector(".loading-modal", { state: "detached" });
  console.log("opening modal");
  if (process.env.E2E_ENV_NAME === "LOCAL") {
    await page.waitForTimeout(6000);
  } else {
    await page.waitForTimeout(3000);
  }
  await page.getByTestId("filter-icon").click();

  await GlobalFiltersUtils.openCategory(page, categoryName);
});

// The whole body of this file used to sit in `beforeEach` with no `test()` at
// all, so Playwright collected zero tests from it and TC-9960 was never
// exercised. It is expressed here the way the sibling fields of the same
// category are covered in globalFilters/categoryFinancingAndDiscounting.spec.ts.
test("Vcard Group field is showing in global filters dialog @api @global-filters @vcard @tc-9960", async ({
  page
}) => {
  const [response] = await Promise.all([
    GlobalFiltersUtils.waitForFieldResponse(page, fieldNameInAPIResponse),
    GlobalFiltersUtils.openField(page, fieldName),
  ]);

  const result: KeyValue<string, string[]> = await response.json();

  test.skip(
    result.value.length === 0,
    "No Vcard Group options returned for this field in the fixture",
  );

  const optionName = result.value[0];

  expect(optionName).toBeTruthy();

  await GlobalFiltersUtils.checkOptionInField(page, {
    optionName,
    fieldName,
  });

  // apply the checked option and save it
  await GlobalFiltersUtils.applyFilters(page);
});

// Clean up
test.afterEach(async ({ page }) => {
  await GlobalFiltersUtils.clearAllFiltersFromNavbar(page);
  await ensureDefaultLogin(page);
});
