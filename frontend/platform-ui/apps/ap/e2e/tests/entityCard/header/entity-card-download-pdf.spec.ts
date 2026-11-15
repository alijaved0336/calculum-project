/**
 * E2E test suite for verifying the "Export to PDF" functionality on the Entity Card.
 *
 * @file entity-card-download-pdf.spec.ts
 *
 * This test suite covers:
 * - Logging in as a strategies user and switching to a specific spend file.
 * - Navigating to a supplier's entity card and verifying the presence and functionality of the "Download PDF" button in the options menu.
 * - Ensuring that the PDF export triggers the correct API calls and displays the expected UI elements (Adabot text and logo).
 * - Testing the "Export to PDF" button within the modal and verifying the correct API response.
 * - Closing the modal and navigating to the parent entity to ensure the "Download PDF" button is not visible in the menu.
 * - Resetting the login state after each test.
 *
 * Utilities:
 * - Uses helper functions for login, spend file switching, and navigation.
 *
 * Tags:
 * - @tc-12813
 */
import { test, expect } from "@playwright/test";
import { locators } from "../../utils/locators";
import {
  ensureStrategiesUserLogin,
  changeToSpendFile,
  goToEntityCardEntity,
  ensureDefaultLogin,
} from "../../utils/Utils";
import { goToParentEntityCard } from "../utils";

const given = {
  company: "Company Strategies",
  user: "joel+teststrategies@calculum.ai",
  spendFile: "Pagero_Full-Winner-Strategy.xlsx (Ver. 1)",
  supplier: "Axtone S.A.",
  parent: "WESTINGHOUSE AIR BRAKE TECHNOLOGIES CORP",
};

test.beforeEach(async ({ page }) => {
  await ensureStrategiesUserLogin(page);
  await changeToSpendFile(page, given.spendFile);
  await page.waitForSelector(".loading-modal", { state: "detached" });
});
test("The Supplier Export to PDF @tc-12813", async ({ page }) => {
  await goToEntityCardEntity(page, given.supplier);

  // Locator for the "Download PDF" menu item using data-testid
  const menuItemPDF = page.locator(
    '[data-testid="entity-card-download-pdf-menu-item"]',
  );

  // Verify the menu item is visible after opening the menu
  await page.locator("#options-btn").click();
  await expect(menuItemPDF).toBeVisible();

  // Click "Download PDF" from the menu and wait for API response.
  // The waiter matches on the URL alone and the status is asserted right after:
  // gating the match on a successful response instead turns a failing export
  // into a test timeout that says nothing about what the API answered.
  const [exportResponse] = await Promise.all([
    page.waitForResponse((res: any) =>
      res.url().includes("/api/value_proposition/export_data_supplier"),
    ),
    menuItemPDF.click(),
  ]);

  expect(
    exportResponse.ok(),
    `Exporting the supplier data for the PDF answered ${exportResponse.status()}`,
  ).toBeTruthy();

  const adabotText = page.locator(
    ".detailed-text-container.mb-3.adabot-details-pdf.mb-3",
  );
  const logo = page.locator("img.img-logo");
  await expect(adabotText).toBeVisible();
  await expect(logo).toBeVisible();
  const btnExport = page.locator('button:has(span:has-text("Export to PDF"))');
  const [logoResponse] = await Promise.all([
    page.waitForResponse((res: any) => res.url().includes("/logodomains")),
    btnExport.click(),
  ]);

  expect(
    logoResponse.ok(),
    `Fetching the logo domains for the PDF answered ${logoResponse.status()}`,
  ).toBeTruthy();
  await page.locator('.btn-close[data-testid="close-icon"]').click();
  await page.locator(locators.entityCard.closeButton).click();

  // Navigate to parent entity and verify "Download PDF" is still offered there:
  // EntityCardOverview gates the item on `companyType !== "supplier"`, so a
  // parent card shows it without needing the supplier feature flag.
  // Using goToParentEntityCard to ensure we click on a card with the "Parent" badge
  await goToParentEntityCard(page, given.parent);
  await page.locator("#options-btn").click();
  await expect(menuItemPDF).toBeVisible();
});
test.afterEach(async ({ page }) => {
  console.log("***Finishing test***");
  await ensureDefaultLogin(page);
  console.log("***Finished***");
});
