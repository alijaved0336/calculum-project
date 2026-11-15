/**
 * USER STORY 5376
 *
 * TC 5401
 * Analyze, Program, Plan, Entity, Match, Compare sections
 * Are test for having visible .sub-main-sections
 */

import { expect, test } from "@playwright/test";
import {
  changeToSpendFile,
  goToPlanSection,
  ensureDefaultLogin,
  goToHomeSection,
} from "../utils/Utils";

import { locators } from "../utils/locators";
import { AnalyzeUtils } from "../utils";

/**
 * If a test fails, it will not be retried.
 */

const spendFileName = "Pagero_Full_20230927_1.xlsx (Ver. 1)";
const programName = "All Suppliers - CF - No Financing";

import Api2 from "../utils/APi2";

test.beforeEach(async ({ page }) => {
  // Previously this hook relied on `state.json` cookies + a bare
  // `page.goto("/")` + `.loading-modal` detach wait. The detach wait
  // could exceed the 120s test budget on dev/test under load (flaky
  // 2026-05-18 attempt 0 timed out at 133s inside changeToSpendFile's
  // `waitForTimeout(5000)` because the dashboard hadn't settled).
  // ensureDefaultLogin is the canonical wait — it lands on
  // /home/home-dashboard with all the dashboard endpoints resolved.
  await ensureDefaultLogin(page);
  await changeToSpendFile(page, spendFileName);
});

test("Presence of .sub-main-sections class in ADA/Programs @ui @us-5376 @tc-5401", async ({
  page,
}) => {
  await goToHomeSection(page);
  // Go to Program section
  await page.locator("a").filter({ hasText: "Opportunity" }).click();
  await page.waitForTimeout(5000);

  //Program/Overview
  await expect(page.locator(".sub-main-sections")).toBeVisible();

  //Click on Program/LIST
  await page.locator(locators.headerMenu.programHeader.list).click();

  await expect(page.locator(".sub-main-sections")).toBeVisible();

  //Click on Program/Waterfall
  await page.locator(locators.headerMenu.programHeader.waterfall).click();

  await expect(page.locator(".sub-main-sections")).toBeVisible();

  //Click on Program/9 boxes
  await page.locator(locators.headerMenu.programHeader.nineBoxes).click();

  await expect(page.locator(".sub-main-sections")).toBeVisible();
});

test("Presence of .sub-main-sections class in ADA/Analyze @ui @us-5376", async ({
  page,
}) => {
  await goToHomeSection(page);
  // Go to Analize/Overview section. `goToHomeSection` accepts any /home/*
  // route (a persisted `selectedProgram` deep-links to
  // /home/analyze/program_overview), so the helper must not re-assert
  // /home-dashboard as its precondition.
  await AnalyzeUtils.goToAnalyzeSection(page, { isFromHome: false });

  // Class is present in the Analize/Overview, the default tab view
  await expect(page.locator(".sub-main-sections")).toBeVisible();

  //Class is present in the analize/List tab view
  await page.getByText("List").first().click();

  await expect(page.locator(".sub-main-sections")).toBeVisible();
});

test("Presence of .sub-main-sections class in ADA/Plan @ui @us-5376", async ({
  page,
}) => {
  await goToHomeSection(page);
  // Go to Analize/Overview section
  await goToPlanSection(page);

  // Class is present in the Plan, the default tab view
  await expect(page.locator(".sub-main-sections")).toBeVisible();
});

test("Presence of .sub-main-sections class in ADA/Compare @ui @us-5376", async ({
  page,
}) => {
  await goToHomeSection(page);
  // Go to Compare section
  await page.locator("a").filter({ hasText: "Compare" }).click();

  // Class is present in the Compare, the default tab view
  await expect(page.locator(".sub-main-sections")).toBeVisible();
});

test("Presence of .sub-main-sections class in ADA/Match @ui @us-5376", async ({
  page,
}) => {
  await goToHomeSection(page);
  // Go to Match/Overview section
  await page.locator("a").filter({ hasText: "Match" }).click();

  // Class is present in the Match/Overview, the default tab view
  await expect(page.locator(".sub-main-sections")).toBeVisible();

  // Go to Match/LIST section
  await page
    .locator(
      ".btn.btn-clean.font-md.text-capitalize.custom-padding-btn.rounded-tbl-none.btn-clean:has-text('LIST')",
    )
    .first()
    .click();

  // Class is present in the Match/LIST, the default tab view
  await expect(page.locator(".sub-main-sections")).toBeVisible();
});
test.afterEach(async ({ page }) => {
  await ensureDefaultLogin(page);
});
