import { test, expect } from "@playwright/test";
import {
  changeToSpendFile,
  ensureAdminLogin,
  ensureDefaultLogin,
} from "../utils/Utils";
import { ManageUtils } from "../utils";

const SPEND_FILE = "Pagero-SF4.xlsx (Ver. 1)";

test.beforeEach(async ({ page }) => {
  await ensureAdminLogin(page);
  await changeToSpendFile(page, SPEND_FILE);
});

test.afterEach(async ({ page }) => {
  await ensureDefaultLogin(page);
});

test("Test Manage Module Search @program @manage @us-7456", async ({ page }) => {
  // Verify Manage section loads and shows status cards data.
  await ManageUtils.goToManageSection(page);
  await page.waitForTimeout(2000);

  // The Manage page should expose a navbar search; once visible we can interact with it.
  const search = page.getByPlaceholder("Search").first();
  await expect(search).toBeVisible();

  // Type a search term and verify the search API responds OK.
  const [resp] = await Promise.all([
    page.waitForResponse(
      (r) =>
        r.url().endsWith("/api/entity-card/get-entity-cards") && r.ok(),
      { timeout: 30000 },
    ),
    (async () => {
      await search.fill("a");
      await search.press("Enter");
    })(),
  ]);
  expect(resp.ok()).toBeTruthy();
  const cards = await resp.json();
  expect(Array.isArray(cards)).toBeTruthy();
  expect(cards.length).toBeGreaterThan(0);
  console.log(`Manage search returned ${cards.length} entity cards`);
});
