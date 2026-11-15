/**
 * US-10587 / WI 14222 - the company-level "Credit Rating" feature flag drives the
 * Ada Bot Supplier Snapshot.
 *
 * @company    = "Company_SF"
 * @spendFile  = "Pagero_VCard.xlsx (Ver. 1)"
 * @user       = E2E_AUTH_USERNAME_SF_SUPER (super admin of Company_SF)
 * @entity     = "Axtone S.A." (supplier)
 *
 * The linkage under test is: the Admin Console > Companies checkbox writes the
 * FEATURE_CREDIT_RATING role on the company, and AdaBotController gates the
 * credit-rating paragraph (sup08) on that role. Both directions are asserted:
 * the paragraph disappears when the flag is off and comes back - carrying the
 * "Credit Rating" text - when it is on. The company flag is restored in
 * afterEach because it is a shared fixture.
 */

import { test, expect, Page } from "@playwright/test";
import {
  closeEntityModal,
  changeToSpendFile,
  ensureDefaultLogin,
  ensureLogin,
  goToEntityCardEntityExactFull,
  resetFeatures,
} from "../../utils/Utils";

const COMPANY_SF_NAME = "Company_SF";
const SPEND_FILE = "Pagero_VCard.xlsx (Ver. 1)";
const ENTITY_NAME = "Axtone S.A.";
/** Role written on the company by the Admin Console checkbox. */
const CREDIT_RATING_ROLE = "FEATURE_CREDIT_RATING";
/** Grid column (and td class) of the same checkbox in Admin Console > Companies. */
const CREDIT_RATING_FEATURE_COLUMN = "featureCreditRating";
const ADA_BOT_PATH = "/api/entity-card/entity/ada-bot/all/";

const companyFilter = {
  company: COMPANY_SF_NAME,
  nameField: "name",
};

/** State of the shared company flag before the test touched it. */
let originalCreditRatingEnabled: boolean | null = null;

/**
 * Reads the FEATURE_CREDIT_RATING role straight from the API, which is the
 * source of truth the backend voter reads - the grid checkbox is only its UI.
 */
async function isCreditRatingRoleEnabled(page: Page): Promise<boolean> {
  // /api/companies is paginated at 100 items and Company_SF is not on the first
  // page: the Admin Console flow this helper replaced had to click "Go to the
  // next page" before its row appeared. The collection carries no name filter
  // (Company declares no ApiFilter), so ask for the configured maximum page size
  // instead — pagination_maximum_items_per_page is 500 — and fail loudly if even
  // that truncates the list rather than reporting the company as missing.
  const response = await page.request.get(
    `${process.env.E2E_BASE_URL_API}/api/companies?itemsPerPage=500`,
  );
  expect(response.ok()).toBeTruthy();

  const body = await response.json();
  const members = body["hydra:member"] ?? [];
  const totalItems = body["hydra:totalItems"] ?? members.length;
  expect(
    members.length,
    `/api/companies returned ${members.length} of ${totalItems} companies; page through the collection instead of reading one page`,
  ).toBe(totalItems);

  const company = members.find((item: any) => item.name === COMPANY_SF_NAME);
  expect(
    company,
    `Fixture premise: ${COMPANY_SF_NAME} must be listed in /api/companies`,
  ).toBeTruthy();

  return (company.roles ?? []).includes(CREDIT_RATING_ROLE);
}

/**
 * Toggles the Credit Rating checkbox for Company_SF in Admin Console > Companies
 * and confirms the role actually reached the backend.
 */
async function setCreditRatingFeature(page: Page, enabled: boolean) {
  // The entity modal overlays the header, so the user menu is unclickable while
  // it is open.
  await closeEntityModal(page);

  await resetFeatures(
    page,
    [CREDIT_RATING_FEATURE_COLUMN],
    enabled,
    companyFilter,
    true,
  );

  // Leave the Admin Console; the SPA restores a /home/* section from where the
  // entity search is reachable.
  await page.goto("/");

  expect(
    await isCreditRatingRoleEnabled(page),
    `${CREDIT_RATING_ROLE} should be ${enabled ? "granted" : "revoked"} after saving the Admin Console grid`,
  ).toBe(enabled);
}

/**
 * Opens the entity card for the fixture supplier and returns the Supplier
 * Snapshot section of the Ada Bot payload.
 */
async function readAdaBotSupplierSnapshot(page: Page) {
  // Register the waiter before the navigation that triggers the POST.
  const adaBotResponse = page.waitForResponse(
    // Match on the pathname: the request carries no query string today, but the
    // sibling entity-card endpoints append ?globalFilter=... and the suite's
    // convention is to never compare full URLs.
    (response) =>
      new URL(response.url()).pathname === ADA_BOT_PATH && response.ok(),
    { timeout: 90000 },
  );

  await goToEntityCardEntityExactFull(page, ENTITY_NAME, 0, true, null, "supplier");

  const response = await adaBotResponse;
  // Read the body before any further navigation: Chromium discards it and
  // response.text() then throws.
  const body = JSON.parse(await response.text());

  expect(body.snapshot).toBeTruthy();
  expect(body.snapshot.sectionName).toBe("Supplier Snapshot");

  return body.snapshot;
}

test.beforeEach(async ({ page }) => {
  await ensureLogin(
    page,
    process.env.E2E_AUTH_USERNAME_SF_SUPER!,
    process.env.E2E_AUTH_PASSWORD_SF_SUPER!,
    "ensure SF User Login",
  );
});

test("Test for Credit Rating Feature in Company @flaky @entity @integrated @us-10587 @vcard", async ({
  page,
}) => {
  // Two Admin Console round trips plus two entity-card openings do not fit the
  // 120s default budget on dev.
  test.setTimeout(300000);

  originalCreditRatingEnabled = await isCreditRatingRoleEnabled(page);
  console.log(
    `${COMPANY_SF_NAME} ${CREDIT_RATING_ROLE} initial state: ${originalCreditRatingEnabled}`,
  );

  // Pin the spend file version the fixture supplier lives in.
  await changeToSpendFile(page, SPEND_FILE);

  // Feature OFF -> AdaBotController skips the sup08 paragraph entirely.
  await setCreditRatingFeature(page, false);
  const snapshotWithoutFeature = await readAdaBotSupplierSnapshot(page);
  console.log(
    "Supplier Snapshot details with the feature disabled: ",
    Object.keys(snapshotWithoutFeature.details),
  );
  expect(Object.keys(snapshotWithoutFeature.details)).not.toContain("sup08");

  // Feature ON -> the paragraph comes back and states the Credit Rating.
  await setCreditRatingFeature(page, true);
  const snapshotWithFeature = await readAdaBotSupplierSnapshot(page);
  console.log(
    "Supplier Snapshot details with the feature enabled: ",
    Object.keys(snapshotWithFeature.details),
  );
  expect(Object.keys(snapshotWithFeature.details)).toContain("sup08");
  expect(snapshotWithFeature.details.sup08).toContain("Credit Rating");
});

test.afterEach(async ({ page }) => {
  // Company_SF is a shared fixture: put its Credit Rating flag back the way the
  // test found it before handing the browser to the next spec.
  if (originalCreditRatingEnabled !== null) {
    try {
      if (
        (await isCreditRatingRoleEnabled(page)) !== originalCreditRatingEnabled
      ) {
        console.log(
          `Restoring ${CREDIT_RATING_ROLE} on ${COMPANY_SF_NAME} to ${originalCreditRatingEnabled}`,
        );
        await page.goto("/");
        await setCreditRatingFeature(page, originalCreditRatingEnabled);
      }
    } catch (error) {
      console.error(
        `Could not restore ${CREDIT_RATING_ROLE} on ${COMPANY_SF_NAME}: `,
        error,
      );
      throw error;
    } finally {
      originalCreditRatingEnabled = null;
    }
  }

  await ensureDefaultLogin(page);
});
