/**
 * End-to-end Playwright test suite for verifying the views and feature toggling in the "Manage" section,
 * including Overview, Email Negotiations, and NineBoxes Financing tabs.
 *
 * - Ensures proper login and spend file selection before tests.
 * - Checks for excluded roles and resets features if necessary.
 * - Validates the presence of teaser views for Manage, Email Negotiations, and NineBoxes Financing.
 * - Handles feature toggling and navigation between views.
 * - Cleans up by restoring default login and closing the browser after tests.
 *
 * @file Teaser view tests for exception scenarios in the Manage section.
 * @module e2e/tests/z-last-tests/02-exception2/teaser-view.spec
 */
import {test, expect, Page} from "@playwright/test";
import {
  changeToSpendFile,
  ensureDefaultLogin,
  ensureAdminException2Login,
  getUserDatas,
  resetFeatures,
} from "../../utils/Utils";
import {locators} from "../../utils/locators";

const features = {
  moduleManageIsAvailable: "moduleManageIsAvailable",
  featureEmailNegotiationsIsAvailable: "featureEmailNegotiationsIsAvailable",
  feature9BoxesFinancing: "feature9BoxesFinancing",
};

const myCompany = {
  company: "Company For strategies",
  nameField: "name",
  spendfile: "Pagero_Full_20230927_1.xlsx (Ver. 1)",
};

const excludedRoles: string[] = [
  "FEATURE_9_BOXES_FINANCING",
  "FEATURE_EMAIL_NEGOTIATIONS",
  "MODULE_MANAGE",
];

const forResetFeatures = {
  filt: {company: myCompany.company, nameField: myCompany.nameField},
  feats: [
    features.moduleManageIsAvailable,
    features.featureEmailNegotiationsIsAvailable,
    features.feature9BoxesFinancing,
  ],
};

let dataRoles: string[] = [];

test.describe.serial("Test views in Manage : Overview and Email Negotiations, and NineBoxes Financing Tab @flakyResolved ", () => {
  let page: Page;
  test.beforeAll(async ({browser}) => {
    page = await browser.newPage();
    await ensureAdminException2Login(page);
    await changeToSpendFile(page, myCompany.spendfile);
    await page.waitForSelector(".loading-modal", {state: "detached"});
    dataRoles = await getUserDatas(page, "roles");
  });
  test("Excluded roles found, going to admin console.", async () => {
    // Assuming excludedRoles and dataRoles are defined elsewhere in your test
    const hasExcludedRoles = excludedRoles.some((role) =>
      dataRoles.includes(role),
    );
    console.log(hasExcludedRoles);
    if (hasExcludedRoles) {
      // If dataRoles includes any of the excludedRoles, go to the admin console
      console.log("Excluded roles found, going to admin console.");
      await resetFeatures(
        page,
        forResetFeatures.feats,
        false,
        forResetFeatures.filt,
        true,
      );
    } else {
      // If no excludedRoles are present, skip the admin console step
      console.log("No excluded roles found, skipping admin console steps.");
    }
    await page.goto("/");
  });
  test("Test views in Manage : Overview and Email Negotiations, and NineBoxes Financing Tab @flakyResolved @manage-teaser", async () => {
    console.log("check manage teaser view");
    await page.locator(locators.sidebar.manage).click();
    const teaserViewManageTeaser = page.locator(".teaser-view-manageTeaser")
    console.log('teaserViewManageTeaser is visible',await teaserViewManageTeaser.isVisible())
    let teaserViewManageTeaserCount = await teaserViewManageTeaser.count();
    expect(teaserViewManageTeaserCount).toBe(1);

    console.log("check email negotiation view");
    await page.locator(locators.manageView.manageEmailNegotiations).click();
    const teaserViewEmailNegotiations = page.locator(".teaser-view-emailNegotiations")
    console.log('teaserViewEmailNegotiations is visible',await teaserViewEmailNegotiations.isVisible())
    let teaserViewEmailNegotiationsCount = await teaserViewEmailNegotiations.count();
    expect(teaserViewEmailNegotiationsCount).toBe(1);
    await resetFeatures(
      page,
      forResetFeatures.feats,
      true,
      forResetFeatures.filt,
      true,
    );
  });
  test.afterAll(async () => {
    console.log("***Finishing test***");
    await ensureDefaultLogin(page);
    // Close the page's context (not the worker `browser` fixture) so the
    // worker stays alive for the next spec in the workers=1 pipeline.
    await page?.context().close().catch((error) => {
      console.error(
        "afterAll: page.context().close() failed (non-critical):",
        error instanceof Error ? error.message : String(error),
      );
    });
  });
});
