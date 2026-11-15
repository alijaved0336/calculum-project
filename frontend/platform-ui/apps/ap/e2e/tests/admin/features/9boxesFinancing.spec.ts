/**
 * @fileoverview
 * E2E test for 9 Boxes Financing feature flag in Admin Console.
 *
 * This test verifies that the 9 Boxes Financing feature can be enabled and disabled
 * for a company in the Admin Console UI, and that the feature's checkbox reflects
 * the correct state.
 *
 * Test Flow:
 * 1. Log in as Super Admin before each test.
 * 2. Change to the appropriate spend file.
 * 3. Navigate to the Companies section in the Admin Console.
 * 4. Locate the 9 Boxes Financing feature checkbox for the default company.
 * 5. If the feature is not enabled, enable it and verify.
 * 6. If the feature is enabled, disable it and verify.
 * 7. After each test, ensure the default login state.
 *
 * Acceptance Criteria:
 * - The 9 Boxes Financing feature can be enabled and disabled for a company.
 * - The checkbox reflects the correct state after each action.
 * - The test is tagged for integration and user story tracking.
 */

import { test } from "@playwright/test";
// Utils
import {
  changeToSpendFile,
  ensureDefaultLogin,
  loginAsSuperAdmin,
  resetFeatures,
} from "../../utils/Utils";

const spendFileName = "Pagero_Full_Emails.xlsx (Ver. 1)";
const features = {
  feature9BoxesFinancing: "feature9BoxesFinancing",
};
const given = {
  company: "Company Strategies",
  nameField: "name",
};
test.beforeEach(async ({ page }) => {
  await loginAsSuperAdmin(page);
  await changeToSpendFile(page, spendFileName);
  await page.waitForSelector(".loading-modal", { state: "detached" });
});

test.afterEach(async ({ page }) => {
  await ensureDefaultLogin(page);
});

test("9 boxes financing feature is enabled/disabled @flakyResolved @integrate @us-8560", async ({
  page,
}) => {
  await resetFeatures(
    page,
    [features.feature9BoxesFinancing],
    true,
    given,
    true,
  );
  await page.goto("/");
});
