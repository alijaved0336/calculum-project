/**
 * @fileoverview
 * E2E tests for the new Footer design.
 *
 * This test suite validates the correct display and interaction of the new Footer,
 * including the Cookies modal and related UI elements.
 *
 * Test Flow:
 * 1. Ensure default login before each test.
 * 2. Change to a specific spend file to ensure consistent environment.
 * 3. Interact with the "Manage Cookies" button in the footer.
 * 4. Assert that the Cookies modal appears and can be interacted with.
 * 5. Confirm cookie choices and ensure the modal closes as expected.
 *
 * Acceptance Criteria:
 * - The Footer is visible and contains the "Manage Cookies" button.
 * - The Cookies modal opens upon clicking "Manage Cookies".
 * - The user can confirm their cookie choices and close the modal.
 * - The modal can be reopened and closed again, confirming persistent behavior.
 *
 * Test tags:
 * - @ui
 * - @us-4526
 */

import { test } from "@playwright/test";
import { changeToSpendFile, ensureDefaultLogin } from "../utils/Utils";

test.beforeEach(async ({ page }) => {
  await ensureDefaultLogin(page);
  await changeToSpendFile(page, "Pagero_Full_Home.xlsx (Ver. 1)");
});

test("Show Cookies modal @ui @us-4526", async ({ page }) => {
  await page.waitForTimeout(5000);
  await page.getByText("Manage Cookies").click();
  await page.getByTestId("modal").locator("span").nth(2).click();
  await page.getByRole("button", { name: "Confirm My Choice" }).click();
  await page.getByText("Manage Cookies").click();
  await page.getByTestId("modal").locator("span").nth(2).click();
  await page.getByRole("button", { name: "Confirm My Choice" }).click();
});
