/**
 * Test suite for Payment Terms VS Price Calculator functionality.
 * Tests various calculation scenarios for different payment programs.
 *
 * @remarks
 * The test suite covers three main program types:
 * - No Program: Basic calculation without any specific payment program
 * - VCard: Virtual card payment program calculations
 * - SCF (Supply Chain Finance): Supply chain financing program calculations
 *
 * Each test verifies:
 * - Input field functionality
 * - Calculation accuracy
 * - Economic profit calculations for both buyer and supplier
 * - Data persistence
 * - Reset functionality
 * - Scenario management
 *
 * @environment
 * Required environment variables:
 * - E2E_AUTH_USERNAME_SF_1
 * - E2E_AUTH_PASSWORD_SF_1
 *
 * @constants
 * - SPEND_FILE_NAME: "Pagero_VCard.xlsx (Ver. 1)"
 * - SUPPLIER_NAME: "Axtone S.A."
 *
 * @useCases
 * - US-9949: Calculator functionality verification
 * - US-12343: Scenario management
 *
 * @testCases
 * - TC-9982: No program calculator functionality
 * - TC-9984: VCard calculator functionality
 * - TC-12375: Scenarios saving and deletion
 */
import { expect, test, Page, Request } from "@playwright/test";
import {
  changeToSpendFile,
  goToEntityCardEntity,
  ensureDefaultLogin,
  ensureCompany_SFLogin,
} from "../../utils/Utils";
import { ProgramUtils } from "../../utils";
import { locators } from "../../utils/locators";
import { randomUUID } from "crypto";
// None (No Program)
const NONE_INPUTS = {
  changeInTerms: 32,
  priceChange: -3,
  supplierTaxRate: 20,
  supplierWacc: 7,
};

const NONE_EXPECTED = {
  buyer: {
    contractual: 88,
    economicProfitAsString: "6.6k",
    spendVolume: 234157.7236,
  },
  supplier: {
    economicProfitAsString: "-6.9k",
  },
} as const;

// Vcard

const VCARD_INPUTS = {
  additionalFields: {
    paymentCycleFloat: 40,
    rebate: 2,
    supplierCardCost: 1,
  },
  changeInTerms: 0,
  priceChange: 1,
  supplierTaxRate: 35,
  supplierWacc: 7,
} as const;

const VCARD_EXPECTED = {
  buyer: {
    contractual: 88,
    economicProfitAsString: "3.5k",
    annualVolume: 234157.2,
  },
  supplier: {
    economicProfitAsString: "-39.5",
  },
} as const;

const VCARD_INPUTS_2 = {
  additionalFields: {
    paymentCycleFloat: 40,
    rebate: 2,
    supplierCardCost: 0.5,
  },
  changeInTerms: 0,
  priceChange: 1,
  supplierTaxRate: 35,
  supplierWacc: 5,
} as const;

const VCARD_EXPECTED_2 = {
  buyer: {
    contractual: 88,
    economicProfitAsString: "3.5k",
    annualVolume: 234157.2,
  },
  supplier: {
    economicProfitAsString: "732.8",
  },
} as const;

// VCARD_EXPECTED_RESET used to hold the figures expected after a reset ("4.9k"
// for the buyer, "1.6k" for the supplier). It is gone on purpose: a reset
// restores the default calculation type, so the calculator is back on
// "No Program" by then and no Vcard figure can be expected. The Vcard test
// asserts the reset contract itself instead - see the comment there.

// SCF

const SCF_INPUTS = {
  additionalFields: {
    earliestDayPaid: 5,
    financingRate: 7,
    scfRate: 6,
  },
  changeInTerms: 45,
  priceChange: 1,
  supplierTaxRate: 35,
  supplierWacc: 7,
};

const SCF_EXPECTED = {
  buyer: {
    contractual: 88,
    economicProfitAsString: "1.4k",
  },
  supplier: {
    economicProfitAsString: "2.0k",
  },
} as const;
/**
 * The scenario list refetch, GET
 * /api/calculated_scenarios?config.uuid=<uuid>&level=<level>. The route is
 * matched on the pathname and the query is read through searchParams; the
 * spec used to match it with a raw `url.includes("...?config.uuid=")`.
 */
function isScenarioListReload(url: string) {
  const parsed = new URL(url);

  return (
    parsed.pathname === "/api/calculated_scenarios" &&
    parsed.searchParams.has("config.uuid")
  );
}

/** The class EntityCardTabBar puts on the currently open entity-card tab. */
const ACTIVE_TAB_CLASS = /(^|\s)active(\s|$)/;

/**
 * How long a calculation-type change is watched for a recalculation that must
 * not happen. Asserting an absence needs a window to observe it in; this is
 * the one place in the spec where a fixed wait is the assertion itself and not
 * a substitute for one.
 */
const NO_RECALCULATION_WINDOW_MS = 1500;

/**
 * True when the response path is exactly `path`.
 *
 * REST waiters compare `new URL(url).pathname` and never the raw URL: several
 * entity-card and spend-file endpoints append query strings
 * (?globalFilter=..., ?spendUUID=...), and a raw `includes` also matches those
 * query values instead of the route itself.
 */
function pathIs(url: string, path: string) {
  return new URL(url).pathname === path;
}

/** True when the response path ends with `suffix` (routes that embed a uuid). */
function pathEndsWith(url: string, suffix: string) {
  return new URL(url).pathname.endsWith(suffix);
}

const given = {
  company: "Company_SF",
  // Exact case matters: changeToSpendFile short-circuits on a strict `===`
  // against the active spend file version name ("Pagero_VCard.xlsx (Ver. 1)").
  spendfile: "Pagero_VCard.xlsx (Ver. 1)",
  program: "Main Program",
  user: "user-test@softwaresinlimite.com",
  entity1: "Axtone S.A.",
  programSelect: ["SCF", "Vcard", "No Program"],
};
test.describe.serial("Payment Terms VS Price Calculator @entity @vcard", async () => {
  let page: Page;

  // Shared-fixture restore. The SCF test persists calculator values for
  // Company_SF / Axtone S.A. / Main Program through
  // /api/entity-card/calculator/save-data. The values that were saved BEFORE
  // this run come back in the get-initial-data answer that the calculator tab
  // fires on mount, and the identifiers save-data needs are in that same
  // request, so afterAll can put the previous state back.
  let calculatorStateBeforeRun: {
    ids: Record<string, unknown>;
    calculatorValues: unknown;
  } | null = null;
  let calculatorValuesWereSaved = false;
  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();

    // Arm the afterAll restore from the save itself rather than from a flag set
    // at one call site: the enabled 'Vcard' test also persists calculator
    // values, so keying the restore off the (skipped) SCF test left the Vcard
    // writes standing on the shared fixture supplier for every run.
    page.on("response", (response) => {
      if (
        response.request().method() === "POST" &&
        pathIs(response.url(), "/api/entity-card/calculator/save-data") &&
        response.ok()
      ) {
        calculatorValuesWereSaved = true;
      }
    });

    await ensureCompany_SFLogin(page);
    await changeToSpendFile(page, given.spendfile);
  });
  test("Go to supplier in entity card", async () => {
    // The supplier-level opportunity chart is the signal that the card that
    // opened is a SUPPLIER card: index 0 of `.current-name` is not guaranteed
    // to be a supplier row, because the grid level (Spend Lines / Suppliers /
    // Parents) leaks between specs through the persisted ada-home store in
    // e2e/state.json.
    await Promise.all([
      page.waitForResponse(
        (response) =>
          pathEndsWith(
            response.url(),
            "/chart/payment-terms-opportunity/supplier",
          ) && response.ok(),
      ),
      goToEntityCardEntity(page, given.entity1, 0, true),
    ]);

    // ... and the card that opened must be the fixture supplier, not whatever
    // row 0 of the current grid level happened to be.
    await expect(page.locator(".name-entity").first()).toContainText(
      given.entity1,
    );

    // Company_SF / "Pagero_VCard.xlsx (Ver. 1)" currently exposes a single
    // program, so HomeProgramStatusDropdown is not rendered at all (it needs
    // `listOptions.length > 1`) and changeToProgram returns early with
    // "Only one Program, nothing to change...". The call is kept so the suite
    // still lands on Main Program if a second program is added to the fixture.
    await ProgramUtils.changeToProgram(page, ProgramUtils.PROGRAM_NAME_MAIN);

    // The calculator tab renders only when `programTarget === "cashFlow"` or a
    // potential theme is set (useTopMenuTabs.ts). Assert it is on screen and
    // NOT already selected before clicking: EntityCardTabBar only calls
    // `changeButton`, so a click on the already-active tab is a no-op, the
    // three bootstrap calls below never re-fire and Promise.all hangs until the
    // test times out. That is the most likely origin of the @flaky tag.
    const calculatorTab = page.locator(locators.entityCard.menu.calculator);
    await expect(calculatorTab).toBeVisible();
    await expect(calculatorTab).not.toHaveClass(ACTIVE_TAB_CLASS);

    // Best effort snapshot of the calculator values already persisted for this
    // supplier, for the afterAll restore. Never fails the test: this call is
    // not part of what the test asserts.
    const initialDataResponse = page
      .waitForResponse(
        (response) =>
          pathIs(
            response.url(),
            "/api/entity-card/calculator/get-initial-data",
          ) && response.ok(),
        { timeout: 30000 },
      )
      .catch(() => null);

    await Promise.all([
      page.waitForResponse(
        (response) =>
          pathIs(
            response.url(),
            "/api/analyze/get-spend-program-configs-by-provider",
          ) && response.ok(),
      ),
      page.waitForResponse(
        (response) =>
          pathIs(response.url(), "/api/entity-card/calculator/calculate-data") &&
          response.ok(),
      ),
      page.waitForResponse(
        (response) =>
          pathIs(
            response.url(),
            "/api/entity-card/calculator/calculate-table",
          ) && response.ok(),
      ),
      calculatorTab.click(),
    ]);

    // EntityCardTabBar marks the open view with the `active` class, so this
    // proves the calculator view is the one mounted - not merely that three
    // responses happened to fly by.
    await expect(calculatorTab).toHaveClass(ACTIVE_TAB_CLASS);

    const initialData = await initialDataResponse;

    if (initialData) {
      // Read the body before anything navigates: Chromium discards it and
      // response.json() then throws.
      const body = await initialData.json().catch(() => null);
      const request = JSON.parse(initialData.request().postData() ?? "{}");

      calculatorStateBeforeRun = {
        ids: {
          configUUID: request.configUUID,
          level: request.level,
          programUUID: request.programUUID,
          supplierUUID: request.supplierUUID,
        },
        calculatorValues: body?.data?.calculatorSavedValues ?? null,
      };

      console.log(
        "Calculator values persisted before this run:",
        JSON.stringify(calculatorStateBeforeRun.calculatorValues),
      );
    }
  });
  test("the calculator works for the buyer under 'no program' option and it is persistent @us-9949 @tc-9982 @sergio", async () => {
    // The inputs card renders three headings - "Contractual Payment
    // Terms(Days)", "Avg. Days Paid (days)" and "Price Change (%)" - so the two
    // this test cares about are addressed by name. Reading them by index used
    // to pass "Avg. Days Paid (days)" off as the price-change heading.
    await expect(
      inputsCard(page).getByRole("heading", {
        name: "Contractual Payment Terms(Days)",
      }),
    ).toBeVisible();

    await expect(
      inputsCard(page).getByRole("heading", { name: "Price Change (%)" }),
    ).toBeVisible();

    await calculationTypeSelect(page, "No Program");

    await buyerAssertTermsContractual(page, NONE_EXPECTED.buyer.contractual);

    await buyerChangeInTermsSetInput(page, NONE_INPUTS.changeInTerms);

    await buyerPriceChangeSetInput(page, NONE_INPUTS.priceChange);

    await impactAnalysisCalcTabClick(page);

    await supplierWaccSetInput(page, NONE_INPUTS.supplierWacc);

    await supplierTaxRateSetInput(page, NONE_INPUTS.supplierTaxRate);

    // calculateBtnClick waits for calculate-data and calculate-table, so the
    // assertions below read the recalculated figures, not the previous ones.
    await calculateBtnClick(page);

    // Assert Buying Entity Economic Profit
    await buyerAssertEconomicProfit(
      page,
      NONE_EXPECTED.buyer.economicProfitAsString,
    );

    // Assert Supplier Economic Profit
    await supplierAssertEconomicProfit(
      page,
      NONE_EXPECTED.supplier.economicProfitAsString,
    );
  });

  //
  // VCARD
  //

  test("the calculator works for the buyer under 'Vcard' option and it is persistent @us-9949 @tc-9984 @sergio", async () => {
    // The inputs card renders three headings - "Contractual Payment
    // Terms(Days)", "Avg. Days Paid (days)" and "Price Change (%)" - so the two
    // this test cares about are addressed by name. Reading them by index used
    // to pass "Avg. Days Paid (days)" off as the price-change heading.
    await expect(
      inputsCard(page).getByRole("heading", {
        name: "Contractual Payment Terms(Days)",
      }),
    ).toBeVisible();

    await expect(
      inputsCard(page).getByRole("heading", { name: "Price Change (%)" }),
    ).toBeVisible();

    // No sleep after the type change: selecting a type resets the inputs to
    // that type's defaults and fires nothing, so there is no response to wait
    // for. calculationTypeSelect asserts that.
    await calculationTypeSelect(page, "Vcard");

    await buyerAssertTermsContractual(page, VCARD_EXPECTED.buyer.contractual);

    await buyerChangeInTermsSetInput(page, VCARD_INPUTS.changeInTerms);

    await buyerPriceChangeSetInput(page, VCARD_INPUTS.priceChange);

    await paymentCycleFloatSetInput(
      page,
      VCARD_INPUTS.additionalFields.paymentCycleFloat,
    );

    await supplierCardCostSetInput(
      page,
      VCARD_INPUTS.additionalFields.supplierCardCost,
    );

    await supplierRebateSetInput(page, VCARD_INPUTS.additionalFields.rebate);

    await impactAnalysisCalcTabClick(page);

    await supplierWaccSetInput(page, VCARD_INPUTS.supplierWacc);

    await supplierTaxRateSetInput(page, VCARD_INPUTS.supplierTaxRate);

    // calculateBtnClick waits for calculate-data and calculate-table, so the
    // assertions below read the recalculated figures, not the previous ones.
    await calculateBtnClick(page);

    await buyerAssertEconomicProfit(
      page,
      VCARD_EXPECTED.buyer.economicProfitAsString,
    );

    await supplierAssertEconomicProfit(
      page,
      VCARD_EXPECTED.supplier.economicProfitAsString,
    );

    console.log("[Vcard] Trying new inputs...");

    await supplierWaccSetInput(page, VCARD_INPUTS_2.supplierWacc);

    await supplierCardCostSetInput(
      page,
      VCARD_INPUTS_2.additionalFields.supplierCardCost,
    );

    await calculateBtnClick(page);

    await buyerAssertEconomicProfit(
      page,
      VCARD_EXPECTED_2.buyer.economicProfitAsString,
    );

    await supplierAssertEconomicProfit(
      page,
      VCARD_EXPECTED_2.supplier.economicProfitAsString,
    );

    // Capture the figure on screen before the reset, so the assertions below
    // can prove the reset actually recalculated instead of leaving it there.
    const buyerProfitBeforeReset = await economicProfitValue(
      page,
      "Buyer",
    ).innerText();

    // resetBtnClick waits for the recalculation the reset triggers.
    await resetBtnClick(page);

    console.log("[Vcard] Asserting reset was successful ...");

    // A reset restores the DEFAULT calculation type, not just the default
    // inputs of the current one: calculatorResetToSavedOrDefaultsOnClick
    // (EntityCardCalculator.vue line 1539) rebuilds the type dropdown from
    // calculatorDefaultTypes and re-selects the default entry, then applies the
    // saved values and recalculates once. So after resetting from Vcard the
    // calculator is back on "No Program" and the vCard-only extra fields are
    // gone.
    //
    // This is why the old VCARD_EXPECTED_RESET figures could never match: they
    // were written as though the calculator stayed on the Vcard branch. The
    // assertions below state what the product actually guarantees instead of
    // hard-coding whatever number the No Program defaults happen to produce
    // today - that number depends on the entity's saved calculator state,
    // which this very suite rewrites when it saves.
    await expect(inputsCard(page).getByRole("combobox")).toHaveText(
      "No Program",
    );

    await expect(extraFieldInput(page, /^Payment Float/)).toHaveCount(0);

    await expect(
      extraFieldInput(page, /^Supplier Card Cost \(%\)\s*$/),
    ).toHaveCount(0);

    await expect(buyerChangeInTermsInput(page)).toHaveValue("0");

    // The reset recalculated: the Vcard figure is no longer on screen.
    await expect(economicProfitValue(page, "Buyer")).not.toHaveText(
      buyerProfitBeforeReset,
    );

    // Click Save. The waiter compares the pathname, like every other REST
    // waiter in this spec, and the body is read before anything can navigate.
    const [response] = await Promise.all([
      page.waitForResponse(
        (response) =>
          pathIs(response.url(), "/api/entity-card/calculator/save-data") &&
          response.ok(),
      ),
      saveBtnClick(page),
    ]);

    const result = await response.json();

    // Assert Save was successful
    expect(result?.success).toBeTruthy();
  });

  //
  // SCF
  //

  // Recovered after bug 19913 (Sprint 116) closed as "Fixed and verified": the
  // owner confirmed the supplier Economic Profit is presentation only, so the
  // expected string carries the one decimal StringUtils.formatBigNumbers emits
  // since commit 1e9f85ab7c added `minimumFractionDigits = 1` ("2.0k" for the
  // ~2012.52 the fixture was written against, where it used to render "2k").
  // Every other step of this test was verified green on dev on 2026-09-01.
  test("the calculator works for the buyer under 'SCF' option and it is persistent @us-9949 @tc-9984 @sergio", async () => {
    // Headings are addressed by name: the inputs card renders a third one
    // ("Avg. Days Paid (days)") between the two this test asserts, so reading
    // them by index compared the wrong nodes.
    await expect(
      inputsCard(page).getByRole("heading", {
        name: "Contractual Payment Terms(Days)",
      }),
    ).toBeVisible();

    await expect(
      inputsCard(page).getByRole("heading", { name: "Price Change (%)" }),
    ).toBeVisible();

    await calculationTypeSelect(page, "SCF");

    await buyerAssertTermsContractual(page, SCF_EXPECTED.buyer.contractual);

    await buyerChangeInTermsSetInput(page, SCF_INPUTS.changeInTerms);

    await buyerPriceChangeSetInput(page, SCF_INPUTS.priceChange);

    await supplierEarliestDayPaidSetInput(
      page,
      SCF_INPUTS.additionalFields.earliestDayPaid,
    );

    await supplierFinancingRateSetInput(
      page,
      SCF_INPUTS.additionalFields.financingRate,
    );

    await supplierSCFRateSetInput(page, SCF_INPUTS.additionalFields.scfRate);

    await impactAnalysisCalcTabClick(page);

    await supplierWaccSetInput(page, SCF_INPUTS.supplierWacc);

    await supplierTaxRateSetInput(page, SCF_INPUTS.supplierTaxRate);

    // calculateBtnClick waits for calculate-data and calculate-table, so the
    // economic profits below are the recalculated ones.
    await calculateBtnClick(page);

    await buyerAssertEconomicProfit(
      page,
      SCF_EXPECTED.buyer.economicProfitAsString,
    );

    await supplierAssertEconomicProfit(
      page,
      SCF_EXPECTED.supplier.economicProfitAsString,
    );

    // Click Save. This persists the calculator values for
    // Company_SF / Axtone S.A. / Main Program, which is a shared-fixture
    // mutation: the afterAll below puts the calculator back on the values that
    // were saved before this test ran.
    const [response] = await Promise.all([
      page.waitForResponse(
        (response) =>
          pathIs(response.url(), "/api/entity-card/calculator/save-data") &&
          response.ok(),
      ),
      saveBtnClick(page),
    ]);

    // Read the body before anything can navigate: Chromium discards it and
    // response.json() then throws.
    const result = await response.json();

    // Assert Save was successful
    expect(result?.success).toBeTruthy();
  });
  // Recovered with AB#19912 (Back-End: the scenario's creator may delete it; Front-End: the trash
  // icon is shown only to the creator or an admin) and AB#19914 (the control is addressed by class,
  // one id per page is no longer duplicated per card). The fixture account E2E_AUTH_USERNAME_SF_1
  // is a regular user and deletes only the scenarios this run created.
  test("The Scenarios saving and deletion works @flaky @us-12343 @tc-12375", async () => {
    // The Scenarios panel is shared fixture data: the scenarios saved by
    // earlier runs, or by a human, live in the same list. Every scenario this
    // test creates is therefore named with a per-run id, and only those are
    // deleted at the end - the previous version deleted EVERY card in the
    // panel and restored nothing.
    const runId = randomUUID().slice(0, 8);
    const scenarioNames = given.programSelect.map(
      (type) => `E2E ${runId} ${type}`,
    );

    // The panel is only revealed by this button; the list itself was already
    // fetched when the calculator mounted (getScenariosByConfig runs in the
    // get-initial-data callback), so there is no response to wait on here.
    await page.locator("#show-hide-scenarios-btn").click();

    const scenariosContainer = page.locator(".scenarios-container");
    await expect(scenariosContainer).toBeVisible();

    const scenarioCards = scenariosContainer.locator("div.card");
    const cardsBefore = await scenarioCards.count();
    console.log(`Scenarios already saved for this entity: ${cardsBefore}`);

    for (const [index, type] of given.programSelect.entries()) {
      await calculationTypeSelect(page, type);

      await page.locator("#new-scenario-btn").click();

      const nameInput = page.locator("#newScenarioModalTitle");
      await expect(nameInput).toBeVisible();
      await nameInput.fill(scenarioNames[index]);

      const [scenario] = await Promise.all([
        page.waitForResponse(
          (res) =>
            pathIs(res.url(), "/api/calculated_scenarios/save_scenario") &&
            res.ok(),
        ),
        page.waitForResponse((res) => isScenarioListReload(res.url()) && res.ok()),
        page.locator("#save-new-scenario-btn").click(),
      ]);

      expect(scenario.ok()).toBeTruthy();

      // Both the save and the refetch set someScenarioApiRequest, which swaps
      // the whole list for a Skeleton block, so the cards unmount and remount
      // around every save. Wait for the container to come back before counting.
      await expect(scenariosContainer).toBeVisible();
      await expect(scenarioCards).toHaveCount(cardsBefore + index + 1);
      await expect(
        scenariosContainer.getByText(scenarioNames[index], { exact: true }),
      ).toBeVisible();
    }

    // Delete the three scenarios this run created, one at a time. Addressing
    // the card by its name instead of by index is what fixes the original
    // loop: it captured the icon count once and then clicked nth(i) while the
    // list shrank by one card per delete, so the last iterations addressed
    // indexes that no longer existed.
    for (const name of scenarioNames) {
      const card = scenarioCards.filter({ hasText: name });

      await Promise.all([
        page.waitForResponse((res) => isScenarioListReload(res.url()) && res.ok()),
        card.locator(".close-scenarios-card").click(),
      ]);

      await expect(scenariosContainer).toBeVisible();
      await expect(card).toHaveCount(0);
    }

    // The panel is back to exactly what it held before this test ran.
    await expect(scenarioCards).toHaveCount(cardsBefore);
  });
  test.afterAll(async () => {
    console.log("*** After all");

    await restoreCalculatorValues();

    await ensureDefaultLogin(page);
    // Close the page's context (not the worker `browser` fixture) so the
    // worker stays alive for the next spec in the workers=1 pipeline.
    await page?.context().close().catch((error) => {
      console.error(
        "afterAll: page.context().close() failed (non-critical):",
        error instanceof Error ? error.message : String(error),
      );
    });
  });

  /**
   * Put back the calculator values that were persisted for the fixture
   * supplier before this run, undoing whichever test saved during it. Replays
   * the app's own POST through the page's request context, which shares the
   * session cookie; the back end rejects a POST without a v4 `idk` header, so
   * one is generated per call exactly as the axios interceptor does.
   */
  async function restoreCalculatorValues() {
    if (!calculatorValuesWereSaved) return;

    if (!calculatorStateBeforeRun?.calculatorValues) {
      console.log(
        "afterAll: nothing to restore - no calculator values were persisted for this supplier before the run.",
      );
      return;
    }

    const url = `${process.env.E2E_BASE_URL_API}/api/entity-card/calculator/save-data`;

    const response = await page.request
      .post(url, {
        data: {
          ...calculatorStateBeforeRun.ids,
          calculatorValues: calculatorStateBeforeRun.calculatorValues,
        },
        headers: { idk: randomUUID() },
      })
      .catch((error) => {
        console.error("afterAll: calculator restore failed:", error);
        return null;
      });

    console.log(
      `afterAll: calculator values restored, save-data answered ${response?.status()}`,
    );
  }
}); //serial

//
// Locators
//
// Every locator below is anchored on the text the calculator renders instead
// of on a position in the DOM. The positional form the spec used to carry
// (".card" nth(0..2), getByRole("spinbutton").nth(N), ".col-3" nth(0)) had
// already drifted: the inputs card now renders an extra "Avg. Days Paid
// (days)" heading, so heading nth(1) was no longer "Price Change (%)", and
// ".col-3" nth(0) was the "Program Impact" cell rather than the contractual
// payment terms value. Anchoring on labels also survives the vCard/SCF
// extra-field block appearing and disappearing, which is what silently moved
// the spinbutton indexes around.
//

/** The calculator input card - the one titled "Contractual Payment Terms(Days)". */
function inputsCard(page: Page) {
  return page
    .locator(".card")
    .filter({
      has: page.getByRole("heading", { name: "Contractual Payment Terms" }),
    })
    .first();
}

/** The "Economic Profit" card, holding the buyer and supplier results. */
function economicProfitCard(page: Page) {
  return page
    .locator(".card")
    .filter({ has: page.getByRole("heading", { name: "Economic Profit" }) })
    .first();
}

/** The "Impact Analysis" card, holding the Charts/Matrix/Calculation tabs. */
function impactAnalysisCard(page: Page) {
  return page
    .locator(".card")
    .filter({ has: page.getByRole("heading", { name: "Impact Analysis" }) })
    .first();
}

/**
 * The "Avg. Days Paid (days)" row of the inputs card. `.center-input-values`
 * is the class the template puts on it; a potential-theme entity renders a
 * second one for Spend Volume, hence `.first()`.
 */
function paymentTermsRow(page: Page) {
  return inputsCard(page).locator(".center-input-values").first();
}

/** The buyer Contractual Payment Terms value (the "Current" cell). */
function buyerTermsContractualValue(page: Page) {
  return paymentTermsRow(page)
    .locator(".col-2")
    .filter({ has: page.getByText("Current", { exact: true }) })
    .locator("span")
    .last();
}

/** The buyer "Change" input of the payment-terms row - the only input there. */
function buyerChangeInTermsInput(page: Page) {
  return paymentTermsRow(page).getByRole("spinbutton");
}

/**
 * The buyer "Additional" price-change cell: the only `.col-3` of the inputs
 * card that holds an editable field. Under Vcard/SCF the supplier band renders
 * a second "Additional" column, but that one is a read-only value.
 */
function buyerPriceChangeCell(page: Page) {
  return inputsCard(page)
    .locator(".col-3")
    .filter({ has: page.getByRole("spinbutton") });
}

/**
 * A calculation-type-specific input of the grey box on the right of the inputs
 * card (Payment Float, Supplier Card Cost, Rebate, Earliest Day Paid, Supplier
 * Financing Rate, Rate). Each renders as
 * `div.row > div.col-12 (label) + div.col-12 (NumericTextBox)`, so the field is
 * addressed through its own label. `.last()` picks the innermost matching row:
 * an ancestor row always precedes its descendants in document order.
 *
 * Label regexes end in `\\s*$` because `hasText` matches a RegExp against the
 * raw text content: every label that carries a tooltip icon leaves a trailing
 * space behind, so a bare `$` never matches.
 */
function extraFieldInput(page: Page, label: RegExp) {
  return inputsCard(page)
    .locator("div.row")
    .filter({ has: page.locator("div.col-12").filter({ hasText: label }) })
    .filter({ has: page.getByRole("spinbutton") })
    .last()
    .getByRole("spinbutton");
}

/**
 * A NumericTextBox of the Impact Analysis > Calculation accordion. Only the
 * supplier column carries editable fields; the buying-entity column renders the
 * same two labels as read-only values, and the trailing value text is what
 * keeps the anchored regex from matching them.
 */
function accordionInput(page: Page, label: RegExp) {
  return impactAnalysisCard(page)
    .locator(".item-line")
    .filter({ hasText: label })
    .getByRole("spinbutton");
}

/** The Economic Profit value of the buyer or of the supplier column. */
function economicProfitValue(page: Page, side: "Buyer" | "Supplier") {
  return economicProfitCard(page)
    .locator(".col-6")
    .filter({ has: page.getByText(side, { exact: true }) })
    .first()
    .locator(".row")
    .first()
    .locator("span")
    .last();
}

/**
 * The two POSTs every recalculation fires (callDatasAPIRead -> calculate-data
 * + calculate-table). Waiting on them replaces the fixed
 * `page.waitForTimeout(2000)` this spec used to sleep for, which raced the
 * economics engine whenever dev answered in more than two seconds.
 */
function calculatorRecalculated(page: Page) {
  return Promise.all([
    page.waitForResponse(
      (response) =>
        pathIs(response.url(), "/api/entity-card/calculator/calculate-data") &&
        response.ok(),
    ),
    page.waitForResponse(
      (response) =>
        pathIs(response.url(), "/api/entity-card/calculator/calculate-table") &&
        response.ok(),
    ),
  ]);
}

//
// Actions
//

/**
 * Select a new calculation type on the calculator page.
 *
 * Changing the type resets the inputs to the defaults of that type and does
 * not recalculate: recalculating is an explicit user action, behind
 * "Calculate". The helper asserts that contract rather than working around it.
 *
 * @param {Page} page
 * @param {string} newType
 */
async function calculationTypeSelect(page: Page, newType: string) {
  console.log(`Selecting new calculation type ${newType}`);

  const dropdown = inputsCard(page).getByRole("combobox");

  // Kendo's DropDownList emits `change` only when the value really changes, so
  // re-picking the type that is already selected fires no request at all and a
  // waiter hung off the click would hang until the test timeout. "No Program"
  // is the type the calculator opens on, so this is the normal case, not an
  // edge case.
  if ((await dropdown.innerText()).trim() === newType) {
    console.log(`Calculation type is already ${newType}, nothing to select`);
    return;
  }

  await dropdown.click();

  // Kendo Popup animates in: only the option list inside the shown animation
  // container is clickable.
  const option = page
    .locator(".k-animation-container-shown")
    .getByRole("option", { name: newType, exact: true });

  // Selecting a type is not a recalculation. The product recalculates only on
  // an explicit "Calculate", so `callDatasAPIRead()` is intentionally not
  // called from this path in EntityCardCalculator.vue
  // (calculationTypeDropdownOptionSelectedOnChange, line 2229). Picking an
  // option therefore resets the inputs to that type's defaults and leaves the
  // figures on screen as they were.
  //
  // That is the contract this helper pins: no waiter is hung off the option
  // click - one would never resolve - and instead every calculator call the
  // change might fire is collected, so the assertion below can prove none did.
  const calculatorCalls: string[] = [];
  const collectCalculatorCall = (request: Request) => {
    if (request.url().includes("/api/entity-card/calculator/")) {
      calculatorCalls.push(request.url());
    }
  };
  page.on("request", collectCalculatorCall);

  try {
    await option.click();

    // The dropdown must be showing the type that was asked for: the rest of
    // the test asserts numbers that only mean something for this branch.
    await expect(dropdown).toHaveText(newType);

    // Proving an absence needs a window to observe. Verified on dev
    // 2026-09-01: no calculator request at all is issued in the 8 seconds
    // after the option is picked, so this window is generous.
    await page.waitForTimeout(NO_RECALCULATION_WINDOW_MS);

    expect(
      calculatorCalls,
      "changing the calculation type must not recalculate: the figures stay as they were until Calculate is pressed",
    ).toEqual([]);
  } finally {
    page.off("request", collectCalculatorCall);
  }
}

/**
 * Click the calculate button and wait for the recalculation to answer.
 * @param {Page} page The page to interact with
 */
async function calculateBtnClick(page: Page) {
  console.log(`Clicking calculate button ...`);

  const calculate = inputsCard(page)
    .getByRole("button")
    .filter({ hasText: "Calculate" });

  await Promise.all([calculatorRecalculated(page), calculate.click()]);
}

/**
 * Click the "Save" button in the calculator page.
 * @param {Page} page The page to interact with
 */
async function saveBtnClick(page: Page) {
  await page
    .locator(".k-icon.k-svg-icon.k-svg-i-more-vertical.k-button-icon")
    .click();

  await page.getByRole("menuitem", { name: "Save" }).click();
}

/**
 * Click "Reset to Defaults" in the calculator kebab menu and wait for the
 * recalculation it triggers.
 *
 * Unlike a calculation-type change, a reset DOES recalculate. The menu item
 * runs `calculatorResetToSavedOrDefaultsOnClick` (EntityCardCalculator.vue,
 * line 1539), which restores the defaults through
 * `calculatorResetToDefaultsOnClick` and then calls `callDatasAPIRead()` once
 * at the end, line 1797. The `callDatasAPIRead()` commented out inside the
 * inner helper (line 1533) would only be a second, redundant recalculation:
 * the inner helper sets state, the outer one recalculates.
 *
 * @param {Page} page The page to interact with
 */
async function resetBtnClick(page: Page) {
  console.log(`Clicking Reset to Defaults ...`);

  await page
    .locator(".k-icon.k-svg-icon.k-svg-i-more-vertical.k-button-icon")
    .click();

  const reset = page.getByRole("menuitem", { name: "Reset to Defaults" });

  await Promise.all([calculatorRecalculated(page), reset.click()]);
}

/**
 * Sets the payment cycle float input to the given value.
 * @param {Page} page The page to interact with
 * @param {number} newValue The new value to set the input to
 */
async function paymentCycleFloatSetInput(page: Page, newValue: number) {
  console.log(`Setting payment float to ${newValue}...`);

  await setNumericInput(extraFieldInput(page, /^Payment Float/), newValue);
}

/**
 * Sets the buyer change in terms input to the given value.
 * @param {Page} page The page to interact with
 * @param {number} newValue The new value to set the input to
 */
async function buyerChangeInTermsSetInput(page: Page, newValue: number) {
  console.log(`Setting buyer change in terms to ${newValue}...`);

  await setNumericInput(buyerChangeInTermsInput(page), newValue);
}

/**
 * Sets the buyer price change input to the given value.
 * @param {Page} page The page to interact with
 * @param {number} newValue The new value to set the input to
 * Custom hack for negative values: if the new value is negative, the function
 * will click the "Decrease value" button Math.abs(newValue) number of times.
 * Zero and positive values are filled directly.
 */
async function buyerPriceChangeSetInput(page: Page, newValue: number) {
  console.log(`Setting supplier price change to ${newValue}...`);

  const cell = buyerPriceChangeCell(page);

  await cell.getByRole("spinbutton").clear();

  // Zero belongs with the positive values: sending it to the decrement branch
  // runs the loop Math.abs(0) times, so the field keeps the empty value the
  // clear() above left and the post-condition below can never see "0.00".
  if (newValue >= 0) {
    await setNumericInput(cell.getByRole("spinbutton"), newValue);
  }
  // Custom hack for negative values
  else {
    for (let i = 0; i < Math.abs(newValue); i++) {
      await cell.getByLabel("Decrease value").click();
    }
  }

  await expect(cell.getByRole("spinbutton")).toHaveValue(
    newValue.toFixed(2),
  );
}

/**
 * Fill a Kendo NumericTextBox and assert the value landed. The `fill("")`
 * first is what Kendo needs to accept a replacement value.
 *
 * @param input The spinbutton locator
 * @param newValue The new value to set the input to
 */
async function setNumericInput(input: ReturnType<Page["locator"]>, newValue: number) {
  await input.fill("");
  await input.fill(newValue.toString());
  await expect(input).not.toHaveValue("");
}

/**
 * Asserts the Contractual Payment Terms on the Buying Entity card is the
 * expected value.
 *
 * @param page The playwright page
 * @param valueExpected The expected value as a number
 */
async function buyerAssertTermsContractual(page: Page, valueExpected: number) {
  console.log(`Asserting buyer terms contractual is ${valueExpected}`);

  await expect(buyerTermsContractualValue(page)).toHaveText(
    valueExpected.toString(),
  );
}

/**
 * Asserts the Economic Profit on the Buying Entity card is the expected value.
 *
 * @param page The playwright page
 * @param valueExpectedAsString The expected value as a string
 */
async function buyerAssertEconomicProfit(
  page: Page,
  valueExpectedAsString: string,
) {
  console.log(`Asserting buyer economic profit is ${valueExpectedAsString}`);

  await expect(economicProfitValue(page, "Buyer")).toHaveText(
    valueExpectedAsString,
  );
}

/**
 * Asserts the Economic Profit on the Supplier card is the expected value.
 *
 * @param page - The Playwright page object.
 * @param valueExpectedAsString - The expected economic profit value as a string.
 */
async function supplierAssertEconomicProfit(
  page: Page,
  valueExpectedAsString: string,
) {
  console.log(`Asserting supplier economic profit is ${valueExpectedAsString}`);

  await expect(economicProfitValue(page, "Supplier")).toHaveText(
    valueExpectedAsString,
  );
}

/**
 * Sets the supplier card cost input to the given value.
 * @param {Page} page The page to interact with
 * @param {number} newValue The new value to set the input to
 */
async function supplierCardCostSetInput(page: Page, newValue: number) {
  console.log(`Setting supplier card cost to ${newValue}...`);

  await setNumericInput(
    extraFieldInput(page, /^Supplier Card Cost \(%\)\s*$/),
    newValue,
  );
}

/**
 * Sets the supplier earliest day paid input to the given value.
 * @param {Page} page The page to interact with
 * @param {number} newValue The new value to set the input to
 */
async function supplierEarliestDayPaidSetInput(page: Page, newValue: number) {
  console.log(`Setting supplier earliest day paid ${newValue}...`);

  await setNumericInput(extraFieldInput(page, /^Earliest Day Paid\s*$/), newValue);
}

/**
 * Sets the supplier financing rate input to the given value.
 * @param {Page} page The page to interact with
 * @param {number} newValue The new value to set the input to
 */
async function supplierFinancingRateSetInput(page: Page, newValue: number) {
  console.log(`Setting supplier financing rate to ${newValue}...`);

  await setNumericInput(
    extraFieldInput(page, /^Supplier Financing Rate \(%\)\s*$/),
    newValue,
  );
}

/**
 * Sets the supplier rebate input to the given value.
 * @param {Page} page The page to interact with
 * @param {number} newValue The new value to set the input to
 */
async function supplierRebateSetInput(page: Page, newValue: number) {
  console.log(`Setting supplier rebate to ${newValue}...`);

  await setNumericInput(extraFieldInput(page, /^Rebate \(%\)\s*$/), newValue);
}

/**
 * Sets the SCF rate input to the given value.
 * @param {Page} page The page to interact with
 * @param {number} newValue The new value to set the input to
 */
async function supplierSCFRateSetInput(page: Page, newValue: number) {
  console.log(`Setting scf rate to ${newValue}...`);

  await setNumericInput(extraFieldInput(page, /^Rate \(%\)\s*$/), newValue);
}

/**
 * Sets the supplier tax rate input to the given value.
 * @param {Page} page The page to interact with
 * @param {number} newValue The new value to set the input to
 */
async function supplierTaxRateSetInput(page: Page, newValue: number) {
  console.log(`Setting supplier tax rate to ${newValue}...`);

  await setNumericInput(accordionInput(page, /^Tax Rate \(%\)\s*$/), newValue);
}

/**
 * Sets the supplier wacc input to the given value.
 * @param {Page} page The page to interact with
 * @param {number} newValue The new value to set the input to
 */
async function supplierWaccSetInput(page: Page, newValue: number) {
  console.log(`Setting supplier wacc to ${newValue}...`);

  await setNumericInput(
    accordionInput(page, /^Cost of Capital \(Supplier\) \(%\)\s*$/),
    newValue,
  );
}

/**
 * Clicks on the Calculation tab in the Impact Analysis card and waits for the
 * accordion - which is what carries the supplier WACC and tax rate inputs - to
 * be mounted. The tab is a local state change, so there is no response to wait
 * on; the accordion's own inputs are the readiness signal.
 *
 * @param {Page} page - The page to interact with
 */
async function impactAnalysisCalcTabClick(page: Page) {
  console.log("Clicking on Calculation tab under Impact Analysis card...");

  await impactAnalysisCard(page).getByText("Calculation", { exact: true }).click();

  await expect(
    accordionInput(page, /^Cost of Capital \(Supplier\) \(%\)\s*$/),
  ).toBeVisible();
}
