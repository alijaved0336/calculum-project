/**
 * @fileoverview
 * E2E test for Spend Section in Admin Console.
 *
 * This test verifies the behavior of the company dropdown and the Spend File
 * Upload button in the Admin Console UI.
 *
 * Test Flow:
 * 1. Ensure default login state before each test.
 * 2. Log in as Super Admin.
 * 3. Navigate to the Admin Console Data Controller.
 * 4. Select "All Companies" from the companies dropdown.
 * 5. Check that the "+ Upload File" button is not rendered.
 * 6. Select a single company and check that the button is rendered.
 *
 * Acceptance Criteria:
 * - The Spend Files card is visible in the Data section.
 * - The "+ Upload File" button is absent when "All Companies" is selected and
 *   present as soon as a single company is.
 * - The test is tagged for admin, UI, and user story tracking.
 */

import { test, expect } from "@playwright/test";
import {
  ensureDefaultLogin,
  goToAdminConsoleDataController,
  loginAsSuperAdmin,
  selectCompanyInDataController,
} from "../utils/Utils";

const ALL_COMPANIES = "All Companies";
const PREFERRED_COMPANY = "Company Test";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await ensureDefaultLogin(page);
});

test("Admin > Checking Drowdown and Spend File Upload Button @tc-7234 @admin @ui", async ({
  page,
}) => {
  test.setTimeout(180_000);

  await loginAsSuperAdmin(page);

  // goToAdminConsoleDataController consumes the /api/companies response with
  // its own waiter; a second waiter armed beforehand observes the same
  // response, which is what names the company to select below instead of
  // hardcoding one that may not exist in this environment.
  const companiesPromise = page.waitForResponse(
    (response) => response.url().endsWith("/api/companies") && response.ok(),
    { timeout: 60_000 },
  );
  await goToAdminConsoleDataController(page);

  const companies: Array<{ name: string }> =
    (await (await companiesPromise).json())["hydra:member"] ?? [];
  const companyNames = companies.map((company) => company.name);
  console.log("Admin console companies:", companyNames);

  const companyName = companyNames.includes(PREFERRED_COMPANY)
    ? PREFERRED_COMPANY
    : companyNames[0];

  // Guard right after companyNames is read, before any assertion runs: an
  // empty list would otherwise fail the spendCard visibility check first (or
  // reach selectCompany with an undefined name) instead of skipping with a
  // clear reason.
  test.skip(
    companyName === undefined,
    "The admin console listed no company to select",
  );

  const spendCard = page
    .locator("div.card")
    .filter({ has: page.getByText("Spend Files", { exact: true }) })
    .first();
  await expect(spendCard).toBeVisible({ timeout: 30_000 });

  // AdminUploadData renders the button behind `uploadFileIsBtnIsVisible`,
  // which is false while no company or "All Companies" is selected, so the
  // whole element is absent rather than disabled.
  const uploadButton = page.locator("#upload-spend-file");

  // SearchableDropdown resets to "All Companies" on every
  // selectCompanyInDataController call before picking the target, and a
  // selection made while it is still re-rendering from that reset can be
  // dropped - the run that exposed this ended back on "All Companies" with the
  // per-company request already answered. Drive it from its own rendered label
  // and re-select until it settles.
  const dropdownLabel = page
    .locator(".custom-searchable-dropdown .dropdown-selected-content span")
    .first();

  const selectCompany = async (name: string) => {
    const currentName = async () =>
      ((await dropdownLabel.textContent()) ?? "").trim();

    await expect
      .poll(
        async () => {
          if ((await currentName()) === name) {
            return true;
          }

          await selectCompanyInDataController(page, name);

          return (await currentName()) === name;
        },
        {
          message: `the company dropdown never settled on '${name}'`,
          timeout: 90_000,
          intervals: [1_000, 2_000, 3_000],
        },
      )
      .toBe(true);
  };

  console.log("Selecting company:", companyName);
  await selectCompany(companyName);

  await expect(
    uploadButton,
    "The upload button is missing for a single selected company",
  ).toBeVisible({ timeout: 30_000 });

  await selectCompany(ALL_COMPANIES);
  await expect(
    uploadButton,
    "The upload button is offered while All Companies is selected",
  ).toBeHidden({ timeout: 30_000 });

  // The recalculate leg the previous version carried is deliberately gone: it
  // fired /spend-file-versions/recalculate against a shared environment and
  // then closed with `if (count > 0) expect(count).toBeGreaterThan(0) else
  // expect(count).toBe(0)`, which holds for every possible count. It asserted
  // nothing and mutated data other specs depend on.
});

test.afterEach(async ({ page }) => {
  await ensureDefaultLogin(page);
});
