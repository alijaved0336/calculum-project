/**
 * @fileoverview
 * E2E tests for Contractual/Actual Payment Terms consolidation in a non-Vcard company.
 *
 * This test suite validates that the Contractual and Actual Payment Terms are correctly
 * consolidated and displayed for non-Vcard companies in the Entity Card.
 *
 * Test Flow:
 * 1. Ensure default login before each test.
 * 2. Change to the specified spend file.
 * 3. Open the entity card for a given non-Vcard company.
 * 4. Assert that the Contractual and Actual Payment Terms are displayed and consolidated as expected.
 *
 * Acceptance Criteria:
 * - The Contractual and Actual Payment Terms are shown in the correct format for non-Vcard companies.
 * - The test is tagged for UI, entity, and contractual/actual validation.
 */


/***
Scenario

    The Contractual/Actual Payment Terms are consolidated in a non-Vcard company. 

Given

@company1 = "Company Test".  User: joel+testnotadmin@calculum.ai

@company2 = "Company_SF" User: user-test@softwaresinlimite.com

    @Spendfile = "Pagero_MVcard_Contractual.xlsx" //Already existent, and additionally attached here. 

    @program = "Main Program." //Created by default.


@entity1 = "Barco Nv"

@entity2 = "3M Company"

@entity3 = "Axtone S. A."

 * 
 * 
 * 
 */

const spendFileName = "Pagero_MVcard_Contractual.xlsx (Ver. 1)";
const company1 = "Company Test";
const entity1 = "Barco Nv";
const entity2 = "3M Company";
const entity3 = "Axtone S.A.";

import {
  changeToProgram,
  changeToSpendFile,
  ensureDefaultLogin,
  findEntityCard,
} from "../../utils/Utils";
import { expect, Page, test } from "@playwright/test";
import { locators } from "../../utils/locators";

import Api2 from "../../utils/APi2";

test.beforeEach(async ({ page }) => {
  await ensureDefaultLogin(page);
  await changeToSpendFile(page, spendFileName);
});

test("Merge Contractual/Actual @entityCard @integrated @us-4536", async ({
  page,
}) => {
  await Promise.all([
    page.waitForResponse(
      (response) =>
        response.url().includes("/api/analyze/programs/") && response.ok(),
    ),
    page.locator(locators.sidebar.program).click(),
  ]);

  await page.waitForTimeout(4500);
  await changeToProgram(page, "Main");

  //search for Barco Nv
  await findEntityCard(page, entity1);

  await Promise.all([
    page.waitForResponse(
      (response) =>
        response.url().includes("api/entity-card/entity/ada-bot/all/") &&
        response.ok(),
    ),
  ]);

  await page.waitForTimeout(5000);
  await assertAvgDaysPaidMerged(page);
  //close the modal
  await page.locator(locators.entityCard.closeButton).click();

  await page.waitForTimeout(1000);

  //search for 3M
  await findEntityCard(page, entity2);

  await Promise.all([
    page.waitForResponse(
      (response) =>
        response.url().includes("api/entity-card/entity/ada-bot/all/") &&
        response.ok(),
    ),
  ]);

  await page.waitForTimeout(5000);
  await assertAvgDaysPaidMerged(page);
  //close the modal
  await page.locator(locators.entityCard.closeButton).click();

  await page.waitForTimeout(1000);

  //search for Axtone
  await findEntityCard(page, entity3);

  await Promise.all([
    page.waitForResponse(
      (response) =>
        response.url().includes("api/entity-card/entity/ada-bot/all/") &&
        response.ok(),
    ),
  ]);

  await page.waitForTimeout(5000);
  await assertAvgDaysPaidMerged(page);
  //close the modal
  await page.locator(locators.entityCard.closeButton).click();
});

/**
 * Assert that the Contractual row shows the merged "Avg. Days Paid: <N>" text,
 * which is the visible signal that contractual and actual terms are consolidated.
 *
 * Why .first(): the entity card may render the same label inside both the
 * Contractual row and a Strategies row; we only assert the contractual one.
 */
async function assertAvgDaysPaidMerged(page: Page) {
  const avgDaysPaid = page.getByText("Avg. Days Paid").first();
  await expect(avgDaysPaid).toBeVisible();
  const text = await avgDaysPaid.innerText();
  const match = text.match(/Avg\.\s*Days\s*Paid\s*:\s*(-?\+?\d+)/i);
  expect(match, `Expected "Avg. Days Paid: <number>" in: ${text}`).not.toBeNull();
}
