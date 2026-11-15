/**
 * @fileoverview
 * E2E tests for Company Details - Procurement Teams on the Entity Card.
 *
 * This test suite validates that the procurement team members are displayed correctly
 * in the Company Details section of the entity card, and that the correct number of
 * tooltip icons are present for subcategories.
 *
 * Test Flow:
 * 1. Ensure default login before each test.
 * 2. Change to a specific spend file.
 * 3. Open the entity card for a given company.
 * 4. Navigate to the Company Details section.
 * 5. Assert that the procurement team members are displayed as expected.
 * 6. Assert that the correct number of tooltip icons are present.
 *
 * Acceptance Criteria:
 * - The procurement team members are displayed in the correct format.
 * - The expected number of tooltip icons are present for subcategories.
 * - The test is tagged for integrated, entity, and company details validation.
 */


import { test, expect, type Locator, type Page } from "@playwright/test";
import {
  changeToSpendFile,
  ensureDefaultLogin,
  goToEntityCardEntity,
} from "../../utils/Utils";

test.beforeEach(async ({ page }) => {
  await ensureDefaultLogin(page);
  await changeToSpendFile(page, "20221011_MATCH_OVERVIEW.xlsx (Ver. 5)");
  await page.goto("/");
});

/**
 * Returns the DetailBox root (title + value flex column) identified by its
 * title text. Anchoring on the semibold title span is required because the
 * hidden global-filters panel repeats the same labels in a Kendo panel bar,
 * and those copies would otherwise win a plain text match.
 */
function detailBoxByTitle(page: Page, title: string): Locator {
  return page
    .locator("span.font-semibold")
    .filter({ hasText: new RegExp(`^\\s*${title}\\s*$`) })
    .locator(
      "xpath=ancestor::div[contains(concat(' ', normalize-space(@class), ' '), ' flex-column ')][1]",
    );
}

test("Company Details - Procurement Teams @integrated @entity", async ({
  page,
}) => {
  await goToEntityCardEntity(page, "Johannes Matzhold Gesmbh");

  // Opening the tab mounts EntityCardCompanyDetails, which fetches
  // /api/entity-card/entity/{uuid}/detail; the payload's `team` field is what
  // the Procurement Team DetailBox renders ("-" when null), so assert against
  // live data instead of a hard-coded roster that admins can edit away.
  const detailResponsePromise = page.waitForResponse((response) => {
    const path = new URL(response.url()).pathname;
    return (
      /\/api\/entity-card\/entity\/[^/]+\/detail$/.test(path) && response.ok()
    );
  });

  // Scope the tab click as header-tabs.spec.ts does, so the parent-level note
  // banner's "(see corporate tree)" link cannot collide with the match.
  await page
    .locator(".container-top-sections")
    .getByText("Company details", { exact: true })
    .click();

  const detail = await (await detailResponsePromise).json();
  // Assert the field is where the DetailBox reads it from before deriving the
  // expected value: a wrapped or renamed payload would leave detail.team
  // undefined, silently fall back to "-" and pass vacuously against the dash
  // the box renders for missing data.
  expect(detail, "the detail payload exposes team at its root").toHaveProperty(
    "team",
  );
  const expectedTeam: string = detail.team ?? "-";
  console.log("Procurement team from API: ", expectedTeam);

  const teamBox = detailBoxByTitle(page, "Procurement Team");
  await expect(teamBox.locator("span.text-lg").first()).toHaveText(
    expectedTeam,
  );

  // Each subcategory DetailBox carries its informational tooltip icon; check
  // per-box instead of a page-wide magic count that drifts with role/layout.
  await expect(teamBox.getByTestId("tooltip-icon")).toBeVisible();
  for (const title of ["COUNTRY", "OWNERSHIP", "URL"]) {
    await expect(
      detailBoxByTitle(page, title).getByTestId("tooltip-icon"),
    ).toBeVisible();
  }
});
