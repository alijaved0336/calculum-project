/**
 * @fileoverview
 * E2E tests for verifying the display of the Potential Entities view in the Entity Card.
 *
 * Main Flows:
 * 1. Ensure the user is logged in with default credentials.
 * 2. Change to the spend file "Pagero_PotentialSuppliers_SpendLevelColumns_CorporateTree.xlsx (Ver. 1)".
 * 3. Navigate to the Entity Card section.
 * 4. Select the Potential Suppliers main tab.
 * 5. Assert that the Potential Entity cards are displayed correctly.
 *
 * Acceptance Criteria:
 * - The test waits for the necessary navigation and spend file change to complete.
 * - The Potential Entities view is selectable and loads successfully.
 * - The Potential Entity cards are displayed in the UI.
 * - The test passes if all assertions are met and the UI displays the correct Potential Entity cards data.
 */

import { test, expect } from "@playwright/test";
import {
  changeToSpendFile,
  ensureDefaultLogin,
  loginAsSuperAdmin,
} from "../utils/Utils";
import { locators } from "../utils/locators";
import { GlobalFiltersUtils } from "../utils";
import {
  enablePotentialSuppliersFeature,
  potentialSuppliersTab,
} from "./utils/potentialSuppliers";

const spendFileName =
  "Pagero_PotentialSuppliers_SpendLevelColumns_CorporateTree.xlsx (Ver. 1)";


test.beforeEach(async ({ page }) => {
  // The Potential Suppliers main tab only renders when the potential-suppliers
  // feature is enabled for the company, so enable it as super admin first.
  await loginAsSuperAdmin(page);
  await enablePotentialSuppliersFeature(page);
  await ensureDefaultLogin(page);
  await changeToSpendFile(page, spendFileName);
});

test.afterEach(async ({ page }) => {
  await ensureDefaultLogin(page);
});

test("Select the Potential Entities view and see the cards @us-6520 @tc-6844 @entity @integrated @flakyResolved", async ({
  page,
}) => {
  await GlobalFiltersUtils.clearAllFiltersFromNavbar(page);
  console.log("go to entities page");
  await Promise.all([
    page.waitForResponse(
      (res: any) =>
        res.url().includes("/api/entity-card/get-entity-cards") && res.ok(),
    ),
    page.waitForResponse(
      (res: any) =>
        res.url().includes("/api/entity-card/get-recent-entity-cards") &&
        res.ok(),
    ),
    page.locator(locators.sidebar.entities).click(),
  ]);

  console.log("now select the potential entities");
  // The Potential view moved from the header dropdown to a main tab, rendered
  // only when the potential-supplier feature is on for the company.
  const potentialTab = potentialSuppliersTab(page);
  await expect(potentialTab).toBeVisible();
  let [potentialCardsData] = await Promise.all([
    page.waitForResponse(
      (res: any) =>
        res.url().includes("/api/entity-card/get-entity-cards") && res.ok(),
    ),
    potentialTab.click(),
  ]);

  let potentialCards = await potentialCardsData.json();
  let hasPotetialSuppliers = false;
  potentialCards.forEach((item: any) => {
    if (item.companyType === "potential-supplier") {
      hasPotetialSuppliers = true;
    }
  });

  let potentialCardCount = await page
    .locator(".type-company.potential-supplier-type")
    .count();
  if (hasPotetialSuppliers) {
    expect(potentialCardCount).toBeGreaterThan(0);
  } else {
    expect(potentialCardCount).toBe(0);
  }
});
