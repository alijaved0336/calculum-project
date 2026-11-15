/**
 * @fileoverview
 * E2E tests for AdaBot Peer Group Standard (RABC Feature 4617, Test 4651).
 *
 * This test suite validates the correct loading and display of the Peer Group Standard Strategy
 * for a supplier ("3M Company") in the Opportunity tab using the Adabot backend.
 * It ensures that the relevant API responses are received, the program is correctly selected,
 * and the UI reflects the expected state for the peer group standard strategy.
 *
 * Test Flow:
 * 1. Ensure default login before each test.
 * 2. Change to the correct spend file and program.
 * 3. Open the entity card for "3M Company".
 * 4. Wait for the Adabot and payment terms opportunity API responses.
 * 5. Change to the "Test Adabot (NO TOCAR)" program.
 * 6. Validate that the UI and backend data for the peer group standard strategy are as expected.
 *
 * Acceptance Criteria:
 * - The Adabot and payment terms opportunity API responses are received successfully.
 * - The program is changed to "Test Adabot (NO TOCAR)".
 * - The UI displays the correct information for the peer group standard strategy.
 * - The test is tagged for Adabot, integrated, and user story tracking.
 */


import { expect, test } from "@playwright/test";
import {
  ensureDefaultLogin,
  changeToSpendFile,
  goToEntityCardEntity,
  changeToProgram,
} from "../../utils/Utils";

import Api2 from "../../utils/APi2";
import { locators } from "../../utils/locators";

let api: Api2 | null = null;

test.beforeEach(async ({ page }) => {
  await ensureDefaultLogin(page);
  api = await Api2.getInstance(page);
  await page.goto("/");
  await page.waitForSelector(".loading-modal", { state: "detached" });
});

test("AdaBot Peer Group Standard (Supplier) @us-4617 @integrated @adabot @prq", async ({
  page,
}, testInfo) => {
  // Starting
  Api2.printStarting(testInfo);

  await changeToSpendFile(page, "Pagero_DSO_TEST.xlsx (Ver. 1)");
  await goToEntityCardEntity(page, "3M Company");

  await Promise.all([
    page.waitForResponse(
      (response) =>
        response.url().includes("api/entity-card/entity/ada-bot/all/") &&
        response.ok(),
    ),
    page.waitForResponse(
      (response) =>
        response.url().includes("/chart/payment-terms-opportunity/supplier") &&
        response.ok(),
    ),
    changeToProgram(page, "Test Adabot (NO TOCAR)", false),
  ]);

  await page.waitForTimeout(3000);

  const element = page
    .locator(locators.entityCard.oportunity.adabotChartLine)
    .filter({ hasText: "Peer Group Standard" });

  await expect(element).toBeVisible();
  await element.click();
  await expect(element.filter({ hasText: "60" })).toBeVisible();

  Api2.printSuccess("Strategy found with correct value ON-Supplier");
});

test("AdaBot Peer Group Standard (Parent) @us-4617 @integrated @adabot @prq", async ({
  page,
}, testInfo) => {
  // Starting
  Api2.printStarting(testInfo);

  await changeToSpendFile(page, "Pagero_DSO_TEST.xlsx (Ver. 1)");
  await goToEntityCardEntity(page, "3M CO");

  await Promise.all([
    page.waitForResponse(
      (response) =>
        response.url().includes("api/entity-card/entity/ada-bot/all/") &&
        response.ok(),
    ),
    page.waitForResponse(
      (response) =>
        response.url().includes("/chart/payment-terms-opportunity/parent") &&
        response.ok(),
    ),
    changeToProgram(page, "Test Adabot (NO TOCAR)", false),
  ]);

  await page.waitForTimeout(3000);

  const element = page
    .locator(locators.entityCard.oportunity.adabotChartLine)
    .filter({ hasText: "Peer Group Standard" });

  await expect(element).toBeVisible();
  await element.click();
  await expect(element.filter({ hasText: "60" })).toBeVisible();

  Api2.printSuccess("Strategy found with correct value ON-Parent");
});

test.afterEach(async ({ page }) => {
  await ensureDefaultLogin(page);
});
