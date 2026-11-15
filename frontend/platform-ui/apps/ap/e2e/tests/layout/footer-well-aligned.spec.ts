/**
 * USER STORY 5157
 *
 * TCs 5195,5197,5198,5199,5200,5236
 * Analyze, Program, Plan, Entity, Match, Compare sections
 * Are test for having visible .container-footer
 */

import { expect, test } from "@playwright/test";
import {
  changeToSpendFile,
  ensureDefaultLogin, goToHomeSection} from "../utils/Utils";


/**
 * If a test fails, it will not be retried.
 */


const spendFileName = "Pagero_Full_20230927_1.xlsx (Ver. 1)";
const programName = "All Suppliers - CF - No Financing";

/**
 * Go to "Supplier Prioritization" tab.
 * This is executed only once before all the tests.
 */
import Api2 from "../utils/APi2";

test.beforeEach(async ({ page }) => {
  

  
  await ensureDefaultLogin(page);
  await page.goto("/");
  await page.waitForTimeout(5000);
  // Change spend file
  await changeToSpendFile(page, spendFileName);
  await page.waitForTimeout(5000);
});

test("Presence of ..container-footer class in Opportunity @ui @us-5157", async ({ page }) => {
  // Go to Opportunity section

  await page.locator('a').filter({ hasText: 'Opportunity' }).click();
  await page.waitForTimeout(5000);
  //Opportunity/Overview
  await expect(
      page.locator(".container-footer")
    ).toBeVisible();

  //Click on Opportunity/LIST

  await page.getByText('List', { exact: true }).click();
  await page.waitForTimeout(5000);
  await expect(page.locator(".container-footer")
  ).toBeVisible();

  //Click on Opportunity/Waterfall

  await page.getByText('Waterfall').click();
  await page.waitForTimeout(5000);
  await expect(
      page.locator(".container-footer")
    ).toBeVisible();

  //Click on Opportunity/9 boxes

  await page.getByText('Supplier Prioritization', { exact: true }).click();
  await page.waitForTimeout(5000);
  await expect(
      page.locator(".container-footer")
    ).toBeVisible();
});

test("Presence of .container-footer class in ADA/Analyze @ui @us-5157 @tc-5195 @tc-5197 @tc-5198 @tc-5199 @tc-5200 @tc-5236", async ({ page }) => {
  // Go to Analize/Overview section
  await page.locator('a').filter({ hasText: 'Analyze' }).click();
  await page.waitForTimeout(5000);

  // Class is present in the Analize/Overview, the default tab view
  await expect(
      page.locator(".container-footer")
    ).toBeVisible();

  //Class is presen in the analize/List tab view
  await page.getByText('List', { exact: true }).click();
  await expect(
      page.locator(".container-footer")
    ).toBeVisible();
});

test("Presence of .container-footer class in ADA/Plan @ui @us-5157", async ({ page }) => {
  await goToHomeSection(page);
  // Go to Plan section
  await page.locator('a').filter({ hasText: 'Plan' }).click();
  await page.waitForTimeout(5000);

  // Class is present in the Plan, the default tab view
  await expect(
      page.locator(".container-footer")
    ).toBeVisible();
});

test("Presence of .container-footer class in ADA/Entities @ui @us-5157", async ({ page }) => {
  // Go to Analize/Overview section
  await page.locator('a').filter({ hasText: 'Suppliers' }).click();
  await page.waitForTimeout(5000);
  // Class is present in the Entities main page, the default tab view
  await expect(
      page.locator(".container-footer")
    ).toBeVisible();
});

test("Presence of .container-footer class in ADA/Compare @ui @us-5157", async ({ page }) => {
  // Go to Compare section
  await page.locator('a').filter({ hasText: 'Compare' }).click();

  // Class is present in the Compare, the default tab view
  await expect(
      page.locator(".container-footer")
    ).toBeVisible();
});

test("Presence of .container-footer class in ADA/Match @ui @us-5157", async ({ page }) => {
  // Go to Match/Overview section
  await page.locator('a').filter({ hasText: 'Match' }).click();

  // Class is present in the Match/Overview, the default tab view
  await expect(
      page.locator(".container-footer")
    ).toBeVisible();
});

test.afterEach(async ({ page }) => {
  await ensureDefaultLogin(page);
});
