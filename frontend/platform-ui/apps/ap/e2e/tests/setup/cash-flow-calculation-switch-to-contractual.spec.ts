/**
 * Test Plan "Sprint 111" / Suite 17471 — WI#16637.
 *
 * Covered test cases:
 *   TC-17474 'Average Days Paid' is the default on first access.
 *   TC-17478 'Accept & recalculate' applies the change to Contractual.
 *   TC-17487 Switching to Contractual is recorded in the audit log.
 *   TC-17481 With Contractual active, Avg Days Paid is hidden in ALL affected
 *            components.
 *
 * Split away from cash-flow-calculation-switch-to-average so each file stays
 * under the 3 minute budget and performs a single basis change: every change
 * enqueues a full spend file recalculation that locks Setup while it runs.
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

test.describe.configure({ mode: "serial" });

let page: Page;
let api: Api2;
let spendFileVersionUuid: string;

test.describe("Cash Flow Calculation — switch to Contractual Payment Terms", () => {
  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();

    await ensureSuperAdminLogin(page);
    await page.goto("/");
    await page.waitForSelector(".loading-modal", { state: "detached" });
    await changeToSpendFile(page, SPEND_FILE);

    api = await Api2.getInstance(page);

    // The precondition is set through the API so this file does not depend on
    // whichever spec ran before it.
    const state = await CashFlowCalculationUtils.ensureBasis(api, false);
    expect(
      state.hasContractualPaymentTerms,
      `${SPEND_FILE} has no contractual payment terms, so the basis cannot be switched`,
    ).toBeTruthy();
    spendFileVersionUuid = state.spendFileVersionUuid;

    // ensureBasis may have written through the API; reload so userStore picks
    // the value up from who_am_i.
    await page.goto("/");
    await page.waitForSelector(".loading-modal", { state: "detached" });
  });

  test.afterAll(async () => {
    // Leave the shared dev fixture on the default basis for the next suite.
    if (api) await CashFlowCalculationUtils.ensureBasis(api, false);
    await page.close();
  });

  test("Average Days Paid is the active basis and is visible across components @setup @cashFlow @ui @tc-17474 @us-16637", async () => {
    await CashFlowCalculationUtils.openCashFlowTab(page);
    await expect(
      page.locator(locators.settings.cashFlow.averageDaysPaidRadio),
    ).toBeChecked();

    // Current behaviour is preserved: the metric is rendered by the payment
    // terms components. `.avg-days-paid` is emitted by EntityTermsChartLine,
    // BarsComponent and BarsComponentNew, so one count covers charts, bars and
    // strategy cards at once.
    await CashFlowCalculationUtils.openOpportunityOverview(page);
    await CashFlowCalculationUtils.expectAvgDaysPaidVisible(
      page,
      "on the Opportunity overview, so the baseline for TC-17481 is meaningless",
    );

    await CashFlowCalculationUtils.openFirstEntityCard(page);
    await CashFlowCalculationUtils.expectAvgDaysPaidVisible(
      page,
      "in the entity card payment terms charts",
    );
    await CashFlowCalculationUtils.closeEntityCard(page);
  });

  test("'Accept & recalculate' saves Contractual and triggers the recalculation @setup @cashFlow @integrated @tc-17478 @us-16637", async () => {
    await CashFlowCalculationUtils.openCashFlowTab(page);
    await CashFlowCalculationUtils.waitForSetupEditable(page);
    await CashFlowCalculationUtils.selectBasisAndSave(
      page,
      CASH_FLOW_BASIS.CONTRACTUAL,
    );

    await expect(page.locator(MODAL)).toBeVisible();

    const [patchResponse] = await Promise.all([
      page.waitForResponse(
        (response) =>
          response.request().method() === "PATCH" &&
          response.url().includes(`/api/spend_file_versions/${spendFileVersionUuid}`),
      ),
      page
        .locator(MODAL)
        .getByRole("button", { name: "Accept & recalculate" })
        .click(),
    ]);

    expect(
      patchResponse.status(),
      `Saving the Contractual basis failed: ${await patchResponse.text()}`,
    ).toBe(200);
    await expect(page.locator(MODAL)).toBeHidden();

    // The change is persisted, not only reflected in the local store.
    const state = await CashFlowCalculationUtils.readBasisState(api);
    expect(
      state.hideAverageDaysPaid,
      "The Contractual basis was not persisted on the spend file version",
    ).toBeTruthy();

    // The basis change enqueues a full recalculation of the version, which the
    // Setup page surfaces as a read-only banner.
    await expect(
      page.locator(locators.settings.cashFlow.recalculationAlert),
    ).toBeVisible();
  });

  test("The switch to Contractual is recorded in the audit log @setup @cashFlow @audit @logs @tc-17487 @us-16637", async () => {
    const entry = await CashFlowCalculationUtils.waitForBasisAuditEntry(
      api,
      spendFileVersionUuid,
      false,
      true,
    );

    // The entry carries who changed it, on which company, from which value to
    // which value, and when.
    expect(entry.userEmail, "The audit entry has no user").toBeTruthy();
    expect(entry.companyName, "The audit entry has no company").toBeTruthy();
    expect(entry.createdAt, "The audit entry has no timestamp").toBeTruthy();
    expect(entry.message).toContain("hideAverageDaysPaid toggled: false -> true");
    expect(
      JSON.stringify(entry.eventData ?? {}),
      "The audit payload does not record the previous and new basis",
    ).toContain("hideAverageDaysPaid");
  });

  test("Avg Days Paid is hidden in charts, grids, strategy cards and bars @setup @cashFlow @ui @tc-17481 @us-16637", async () => {
    await CashFlowCalculationUtils.openOpportunityOverview(page);
    await CashFlowCalculationUtils.expectAvgDaysPaidHidden(
      page,
      "on the Opportunity bars",
    );

    await CashFlowCalculationUtils.openFirstEntityCard(page);
    await CashFlowCalculationUtils.expectAvgDaysPaidHidden(
      page,
      "in the entity card payment terms charts",
    );

    // Payment Terms & Volume History: the BarLineChart drops its "Avg Days Paid"
    // series and ListHistorical hides the matching column. The panel is behind a
    // feature flag, so it is asserted only where the toggle is offered.
    const historyToggle = page.locator(locators.settings.cashFlow.historyToggle);
    if (await historyToggle.isVisible()) {
      await historyToggle.click();
      await expect(page.locator(".list-historical")).toBeVisible();
      await expect(
        page.locator(locators.settings.cashFlow.historyChartLegend),
        "The BarLineChart still plots the Avg Days Paid series",
      ).toHaveCount(0);
      await expect(
        page.locator(locators.settings.cashFlow.historyGridHeader),
        "The historical grid still shows the Avg Days Paid column",
      ).toHaveCount(0);
    }

    await CashFlowCalculationUtils.closeEntityCard(page);
  });
});
