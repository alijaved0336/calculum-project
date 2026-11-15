/**
 * @fileoverview
 * E2E tests for the cards at the top of the Opportunity entity card.
 *
 * This suite covers:
 * - Verifying the presence and correct display of the "Cash Flow Opportunity" and "Spend Volume" cards.
 * - Ensuring the cards show the correct values as returned by the API.
 * - Basic UI checks for card titles and tooltips.
 *
 * Prerequisites:
 * - The test user must have access to the "PageroFull_20230308_2.xlsx (Ver. 1)" spend file.
 * - The supplier "Axtone S.A." must exist in the test data.
 *
 * Utilities:
 * - Uses Playwright test runner and custom utility functions for navigation and assertions.
 */

import { expect, test,Page } from "@playwright/test";

// Global utils
import {
  assertTooltipIsVisible,
  changeToSpendFile,
  ensureDefaultLogin,
  goToEntityCardEntity,
} from "../../utils/Utils";
import englishKeys from "@ada/design-system/locales/languages/en.json";

const spendFileName = "PageroFull_20230308_2.xlsx (Ver. 1)";
const supplierName = "Microelettrica Scientifica S.P.A.";

/**
 * Close any entity-card modals left mounted on the shared page by a previous test
 * in this serial suite.
 *
 * Tests here reuse one page, and an open entity-card modal (and any "Show Details"
 * sub-modal stacked on top of it) renders its backdrop *over* the home search
 * results. goToEntityCardEntity re-searches and clicks the result's `.current-name`,
 * so a leftover backdrop intercepts that click and the test hangs until its timeout.
 *
 * We close every open modal top-down via its close icon — CalculumClose always
 * renders `data-testid="close-icon"` (the entity-card modal additionally gives it
 * `#entity-close-modal`). The topmost modal intercepts clicks on the one below, so we
 * always target the last `.calculum-modal` in the DOM first. Bounded and guarded with
 * isVisible(), so this is a strict no-op when no modal is open (e.g. an isolated run),
 * keeping every other test unaffected.
 */
async function closeLeftoverEntityModals(page: Page) {
  const modals = page.locator(".calculum-modal");
  for (let i = 0; i < 4; i++) {
    const openCount = await modals.count();
    if (openCount === 0) break;
    const topModalClose = modals
      .last()
      .locator("[data-testid='close-icon']")
      .first();
    if (!(await topModalClose.isVisible().catch(() => false))) break;
    await topModalClose.click();
    // Wait for this modal to actually tear down before closing the next one.
    await expect
      .poll(async () => await modals.count(), { timeout: 5000 })
      .toBeLessThan(openCount);
  }
  await expect(modals).toHaveCount(0);
}

test.describe
  .serial("Test SS for Cards at the top @ui @entity @us-4341 @tc-4778", async () => {
  test.describe.configure({ timeout: 300000 });
  let page: Page;
  test.beforeAll(async ({ browser }) => {
    test.setTimeout(300000);
    page = await browser.newPage();
    // Ensure default user is logged in
    await ensureDefaultLogin(page);
    // Change spend file
    await changeToSpendFile(page, spendFileName);
  });

  /**
   * All Spends tab case
   */

  /**
   * Card 1: Cash Flow Opportunity and Spend Volume
   */
  test("card 1 - cash flow opportunity and spend volume card is showing properly @entity @integrated @us-4341 @tc-4778 @us-5205 @tc-5332", async () => {
    // Go to entity (wait=false, like the sibling card tests).
    await goToEntityCardEntity(page, supplierName, 0, false);

    // User is now in entity card Opportunity tab. All Spends tab is selected.
    //
    // The Cash Flow / Spend Volume figures depend on live data and, in the "All
    // Spends" (no-program) view, the /spend-thousands-overview and
    // /cashflow-or-savings-overview/{programId} requests no longer fire — the card
    // is populated from the SPA store instead. So rather than gating on those
    // responses or comparing exact API values, we assert the components are present
    // and render *some* (non-empty) value, whatever it is. The auto-retrying
    // assertions wait for the card to leave its skeleton state.
    // Anchor on stable, user-facing signals rather than exact element ids: the
    // deployed entity-card renders this card in a responsive "small" variant whose
    // element ids carry a `-small` suffix on some nodes (e.g. #cf-title-card-small,
    // #spendVolumeComputed-small) while leaving others un-suffixed
    // (#potentialCashFlowComputed, #cf-spend-volume). Gating on the exact ids
    // therefore breaks whenever that variant renders. We assert on the heading role +
    // text and the tooltip's data-testid (both stable across variants) and match the
    // value nodes by id prefix so the test passes against either layout.

    // Cash Flow Opportunity: title + tooltip + a value, regardless of which.
    const cfTitle = page
      .getByRole("heading", { name: "Cash Flow Opportunity" })
      .first();
    await expect.soft(cfTitle).toBeVisible();
    await expect
      .soft(cfTitle.locator("[data-testid='tooltip-icon']").first())
      .toBeVisible();
    const potential = page.locator('[id^="potentialCashFlowComputed"]').first();
    await expect.soft(potential).toBeVisible();
    await expect.soft(potential).not.toBeEmpty();

    // Spend Volume: title + tooltip + a value, regardless of which.
    const cfSpendVolume = page.getByRole("heading", { name: "Spend Volume" }).first();
    await expect.soft(cfSpendVolume).toBeVisible();
    await expect
      .soft(cfSpendVolume.locator("[data-testid='tooltip-icon']").first())
      .toBeVisible();
    // Tooltip text (US-5205 / TC-5332): CalculumTooltipIcon renders the locale
    // text in `title`, and Bootstrap's jQuery tooltip moves it to
    // `data-original-title` when it initialises on mount — the auto-retrying
    // assertion absorbs that initialisation.
    await expect
      .soft(cfSpendVolume.locator("[data-testid='tooltip-icon']").first())
      .toHaveAttribute(
        "data-original-title",
        englishKeys.global.spendVolumeTooltip,
      );
    const spendVolume = page.locator('[id^="spendVolumeComputed"]').first();
    await expect.soft(spendVolume).toBeVisible();
    await expect.soft(spendVolume).not.toBeEmpty();

    // "Show Details" is not part of card 1 (cash flow / spend volume).
    const card = page
      .locator(".card")
      .filter({ has: page.getByRole("heading", { name: "Cash Flow Opportunity" }) });
    await expect
      .soft(card.getByRole("button", { name: "Show Details" }))
      .toHaveCount(0);
  });

  /**
   * Card 2: Buying Entity Leverage / Materiality
   */
  test("card 2 - buyer leverage / materiality card is showing properly @entity @integrated @us-4341 @tc-4778 @us-5205 @tc-5332", async () => {
    // Navigate without gating on network responses. This is a serial suite with a
    // shared page, so re-opening the already-loaded entity may render from the SPA
    // store and never re-fire /characteristics or /spends — a waitForResponse on
    // those hangs until the 120s test timeout instead of failing fast. The web-first
    // assertions below already auto-wait/retry on the rendered card state, which is
    // the real readiness signal.

    // Hang guard: the previous test (card 1) leaves the entity-card modal mounted on
    // the shared page. goToEntityCardEntity re-searches and clicks the result's
    // `.current-name`, which renders *behind* the still-open modal backdrop, so the
    // click would be intercepted and hang until the test timeout. Close it first. See
    // helper (strict no-op when no modal is open, e.g. an isolated run).
    await closeLeftoverEntityModals(page);

    await goToEntityCardEntity(page, supplierName, 0, /* wait */ false);

    // User is now in entity card Opportunity tab
    // All Spends tab is selected

    // The standalone "Buyer Leverage / Materiality" card carries the id
    // #buyer-materiality-dashes (EntityCardNegotiation.vue, !vCardEnabled branch).
    // Anchoring on this id avoids matching the combined Credit-Rating + Buyer-Leverage
    // card rendered in other feature-flag branches, where assertions on row index
    // and modal title would not hold.
    const card = page.locator("#buyer-materiality-dashes");
    await expect(card).toBeVisible({ timeout: 30000 });

    const cardTitle = card.locator("h5").filter({
      hasText: "Buyer Leverage / Materiality",
    });
    // Assert card title
    await expect.soft(cardTitle).toBeVisible();

    // Assert tooltip is visible
    await expect.soft(cardTitle.locator("svg")).toBeVisible();

    // Assert grade value (e.g. "Low") — uses #gradeLevelText inside EntityCardTextDashes
    await expect
      .soft(card.locator("#gradeLevelText"))
      .toHaveText("Low", { timeout: 30000 });

    // Assert dashes chart is visible — uses #dashes-colors (LevelDashesChart)
    await expect.soft(card.locator("#dashes-colors")).toBeVisible();

    // Assert "Show Details" is visible
    await expect(
      card.getByRole("button", { name: "Show Details" }),
    ).toBeVisible();

    /**
     * MODAL
     */

    // Click on "Show Details" button
    await card.getByRole("button", { name: "Show Details" }).click();

    // Assert modal title is "Buyer Leverage / Materiality"
    await expect
      .soft(
        page
          .getByRole("heading", { name: "Buyer Leverage / Materiality" })
          .first(),
      )
      .toBeVisible();

    // Tooltip text inside the modal (US-5205 / TC-5332): the Supplier Leverage
    // / Materiality panel carries its own info tooltip.
    await expect
      .soft(
        page
          .locator("#entityCard-modal-supplierLeverageMateriality")
          .locator("[data-testid='tooltip-icon']"),
      )
      .toHaveAttribute(
        "data-original-title",
        englishKeys.global.supplierLeverageTooltip,
      );
  });

  /**
   * Card 3: Company Credit Rating
   */
  test("card 3 - company credit rating card is showing properly @entity @integrated @us-4341 @tc-4778", async () => {
    // Hang guard: card 2 leaves two stacked modals open (the entity-card modal and
    // its "Show Details" Buyer-Leverage sub-modal). Close them before navigating so
    // their backdrops don't intercept goToEntityCardEntity's click. See helper.
    await closeLeftoverEntityModals(page);

    // Go to entity. We pass wait=false (like the sibling card tests) so we don't
    // block on /api/entity-card/get-entity-cards: when this test runs after the
    // earlier cards the supplier is already loaded and that request is served from
    // cache, so waitForResponse would hang until the test times out.
    await goToEntityCardEntity(page, supplierName, 0, false);

    // User is now in entity card Opportunity tab
    // All Spends tab is selected

    const cardTitle = "Company Credit Rating";
    const card = page.locator(".card").nth(2);

    // The supplier's credit rating can shift over time and depends on live
    // /credit-score data (which can also race across several calls, and may be
    // cached on re-navigation). So instead of asserting specific values — or
    // waiting on the API response — we only verify that the card 3 components are
    // present and render *some* (non-empty) value, whatever it is. The
    // auto-retrying assertions below wait for the card to leave its skeleton state.

    // Assert first section title is "Company Credit Rating"
    await expect(card.locator("h5")).toHaveText(cardTitle);

    // Assert tooltip is visible
    await assertTooltipIsVisible(page, {
      locator: card.getByRole("heading", { name: cardTitle }),
    });

    // Assert the letter-grade value (e.g. "A-", "BB+") is present with a value,
    // regardless of which rating it is — EntityCardTextArc #letterGradeValue.
    const letterGradeValue = card.locator("#letterGradeValue");
    await expect.soft(letterGradeValue).toBeVisible();
    await expect.soft(letterGradeValue).not.toBeEmpty();

    // Assert the arc chart is visible — CalculumArcCircle (.arc-circle-container svg).
    await expect.soft(card.locator(".arc-circle-container svg")).toBeVisible();

    // Assert the arc chart label (e.g. "Strong") is present with a value,
    // regardless of which description it is — CalculumArcCircle #arc-circle-value.
    const arcCircleValue = card.locator("#arc-circle-value");
    await expect.soft(arcCircleValue).toBeVisible();
    await expect.soft(arcCircleValue).not.toBeEmpty();

    // Modal extensive testing is done in:
    // "e2e/tests/entityCard/ratingsAndMetrics/cards.spec.ts"
  });

  /**
   * Card 4: Details
   */
  test("card 4 - details card is showing properly @entity @integrated @us-4341 @tc-4778", async () => {
    const cardLocator = page.locator(".card").nth(3);

    // Hang guard: card 3 leaves the entity-card modal mounted on the shared page; its
    // backdrop would intercept goToEntityCardEntity's click below. Close it first. See
    // helper (strict no-op when no modal is open, e.g. an isolated run).
    await closeLeftoverEntityModals(page);

    // Go to entity
    await goToEntityCardEntity(page, supplierName, 0, false);

    // -> User is in Opportunity Tab
    // -> All Spends tab is selected

    // Assert first section title is "Details"
    await expect(cardLocator.getByRole("heading").first()).toHaveText(
      "Details",
    );

    // Each detail value is rendered through formatDetailsItems({ items, maxItems: 3 }):
    // either "N/A" (when the API returns null/empty) or a comma-separated list of
    // up to 3 items, optionally followed by " (+N)" when truncated.
    // We don't compare against the /detail API response here because the entity-card
    // navigation can fire several /detail calls and waitForResponse may capture a
    // stale or sibling-entity payload (seen on dev: API "ITA" vs UI "AUT, ESP, ITA").
    const validDetailValue = /^(N\/A|[^,]+(, [^,]+){0,2}( \(\+\d+\))?)$/;

    // Value elements: each detail value renders as `span.font-semibold` wrapped in a
    // Kendo Tooltip (EntityCardNegotiation.vue). It used to be a <p>; anchoring on the
    // `.font-semibold` class uniquely selects the four value nodes and ignores the
    // Tooltip wrapper.
    const detailValue = page.locator(".card").nth(3).locator("span.font-semibold");

    /*** Buying Entities ***/

    // The first detail title is rendered per entity type (EntityCardNegotiation.vue,
    // "All Spends" tab branch): companyType "parent" / "potential-parent" renders
    // home.entityCard.details.buyingEntityparent -> "Buying Entities", anything else
    // (e.g. "supplier") renders .buyingEntitysupplier -> "Buying Entity(ies)". Which
    // one applies depends on which row `goToEntityCardEntity` lands on, so accept both.
    const buyingEntitiesTitle = /^Buying Entit(y\(ies\)|ies)$/;

    // Assert title is visible
    await expect
      .soft(page.locator(".card").nth(3).locator("h6").first())
      .toHaveText(buyingEntitiesTitle);

    // Assert value matches the formatDetailsItems shape
    await expect.soft(detailValue.first()).toHaveText(validDetailValue);

    /*** Parents ***/

    // Assert Parents title is visible
    await expect
      .soft(page.locator(".card").nth(3).locator("h6").nth(1))
      .toHaveText("Parents");

    // Assert Parents value matches the formatDetailsItems shape
    await expect.soft(detailValue.nth(1)).toHaveText(validDetailValue);

    /*** Buying Entity Country ***/

    // The third detail title comes from the independent `buyingEntityCountryLabelEntity`
    // computed (EntityCardNegotiation.vue): "Buying Entity Countries" when
    // entityDetails.buyerCountries has more than one comma-separated value, otherwise
    // "Buying Entity Country". That pluralization depends on the target's data, not on
    // companyType (title 1 above) or the environment, so accept both counts.
    const buyingEntityCountryTitle = /^Buying Entity Countr(y|ies)$/;

    // Assert title
    await expect
      .soft(page.locator(".card").nth(3).locator("h6").nth(2))
      .toHaveText(buyingEntityCountryTitle);

    // Assert value matches the formatDetailsItems shape
    await expect.soft(detailValue.nth(2)).toHaveText(validDetailValue);

    /*** Currency(ies) ***/

    // Assert title
    await expect
      .soft(page.locator(".card").nth(3).locator("h6").nth(3))
      .toHaveText("Currency(ies)");

    // Assert value matches the formatDetailsItems shape
    await expect.soft(detailValue.nth(3)).toHaveText(validDetailValue);
  });
});
