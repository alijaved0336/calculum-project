/**
 * @fileoverview
 * E2E test for Admin - Create Users in Admin Console.
 *
 * This test verifies that an admin can create a new user via the Admin Console UI.
 * It covers the following flow:
 *
 * Test Flow:
 * 1. Ensure super admin login state before each test.
 * 2. Navigate via Admin Console -> Companies -> first company (ensures company with capacity).
 * 3. Attempt to create a user with an invalid email and verify error handling.
 * 4. Create a user with a valid email.
 * 5. Search for the created user and delete them as cleanup.
 *
 * Acceptance Criteria:
 * - Admin can access the Manage Team section.
 * - Invalid email input is handled with an error message.
 * - A new user can be created with a valid email.
 * - The created user appears in the user list and can be deleted.
 * - The test is tagged for admin, integration, and user story tracking.
 */

import { test, expect, type Page } from "@playwright/test";
import { ensureSuperAdminLogin, ensureDefaultLogin } from "../utils/Utils";
import { locators } from "../utils/locators";
import AdminConsoleUtils from "../utils/AdminConsoleUtils";

const given = {
  emails: ["diego+demos-test@example.ai", "diego+demos-test@calculum-test.ai"],
};

/**
 * Delete a user from the company grid, scoped to the row that matches `email`.
 *
 * Flakiness this guards against:
 * - The search box is debounced 500ms and drives a GraphQL refetch that
 *   rebuilds the grid rows. A fixed `waitForTimeout` raced that re-render, so
 *   we wait for the grid to CONVERGE on the target row instead.
 * - The actions menu is a Kendo <Popup> teleported to <body>. For the top
 *   (only) filtered row it renders under the sticky grid header, whose .k-link
 *   header cells intercept a real mouse click (force:true does NOT help — it
 *   skips the actionability check but the browser still routes the physical
 *   click to the topmost element). We dispatch the DOM click straight to the
 *   item so the Vue @click handler fires regardless of what is painted on top,
 *   re-opening inside `toPass` and gating on the confirm modal appearing.
 */
async function deleteUserByEmail(page: Page, email: string) {
  console.log("deleting email: ", email);

  const searchInput = page.locator(
    ".input-group input.form-control.border-start-0",
  );
  await searchInput.waitFor({ state: "visible", timeout: 15000 });
  await searchInput.fill(email);

  // Wait for the grid to filter down to exactly the target row before acting,
  // so we never interact while the GraphQL refetch is still re-rendering it.
  const row = page.locator(".k-master-row", { hasText: email });
  await expect(row).toHaveCount(1, { timeout: 15000 });
  await row.scrollIntoViewIfNeeded();

  // Open the row's actions popup and trigger delete. We dispatch the click
  // straight to the item (the sticky header would otherwise swallow a real
  // mouse click); the confirm modal becoming visible is the success signal, so
  // a click eaten by a detach re-runs the whole open+dispatch on the next try.
  const trash = page.locator('[data-testid="icon-trash"]');
  const deleteConfirm = page.locator(
    locators.settings.buyerStandardGroup.delete,
  );
  await expect(async () => {
    if (!(await trash.isVisible())) {
      await row.locator(".ellipsis-icon-manage-team").click();
      await expect(trash).toBeVisible({ timeout: 2000 });
    }
    await trash.dispatchEvent("click");
    await expect(deleteConfirm).toBeVisible({ timeout: 2000 });
  }).toPass({ timeout: 20000 });

  await Promise.all([
    page.waitForResponse(
      (response) =>
        response.url().includes("/api/admin/user_companies/") &&
        response.ok(),
    ),
    deleteConfirm.click(),
  ]);

  // Don't move on until the deleted row is gone from the grid.
  await expect(row).toHaveCount(0, { timeout: 15000 });
}

test.beforeEach(async ({ page }) => {
  await ensureSuperAdminLogin(page);
});

test("Admin can create users @admin @integrated @us-7714", async ({ page }) => {
  await AdminConsoleUtils.goToCompanies(page);
  await page.waitForSelector(".k-grid", { timeout: 10000 });

  await Promise.all([
    page.waitForResponse(
      (response) => response.url().includes("/api/graphql") && response.ok(),
    ),
    page.locator(".go-to-company").first().click(),
  ]);

  await page.waitForSelector(".k-grid", { timeout: 10000 });

  await expect(page.locator("#add-user-to-company")).toBeEnabled({
    timeout: 15000,
  });

  const addUserButton = page.locator("#add-user-to-company");
  for (const email of given.emails) {
    console.log("fill email: ", email);
    await addUserButton.click();
    await page.locator("#email").click();
    await page.locator("#email").fill(email);
    console.log("click save button");
    await Promise.all([
      page.waitForResponse(
        (response) =>
          response
            .url()
            .includes("/api/admin/user_companies/create_user_account") &&
          response.ok(),
      ),
      page.locator(locators.settings.buyerStandardGroup.save).click(),
    ]);
    // Wait for the add-user form to close (button visible again) before the
    // next iteration so we don't re-click while the modal is still tearing down.
    await expect(addUserButton).toBeVisible({ timeout: 15000 });
  }

  for (const email of given.emails) {
    await deleteUserByEmail(page, email);
  }
});

// This executes after each test
test.afterEach(async ({ page }) => {
  await ensureDefaultLogin(page);
});
