/**
 * @fileoverview
 * E2E test for Categorize List - Check new URL for logo images.
 *
 * This test verifies that the logo images in the Categorize List are loaded from the logo service
 * host (logos.hello-ada.com).
 *
 * Test Flow:
 * 1. Navigate to the application and ensure the correct spend file is selected.
 * 2. Go to the Analyze > List section for Parents.
 * 3. Wait for the grid to fill and rows to appear.
 * 4. For each row, check if a logo image is present and verify its URL.
 *
 * Acceptance Criteria:
 * - The Categorize List displays rows with logo images.
 * - At least one logo is served from logos.hello-ada.com.
 * - Every other logo uses the legacy CloudFront media path: the Back-End keeps it for domains
 *   the logo service has no logo for (`COALESCE(logo_url, media.path)`).
 * - The test is tagged for UI, analyze, and user story tracking.
 */


import { expect, test } from "@playwright/test";
import { changeToSpendFile, goToAnalyzeSection } from "../../utils/Utils";

const NEW_LOGO_URL = /^https:\/\/logos\.hello-ada\.com\//;
const LEGACY_LOGO_URL = /\.cloudfront\.net\/logodomains\//;

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector(".loading-modal", { state: "detached" });
});

test("Categorize List check new Url cloudfront @ui @analyze @us-962)", async ({
  page,
}) => {
  // check for home-dashboard
  await changeToSpendFile(page, "Pagero_20230124.xlsx (Ver. 1)");
  await goToAnalyzeSection(page, "List", true, "Parents", false);

  // Wait grid fill and Table gets rows
  await page.waitForTimeout(2000);

  // The Spends and Suppliers grids stay mounted behind `.hidden-grid`, so
  // rows must be scoped to the visible grid.
  const repeatedProviderTRs = page.locator(".k-master-row:visible");
  const providerCount = await repeatedProviderTRs.count();
  console.log("Rows: " + providerCount);

  let newLogoCount = 0;
  for (let i = 0; i < providerCount; i++) {
    const current = repeatedProviderTRs.nth(i);
    const colums = current.locator("td");
    const count = await colums.nth(1).locator("div >> img").count();
    if (count === 1) {
      const img = colums.nth(1).locator("div >> img");
      const src = await img.getAttribute("src");
      console.log("Url logo:", src);
      if (NEW_LOGO_URL.test(src ?? "")) {
        newLogoCount++;
      } else {
        // Domains without a logo-service logo keep the legacy CloudFront media.
        expect(src).toMatch(LEGACY_LOGO_URL);
      }
    } else {
      console.log("Url logo:", "Not contains");
    }
  }

  console.log("Logos from logos.hello-ada.com:", newLogoCount);
  expect(newLogoCount).toBeGreaterThan(0);
});
