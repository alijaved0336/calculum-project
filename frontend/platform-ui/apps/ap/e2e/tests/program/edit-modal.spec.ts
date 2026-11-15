/**
 * Author: Diego Mas
 */
import { expect, test } from "@playwright/test";
import {
  changeToSpendFile,
  waitElementVisibleAndClick} from "../utils/Utils";
import { locators } from "../utils/locators";

const companyName = "Company Test";
const spendFileName = "PageroFull_20230308_2.xlsx (Ver. 1)";
import Api2 from "../utils/APi2";

test.describe.serial(
  "Test Show Confirm Modal Program with Plans @integrated @program @prq",
  async () => {


test.beforeEach(async ({ page }) => {
  

    
      await page.goto("/");
    
      // Wait for loading modal to be hidden
      await expect(page.locator(".loading-modal")).toBeHidden();
    
      // Change spend file
      await changeToSpendFile(page, spendFileName);
    });

    // PENDING A PRODUCT DECISION - do not re-enable as it stands.
    //
    // The modal this test names is `showConfirmDeleteProgramWithPlansModal`,
    // raised by `setDeleteOptions()` from the program options menu. That entry
    // is rendered under `v-if="false"` in
    // apps/ap/src/modules/home/analyze/components/AnalyzeProgramOptions.vue,
    // so deleting a program is unreachable from the UI and the modal can no
    // longer be opened by a user.
    //
    // The body below could not have caught that either: `.buttonLeft` is dead
    // CSS that no element carries, `waitElementVisibleAndClick` is called
    // without await, and every statement sits inside a try/catch that swallows
    // the failure and logs "no options to validate". The test holds no
    // assertion and cannot fail.
    //
    // Re-enabling it means first deciding whether program deletion comes back.
    // If it does, the test has to be rewritten against the options menu:
    // open the kebab, click Delete on a program that has plans, assert the
    // modal lists those plans, click Cancel, assert the program is still
    // listed.
    test.skip("Show and hide confirmation modal: @integrated @program @prq @pending", async ({ page }) => {
  
      waitElementVisibleAndClick(page, locators.sidebar.program);
      
      try {
        
      const [responsePrograms] = await Promise.all([
        page.waitForResponse(
          responsePrograms =>
            responsePrograms
              .url()
              .includes("/analyze_programs") &&
            responsePrograms.ok()
        )
      ]);

      const resultResponse = JSON.parse(await responsePrograms.text());
      const programsfromAPI = resultResponse["hydra:member"].reverse();
      const getProgramsCards = page.locator(".buttonLeft");

      // console.log("getProgramsCards", await getProgramsCards.count())
      // console.log("programsfromAPI",programsfromAPI)
      // getProgramsCards.nth(0).click()
      // await page.pause()
     
      for (let i = 0; i < programsfromAPI.length; i++) {       

        if (programsfromAPI[i].plan.length > 0) {
          // console.log("programsfromAPI",programsfromAPI[i].plan.length)
          await getProgramsCards.nth(i).click()
          waitElementVisibleAndClick(page, "button:has-text('Cancel')");
        }
      }

    } catch (error) {
      console.log("no options to validate")   
    }
     
    });
  }
);
