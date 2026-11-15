/**
 * @fileoverview
 * E2E test for verifying the display and correctness of the Tree Family Card in the Entity Card Overview.
 *
 * Main Flow:
 * 1. Ensure the user is logged in with default credentials.
 * 2. Navigate to the home page and wait for loading to complete.
 * 3. Change to the spend file "20221011_MATCH_OVERVIEW.xlsx (Ver. 5)".
 * 4. Open the Entity Card for "Microelettrica Scientifica S.P.A.".
 * 5. Change to the program "CF PROGRAM Excluded Micro Spend 3".
 * 6. Navigate to the Corporate Tree view.
 * 7. Wait for the tree to load.
 * 8. Assert the initial layout: one parent, its suppliers, and the Spend Lines level collapsed.
 * 9. Assert the parent and the selected supplier card data.
 * 10. Expand the selected supplier and assert its spend line cards.
 *
 * Acceptance Criteria:
 * - The test waits for the necessary navigation and spend file change to complete.
 * - The Entity Card for "Microelettrica Scientifica S.P.A." loads successfully.
 * - The Corporate Tree loads with the parent expanded, every supplier card visible and every
 *   supplier collapsed, so no spend line card is rendered until the user expands one.
 * - The expected values for parent name, spend, and other key data points are visible in the tree family card.
 * - Clicking the "+" button on the right of the selected supplier card expands it and renders its
 *   spend line cards with the expected values.
 * - The test passes if all assertions are met and the UI displays the correct data.
 */

import { test, expect, Locator } from "@playwright/test";
import {
  changeToSpendFile,
  goToEntityCardEntity,
  ensureDefaultLogin,
  goToCorporateTree,
} from "./../../utils/Utils";
import { ProgramUtils } from "../../utils";
import {
  logOperation,
  safeOperation,
  ensurePageActive,
} from "../../utils/PlaywrightTestHelpers";

/**
 * Expected test data values for tree family card assertions.
 * Contains expected values for parent company, supplier, and spend cards.
 *
 * Cash flow values are indicative only: they are time-value-of-money figures that move with the
 * current date, so they are checked by shape and never by exact value.
 */
const given = {
  parent: {
    name: "Knorr-Bremse AG",
    volume: "3.3m",
    contractualPT: "66d",
    proposedPT: "90d",
    cashFlow: "406.4k",
  },
  supplier: {
    name: "Microelettrica Scientifica S.P.A.",
    volume: "459.2k",
    contractualPT: "90d",
    proposedPT: "90d",
    cashFlow: "44.3k",
  },
  /** Suppliers hanging from the parent, in tree order. The selected one is not the only child. */
  suppliers: [
    "Knorr-Bremse Espana S.A.",
    "Microelettrica Scientifica S.P.A.",
    "Dr. Techn. Josef Zelisko, Fabrik Fuer Elektrotechnik Und Maschinenbau Gesellschaft M.B.H.",
    "Comet Fans S.R.L.",
  ],
  /**
   * Spend line cards of the selected supplier, in tree order. Only rendered once the supplier is
   * expanded, because the backend now serves every supplier node collapsed.
   */
  spendLines: [
    {
      alias: "Spend 1",
      volume: "305.5k",
      contractualPT: "90d",
      buyingEntity: "Pagero Inc",
      proposedPT: "90d",
      commodity: "Lighting Fixtures",
    },
    {
      alias: "Spend 2",
      volume: "153.7k",
      contractualPT: "90d",
      buyingEntity: "Pagero Inc",
      proposedPT: "90d",
      commodity: "Lighting Fixtures",
    },
  ],
};

/**
 * Cash Flow is a live, calculated figure (TreeCards.vue binds it straight to data.cashFlow, a
 * time-value-of-money number that moves with the current date) so it drifts run to run — same
 * reasoning as card 3's credit-score assertions in cards-at-the-top.spec.ts. Its shape is checked
 * instead of pinning an exact value that goes stale.
 */
const CASH_FLOW_SHAPE = /^-$|^\d+(\.\d+)?[kmb]?$/i;

/**
 * Setup hook that runs before each test.
 * Ensures the user is logged in, changes to the required spend file,
 * and selects the appropriate program for testing.
 */
test.beforeEach(async ({ page }) => {
  await ensureDefaultLogin(page);
  await changeToSpendFile(page, "20221011_MATCH_OVERVIEW.xlsx (Ver. 5)");
  await ProgramUtils.changeToProgram(page, "CF PROGRAM Excluded Micro Spend 3");
});

test("tree family cards with program CF @api @entity @negotiation @adabot", async ({
  page,
}) => {
  const companyName = given.supplier.name;

  logOperation("Starting tree family card test", { companyName });

  // Click in an entity card
  await safeOperation(
    page,
    async () => {
      await ensurePageActive(page);
      await goToEntityCardEntity(page, companyName);
    },
    "Navigate to entity card",
  );

  await safeOperation(
    page,
    async () => {
      await ensurePageActive(page);
      await goToCorporateTree(page);
    },
    "Navigate to corporate tree",
  );

  logOperation("Waiting for tree to load");

  const familyCards = page.locator(".org-tree-node .tree-family-card");
  // One parent plus its suppliers: no spend line card is rendered at this point
  await expect(familyCards).toHaveCount(given.suppliers.length + 1, {
    timeout: 30000,
  });

  logOperation("Tree loaded, starting assertions");

  // **** Checking the initial tree layout *******
  logOperation("Checking initial tree layout");

  // The parent is expanded, so the Suppliers header is shown and every supplier card is visible
  await expect(page.locator(".tree-family-header", { hasText: "Parents" })).toBeVisible();
  await expect(page.locator(".tree-family-header", { hasText: "Suppliers" })).toBeVisible();
  for (const supplierName of given.suppliers) {
    await expect(cardByCompanyName(page, supplierName)).toBeVisible();
  }

  // The Spend Lines level starts collapsed: no spend card and no Spend Lines header
  await expect(page.locator(".org-tree-node .card-for-spend")).toHaveCount(0);
  await expect(
    page.locator(".tree-family-header", { hasText: "Spend Lines" }),
  ).toHaveCount(0);

  // **** Checking Parent Data *******
  logOperation("Checking Parent Data");

  const parentCard = cardByCompanyName(page, given.parent.name);
  await expect(parentCard).toBeVisible();
  const parentsTexts = await getExpectedValues(parentCard);
  const parentData = compareData(parentsTexts, given.parent);
  console.log("parentsTexts : ", parentsTexts);
  console.log("parentData : ", parentData);
  expect(parentData).toBe(true);

  // **** Checking Selected Supplier *******
  logOperation("Checking Selected Supplier Data");

  const supplierCard = cardByCompanyName(page, given.supplier.name);
  await expect(supplierCard).toBeVisible();
  const suppliersTexts = await getExpectedValues(supplierCard);
  const supplierData = compareData(suppliersTexts, given.supplier);
  console.log("suppliersTexts : ", suppliersTexts);
  console.log("supplierData : ", supplierData);
  expect(supplierData).toBe(true);

  // **** Expanding the selected supplier spend lines *******
  logOperation("Expanding the selected supplier spend lines", { companyName });

  // The expand button sits to the right of the card, inside the same node label
  const supplierLabel = nodeLabelByCompanyName(page, given.supplier.name);
  const supplierExpandButton = supplierLabel.locator("> .org-tree-node-btn");
  await expect(supplierExpandButton).toBeVisible();
  // Without the "expanded" class the button renders as "+"
  await expect(supplierExpandButton).not.toHaveClass(/expanded/);

  await supplierExpandButton.click();

  await expect(supplierExpandButton).toHaveClass(/expanded/);
  await expect(
    page.locator(".tree-family-header", { hasText: "Spend Lines" }),
  ).toBeVisible();

  // Only the selected supplier expands, so its spend cards are the only ones in the tree
  const spendCards = supplierLabel
    .locator("xpath=../..")
    .locator("> .org-tree-node-children .card-for-spend");
  await expect(spendCards).toHaveCount(given.spendLines.length);
  await expect(page.locator(".org-tree-node .card-for-spend")).toHaveCount(
    given.spendLines.length,
  );

  logOperation("Checking spend line cards", { count: given.spendLines.length });

  for (let index = 0; index < given.spendLines.length; index++) {
    const expected = given.spendLines[index];
    const spendCard = spendCards.nth(index);

    await expect(spendCard).toBeVisible();
    await expect(spendCard.locator(".spend-alias-text")).toHaveText(
      expected.alias,
    );

    // Fixed cell order in TreeCards.vue: volume, cash flow, contractual PT, buying entity,
    // proposed PT, commodity
    const spendTexts = (
      await spendCard
        .locator(".tree-card-grid .grid-cell >> span.spend-details.font-weight-600")
        .allInnerTexts()
    ).map((text) => text.trim());
    console.log("spendTexts : ", expected.alias, " : ", spendTexts);

    expect(spendTexts[0]).toBe(expected.volume);
    expect(spendTexts[1]).toMatch(CASH_FLOW_SHAPE);
    expect(spendTexts[2]).toBe(expected.contractualPT);
    expect(spendTexts[3]).toBe(expected.buyingEntity);
    expect(spendTexts[4]).toBe(expected.proposedPT);
    expect(spendTexts[5]).toBe(expected.commodity);
  }

  logOperation("Test completed successfully");
});

/**
 * Locates the node label of a company card in the corporate tree.
 * The label wraps the card and the expand button, and never contains the child nodes, so filtering
 * it by company name resolves to a single node no matter how deep the card sits in the tree.
 *
 * @param {Page} page - The Playwright page object to interact with.
 * @param {string} companyName - Name shown in the company card.
 * @returns {Locator} Locator for the ".org-tree-node-label-inner" of that company.
 */
function nodeLabelByCompanyName(page: any, companyName: string): Locator {
  return page.locator(".org-tree-node-label-inner", {
    has: page.locator(".tree-family-card .company-name", {
      hasText: companyName,
    }),
  });
}

/**
 * Locates the family card of a company in the corporate tree.
 *
 * @param {Page} page - The Playwright page object to interact with.
 * @param {string} companyName - Name shown in the company card.
 * @returns {Locator} Locator for the ".tree-family-card" of that company.
 */
function cardByCompanyName(page: any, companyName: string): Locator {
  return nodeLabelByCompanyName(page, companyName).locator(".tree-family-card");
}

/**
 * Extracts the values displayed by a family card.
 * Retrieves the company name and then the 5 grid cell values in their fixed template order.
 *
 * @param {Locator} card - Locator of the ".tree-family-card" to read.
 * @returns {Promise<string[]>} A promise that resolves to an array of strings containing:
 *                              [name, volume, cashFlow, contractualPT, country, proposedPT]
 *
 * @example
 * const values = await getExpectedValues(cardByCompanyName(page, "Knorr-Bremse AG"));
 */
async function getExpectedValues(card: Locator): Promise<string[]> {
  const name = (await card.locator(".company-name").innerText()).trim();
  console.log("result name : ", name);
  // Exclude span-2 cells when selecting normal grid cells
  const values = (
    await card
      .locator(
        ".tree-card-grid >> .grid-cell:not(.span-2) >> span.text-sm.font-semibold.text-gray-700",
      )
      .allInnerTexts()
  ).map((text) => text.trim());
  values.forEach((value, index) =>
    console.log("expectedValue index : ", index, " : ", value),
  );
  return [name, ...values];
}

/**
 * Compares extracted text values from the page with expected data object.
 * Performs case-insensitive comparison by checking if all expected values exist
 * in the extracted texts array.
 *
 * @param {string[]} parentsTexts - Array of text values extracted from the page.
 *                                  Expected format: [name, value0, value1, value2, value3, value4]
 * @param {Object} parent - Object containing expected values to compare against.
 *                         Should contain: name, volume, cashFlow, proposedPT, contractualPT
 * @param {string} [parent.name] - Expected name value.
 * @param {string} [parent.volume] - Expected volume value.
 * @param {string} [parent.cashFlow] - Expected cash flow value.
 * @param {string} [parent.proposedPT] - Expected proposed payment terms value.
 * @param {string} [parent.contractualPT] - Expected contractual payment terms value.
 * @returns {boolean} Returns true if all expected values are found in the extracted texts
 *                    (case-insensitive comparison). Returns true for undefined fields.
 *
 * @example
 * const extracted = ["Company Name", "100k", "50k", "30d", "DEU", "60d"];
 * const expected = { name: "Company Name", volume: "100k", cashFlow: "50k", proposedPT: "60d", contractualPT: "30d" };
 * const matches = compareData(extracted, expected); // true
 */
function compareData(parentsTexts: string[], parent: any): boolean {
  console.log("parent : ", parent);
  // Create a Set with the values from the list for fast lookups
  const textsSet = new Set(
    parentsTexts.map((text) => text.toLowerCase().trim()),
  );

  // Helper function to check if a value exists in the list
  const valueExists = (value: string | undefined): boolean => {
    if (value === undefined) return true; // If the field doesn't exist, it's considered valid
    return textsSet.has(value.toLowerCase().trim());
  };

  // Check the cash flow shape at its known grid position (parentsTexts[2]: [name, volume,
  // cashFlow, contractualPT, country, proposedPT], per TreeCards.vue's fixed cell order) instead
  // of pinning an exact value that goes stale.
  const cashFlowMatch =
    parent.cashFlow === undefined ||
    CASH_FLOW_SHAPE.test((parentsTexts[2] ?? "").trim());

  // Compare each field of the parent object with the list
  const nameMatch = valueExists(parent.name);
  const volumeMatch = valueExists(parent.volume);
  const proposedPTMatch = valueExists(parent.proposedPT);
  const contractualPTMatch = valueExists(parent.contractualPT);
  console.log("nameMatch : ", nameMatch);
  console.log("volumeMatch : ", volumeMatch);
  console.log("cashFlowMatch : ", cashFlowMatch);
  console.log("proposedPTMatch : ", proposedPTMatch);
  console.log("contractualPTMatch : ", contractualPTMatch);
  // Return true if all important fields match
  // You can adjust which fields are mandatory according to your needs
  const result =
    nameMatch &&
    volumeMatch &&
    cashFlowMatch &&
    proposedPTMatch &&
    contractualPTMatch;
  return result;
}
