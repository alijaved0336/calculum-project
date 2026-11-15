/**
 * @fileoverview
 * E2E test for Clusters Grid feature in Admin Console.
 *
 * This test verifies that the Clusters Grid is displayed correctly in the Admin Console UI.
 *
 * Test Flow:
 * 1. Log in as Super Admin before each test.
 * 2. Navigate to the home section.
 * 3. Open the Admin Console from the top menu.
 * 4. Go to the Clusters section.
 * 5. Wait for the necessary API responses.
 * 6. Verify that the cluster grid container is present.
 * 7. Check that the first row cell contains the expected text.
 * 8. After each test, ensure the default login state.
 *
 * Acceptance Criteria:
 * - The Clusters Grid is visible in the Admin Console.
 * - The first row of the grid contains the expected cluster identifier.
 * - The test is tagged for admin, integration, and user story tracking.
 */


import { test, expect } from "@playwright/test";
import {
  ensureDefaultLogin,
  loginAsSuperAdmin,
  goToHomeSection,
} from "../../utils/Utils";
import { locators } from "../../utils/locators";

const numberOfCompanies = 4;
const numberOfYears = 5;

test.beforeEach(async ({ page }) => {
  await loginAsSuperAdmin(page);
});

test("Admin > Features > Clusters Grid @admin @integrated @us-9225", async ({
  page,
}) => {
  await goToHomeSection(page);

  await page.locator(locators.headerMenu.topMenu.dropDownMenu).click();
  await page.locator(locators.headerMenu.topMenu.adminConsole).click();

  await Promise.all([
    page.waitForResponse(
      (response) =>
        response.url().includes("/api/platform_settings/1") && response.ok(),
    ),
    page.waitForResponse(
      (response) => response.url().includes("/api/graphql") && response.ok(),
    ),
    page.locator(locators.userMenu.adminConsole.clusterController).click(),
  ]);

  const clusterGrid = page.locator("#cluster-grid-container");
  await expect(clusterGrid).toHaveCount(1);

  // First column of the first data row is "Cluster Type". Located by grid
  // structure rather than by the cell's styling classes, which the shared
  // TooltipText cell changes independently of this feature.
  const firstClusterTypeCell = clusterGrid
    .locator("tr.k-master-row")
    .first()
    .locator("td")
    .first();
  await expect(firstClusterTypeCell).toContainText("1 - ");
});

test.afterEach(async ({ page }) => {
  await ensureDefaultLogin(page);
});
