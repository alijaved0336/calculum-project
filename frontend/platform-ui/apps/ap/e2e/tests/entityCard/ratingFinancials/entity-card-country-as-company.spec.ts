/**
 * @fileoverview
 * E2E test for verifying the display and linkage of the Country Credit Rating and Company Credit Rating
 * in the Entity Card when the entity is a country, as per US-5762 (tc-5921).
 *
 * Main Flow:
 * 1. Ensure the user is on the home page and logged in with default credentials.
 * 2. Change to the spend file "PageroCompanyCountry-Rating.xlsx (Ver. 1)".
 * 3. Search for and open the Entity Card for "United States".
 * 4. Navigate to the Ratings & Metrics section.
 * 5. Wait for the credit-score and country-rating API responses.
 * 6. Assert that both rating cards render the grade their own endpoint returned,
 *    and that the two grades match — the linkage the user story describes.
 *
 * Acceptance Criteria:
 * - The Entity Card for "United States" loads successfully.
 * - The Ratings & Metrics section displays both the Country Rating and the
 *   Company Credit Rating cards.
 * - The company credit rating equals the country rating for an entity that is
 *   itself a country.
 */

import { test, expect } from "@playwright/test";
import {
  changeToSpendFile,
  ensureDefaultLogin,
  goToEntityCardEntityExactFull,
  goToHomeSection,
} from "../../utils/Utils";
import { locators } from "../../utils/locators";

const spendFileName = "PageroCompanyCountry-Rating.xlsx (Ver. 1)";
const entityName = "United States";

test("Entity Card > Country Credit Rating and the Company Credit Rating linked @entity @ui @us-5762 tc-5921", async ({
  page,
}) => {
  test.setTimeout(180_000);

  await goToHomeSection(page);

  await ensureDefaultLogin(page);

  await changeToSpendFile(page, spendFileName);

  await goToEntityCardEntityExactFull(page, entityName);

  // Both cards are filled from their own endpoint, so arm both waiters before
  // opening the tab. EntityCardRatingsAndMetrics fetches the credit score and
  // the country rating independently and neither response carries the other's
  // value.
  const creditScorePromise = page.waitForResponse(
    (response) => response.url().includes("/credit-score") && response.ok(),
    { timeout: 60_000 },
  );
  const countryRatingPromise = page.waitForResponse(
    (response) =>
      response.url().includes("/chart/country-rating") && response.ok(),
    { timeout: 60_000 },
  );
  await page.locator(locators.entityCard.menu.ratingMetrics).click();

  const creditScore = await (await creditScorePromise).json();
  const countryRating = await (await countryRatingPromise).json();

  console.log("credit-score API:", JSON.stringify(creditScore?.supplier ?? {}));
  console.log("country-rating API:", JSON.stringify(countryRating));

  // EntityCardTextArc renders the grade in `span.grade-big-letter`; the id it
  // also carries is repeated across the two cards, so scope by each card's own
  // heading instead. "Country Rating" is not a substring of "Company Credit
  // Rating", so the substring matching hasText applies is unambiguous here.
  const ratingCard = (title: string) =>
    page
      .locator("div.card")
      .filter({ has: page.locator("h5", { hasText: title }) })
      .first();

  const countryRatingCard = ratingCard("Country Rating");
  const companyRatingCard = ratingCard("Company Credit Rating");

  await expect(countryRatingCard).toBeVisible({ timeout: 30_000 });
  await expect(companyRatingCard).toBeVisible({ timeout: 30_000 });

  await expect
    .soft(countryRatingCard, "The country rating card names the country")
    .toContainText(countryRating.countryName ?? entityName);

  // creditRatingLetterGrade falls back from collateralCreditRating to
  // adaScoreRef, which is the order the view itself applies.
  const expectedCompanyGrade: string =
    creditScore?.supplier?.collateralCreditRating ||
    creditScore?.supplier?.adaScoreRef ||
    "";
  const expectedCountryGrade: string = countryRating?.spRating ?? "";

  expect(
    expectedCountryGrade,
    "The country-rating endpoint returned no S&P rating for this country",
  ).not.toBe("");

  await expect(
    countryRatingCard.locator("span.grade-big-letter"),
  ).toHaveText(expectedCountryGrade);

  await expect(
    companyRatingCard.locator("span.grade-big-letter"),
  ).toHaveText(expectedCompanyGrade);

  // The linkage US-5762 describes: an entity that is itself a country carries
  // its country's rating as its company credit rating. Asserted against the
  // two live values rather than the hardcoded "AA+" the previous version
  // expected, which pinned the test to one fixture snapshot of the S&P rating
  // for the United States.
  expect(
    expectedCompanyGrade,
    "The company credit rating does not match the country rating",
  ).toBe(expectedCountryGrade);

  await page.locator(locators.entityCard.closeButton).click();
});
