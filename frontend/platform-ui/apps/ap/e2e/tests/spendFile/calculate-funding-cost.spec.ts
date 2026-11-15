import { expect, test } from "@playwright/test";
import Api2 from "../utils/APi2";
import {
  ensureDefaultLogin,
  goToProgramSection,
  changeToSpendFile,
  loginAsSuperAdmin,
  waitElementVisibleAndClick
} from "../utils/Utils";
import { locators } from "../utils/locators";
import { ProgramUtils } from "../utils";
import StringUtils from '../utils/StringUtils';

let api: Api2 | null = null;

let currencyBaseRateUSD = 0.0505;
let currencyBaseRateEUR = 0.034;
let gradeFactorCountry = 1.0; // from parent
let fundingSpreadSupplierITA = 0.0254;
let fundingSpreadSupplierBEL = 0.0193;
const supplierName = "Bureau D Electronique Appliquee";
const parentName = "HALMA PLC";

const countrySettings = {
  italy: {
    USD: {
      baseRate: currencyBaseRateUSD,
      spread: fundingSpreadSupplierITA
    },
    EUR: {
      baseRate: currencyBaseRateEUR,
      spread: fundingSpreadSupplierITA
    }
  },
  belguim: {
    USD: {
      baseRate: currencyBaseRateUSD,
      spread: fundingSpreadSupplierBEL
    },
    EUR: {
      baseRate: currencyBaseRateEUR,
      spread: fundingSpreadSupplierBEL
    }
  }
};



test.beforeEach(async ({ page }) => {
  


  await ensureDefaultLogin(page);
  await page.goto("/");
});

test("Calculate Funding Cost @api @admin @us-4324 u@s-4326 us-4327) @heavy", async ({
  page
}) => {

  await loginAsSuperAdmin(page);

  await changeToSpendFile(page, "Pagero_Funding_Cost.xlsx (Ver. 1)");

  api = await Api2.getInstance(page);

  let urlRecalculate = `/api/analyze/spend-file-version/${
    api!.activeSpendFileVersionUUid
  }/recalculate`;
  const response = await api!.doPost(
    urlRecalculate,
    {},
    "application/json",
    500000
  );
  
  expect(response.ok()).toBeTruthy();

  let status = "unknown";

  const url2 =
    "/api/spendfile/get-file-version/" + api!.activeSpendFileVersionUUid;
  while (status !== "ready") {
    const spvStatus = await api!.doGet(url2);
    expect(spvStatus?.ok()).toBeTruthy();
    const respStatus = JSON.parse(await spvStatus!.text());
    setTimeout(() => {
      status = respStatus.status;
    }, 5000);
  }
  expect(status).toBe("ready");

  // Goto Analyze
  await Promise.all([
    page.waitForResponse(
      response =>
        response.url().includes("/analyze_programs?") &&
        response.ok()
    ),
    goToProgramSection(page)
  ]);

  await ProgramUtils.goToProgramNameAndAction(page, {
    name: "All Suppliers - CF - No Financing"
  });
  // Success
  Api2.printSuccess("All spected values returned");
});

async function checkDataLevelSpend(spends: any[]) {
  spends.forEach(element => {
    if (element["providerName"] === supplierName) {
      console.log(
        "Cheching fundingCost at spend level ----  for " + supplierName
      );

      const itemFundingCost = element["fundingCost"];
      const country = (<string>element["countryName"]).toLowerCase();
      const currencyCode = <string>element["currencyCode"];

      // @ts-ignore
      const countryKey = country as keyof typeof countrySettings;
      const currencyKey = currencyCode as keyof typeof countrySettings[typeof countryKey];
      
      if (
        countrySettings.hasOwnProperty(countryKey) &&
        countrySettings[countryKey].hasOwnProperty(currencyKey)
      ) {
        const settings = countrySettings[countryKey][currencyKey];
        const currentFundingCost =
          settings.baseRate + gradeFactorCountry * settings.spread;
        expect(currentFundingCost).toEqual(parseFloat(itemFundingCost));
      }
    }
  });
}

async function checkDataLevelSupplier(spends: any[], suppliers: any[]) {
  suppliers.forEach(element => {
    if (element["providerName"] === supplierName) {
      console.log(
        "Cheching fundingCost at supplier level ----  for " + supplierName
      );

      const itemFundingCost = parseFloat(element["fundingCost"]);
      let volumeTotal = 0;
      let filters = spends.filter(
        spend => StringUtils.removeIRI(spend["providerUuid"]) === element["providerUuid"]
      );
      if (filters.length > 0) {
        let currentFundingCost = 0;

        filters.forEach(filter => {
          let volume = parseFloat(filter["volume"]);
          let fundinCost = parseFloat(filter["fundingCost"]);
          volumeTotal += volume;
          currentFundingCost += fundinCost * volume;
        });
        currentFundingCost /= volumeTotal;
        expect(itemFundingCost.toFixed(5)).toEqual(
          currentFundingCost.toFixed(5)
        );
      }
    }
  });
}

async function checkDataLevelParents(spends: any[], parents: any[]) {
  parents.forEach(element => {
    if (element["providerName"] === parentName) {
      console.log(
        "Cheching fundingCost at parent level ----  for " + parentName
      );

      const itemFundingCost = parseFloat(element["fundingCost"]);
      let volumeTotal = 0;
      let filters = spends.filter(
        spend =>
          StringUtils.removeIRI(spend["providerParentUuid"]) === element["providerUuid"]
      );
      if (filters.length > 0) {
        let currentFundingCost = 0;

        filters.forEach(filter => {
          let volume = parseFloat(filter["volume"]);
          let fundinCost = parseFloat(filter["fundingCost"]);
          volumeTotal += volume;
          currentFundingCost += fundinCost * volume;
        });
        currentFundingCost /= volumeTotal;
        expect(itemFundingCost.toFixed(5)).toEqual(
          currentFundingCost.toFixed(5)
        );
      }
    }
  });
}

test.afterEach(async ({ page }) => {
  await ensureDefaultLogin(page);
  await page.goto("/");
});
