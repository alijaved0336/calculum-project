/**
 * @fileoverview
 * E2E test for showing recalculation date after spend file recalculation in Admin Console.
 *
 * This test verifies that when a spend file is recalculated, the recalculation date is displayed correctly in the UI.
 *
 * Test Flow:
 * 1. Log in as Super Admin before each test.
 * 2. Trigger recalculation of a specific spend file version via API.
 * 3. Wait for the recalculation to complete.
 * 4. Navigate to the Data Controller section in the Admin Console.
 * 5. Verify that the recalculation date is shown and matches the current date.
 *
 * Acceptance Criteria:
 * - Super admin can access the Data Controller section.
 * - After recalculation, the recalculation date is displayed in the UI.
 * - The recalculation date matches the expected date.
 * - The test is tagged for admin, UI, API, and heavy test tracking.
 */


import { expect, test } from "@playwright/test";
import {
  ensureDefaultLogin,
  loginAsSuperAdmin,
  changeToCompany,
  getCurrentDateSubDays,
  goToHomeSection,
} from "../utils/Utils";
import { locators } from "../utils/locators";

const companyName = "Company_SF";
const spendFileVersionName = "Pagero_Full_SpendFile-Public.xlsx";

let api: Api2 | null = null;

const spendFileUuid = "7abe4823-174a-4060-993c-90c4088ac276";

const currentDate = getCurrentDateSubDays(0);

import Api2 from "../utils/APi2";

test.beforeEach(async ({ page }) => {
  await loginAsSuperAdmin(page);
  await page.goto("/");
});

test("Show recalculation date when the spend file is recalculated @api @ui @admin @heavy", async ({
  page,
}) => {
  api = await Api2.getInstance(page);

  const urlRecalculate = `/api/analyze/spend-file-version/${spendFileUuid}/recalculate`;

  const response = await api.doPost(urlRecalculate, {});
  console.log(await response.text());

  expect(response.ok()).toBeTruthy();

  await api.waitSpendFileReady(spendFileUuid);

  await goToHomeSection(page);

  await page.locator(locators.headerMenu.topMenu.dropDownMenu).click();
  await page.locator(locators.headerMenu.topMenu.adminConsole).click();

  await page.locator(locators.userMenu.adminConsole.dataController).click();

  await Promise.all([
    page.waitForResponse(
      (response) => response.url().endsWith("api/companies") && response.ok(),
    ),
    page.locator(locators.userMenu.adminConsole.data.uploadData).click(),
  ]);
  await page.waitForTimeout(5000);

  await page.locator(locators.navbar.companyDropdown.container).click();

  // Wait for dropdown options to be visible
  await page.waitForSelector(locators.navbar.companyDropdown.options, {
    state: "visible",
    timeout: 10000,
  });

  // Find the option with the specified company name. The click must be inside
  // the Promise.all so the waitForResponse is registered before the request
  // fires — otherwise the per-company /spend_files_versions response can land
  // before the waiter is attached and the test hangs until timeout.
  const companyOption = page
    .locator(locators.navbar.companyDropdown.item)
    .filter({
      has: page.locator(`span:has-text("${companyName}")`),
    });

  let [dataSpenFileVersionsResponse] = await Promise.all([
    page.waitForResponse(
      (response) =>
        response.url().endsWith("/spend_files_versions") && response.ok(),
    ),
    companyOption.click(),
  ]);
  console.log("selected company: " + companyName);
  await page.waitForTimeout(5000);

  let spendFileData = JSON.parse(await dataSpenFileVersionsResponse.text());
  let publicSpendFile = spendFileData.find(
    (spendFileNameItem: any) =>
      spendFileNameItem.spendFileName === spendFileVersionName,
  );
  let date = publicSpendFile.recalculationDate.split(" ")[0];

  expect(currentDate).toBe(date);
});

test.afterEach(async ({ page }) => {
  await changeToCompany(page, "Company Test");
  await page.waitForSelector(".loading-modal", { state: "detached" });
  await ensureDefaultLogin(page);
});
