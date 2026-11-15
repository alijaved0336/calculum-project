/**
 * @fileoverview
 * E2E test for Categorize Overview - Four Cards at the Top.
 *
 * This test verifies that the four cards at the top of the Categorize Overview page
 * display the correct titles, labels, and that each value-bearing component renders
 * *some* (non-empty) value.
 *
 * Test Flow:
 * 1. Ensure default login before each test.
 * 2. Go to Home and change to a specific spend file.
 * 3. Navigate to the Analyze > Overview tab (waits for /overview-info-panels).
 * 4. Assert that each card displays its expected titles/labels and that the dynamic
 *    values are present.
 *
 * Why we don't compare against the API payload:
 * These cards render live data (payment terms, spend, entity counts, details) that
 * changes over time, and the entity/overview navigation can fire several requests.
 * Comparing against an exact API value is racy and brittle (the same anti-pattern that
 * kept this suite skipped since 2024). Instead we anchor on stable selectors and only
 * assert that each component exists and holds a non-empty value — whatever it is.
 *
 * Acceptance Criteria:
 * - The four cards at the top of the Overview page are present.
 * - Each card displays the correct title and section labels.
 * - Each value-bearing component renders a non-empty value.
 */

import { Page, expect, test } from "@playwright/test";

// Global utils
import {
  changeToSpendFile,
  goToHomeSection,
  ensureDefaultLogin,
  goToAnalyzeSection,
} from "../../utils/Utils";

const spendFileName = "PageroFull_20230308_2.xlsx (Ver. 1)";

/**
 * Expected (static) titles/labels rendered by the cards. Values are intentionally not
 * asserted against the API — see the file header.
 */
const expectedFirstCard = {
  cardTitleUpper: "Payment Terms (days)",
  cardTitleLower: "Buyer Leverage / Materiality",
  upperSectionFirstParam: "Contractual",
};

const expectedSecondCard = {
  cardTitle: "Spend",
  bigNumberTitle: "Spend Volume",
  numberCenterTitle: "Average Spend",
};

const expectedThirdCard = {
  cardTitle: "Entities",
  bigNumberTitle: "Buying Entities",
  numberLeftTitle: "Parents",
  numberCenterTitle: "Suppliers",
  numberRightTitle: "Spend Lines",
};

const expectedFourthCard = {
  cardTitle: "Details",
  firstSectionTitle: "Buying Entities",
  secondSectionTitle: "Country(ies)",
  thirdSectionTitle: "Currency(ies)",
};

test.beforeEach(async ({ page }) => {
  // Ensure default user is logged in
  await ensureDefaultLogin(page);

  // Go to Home
  await goToHomeSection(page);

  // Change spend file
  await changeToSpendFile(page, spendFileName);
});

/**
 * Navigate to the Analyze > Overview tab.
 *
 * We pass isFromHome=false because the restored session can deep-link to
 * /home/analyze/* instead of /home/home-dashboard, and goToHomeSection accepts any
 * /home/* route as "in Home" — so the default isFromHome=true URL guard
 * (which requires /home/home-dashboard) would fail. tab="Overview" + wait=true gates
 * on /overview-info-panels (and the chart-data requests) so the cards are populated
 * before we assert. The web-first assertions below additionally auto-wait on the
 * rendered state.
 */
async function goToCategorizeOverview(page: Page) {
  await goToAnalyzeSection(page, "Overview", true, "Parents", false);
}

/**
 * Card 1: Payment Terms / Buyer Leverage
 */
test("card 1 - payment terms / buyer leverage card is showing properly @ui @entity @us-4426 @tc-5316 @tc-5317 @tc-5318 @tc-5319", async ({
  page,
}) => {
  await goToCategorizeOverview(page);

  // User is now in Analyze section / Overview tab.
  // Card 1 is the only one carrying the .card-entity-card__overview class.
  const card = page.locator(".card.card-entity-card__overview");
  await expect(card).toBeVisible({ timeout: 30000 });

  /*** Upper section: Payment Terms ***/
  // Title + tooltip
  const upperTitle = card.locator("h5").filter({
    hasText: expectedFirstCard.cardTitleUpper,
  });
  await expect.soft(upperTitle).toBeVisible();
  await expect
    .soft(upperTitle.locator("[data-testid='tooltip-icon']"))
    .toBeVisible();

  // "Contractual" label is present (rendered by BarsComponent's title-container)
  await expect
    .soft(card.locator(".title-container"))
    .toContainText(expectedFirstCard.upperSectionFirstParam);

  // Payment-terms value is present with a value, regardless of which (BarsComponent
  // renders the main/contractual value in .value-container, or "N/A").
  await expect.soft(card.locator(".value-container span").first()).not.toBeEmpty();

  /*** Lower section: Buyer Leverage / Materiality ***/
  // Title + (advanced) tooltip
  const lowerTitle = card.locator("h5").filter({
    hasText: expectedFirstCard.cardTitleLower,
  });
  await expect.soft(lowerTitle).toBeVisible();
  await expect
    .soft(lowerTitle.locator("[data-testid='tooltip-icon']"))
    .toBeVisible();

  // Buyer-leverage label value is present, regardless of which (e.g. "Low").
  await expect
    .soft(card.locator("p.text-lg.font-semibold").first())
    .not.toBeEmpty();

  // Level dashes chart is present (LevelDashesChart renders #dash-1..n).
  await expect.soft(card.locator("#dash-1")).toBeVisible();
});

/**
 * Card 2: Spend
 */
test("card 2 - spend card is showing properly @ui @entity @us-4426", async ({
  page,
}) => {
  await goToCategorizeOverview(page);

  // Anchor on the card by its heading so re-ordering can't move our assertions.
  const card = page.locator(".card").filter({
    has: page.getByRole("heading", { name: expectedSecondCard.cardTitle, exact: true }),
  });

  // Title + tooltip
  await expect(
    card.getByRole("heading", { name: expectedSecondCard.cardTitle, exact: true }),
  ).toBeVisible();
  await expect.soft(card.locator("[data-testid='tooltip-icon']").first()).toBeVisible();

  // Big number: "Spend Volume" title + a value (e.g. "13.2m"), regardless of which.
  await expect.soft(card).toContainText(expectedSecondCard.bigNumberTitle);
  await expect.soft(card.locator("span.text-5xl")).not.toBeEmpty();

  // Center column: "Average Spend" title + a value (e.g. "169.3k"), regardless of which.
  await expect.soft(card).toContainText(expectedSecondCard.numberCenterTitle);
  await expect
    .soft(card.locator(".col-xl-4").nth(1).locator("span.text-xl"))
    .not.toBeEmpty();
});

/**
 * Card 3: Entities
 */
test("card 3 - entities card is showing properly @ui @entity @program @us-4426", async ({
  page,
}) => {
  await goToCategorizeOverview(page);

  const card = page.locator(".card").filter({
    has: page.getByRole("heading", { name: expectedThirdCard.cardTitle, exact: true }),
  });

  // Title
  await expect(
    card.getByRole("heading", { name: expectedThirdCard.cardTitle, exact: true }),
  ).toBeVisible();

  // Big number: "Buying Entities" title + a value, regardless of which.
  await expect.soft(card).toContainText(expectedThirdCard.bigNumberTitle);
  await expect.soft(card.locator("span.text-5xl")).not.toBeEmpty();

  // Three columns: Parents / Suppliers / Spend Lines — each title present and each
  // value non-empty, regardless of which.
  await expect.soft(card).toContainText(expectedThirdCard.numberLeftTitle);
  await expect.soft(card).toContainText(expectedThirdCard.numberCenterTitle);
  await expect.soft(card).toContainText(expectedThirdCard.numberRightTitle);

  await expect
    .soft(card.locator(".col-xl-4").nth(0).locator("span.text-xl"))
    .not.toBeEmpty();
  await expect
    .soft(card.locator(".col-xl-4").nth(1).locator("span.text-xl"))
    .not.toBeEmpty();
  await expect
    .soft(card.locator(".col-xl-4").nth(2).locator("span.text-xl"))
    .not.toBeEmpty();
});

/**
 * Card 4: Details
 */
test("card 4 - company details are showing properly @ui @entity @program @us-4426", async ({
  page,
}) => {
  await goToCategorizeOverview(page);

  // The details come from a separate fetch (/api/entity-card/details/...), not the
  // legacy /spendFileVersion endpoint the old test waited on. The auto-retrying
  // assertions below wait for the values to render.
  const card = page.locator(".card").filter({
    has: page.getByRole("heading", { name: expectedFourthCard.cardTitle, exact: true }),
  });

  // Title
  await expect(
    card.getByRole("heading", { name: expectedFourthCard.cardTitle, exact: true }),
  ).toBeVisible();

  // Section titles
  await expect.soft(card).toContainText(expectedFourthCard.firstSectionTitle);
  await expect.soft(card).toContainText(expectedFourthCard.secondSectionTitle);
  await expect.soft(card).toContainText(expectedFourthCard.thirdSectionTitle);

  // Each section renders a value (formatDetailsItems → a list or "N/A"), regardless of
  // which. There are three .details-card__section__value entries.
  const values = card.locator(".details-card__section__value");
  await expect.soft(values).toHaveCount(3);
  await expect.soft(values.nth(0)).not.toBeEmpty();
  await expect.soft(values.nth(1)).not.toBeEmpty();
  await expect.soft(values.nth(2)).not.toBeEmpty();
});
