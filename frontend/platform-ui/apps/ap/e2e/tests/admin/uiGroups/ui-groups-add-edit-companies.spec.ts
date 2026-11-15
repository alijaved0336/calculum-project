/**
 * @fileoverview
 * E2E test for UI Groups - Add Companies in Admin Console.
 *
 * Verifies that a Super Admin can create a new UI Group, attach companies
 * to it via the "+ Add Companies" picker, and persist the group through
 * Save. Cleanup is done over the API because the grid's Actions column
 * (edit/delete icons) is currently rendered outside the visible viewport
 * in dev and is not reliably interactable through the UI.
 *
 * Test Flow:
 * 1. Log in as Super Admin (afterEach restores the default user).
 * 2. Navigate to the Admin Console > UI Groups.
 * 3. Create a new UI Group with a random name and a high user limit
 *    (the backend rejects companies whose unique-active-user count
 *    exceeds maxNumberOfUsers).
 * 4. Add a company via the picker, save filter, confirm in the
 *    "Confirm Edit" modal.
 * 5. Save the form and assert the create POST returned 201; capture the
 *    new group's UUID from the Hydra @id.
 * 6. Delete the created group via API to leave the environment clean.
 */

import { expect, test } from "@playwright/test";
import {
  ensureDefaultLogin,
  generateRandomString,
  loginAsSuperAdmin,
} from "../../utils/Utils";
import { locators } from "../../utils/locators";
import Api2 from "../../utils/APi2";

let api: Api2 | null = null;

test.beforeEach(async ({ page }) => {
  api = await Api2.getInstance(page);
  await loginAsSuperAdmin(page);
});

test("Test for UI group, add / edit companies @flakyResolved  @admin @integrated @us-2464", async ({
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
      (response) => response.url().includes("api/ui_groups") && response.ok(),
    ),
    page.waitForResponse(
      (response) =>
        response.url().includes("get-available-companies") && response.ok(),
    ),
    page.locator(locators.userMenu.adminConsole.uiGroups).click(),
  ]);

  // Create
  await page.locator("button.new-group").click();
  const uiGroupName = "UI GROUP  " + generateRandomString(6);
  await page.locator(".custom_input.form-control").fill(uiGroupName);

  // The backend validates that the total unique active users across the
  // selected companies does not exceed maxNumberOfUsers. The default value
  // (3) is too low for the test companies, so we raise it to 1000 (the
  // form's documented max).
  await page.locator("#limit-user").fill("1000");

  const company = page.locator(".form-checkout >> label >> span:last-child");
  const companyInput = page.locator(".form-checkout >> label >> span.custom");
  const btnSaveFilter = page.locator(
    "button.btn.btn-primary.font-md.save-changes-filter",
  );

  // Add: open picker, select a company, save filter, confirm modal.
  await page.locator("#add-companies").click();
  // Web-first assertion: wait for the picker to render the company list
  // (fails with a clear message instead of a bare innerText timeout).
  await expect(company.nth(2)).toBeVisible();
  const companyText = await company.nth(2).innerText();
  console.log("companyText (added): ", companyText);
  await companyInput.nth(2).click();
  await btnSaveFilter.click();
  await page.locator('button:has-text("Submit")').click();

  // Save the form and require the create POST (201) so we know the group
  // was actually persisted (the GET name-check returns 200 ok() too, so a
  // non-strict predicate would falsely succeed).
  const [createResponse] = await Promise.all([
    page.waitForResponse(
      (response) =>
        response.url().endsWith("/api/ui_groups") &&
        response.request().method() === "POST" &&
        response.status() === 201,
    ),
    page.locator('button:has-text("Save")').click(),
  ]);

  const createdBody = await createResponse.json();
  // API-Platform/Hydra returns the resource with `@id` like
  // "/api/ui_groups/<uuid>"; extract the trailing UUID for cleanup.
  const createdUuid: string =
    createdBody?.uuid ??
    String(createdBody?.["@id"] ?? "")
      .split("/")
      .pop() ??
    "";
  expect(createdUuid).toBeTruthy();
  console.log("created UI group:", uiGroupName, "uuid:", createdUuid);

  // Cleanup via API. The grid's delete icon column is not interactable in
  // the current dev layout (icons rendered but occluded by Kendo grid).
  const deleteResp = await api!.doDelete(`/api/ui_groups/${createdUuid}`);
  expect(deleteResp.ok()).toBe(true);
});

test.afterEach(async ({ page }) => {
  console.log("** after each");
  await ensureDefaultLogin(page);
});
