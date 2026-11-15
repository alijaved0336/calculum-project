import {expect, test} from "@playwright/test";
import translation from "@ada/design-system/locales/languages/en.json"
import {locators} from "../../utils/locators";
import {changeToProgram, changeToSpendFile, ensureDefaultLogin} from "../../utils/Utils";

const messagesNew = {
  listMessages: [
    translation.home.entityCard.strategies.payOnTermsStrategyTooltip,
    translation.home.entityCard.strategies.parentSupplierMaxStrategyTooltip,
    translation.home.entityCard.strategies.industryRegionStandardStrategyTooltip,
    translation.home.entityCard.strategies.supplierStandardStrategyTooltip,
    translation.home.entityCard.strategies.peerGroupStandardStrategyTooltip,
    translation.home.entityCard.strategies.financingStrategyTooltip,
    translation.home.entityCard.strategies.buyerStandardStrategyTooltip,
    translation.global.regulatoryTermsTooltip,
  ],
  pageWizard: 4,
};
import Api2 from "../../utils/APi2";

test.beforeEach(async ({ page }) => {
  

  await ensureDefaultLogin(page);
  await page.waitForSelector(".loading-modal", {state: "detached"});
});
test("Test for review the change on de the waterfall information @opportunity @integrated @us-11032", async ({
                                                                                                               page,
                                                                                                             }) => {
  await changeToSpendFile(page,"Pagero_ExclusionGroups.xlsx (Ver. 1)");
  console.log("go to Opportunity section");
  await page.locator(locators.sidebar.program).click();
  console.log("go to Waterfall tab");
  await page.locator("#program_waterfall").click();
  console.log("go to Waterfall Info");
  await page
    .locator(
      "#container-main-id > div.sub-main-sections.mt-4 > div.mt-5.bg-white.border-radius-8.p-4 > div:nth-child(1) > div > div > h5 > div > button",
    )
    .click();
  console.log("Review if the texts exist");
  console.log("Locate the modal");
  // Locate the modal
  const modal = page.locator(
    'div.shepherd-has-cancel-icon.shepherd-has-title.shepherd-element.shepherd-enabled[role="dialog"]',
  );
  // Wait for the modal to be visible
  await modal.waitFor({state: "visible"});
  // Locate the paragraph container
  console.log("Locate the paragraph container");
  const modalShepherdText = modal.locator(
    "div.shepherd-content div.shepherd-text",
  );
  // Locate the footer inside the modal
  const modalShepherdFooter = modal.locator(
    "div.shepherd-content footer.shepherd-footer",
  );
  // Locate the "Next" button inside the footer
  console.log("Locate the 'Next' button inside the footer");
  const nextButton = modalShepherdFooter
    .locator("button.shepherd-button", {hasText: "Next"})
    .last();
  const doneButton = modalShepherdFooter
    .locator("button.shepherd-button", {hasText: "Done"})
    .last();
  let allTexts: string[] = [];
  for (let index = 0; index < messagesNew.pageWizard; index++) {
    await page.waitForTimeout(3000)
    // Locate all paragraphs
    const paragraphs = modalShepherdText.locator("p");
    // Get the text of all paragraphs in an array
    allTexts = await paragraphs.allInnerTexts();
    if (index !== messagesNew.pageWizard - 1) {
      await nextButton.click();
    } else {
      await doneButton.click();
    }
    console.log("Wizard page-->", index);
  }
  const allTextsClean = allTexts.map((item) => item.trim());
  const messagesNewClean = messagesNew.listMessages.map((item) => item.trim());
  console.log("cant Texts Obtained-->", allTextsClean.length,
  );
  const cantEquals = messagesNewClean.filter((elemento) =>
    allTextsClean.includes(elemento),
  );
  console.log("cant Equals-->", cantEquals.length,"cant Messages-->", messagesNewClean.length);
  expect(messagesNewClean.length).toBe(cantEquals.length);
});

