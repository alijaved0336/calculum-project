/**
 * @fileoverview
 * E2E test for Invitations by Sales in Admin Console.
 *
 * This test verifies that a user with the sales role can create and manage invitations via the Admin Console UI.
 * It covers the following flow:
 *
 * Test Flow:
 * 1. Ensure super admin login state before all tests.
 * 2. Navigate to the Admin Console and open the Invitations section.
 * 3. Create a new invitation for a specified company and email.
 * 4. Resend an existing invitation.
 *
 * Acceptance Criteria:
 * - A user with the sales role can access the Invitations section.
 * - A new invitation can be created with valid data.
 * - An existing invitation can be resent.
 * - The test is tagged for admin, UI, and user story tracking.
 */


import { expect, Page, test } from "@playwright/test";
import { ensureDefaultLogin, ensureSuperAdminLogin } from "../utils/Utils";
import { locators } from "../utils/locators";

const given = {
  company: "Company ADA",
  email: "sergio@calculum.com",
  expirationDate: Math.floor(Math.random() * 30) + 1, // Random number between 1 and 30
};

test.describe.serial("Crud invitations by user with sales role", () => {
  let page: Page;
  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();

    await ensureSuperAdminLogin(page);
    await page.waitForSelector(".loading-modal", { state: "detached" });
    await page.goto("/");
  });
  // Create invitation
  test("Create Invitation @tc-11170", async () => {
    await page.locator(locators.headerMenu.topMenu.userMenu).click();
    await page.locator(locators.headerMenu.topMenu.adminConsole).click();
    await page
      .locator(locators.navigationMenu.uploadInvitations)
      .click();
    await page
      .locator(
        'div.col-12.d-flex.end-justify-content a.menu__link.link.link--icon.link--special >> span:text("Create Invitation")',
      )
      .click();
    await page.locator('input[name="companyName"]').click();
    await page.locator('input[name="companyName"]').fill(given.company);
    await page.locator('textarea[name="emails"]').click();
    await page.locator('textarea[name="emails"]').fill(given.email);
    await page.locator('input[name="expirationDays"][type="number"]').click();
    await page
      .locator('input[name="expirationDays"][type="number"]')
      .fill(given.expirationDate.toString());
    await page
      .locator('input[name="expirationDays"][type="number"]')
      .press("Tab"); // Add this to trigger validation
    await page
      .locator('button.btn-primary.font-md >> span:text("Send")')
      .click();
  });
  test("Resend invitation @tc-11170 @admin", async () => {
    console.log("Resend invitation");
    expect(await resendCancelInvitation(page, "Resend Invitation")).toBe(true);
    console.log("Resend invitation Ok");
  });
  test("Cancel invitation @tc-11170 @admin", async () => {
    console.log("Cancel invitation");
    expect(await resendCancelInvitation(page, "Cancel Invitation")).toBe(true);
    console.log("Cancel invitation Ok");
  });
  test.afterAll(async () => {
    await ensureDefaultLogin(page);
    // Close the page's context (not the worker `browser` fixture) so the
    // worker stays alive for the next spec in the workers=1 pipeline.
    await page?.context().close().catch((error) => {
      console.error(
        "afterAll: page.context().close() failed (non-critical):",
        error instanceof Error ? error.message : String(error),
      );
    });
  });
});

async function resendCancelInvitation(
  page: Page,
  button: string, // Resend or Cancel Invitation text
) {
  // Locate the first row's three-dots menu
  await page.locator("tr.k-master-row:first-child .three-dots-icon").click();
  // Then locate the option in the dropdown
  await page
    .locator(
      `.k-animation-container.k-animation-container-relative.custom-pop-up.k-animation-container-shown .k-child-animation-container >> span:text("${button}")`,
    )
    .click();
  const [response] = await Promise.all([
    page.waitForResponse(
      (res) => res.url().includes("/api/invitation_file_uploaders") && res.ok(),
    ),
    page.locator('button.btn-primary.font-md >> span:text("Continue")').click(),
  ]);
  console.log("response", response.status());
  return response.status() === 200;
}
