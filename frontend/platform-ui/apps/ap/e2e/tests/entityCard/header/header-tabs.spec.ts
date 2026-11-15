/**
 * @fileoverview
 * E2E tests for Entity Card Header Tabs.
 *
 * This test suite validates that the header tabs in the entity card are displayed correctly
 * for different entity types (e.g., parent, supplier). It ensures that all expected tabs
 * are visible and that the "Opportunity" tab is active by default.
 *
 * Test Flow:
 * 1. Ensure default login before each test.
 * 2. Change to a specific spend file.
 * 3. Open the entity card for a given entity.
 * 4. Assert that all header tabs are visible.
 * 5. Assert that the "Opportunity" tab is active by default.
 *
 * Acceptance Criteria:
 * - All expected header tabs are visible for the entity.
 * - The "Opportunity" tab is active by default.
 * - The test is tagged for entity and UI validation.
 */


import { expect, test } from "@playwright/test";

// Global utils
import {
  changeToSpendFile,
  goToEntityCardEntity,
  ensureDefaultLogin,
  goToHomeSection,
} from "../../utils/Utils";

const spendFileName = "PageroFull_20230308_2.xlsx (Ver. 1)";

const testParams = [
  {
    entityType: "parent",
    entityName: "HITACHI LTD",
  },
  {
    entityType: "supplier",
    entityName: "Assa Abloy Limited",
  },
];

import Api2 from "../../utils/APi2";

test.beforeEach(async ({ page }) => {
  await ensureDefaultLogin(page);

  // Change spend file
  await changeToSpendFile(page, spendFileName);
});

// Iterate over each company
for (const { entityType, entityName } of testParams) {
  test(`${entityType} level - entity section header is showing properly @entity @ui`, async ({
    page,
  }) => {
    // Go to entity
    await goToEntityCardEntity(page, entityName);

    // Assert all header tabs are visible and Opportunity is active.
    // Use exact: true so the parent-level note banner's "(see corporate tree)"
    // link inside .container-top-sections does not collide with the Corporate Tree tab.

    // Opportunity
    await expect(
      page.locator(".container-top-sections").getByText("Opportunity", {
        exact: true,
      }),
    ).toBeVisible();

    await expect(
      page.locator(".container-top-sections").getByText("Opportunity", {
        exact: true,
      }),
    ).toHaveClass(/active/);

    // Corporate Tree
    await expect(
      page.locator(".container-top-sections").getByText("Corporate Tree", {
        exact: true,
      }),
    ).toBeVisible();

    // Company details (lowercase 'd' to match the i18n string)
    await expect(
      page.locator(".container-top-sections").getByText("Company details", {
        exact: true,
      }),
    ).toBeVisible();

    // Ratings & Metrics
    await expect(
      page.locator(".container-top-sections").getByText("Ratings & Metrics", {
        exact: true,
      }),
    ).toBeVisible();
  });
}
