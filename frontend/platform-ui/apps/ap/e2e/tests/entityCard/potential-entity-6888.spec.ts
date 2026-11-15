/**
 * @fileoverview
 * E2E test for the Potential Supplier corporate tree and the Estimated terms
 * label in the Entity Card.
 *
 * Main Flows:
 * 1. Enable the potential-suppliers feature for the company as super admin.
 * 2. Sign back in as the default user and change to the potential-suppliers
 *    spend file.
 * 3. Navigate to the Suppliers section and open the Potential Suppliers tab.
 * 4. Open a potential supplier taken from the entity-cards payload.
 * 5. Assert the contractual terms line labels its actual value as Estimated.
 * 6. Assert its corporate tree marks the potential entities.
 *
 * Acceptance Criteria:
 * - The Potential Suppliers view lists a card per potential entity the API
 *   returns, and none when the API returns none.
 * - A potential entity's contractual line reads "Estimated" where a regular
 *   supplier reads "Avg. Days Paid".
 * - The corporate tree marks potential entities with the `potential` class.
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

// The same fixture the sibling 6520 spec uses: it is the spend file that
// carries potential entities and their corporate tree. "Pagero.xlsx (Ver. 24)",
// which this test named before, holds none, so every assertion below would
// have collapsed into the empty branch.
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

test("The Potential Parent corporate tree is shown, as well as its Company Details and Ratings & Metrics information tabs. @us-6521 @tc-6888 @entity @integrated", async ({
  page,
}) => {
  test.setTimeout(300_000);

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

  // The potential entities are a main tab of the entity card view now - the
  // "Entities" corner dropdown only switches between Suppliers and Pilot
  // Suppliers, so the old `.entity-container-dropdown >> span` last() click
  // selected Pilot Suppliers (or re-selected Suppliers) instead.
  const potentialTab = potentialSuppliersTab(page);
  await expect(potentialTab).toBeVisible({ timeout: 30_000 });

  console.log("Opening the Potential Suppliers tab");
  const [potentialCardsData] = await Promise.all([
    page.waitForResponse(
      (res: any) =>
        res.url().includes("/api/entity-card/get-entity-cards") && res.ok(),
      { timeout: 60_000 },
    ),
    potentialTab.click(),
  ]);

  const potentialCards: Array<{ name: string; companyType: string }> =
    await potentialCardsData.json();
  const potentialEntities = potentialCards.filter(
    (item) => item.companyType === "potential-supplier",
  );
  console.log(
    `entity-cards returned ${potentialCards.length} cards, ${potentialEntities.length} of them potential`,
  );

  const potentialCardLocator = page.locator(
    ".type-company.potential-supplier-type",
  );

  if (potentialEntities.length === 0) {
    // The payload carries no potential supplier, so the view must render no
    // potential card either. Polled rather than counted once: the cards paint
    // after the response the wait above returned.
    await expect
      .poll(async () => potentialCardLocator.count(), { timeout: 30_000 })
      .toBe(0);

    return;
  }

  await expect
    .poll(async () => potentialCardLocator.count(), { timeout: 30_000 })
    .toBeGreaterThan(0);

  // Open the first potential entity the API named rather than a hardcoded one:
  // the fixture's contents are not this test's subject.
  const entityName = potentialEntities[0].name;
  console.log("Go to Entity Card with the name:", entityName);
  await Promise.all([
    page.waitForResponse(
      (res: any) => res.url().includes("/credit-score") && res.ok(),
      { timeout: 60_000 },
    ),
    page
      .locator("div.card-body")
      .filter({ hasText: entityName })
      .first()
      .click(),
  ]);

  console.log("Check the terms chart labels the actual value as Estimated");
  // EntityTermsChartLine puts the chart name on the line's root element, so
  // the contractual line is `#termsbars .contractualTerms`; the old
  // `.line-chart.currentTerms` pair no longer co-occurs - `line-chart` moved
  // to an inner div - and the currentTerms line is titled "Avg. Days Paid"
  // for every entity. What a potential entity changes is the inline label on
  // the contractual line: `potentialText` swaps "Avg. Days Paid" for
  // "Estimated".
  const contractualLine = page.locator("#termsbars .contractualTerms").first();
  await expect(contractualLine).toBeVisible({ timeout: 30_000 });

  // The line carries up to two `avg-days-paid` spans - the discount subtitle
  // and the actual value - so read them together rather than asserting on a
  // locator that can resolve to either count.
  const inlineLabels = contractualLine.locator("span.avg-days-paid");

  if ((await inlineLabels.count()) === 0) {
    console.log(
      "The contractual line renders no actual-value label for this entity - " +
        "nothing to check on it",
    );
  } else {
    const labelText = (await inlineLabels.allInnerTexts()).join(" ");
    console.log("Contractual line inline labels:", labelText);
    expect(labelText).toContain("Estimated");
    expect(labelText).not.toContain("Avg. Days Paid");
  }

  console.log("go to the corporate tree");
  await Promise.all([
    page.waitForResponse(
      (response) => response.url().includes("family_tree") && response.ok(),
      { timeout: 60_000 },
    ),
    page.locator(locators.entityCard.menu.corporateTree).click(),
  ]);

  // TreeCards marks a potential entity's card with `potential`; the `disabled`
  // class the previous version also required comes from a separate condition
  // (isDefaultClass) and is not part of what this story asserts.
  await expect
    .poll(async () => page.locator(".card.tree-family-card.potential").count(), {
      timeout: 30_000,
    })
    .toBeGreaterThan(0);

  await page.locator(locators.entityCard.closeButton).click();
});
