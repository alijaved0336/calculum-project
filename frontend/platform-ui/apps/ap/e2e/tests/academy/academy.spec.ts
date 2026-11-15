/**
 * @fileoverview
 * End-to-end tests for the Academy feature in the application.
 *
 * This test suite verifies that a user can access the Academy section through the "Releases" link
 * in the user settings menu. It uses Playwright for browser automation.
 *
 * Test tags:
 * - @integrated
 * - @us-7284
 * - @tc-7403
 *
 * Test flow:
 * 1. Log in as the default user before each test.
 * 2. Navigate to the home page and wait for loading to complete.
 * 3. Open the user settings via the header.
 * 4. Click the "Releases" link.
 * 5. Ensure a new page opens and loads the Academy releases URL.
 * 6. After each test, log in again as the default user to reset state.
 */

import { expect, test } from "@playwright/test";
import { ensureDefaultLogin } from "../utils/Utils";
import {
  safeOperation,
  logOperation,
  ensurePageActive,
  waitForElementVisible,
  safePromiseAll,
} from "../utils/PlaywrightTestHelpers";

test.beforeEach(async ({ page }) => {
  await safeOperation(page, async () => {
    await ensurePageActive(page);
    logOperation("Logging in as default user");
    await ensureDefaultLogin(page);
  }, "Default login");
});

test("user can access the academy through the releases section of the user settings @integrated @us-7284 @tc-7403", async ({
  page,
  context,
}) => {
  await safeOperation(page, async () => {
    await ensurePageActive(page);
    logOperation("Opening user settings menu");
    const settingsButton = await waitForElementVisible(
      page,
      'header button:has-text("Settings")',
      5000,
      "Settings button visibility"
    );
    await settingsButton.click();
  }, "Open settings menu");

  await safeOperation(page, async () => {
    await ensurePageActive(page);
    logOperation("Waiting for Academy/Releases button to be visible");
    const academyReleasesButton = await waitForElementVisible(
      page,
      "svg#training-icon",
      5000,
      "Academy releases button visibility"
    );

    logOperation("Clicking Academy/Releases button and waiting for new page");
    const [newPage] = await safePromiseAll(
      [
        context.waitForEvent("page", { timeout: 15000 }),
        academyReleasesButton.click(),
      ],
      "Open Academy in new tab"
    );

    logOperation("New page opened, waiting for it to load completely");
    await newPage.waitForLoadState("networkidle", { timeout: 30000 });
    await newPage.waitForLoadState("domcontentloaded", { timeout: 30000 });

    logOperation("Verifying Academy URL");
    await expect(newPage).toHaveURL(/.*\/academy.hello-ada.com/, { timeout: 10000 });
    
    logOperation("Academy page loaded successfully");
  }, "Open Academy and verify URL");
});

test.afterEach(async ({ page }) => {
  await safeOperation(page, async () => {
    await ensurePageActive(page);
    logOperation("Restoring default login after test");
    await ensureDefaultLogin(page);
  }, "Restore default login");
});
