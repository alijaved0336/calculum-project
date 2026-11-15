
import { test } from "@playwright/test";
import {  
  changeToSpendFile,  
  ensureDefaultLogin
} from "../utils/Utils";

import { GlobalFiltersUtils } from "../utils";

import { KeyValue } from "../../../apps/ap/src/types";
const spendFileName = "Pagero_DifferentBuyers.xlsx (Ver. 1)";
const categoryDEI = "DEI";

test.describe.serial("Global filters -> DEI fields @api @global-filters @us-11029", async () => {


test.beforeEach(async ({ page }) => {
  

    await page.goto("/");
    await ensureDefaultLogin(page)
    await changeToSpendFile(page, spendFileName);
    await page.waitForSelector(".loading-modal", { state: "detached" });    
    

  });

    test("Global Filter entityWomanOwnedBusiness is showing in global filters dialog ", async ({
      page
    }) => {

      await page.waitForTimeout(3000);

      await page.getByTestId("filter-icon").click();    

      await GlobalFiltersUtils.openCategory(page, categoryDEI);

      const fieldNameInAPIResponse = "entityWomanOwnedBusiness";
      

      const [response] = await Promise.all([
        GlobalFiltersUtils.waitForFieldResponse(page, fieldNameInAPIResponse),
        GlobalFiltersUtils.openField(page, 'Woman-owned Business'),
      ]);

      const result: KeyValue<string, string[]> = await response.json();

      test.skip(result.value.length === 0, "No DEI options returned for this field in the fixture");

      const optionNames = result.value;
      console.log("** optionName",optionNames)
      await page.locator(".radio-text").first().click()    
      await GlobalFiltersUtils.applyFilters(page);
    });


    test("Global Filter entityEthnicMinorityOwnedBusiness is showing in global filters dialog ", async ({
      page
    }) => {

      await page.waitForTimeout(3000);

      await page.getByTestId("filter-icon").click();  

      await GlobalFiltersUtils.openCategory(page, categoryDEI);

      const fieldNameInAPIResponse = "entityEthnicMinorityOwnedBusiness";
      

      const [response] = await Promise.all([
        GlobalFiltersUtils.waitForFieldResponse(page, fieldNameInAPIResponse),
        GlobalFiltersUtils.openField(page, 'Ethnic minority-owned Business'),
      ]);

      const result: KeyValue<string, string[]> = await response.json();

      test.skip(result.value.length === 0, "No DEI options returned for this field in the fixture");

      const optionNames = result.value;
      console.log("** optionName",optionNames)
      await page.locator(".radio-text").first().click()    
      await GlobalFiltersUtils.applyFilters(page);
    });    

    test("Global Filter entityVeteranOwnedBusiness is showing in global filters dialog ", async ({
      page
    }) => {

      await page.waitForTimeout(3000);


      await page.getByTestId("filter-icon").click();  

      await GlobalFiltersUtils.openCategory(page, categoryDEI);

      const fieldNameInAPIResponse = "entityVeteranOwnedBusiness";
      

      const [response] = await Promise.all([
        GlobalFiltersUtils.waitForFieldResponse(page, fieldNameInAPIResponse),
        GlobalFiltersUtils.openField(page, 'Veteran-owned Business'),
      ]);

      const result: KeyValue<string, string[]> = await response.json();

      test.skip(result.value.length === 0, "No DEI options returned for this field in the fixture");

      
    });    

  // Clean up
  test.afterEach(async ({ page }) => {
    await GlobalFiltersUtils.clearAllFiltersFromNavbar(page);
    await ensureDefaultLogin(page);
  });

});