/**
 * Test Plan "Sprint 111" / Suite 17471 — WI#16637.
 *
 * Covered test cases:
 *   TC-17489 Blocked when the spend file has NO contractual terms.
 *   TC-17490 Recalculation failure retains the previous basis (front-end half —
 *            see the note on that test).
 *
 * Neither test persists a basis change, so no recalculation is enqueued and the
 * file is safe to run in any order.
 *
 *   @company    = "Company Test"
 *   @spendFile  = discovered at runtime — TC-17489 needs a version WITHOUT
 *                 contractual payment terms, which is a property of the data
 *                 rather than a fixed fixture name
 *   @user       = E2E_AUTH_USERNAME_SUPER_ADMIN (Setup is admins only)
 */

import { expect, Page, test } from "@playwright/test";
import { ensureSuperAdminLogin } from "../utils/Utils";
import { locators } from "../utils/locators";
import Api2 from "../utils/APi2";
import CashFlowCalculationUtils, {
  CASH_FLOW_BASIS,
  CashFlowBasisState,
} from "../utils/CashFlowCalculationUtils";

const MODAL = '#calculum-modal-container [data-testid="modal"]';
const ERROR_TOAST = ".Vue-Toastification__toast--error";

const NO_CONTRACTUAL_TERMS_ERROR =
  "Contractual payment terms are not available in this spend file. " +
  "The calculation basis cannot be changed.";

test.describe.configure({ mode: "serial" });

let page: Page;
let api: Api2;
/** Version active when the file started, restored so later specs keep their fixture. */
let originalVersionUuid: string;

test.describe("Cash Flow Calculation — guards", () => {
  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();

    await ensureSuperAdminLogin(page);
    await page.goto("/");
    await page.waitForSelector(".loading-modal", { state: "detached" });

    api = await Api2.getInstance(page);
    await api.refreshWhoAmI(true);
    originalVersionUuid = (await CashFlowCalculationUtils.readBasisState(api))
      .spendFileVersionUuid;
  });

  test.afterAll(async () => {
    // Both halves are guarded: beforeAll can fail between getting the API and
    // resolving the state, and an unguarded restore would then ask the platform
    // to activate a version of `undefined`.
    if (api && originalVersionUuid) {
      await api.changeToSpendFileVersion(originalVersionUuid, true);
    }
    await page.close();
  });

  test("Contractual is rejected when the spend file has no contractual terms @setup @cashFlow @ui @tc-17489 @us-16637", async () => {
    // `hasContractualPaymentTerms` is hydrated by who_am_i for the ACTIVE
    // version only, so the fixture is found by activating each version of the
    // company in turn — a plain API call would report false for all of them.
    const versions = api.getCurrentCompanySpendFileVersions();
    expect(
      versions.length,
      "The active company exposes no spend file versions",
    ).toBeGreaterThan(0);

    // Activating a version is a cheap API round trip, but the scan is still
    // bounded so a company with a long history cannot stretch the file past its
    // time budget.
    const MAX_VERSIONS_TO_SCAN = 8;

    // The scan leaves whichever version it stopped on active, so everything from
    // here on runs inside a try/finally: the restore has to happen on the skip
    // path too, or TC-17490 would inherit a version this test happened to land on.
    let target: CashFlowBasisState | null = null;
    try {
      for (const version of versions.slice(0, MAX_VERSIONS_TO_SCAN)) {
        await api.changeToSpendFileVersion(version.versionUUid, true);
        const state = await CashFlowCalculationUtils.readBasisState(api);
        if (!state.hasContractualPaymentTerms) {
          target = state;
          break;
        }
      }

      // Narrowed in a block rather than asserted with `!` below: test.skip only
      // aborts when its condition holds, so the type has to be established here.
      if (target === null) {
        test.skip(
          true,
          `None of the first ${MAX_VERSIONS_TO_SCAN} spend file versions of this company ` +
            "lacks contractual payment terms, so the E1 guard cannot be exercised end to end",
        );

        return;
      }

      // Back to the UI with the version that has no contractual terms active.
      await page.goto("/");
      await page.waitForSelector(".loading-modal", { state: "detached" });
      await CashFlowCalculationUtils.openCashFlowTab(page);
      await CashFlowCalculationUtils.waitForSetupEditable(page);

      await CashFlowCalculationUtils.selectBasisAndSave(
        page,
        CASH_FLOW_BASIS.CONTRACTUAL,
      );

      // The platform reports the missing data instead of proceeding.
      await expect(page.locator(ERROR_TOAST)).toContainText(
        NO_CONTRACTUAL_TERMS_ERROR,
      );

      // The selection reverts and the confirmation modal never opens.
      await expect(
        page.locator(locators.settings.cashFlow.averageDaysPaidRadio),
      ).toBeChecked();
      await expect(
        page.locator(MODAL),
        "The recalculation modal opened even though the guard rejected the change",
      ).toBeHidden();

      // Nothing was saved and nothing was recalculated.
      const after = await CashFlowCalculationUtils.readBasisState(api);
      expect(
        after.hideAverageDaysPaid,
        "The Contractual basis was persisted despite the missing contractual terms",
      ).toBeFalsy();
      await expect(
        page.locator(locators.settings.cashFlow.recalculationAlert),
      ).toBeHidden();

      // The same guard is enforced server side, so a direct call cannot bypass it.
      const response = await api.doPatch(
        `/api/spend_file_versions/${target.spendFileVersionUuid}`,
        { hideAverageDaysPaid: true },
      );
      expect(
        response.status(),
        "The API accepted the Contractual basis without contractual terms",
      ).toBe(422);
      expect(await response.text()).toContain(
        "Contractual payment terms are not available in this spend file",
      );
    } finally {
      // Hand the next test back the version this file started on.
      await api.changeToSpendFileVersion(originalVersionUuid, true);
    }
  });

  test("A failed save keeps the previous basis and surfaces the error @setup @cashFlow @ui @tc-17490 @us-16637", async () => {
    // Scope note: the acceptance criterion also states that the audit entry is
    // written at the point of the user's intent even when the asynchronous
    // recalculation job later fails. That job runs outside the browser, so the
    // audit-on-failure half is not observable from an end-to-end test and is
    // covered by the back-end suite. What is asserted here is the front-end
    // contract: the platform reports the failure and keeps the previous basis.
    const state = await CashFlowCalculationUtils.ensureBasis(api, false);
    test.skip(
      !state.hasContractualPaymentTerms,
      "The active spend file version has no contractual terms, so the save cannot be reached",
    );

    await page.goto("/");
    await page.waitForSelector(".loading-modal", { state: "detached" });
    await CashFlowCalculationUtils.openCashFlowTab(page);
    await CashFlowCalculationUtils.waitForSetupEditable(page);

    // Fail the persistence step the way a rejected recalculation would.
    const versionRoute = `**/api/spend_file_versions/${state.spendFileVersionUuid}`;

    await page.route(versionRoute, async (route) => {
      if (route.request().method() !== "PATCH") {
        await route.continue();
        return;
      }
      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ "hydra:description": "Recalculation failed" }),
      });
    });

    // Everything that runs under the mock goes inside the try: a failed
    // assertion here would otherwise abort the test with the 500-fulfilling
    // route still installed on the shared page, and afterAll's restore — plus
    // any PATCH a later spec sends on this version — would be answered with it.
    try {
      await CashFlowCalculationUtils.selectBasisAndSave(
        page,
        CASH_FLOW_BASIS.CONTRACTUAL,
      );
      await page
        .locator(MODAL)
        .getByRole("button", { name: "Accept & recalculate" })
        .click();

      await expect(page.locator(ERROR_TOAST)).toBeVisible();
      await expect(page.locator(MODAL)).toBeHidden();

      // The platform retains the previous basis until the change completes.
      const after = await CashFlowCalculationUtils.readBasisState(api);
      expect(
        after.hideAverageDaysPaid,
        "The basis was switched even though the save failed",
      ).toBeFalsy();
      await expect(
        page.locator(locators.settings.cashFlow.recalculationAlert),
      ).toBeHidden();
    } finally {
      await page.unroute(versionRoute);
    }
  });
});
