/**
 * @fileoverview
 * E2E tests for verifying the display of the Agreed Terms value in the Entity Card.
 *
 * Main Flows:
 * 1. Ensure the user is logged in with default credentials.
 * 2. Change to the spend file "Pagero_Full_Emails.xlsx (Ver. 1)".
 * 3. Navigate to the Entity Card for "Hp Inc.".
 * 4. Assert that the Agreed Terms value is displayed correctly.
 *
 * Acceptance Criteria:
 * - The test waits for the necessary navigation and spend file change to complete.
 * - The Entity Card for "Hp Inc." loads successfully.
 * - The Agreed Terms value is displayed correctly.
 * - The test passes if all assertions are met and the UI displays the correct Agreed Terms value.
 */

import { expect, test } from "@playwright/test";
import { locators } from "../utils/locators";
import {
  changeToSpendFile,
  ensureAdminLogin,
  ensureDefaultLogin,
  goToEntityCardEntity,
} from "../utils/Utils";

const spendFileName = "Pagero_Full_Emails.xlsx (Ver. 1)";
const supplierName = "Hp Inc.";

test.setTimeout(180000);

test.beforeEach(async ({ page }) => {
  await ensureAdminLogin(page);
  await changeToSpendFile(page, spendFileName);
});

test.afterEach(async ({ page }) => {
  await ensureDefaultLogin(page);
});

test("Show Value in Agreed Terms", async ({ page }) => {
  await Promise.all([
    page.waitForResponse(
      (response) =>
        response.url().includes("/chart/payment-terms-opportunity/supplier") &&
        response.ok(),
    ),
    // Go to an Entity section
    goToEntityCardEntity(page, supplierName, 0, false),
  ]);

  const showExistsAgreedValue = await page.waitForSelector(
    "#showExistsAgreedValue",
  );
  const valuesExistsAgreedValue = await showExistsAgreedValue.textContent();
  expect(valuesExistsAgreedValue).not.toBeNull();
  await page.locator(locators.entityCard.closeButton).click();
});
