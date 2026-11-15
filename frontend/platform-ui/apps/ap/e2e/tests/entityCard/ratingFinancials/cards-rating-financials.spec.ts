/**
 * @fileoverview
 * E2E tests for verifying the display and correctness of the Rating & Financials cards in the Entity Card.
 *
 * Main Flow:
 * 1. Ensure the user is logged in with default credentials.
 * 2. Change to the spend file "PageroFull_20230308_2.xlsx (Ver. 1)".
 * 3. Navigate to the Ratings & Metrics section for the entity "3M Company".
 * 4. Wait for the relevant API responses (credit score, ESG, financial metrics).
 * 5. Assert that the cards display the correct titles, tooltips, and modal content as expected.
 *
 * Acceptance Criteria:
 * - The test waits for the necessary navigation and spend file change to complete.
 * - The Ratings & Metrics section for "3M Company" loads successfully.
 * - The expected cards ("Company Credit Rating", "Buyer Leverage / Materiality", etc.) are present and display the correct information.
 * - Tooltips and modals for each card show the correct text and content.
 * - The test passes if all assertions are met and the UI displays the correct data for each card.
 */

import { Locator, Page, expect, test } from "@playwright/test";
import { locators } from "../../utils/locators";
// *** Global utils ***
import {
  assertModalHasRightTitle,
  assertModalIsVisible,
  assertTooltipIsVisible,
  changeToSpendFile,
  closeModalInsideEntityCard,
  ensureDefaultLogin,
  formatBooleanOrNull,
  formatPercentage,
  goToEntityCardEntity,
  goToRatingsAndMetrics,
} from "../../utils/Utils";

// *** EC utils */
import {
  waitForESGFromApi,
  waitForCreditScoreFromApi,
  waitForDetailFinancialMetricsFromApi,
} from "../utils";

// *** Component utils */

// *** Types ***
import { BigNumberTwoCols } from "../../types";

import englishKeys from "@ada/design-system/locales/languages/en.json";

// *** Custom Config ***
const given = {
  spendFileName: "PageroFull_20230308_2.xlsx (Ver. 1)",
  entityName: "3M Company",
  entityName2: "Assa Abloy Limited",
};

// 1st card
const expectedFirstCard = {
  title: "Company Credit Rating",
  tooltipText:
    "The credit rating is a score that measures a company's likelihood",
  modalTitle: "Company Credit Rating",
  externalParagraphContent: "When there is a match",
  externalParentParagraphContent: "Parent: If there is no match from",
  internalParagraphContent: "If there is no rating for parent",
} as const;

// 3rd card
const expectedThirdCard = {
  title: "Buyer Leverage / Materiality ",
  tooltipText:
    "The materiality of spend in comparison to the supplier's total sales revenue.",
  modalTitle: "Buyer Leverage / Materiality",
  modalFirstSectionTitle: "Buyer Leverage / Materiality",
  modalSecondSectionTitle: "Supplier % of total spend",
} as const;

let responseCreditScoreData: any;
let responseDetailsData: any;
let responseRatingsAndMetricsData: any;
let responseCharacteristicsData: any;

const textValidate = {
  showDetailsText: englishKeys.home.entityCard.showDetails,
  sourceText: englishKeys.home.entityCard.companyDetails.general.source,
  ratingText: englishKeys.home.entityCard.modalDetails.ratings,
};
test.describe.serial("Cards Rating n financials @flakyResolved", async () => {
  test.describe.configure({ timeout: 300000 });
  let page: Page;
  test.beforeAll(async ({ browser }) => {
    test.setTimeout(300000);
    page = await browser.newPage();
    await ensureDefaultLogin(page);
    await changeToSpendFile(page, given.spendFileName);
    await page.waitForSelector(".loading-modal", { state: "detached" });
    // Register all listeners BEFORE navigating — /characteristics fires in the
    // EntityCardOverview lifecycle (after the detail response), so registering
    // inside a Promise.all risks missing it on slower entities like 3M Company.
    const caracteristicasPromise = page.waitForResponse(
      (response) =>
        response.url().endsWith("/characteristics") && response.ok(),
    );
    const creditScorePromise = waitForCreditScoreFromApi(page);
    const detailPromise = page.waitForResponse(
      (response) => response.url().includes("/detail") && response.ok(),
    );
    await goToEntityCardEntity(page, given.entityName);
    const [responseCaracteristicas, responseCreditScore, responseDetails] =
      await Promise.all([
        caracteristicasPromise,
        creditScorePromise,
        detailPromise,
      ]);
    // Go to a Ratings & Metrics section in Entity and get data from API
    responseCreditScoreData = await responseCreditScore.json();
    responseDetailsData = await responseDetails.json();
    responseCharacteristicsData = await responseCaracteristicas.json();
    const [responseRatingsAndMetrics] = await Promise.all([
      waitForDetailFinancialMetricsFromApi(page),
      goToRatingsAndMetrics(
        page,
        { isFromHome: false, entityName: given.entityName },
        false,
      ),
    ]);

    responseRatingsAndMetricsData = await responseRatingsAndMetrics.json();
  });

  test("card 1 - company credit rating card is showing properly in the ratings and metrics section @credit-rating @entity @integrated @us-4341", async () => {
    const firstCardLocator = page.locator(".card").first();

    const result = responseCreditScoreData;

    const expectedValues = {
      companyCreditRating: result.supplier.adaScoreRef,
      creditRatingSource: result.supplier.source,
    } as const;
    console.log("expectedValues", expectedValues);
    const firstCardLocatorRow = firstCardLocator.locator(".row");
    // Assert first card title
    await expect(firstCardLocatorRow.first().locator("h5")).toHaveText(
      expectedFirstCard.title,
    );

    // Assert tooltip is visible
    await assertTooltipIsVisible(page, { locator: firstCardLocator });

    // Hover tooltip and assert tooltip text
    await Promise.all([
      firstCardLocatorRow.first().locator("svg").hover(),
      page.waitForSelector(".tooltip-inner", { state: "visible" }),
      expect(page.locator(".tooltip-inner").last()).toContainText(
        expectedFirstCard.tooltipText,
      ),
    ]);

    // Assert company credit rating

    await expect
      .soft(page.locator("#letterGradeValue").first())
      .toHaveText(expectedValues.companyCreditRating);

    // Assert first card circular chart is visible
    await expect(firstCardLocatorRow.nth(1).locator("svg")).toBeVisible();

    // Assert source-entity: visible with "Estimated" only when source is internal
    if (expectedValues.creditRatingSource.toLowerCase() === "internal") {
      await expect
        .soft(page.locator("#source-entity").first())
        .toHaveText(englishKeys.home.entityCard.details.estimatedSource);
    } else {
      await expect
        .soft(page.locator("#source-entity").first())
        .not.toBeVisible();
    }
  });

  test("card 2 - supplier financing rate card is showing properly @credit-rating @entity @integrated @us-4341", async () => {
    // Go to Ratings & Metrics section in Entity and get data from API
    const result = await responseRatingsAndMetricsData;
    const supplierFinancingCardContainer = page.locator(
      '.card-body.d-flex.flex-column.justify-content-between:has-text("Supplier Financing Rate")',
    );
    let supplierFinancingCard = await supplierFinancingCardContainer
      .first()
      .innerText();

    // tooltipText:
    //   "The estimated financing rate the supplier has the ability to borrow money with their credit rating.",
    const expected: Partial<BigNumberTwoCols> = {
      cardTitle: "Supplier Financing Rate",
      bigNumberValue: formatPercentage(result.fundingCosts.entity.value),
      numberLeftTitle: "Base Rate",
      numberLeftValue: formatPercentage(result.fundingCosts.entity.baseRate),
      numberRightTitle: "Credit Spread",
      numberRightValue: formatPercentage(
        result.fundingCosts.entity.finalSpread,
      ),
    };
    console.log("expected", expected);
    console.log("supplierFinancingCard innerText", supplierFinancingCard);
    expect(supplierFinancingCard).toContain(expected.numberLeftTitle);
    expect(supplierFinancingCard).toContain(expected.numberLeftValue);
  });

  test("card 3 - buyer leverage / materiality card is showing properly in the ratings and metrics section @credit-rating @entity @integrated @us-4341", async () => {
    const thirdCardLocator: Locator = page.locator(".card").nth(2);
    // User is now in entity card Ratings & Financials tab

    // Get data from API
    const result = responseCharacteristicsData;

    const expectedValues = {
      buyerLeverage: result.characteristics.buyerLeverage.description,
      supplierLeverage: result.characteristics.supplierLeverage.description,
    } as const;
    const thirdLocatorRow = thirdCardLocator.locator(".row");
    const compares4 = [
      expectedThirdCard.title,
      expectedValues.buyerLeverage,
      "visible",
    ];
    for (let i = 0; i < compares4.length; i++) {
      const element = compares4[i];
      const thirdLocatorRowNth = thirdLocatorRow.nth(i);
      switch (i) {
        case 0:
          await expect(thirdLocatorRowNth.locator("h5")).toHaveText(element);
          // Assert tooltip is visible
          await assertTooltipIsVisible(page, { locator: thirdCardLocator });
          break;
        case 1:
          await expect(thirdLocatorRowNth.locator("span")).toHaveText(element);
          break;
        case 2:
          await expect(thirdLocatorRowNth.locator(".row")).toBeVisible();
          break;
      }
    }
    /*** Modal */

    // Click on Buying Entity Leverage / Materiality "Show Details" button
    await thirdCardLocator
      .getByRole("button", { name: textValidate.showDetailsText })
      .click();

    // Assert modal is visible
    await assertModalIsVisible(page);

    // Assert modal title is "Buying Entity Leverage / Materiality"
    await assertModalHasRightTitle(page, expectedThirdCard.modalTitle);

    // Assert first section title and value
    const modalTestIdRow = page.getByTestId("modal").locator(".row");
    const compares5 = [
      {
        item: expectedThirdCard.modalFirstSectionTitle,
        value: expectedValues.buyerLeverage,
      },
      {
        item: expectedThirdCard.modalSecondSectionTitle,
        value: expectedValues.supplierLeverage,
      },
    ];
    console.log("Compares 5", compares5);
    for (let i = 0; i < compares5.length; i++) {
      const element = compares5[i];
      let modalTestIdRowNthSpan;
      switch (i) {
        case 0:
          modalTestIdRowNthSpan = modalTestIdRow.nth(i + 1).locator("span");
          break;
        case 1:
          modalTestIdRowNthSpan = modalTestIdRow.nth(i + 3).locator("span");
          break;
      }
      if (modalTestIdRowNthSpan) {
        await expect(modalTestIdRowNthSpan.first()).toHaveText(element.item);
        await expect(modalTestIdRowNthSpan.nth(1)).toHaveText(element.value);
      }
    }
    // Close modal
    await closeModalInsideEntityCard(page);
  });

  // /**
  //  * Card 8 - DEI !!!!keep in this order !!!!
  //  */
  test("card 8 - dei card is showing properly @entity @integrated @us-5374 @tc-5559", async () => {
    const cardLocator = page.locator(".card").nth(7);
    const cardLocatorC6 = cardLocator.locator(".col-6");
    const leftSideLocator = cardLocatorC6.first();
    const rightSideLocator = cardLocatorC6.nth(1);

    const result = responseDetailsData;

    // tooltipText: "DEI score is a score that measures a company’s",
    const expected = {
      modalFirstLinkTxt: "More Information",
      modalImgLabel: "Powered by",
      modalParagraphContent:
        "Would you like to explore in-depth details about the company's DEI rating? Take a look at the sample report or find out more information.",
      modalPdfLinkTxt: "Sample Report",
      modalTitle: "DEI",
      title: "DEI",
    } as const;
    console.log("expected", expected);
    // Assert third card title
    await expect(cardLocator.locator("h5")).toHaveText(expected.title);

    // Assert tooltip is visible
    await assertTooltipIsVisible(page, { locator: cardLocator });

    // Assert level
    await expect
      .soft(leftSideLocator)
      .toHaveText(result.denominatorScoreLabel ?? "N/A");

    /**
     * Right side
     */

    // Woman Owned Business
    const compares6 = [
      {
        title: "Women-Owned",
        value: formatBooleanOrNull(result.supplierWomanOwnedBusiness),
      },
      {
        title: "Ethnic-Minority-Owned",
        value: formatBooleanOrNull(result.supplierEthnicMinorityOwnedBusiness),
      },
      {
        title: "Veteran-Owned",
        value: formatBooleanOrNull(result.supplierVeteranOwnedBusiness),
      },
    ];
    console.log("Compares 6", compares6);
    const rightSideLocatorC4 = rightSideLocator.locator(".col-4");
    for (let i = 0; i < compares6.length; i++) {
      const element = compares6[i];
      const rightSideLocatorC4Nth = rightSideLocatorC4.nth(i);
      await expect(rightSideLocatorC4Nth.locator("span").first()).toHaveText(
        element.title,
      );
      await expect(rightSideLocatorC4Nth.locator("span").nth(1)).toHaveText(
        element.value,
      );
    }
    // *** Modal ***/

    // Open modal
    const cardLocatorBtn = cardLocator.getByRole("button", {
      name: textValidate.showDetailsText,
    });
    await cardLocatorBtn.click();

    // Assert modal is visible
    await assertModalIsVisible(page);

    // Assert modal title is "Buying Entity Leverage / Materiality"
    await assertModalHasRightTitle(page, expected.modalTitle);
    const modalTestId = page.getByTestId("modal");
    const modalTestIdP = modalTestId.locator("p");
    const modalTestIdDiv = modalTestId.locator("div");
    const modalTestIdImg = modalTestId.getByRole("img");
    const modalTestIdLink = modalTestId.getByRole("link");
    await expect(modalTestIdP.first()).toHaveText(
      expected.modalParagraphContent,
    );
    await expect(
      modalTestIdDiv.getByText(expected.modalImgLabel),
    ).toBeVisible();
    await expect(modalTestIdImg.nth(1)).toBeVisible();
    await expect(modalTestIdLink).toHaveText(expected.modalPdfLinkTxt);
    // Close modal
    await closeModalInsideEntityCard(page);
    await page.locator(locators.entityCard.closeButton).click();
  });

  /**
   * ESG Rating Card
   */
  test("card 7 - esg rating card is showing properly @credit-rating @entity @integrated @us-4341 @tc-5559", async () => {
    const cardLocator = page.locator(".card").nth(6);

    goToEntityCardEntity(page, given.entityName2);

    // Go to Ratings & Metrics section in Entity and get data from API
    const [response] = await Promise.all([
      waitForESGFromApi(page),
      goToRatingsAndMetrics(
        page,
        { isFromHome: false, entityName: given.entityName2 },
        false,
      ),
    ]);

    const result = await response.json();

    // *** Expected values */
    // cardTitleTooltip: "Environmental, social, and corporate governance score taking environmental issues, social issues, and corporate governance issues into account.",
    const expected = {
      cardTitle: "ESG Rating",
    } as const;
    console.log("expected", expected);
    // For charts
    const esgRatingLabelNoSpace =
      result.ratingLabel?.replace(/\s/g, "") ?? "N/A";

    // Assert card title
    await expect(cardLocator.locator("h5")).toHaveText(expected.cardTitle);

    // Assert level

    // letter-grade-big-letter
    const letterGradeNth = page.locator(".grade-big-letter").nth(2);
    await expect(letterGradeNth).toHaveText(result.rating ?? "N/A");

    // Assert circular chart
    const cardLocatorRowNth1 = cardLocator.locator(".row").nth(1);
    await expect(cardLocatorRowNth1.getByRole("img")).toBeVisible();

    console.log("** esgRatingLabelNoSpace", esgRatingLabelNoSpace);
    const arcText = page.locator(".arc-circle-text");
    const arcTextNth2 = arcText.nth(2);
    await expect(arcTextNth2).toHaveText(esgRatingLabelNoSpace ?? "N/A");
  });
});
