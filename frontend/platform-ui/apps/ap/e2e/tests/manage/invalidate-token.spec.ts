/**
 * TC 10681: Invalidate Token for User
 */
import { test, chromium, Page, expect } from "@playwright/test";
import {
  ensureDefaultLogin,
  loginByUser,
  ensureSuperAdminLogin,
} from "../utils/Utils";
import { AdminConsoleUtils } from "../utils";

test.beforeEach(async ({ page }) => {
  await ensureSuperAdminLogin(page);
});


test("Invalidate Token for User @admin @manage @us-10681", async ({ page }) => {
  //// open admin console and enforce token invalidation to joel+testnotadmin@calculum.ai
  
  await AdminConsoleUtils.goToCompanies(page);
  await page.waitForSelector(".k-grid", { timeout: 10000 });
  await page.waitForSelector(".loading-modal", { state: "detached" });
  // filter grid by company Name
  await FilterByFields(page, "name", "Company Test");

  /// click on user in companies
  const userRow = page.getByRole("row", { name: "Company Test" }).getByRole("img").nth(2);
  await Promise.all([
    page.waitForResponse(
      (res) => res.url().endsWith("/graphql") && res.ok(),
    ),
    userRow.click(),
  ]);
  const searchInput = page.locator(
    ".input-group input.form-control.border-start-0",
  );
  await searchInput.waitFor({ state: "visible", timeout: 15000 });
  await searchInput.fill("joel+testnotadmin@calculum.ai");
  await page.waitForTimeout(1000);
  //// open 2 normal user
  const browser2 = await chromium.launch({
   /* headless: false,
    devtools: true */
  });
  // Wrap the entire flow in try/finally so the second browser is always
  // closed, even if any assertion or step throws. Previously the close
  // ran inline at the end of the test, leaking a browser on any failure
  // before that point.
  try {
    const contextNormalUser = await browser2.newContext({
      storageState: undefined //
    });
    contextNormalUser.clearCookies()
    let pageNormalUser = await contextNormalUser.newPage();

    // Variable to track if it passed through the OAuth URL
    let passedThroughOAuth = false;

    // Listener to capture network requests
    pageNormalUser.on('request', request => {
      const url = request.url();
      if (url.includes('oauth2/v2.0/authorize') && url.includes('login-dev.calculum.ai')) {
        console.log('✅ Passed through OAuth URL:', url);
        passedThroughOAuth = true;
      }
    });

    await pageNormalUser.goto(process.env.E2E_BASE_URL_API!! + "/api/auth/login");
    await loginByUser(pageNormalUser,process.env.E2E_AUTH_USERNAME_SINGLE!,process.env.E2E_AUTH_PASSWORD_SINGLE!);
    await pageNormalUser.waitForTimeout(4000);
    //------------------------------------------------------

    await page.locator(".ellipsis-icon-manage-team").first().click();
    const invalidateBtn=page.locator(".invalidate-token-acess").first();
    // await invalidateBtn.click();
    await Promise.all([
      page.waitForResponse(
        (res) => res.url().includes("api/admin/user/invalidate_token/") && res.ok(),
      ),
      invalidateBtn.click()
    ]);
    // Verify that it passed through the OAuth URL
    expect(passedThroughOAuth).toBeTruthy();
    console.log('✅ Test completed - Passed through OAuth:', passedThroughOAuth);
  } finally {
    await browser2.close().catch((error) => {
      console.error(
        "Failed to close browser2 (non-critical):",
        error instanceof Error ? error.message : String(error),
      );
    });
  }

  await ensureDefaultLogin(page);
});

async function FilterByFields(page: Page, propertyName: string, field: string) {
  await page.getByRole("link", { name: `${propertyName} Column Menu` }).click();
  // await page.getByText("Select", { exact: true }).click();
  await page.getByLabel(field).check();
  await page.getByRole("button", { name: "Filter" }).click();
}