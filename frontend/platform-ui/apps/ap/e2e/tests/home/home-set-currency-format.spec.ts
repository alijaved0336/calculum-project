import { test, expect, Page } from "@playwright/test";
import {
  changeToSpendFile,
  ensureSuperAdminLogin,
  goToPreferences,
  goToHomeSection,
} from "../utils/Utils";
import { locators } from "../utils/locators";

test.beforeEach(async ({ page }) => {
  // PATCH /api/admin/users requires admin role — non-admin login yields 403
  // and the preference never persists, breaking the final USD assertion.
  await ensureSuperAdminLogin(page);
  await changeToSpendFile(page, "20221011_MATCH_OVERVIEW.xlsx (Ver. 5)");
});

async function ensureOnHomeDashboard(page: Page) {
  // goToHomeSection early-returns on any /home/* URL (incl. /home/preferences)
  // since commit 011c90bb97, so it cannot bring us back from Preferences.
  // The next goToPreferences() asserts /home-dashboard, so navigate explicitly.
  if (!page.url().includes("/home-dashboard")) {
    await page.locator(locators.sidebar.home).click();
    await page.waitForURL(/.*\/home\/home-dashboard/);
  }
}

/**
 * Check new currency format selected is saved
 */
test("Home Preferences - New currency format is saved @admin @integrated", async ({
  page,
}) => {
  // Persisted state.json (`ada-app`) carries a selected program for the
  // default user, so the SPA can deep-link to /home/analyze/program_overview
  // after changeToSpendFile. goToPreferences asserts /home-dashboard, so
  // click Home first when not already there.
  await ensureOnHomeDashboard(page);

  // Go to Preferences
  console.log("Going to Preferences...1");
  await goToPreferences(page);
  // const btnSave=page.locator("button.btn.btn-primary:has-text('Save')");
  // const modalSaveBtn=page.locator(".calculum-modal-content-custom");
  // await page.waitForTimeout(2000);
  // Single selection matching the value
  // await page.getByLabel("Currency Format").selectOption("Albania");
  await page.selectOption("#currencyFormat", "AL");

  // await page.waitForTimeout(2000);

  // Scroll to the bottom of the page
  await page.evaluate("window.scrollBy(0, window.innerHeight)");
  const toClick = await clickSavePreferences(page);
  //await page.pause();
  const [response] = await Promise.all([
    // Verify API response is OK
    page.waitForResponse(
      (response) => response.url().includes("api/admin/users"),
    ),

    // Click on Save btn
    toClick.first().click(),
  ]);
  console.log("response: ", response.status());
  expect(response.ok()).toBeTruthy();

  await goToHomeSection(page);
  await ensureOnHomeDashboard(page);
  console.log("Going to Preferences...2");
  await goToPreferences(page);

  // await page.waitForTimeout(1000);

  const selectedText = await page
    .locator("#currencyFormat option:checked")
    .textContent();
  //expect(selectedText?.trim()).toBe("Albania");

  await page.selectOption("#currencyFormat", "US");

  // await page.waitForTimeout(1000);

  await page.evaluate("window.scrollBy(0, window.innerHeight)");

  const [response2] = await Promise.all([
    // Verify API response is OK
    page.waitForResponse(
      (response) => response.url().includes("api/admin/users"),
    ),
    // Click on Save btn
    toClick.first().click(),
  ]);

  console.log("response2: ", response2.status());
  expect(response2.ok()).toBeTruthy();

  const currencySelected = await page
    .locator(".currency-selected-prefix")
    .textContent();
  expect(currencySelected).toBe("USD");
  // await page.waitForTimeout(3000);
});

async function clickSavePreferences(page: Page) {
  console.log("clicking save preferences");
  const btnSave = page.locator("button.btn.btn-primary:has-text('Save')");
  const modalSaveBtn = page.locator(".calculum-modal-content-custom");
  await btnSave.click();
  if (await modalSaveBtn.isVisible()) {
    return modalSaveBtn;
  } else {
    return btnSave;
  }
}
