import { expect, test } from "@playwright/test";

/*** Entity Card utils ***/
import {
  assertSignedIntegerValueCard,
  assertCashFlowOpportunityCard,
  getInfoCards,
  infoCardVariants,
  termsStrategiesSectionVariants
} from "../../entityCard/utils";

/*** Global utils ***/
import {
  changeToSpendFile,
  ensureDefaultLogin,
  goToHomeSection
} from "../../utils/Utils";

const programName = "test";
const spendFileName = "PageroFull_20230308_2.xlsx (Ver. 1)";

let entityName = "BARCO NV";

import Api2 from "../../utils/APi2";

test.beforeEach(async ({ page }) => {
  
  // Ensure default user is logged in
  await ensureDefaultLogin(page);
  // Change spend file
  await changeToSpendFile(page, spendFileName);
});

/**
 * Pay on terms
 */
test(`parent level - pay on terms info cards are showing properly @entity @integrated @us-5089 @tc-5139`, async ({
  page
}) => {
  // Retrieve info cards from API response
  const infoCards = await getInfoCards(page, {
    entityName,
    entityType: "parent",
    programName,
    sectionType: termsStrategiesSectionVariants.sectionType,
    sectionKey:
      termsStrategiesSectionVariants.termStrategy.payOnTerms.sectionKey,
    sectionTitle:
      termsStrategiesSectionVariants.termStrategy.payOnTerms.sectionTitle
  });

  console.log("Asserting info cards data ...");

  expect(infoCards, "infoCards should be defined").toBeTruthy();

  expect(infoCards && infoCards.length, "infoCards is empty").toBeGreaterThan(
    0
  );

  if (infoCards === undefined) {
    return;
  }

  // Change in terms
  await assertSignedIntegerValueCard(
    page,
    infoCards,
    infoCardVariants.changeInTerms.cardTitle,
    infoCardVariants.changeInTerms.cardKey
  );

  // Cash Flow Opportunity
  await assertCashFlowOpportunityCard(page, infoCards);
});
