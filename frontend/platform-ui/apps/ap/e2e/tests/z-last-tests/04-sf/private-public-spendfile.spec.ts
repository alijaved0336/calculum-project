/***
 *
 *
 * TC9540- The Public/Private visibility visibility is proved.
 */

/**
 *
 *   @company = "Company_SF"
 *
 *   @Spendfile = "Pagero_Full_SF.xlsx (Ver. 1)" //Already existent, and additionally attached here.
 *
 *   @program = "Main Program." //Created by default.
 *
 *   @user = " joel+testadmin@calculum.ai"
 *
 *   @user1 = "user-test@softwaresinlimite.com"
 *
 *
 */

const myCompany = { company: "Company_SF", nameField: "name" };

import { test, expect } from "@playwright/test";
import {
  ensureDefaultLogin,
  ensureSuperAdminLogin,
  logout,
  loginByUser,
  selectCompanyInDataController
} from "../../utils/Utils";
import { locators } from "../../utils/locators";
import {
  safePromiseAll,
  waitForApiResponse,
  logOperation,
  safeOperation,
  ensurePageActive,
} from "../../utils/PlaywrightTestHelpers";

test.beforeEach(async ({ page }) => {
  await ensureSuperAdminLogin(page);
});

test("Test private/public visibility @tc9540", async ({ page }) => {
  logOperation("Starting test: Test private/public visibility");
  
  await page.locator(locators.headerMenu.topMenu.dropDownMenu).click();
  await safePromiseAll(
    [
      waitForApiResponse(
        page,
        "/api/companies",
        10000,
        "load companies"
      ),
      page.locator(locators.headerMenu.topMenu.adminConsole).click(),
    ],
    "click admin console"
  );
  
  await safePromiseAll(
    [
      waitForApiResponse(
        page,
        "/api/companies/spend_files_versions",
        10000,
        "load spend files versions"
      ),
      page.locator(locators.userMenu.adminConsole.dataController).click(),
    ],
    "click data controller"
  );

  // The company picker is a custom SearchableDropdown (not a native <select>),
  // so selectCompanyInDataController drives it and returns the per-company
  // /api/companies/{id}/spend_files_versions response.
  const dataSpenFileVersionsResponse = await selectCompanyInDataController(
    page,
    "Company_SF"
  );
  if (!dataSpenFileVersionsResponse) {
    throw new Error(
      "Could not load spend_files_versions for company 'Company_SF'"
    );
  }
  let spendFileData = await dataSpenFileVersionsResponse.json();
  logOperation("Spend file data retrieved", { count: spendFileData.length });
  
  let privateSpendFile = spendFileData.find(
    (spendFileNameItem: any) =>
      spendFileNameItem.spendFileName === "Pagero_Full_SpendFile-Private.xlsx",
  );

  let publicSpendFile = spendFileData.find(
    (spendFileNameItem: any) =>
      spendFileNameItem.spendFileName === "Pagero_Full_SpendFile-Public.xlsx",
  );

  logOperation("Spend file visibility status", {
    privateSpendFile: privateSpendFile?.isPublic,
    publicSpendFile: publicSpendFile?.isPublic,
  });

  if (privateSpendFile?.isPublic) {
    logOperation("Changing private spend file to private status");
    await page.locator("a#isPublic-true").last().click();
    await safePromiseAll(
      [
        waitForApiResponse(
          page,
          "/api/spend_file_versions",
          10000,
          "update spend file visibility"
        ),
        page.locator(".btn.btn-primary.font-md:has-text('Confirm')").click(),
      ],
      "confirm visibility change"
    );
  }

  // Now login as an external user
  logOperation("Logging out and logging in as external user");
  const logoutLocatorSvg = page.locator('.text-right > svg.icon-svg__button-24');
  await logoutLocatorSvg.click();
  

  const [data] = await safePromiseAll(
    [
      waitForApiResponse(
        page,
        "/api/users/",
        15000,
        "get user data after login"
      ),
      loginByUser(
        page,
        process.env.E2E_AUTH_USERNAME_SF_1!,
        process.env.E2E_AUTH_PASSWORD_SF_1!
      ),
    ],
    "login as external user"
  );

  // Wait for page to be ready after login
  await ensurePageActive(page);

  const dataResult = await data.json();
  const availableSpendFiles = dataResult.activeCompany?.spendFileVersions || [];
  
  logOperation("Available spend files count", {
    count: availableSpendFiles.length,
    spendFiles: availableSpendFiles.map((sf: any) => ({
      name: sf.spendFileName,
      isPublic: sf.isPublic,
    })),
  });
  
  // Verify that all available spend files are public
  const allFilesArePublic = availableSpendFiles.every((sf: any) => sf.isPublic === true);
  expect(allFilesArePublic).toBeTruthy();
  
  // Verify that the private spend file is NOT in the list
  const privateFileFound = availableSpendFiles.some(
    (sf: any) => sf.spendFileName === "Pagero_Full_SpendFile-Private.xlsx"
  );
  expect(privateFileFound).toBeFalsy();
  
  // Verify that there is at least one public file available
  expect(availableSpendFiles.length).toBeGreaterThan(0);
  
  logOperation("Test completed successfully - Private file is hidden, all visible files are public");
});

test.afterEach(async ({ page }) => {
  console.log("***Finishing test***");
  await ensureDefaultLogin(page);
});
