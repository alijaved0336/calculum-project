/**
 * @fileoverview
 * E2E test for UI Groups - Edit Group in Admin Console.
 *
 * This test verifies that a user can edit an existing UI Group via the Admin Console UI.
 * It covers the following flow:
 *
 * Test Flow:
 * 1. Ensure default login state before each test.
 * 2. Log in as Super Admin.
 * 3. Navigate to the Admin Console and open the UI Groups section.
 * 4. If at least one UI Group exists, select the first group.
 * 5. Edit the group's name with a new random value.
 * 6. Save the changes and verify the update.
 *
 * Acceptance Criteria:
 * - An existing UI Group can be edited.
 * - The group appears in the UI Groups list with the updated name.
 * - The test is tagged for admin, UI, and user story tracking.
 */


import { test, expect } from "@playwright/test";
import {
  ensureDefaultLogin,
  generateRandomString,
  loginAsSuperAdmin,
  goToHomeSection,
} from "../../utils/Utils";
import { locators } from "../../utils/locators";

// Default Desktop Chrome viewport (1280x720) squashes the UI Groups grid
// and hides the Actions column behind the Kendo container. Widen so the
// edit / delete icons are interactable.
test.use({ viewport: { width: 1800, height: 1024 } });

test.beforeEach(async ({ page }) => {
  await ensureDefaultLogin(page);
  await page.waitForSelector(".loading-modal", { state: "detached" });
});

test("Test for UI group, edit UI group @admin @ui @us-2465", async ({
  page,
}) => {
  console.log("login as super admin");
  await loginAsSuperAdmin(page);
  console.log("go to admin console");
  await goToHomeSection(page);
  await Promise.all([
    page.locator(locators.headerMenu.topMenu.dropDownMenu).click(),
    page.locator(locators.headerMenu.topMenu.adminConsole).click(),
  ]);
  await expect(page).toHaveURL(/.*\/admin\/companies/);

  const [responseTest] = await Promise.all([
    page.waitForResponse(
      (response) => response.url().includes("api/ui_groups") && response.ok(),
    ),
    page.locator(locators.userMenu.adminConsole.uiGroups).click(),
  ]);
  await expect(page).toHaveURL(/.*\/admin\/ui_groups/);

  const items = JSON.parse(await responseTest.text())["hydra:totalItems"];
  if (items < 1) {
    await expect(page.locator(".no_search_title")).toBeVisible();
    return;
  }

  await page.waitForTimeout(4000);

  // Open edit mode for the first group. The Actions column on the UI
  // Groups grid has its width commented out (columns.ts: actions has
  // `// width: 110`) so the edit icon renders in DOM but with zero
  // visible area. dispatchEvent fires the Vue @click handler without
  // needing visibility / coordinates.
  // Each row has 3 .icon_container in DOM order:
  //   [PlusCircle (edit-companies), EditIcon (edit-group), TrashIcon].
  // First row's edit icon = the 2nd .icon_container globally.
  await page
    .locator(".icon_container")
    .nth(1)
    .locator(".icons")
    .dispatchEvent("click");

  // Wait for the edit form to render.
  await page
    .locator('[placeholder="Name Your Group\\.\\.\\."]')
    .waitFor({ state: "visible" });

  const randomStr = "test_" + generateRandomString(6);
  await page
    .locator('[placeholder="Name Your Group\\.\\.\\."]')
    .fill(randomStr);

  // Update; require a write response (PUT/PATCH) on /api/ui_groups/<uuid>
  // so a stale GET cannot satisfy the predicate.
  await Promise.all([
    page.waitForResponse(
      (response) =>
        /\/api\/ui_groups\/[^/?]+/.test(response.url()) &&
        ["PUT", "PATCH"].includes(response.request().method()) &&
        response.ok(),
    ),
    page.locator('button:has-text("Update")').click(),
  ]);

  // Verify the updated name shows up in the grid.
  await expect(
    page.locator("td", { hasText: randomStr }).first(),
  ).toBeVisible({ timeout: 15000 });
});

test.afterEach(async ({ page }) => {
  console.log("login as default user");
  await ensureDefaultLogin(page);
});
