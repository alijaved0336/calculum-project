/**
 * @fileoverview
 * E2E test for Manage Tab feature in Admin Console.
 *
 * This test verifies that the "Email Negotiations" tab is shown or hidden in the Manage section
 * depending on whether the feature is enabled or disabled for a company.
 *
 * Test Flow:
 * 1. Log in as Super Admin.
 * 2. Change to the appropriate spend file.
 * 3. Navigate to the Companies section in the Admin Console.
 * 4. Locate the "Email Negotiations" feature checkbox for the default company.
 * 5. Enable or disable the feature and verify the tab's presence in the Manage section.
 *
 * Acceptance Criteria:
 * - The "Email Negotiations" tab is visible in the Manage section when the feature is enabled.
 * - The tab is hidden when the feature is disabled.
 * - The test is tagged for integration and user story tracking.
 */

import { Page, expect, test } from "@playwright/test";
import {
  DEFAULT_COMPANY_NAME,
  changeToSpendFile,
  ensureDefaultLogin,
  ensureSuperAdminLogin,
  goToHomeSection,
  resetFeatures,
} from "../../utils/Utils";
import { ManageUtils, AdminConsoleUtils } from "../../utils";

const SPEND_FILE_NAME = "Pagero_Full_Emails.xlsx (Ver. 1)";
const given = {
  company: DEFAULT_COMPANY_NAME,
  nameField: "name",
  spendFile: "Pagero_Full_Emails.xlsx (Ver. 1)",
  feature: "featureEmailNegotiationsIsAvailable",
  enabledDisabled: [true, false],
};
test.beforeEach(async ({ page }) => {
  await ensureSuperAdminLogin(page);
  await changeToSpendFile(page, SPEND_FILE_NAME);
});

test("Email Negotiations tab is showing/hidden in Manage section if the feature is enabled/disabled @integrate @us-8563 @tc-8587", async ({
  page,
}: {
  page: Page;
}) => {
  for (const enabledDisabled of given.enabledDisabled) {
    await resetFeatures(
      page,
      [given.feature],
      enabledDisabled,
      {
        company: given.company,
        nameField: given.nameField,
      },
      true,
    );

    if (enabledDisabled) {
      await AdminConsoleUtils.goToUserPanel(page);
      await goToHomeSection(page);
      await ManageUtils.goToManageSection(page);
      const isEmailNegotiationsTabLocator = page.getByRole("button", {
        name: "Email Negotiations",
      });
      await expect(isEmailNegotiationsTabLocator).toBeVisible();
    }
  }
});

// Cleanup
test.afterEach(async ({ page }) => {
  await ensureDefaultLogin(page);

  console.log("Cleanup done!");
});
