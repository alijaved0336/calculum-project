/**
 * @fileoverview
 * US-6089 / TC-6412: the user can set a payment terms target on a supplier
 * from the Opportunity tab of the entity card.
 *
 * Flow: open the supplier card, add a 56-day target from the Proposed Terms
 * pencil, assert the Target line renders with the value and its edit pencil,
 * then clear the target so the shared fixture is left unchanged.
 */

import { Page, expect, test } from "@playwright/test";
import {
  changeToSpendFile,
  ensureDefaultLogin,
  goToEntityCardEntityExactFull,
} from "../utils/Utils";

const SPEND_FILE_VERSION = "PageroFull_20230308_2.xlsx (Ver. 1)";
const SUPPLIER_NAME = "Microelettrica Scientifica S.P.A.";
const TARGET_VALUE = "56";
const UPDATE_ENDPOINT = "/api/analyze/update-spend-program-configurations";

function waitForTargetUpdate(page: Page) {
  return page.waitForResponse(
    (response) =>
      new URL(response.url()).pathname === UPDATE_ENDPOINT && response.ok(),
    { timeout: 120000 },
  );
}

/** The payment-terms-target modal: the open CalculumModal holding the target input. */
function targetModal(page: Page) {
  return page
    .getByTestId("modal")
    .filter({ has: page.locator("input.form-control.required") })
    .last();
}

/** Remove the entity's target through the modal's Clear button, if one is set. */
async function clearTarget(page: Page) {
  const targetLine = page.locator("#termsbars .targetTerms");

  if ((await targetLine.count()) === 0) {
    return;
  }

  await targetLine.locator(".pencil-icon-edit-target").first().click();
  const modal = targetModal(page);
  await expect(modal).toBeVisible();

  const cleared = waitForTargetUpdate(page);
  await modal.getByRole("button", { name: "Clear" }).click();
  await cleared;

  // The strategies block remounts once the SPA refetches the chart.
  await expect(page.locator("#termsbars .targetTerms")).toHaveCount(0, {
    timeout: 60000,
  });
}

test.beforeEach(async ({ page }) => {
  await ensureDefaultLogin(page);
  await page.goto("/");
  await page.waitForSelector(".loading-modal", { state: "detached" });
  await changeToSpendFile(page, SPEND_FILE_VERSION);
});

test("user can set a target payment term @entity @opportunity @us-6089 @tc-6412", async ({
  page,
}) => {
  await Promise.all([
    page.waitForResponse(
      (response) =>
        response.url().includes("/chart/payment-terms-opportunity/supplier") &&
        response.ok(),
    ),
    goToEntityCardEntityExactFull(page, SUPPLIER_NAME, 0, true, null, "supplier"),
  ]);

  // The strategy lines render skeletons while the program recalculates.
  await expect(page.locator("#termsbars .proposedTerms")).toBeAttached({
    timeout: 120000,
  });

  try {
    // A leftover target from a previous failed run would hide the add pencil.
    await clearTarget(page);

    // Add the target from the Proposed Terms line.
    await page
      .locator("#termsbars .proposedTerms .pencil-icon-add-target")
      .first()
      .click();
    const modal = targetModal(page);
    await expect(modal).toBeVisible();
    await modal.getByRole("spinbutton").fill(TARGET_VALUE);

    // On the All Spends tab every row is preselected, so Save is enabled.
    const saved = waitForTargetUpdate(page);
    await modal.getByRole("button", { name: "Save" }).click();
    await saved;

    // The Target line now renders with the value and its edit pencil.
    const targetLine = page.locator("#termsbars .targetTerms");
    await expect(targetLine).toBeAttached({ timeout: 60000 });
    await expect(targetLine.locator(".value-container")).toHaveText(
      TARGET_VALUE,
      { timeout: 60000 },
    );
    await expect(targetLine.locator(".title").first()).toContainText("Target");
    await expect(targetLine.locator(".pencil-icon-edit-target")).toHaveCount(1);
  } finally {
    // Leave the shared fixture without a target.
    await clearTarget(page);
  }
});
