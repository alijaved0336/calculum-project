/***
 *
 * TC-9434 The  Hbl Power Systems Limited company has the correct Peer Group Standard cluster's values.
 */

/**
 *
 *
 *   @company = "Company Test".
 *   @Spendfile = "Pagero_Full_Clusters.xlsx (Ver. 1)" //Already existent, and additionally attached here.
 *   @program = "Main Program." //Created by default.
 *   @user = "joel+testnotadmin@calculum.ai"
 *   @entity = "Hbl Power Systems Limited"
 *
 */

import { test, expect, Page } from "@playwright/test";
import {
  changeToSpendFile,
  ensureDefaultLogin,
  goToEntityCardEntityExactFull,
  loginAsSuperAdmin} from "../utils/Utils";
import { locators } from "../utils/locators";
import { infoCardVariants } from "../entityCard/utils";

import Api2 from "../utils/APi2";

const entityName = "Hbl Power Systems Limited";

test.beforeEach(async ({ page }) => {
  
  await page.goto("/");
  await page.waitForSelector(".loading-modal", { state: "detached" });
  await loginAsSuperAdmin(page);
  await changeToSpendFile(page, "Pagero_Full_Clusters.xlsx (Ver. 1)");
});

test("Minimum Occurrences Test", async ({ page }) => {


  await Promise.all([
    page.waitForResponse(
      response =>
        response.url().includes("/api/spendfile/strategies/allowed-status") &&
        response.ok()
    ),
    page.locator(locators.sidebar.settings).click()
  ]);

  //wait to open #show-strategies-section
  await page.waitForTimeout(3500);

  await page.locator("#more-settings-peerGroupAvgStrategy").click();

  let currentValue = await page
    .locator("#input-minimum-occurrences-peerGroupAvgStrategy")
    .inputValue();
  console.log("current value: ", currentValue);

  // The strategy applies to a cluster only while the cluster reaches the
  // configured minimum, so the value written here has to stay at or below the
  // entity's own number of occurrences: above it the Peer Group Standard row
  // reads N/A and its detail panel renders no card at all, which is what the
  // original random 5-to-9999 value produced on nearly every run. The two
  // values alternate so each run performs a real write.
  const minimumOccurrences = Number(currentValue) === 5 ? 10 : 5;

  await saveValue(page, minimumOccurrences);

  // The peer group cluster is a supplier-level value: the parent card of this
  // same name shows the weighted average of its children and reads N/A, with
  // no detail cards behind it.
  await goToEntityCardEntityExactFull(page, entityName, 0, true, null, "supplier");

  // `peerGroupAvgStrategy` renders inside the collapsed "Unused Strategies"
  // block (EntityPaymentTermsStrategies.vue) whenever it is not one of the
  // entity's applied strategies, so the row is in the DOM but hidden and the
  // click just waited out its budget on a node that never becomes visible on
  // its own. Expand that block first when the row is not already showing.
  const peerGroupStrategy = page.locator("div.peerGroupAvgStrategy");

  if (!(await peerGroupStrategy.isVisible())) {
    await page
      .locator("span.text-base.font-semibold.cursor-pointer")
      .filter({ hasText: /^Unused/ })
      .first()
      .click();
  }

  await peerGroupStrategy.click();

  // CardTitleValue picks the value node's classes at runtime
  // (StrategiesComponent.getInfoCardValueClasses), so neither the card nor its
  // value can be addressed by class. Anchor the card on its heading and read
  // the paragraph holding the value, the same way assertNaturalValueCard does.
  const containerNumberOfOccurrences = page
    .locator(".info-side")
    .locator(".custom-card")
    .filter({
      has: page.getByRole("heading", {
        name: infoCardVariants.numberOfOccurrences.cardTitle,
      }),
    });

  const numberOfOccurrences = await containerNumberOfOccurrences
    .getByRole("paragraph")
    .innerText();

  console.log(
    "minimum occurrences: ",
    minimumOccurrences,
    "number of occurrences: ",
    numberOfOccurrences,
  );

  // The cluster the strategy applied has to satisfy the configured minimum.
  expect(Number(numberOfOccurrences)).toBeGreaterThanOrEqual(
    minimumOccurrences,
  );
});

async function saveValue(page: Page, value: number) {
  await page.locator("#input-minimum-occurrences-peerGroupAvgStrategy").clear();
  await page.waitForTimeout(1000);
  await page
    .locator("#input-minimum-occurrences-peerGroupAvgStrategy")
    .fill(value.toString());

  await page
    .locator("#input-minimum-occurrences-peerGroupAvgStrategy")
    .press("Enter");

  console.log("save the changes");

  await Promise.all([
    page.waitForResponse(
      response =>
        response.url().includes("/api/spendfile/strategies/allowed/update") &&
        response.ok()
    ),
    page.locator("span#save-button-for-settings").click()
  ]);
}

test.afterEach(async ({ page }) => {
  await ensureDefaultLogin(page);
});
