/**
 * @fileoverview
 * E2E test for SME Feature flag in Admin Console.
 *
 * This test verifies that the SME (Small and Medium-sized Enterprises) feature flag
 * can be enabled and disabled, and that the SME badge is displayed or hidden accordingly
 * for suppliers/entities in the Admin Console UI.
 *
 * Test Flow:
 * 1. Log in as Super Admin before each test.
 * 2. Change to the appropriate spend file containing SME data.
 * 3. Navigate to the relevant section (e.g., supplier/entity list).
 * 4. Enable or disable the SME feature flag.
 * 5. For each test entity, verify that the SME badge is shown or hidden according to the flag status.
 * 6. After each test, ensure the default login state.
 *
 * Acceptance Criteria:
 * - The SME badge is visible for entities marked as SME when the feature is enabled.
 * - The SME badge is not visible for any entity when the feature is disabled.
 * - The test is tagged for admin and SME feature tracking.
 */

import { test, expect, Page } from "@playwright/test";
import { locators } from "../../../utils/locators";
import {
  changeToSpendFile,
  ensureDefaultLogin,
  goToEntityCardEntityExactFull,
  ensureSuperAdminLogin,
  resetFeatures,
} from "../../../utils/Utils";
import {
  waitForElementVisible,
  safeOperation,
  logOperation,
  ensurePageActive,
} from "../../../utils/PlaywrightTestHelpers";

const spendFile = "Pagero_Full_SME.xlsx (Ver. 1)";
const features = {
  featureSME: "featureSME",
};

const given = {
  company: "Company Test",
  nameField: "name",
  entity: "3A Composites Mobility S.A.",
};

test.beforeEach(async ({ page }) => {
  await ensureSuperAdminLogin(page);
  await changeToSpendFile(page, spendFile);
});

test("TC10232 - The SME feature can be enabled and disabled @tc-10232", async ({
  page,
}) => {
  logOperation("Starting TC10232 - SME feature enable/disable test");
  
  await safeOperation(
    page,
    async () => {
      await resetFeatures(page, [features.featureSME], true, given, true);
    },
    "Reset features to initial state"
  );
  
  await safeOperation(
    page,
    async () => {
      await page.goto("/");
    },
    "Navigate to home page"
  );
  
  // Test: Disable feature and verify badge is NOT visible
  logOperation("Testing SME badge visibility when feature is disabled");
  await enableDisbale(page, false);

  // Test: Enable feature and verify badge IS visible
  logOperation("Testing SME badge visibility when feature is enabled");
  await enableDisbale(page, true);
  
  await safeOperation(
    page,
    async () => {
      await resetFeatures(page, [features.featureSME], true, given, true);
    },
    "Reset features to final state"
  );
  
  logOperation("TC10232 test completed successfully");
});
test.afterEach(async ({ page }) => {
  logOperation("Finishing test - resetting to default login");
  await safeOperation(
    page,
    async () => {
      await ensureDefaultLogin(page);
    },
    "Ensure default login state"
  );
});

/**
 * Enables or disables the SME feature and verifies badge visibility.
 * @param {Page} page - The page to interact with.
 * @param {boolean} enable - If true, the feature will be enabled (badge should be visible).
 * @returns {Promise<void>} - A promise that resolves when the feature is enabled or disabled.
 */
async function enableDisbale(page: Page, enable: boolean) {
  await ensurePageActive(page);
  
  logOperation(`enableDisable - ${enable ? "Enabling" : "Disabling"} SME feature`, {
    entity: given.entity,
  });

  // First, change the feature state
  await safeOperation(
    page,
    async () => {
      await resetFeatures(page, [features.featureSME], enable, given, true);
    },
    `${enable ? "Enable" : "Disable"} SME feature`
  );

  // Navigate to entity card. The helper awaits the entity's /detail response internally.
  await safeOperation(
    page,
    async () => {
      await goToEntityCardEntityExactFull(page, given.entity);
    },
    "Navigate to entity card"
  );

  // Check badge visibility after API response is received
  const badgeSMEIncluded = await safeOperation(
    page,
    async () => {
      const badgeSMEIncludedLocator = page.locator(".sme-badge-icon");
      const count = await badgeSMEIncludedLocator.count();
      if (count === 0) {
        return false;
      }
      return await badgeSMEIncludedLocator.first().isVisible({ timeout: 8000 });
    },
    "Check SME badge visibility"
  );

  logOperation("SME badge visibility check", {
    visible: badgeSMEIncluded,
    expected: enable, // When feature is enabled, badge should be visible
  });

  // According to Acceptance Criteria:
  // - Badge is visible when feature is enabled
  // - Badge is not visible when feature is disabled
  if (enable) {
    expect(badgeSMEIncluded).toBeTruthy();
  } else {
    expect(badgeSMEIncluded).toBeFalsy();
  }

  // Close the modal using safe operation
  await safeOperation(
    page,
    async () => {
      const closeButton = await waitForElementVisible(
        page,
        locators.entityCard.closeButton,
        5000,
        "Entity modal close button"
      );
      await closeButton.click();
    },
    "Close entity modal"
  );

  logOperation("Entity modal closed successfully");
}
