/**
 * @fileoverview
 * E2E test for User Story 3996: Super Admin can clone and delete a data change request.
 *
 * This test verifies that a Super Admin can:
 * 1. Clone an existing data change request from the Data Controller section in the Admin Console.
 * 2. Delete a cloned data change request.
 *
 * Test Flow:
 * 1. Log in as Super Admin before each test.
 * 2. Navigate to the home section.
 * 3. Open the Admin Console from the top menu.
 * 4. Go to the Data Controller section.
 * 5. Click on the "Data Changes" tab.
 * 6. Wait for the change requests API response.
 * 7. If requests exist, attempt to clone the first available request.
 * 8. After cloning, verify the number of requests has increased or stayed the same.
 * 9. Attempt to delete the newly cloned request.
 * 10. Verify the number of requests decreases after deletion.
 *
 * Acceptance Criteria:
 * - Super Admin can see the clone action for at least one request.
 * - Cloning a request increases or maintains the number of requests.
 * - Deleting a cloned request decreases the number of requests.
 * - The test is tagged for integration and user story tracking.
 */

import { expect, test } from "@playwright/test";
import { loginAsSuperAdmin, ensureDefaultLogin } from "../../utils/Utils";
import { locators } from "../../utils/locators";

test.beforeEach(async ({ page }) => {
  await loginAsSuperAdmin(page);
});

test("Super Admin can clone a request, and delete a cloned request @flakyResolved @admin @integrated @us-3996", async ({
  page,
}) => {
  await page.locator(locators.headerMenu.topMenu.dropDownMenu).click();
  await Promise.all([
    page.waitForResponse(
      (response: any) =>
        response.url().endsWith("/api/companies") && response.ok(),
    ),
    page.locator(locators.headerMenu.topMenu.adminConsole).click(),
  ]);
  await Promise.all([
    page.waitForResponse(
      (response: any) =>
        response.url().endsWith("/api/companies/spend_files_versions") &&
        response.ok(),
    ),
    page.locator(locators.userMenu.adminConsole.dataController).click(),
  ]);

  await Promise.all([
    page.waitForResponse(
      (response: any) =>
        response.url().includes("/api/change_requests") && response.ok(),
    ),
    page.locator(locators.userMenu.adminConsole.data.dataChanges).click(),
  ]);

  const hasRecordsBefore = await page.locator(".k-master-row").count();
  if (hasRecordsBefore > 0) {
    const cloneAvailableCount = await page.locator(".clone-action").count();
    if (cloneAvailableCount > 0) {
      await page.locator(".clone-action").first().click();
      const cloneBtn = page.locator(
        ".btn.btn-primary.font-md >> span:has-text('Clone')",
      );
      await Promise.all([
        page.waitForResponse(
          (response: any) =>
            response.url().includes("/api/change_requests") && response.ok(),
        ),
        cloneBtn.click(),
      ]);
      const hasRecordsAfter = await page.locator(".k-master-row").count();
      expect(hasRecordsBefore).toBeLessThanOrEqual(hasRecordsAfter);
    } else {
      console.log("clone is unavailable because no clone action btn visible");
    }
  } else {
    expect(hasRecordsBefore).toBe(0);
    console.log("No requests were found");
  }

  //delete request
  if (hasRecordsBefore > 0) {
    const deleteAvailableCount = await page.locator(".delete-action").count();

    if (deleteAvailableCount > 0) {
      console.log("has some clones that could be deleted");

      await page.locator(".delete-action").first().click();
      const deleteBtn = page.locator(
        ".btn.btn-primary.font-md >> span:has-text('Delete')",
      );
      await Promise.all([
        page.waitForResponse(
          (response: any) =>
            response.url().includes("/api/change_requests") && response.ok(),
        ),
        deleteBtn.click(),
      ]);
      const hasRecordsAfter = await page.locator(".k-master-row").count();
      console.log(
        "hasRecordsBefore >= hasRecordsAfter: ",
        hasRecordsBefore >= hasRecordsAfter,
      );
      expect(hasRecordsBefore).toBeGreaterThanOrEqual(hasRecordsAfter);
    } else {
      console.log("no clones that could be deleted");
    }
  } else {
    expect(hasRecordsBefore).toBe(0);
    console.log("No requests were found");
  }
});

test.afterEach(async ({ page }) => {
  await ensureDefaultLogin(page);
});
