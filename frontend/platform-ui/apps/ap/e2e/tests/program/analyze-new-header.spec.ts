//By Josh
import { test, expect } from "@playwright/test";
import {
  changeToSpendFile,
  ensureDefaultLogin,
  goToHomeSection,
  waitElementVisibleAndClick,
} from "../utils/Utils";
import { locators } from "../utils/locators";

import Api2 from "../utils/APi2";

test.beforeEach(async ({ page }) => {
  await ensureDefaultLogin(page);
  await changeToSpendFile(page, "Spend Contractual Value.xlsx (Ver. 3)");
});

test("Test in Analyze new header menu has new classes @ui @analyze @us-4532", async ({
  page
}) => {

  // The SPA deep-links to /home/analyze* whenever state.json carries a
  // selected program, so /home-dashboard is not a reachable precondition.
  // goToHomeSection is the canonical wait and accepts any /home/* route.
  await goToHomeSection(page);
  await waitElementVisibleAndClick(page, locators.sidebar.analyze);
  await expect(page).toHaveURL(/.*\/home\/categorize/);

  // The count used to be asserted only inside `if (topMenu > 0)`, so a
  // missing header menu logged "something is wrong" and still passed.
  await expect(page.locator("#analyze-header-menu")).toHaveCount(1);
});
