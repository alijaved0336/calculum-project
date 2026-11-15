/**
 * Created By Carlos O. (COB)
 * Test for Feature: 2748
 */

import { test, expect } from "@playwright/test";
import {
  changeToSpendFile,  
  goToAnalyzeSection,
  ensureDefaultLogin,
  waitElementVisibleAndClick
} from "../utils/Utils";

import Api2 from "../utils/APi2";

test.beforeEach(async ({ page }) => {
  

  await ensureDefaultLogin(page)
  await page.goto("/");
  await page.waitForSelector(".loading-modal", { state: "detached" });
  await changeToSpendFile(page, "PageroFull_20230308_2.xlsx (Ver. 1)");
});

test("Reset columns us-5980 @ui @lists @review", async ({
  page
}) => {
  await goToAnalyzeSection(page, "List", true, 'Suppliers', false);

  // The column chooser is GridColumnSelector.vue: trigger `.choose-columns-grid-button`
  // (i18n title "Select Columns" — the old getByRole('img',{name:'Choose Columns'}) is
  // stale), panel `#options-columns`. The "Select All" button (onReset) makes every
  // column visible and applies+closes immediately; "Reset" (onResetDefault) restores the
  // default column set. "Date of Agreement" is not a default column, so it only shows
  // after Select All and disappears again after Reset.
  // Each list tab (Spend Lines/Suppliers/Parents) renders its own grid in the
  // DOM, so there are several `.choose-columns-grid-button` nodes — only the
  // active tab's is visible. Scope to the visible one.
  const columnChooser = page.locator(".choose-columns-grid-button:visible").first();
  await expect(columnChooser).toBeVisible({ timeout: 30_000 });
  const dateOfAgreementHeader = page.locator(".k-column-title", {
    hasText: "Date of Agreement"
  });

  await columnChooser.click();
  await page
    .locator("#options-columns")
    .getByRole("button", { name: "Select All" })
    .click();
  await expect(dateOfAgreementHeader).toHaveCount(1);

  await columnChooser.click();
  await page
    .locator("#options-columns")
    .getByRole("button", { name: "Reset", exact: true })
    .click();
  await expect(dateOfAgreementHeader).toHaveCount(0);
});
