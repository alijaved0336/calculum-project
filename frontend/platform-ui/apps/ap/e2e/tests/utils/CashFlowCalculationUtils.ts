import { expect, Page } from "@playwright/test";
import Api2 from "./APi2";
import { locators } from "./locators";
import StringUtils from "./StringUtils";

/**
 * Helpers for the Cash Flow Calculation basis (WI#16637).
 *
 * The basis lives on the active SpendFileVersion as `hideAverageDaysPaid`:
 * false = "Average Days Paid" (default), true = "Contractual Payment Terms".
 * The front reads it from who_am_i at bootstrap (userStore.hideAverageDaysPaid),
 * so any change made through the API needs a page reload to reach the UI.
 */

/** Radio `value` attributes of the two Cash Flow Calculation options. */
export const CASH_FLOW_BASIS = {
  AVERAGE_DAYS_PAID: "show",
  CONTRACTUAL: "hide",
} as const;

export interface CashFlowBasisState {
  spendFileVersionUuid: string;
  companyUuid: string;
  companyName: string;
  /** true = Contractual Payment Terms, false = Average Days Paid. */
  hideAverageDaysPaid: boolean;
  /** Whether the version has contractual terms, so the basis may be switched. */
  hasContractualPaymentTerms: boolean;
}

export default class CashFlowCalculationUtils {
  /**
   * Reads the persisted basis straight from who_am_i.
   *
   * `hasContractualPaymentTerms` is a non-persisted flag hydrated by
   * UserDataProvider for the ACTIVE version only, so who_am_i is the single
   * source for it — a plain GET on /api/spend_file_versions always reports false.
   */
  static async readBasisState(api: Api2): Promise<CashFlowBasisState> {
    const response = await api.doGet("/api/user/who_am_i", null, {
      Accept: "application/json, text/plain, */*",
    });
    expect(
      response.ok(),
      `who_am_i returned ${response.status()} while reading the cash flow basis`,
    ).toBeTruthy();

    const data = await response.json();
    const version = data.activeSpendFileVersion ?? {};
    const company = data.activeCompany ?? {};

    return {
      spendFileVersionUuid: StringUtils.removeIRI(version["@id"] ?? ""),
      companyUuid: StringUtils.removeIRI(company["@id"] ?? ""),
      companyName: company.name ?? "",
      hideAverageDaysPaid: version.hideAverageDaysPaid === true,
      hasContractualPaymentTerms: version.hasContractualPaymentTerms === true,
    };
  }

  /**
   * Forces the basis through the API so each spec owns its precondition instead
   * of depending on the file that ran before it. No-op when already there, which
   * matters because every real change enqueues a full spend file recalculation.
   */
  static async ensureBasis(api: Api2, contractual: boolean): Promise<CashFlowBasisState> {
    const state = await CashFlowCalculationUtils.readBasisState(api);
    if (state.hideAverageDaysPaid === contractual) return state;

    const response = await api.doPatch(
      `/api/spend_file_versions/${state.spendFileVersionUuid}`,
      { hideAverageDaysPaid: contractual },
    );
    expect(
      response.ok(),
      `Could not preset the cash flow basis to ${contractual ? "Contractual" : "Average Days Paid"}: ` +
        `${response.status()} ${await response.text()}`,
    ).toBeTruthy();

    return CashFlowCalculationUtils.readBasisState(api);
  }

  /**
   * Opens Setup and selects the Cash Flow tab, leaving its two sections rendered.
   *
   * Setup is reached through the sidebar rather than a direct goto: the
   * /home/company-settings route is guarded and a cold navigation lands back on
   * the dashboard, leaving the tab list unrendered.
   *
   * Readiness is the tab list itself, not SetupUtils.goToSetupSection: that
   * helper waits for /spendfile/strategies/allowed-status, which the SPA serves
   * from cache on a revisit, so the waiter hangs on a page that has in fact
   * already rendered.
   *
   * Navigation only: the tab renders while a recalculation is in flight, just
   * read-only. Specs that write call waitForSetupEditable first.
   *
   * The Cash Flow tab is always clicked, whichever Setup tab the page was left
   * on, so a revisit cannot inherit another tab's content.
   */
  static async openCashFlowTab(page: Page): Promise<void> {
    const tab = page.locator(locators.settings.cashFlow.tab);

    if (!page.url().includes("/home/company-settings")) {
      await page.locator(locators.sidebar.settings).click();
    }
    // Bounded like the other recalculation-sensitive waits in this file
    // (waitForSetupEditable, expandPaymentFloatSection): an in-flight
    // recalculation can keep some `.loading-modal` mounted for minutes, and an
    // unbounded wait here sits outside savePaymentFloatPreset's retry loop, so
    // it previously ate the whole test timeout instead of giving that loop a
    // chance to retry.
    await page.waitForSelector(".loading-modal", {
      state: "detached",
      timeout: 180000,
    });

    // The URL check above is an optimisation, not proof that Setup is mounted:
    // a spec can land on the route with the page in another state, and the
    // sidebar click is then the only thing that renders the tab list. Give the
    // fast path a short budget and fall back to navigating rather than spending
    // the whole 30s on a page that will never render the tabs by itself.
    try {
      await tab.waitFor({ state: "visible", timeout: 5000 });
    } catch {
      await page.locator(locators.sidebar.settings).click();
      await page.waitForSelector(".loading-modal", {
        state: "detached",
        timeout: 180000,
      });
    }

    await expect(tab, "The Setup page did not render its tab list").toBeVisible({
      timeout: 30000,
    });
    await tab.click();
    await expect(
      page.locator(locators.settings.cashFlow.calculationSectionHeader),
    ).toBeVisible();
  }

  /**
   * Expands the collapsed Payment Float section inside the Cash Flow tab.
   *
   * The section header stays clickable during a recalculation while the fields
   * it reveals do not, so the frequency select is awaited enabled rather than
   * merely visible.
   */
  static async expandPaymentFloatSection(page: Page): Promise<void> {
    const select = page.locator(locators.settings.cashFlow.paymentCycleSelect);

    if (!(await select.isVisible())) {
      await page.locator(locators.settings.cashFlow.paymentFloatHeader).click();
      await expect(select).toBeVisible();
    }
    await expect(
      select,
      "The Payment Float fields stayed disabled by an ongoing recalculation",
    ).toBeEnabled({ timeout: 180000 });
  }

  /**
   * Waits until Setup accepts input again.
   *
   * Every basis change enqueues a full spend file recalculation, and while it
   * runs HomeCompanySettings disables every control on the page. Without this
   * wait a spec that follows a recalculation drives a disabled field and fails
   * with an opaque action timeout instead of a legible message.
   *
   * The readiness signal is the control's own disabled state, not the warning
   * banner: the banner is driven by a store subscription that lands after the
   * first render, so a freshly opened tab shows no banner for a moment while
   * its fields are already on their way to being disabled. The same race is why
   * the enabled state is given a moment to settle before it is trusted.
   */
  static async waitForSetupEditable(page: Page, timeout = 180000): Promise<void> {
    await page.waitForTimeout(2000);
    await expect(
      page.locator(locators.settings.cashFlow.averageDaysPaidRadio),
      "The spend file is still recalculating, so Setup stayed read-only",
    ).toBeEnabled({ timeout });
  }

  /** Selects one of the two basis options. */
  static async selectBasis(page: Page, basis: string): Promise<void> {
    const option =
      basis === CASH_FLOW_BASIS.CONTRACTUAL
        ? locators.settings.cashFlow.contractualOption
        : locators.settings.cashFlow.averageDaysPaidOption;

    await page.locator(option).click();
  }

  /**
   * Selects a basis and saves it. Switching to Contractual opens the
   * "Recalculation required" modal; switching back to Average Days Paid does not.
   */
  static async selectBasisAndSave(page: Page, basis: string): Promise<void> {
    await CashFlowCalculationUtils.selectBasis(page, basis);
    await page.locator(locators.settings.cashFlow.calculationSaveButton).click();
  }

  /**
   * Opens the Opportunity overview, where the bar components render the
   * contractual bar that carries the Avg Days Paid figure.
   *
   * Readiness is the first rendered bar rather than an API response: the
   * sidebar click is a no-op when the section is already open, and a response
   * waiter would then hang on a request that is never made.
   */
  static async openOpportunityOverview(page: Page): Promise<void> {
    await page.locator(locators.sidebar.program).click();
    await page.waitForSelector(".loading-modal", { state: "detached" });
    await expect(
      page.locator(".line-chart").first(),
      "The Opportunity overview rendered no payment terms bars",
    ).toBeVisible({ timeout: 60000 });

    // A bar renders its skeleton inside .line-chart, so a visible bar is not yet
    // a loaded bar. Without this wait an Avg Days Paid count taken here reads 0
    // for a figure that simply has not arrived.
    await expect(
      page.locator(".line-chart .skeletons-bg"),
      "The payment terms bars are still loading",
    ).toHaveCount(0, { timeout: 60000 });
  }

  /**
   * Opens the first entity card of the supplier list.
   *
   * The entity is taken from the list instead of being named, so the suite
   * follows whichever spend file it is pointed at. Readiness comes from
   * `#termsbars`, which EntityPaymentTermsStrategies renders only once the
   * strategies skeleton is replaced by real data.
   */
  static async openFirstEntityCard(page: Page): Promise<void> {
    await page.locator(locators.sidebar.entities).click();
    await page.waitForSelector(".loading-modal", { state: "detached" });

    const firstCard = page.locator("div.card-body").first();
    await expect(
      firstCard,
      "The supplier list rendered no entity cards",
    ).toBeVisible({ timeout: 60000 });
    await firstCard.click();

    await expect(page.locator("#termsbars")).toBeVisible({ timeout: 60000 });
  }

  static async closeEntityCard(page: Page): Promise<void> {
    await page.locator(locators.entityCard.closeButton).click();
    await expect(page.locator(locators.entityCard.closeButton)).toBeHidden();
  }

  /**
   * Every element that renders the Avg Days Paid figure carries `.avg-days-paid`
   * (EntityTermsChartLine, BarsComponent, BarsComponentNew), so one count covers
   * the chart, bar and strategy-card families in a single assertion.
   */
  static avgDaysPaidMarkers(page: Page) {
    return page.locator(locators.settings.cashFlow.avgDaysPaidMarker);
  }

  /** Reads the Payment Float days stored on the company. */
  static async readPaymentFloatDays(api: Api2, companyUuid: string): Promise<number> {
    const response = await api.doGet(`/api/companies/${companyUuid}`, null, {
      Accept: "application/json, text/plain, */*",
    });
    expect(
      response.ok(),
      `Reading the company returned ${response.status()} while checking Payment Float`,
    ).toBeTruthy();

    const data = await response.json();
    return data.paymentCycleDays ?? 0;
  }

  /** Restores the Payment Float days on the company, straight through the API. */
  static async restorePaymentFloatDays(
    api: Api2,
    companyUuid: string,
    days: number,
  ): Promise<void> {
    // A paymentCycleDays change makes the backend walk every spend file
    // version of the company to enqueue program recalculations (and export
    // the company to Data Ingestion, a synchronous 15s-timeout call) before it
    // answers — over 30s on dev for Company Test, so the default request
    // timeout was cut short in afterAll and the fixture kept the test value.
    await api.doPatch(
      `/api/companies/${companyUuid}`,
      { paymentCycleDays: days },
      "application/merge-patch+json",
      120000,
    );
  }

  /**
   * Picks a Payment Float frequency and saves it on the section's own button.
   *
   * Retried as a whole: a spend file can re-enter recalculation between the
   * frequency being chosen and Save being pressed, which remounts the tab with
   * the section collapsed and the button disabled. Each attempt therefore
   * re-opens the tab and re-expands the section rather than assuming the page
   * survived the previous one.
   */
  static async savePaymentFloatPreset(
    page: Page,
    option: string,
    attempts = 3,
  ): Promise<void> {
    for (let attempt = 1; attempt <= attempts; attempt++) {
      try {
        await CashFlowCalculationUtils.openCashFlowTab(page);
        await CashFlowCalculationUtils.waitForSetupEditable(page);
        await CashFlowCalculationUtils.expandPaymentFloatSection(page);

        await page
          .locator(locators.settings.cashFlow.paymentCycleSelect)
          .selectOption(option);

        const saveButton = page.locator(
          locators.settings.cashFlow.paymentFloatSaveButton,
        );
        await expect(saveButton).toBeEnabled();

        // Same slow PATCH as restorePaymentFloatDays: a real change takes the
        // backend over 30s on dev, so 20s expired while the request was still
        // in flight, the SPA kept its loading modal up and the retry loop then
        // spent its budget waiting for that modal to clear.
        const [response] = await Promise.all([
          page.waitForResponse(
            (r) =>
              r.request().method() === "PATCH" &&
              r.url().includes("/api/companies/"),
            { timeout: 120000 },
          ),
          saveButton.click(),
        ]);
        expect(
          response.ok(),
          `Saving Payment Float failed: ${await response.text()}`,
        ).toBeTruthy();
        return;
      } catch (error) {
        if (attempt === attempts) throw error;
        console.log(
          `Payment Float save attempt ${attempt} did not reach the API, likely because ` +
            "the spend file re-entered recalculation; retrying.",
        );
      }
    }
  }

  /**
   * Asserts the metric is on screen. Uses a web-first assertion rather than a
   * one-shot count so a figure that is still arriving is waited for instead of
   * being read as absent.
   */
  static async expectAvgDaysPaidVisible(page: Page, where: string): Promise<void> {
    await expect(
      CashFlowCalculationUtils.avgDaysPaidMarkers(page).first(),
      `Avg Days Paid is not rendered ${where}`,
    ).toBeVisible({ timeout: 60000 });
  }

  /** Asserts the metric is gone. Only meaningful once the surface has loaded. */
  static async expectAvgDaysPaidHidden(page: Page, where: string): Promise<void> {
    await expect(
      CashFlowCalculationUtils.avgDaysPaidMarkers(page),
      `Avg Days Paid is still shown ${where}`,
    ).toHaveCount(0);
  }

  /**
   * Polls the audit log for the entry written when the basis changes.
   *
   * Audit events are batched and dispatched at request termination, so the entry
   * lands shortly after the PATCH response — reading once races the writer.
   */
  static async waitForBasisAuditEntry(
    api: Api2,
    spendFileVersionUuid: string,
    previous: boolean,
    next: boolean,
  ): Promise<any> {
    const transition = `${previous ? "true" : "false"} -> ${next ? "true" : "false"}`;
    let entry: any = null;

    await expect
      .poll(
        async () => {
          const response = await api.doGet(
            `/api/audit_logs?spendFileVersion.uuid=${spendFileVersionUuid}` +
              `&message=hideAverageDaysPaid&order[createdAt]=desc`,
            null,
            { Accept: "application/json, text/plain, */*" },
          );
          if (!response.ok()) return false;

          const body = await response.json();
          const members = body["hydra:member"] ?? [];
          entry = members.find((log: any) =>
            String(log.message ?? "").includes(transition),
          );
          return entry !== undefined && entry !== null;
        },
        {
          message:
            `No audit log entry "hideAverageDaysPaid toggled: ${transition}" ` +
            `for spend file version ${spendFileVersionUuid}`,
          timeout: 60000,
          intervals: [1000, 2000, 5000],
        },
      )
      .toBeTruthy();

    return entry;
  }
}
