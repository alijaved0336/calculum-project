/**
 * @fileoverview
 * E2E test for verifying the "Contractual Payment Terms" value in the Opportunity entity card.
 *
 * This test covers:
 * - Navigating to the Opportunity entity card for a specific supplier.
 * - Changing the spend file and program.
 * - Ensuring the "Contractual Payment Terms" value is displayed correctly in the chart.
 *
 * Prerequisites:
 * - The test user must have access to the "Spend Contractual Value.xlsx (Ver. 3)" spend file.
 * - The supplier "ABB AG - (3)" must exist in the test data.
 *
 * Utilities:
 * - Uses Playwright test runner and custom utility functions for navigation and assertions.
 */


import { expect, test } from "@playwright/test";
import {
  changeToProgram,
  changeToSpendFile,
  goToEntityCardEntity,
  goToHomeSection,
} from "../../utils/Utils";
import { locators } from "../../utils/locators";

test.beforeEach(async ({ page }) => {
  await goToHomeSection(page);
});

test('Entity-Card > Oportunity > "Contractual Payment Terms" @integrated @entity @us-1093', async ({
  page,
}) => {
  await changeToSpendFile(page, "Spend Contractual Value.xlsx (Ver. 3)");

  await goToEntityCardEntity(page, "ABB AG - (3)");

  const [response] = await Promise.all([
    page.waitForResponse(
      (response: any) =>
        response.url().includes("/chart/payment-terms-opportunity") &&
        response.ok(),
    ),
    page.waitForResponse(
      (response: any) =>
        response.url().includes("api/entity-card/entity/ada-bot/all/") &&
        response.ok(),
    ),
    changeToProgram(page, "Porgram CF Testing", false),
  ]);

  const resultResponse = await response.json();

  const contractualValue = resultResponse.terms.find(
    (item: any) => item.key === "contractualTerms",
  );

  console.log("Contractual Payment Terms: ", contractualValue.terms);

  const element = page
    .locator(`${locators.entityCard.oportunity.adabotChartLine}`)
    .filter({ hasText: "Contractual" });

  await expect(element).toBeVisible();

  await expect(
    element.filter({ hasText: `${contractualValue.terms}` }),
  ).toBeVisible();
});
