/**
 * Test Plan "Sprint 111" / Suite 17471 — WI#16637.
 *
 * Covered test cases:
 *   TC-17482 Switching back to 'Average Days Paid' is seamless (no modal) and
 *            restores visibility.
 *   TC-17486 Saving Cash Flow Calculation does not affect Payment Float.
 *   TC-17488 Switching back to Average Days Paid is recorded in the audit log.
 *   TC-17483 Payment Float section saves independently.
 *
 * Order matters. The Payment Float baseline for TC-17486 is read from the API in
 * beforeAll, so the basis switch is the first thing driven through the UI and
 * the only Payment Float write of the file happens last, when no further test
 * depends on the page staying editable.
 *
 *   @company    = "Company Test"
 *   @spendFile  = "Pagero_ToRecalculate-2.xlsx (Ver. 2)" — has contractual terms
 *   @entity     = first supplier of the list, so the suite follows the fixture
 *   @user       = E2E_AUTH_USERNAME_SUPER_ADMIN (Setup is admins only)
 */

import { expect, Page, test } from "@playwright/test";
import { changeToSpendFile, ensureSuperAdminLogin } from "../utils/Utils";
import { locators } from "../utils/locators";
import Api2 from "../utils/APi2";
import CashFlowCalculationUtils, {
  CASH_FLOW_BASIS,
} from "../utils/CashFlowCalculationUtils";

const SPEND_FILE = "Pagero_ToRecalculate-2.xlsx (Ver. 2)";

const MODAL = '#calculum-modal-container [data-testid="modal"]';

/** Payment Float presets, keyed by the days each option writes (CashFlow.vue). */
const PAYMENT_CYCLE_PRESETS = [
  { option: "weekly", days: 3 },
  { option: "monthly", days: 15 },
];

// The precondition of this file is a basis change, which enqueues a full spend
// file recalculation that locks Setup until it finishes. The per-test budget is
// raised accordingly: the default 120s covers the interactions but not the wait
// for the platform to become writable again.
test.describe.configure({ mode: "serial", timeout: 300000 });

let page: Page;
let api: Api2;
let spendFileVersionUuid: string;
let companyUuid: string;
/** Payment Float as stored before the basis was saved, re-checked by TC-17486. */
let paymentFloatDaysBefore: number;

test.describe("Cash Flow Calculation — switch back to Average Days Paid", () => {
  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();

    await ensureSuperAdminLogin(page);
    await page.goto("/");
    await page.waitForSelector(".loading-modal", { state: "detached" });
    await changeToSpendFile(page, SPEND_FILE);

    api = await Api2.getInstance(page);

    // Precondition set through the API so the file does not depend on the
    // execution order of the rest of the suite.
    const state = await CashFlowCalculationUtils.ensureBasis(api, true);
    expect(
      state.hideAverageDaysPaid,
      "Could not put the spend file version on the Contractual basis",
    ).toBeTruthy();
    spendFileVersionUuid = state.spendFileVersionUuid;
    companyUuid = state.companyUuid;

    paymentFloatDaysBefore = await CashFlowCalculationUtils.readPaymentFloatDays(
      api,
      companyUuid,
    );

    await page.goto("/");
    await page.waitForSelector(".loading-modal", { state: "detached" });
  });

  test.afterAll(async () => {
    // Leave the shared dev fixture as it was found: default basis, and the
    // Payment Float value TC-17483 overwrote put back.
    // Each restore is guarded by the state it needs: beforeAll can fail between
    // getting the API and reading the company, and an unguarded restore would
    // then PATCH /api/companies/undefined with an undefined value.
    if (api) {
      await CashFlowCalculationUtils.ensureBasis(api, false);

      if (companyUuid && paymentFloatDaysBefore !== undefined) {
        await CashFlowCalculationUtils.restorePaymentFloatDays(
          api,
          companyUuid,
          paymentFloatDaysBefore,
        );
      }
    }
    await page.close();
  });

  test("Selecting Average Days Paid applies without a modal and restores visibility @setup @cashFlow @integrated @tc-17482 @us-16637", async () => {
    await CashFlowCalculationUtils.openCashFlowTab(page);
    await CashFlowCalculationUtils.waitForSetupEditable(page);

    const [patchResponse] = await Promise.all([
      page.waitForResponse(
        (response) =>
          response.request().method() === "PATCH" &&
          response.url().includes(`/api/spend_file_versions/${spendFileVersionUuid}`),
      ),
      CashFlowCalculationUtils.selectBasisAndSave(
        page,
        CASH_FLOW_BASIS.AVERAGE_DAYS_PAID,
      ),
    ]);

    expect(
      patchResponse.status(),
      `Saving the Average Days Paid basis failed: ${await patchResponse.text()}`,
    ).toBe(200);

    // Going back is seamless: the confirmation modal belongs to the Contractual
    // direction only.
    await expect(
      page.locator(MODAL),
      "A confirmation modal was shown while switching back to Average Days Paid",
    ).toBeHidden();

    const state = await CashFlowCalculationUtils.readBasisState(api);
    expect(
      state.hideAverageDaysPaid,
      "The Average Days Paid basis was not persisted",
    ).toBeFalsy();

    // The basis change enqueues a full recalculation using actual payment history.
    await expect(
      page.locator(locators.settings.cashFlow.recalculationAlert),
    ).toBeVisible();

    // Visibility is restored across the payment terms components.
    await CashFlowCalculationUtils.openOpportunityOverview(page);
    await CashFlowCalculationUtils.expectAvgDaysPaidVisible(
      page,
      "on the Opportunity bars after switching back",
    );

    await CashFlowCalculationUtils.openFirstEntityCard(page);
    await CashFlowCalculationUtils.expectAvgDaysPaidVisible(
      page,
      "in the entity card payment terms charts after switching back",
    );

    const historyToggle = page.locator(locators.settings.cashFlow.historyToggle);
    if (await historyToggle.isVisible()) {
      await historyToggle.click();
      await expect(page.locator(".list-historical")).toBeVisible();
      await expect(
        page.locator(locators.settings.cashFlow.historyGridHeader),
        "The Avg Days Paid column was not restored in the historical grid",
      ).toBeVisible();
    }

    await CashFlowCalculationUtils.closeEntityCard(page);
  });

  test("Saving the calculation basis left Payment Float untouched @setup @cashFlow @ui @tc-17486 @us-16637", async () => {
    // Read from the company rather than the form: the section is collapsed while
    // the spend file recalculates, and the stored value is what the criterion is
    // about.
    const paymentFloatDaysAfter =
      await CashFlowCalculationUtils.readPaymentFloatDays(api, companyUuid);

    expect(
      paymentFloatDaysAfter,
      "Saving the calculation basis changed the Payment Float configuration",
    ).toBe(paymentFloatDaysBefore);
  });

  test("The switch back to Average Days Paid is recorded in the audit log @setup @cashFlow @audit @logs @tc-17488 @us-16637", async () => {
    const entry = await CashFlowCalculationUtils.waitForBasisAuditEntry(
      api,
      spendFileVersionUuid,
      true,
      false,
    );

    expect(entry.userEmail, "The audit entry has no user").toBeTruthy();
    expect(entry.companyName, "The audit entry has no company").toBeTruthy();
    expect(entry.createdAt, "The audit entry has no timestamp").toBeTruthy();
    expect(entry.message).toContain("hideAverageDaysPaid toggled: true -> false");
    expect(
      JSON.stringify(entry.eventData ?? {}),
      "The audit payload does not record the previous and new basis",
    ).toContain("hideAverageDaysPaid");
  });

  test("Payment Float saves on its own button without touching the basis @setup @cashFlow @ui @tc-17483 @us-16637", async () => {
    // Pick whichever preset differs from the stored one so Save has something
    // to write.
    const target =
      PAYMENT_CYCLE_PRESETS.find(
        (preset) => preset.days !== paymentFloatDaysBefore,
      ) ?? PAYMENT_CYCLE_PRESETS[0];

    await CashFlowCalculationUtils.savePaymentFloatPreset(page, target.option);

    expect(
      await CashFlowCalculationUtils.readPaymentFloatDays(api, companyUuid),
      "The Payment Float change was not stored",
    ).toBe(target.days);

    // Saving Payment Float leaves the calculation basis alone: it was neither
    // switched nor did it need saving for the Payment Float change to apply.
    const state = await CashFlowCalculationUtils.readBasisState(api);
    expect(
      state.hideAverageDaysPaid,
      "Saving Payment Float changed the cash flow calculation basis",
    ).toBeFalsy();
    await expect(
      page.locator(locators.settings.cashFlow.averageDaysPaidRadio),
    ).toBeChecked();
  });
});
