/**
 * Test suite for validating totals display in suppliers grid
 * @testCase 4181
 * @tags ui, us-10728, program, grids
 */

import { expect, test } from "@playwright/test";
import {
  changeToSpendFile,
  ensureDefaultLogin,
  ensureAdminLogin,
} from "../../utils/Utils";
import { locators } from "../../utils/locators";
import ProgramUtils from "../../utils/ProgramUtils";
import {
  safePromiseAll,
  waitForApiResponse,
  logOperation,
  safeOperation,
  retryOperation,
  waitForElementAttached,
} from "../../utils/PlaywrightTestHelpers";

const SPEND_FILE = "Pagero-SF4.xlsx (Ver. 1)";

test.beforeEach(async ({ page }) => {
  await ensureAdminLogin(page);
  await changeToSpendFile(page, SPEND_FILE);

  // Navigate to program section. With one program per spend file the user
  // either lands directly on the program overview, or on the all-programs list
  // with a single SHOW button. Handle both.
  await ProgramUtils.goToProgramSection(page);
  await page.waitForTimeout(2000);
  if (!page.url().includes("/analyze/program_overview")) {
    const showBtn = page.getByRole("button", { name: "Show", exact: true }).first();
    if (await showBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await showBtn.click();
      await page.waitForURL(/.*\/analyze\/program_overview/, { timeout: 30000 });
    }
  }
});

test.afterEach(async ({ page }) => {
  await ensureDefaultLogin(page);
});

test("Validate Totals in suppliers: @ui @us-10728 @program @grids", async ({ page }) => {
  // Navigate to program list and wait for suppliers summary to load
  await safeOperation(
    page,
    async () => {
      await safePromiseAll(
        [
          waitForApiResponse(
            page,
            "/api/filters/program/suppliers/summary",
            30000,
            "Program list suppliers summary API",
          ),
          page.locator(locators.headerMenu.programHeader.list).click(),
        ],
        "Program list navigation",
      );
    },
    "Navigate to program list",
  );

  logOperation("Navigated to program list");

  // Wait for totals API to complete
  await safeOperation(
    page,
    async () => {
      try {
        await waitForApiResponse(
          page,
          /.*\/api\/.*uniqueData|.*summaryOperation/i,
          30000,
          "Totals data API",
        );
        logOperation("Totals API response received");
      } catch (error) {
        logOperation("Totals API not detected, continuing with element check");
      }
    },
    "Wait for totals API",
  );

  // Ensure footer totals are visible before proceeding with retry logic
  await safeOperation(
    page,
    async () => {
      await retryOperation(
        async () => {
          await waitForElementAttached(
            page,
            "div.footer-totals",
            20000,
            "Footer totals attachment",
          );

          const footerTotals = page.locator("div.footer-totals");
          const totalCount = await footerTotals.count();

          if (totalCount === 0) {
            throw new Error("No footer-totals elements found in DOM");
          }

          logOperation("Footer totals elements found in DOM", { totalCount });

          let visibleCount = 0;
          let visibleElement = null;
          let attempts = 0;
          const maxAttempts = 60;

          while (visibleCount === 0 && attempts < maxAttempts) {
            for (let i = 0; i < totalCount; i++) {
              const element = footerTotals.nth(i);
              const isVisible = await element.isVisible().catch(() => false);
              if (isVisible) {
                visibleCount++;
                visibleElement = element;
                break;
              }
            }

            if (visibleCount === 0) {
              attempts++;
              await page.waitForTimeout(500);
            }
          }

          if (visibleCount === 0) {
            throw new Error(`No visible footer-totals found after checking ${totalCount} elements over ${attempts * 500}ms`);
          }

          logOperation("At least one footer-totals is visible", { visibleCount, totalCount });

          if (visibleElement) {
            const text = await visibleElement.textContent();
            if (!text || text.trim().length === 0) {
              throw new Error("Visible footer-totals element has no content");
            }

            const hasExpectedContent = /(Sum:|Avg Weighted:|\d)/.test(text);
            if (!hasExpectedContent) {
              throw new Error(`Footer totals element found but content doesn't match expected pattern: ${text.trim().substring(0, 50)}`);
            }

            logOperation("Footer totals are visible and have content", {
              visibleCount,
              totalCount,
              sampleContent: text.trim().substring(0, 50),
            });
          }
        },
        3,
        2000,
        "Wait for footer totals with content",
      );
    },
    "Wait for footer totals visibility",
  );

  // Validate footer totals are displayed
  await safeOperation(
    page,
    async () => {
      const footerGrid = page.locator("div.footer-totals");
      const totalCount = await footerGrid.count();
      expect(totalCount).toBeGreaterThan(0);

      logOperation("Footer totals found", { totalCount });

      const visibleFooterGrid = page.locator("div.footer-totals:visible");
      const visibleCount = await visibleFooterGrid.count();
      expect(visibleCount).toBeGreaterThan(0);

      logOperation("Visible footer totals", { visibleCount });

      await expect(visibleFooterGrid.first()).toBeVisible();

      const sums = await visibleFooterGrid
        .filter({ hasText: /Sum:\s*\d/ })
        .count();
      expect(sums).toBeGreaterThan(0);
      logOperation("Sum values found in footer", { count: sums });

      const avgWeighted = await visibleFooterGrid
        .filter({ hasText: /Avg Weighted:\s*\d/ })
        .count();
      expect(avgWeighted).toBeGreaterThan(0);
      logOperation("Avg Weighted values found in footer", { count: avgWeighted });

      logOperation("Footer totals validation passed", {
        totalCount,
        visibleCount,
        sums,
        avgWeighted,
      });
    },
    "Validate footer totals",
  );
});
