/**
 * TC-9695 : The V-Card Enabling/Disabling works.
 */

import {test, expect, Page} from "@playwright/test";
import {
  ensureDefaultLogin,
  goToHomeSection,
  closeAdminConsole,
  getUserDatas,
  ensureCompany_SFSuperAdminLogin,
  resetFeatures
} from "../../utils/Utils";
import {locators} from "../../utils/locators";
import * as kendoChartRelated from "../../utils/kendoChartRelated";

const myCompany = {
  company: "Company_SF",
  nameField: "name",
};
const excludedRoles: string[] = ["FEATURE_VIRTUAL_CARD"];

const features = {
  featureVCardIsAvailable: "featureVCardIsAvailable",
};

let dataRoles: string[] = [];


test.beforeEach(async ({page}) => {
  await ensureCompany_SFSuperAdminLogin(page);
  dataRoles = await getUserDatas(page, 'roles');
});

test("TC-9695 : The V-Card Enabling/Disabling works. @flakyResolved @integrated @tc-9695 @vcard", async ({
                                                                                                           page,
                                                                                                         }) => {

  // Assuming excludedRoles and dataRoles are defined elsewhere in your test
  const hasExcludedRoles = excludedRoles.some((role) =>
    dataRoles.includes(role),
  );

  if (hasExcludedRoles) {
    // If dataRoles includes any of the excludedRoles, go to the admin console
    await resetFeatures(page, [features.featureVCardIsAvailable], true, myCompany, true);
    await goToHomeSection(page)
  }

  // go to settings page
  console.log('Go to setup')
  await Promise.all([
    page.waitForResponse((responseName) =>
      responseName.url().includes("/api/spendfile/strategies/allowed-status"),
    ),
    page.locator(locators.sidebar.settings).click(),
  ]);

  // go to vcard tab (ensure the tab has rendered before clicking to avoid a race
  // with the settings page still loading)
  await expect(page.locator(locators.settings.vCard.tab)).toBeVisible();
  let [data] = await Promise.all([
    page.waitForResponse(
      (response) => response.url().includes("/api/vcard/setup/") && response.ok(),
    ),
    page.locator(locators.settings.vCard.tab).click()
  ])

  let dataResult = await data.json();
  expect(dataResult.vCardGroupsEnabled).toBeTruthy();
});
test.afterEach(async ({page}) => {
  console.log("***Finishing test***");
  await ensureDefaultLogin(page);
});


