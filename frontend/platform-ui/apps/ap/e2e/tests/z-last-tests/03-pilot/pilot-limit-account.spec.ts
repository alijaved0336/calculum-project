/**
 * @fileoverview
 * E2E test for verifying the Pilot Account Limit functionality.
 *
 * Main Flows:
 * 1. Ensure the user is logged in as a Pilot Super Admin.
 * 2. Navigate to the Admin Console and select the "Pilot-Company".
 * 3. Verify that the End Date for the pilot is set and displayed in the upper banner.
 *
 * Acceptance Criteria:
 * - The user is able to log in and access the Admin Console.
 * - The "Pilot-Company" can be filtered and selected.
 * - The End Date for the pilot is visible in the upper banner as expected.
 * - The test passes if the End Date is displayed correctly.
 *
 * Test tags:
 * - @integrated
 * - @tc-9130
 */


import { test, expect } from "@playwright/test";
import {
  ensureDefaultLogin,
  getValidPage,
  ensureLogin,
  resetFeatures,
} from "../../utils/Utils";
import { locators } from "../../utils/locators";
import Api2 from "../../utils/APi2";

/** The company whose pilot window this test reads. */
const PILOT_COMPANY = "Pilot-Company";

/**
 * The label the navbar shows once a pilot trial has elapsed.
 * Mirrors PILOT_EXPIRED_LABEL in
 * apps/ap/src/modules/home/composables/usePilotAccount.ts.
 */
const PILOT_EXPIRED_LABEL = "Pilot Expired: Upgrade for Full Access";

/**
 * The label the navbar builds from a pilot end date, replicated from the
 * product's own formula (`pilotStatus` in
 * apps/ap/src/services/user/composables/useUser.ts): the remaining days are
 * rounded UP, and the wording switches to the singular at one day.
 *
 * Replicating it here is what makes this test an assertion rather than a
 * tautology: the expected label is derived from the raw `pilotTimeExpire`
 * date the API stores, and compared against the string the app renders, so a
 * regression in the derivation is caught.
 */
function pilotLabelFor(endDate: string): string {
  const diffInDays = Math.ceil(
    (new Date(endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24),
  );

  return diffInDays > 0
    ? `${diffInDays} ${diffInDays === 1 ? "day" : "days"} left in Pilot`
    : PILOT_EXPIRED_LABEL;
}

test.beforeEach(async ({ browser, page }, testInfo) => {
  const { page: validPage, context } = await getValidPage(page, browser);

  // Keep the context so afterEach can close it when we created one
  (testInfo as any).contextToDispose = context;
  
  await ensureLogin(validPage, process.env.E2E_AUTH_USERNAME_PILOT_SUPER_ADMIN!, process.env.E2E_AUTH_PASSWORD_PILOT_SUPER_ADMIN!, "ensureSuperLogin Pilot");

  await validPage.waitForSelector(".loading-modal", { state: "detached" });

  // Stop at the user panel. The Admin Console navigation used to live here as
  // well, which left the test already inside the console by the time
  // resetFeatures tried to open it - and `button#user-menu`, the control it
  // starts from, does not exist in there.
  await validPage.goto("/");
});

test("TC-9130 - The Pilot is set the End Date and it is shown on the upper banner. @integrated @tc-9130", async ({
  browser,
  page,
}) => {
  const { page: validPage } = await getValidPage(page, browser);

  // Make sure the pilot feature is ON for the company. resetFeatures anchors on
  // the `td.featurePilotAccountIsAvailable` cell of the row whose name column
  // is exactly PILOT_COMPANY, instead of the page-wide
  // `input[type=checkbox]`.last() the old helper used - that one resolved to
  // whatever checkbox happened to be last in the DOM.
  //
  // The flag is only ever turned ON here, never cycled off and on again. The
  // original test unchecked it and re-checked it, which silently rewound the
  // company's pilot window to a fresh 30 days on every run: a destructive
  // write to a shared fixture, and the reason the end date could never be
  // asserted against anything stable.
  await resetFeatures(
    validPage,
    ["featurePilotAccountIsAvailable"],
    true,
    { company: PILOT_COMPANY, nameField: "name" },
    true,
  );

  console.log("Going back to the user panel ...");

  await Promise.all([
    validPage.waitForResponse(
      (response) =>
        new URL(response.url()).pathname.startsWith("/api/users/") &&
        response.ok(),
    ),
    validPage.locator(locators.userMenu.adminConsole.userPanel).click(),
  ]);

  // The banner reads activeCompany.pilotTimeExpire off the session, so the
  // expected label is derived from that same date as the API stores it.
  const api = await Api2.getInstance(validPage);
  const whoAmI = await (await api.doGet("/api/user/who_am_i")).json();
  const activeCompanyName = whoAmI?.activeCompany?.name ?? null;
  const pilotTimeExpire = whoAmI?.activeCompany?.pilotTimeExpire ?? null;

  console.log(
    `Active company '${activeCompanyName}' expires its pilot on ${pilotTimeExpire}`,
  );

  // The feature was enabled on PILOT_COMPANY's grid row, and the banner reads
  // the ACTIVE company's date. Assert they are the same company: otherwise the
  // test enables the flag on one and asserts the banner of another, and the
  // pilotTimeExpire premise below fails pointing at the wrong cause.
  expect(
    activeCompanyName,
    `the pilot banner belongs to the active company, which must be ${PILOT_COMPANY}`,
  ).toBe(PILOT_COMPANY);

  expect(
    pilotTimeExpire,
    "the active company must carry a pilot end date once the pilot feature is enabled",
  ).toBeTruthy();

  const expectedLabel = pilotLabelFor(pilotTimeExpire);

  console.log(`Expecting the banner to read '${expectedLabel}'`);

  const pilotBanner = validPage
    .locator(locators.pilotSection.divPilotSection)
    .locator("span.ml-1.get-time-limit");

  await expect(pilotBanner).toHaveText(expectedLabel);

  // A future end date must never render as expired, and vice versa. Stated
  // separately so a formula that silently collapsed to the expired branch
  // cannot pass by accident.
  if (new Date(pilotTimeExpire).getTime() > Date.now()) {
    await expect(pilotBanner).not.toHaveText(PILOT_EXPIRED_LABEL);
  }
});

test.afterEach(async ({ page }, testInfo) => {
  await ensureDefaultLogin(page);
  const context = (testInfo as any).contextToDispose;
  if (context) {
    await context.close();
  }
});
