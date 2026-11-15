/**
 * @fileoverview
 * E2E tests for the "Agreed Payment Terms" modal in the Opportunity entity card.
 *
 * This suite covers:
 * - Opening the "Agreed Payment Terms" modal from the Opportunity card.
 * - Verifying modal titles and UI elements.
 * - Editing and saving agreed payment terms.
 * - Validating date pickers and input fields.
 * - Ensuring correct display of updated values.
 * - Modal open/close behavior and validation.
 *
 * Prerequisites:
 * - The test user must have access to the "PageroFull_20230308_2.xlsx (Ver. 1)" spend file.
 * - The supplier "Microelettrica Scientifica S.P.A." must exist in the test data.
 *
 * Utilities:
 * - Uses Playwright test runner and custom utility functions for navigation and assertions.
 */

import { Page, expect, test } from "@playwright/test";

// *** Global utils ***
import {
  assertModalHasRightTitle,
  assertModalIsHidden,
  changeToSpendFile,
  ensureDefaultLogin,
  ENTITY_TYPE,
  getCurrentDate,
  getDateFromCurrentDate,
  goToEntityCardEntityExactFull,
  goToHomeSection,
} from "../../utils/Utils";

// The app's own copy, so a re-wording of the status label is not a test
// failure: what the test pins is the status itself.
import englishKeys from "@ada/design-system/locales/languages/en.json";

// *** Entity Card utils ***
import { showTermsDetails } from "../utils";
import { locators } from "../../utils/locators";

const spendFileName = "PageroFull_20230308_2.xlsx (Ver. 1)";
const sectionTitle = "Agreed";
const modalTitle = "Agreed Payment Terms";
const supplierName: string = "Microelettrica Scientifica S.P.A.";

// Get current date in format YYYY-MM-DD
const currentDate: string = getCurrentDate();

// Get current date + 7 days in format YYYY-MM-DD
const nextReviewDate: string = getDateFromCurrentDate(7);

const spendOneParams = {
  spendTabName: "Spend 1",
  withoutCashDiscount: "60",
  withCashDiscount: "10",
  cashDiscount: "3",
  currentDate,
  nextReviewDate,
  entityType: ENTITY_TYPE.SUPPLIER,
};

// Infere SpendParams type from object spendOneParams
type SpendParams = typeof spendOneParams;

/**
 * Before Each hook
 */

test.beforeEach(async ({ page }) => {
  await ensureDefaultLogin(page);

  // Go to home
  await goToHomeSection(page);

  // Change spend file
  await changeToSpendFile(page, spendFileName);
});

/**
 * Supplier
 */
test("agreed payment terms are being saved for supplier @entity @integrated @us-5089 @tc-5298 @negotiation-status", async ({
  page,
}) => {
  // Open the supplier's entity card. The exact-match helper picks the entity
  // out of the search response by name and type: the plain helper clicks the
  // first result, and on this fixture that is the parent Knorr-Bremse AG,
  // whose Agreed modal renders no per-spend tab at all.
  await goToEntityCardEntityExactFull(
    page,
    supplierName,
    0,
    true,
    null,
    "supplier",
  );

  // Go to terms section and click on agreed terms bar
  await showTermsDetails(page, sectionTitle);

  // Click on primary button inside AdaBot section
  await page
    .locator(".info-side")
    .locator("#agreedTermsAdabotSaveResults")
    .click();

  // Assert "Agreed Payment Terms" modal is visible
  await assertModalHasRightTitle(page, modalTitle);

  // Assert "Add Results" tab is selected by default
  await expect(page.getByTestId("modal").getByText("Add Results")).toHaveClass(
    /active/,
  );

  // Fill agreed terms values and save for "Spend 1"
  await saveAgreedTermsGivenSpendNameAndValues(page, spendOneParams);

  // Assert "Agreed Payment Terms" modal is hidden
  await assertModalIsHidden(page);

  // The negotiation status the save produced. The card's status pill follows
  // the spend selected on the card, and the card sits at supplier level, where
  // the pill shows the aggregate of the three spends, so the agreed spend has
  // to be selected first. Selection and reading are retried as one unit: the
  // save emits `change-data`, and the refresh that follows remounts the card
  // and puts the selection back on "Supplier", so a single click can be undone
  // after it lands.
  //
  // `pill-badge-current-status` is the testid of a pill that carries the status
  // dropdown, and only the card's own pill (NegotiationStatusPills) is rendered
  // with one: the grid, corporate tree and recent-search pills all render the
  // -no-dropdown variant. The class the old assertion looked for,
  // `label-container-default`, no longer reaches the DOM: pill colours are
  // Tailwind classes now (negotiationStatusGetPillColorClasses) and that class
  // survives only as dead CSS inside the component.
  const spendTab = page.getByRole("tab", {
    name: spendOneParams.spendTabName,
    exact: true,
  });

  await expect(async () => {
    if ((await spendTab.getAttribute("aria-selected")) !== "true") {
      await spendTab.click();
    }

    await expect(page.getByTestId("pill-badge-current-status")).toHaveText(
      englishKeys.global.negotiationStatusStatuses.agreed,
      { timeout: 10_000 },
    );
  }).toPass({ timeout: 60_000 });

  await page.locator(locators.entityCard.closeButton).click();
});

/**
 * Save agreed terms given spend name and values
 *
 * @param page { Page}
 * @param params
 */
async function saveAgreedTermsGivenSpendNameAndValues(
  page: Page,
  params: SpendParams,
) {
  const modal = page.getByTestId("modal");

  // Parent only
  // Supplier only
  if (params.entityType === ENTITY_TYPE.SUPPLIER) {
    // Click on "Spend" tab
    await modal.getByRole(`tab`, { name: params.spendTabName }).click();
  }

  // Without Cash Discount

  await modal
    .getByLabel("Without Cash Discount (days)", { exact: true })
    .fill(params.withoutCashDiscount);

  // With Cash Discount. This field and the cash discount percentage render
  // inside the More Options block of ModalResults, collapsed by default, so
  // the spend tab opens showing only the four always-visible inputs.
  const withCashDiscount = modal.getByLabel("With Cash Discount (days)", {
    exact: true,
  });

  if (!(await withCashDiscount.isVisible())) {
    await modal.locator('[data-testid="more-options-action"]').click();
  }

  await withCashDiscount.fill(params.withCashDiscount);

  // Cash Discount (%)
  await modal
    .getByLabel("Cash Discount (%)", { exact: true })
    .first()
    .fill(params.cashDiscount);

  // Dates to Apply the terms: current date
  await modal
    .getByLabel("Date of Agreement", { exact: true })
    .first()
    .fill(params.currentDate);

  // Next review dates: current date + 7 days
  await modal
    .getByLabel("Next Review Date", { exact: true })
    .first()
    .fill(params.nextReviewDate);

  // Save and check API response. The modal has a single Save button
  // (`btn-add-results-view`, `validateSpendNewTerms`), and the write it makes
  // is `saveAndEditAgrreedTerms`, which posts to the entity-card-results
  // endpoint. `/api/entity_card_spend_new_terms` is the resource the modal
  // reads a single saved record from, not what the Save writes to.
  await Promise.all([
    page.waitForResponse(
      (response) =>
        new URL(response.url()).pathname ===
          "/api/entity-card-results/create-updated-agree-terms-configs" &&
        response.ok(),
    ),
    // Click on "Save" / "Update" button
    modal.getByRole("button", { name: "Save", exact: true }).click(),
  ]);
}
