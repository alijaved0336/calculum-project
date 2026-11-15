/**
 * USER STORY 5089:
 * More details for Payment Terms and New Strategies on the bottom right tab of Entity/Opportunity
 *
 * TC 5155: TC-1 To see Suppier tab as default in Analyze/List selects Supplier and keeps selected
 * TC 5158: TC-2 To see Suppier tab as default in CF Program/Show/List selects Supplier and keeps selected
 * TC 5169: TC-3 To see fix row height in Plan/LIST
 * TC 5170: TC-4 To see fix row height in DD Program/LIST
 */

import { test, expect } from "@playwright/test";

/*** Global utils ***/
import {
  ENTITY_LEVEL_TAB,
  goToMatchSection,
  changeToSpendFile,
  goToHomeSection,
  ensureDefaultLogin
} from "../utils/Utils";

/*** Program utils */
import { AnalyzeUtils, ProgramUtils } from "../utils";
import { locators } from "../utils/locators";

const spendFileName = "PageroFull_20230308_2.xlsx (Ver. 1)";

const testParams = [
  {
    sectionName: "analyze",
    tags: "@analyze"
  },
  {
    sectionName: "program cf",
    tags: "@program"
  }
];

/**
 * Before each hook
 */

test.beforeEach(async ({ page }) => {
  await ensureDefaultLogin(page);

  await goToHomeSection(page);

  await changeToSpendFile(page, spendFileName);
});

// Iterate over each company
for (const { sectionName, tags } of testParams) {
  test(`${sectionName} section - the selected entity level is the same the user last clicked on ${tags} @integrated @us-5089 tc-5155 tc-5158 tc-5169 tc-5170`, async ({
    page
  }) => {
    /**
     * Open the List tab of the section under test and wait for its level
     * tabstrip, without touching which level is selected: the level the view
     * restores is what this test asserts.
     */
    const goToListTab = async () => {
      if (sectionName === testParams[0].sectionName) {
        // Analyze section. `isFromHome` is false because the SPA restores the
        // last visited section, so the previous step does not necessarily
        // leave the page on the home dashboard.
        await AnalyzeUtils.goToAnalyzeSection(page, { isFromHome: false });

        await page.locator(locators.analyze.list.itself).click();
      } else {
        // Program CF section. `subtab` is null so the helper opens the List
        // tab without selecting a level of its own.
        await ProgramUtils.goToProgramNameAndAction(page);

        await ProgramUtils.goToProgramListTab(page, { subtab: null });
      }

      // The level tabs are addressed by role: the other two grids stay
      // mounted behind `.hidden-grid { display: none }`, so their tabs are in
      // the DOM and a CSS lookup matches all three tabstrips at once.
      await expect(
        page.getByRole("tab", {
          name: ENTITY_LEVEL_TAB.SPEND_LINES,
          exact: true
        })
      ).toBeVisible();
    };

    /**
     * The level tab that is currently selected, by label.
     */
    const selectedLevelTab = (name: string) =>
      page.getByRole("tab", { name, exact: true, selected: true });

    await goToListTab();

    // Start from a known level. The view opens on the level this account
    // looked at last, persisted in the `ada-home` store and carried between
    // specs through `e2e/state.json`, so the starting point is picked here
    // instead of being assumed.
    await AnalyzeUtils.selectGridLevelTab(page, "Suppliers");

    await expect(selectedLevelTab(ENTITY_LEVEL_TAB.SUPPLIERS)).toBeVisible();

    // Click on Spend Line level tab
    await AnalyzeUtils.selectGridLevelTab(page, "Spends");

    await expect(selectedLevelTab(ENTITY_LEVEL_TAB.SPEND_LINES)).toBeVisible();

    // Go to Match section and back to the List tab of the section under test
    await goToMatchSection(page, false);

    await goToListTab();

    // Assert the level the user last clicked is the one restored
    await expect(selectedLevelTab(ENTITY_LEVEL_TAB.SPEND_LINES)).toBeVisible();
  });
}
