/**
 * @fileoverview
 * E2E test for the Spend alias editing in Analyze > List > Spends (Feature 1096).
 *
 * Two spends of the same supplier ("ABB AG - (2)") are aliased with the same
 * name: the first update must succeed with a success toast, the second must be
 * rejected by the API with the duplicate-alias error toast and rolled back in
 * the grid. The first spend's original alias is restored afterwards.
 */

import { Locator, Page, expect, test } from "@playwright/test";
import {
  changeToSpendFile,
  ensureDefaultLogin,
  goToAnalyzeSection,
} from "../../utils/Utils";

import Api2 from "../../utils/APi2";

const SUPPLIER_NAME = "ABB AG - (2)";
const ALIAS_ENDPOINT = "/api/categorize/spend/alias";

let firstInput: Locator | null = null;
let originalAlias: string | null = null;

function waitForAliasUpdate(page: Page, mustBeOk: boolean) {
  return page.waitForResponse(
    (response) =>
      new URL(response.url()).pathname === ALIAS_ENDPOINT &&
      (!mustBeOk || response.ok()),
  );
}

test.beforeEach(async ({ page }) => {
  await ensureDefaultLogin(page);
  await page.goto("/");
  await page.waitForSelector(".loading-modal", { state: "detached" });
});

test("Categorize List Alias Availability @integrated @prq @us-1096 @analyze", async ({
  page,
}, testInfo) => {
  Api2.printStarting(testInfo);

  await changeToSpendFile(page, "Company Testing.xlsx (Ver. 1)");

  // goToAnalyzeSection gates on the Spends grid GraphQL operation itself, so
  // no fixed sleep is needed for the rows to be there. isFromHome=false: after
  // page.goto("/") the SPA restores the last visited section, which is not
  // necessarily the home dashboard, and the sidebar entry works from any page.
  await goToAnalyzeSection(page, "List", true, "Spends", false);

  const newAlias = `Spend ${Math.random().toString().slice(2, 10)}`;

  const rows = page.locator(".k-master-row").filter({ hasText: SUPPLIER_NAME });
  await expect(
    rows.nth(1),
    `two spends of ${SUPPLIER_NAME} must be listed`,
  ).toBeVisible({ timeout: 30000 });

  // First spend: the alias update must succeed.
  firstInput = rows.nth(0).locator("input.change-alias");
  originalAlias = await firstInput.inputValue();
  const successResponse = waitForAliasUpdate(page, true);
  await firstInput.fill(newAlias);
  await firstInput.press("Enter");
  await successResponse;
  await expect(
    page.getByText("The Spend's alias was updated successfully").first(),
  ).toBeVisible();

  // Second spend of the same supplier: the same alias must be rejected.
  const secondInput = rows.nth(1).locator("input.change-alias");
  const secondOriginal = await secondInput.inputValue();
  const rejectedResponse = waitForAliasUpdate(page, false);
  await secondInput.fill(newAlias);
  await secondInput.press("Enter");
  const rejected = await rejectedResponse;
  expect(
    rejected.ok(),
    "the duplicated alias must be rejected by the API",
  ).toBeFalsy();
  await expect(page.getByText(/alias already in use/i).first()).toBeVisible();
  // The grid rolls the input back to its previous value on error.
  await expect(secondInput).toHaveValue(secondOriginal);
});

test.afterEach(async ({ page }) => {
  // Restore the first spend's alias through the same input.
  if (firstInput === null || originalAlias === null) {
    return;
  }

  const currentValue = await firstInput
    .inputValue()
    .catch(() => originalAlias as string);

  if (currentValue !== originalAlias) {
    const restored = waitForAliasUpdate(page, true).catch(() => null);
    await firstInput.fill(originalAlias);
    await firstInput.press("Enter");
    await restored;
  }

  firstInput = null;
  originalAlias = null;
});
