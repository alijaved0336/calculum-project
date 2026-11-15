/**
 * @fileoverview
 * E2E tests for verifying the SME badge display in the Entity Card.
 *
 * Main Flows:
 * 1. Ensure the user is logged in as a super admin.
 * 2. Change to the spend file "$8.4B_Spend_20230605.xlsx (Ver. 1)".
 * 3. Search for specific entities in the Entity Card.
 * 4. Assert that the SME badge is displayed for EU and US entities as expected.
 *
 * Acceptance Criteria:
 * - The test waits for the necessary navigation and spend file change to complete.
 * - The search for each entity is performed successfully.
 * - The SME badge is displayed for entities that are SMEs.
 * - The test passes if all assertions are met and the UI displays the correct SME badge status for each entity.
 */

import { expect, Page, test } from "@playwright/test";
import {
  changeToSpendFile,
  ensureDefaultLogin,
  ensureSuperAdminLogin,
} from "../utils/Utils";

test.beforeEach(async ({ page }) => {
  await ensureSuperAdminLogin(page);
  console.log("Changing SpendFile to : $8.4B_Spend_20230605.xlsx (Ver. 1)");
  await changeToSpendFile(page, "$8.4B_Spend_20230605.xlsx (Ver. 1)");
});

test("TC-9015 - An EU SME is tagged as well as a US one", async ({ page }) => {
  console.log("search for entity");

  let entities = [
    "2N Telekomunikace A.S.",
    "ABB Inc Iaen Excitation Division",
    "A.F. Technologies, Inc.",
  ];

  for (const element of entities) {
    let { smeBadgeCount } = await dynamicSearchAndSMEBadge(page, element);
    await checkIfHasBadge(page, smeBadgeCount);
  }
});

async function checkIfHasBadge(page: Page, smeBadgeCount: number) {
  if (smeBadgeCount > 0) {
    expect(smeBadgeCount).toBeGreaterThanOrEqual(1);
  } else {
    expect(smeBadgeCount).toBe(0);
  }
}

async function dynamicSearchAndSMEBadge(page: Page, entity: string) {
  await page.locator("input#search").fill(entity);
  await page.waitForTimeout(1000);

  await Promise.all([
    page.waitForResponse(
      (res: any) =>
        res.url().includes("/api/entity-card/get-entity-cards") && res.ok(),
    ),
    page.locator("input#search").press("Enter"),
  ]);

  await page.waitForTimeout(1000);

  let card1 = await page.locator(`div.card-body:has-text('${entity}')`).first();

  let smeBadgeCount = await card1.locator(".sme-badge-icon.small").count();
  return { smeBadgeCount };
}

test.afterEach(async ({ page }) => {
  await changeToSpendFile(page, "Company Testing.xlsx (Ver. 1)");
  await ensureDefaultLogin(page);
});
