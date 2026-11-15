import { expect, test, Page } from "@playwright/test";
import { ensureAdminLogin, ensureDefaultLogin } from "../../utils/Utils";
import { locators } from "../../utils/locators";
import { ApiWaitersUtils, SetupUtils } from "../../utils";

/**
 * Opens the Setup section, captures the strategies "allowed-status" response and
 * returns the supplierStandardStrategy entry ({ key, isAllowed, calculationMethod, ... }).
 */
async function openSetupAndGetSupplierStrategy(page: Page): Promise<any> {
  const [statusResponse] = await Promise.all([
    ApiWaitersUtils.waitForSpendFileStrategiesAllowedStatus(page),
    page.locator(locators.sidebar.settings).click()
  ]);

  const strategies = (await statusResponse.json()).strategies as any[];
  return strategies.find((s) => s.key === "supplierStandardStrategy");
}

/**
 * Saving a strategy change triggers a spend-file recalculation that disables the
 * strategy controls (the slider gets a `slider-disabled` class). Wait until that
 * lock clears so the controls are interactive before acting on them.
 */
async function waitSupplierControlsReady(page: Page): Promise<void> {
  const slider = page.locator("#slider-id-supplierStandardStrategy");

  // The slider may be detached mid-navigation (e.g. just after re-entering the
  // Setup section). Wait for it to actually render first — otherwise the negated
  // `not.toHaveClass` below resolves immediately on an absent element (zero
  // elements => no class match), masking a still-locked recalculation. Mirrors
  // the peer group sibling's waitPeerGroupControlsReady.
  await expect(
    slider,
    "supplier strategy slider did not render after navigating to Setup"
  ).toBeVisible({ timeout: 60000 });

  await expect(
    slider,
    "supplier strategy controls are locked by an in-progress recalculation"
  ).not.toHaveClass(/slider-disabled/, { timeout: 60000 });
}

/**
 * Selects a calculation method ("Q3" -> "3rd Quartile (days)" / "AVG" -> "Average (days)")
 * for the supplier standard strategy via its "More Settings" popup, saves, and asserts the
 * update request succeeded. Returns the parsed update response.
 */
async function setSupplierCalculationMethod(
  page: Page,
  optionLabel: "3rd Quartile (days)" | "Average (days)"
): Promise<any> {
  const popup = page.locator(".supplierStandardStrategy-popup-settings");

  // The supplier "More Settings" toggle lives in the same column as its popup.
  await page
    .locator(".col-10.d-flex")
    .filter({ has: popup })
    .getByText("More Settings", { exact: true })
    .click();

  await popup.getByText(optionLabel, { exact: true }).click();

  const saveBtn = page.locator("#save-button-for-settings");
  await expect(saveBtn, "Save button should be enabled after a change").toBeEnabled();

  const [response] = await Promise.all([
    ApiWaitersUtils.waitForSpendFileStrategiesAllowedUpdate(page, {
      hasResponseToBeOk: false
    }),
    saveBtn.click()
  ]);

  const json = await response.json();
  expect(
    json.result,
    `Save failed. / Error: ${json.error} / Subject: ${json.subject}`
  ).toBe("success");

  return json;
}

test.beforeEach(async ({ page }) => {
  await ensureAdminLogin(page);
});

// Cleanup
test.afterEach(async ({ page }) => {
  await ensureDefaultLogin(page);
});

test("user can set third quartile (Q3) as the calculation method of the supplier standard strategy @settings @us-7392 @tc-7541", async ({
  page
}) => {
  const supplier = await openSetupAndGetSupplierStrategy(page);

  expect(supplier, "supplierStandardStrategy not found").toBeTruthy();
  expect(
    supplier.isAllowed,
    "supplierStandardStrategy must be enabled for this test"
  ).toBeTruthy();

  const originalMethod: "AVG" | "Q3" = supplier.calculationMethod;
  console.log(`Supplier standard strategy current method: ${originalMethod}`);

  // Wait for the strategies section to finish rendering the popups and for any
  // residual recalculation (e.g. from a previous run) to release the controls.
  await page.waitForTimeout(3500);
  await waitSupplierControlsReady(page);

  // If it is already on Q3 (e.g. a previous run did not restore it), reset to AVG
  // first so the test always exercises switching *to* Q3.
  if (originalMethod === "Q3") {
    console.log("Already on Q3 — resetting to AVG before the real assertion.");
    await setSupplierCalculationMethod(page, "Average (days)");
    await SetupUtils.goToSetupSection(page);
    await page.waitForTimeout(3500);
    await waitSupplierControlsReady(page);
  }

  // *** The actual feature under test: set the calculation method to Q3. ***
  console.log("Setting calculation method to 3rd Quartile (Q3)...");
  const q3Response = await setSupplierCalculationMethod(page, "3rd Quartile (days)");
  expect(q3Response.inProcess, "Saving Q3 should trigger a recalculation").toBeTruthy();
  console.log("Q3 saved. Program is being recalculated.");

  // *** Cleanup: restore the original (AVG) method, best-effort. ***
  // Saving triggers a recalculation that locks the controls; restoring may not be
  // possible within the test budget, so it must not fail the assertion above.
  try {
    await SetupUtils.goToSetupSection(page);
    await waitSupplierControlsReady(page);
    await page.waitForTimeout(2000);
    await setSupplierCalculationMethod(page, "Average (days)");
    console.log("Restored calculation method to AVG.");
  } catch (e) {
    console.log(
      "Could not restore AVG within budget (recalculation in progress). " +
        "The next run resets to AVG automatically. Detail:",
      (e as Error).message
    );
  }
});
