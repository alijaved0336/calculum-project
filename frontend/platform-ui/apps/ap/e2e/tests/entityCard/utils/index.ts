/**
 * @fileoverview
 * Utility functions and constants for Entity Card E2E tests.
 *
 * This module provides helper functions to interact with the Entity Card UI in Playwright tests,
 * such as navigating to specific tabs, handling modals, formatting values, and working with
 * details sections like terms and spend tabs. It also imports shared utilities and localization keys.
 *
 * Functions:
 * - goToEntityTab: Navigates to a specified tab in the Entity Card page.
 * - goToSpendTab: Navigates to a specified spend tab by name.
 *
 * Constants:
 * - termsSectionVariants: Contains configuration for different terms sections in the details view.
 *
 * Dependencies:
 * - Playwright's Page, Locator, Response, and expect.
 * - Utility functions from ../../utils and ../../utils/Utils.
 * - English localization keys from the main application.
 *
 * Usage:
 * Import and use these utilities in E2E test files for the Entity Card feature to reduce code duplication
 * and improve test readability and maintainability.
 */


import { Locator, Page, Response, expect } from "@playwright/test";
import { StringUtils, isUndefined } from "../../utils";
import {
  assertModalIsHidden,
  assertModalIsVisible,
  formatNumberWithSign,
  formatPercentage,
  goToEntityCardEntity,
  goToHomeSection,
} from "../../utils/Utils";
import englishKeys from "@ada/design-system/locales/languages/en.json";

/**
 * Go to tab given its name in the Entity page
 * @param page {Page}
 */
export async function goToEntityTab(page: Page, tabName: string) {
  console.log(`Going to ${tabName} tab...`);

  // Click on All Spends tab
  await page.getByText(tabName).click();

  console.log(`Successfully in ${tabName} tab.`);
}

/**
 * Opportunity tab
 */

/**
 * Go to Spend tab given a spend name
 * @param page {Page}
 * @param spendName {string}
 */
export async function goToSpendTab(page: Page, spendName: string) {
  console.log("Going to Spend tab...");

  // Click on Spend tab
  await page.getByRole("tab", { name: spendName }).click();

  console.log("Successfully in " + spendName + " tab.");
}

/*** Details section ***/
// Terms section
export const termsSectionVariants = {
  contractual: {
    sectionTitle: "Contractual",
    sectionKey: "contractualTerms",
  },
  proposed: {
    sectionTitle: "Opportunity",
    sectionKey: "proposedTerms",
  },
  harmonization: {
    sectionTitle: "Harmonization",
    sectionKey: "harmonization",
  },
  sectionType: "term",
};

// Terms strategies section
export const termsStrategiesSectionVariants = {
  termStrategy: {
    financingStrategy: {
      sectionTitle: "Financing (Cost Positive)",
      sectionKey: "financingStrategy",
    },
    payOnTerms: {
      sectionTitle: "Pay on Terms",
      sectionKey: "payOnTermsStrategy",
    },
    industryRegionStandard: {
      sectionTitle: "Industry / Region Standard",
      sectionKey: "industryRegionStandardStrategy",
    },
    supplierStandard: {
      sectionTitle: "Supplier Standard",
      sectionKey: "supplierStandardStrategy",
    },
    peerGroupStandard: {
      sectionTitle: "Peer Group Standard",
      sectionKey: "peerGroupAvgStrategy",
    },
    buyerStandard: {
      sectionTitle: "Buyer Standard",
      sectionKey: "buyerStandardStrategy",
    },
    cashDiscount: {
      sectionTitle: "Cash Discount Conversion",
      sectionKey: "cashDiscountConversionStrategy",
    },
    parentSupplierMax: {
      sectionTitle: "Parent / Supplier Max",
      sectionKey: "parentSupplierMaxStrategy",
    },
    scfStandardStrategy: {
      sectionTitle: "SCF Peer Standard",
      sectionKey: "scfStandardStrategy",
    },
    regulatoryTermsStrategy: {
      sectionTitle: "Regulatory Terms",
      sectionKey: "regulatoryTermsStrategy",
    },
  },
  sectionType: "termStrategy",
};

/*** Details section - Info Cards ***/
export const infoCardVariants = {
  harmonizationGroup: {
    cardTitle: "Harmonization Group",
    cardKey: "harmonizationGroup",
  },
  aplicableStrategies: {
    cardTitle: "Applicable Strategies",
    cardKey: "applicableStrategies",
  },
  changeInTerms: {
    cardTitle: "Payment Terms Change",
    cardKey: "changeInTerms",
  },
  groupAssigned: {
    cardTitle: "Group Assigned",
    cardKey: "groupAssigned",
  },
  groupBehavior: {
    cardTitle: "Group Behavior",
    cardKey: "groupBehavior",
  },
  mainIndustry: {
    cardTitle: "Main Industry",
    cardKey: "mainIndustry",
  },
  mainRegion: {
    cardTitle: "Main Region",
    cardKey: "mainRegion",
  },
  numberOfOccurrences: {
    cardTitle: "Number of Occurrences",
    cardKey: "numberOfOccurrences",
  },
  fundingCost: {
    cardTitle: "Supplier Financing Rate (Cost of Debt)",
    cardKey: "fundingCost",
  },
  financingRate: {
    cardTitle: "Early Payment Rate",
    cardKey: "financingRate",
  },
  waccPre: {
    cardTitle: "WACC (Before Tax)",
    cardKey: "waccPre",
  },
  waccPost: {
    cardTitle: "WACC (After Tax)",
    cardKey: "waccPost",
  },
  currentDiscount: {
    cardTitle: "Current Discount",
    cardKey: "currentDiscount",
  },
  conditionApplied: {
    cardTitle: "Condition Applied",
    cardKey: "conditionApplied",
  },
  spendLinesInGroup: {
    cardTitle: "Spend Lines in Group",
    cardKey: "spendLinesInGroup",
  },
  similarity: {
    cardTitle: "Similarity Rate",
    cardKey: "similarity",
  },
  suppliersInGroup: {
    cardTitle: "Suppliers in Group",
    cardKey: "supplierLinesInGroup",
  },
};

/**
 * Retrieve info cards from API
 */
export async function getInfoCards(
  page: Page,
  {
    entityName,
    entityType,
    entityIndex,
    sectionKey,
    sectionTitle,
    sectionType,
  }: {
    entityName: string;
    entityType: string;
    entityIndex?: number;
    programName: string;
    sectionKey: string;
    sectionTitle: string;
    sectionType: string;
  },
): Promise<Array<any> | undefined> {
  await goToHomeSection(page);

  console.log("Retrieving info cards for " + entityName + " ...");

  let response: Response | null = null;

  if (
    entityType !== "parent" &&
    entityType !== "supplier" &&
    entityType !== "spend"
  ) {
    console.log("Invalid entity type: " + entityType);
    return;
  }

  // The payment-terms-opportunity chart is fetched when the entity card opens.
  // On a cold session the very first open occasionally does not fire that request
  // within a reasonable window, while re-opening the card reliably does (that is
  // exactly why this used to only pass on a whole-test Playwright retry). Re-open
  // the card in-process so a single test attempt self-heals.
  const paymentTermsOpportunityUrl =
    "**/chart/payment-terms-opportunity/" + entityType;
  const waitForChart = () =>
    page.waitForResponse(paymentTermsOpportunityUrl, { timeout: 30000 });

  const openEntityAndCaptureChart = async (): Promise<Response> => {
    if (entityType === "spend") {
      await goToEntityCardEntity(page, entityName, entityIndex ?? 0);

      console.log("Going to first spend tab...");

      const [chartResponse] = await Promise.all([
        waitForChart(),
        page.getByRole("tab", { name: "Spend 1" }).click(),
      ]);
      return chartResponse;
    }

    const [chartResponse] = await Promise.all([
      waitForChart(),
      goToEntityCardEntity(page, entityName, entityIndex ?? 0),
    ]);
    return chartResponse;
  };

  const maxOpenAttempts = 2;
  for (let attempt = 1; attempt <= maxOpenAttempts; attempt++) {
    try {
      response = await openEntityAndCaptureChart();
      break;
    } catch (error) {
      if (attempt === maxOpenAttempts) {
        throw error;
      }
      console.log(
        `payment-terms-opportunity/${entityType} not received on open attempt ` +
          `${attempt}; reloading the SPA and re-opening entity card...`,
      );
      // A same-session re-open is not enough: the chart only fires reliably after a
      // full SPA reload (that is why the whole-test Playwright retry, with its fresh
      // context, always recovered). Reload to reset the SPA before re-opening.
      await page.goto("/");
      await page
        .waitForSelector(".loading-modal", { state: "detached" })
        .catch(() => {});
      await goToHomeSection(page);
    }
  }

  const result = await response.json();

  // User is now in entity card Opportunity tab
  // All Spends tab is selected

  // Show terms details
  if (sectionType === termsSectionVariants.sectionType) {
    await showTermsDetails(page, sectionTitle);

    console.log("Searching for term: " + sectionKey);

    const term = result.terms.find(
      ({ key }: { key: string }) => key === sectionKey,
    );

    if (term === undefined) {
      console.log("Term not found. Exiting...");
      return;
    }

    return term.infoCards;
  }
  // Show strategy details
  // if (sectionType === termsStrategiesSectionVariants.sectionType) {
  else {
    await showStrategyDetails(page, { strategyName: sectionTitle });

    console.log("Searching for strategy: " + sectionKey);

    const strategy = result.strategies.find(
      ({ key }: { key: string }) => key === sectionKey,
    );

    if (strategy === undefined) {
      console.log("Strategy not found. Exiting...");
      return;
    }

    return strategy.infoCards;
  }
}

/**
 * Show terms details
 *
 * @param page {Page}
 * @param termName {string}
 * @returns Promise<void>
 */
export async function showTermsDetails(
  page: Page,
  termName: string,
): Promise<void> {
  // Assert Details section is showing when clicking on the bar chart
  await page
    .locator(".charts-side")
    .getByText(termName, { exact: true })
    .click();
}

/**
 * Show strategy details. If isUnused is true, it will click on the Unused Strategies tab.
 *
 * @param page {Page}
 * @param params {object}
 * @returns Promise<void>
 */
export async function showStrategyDetails(
  page: Page,
  params: { strategyName: string },
) {
  const { strategyName } = params;

  await page
    .locator("span")
    .getByText("Unused, Disabled or Unavailable Strategies", { exact: true })
    .click();

  // Assert Details section is showing when clicking on the bar chart
  await page
    .locator(".charts-side")
    .getByText(strategyName, { exact: true })
    .click();
}

/**
 * Asserts the change in terms card on the page.
 *
 * @param page {Page}
 * @param cardTitle {string}
 * @returns Promise<void>
 */
export async function assertInfoCardTitle(
  page: Page,
  cardTitle: string,
): Promise<void> {
  console.log("Asserting card title: " + cardTitle + " ...");

  await expect
    .soft(
      page
        .locator(".info-side")
        .locator(".custom-card")
        .filter({
          has: page.getByRole("heading", { name: cardTitle }),
        }),
    )
    .toBeVisible();
}

/**
 * Asserts the change in terms card on the page.
 *
 * @param page The page to assert the card on.
 * @param infoCards The array of info cards to search for the change in terms card.
 * @param expectedValue The expected value to assert against the change in terms card.
 * @returns Promise<void>
 */
export async function assertSignedIntegerValueCard(
  page: Page,
  infoCards: Array<any>,
  cardTitle: string,
  keyValue: string,
): Promise<void> {
  await assertInfoCardTitle(page, cardTitle);

  // Get value from API response
  const receivedKeyValue = infoCards.find(({ key }) => key === keyValue);

  expect(receivedKeyValue, "Info card data not found").toBeDefined();

  if (isUndefined(receivedKeyValue)) {
    return;
  }

  const receivedValue: number = receivedKeyValue.value;

  console.log("(assertSignedIntegerValueCard) receivedValue: " + receivedValue);

  let receivedValueWithSign = formatNumberWithSign(receivedValue) ?? "N/A";

  await expect
    .soft(
      page
        .locator(".info-side")
        .locator(".custom-card")
        .filter({
          has: page.getByRole("heading", { name: cardTitle }),
        })
        .locator(".col-12")
        .nth(1),
    )
    .toHaveText(receivedValueWithSign);
}

/**
 * Assert card with percentage value
 *
 * @param page {Page}
 * @param infoCards {Array<any>}
 * @param cardTitle {string}
 * @param keyValue {string}
 * @returns Promise<void>
 */
export async function assertPercentageValueCard(
  page: Page,
  infoCards: Array<any>,
  cardTitle: string,
  keyValue: string,
): Promise<void> {
  assertInfoCardTitle(page, cardTitle);

  const receivedKeyValue = infoCards.find(({ key }) => key === keyValue);

  expect(receivedKeyValue, "Info card data not found").toBeDefined();

  const receivedValue: number | null = receivedKeyValue
    ? receivedKeyValue.value
    : null;

  console.log("(assertPercentageValueCard) receivedValue: " + receivedValue);

  // Assert card value
  const receivedValueWithPercentage = formatPercentage(receivedValue) ?? "N/A";

  await expect
    .soft(
      page
        .locator(".info-side")
        .locator(".custom-card")
        .filter({
          has: page.getByRole("heading", { name: cardTitle }),
        })
        .locator(".col-12")
        .nth(1),
    )
    .toContainText(receivedValueWithPercentage);
}

/**
 * Asserts card with cash flow opportunity value
 *
 * @param {Page} page
 * @param {Array<any>} infoCards
 * @returns {Promise<void>}
 */
export async function assertCashFlowOpportunityCard(
  page: Page,
  infoCards: Array<any>,
): Promise<void> {
  assertInfoCardTitle(page, "Cash Flow Opportunity");

  const receivedKeyValue = infoCards.find(
    ({ key }) => key === "cashFlowOpportunity",
  );

  expect(receivedKeyValue, "Info card data not found").toBeDefined();

  const receivedValue: number | null = receivedKeyValue
    ? receivedKeyValue.value
    : null;

  console.log(
    "(assertCashFlowOpportunityCard) receivedValue: " + receivedValue,
  );

  console.log("Asserting cash flow opportunity card value ...");

  const receivedValueFormatted =
    receivedValue || receivedValue === 0
      ? StringUtils.formatBigNumbers(receivedValue)
      : "N/A";

  await expect
    .soft(
      page
        .locator(".info-side")
        .locator(".custom-card")
        .filter({
          has: page.getByRole("heading", { name: "Cash Flow Opportunity" }),
        })
        .getByRole("paragraph"),
    )
    .toHaveText(receivedValueFormatted);
}

/**
 * Asserts the API, title and value of cards where the value is a natural number.
 *
 * @param {Page} page
 * @param {Array<any>} infoCards
 * @param {string} cardTitle
 * @param {string} keyValue
 * @returns {Promise<void>}
 */
export async function assertNaturalValueCard(
  page: Page,
  infoCards: Array<any>,
  cardTitle: string,
  keyValue: string,
): Promise<void> {
  assertInfoCardTitle(page, cardTitle);

  console.log("Asserting natural value card value ...");

  // Get value from API response
  const receivedKeyValue = infoCards.find(({ key }) => key === keyValue);

  console.log("(assertNaturalValueCard) receivedKeyValue: " + receivedKeyValue);

  const receivedValue: number | null = receivedKeyValue
    ? receivedKeyValue.value
    : null;

  // Assert card value
  await expect
    .soft(
      page
        .locator(".info-side")
        .locator(".custom-card")
        .filter({
          has: page.getByRole("heading", { name: cardTitle }),
        })
        .getByRole("paragraph"),
    )
    .toHaveText(
      receivedValue || receivedValue === 0 ? receivedValue.toString() : "N/A",
    );
}

/**
 * Assert card with string values
 *
 * @param page {Page}
 * @param infoCards {Array<any>}
 * @param cardTitle {string}
 * @param keyValue {string}
 * @returns Promise<void>
 */
export async function assertStringValueCard(
  page: Page,
  infoCards: Array<any>,
  cardTitle: string,
  keyValue: string,
) {
  assertInfoCardTitle(page, cardTitle);

  console.log("Asserting string value card value ...");

  const receivedValue = infoCards.find(({ key }) => key === keyValue);

  expect(receivedValue, "Info card data not found").toBeDefined();

  const expectedValue = receivedValue?.value.toLowerCase().slice(0, 5) ?? "N/A";

  // Assert card value
  const showingValue = await page
    .locator(".info-side")
    .locator(".custom-card")
    .filter({
      hasText: cardTitle,
    })
    .getByRole("paragraph")
    .innerText();

  // Only assert the first 5 characters of the value
  expect.soft(showingValue.toLowerCase().slice(0, 5)).toBe(expectedValue);
}

/*** END Details section - Info Cards ***/

/*** Details section - Feedback Rating ***/

/**
 * Assert negotiation status in Entity Card list given entity name.
 *
 * @param page {Page}
 * @param entityName {string}
 */
export async function assertNegotiationStatusECList(
  page: Page,
  entityName: string,
  expectedStatus: string,
) {
  const search = page.getByPlaceholder(
    englishKeys.home.components.navbar.search,
  );

  // Type company name
  await search.clear();
  await search.fill(entityName);

  // Press Enter
  await search.press("Enter");

  // Wait for URL to be /home/entity_card
  await page.waitForURL("**/home/entity_card");

  await expect(
    page.locator(".card").first().getByText(expectedStatus),
  ).toBeVisible();
}

/*** END Details section - Feedback Rating ***/

/**
 * END Opportunity tab
 */

/**
 * Inside an entity card open the kebab menu in the top right corner
 * and click on the given option
 *
 * Use new fn in global utils
 *
 * @param page {Page}
 * @param option {string}
 * @returns Promise<void>
 */
export async function clickKebabMenuOption(
  page: Page,
  option: string,
): Promise<void> {
  // Open kebab menu
  await page.locator("#options-btn").click();

  switch (option) {
    case "Notes":
      await page.getByText("Notes").click();
      break;
    case "Request a change":
      await page.locator('[data-testid="entity-card-request-change-menu-item"]').click();
      break;
    case "Download PDF":
      await page.locator('[data-testid="entity-card-download-pdf-menu-item"]').click();
      break;
    default:
      console.log("Option not found");
  }
}

/**
 * Make a new request to change the data
 *
 * @param page {Page}
 * @param options {{msg: string}}
 * @returns Promise<void>
 */
export async function reqDataChange(
  page: Page,
  options?: Partial<{
    msg: string;
  }>,
): Promise<void> {
  // Set default values
  const { msg = "" } = options || {};

  // Click on the three dots menu icon
  await clickKebabMenuOption(page, "Request a change");

  // Assert modal is visible
  await assertModalIsVisible(page);

  // Fill the msg textarea
  await page.getByPlaceholder("Enter a description ...").fill(msg);

  // Assert Send button is visible
  await expect(page.getByRole("button", { name: "Send" })).toBeVisible();

  /*
   * Assert request is sent successfully
   */
await Promise.all([
  page.waitForResponse(
        (response: any) =>
          response.url().endsWith("/api/change_requests") &&
          response.ok(),
      ),
      page.getByRole("button", { name: "Send" }).click(),
])
  // // Start listening for API response
  // const responsePromise = page.waitForResponse("**/api/change_requests");

  // // Send request
  // await page.getByRole("button", { name: "Send" }).click();

  // // Assert API response is OK
  // const response = await responsePromise;
  // expect(response.ok()).toBeTruthy();

  // Assert modal is closed when clicking on Send button
  // await assertModalIsHidden(page);

  // Assert notification message is shown
  const msgRequest=page.getByText(englishKeys.home.entityCard.reqDataChanges.reqWasSaved)
  await expect(msgRequest.first()).toBeVisible();

  // Note: We verify the toast appears to confirm the action succeeded.
  // The toast will auto-dismiss, but we don't assert on the timing as it's a non-critical UI detail
  // and the timing may vary based on toast configuration and system performance.
}

export async function cardInEntityOverview(
  page: Page,
  index: number,
): Promise<Locator> {
  return page.locator(".card-body").nth(index);
}

// *** API Wait Functions ***

/**
 *
 * @param {Page} page
 * @return {Promise<>} A promise that resolves to the response object containing the analyzed programs.
 */
export async function waitForCountryRatingFromApi(
  page: Page,
): Promise<Response> {
  return page.waitForResponse(
    (response) =>
      response.url().endsWith("/chart/country-rating") && response.ok(),
  );
}

/**
 *
 * @param {Page} page
 * @return {Promise<>} A promise that resolves to the response object containing the analyzed programs.
 */
export async function waitForCreditScoreFromApi(page: Page): Promise<Response> {
  return page.waitForResponse(
    (response) => response.url().endsWith("/credit-score") && response.ok(),
  );
}

/**
 *
 * @param {Page} page
 * @return {Promise<Response>}
 */
export async function waitForDataDepthRatingFromApi(
  page: Page,
): Promise<Response> {
  return page.waitForResponse(
    (response) =>
      response.url().endsWith("/chart/data-depth-rating") && response.ok(),
  );
}

/**
 *
 * @param {Page} page
 * @return {Promise<Response>}
 */
export async function waitForDetailFinancialMetricsFromApi(
  page: Page,
): Promise<Response> {
  return page.waitForResponse(
    (response) =>
      response.url().endsWith("/chart/detail-financial-metrics") &&
      response.ok(),
  );
}

/**
 *
 * @param {Page} page
 * @return {Promise<Response>}
 */
export async function waitForIndustryRatingFromApi(
  page: Page,
): Promise<Response> {
  return page.waitForResponse(
    (response) =>
      response.url().endsWith("/chart/industry-rating") && response.ok(),
  );
}

/**
 *
 * @param {Page} page
 * @return {Promise<Response>}
 */
export async function waitForESGFromApi(page: Page): Promise<Response> {
  return page.waitForResponse(
    (response) => response.url().endsWith("/ESG") && response.ok(),
  );
}

/**
 *
 * @param {Page} page
 * @return {Promise<Response>}
 */
export async function waitForDetailFromApi(page: Page) {
  return page.waitForResponse(
    (response) => response.url().endsWith("/detail") && response.ok(),
  );
}

/**
 * Waits for the response from the API endpoint /api/analyze/get_spends_by_program_and_provider.
 *
 * @param {Page} page
 * @return {Promise<Response>}
 */
export async function waitForSpendsByProgramAndProviderFromApi(
  page: Page,
): Promise<Response> {
  return page.waitForResponse(
    (response) =>
      response.url().endsWith("/analyze/get_spends_by_program_and_provider") &&
      response.ok(),
  );
}

/**
 * Waits for the response from the API endpoint /entity-card/negotiation-status/update.
 *
 * @param {Page} page
 * @return {Promise<Response>}
 */
export async function waitForNegotiationStatusUpdateFromApi(
  page: Page,
): Promise<Response> {
  return page.waitForResponse(
    (response) =>
      response.url().endsWith("/entity-card/negotiation-status/update") &&
      response.ok(),
  );
}

// *** END API Wait Functions ***

/**
 * Navigate to an entity card and click on a card that has the "Parent" badge.
 * This function searches for the entity, waits for cards to load, and verifies that:
 * 1. The card has the "parent" badge (span.type-company)
 * 2. The name in the tooltip matches the search term (case-insensitive comparison)
 * 3. The card doesn't have "Parent:" label (which only suppliers have)
 *
 * @param {Page} page - The Playwright page object
 * @param {string} entityName - The name of the parent entity to find (case-insensitive)
 * @returns {Promise<void>}
 */
export async function goToParentEntityCard(
  page: Page,
  entityName: string,
): Promise<void> {
  console.log(`Searching for parent entity: ${entityName}`);

  const search = page.getByPlaceholder(
    englishKeys.home.components.navbar.search,
  );

  // Clear and type entity name
  await search.clear();
  await search.fill(entityName);

  // Press Enter and wait for API response
  await Promise.all([
    page.waitForResponse((response) =>
      response.url().endsWith("/api/entity-card/get-entity-cards"),
    ),
    search.press("Enter"),
  ]);

  // Wait for cards to be visible
  await page.waitForSelector(".card-body", { state: "visible" });

  console.log("Cards loaded. Looking for parent card with exact name match...");

  // Find all card containers (not just card-body)
  const cardContainers = await page.locator(".module-entity-cards").all();

  console.log(`Found ${cardContainers.length} cards total`);

  // Find the parent card that matches all criteria
  let parentCard = null;
  let parentCardIndex = -1;
  
  for (let i = 0; i < cardContainers.length; i++) {
    const card = cardContainers[i];
    
    // Check 1: Verify the card has the "parent" badge
    const parentBadge = card.locator("span.type-company");
    const badgeExists = await parentBadge.count() > 0;
    
    if (badgeExists) {
      const badgeText = await parentBadge.textContent();
      console.log(`Card ${i} - Badge text: "${badgeText}"`);
      
      if (badgeText?.toLowerCase().trim() === "parent") {
        // Check 2: Verify the name in the tooltip matches exactly (case-insensitive)
        const nameElement = card.locator("span.name.current-name");
        const titleAttribute = await nameElement.getAttribute("title");
        
        console.log(`Card ${i} - Name from title: "${titleAttribute}"`);
        
        if (titleAttribute?.toLowerCase() === entityName.toLowerCase()) {
          // Check 3: Verify it doesn't have "Parent:" label (suppliers have this)
          const cardBody = card.locator(".card-body");
          const cardText = await cardBody.textContent();
          const hasParentLabel = cardText?.includes("Parent:");
          
          console.log(`Card ${i} - Has "Parent:" label: ${hasParentLabel}`);
          
          if (!hasParentLabel) {
            parentCard = cardBody;
            parentCardIndex = i;
            console.log(`✓ Found matching parent card at index ${i}`);
            break;
          }
        }
      }
    }
  }

  if (parentCard === null) {
    console.error("No parent card found matching all criteria!");
    throw new Error(
      `Could not find a parent card with exact name "${entityName}". ` +
      `Please verify the entity name and that it appears as a parent in the search results.`
    );
  }

  // Click on the parent card and wait for the entity card to open
  await Promise.all([
    page.waitForResponse((response) =>
      response.url().includes("/chart/payment-terms-opportunity/parent"),
    ),
    parentCard.click(),
  ]);

  console.log(`✓ Successfully navigated to parent entity card: ${entityName}`);
}
