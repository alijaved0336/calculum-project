import test, { expect, Locator, Page } from "@playwright/test";
import {
  changeToSpendFile,
  ensureCompany_SFSuperAdminLogin,
  ensureDefaultLogin,
} from "../utils/Utils";
import { locators } from "../utils/locators";
import * as formData from "../utils/StringUtils";
import { StringUtils } from "../utils";
import englishKeys from "@ada/design-system/locales/languages/en.json";

const given = {
  company: "Company_SF",
  spendfile: "Pagero_ExclusionGroups.xlsx (Ver. 1)",
  program: "Main Program",
  user: "joel+testnotadmin@calculum.ai",
  enity: "ITT INC",
  excludedData: {
    groupName: "ITT INC.",
    description: "Excluding all  ITT INC. Spend Lines.",
    /**
     * The group carries two rules, and rules inside one group are ANDed
     * (AnalyzeRulesManager::getSpendOrConfigsIdFromRules closes with
     * `andWhere(new Expr\Andx($rulesConditions))`), while the values of a single
     * rule are ORed. The buyer rule therefore lists *both* buying entities of
     * the spend file: naming only one of them would drop every ITT INC. spend
     * line billed to the other, so the group would exclude the parent only in
     * part and the Term Extension filter below would still return its lines.
     */
    rules: [
      { option: "Parent", values: ["ITT INC."] },
      { option: "Buying Entity", values: ["Pagero Inc", "Store-Pagero Inc"] },
    ],
  },
  globalFilter: {
    field: "Program",
    checkboxField: "Term Extension",
  },
};
/**
 * tc-11294 ("The excluded Spend Line has no 'Unavailable Strategies' section")
 * used to live here, walking the Spend 1 / Spend 2 tabs of Axtone S.A. and
 * reading the Adabot paragraphs that named the exclusion reason. It was removed
 * because the product no longer renders any of that.
 *
 * Backend commit 6e032f8bd, "fix(AB#20094): hide spend lines that are out of
 * the analysis from the tree and the spend tabs", added
 * EntityCardSupplierManager::isSpendLineOutOfTheAnalysis() and filters the spend
 * tabs through it. A line counts as out of the analysis when `spend.excluded`,
 * `config.disabled`, or `config.programApplied = 'No Program'` — the last being
 * exactly what the exclusion group this suite creates sets. Measured on dev: no
 * group gives the entity `Supplier, Spend 1, Spend 2`; excluding one of its two
 * lines gives `Supplier, Spend 1`; excluding both leaves only `Supplier`, whose
 * aggregate tab then has no spend program configuration behind it, so the card
 * renders "This supplier does not participate in the selected program". That
 * reverses WI#19131, which deliberately kept the line on screen with an
 * "Excluded" badge, and the commit says so: "Product has decided the opposite".
 *
 * The test case in Azure DevOps still describes the pre-AB#20094 product and
 * needs a product-side rewrite before any coverage returns here.
 */
/**
 * Budget for a spend-file recalculation triggered from the UI. The same
 * `waitForSelector("span.recalculating-in-progress", {state: "hidden"})` pattern
 * without an explicit timeout also lives in plan/move-between-phases.spec.ts and
 * spendFile/spendFile-is-calculated-while-data-is-visible.spec.ts, where it is
 * capped by `actionTimeout` (15s) just the same.
 */
const RECALCULATION_TIMEOUT_MS = 180000;
/** Budget for the filter steps that run either side of the recalculation wait. */
const FILTER_STEPS_TIMEOUT_MS = 180000;
/**
 * Worst case of one waitForRecalculationToSettle call: the 30s spent waiting
 * for the pill to appear, the 5s settle window, and the two
 * RECALCULATION_TIMEOUT_MS budgets it re-asserts the pill count under. Both the
 * test and the beforeAll hook wait for a recalculation, and a hook inherits the
 * default 120s test budget unless it raises it itself, so the ceiling is named
 * once here instead of being approximated at each call site.
 */
const RECALCULATION_SETTLE_BUDGET_MS =
  30000 + 5000 + 2 * RECALCULATION_TIMEOUT_MS;
/**
 * Budget for the fixture work in beforeAll that is not the recalculation: the
 * super-admin login, the spend-file change and the leftover-group deletion.
 */
const FIXTURE_SETUP_TIMEOUT_MS = 120000;

/**
 * The write the "Save" button of the "Excludes Suppliers" section issues.
 *
 * `/payment_term_extension_exclusion_groups` is only the GET the section reads
 * its groups with; the added and deleted groups are persisted by this POST
 * (HomeApi.postInfoExcludedGroups), so it is the response that says the change
 * reached the backend.
 */
const EXCLUSION_GROUPS_SAVE_PATH =
  "/api/payment-terms/create-update-payment-term-extension-exclusion-group";
/**
 * Budget for that POST. It only enqueues the program rebuild, so it answers
 * well inside this; the waitForResponse default of 30s is named up to 60s here
 * because a waiter that expires turns a cleanup that did reach the backend into
 * a logged failure and leaves the caller believing the groups are still there.
 */
const EXCLUSION_GROUPS_SAVE_TIMEOUT_MS = 60000;

/**
 * Match a response by URL path, ignoring the query string.
 *
 * The entity-card endpoints are called through axios with
 * `params: { globalFilter: activeGlobalFilter() }` (entityCard/api/index.ts,
 * getSpendsBySupplier), so applying a global filter — precisely what this suite
 * does — turns `/spends` into `/spends?globalFilter=...`, so matching the raw
 * URL with `endsWith` stops resolving from that point on.
 */
function urlPathEndsWith(url: string, path: string): boolean {
  try {
    return new URL(url).pathname.endsWith(path);
  } catch {
    return url.endsWith(path);
  }
}

/**
 * Wait until the backend has finished rebuilding the program.
 *
 * Saving an exclusion group only *enqueues* the work
 * (PaymentTermExtensionExclusionGroupManager::createUpdateGroups calls
 * enqueueRecalculateProgramForSpendFileSafe), so it keeps running long after the
 * click resolves. The navbar renders one pill, `span.recalc-status-pill`, for
 * every stage of that job and only swaps its class between
 * "recalculating-in-progress" and "pending-recalculation" as the state walks
 * through pending, updating, calculationReady and estimating
 * (useRecalculationStatus.ts, REFRESH_PROGRAMS_STATE). Waiting for the
 * "recalculating-in-progress" class to disappear therefore returns while the
 * program is still being rebuilt, and every assertion downstream reads the
 * half-built program. Wait for the pill itself to be gone instead.
 */
async function waitForRecalculationToSettle(page: Page) {
  const pill = page.locator("span.recalc-status-pill");
  // The pill is driven by the subscribe channel, so it can take a moment to
  // show up — or never show up at all when the job finishes before the first
  // status push lands. Both are fine; only its disappearance is asserted.
  await pill
    .first()
    .waitFor({ state: "visible", timeout: 30000 })
    .catch(() => undefined);
  await expect(pill).toHaveCount(0, { timeout: RECALCULATION_TIMEOUT_MS });
  // The stages are pushed one after another, so the pill blinks out between two
  // of them. Re-assert after a settle window to avoid reading that gap as the
  // end of the job.
  await page.waitForTimeout(5000);
  await expect(pill).toHaveCount(0, { timeout: RECALCULATION_TIMEOUT_MS });
}

/**
 * Add one condition to the exclusion group being edited.
 *
 * The dialog is the same for the first rule and for every later one: the
 * ChooseColumns icon on the group row reopens it in add mode
 * (SupplierExcluded.vue, addFilterCondition), so both rules go through here.
 * The field dropdown is addressed by the id CalculumAnalyzeFilter gives it
 * (`custom-dropdown-field-selection`) rather than by the field it happens to
 * open on, which used to be hard-coded as ACTUAL_PAYMENT_TERMS.
 */
async function addExclusionRule(
  page: Page,
  excludeSection: Locator,
  openConditionsIcon: Locator,
  rule: { option: string; values: string[] },
) {
  await openConditionsIcon.click();
  await excludeSection
    .locator(".custom-dropdown-field-selection div.currently-selected-item")
    .click();
  await excludeSection
    .locator(
      `div.text-dropdown div.title-dropdown-parent span.text-option[title="${rule.option}"]`,
    )
    .click();
  for (const value of rule.values) {
    const checkbox = excludeSection.locator(
      `div.form-checkout input[type="checkbox"][value="${value}"]`,
    );
    await checkbox.locator("+ span").click();
    await expect(checkbox).toBeChecked();
  }
  await excludeSection
    .locator("button.btn.btn-primary.font-md.save-changes-filter")
    .click();
}

/**
 * Open Setup and expand the "Excludes Suppliers" accordion.
 *
 * Idempotent: the accordion header is a toggle, so calling this while the
 * section is already open would collapse it.
 */
async function openExcludedSuppliersSection(page: Page): Promise<Locator> {
  const openSection = page.locator("#show-excluded-section");
  if (await openSection.isVisible().catch(() => false)) {
    return openSection;
  }
  await page.locator(locators.sidebar.settings).click();
  await page
    .locator('div.col-11.cursor-pointer > span:text("Excludes Suppliers")')
    .click();
  const excludeSection = page.locator("#show-excluded-section");
  await excludeSection.waitFor({ state: "visible" });
  await page.waitForTimeout(1000);
  return excludeSection;
}

/**
 * Delete every exclusion group the fixture currently holds and save once.
 *
 * Deleting only the last group leaves the fixture dirty whenever an earlier run
 * died before its cleanup: the groups pile up, they all keep being applied, and
 * the next run adds one more on top.
 */
async function deleteAllExclusionGroups(page: Page, excludeSection: Locator) {
  const trashIcons = excludeSection.locator('[data-testid="icon-trash"]');
  let remaining = await trashIcons.count();
  const initial = remaining;
  while (remaining > 0) {
    await trashIcons.last().click();
    await page
      .locator(
        '#calculum-modal-container > div[data-testid="modal"] > div.row.mt-2 > div > button.btn.btn-primary.font-md.delete-group',
      )
      .click();
    await expect(trashIcons).toHaveCount(remaining - 1);
    remaining -= 1;
  }
  if (initial > 0) {
    // The rows leave the DOM as they are deleted, so nothing on screen changes
    // when the save lands: the POST is the only signal that the deletion was
    // persisted. Returning on the click alone lets the caller log back in and
    // close the page context with the request still in flight, which aborts it
    // and leaves the groups behind - the very accumulation this cleanup exists
    // to stop.
    const [response] = await Promise.all([
      page.waitForResponse(
        (saveResponse) =>
          urlPathEndsWith(saveResponse.url(), EXCLUSION_GROUPS_SAVE_PATH),
        { timeout: EXCLUSION_GROUPS_SAVE_TIMEOUT_MS },
      ),
      excludeSection
        .locator(
          'div > div.row.mt-2.w-100.mb-3 > div > button.btn.btn-primary.font-md > span:text("Save")',
        )
        .click(),
    ]);
    expect(
      response.ok(),
      `The exclusion-group deletion was rejected with HTTP ${response.status()}`,
    ).toBeTruthy();
  }
  return initial;
}

let countSuppliersView: number;
test.describe
  .serial("The Global filters for Terms Extension and Vcard work @integrated-filters", () => {
  let page: Page;
  test.beforeAll(async ({ browser }) => {
    // A hook inherits the default 120s test budget, and this one logs in,
    // changes the spend file, deletes the leftover groups and then waits for
    // the recalculation that deletion enqueues. Without this the hook aborts on
    // timeout mid-recalculation whenever leftovers exist, which is exactly the
    // run the cleanup was added for, and takes the whole serial suite with it.
    test.setTimeout(FIXTURE_SETUP_TIMEOUT_MS + RECALCULATION_SETTLE_BUDGET_MS);

    page = await browser.newPage();

    await ensureCompany_SFSuperAdminLogin(page);
    await changeToSpendFile(page, given.spendfile);
    await page.waitForSelector(".loading-modal", { state: "detached" });
    await page.goto("/");

    // Start from a fixture with no exclusion groups. A previous run that died
    // with the entity card open could not reach its cleanup, and the leftovers
    // change what this suite measures: they keep excluding spend lines, and the
    // group this suite adds would be one of several.
    const excludeSection = await openExcludedSuppliersSection(page);
    const removed = await deleteAllExclusionGroups(page, excludeSection);
    if (removed > 0) {
      console.log(`*** removed ${removed} leftover exclusion group(s)`);
      await waitForRecalculationToSettle(page);
    }
    await page.goto("/");
  });
  test("Exclude and apply global filter @tc-11295 @integrated-filters", async () => {
    // Saving the exclusion group below kicks off a backend recalculation of the
    // spend file, and the rest of the test can only assert once it finishes.
    // The default 120s budget cannot hold a recalculation plus the filter steps.
    test.setTimeout(RECALCULATION_SETTLE_BUDGET_MS + FILTER_STEPS_TIMEOUT_MS);

    await findEntityCardExclusion(page, given.enity);
    const excludeSection = await openExcludedSuppliersSection(page);
    await excludeSection
      .locator(
        'div > div.row.mb-6.mt-8 > div > button > span:text("Add Group")',
      )
      .click();
    const groupRow = excludeSection.locator("div.group-row").last();
    await groupRow
      .locator('input.form-control.group-name[placeholder^="REX"]')
      .fill(given.excludedData.groupName);
    await groupRow
      .locator("input.form-control.group-name.input-left")
      .fill(given.excludedData.description);

    for (const rule of given.excludedData.rules) {
      await addExclusionRule(
        page,
        excludeSection,
        groupRow.locator("div.open-options").first(),
        rule,
      );
    }
    // Both rules must be stored on the group: a single one would leave part of
    // the entity's spend lines outside the exclusion.
    await expect(
      groupRow.locator("div.general-container-condition"),
    ).toHaveCount(given.excludedData.rules.length);

    const saveBtnExcluded = excludeSection.locator(
      'div > div.row.mt-2.w-100.mb-3 > div > button.btn.btn-primary.font-md > span:text("Save")',
    );
    await Promise.all([
      page.waitForResponse((response) =>
        urlPathEndsWith(response.url(), "/payment_term_extension_exclusion_groups"),
      ),
      saveBtnExcluded.click(),
    ]);
    await waitForMomentOpportunitySidebar(page);
    await waitForRecalculationToSettle(page);

    await page.locator(locators.filter.filterBtn).click();
    await page
      .locator(locators.filter.field.scfVcardDiscounting.fieldBtn)
      .click();
    await page
      .locator(locators.filter.field.scfVcardDiscounting.programApplied)
      .click();
    // Select "Term Extension" under "Program Applied". Toggle it via its label
    // (as a user would) and assert the underlying checkbox actually became
    // checked, instead of guessing the panel is rendered with a fixed timeout.
    const termExtensionRow = page.locator(
      "div.checkbox-wrapper.rounded-sm.mb-1.py-1",
      {
        has: page.locator(
          `label:has-text("${given.globalFilter.checkboxField}")`,
        ),
      },
    );
    await termExtensionRow
      .locator(`label:has-text("${given.globalFilter.checkboxField}")`)
      .click();
    await expect(
      termExtensionRow.locator('input[type="checkbox"][role="checkbox"]'),
    ).toBeChecked();

    // "Show Results" stays disabled until a filter is actually staged; wait for
    // it to enable, then apply.
    const showResultsBtn = page.locator(locators.filter.saveChanges);
    await expect(showResultsBtn).toBeEnabled();
    await showResultsBtn.click();

    // filtersApply() validates the filter through an async API call before
    // committing it to the store, and the filter-bar "Clear All" button
    // (#higher-z-index-btn) is rendered only once a filter is actually applied
    // (globalFiltersAppliedFieldsCount > 0). Wait for it to appear instead of a
    // fixed 2s guess: clicking it before it existed — combined with the
    // config's actionTimeout: 0 — is what produced the 120s test timeout.
    const clearAllBarBtn = page.locator("#higher-z-index-btn");
    await expect(clearAllBarBtn).toBeVisible();

    await findEntityCardExclusion(page, given.enity);
    expect(countSuppliersView).toEqual(0);

    await clearAllBarBtn.click();
    await page.locator(locators.filter.clearFilterBtn).click();
    // The filter is cleared only once the bar "Clear All" disappears again.
    await expect(clearAllBarBtn).toBeHidden();
  });
  test("The Program Summary card is visible. @tc-11299 @integrated-filters", async () => {
    const [totals] = await Promise.all([
      page.waitForResponse(
        (res: any) =>
          res.url().includes("/api/analyze/programs/program-distribution") &&
          res.ok(),
      ),
      page.locator(locators.sidebar.program).click(),
    ]);
    const programSummaryCard = page.locator(
      "#programDistributionOpportunityOverviewId",
    );

    if (totals.ok()) {
      const responseBody = await totals.json();
      if (
        await showProgramDistributionComponent(
          responseBody.spendVolume.volumeVcard,
          responseBody.spendVolume.volumeTermExtension,
          responseBody.spendVolume.excludeVolume,
        )
      ) {
        await expect(programSummaryCard).toBeVisible();
        const cardCashFlow = page.locator(
          "#container-main-id > div.sub-main-sections.mt-4 > div > div.col-xl-9 > div",
        );
        const cardCashFlowValue = cardCashFlow.locator(
          "div.col-xl-8.card-analyze__overview > div > div > div > div.col-xl-8.cash-flow-border.d-flex > div:nth-child(1) > div > div.d-flex.flex-column.text-center.body-section > p",
        );
        const cardSpendVolumeSupplier = page.locator(
          "#container-main-id > div.sub-main-sections.mt-4 > div > div.col-xl-3 > div > div:nth-child(1) > div > div > div",
        );
        const cardSpendVolumeValue = cardSpendVolumeSupplier.locator(
          "div:nth-child(2) > div.col-12.d-flex.min-h-11.horizontal-aligments-center span.text-5xl",
        );
        const cardSupplierValue = cardSpendVolumeSupplier.locator(
          "div:nth-child(3) > div:nth-child(2) > div > div.col-12.d-flex.min-h-9.horizontal-aligments-center > span",
        );
        const totalCashFlow = StringUtils.formatBigNumbers(
          responseBody.cashFlow.totalCashFlow,
        );
        const totalSuppliers = formData.getNumberWithDecimals(
          responseBody.countSuppliers.totalSuppliers,
          0,
        );
        const totalSpendVolume = StringUtils.formatBigNumbers(
          responseBody.spendVolume.totalVolume,
        );
        console.log(
          "*** total --> cash,spend,suppl",
          totalCashFlow,
          totalSpendVolume,
          totalSuppliers,
        );
        await expect(cardSupplierValue).toHaveText(totalSuppliers);
        console.log("***Passed supplier");
        await expect(cardSpendVolumeValue).toHaveText(totalSpendVolume);
        console.log("***Passed spend");
        await expect(cardCashFlowValue).toHaveText(totalCashFlow);
        console.log("***Passed cash");
      } else {
        console.log(
          "*** Program Distribution Card is not visible because only exists one of the three components in the response ***",
        );
      }
    }
  });
  test.afterAll(async () => {
    try {
      const excludeSection = await openExcludedSuppliersSection(page);
      await deleteAllExclusionGroups(page, excludeSection);
    } catch (error) {
      console.error(
        "afterAll: could not delete the exclusion groups:",
        error instanceof Error ? error.message : String(error),
      );
    } finally {
      await ensureDefaultLogin(page).catch((error) =>
        console.error(
          "afterAll: ensureDefaultLogin failed:",
          error instanceof Error ? error.message : String(error),
        ),
      );
      // Close the page's context (not the worker `browser` fixture) so the
      // worker stays alive for the next spec in the workers=1 pipeline.
      await page?.context().close().catch((error) => {
        console.error(
          "afterAll: page.context().close() failed (non-critical):",
          error instanceof Error ? error.message : String(error),
        );
      });
    }
  });
});

async function showProgramDistributionComponent(
  volumeVcard: number,
  volumeTermExtension: number,
  excludeVolume: number,
) {
  const show =
    (volumeTermExtension > 0 && volumeVcard > 0) ||
    (volumeVcard > 0 && excludeVolume > 0) ||
    (volumeTermExtension > 0 && excludeVolume > 0);
  console.log(
    "*** showProgramDistributionComponent",
    volumeTermExtension,
    volumeVcard,
    excludeVolume,
    show,
  );
  return show;
}

async function findEntityCardExclusion(page: Page, entityName: string) {
  const search = page.getByPlaceholder(
    englishKeys.home.components.navbar.search,
  );
  //clear the input first
  await search.fill("");
  // Type company name
  await search.fill(entityName);
  await Promise.all([
    page.waitForResponse((response) =>
      urlPathEndsWith(response.url(), "/api/entity-card/get-entity-cards"),
    ),
    search.press("Enter"),
  ]);
  await page.waitForTimeout(5000);
  const currentNameLocator = page.locator(".module-entity-cards");
  countSuppliersView = await currentNameLocator.count();
  if (countSuppliersView) {
    console.log("*** countSuppliersView second time", countSuppliersView);
  } else {
    console.log("*** countSuppliersView first time", countSuppliersView);
  }
}

async function waitForMomentOpportunitySidebar(page: Page) {
  await Promise.all([
    page.waitForResponse(
      (res: any) =>
        res.url().includes("/api/statistics/get-chart-data") && res.ok(),
    ),
    page.locator(locators.sidebar.program).click(),
  ]);
  await page.waitForTimeout(500);
}
