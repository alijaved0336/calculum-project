/**
 * Test Plan "Sprint 111" / Suite 17471 — WI#16637:
 * "As a User, I should be able to configure the cash flow calculation basis in
 * Settings so that I can choose between Average Days Paid and Contractual
 * Payment Terms as the foundation for the cash flow opportunity model".
 *
 * Covered test cases:
 *   TC-17472 Settings tab 'Payment Float' is renamed to 'Cash Flow' and retains
 *            the Payment Float section.
 *   TC-17473 'Cash Flow Calculation' section is added with two radio options.
 *   TC-17475 Switching to Contractual (terms present) triggers the warning modal.
 *   TC-17476 Warning modal content is complete and correct.
 *   TC-17477 'Cancel' dismisses the modal and restores the previous selection
 *            without saving.
 *
 * The suite is read-only by design: it walks up to the confirmation modal and
 * cancels it, so no basis change is persisted and no recalculation is enqueued.
 * The switch itself is covered by cash-flow-calculation-switch-to-contractual.
 *
 *   @company    = "Company Test"
 *   @spendFile  = "Pagero_MVcard_Contractual.xlsx (Ver. 1)" — has contractual terms
 *   @user       = E2E_AUTH_USERNAME_SUPER_ADMIN (Setup is admins only)
 */

import { expect, Page, Request, test } from "@playwright/test";
import { changeToSpendFile, ensureSuperAdminLogin } from "../utils/Utils";
import { locators } from "../utils/locators";
import Api2 from "../utils/APi2";
import CashFlowCalculationUtils, {
  CASH_FLOW_BASIS,
} from "../utils/CashFlowCalculationUtils";

const SPEND_FILE = "Pagero_MVcard_Contractual.xlsx (Ver. 1)";

/** Rendered by CalculumModal; only one modal is mounted at a time. */
const MODAL = '#calculum-modal-container [data-testid="modal"]';

test.describe.configure({ mode: "serial" });

let page: Page;
let api: Api2;

test.describe("Cash Flow Calculation section", () => {
  test.beforeAll(async ({ browser }) => {
    // One page for the whole file so the confirmation modal opened by TC-17475
    // survives into TC-17476 and TC-17477 instead of being re-opened three times.
    page = await browser.newPage();

    await ensureSuperAdminLogin(page);
    await page.goto("/");
    await page.waitForSelector(".loading-modal", { state: "detached" });
    await changeToSpendFile(page, SPEND_FILE);

    api = await Api2.getInstance(page);

    // Preconditions: the basis starts at Average Days Paid and the version has
    // contractual terms, otherwise the Save click would be blocked by the E1
    // guard instead of opening the modal.
    const state = await CashFlowCalculationUtils.ensureBasis(api, false);
    expect(
      state.hasContractualPaymentTerms,
      `${SPEND_FILE} has no contractual payment terms, so the warning modal can never open`,
    ).toBeTruthy();

    // ensureBasis may have written through the API, and userStore only reads the
    // basis from who_am_i at bootstrap. Without this reload a version left on
    // Contractual by an earlier run would still render its radio as checked,
    // making TC-17475 "select" the active option and TC-17477 assert the wrong one.
    await page.goto("/");
    await page.waitForSelector(".loading-modal", { state: "detached" });

    await CashFlowCalculationUtils.openCashFlowTab(page);
    await CashFlowCalculationUtils.waitForSetupEditable(page);
  });

  test.afterAll(async () => {
    await page.close();
  });

  test("Setup exposes a 'Cash Flow' tab that still holds the Payment Float section @setup @cashFlow @ui @tc-17472 @us-16637", async () => {
    const tabs = page.locator("a[id^='setup-']");

    await expect(page.locator(locators.settings.cashFlow.tab)).toHaveText(
      "Cash Flow",
    );
    // The rename must be complete: no tab keeps the old label.
    await expect(tabs.filter({ hasText: "Payment Float" })).toHaveCount(0);

    // The Payment Float section survived the rename, with its configuration.
    const paymentFloatCard = page.locator(
      locators.settings.cashFlow.paymentFloatCard,
    );
    await expect(paymentFloatCard).toBeVisible();

    await CashFlowCalculationUtils.expandPaymentFloatSection(page);
    await expect(
      page.locator(locators.settings.cashFlow.paymentCycleSelect),
    ).toBeVisible();
    await expect(
      page.locator(locators.settings.cashFlow.paymentCycleDays),
    ).toBeVisible();
  });

  test("'Cash Flow Calculation' sits above Payment Float with two options and its own Save @setup @cashFlow @ui @tc-17473 @us-16637", async () => {
    const calculationCard = page.locator(
      locators.settings.cashFlow.calculationCard,
    );
    const paymentFloatCard = page.locator(
      locators.settings.cashFlow.paymentFloatCard,
    );

    await expect(calculationCard).toContainText("Cash Flow Calculation");

    // Section order is asserted geometrically rather than by DOM index so an
    // extra card inserted later does not silently invalidate the check.
    const calculationBox = await calculationCard.boundingBox();
    const paymentFloatBox = await paymentFloatCard.boundingBox();
    expect(calculationBox, "Cash Flow Calculation card was not rendered").not.toBeNull();
    expect(paymentFloatBox, "Payment Float card was not rendered").not.toBeNull();
    expect(
      calculationBox!.y,
      "'Cash Flow Calculation' must be rendered above 'Payment Float'",
    ).toBeLessThan(paymentFloatBox!.y);

    // Exactly two options, and they are the expected ones. The option locators
    // are already scoped to the card, so they are resolved from the page rather
    // than chained onto it.
    const radios = calculationCard.locator('input[type="radio"]');
    await expect(radios).toHaveCount(2);
    await expect(
      page.locator(locators.settings.cashFlow.averageDaysPaidOption),
    ).toContainText("Average Days Paid");
    await expect(
      page.locator(locators.settings.cashFlow.contractualOption),
    ).toContainText("Contractual Payment Terms");

    // Each section saves on its own button.
    await CashFlowCalculationUtils.expandPaymentFloatSection(page);
    await expect(
      page.locator(locators.settings.cashFlow.calculationSaveButton),
    ).toBeVisible();
    await expect(
      page.locator(locators.settings.cashFlow.paymentFloatSaveButton),
    ).toBeVisible();
  });

  test("Saving 'Contractual Payment Terms' opens the warning modal before applying anything @setup @cashFlow @ui @tc-17475 @us-16637", async () => {
    // Any write to the version would go through this endpoint; recording the
    // calls proves the modal is shown *before* the change is applied.
    const versionPatches: string[] = [];
    const recordVersionPatch = (request: Request) => {
      if (
        request.method() === "PATCH" &&
        request.url().includes("/api/spend_file_versions/")
      ) {
        versionPatches.push(request.url());
      }
    };
    page.on("request", recordVersionPatch);

    await CashFlowCalculationUtils.selectBasis(page, CASH_FLOW_BASIS.CONTRACTUAL);
    await expect(
      page.locator(locators.settings.cashFlow.contractualRadio),
    ).toBeChecked();

    await page.locator(locators.settings.cashFlow.calculationSaveButton).click();

    await expect(page.locator(MODAL)).toBeVisible();
    await expect(page.locator(MODAL)).toContainText("Recalculation required");

    expect(
      versionPatches,
      "The basis was persisted before the user confirmed the recalculation",
    ).toHaveLength(0);

    const state = await CashFlowCalculationUtils.readBasisState(api);
    expect(
      state.hideAverageDaysPaid,
      "The stored basis changed while the confirmation modal was still open",
    ).toBeFalsy();

    page.off("request", recordVersionPatch);
  });

  test("The warning modal states both effects and offers Cancel and Accept & recalculate @setup @cashFlow @ui @tc-17476 @us-16637", async () => {
    const modal = page.locator(MODAL);

    // Avg Days Paid disappears from every consumer of the metric...
    await expect(modal).toContainText(
      "Average Days Paid will be hidden from all charts, grids, strategy cards, and payment terms components",
    );
    // ...and the cash flow model switches its baseline.
    await expect(modal).toContainText(
      "the cash flow calculation will automatically switch to contractual payment terms instead of actual payment history",
    );

    const buttons = modal.locator(".container-buttons button");
    await expect(buttons).toHaveCount(2);
    await expect(buttons.nth(0)).toHaveText("Cancel");
    await expect(buttons.nth(1)).toHaveText("Accept & recalculate");
  });

  test("'Cancel' closes the modal, restores Average Days Paid and saves nothing @setup @cashFlow @ui @tc-17477 @us-16637", async () => {
    await page
      .locator(MODAL)
      .getByRole("button", { name: "Cancel" })
      .click();

    await expect(page.locator(MODAL)).toBeHidden();

    // The previous selection is restored, not merely left untouched.
    await expect(
      page.locator(locators.settings.cashFlow.averageDaysPaidRadio),
    ).toBeChecked();
    await expect(
      page.locator(locators.settings.cashFlow.contractualRadio),
    ).not.toBeChecked();

    const state = await CashFlowCalculationUtils.readBasisState(api);
    expect(
      state.hideAverageDaysPaid,
      "Cancelling the modal still persisted the Contractual basis",
    ).toBeFalsy();

    // No recalculation was triggered, so Setup stays editable.
    await expect(
      page.locator(locators.settings.cashFlow.recalculationAlert),
    ).toBeHidden();
  });
});
