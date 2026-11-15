
import { test, expect } from "@playwright/test";
import {  
  changeToSpendFile,  
  ensureCompany_SFLogin,  
  ensureDefaultLogin
} from "../../utils/Utils";

import { GlobalFiltersUtils } from "../../utils";

import { KeyValue } from "../../../../apps/ap/src/types";


const spendFileName = "Pagero_VCard.xlsx (Ver. 1)";
const categoryNameWithVcard = "SCF, Vcard & Discounting";
const categoryNameWithOutVcard = "SCF & Discounting";
const fieldName = "Vcard Applied";

test.describe.serial("Global filters -> isVcardApplied @api @global-filters @us-10935", async () => {




test.beforeEach(async ({ page }) => {
  

    await page.goto("/");
    

  });

  test("Global Filter isVcardApplied is shwowing in global filters dialog ", async ({
    page
  }) => {

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

    await GlobalFiltersUtils.openCategory(page, categoryNameWithVcard);

    const fieldNameInAPIResponse = "isVCardApplied";
    

    const [response] = await Promise.all([
      GlobalFiltersUtils.waitForFieldResponse(page, fieldNameInAPIResponse),
      GlobalFiltersUtils.openField(page, fieldName),
    ]);

    const result: KeyValue<string, string[]> = await response.json();

    if (result.value.length === 0) {
      console.log("Skipping test because there are no options available.");
      test.skip();
    }

    const optionNames = result.value;
    console.log("** optionName",optionNames)
    await page.locator(".radio-text").first().click()    
    await GlobalFiltersUtils.applyFilters(page);
  });


  test("Global Filter isVcardApplied is NO shwowing in global filters dialog ", async ({
    page
  }) => {

    console.log("opening modal");
    if (process.env.E2E_ENV_NAME === "LOCAL") {
      await page.waitForTimeout(6000);
    } else {
      await page.waitForTimeout(3000);
    }

    await page.getByTestId("filter-icon").click();  
    await GlobalFiltersUtils.openCategory(page, categoryNameWithOutVcard);
     await expect(
          page.locator(".k-panelbar-item-text", { hasText: fieldName })
        ).toHaveCount(0);
  });

  // Clean up
  test.afterEach(async ({ page }) => {
    await GlobalFiltersUtils.clearAllFiltersFromNavbar(page);
    await ensureDefaultLogin(page);
  });

});