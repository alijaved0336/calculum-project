/** 
 * Test obligatory structure
 * 1- Documentation
 * 2- Given data
 * 3- Test serial or Normal Test
 * 4- Some functions if not be in Utils(Short description inside function)
 */

import { test, Page } from "@playwright/test";
import { ensureAdminLogin, ensureDefaultLogin } from "../utils/Utils";
/**
 * @fileoverview
 * E2E test for Compare Feature - Peers Validation (US-7933).
 *
 * This test suite validates the Compare module's peer company functionality,
 * ensuring that the UI and API correctly handle adding, editing, and displaying
 * peer companies for financial comparison.
 *
 * Test Flow:
 * 1. Ensure admin login before each test.
 * 2. Change to a specific spend file.
 * 3. Navigate to the Compare > Financial Data section.
 * 4. Validate the ability to add and edit peer companies.
 * 5. Assert that the correct API calls are made and the UI updates as expected.
 *
 * Acceptance Criteria:
 * - The Compare module allows adding and editing peer companies.
 * - The correct API endpoints are called when searching and updating peers.
 * - The UI reflects the changes to the peer list.
 * - The test is tagged for UI, compare, and user story tracking.
 */
const given = {
  company: "",
  spendfile: "", //Already existent, and additionally attached here.
  program: "", //Created by default.
  user: "",
};
// Test serial
test.describe.serial("Test @us-#", async () => {
  let page: Page;
  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();
    await ensureAdminLogin(page);
  });

  test.skip("Test @tc-#", async () => {});

  test.afterAll(async ({ browser }) => {
    console.log("*** After all");
    await ensureDefaultLogin(page);
    await browser.close();
  });
});
// Normal Test
test.beforeEach(async ({ page }) => {
  await ensureAdminLogin(page);
});
test("Test @tc-#", async ({ page }) => {});
test.afterEach(async ({ page }) => {
  console.log("*** After all");
  await ensureDefaultLogin(page);
});

// Other file unique functions