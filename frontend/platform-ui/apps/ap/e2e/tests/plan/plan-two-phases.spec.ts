import { test, expect, Page, APIResponse } from "@playwright/test";
import { changeToSpendFile, ensureAdminLogin, ensureDefaultLogin } from "../utils/Utils";
import { locators } from "../utils/locators";
import englishKeys from "@ada/design-system/locales/languages/en.json";
import { isNullOrUndefined } from "../utils";
import StringUtils from "../utils/StringUtils";
import ProgramUtils from "../utils/ProgramUtils";
import Api2 from "../utils/APi2";

/**
 * Creates multiple phases in a plan sequentially based on the provided phase data.
 * 
 * @param page - The Playwright Page object representing the current browser page
 * @param phases - Array of PhaseData objects containing configuration for each phase
 * 
 * The function performs the following steps for each phase:
 * 1. Clicks the new phase button
 * 2. Waits for API responses
 * 3. Sets the phase name
 * 4. Selects the period
 * 5. Applies filters if specified
 * 6. Selects all rows
 * 7. Saves the phase
 * 8. Navigates back to plan view
 * 
 * @throws Will throw an error if any of the page operations fail
 * 
 * @remarks
 * - Function includes multiple wait operations to ensure UI stability
 * - Expects specific API endpoints to be available
 * - Requires the page to be in the correct initial state
 */


const given = {
  company: "Company Test",
  spendfile: "Pagero_PlanTests.xlsx (Ver. 1)", //Already existent, and additionally attached here.
  program: "Main Program.", //Created by default.
  user: "joel+testadmin@calculum.ai",
  planName: "Plan With Two Phases",
  phasesPlan: { phaseName: "PhaseOne", phaseName1: "PhaseRest" },
  entities: [
    { name: "Advantage Resources Inc." },
    { name: "Axtone S.A." },
    {
      name: "Dr. Techn. Josef Zelisko, Fabrik Fuer Elektrotechnik Und Maschinenbau Gesellschaft M.B.H.",
    },
  ],
};
test.describe
  .serial("Plan with two phases in -> Pagero_PlanTests.xlsx (Ver. 1) @flaky", async () => {
  let page: Page;
  test.beforeAll(async ({ browser }) => {
    // The hook has to cover the login, the spend file change and — on the
    // shared environments — up to five minutes of waiting for the program to
    // come out of recalculation. A hook inherits the 120s test budget from
    // playwright.config.ts, so raise its own budget here.
    test.setTimeout(420000);
    page = await browser.newPage();
    await ensureAdminLogin(page);
    await changeToSpendFile(page, given.spendfile);
    // Data precondition, not a rendering one: the New Plan tile is rendered
    // disabled and without its @click handler while every program of this
    // spend file version is recalculating, so the assertion below would fail
    // on "element(s) not found" instead of reporting the real cause.
    await ProgramUtils.waitForProgramReadyToPlan(page, given.spendfile);
  });
  test("Creating the plan with two phases -> @prq @plan @integrated-plan", async () => {
    // Deleting the previous plan in this spend file if existed
    const [, plans] = await Promise.all([
      page.waitForResponse(
        (res) => res.url().endsWith("/analyze_programs") && res.ok(),
      ),
      page.waitForResponse(
        (res) =>
          res.url().includes("/api/plans?program.spendFileVersion.uuid=") &&
          res.ok(),
      ),
      page.locator(locators.sidebar.plan).click(),
    ]);
    const responsePlanCall = await plans.json();
    let plansResponse: any[] = responsePlanCall["hydra:member"];
    // Only match the *enabled* New Plan tile. HomePlanAllPlans renders a
    // disabled `div.new-plan` placeholder (no @click handler) until
    // /analyze_programs returns at least one program that is neither
    // recalculating nor pending, and HomePlanV2's "NEW PHASE" button shares
    // the same class. Clicking either look-alike is a silent no-op that
    // leaves the plan form unopened (the old `div.new-plan` locator did
    // exactly that right after deleting the leftover plan).
    const newPlanBtn = page.locator(
      'div.new-plan:not(.disabled):has-text("New Plan")',
    );
    console.log(
      `*** Deleting the previous plan in this spend file if existed--> ${plansResponse.length > 0}`,
    );
    if (plansResponse.length > 0) {
      // Open the plan options menu and delete the leftover plan, using the
      // stable IDs (same ones removePlan() relies on) instead of a brittle
      // deep CSS path that no longer matches the current DOM.
      await page.locator("#plan-options-menu").click();
      // Wait for the menu item to actually become interactive instead of a
      // bare sleep: on slow CI the 300ms window can expire before
      // #delete-plan-option is visible, so the click below would fire before
      // the item is attached and race the paired DELETE waiter.
      await page.locator("#delete-plan-option").waitFor({ state: "visible" });
      await Promise.all([
        // Same rationale as removePlan(): the backend delete can exceed the
        // suite-wide 15s actionTimeout, so cap this waiter at 60s (well
        // within the 120s test budget) instead of inheriting the default.
        page.waitForResponse(
          (res) =>
            res.url().includes("/api/plans/") &&
            res.request().method() === "DELETE" &&
            res.ok(),
          { timeout: 60000 },
        ),
        page.locator("#delete-plan-option").click(),
      ]);
    }
    // The delete success callback routes back to All Plans; wait for the
    // enabled New Plan tile instead of sleeping so the click inside
    // createPlanCF cannot land on the disabled placeholder while
    // /analyze_programs is still loading.
    await expect(newPlanBtn).toBeVisible({ timeout: 30000 });
    //create plan with Main Program
    await createPlanCF(page, newPlanBtn, given.planName, "", true);
  });
  test("Create the Phase One -> @prq @plan @integrated-plan", async () => {
    // This one test builds both phases, and each one now retries the modal
    // opening when a plan-recalculation push closes it and waits for the
    // recalculation its save starts (see `createPhasesPlans`). On the QA
    // runner a phase takes about 40 seconds, plus up to 120 for that wait and
    // about 45 for one retry of the modal: two of those do not fit in the
    // static 120s default from playwright.config.ts — `E2E_CUSTOM_TIME_OUT`
    // never reaches the workers, so the budget has to be raised here.
    test.setTimeout(420000);
    await createPhasesPlans(page, [
      {
        phaseName: given.phasesPlan.phaseName,
        period: "1 Week",
        filter: { field: "Aarsleff Rail A/S", propertyName: "entityName" },
      },
      {
        phaseName: given.phasesPlan.phaseName1,
        period: "1 Week",
        filter: null,
      },
    ]);
    // Auto-retrying assertion instead of a fixed sleep + one-shot count: a
    // slower-than-3s chart render previously sampled as 0 and failed the test
    // even though the chart would have appeared moments later.
    await expect(page.locator("div#range-bar-chart")).toHaveCount(1, {
      timeout: 30000,
    });
  });
  test("try to delete the plan", async () => {
    console.log("*** try to delete the plan");
    await removePlan(page);
  });
  test.afterAll(async () => {
    console.log("*** After all");
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
});

interface KendoFilter {
  field: string | string[];
  propertyName: string;
}
interface PhaseData {
  phaseName: string;
  period: string;
  filter: KendoFilter | null;
}

async function createPhasesPlans(page: Page, phases: PhaseData[]) {
  for (let index = 0; index < phases.length; index++) {
    const phaseData = phases[index];

    console.log("*** Creating phase: " + phaseData);

    // Only the enabled button: HomePlanV2 keeps rendering NEW PHASE with
    // `.disabled` while the program recalculates, and `createPhase` is then a
    // silent no-op, so a click on it "succeeds" without opening anything.
    const newPhaseButton = page.locator(
      'div.new-plan:not(.disabled):has-text("NEW PHASE")',
    );
    const phaseNameInput = page.locator("input.form-control.change-name");
    const periodSelect = page.locator("select[name='selectPeriod']");
    // Same anchor as plan-with-one-phase.spec.ts: the modal is teleported to
    // <body> next to the plan view, and the name input is unique to it.
    const phaseModal = page
      .locator('[data-testid="modal"]')
      .filter({ has: phaseNameInput });
    const firstGridRow = phaseModal
      .locator("div.k-grid-aria-root:visible tbody tr.k-master-row")
      .first();
    const selectAllRows = phaseModal.getByRole("checkbox", {
      name: "Select All Rows",
    });

    // Opening the modal and filling its first fields is one retrying unit.
    // HomePlanV2's `setRefeshPlans` watcher sets `showNewPhase = false` for
    // ANY plan-status push, so a push that lands while the modal is open
    // tears it down under the test. `waitForPlanReady` below keeps the pushes
    // of the previous save away from this modal; the retry covers the rest.
    await expect(async () => {
      // A modal left open by a failed iteration covers NEW PHASE, and a click
      // through its overlay is intercepted until the budget runs out. Fill
      // that modal instead of trying to open a second one.
      if (!(await phaseNameInput.isVisible())) {
        await newPhaseButton.click({ timeout: 15000 });
      }

      // Wait for a data row, not for a request: the grid queries are
      // cache-first, so a reopened modal can be served from the Apollo cache
      // without sending /api/graphql at all. The header checkbox is no signal
      // either — PlanEditLists starts its grids on `[]`, so the header renders
      // at once, and checked, before any row has arrived.
      await expect(firstGridRow).toBeVisible({ timeout: 30000 });

      console.log("*** Phase name is: " + phaseData.phaseName);
      await phaseNameInput.fill(phaseData.phaseName, { timeout: 10000 });
      console.log("*** Phase period: " + phaseData.period);
      await periodSelect.selectOption(
        { label: phaseData.period },
        { timeout: 10000 },
      );
      // The modal can still be swapped out between the two fills, which would
      // leave the period set on a component that is on its way out. Re-read
      // both values so a torn-down modal is retried instead of carried on with.
      await expect(phaseNameInput).toHaveValue(phaseData.phaseName, {
        timeout: 5000,
      });
      // The period is picked by label and PlanPhase.vue binds the option value
      // to the period length in days, so the option text is what maps back to
      // `phaseData.period`. Asserting the select's value would compare against
      // that number instead, and leaving the period unchecked let a phase be
      // saved on the default period whenever the selection did not stick.
      await expect(periodSelect.locator("option:checked")).toHaveText(
        phaseData.period,
        { timeout: 5000 },
      );
    }).toPass({ timeout: 90000, intervals: [1000, 2000, 3000] });
    await page.waitForTimeout(1000);
    if (phaseData.filter) {
      console.log(
        `*** Phase filter: ${phaseData.filter.field} in ${phaseData.filter.propertyName}`,
      );
      await filterByFieldInGrid(
        page,
        phaseData.filter.field,
        phaseData.filter.propertyName,
        "adding",
      );
    }
    await page.waitForTimeout(3000);
    // A modal torn down after the retry unit fails here, before saving.
    await expect(
      phaseNameInput,
      "The phase modal closed before it was saved",
    ).toHaveValue(phaseData.phaseName, { timeout: 5000 });
    // Every action below gets its own timeout: on the QA run `check()` waited
    // 346s for a missing checkbox, so the config's `actionTimeout` was not in
    // effect there.
    // An empty or reloading grid shows the header as checked, and `check()`
    // would then return without clicking and save a phase with nothing in it.
    await expect(firstGridRow).toBeVisible({ timeout: 30000 });
    await expect(selectAllRows).not.toBeChecked({ timeout: 30000 });
    await selectAllRows.check({ timeout: 15000 });
    // PlanPhase only shows the counter once the selection has reached it.
    await expect(
      phaseModal.getByText(englishKeys.home.plan.planPhase.spendsInThisPhase.trim()),
    ).toBeVisible({ timeout: 15000 });
    await Promise.all([
      page.waitForResponse(
        (res: any) =>
          res.url().includes("/api/plans/edit-plan-phase") && res.ok(),
        { timeout: 30000 },
      ),
      page.locator(locators.plan.phasePopupSave).click({ timeout: 15000 }),
    ]);

    // With "Select All Rows" the save only queues the move, so the plan
    // pushes of this save are still to come. Wait for the backend to finish
    // before remounting the view: the fresh listener then almost always starts
    // on "ready", which usePlanFirebase stores without notifying. The worker
    // commits the flags just before it writes "ready" to Firestore; the chart
    // wait and the retry unit cover that short gap.
    const planUuid = new URL(page.url()).searchParams.get("planId");
    if (!planUuid) {
      throw new Error(`No planId in the Plan view URL: ${page.url()}`);
    }
    await waitForPlanReady(page, planUuid);

    await Promise.all([
      page.waitForResponse(
        (res: any) => res.url().includes("/api/plans?program") && res.ok(),
        { timeout: 30000 },
      ),
      page.waitForResponse(
        (res: any) => res.url().includes("/api/plans/phases-waterfall") && res.ok(),
        { timeout: 30000 },
      ),
      page.locator(locators.sidebar.plan).click({ timeout: 15000 }),
    ]);

    // The chart only renders while the plan is not in "updating", and NEW
    // PHASE only once the phases have loaded.
    await expect(page.locator("div#range-bar-chart")).toBeVisible({
      timeout: 30000,
    });
    await expect(newPhaseButton).toBeVisible({ timeout: 30000 });
    console.log("*** Finished the Phase creation ");
  }
}

/**
 * Waits until the plan has no recalculation queued or running.
 *
 * Saving a phase with "Select All Rows" sends `all: true`, and
 * /api/plans/edit-plan-phase answers as soon as the move is queued. The
 * worker then pushes the plan's Firestore status ("updating", then "ready"),
 * and HomePlanV2 closes any open phase modal on each push. On the QA
 * environment the queue took 8 to 18 seconds and its "ready" push landed on
 * the next phase's modal; on dev it finishes before that modal opens.
 *
 * @param page {Page}
 * @param planUuid uuid of the plan whose phases are being saved.
 * @returns {Promise<void>}
 */
async function waitForPlanReady(page: Page, planUuid: string): Promise<void> {
  const api = await Api2.getInstance(page);
  const READY = "ready";

  await expect
    .poll(
      async () => {
        // expect.poll does not retry a callback that throws, so a single
        // network error would end the wait without its message.
        let response: APIResponse;
        try {
          response = await api.doGet(`/api/plans/${planUuid}`, 15000);
        } catch (error) {
          return `GET /api/plans/${planUuid} failed: ${
            error instanceof Error ? error.message : String(error)
          }`;
        }
        if (!response.ok()) {
          return `GET /api/plans/${planUuid} responded ${response.status()}`;
        }

        let plan: Record<string, any>;
        try {
          plan = await response.json();
        } catch {
          return `GET /api/plans/${planUuid} returned a non-JSON body`;
        }

        return plan.pendingRecalculation === false &&
          plan.recalculationInProgress === false
          ? READY
          : `plan is still recalculating (pendingRecalculation=${plan.pendingRecalculation}, ` +
              `recalculationInProgress=${plan.recalculationInProgress})`;
      },
      {
        message:
          `Plan ${planUuid} did not finish the recalculation started by the phase save. ` +
          "Its phase modal cannot be opened safely until it does.",
        timeout: 120000,
        intervals: [1000, 2000, 3000, 5000],
      },
    )
    .toBe(READY);
}
async function removePlan(page: Page) {
  //Removing the Plan
  await Promise.all([
    page.waitForResponse(
      (res: any) => res.url().includes("/api/plans?program") && res.ok(),
    ),
    page.waitForResponse(
      (res: any) => res.url().includes("/api/plans/phases-waterfall") && res.ok(),
    ),
    page.locator(locators.sidebar.plan).click(),
  ]);

  await page.waitForTimeout(3000);
  console.log("*** try to delete the plan menu option");

  await page.locator("#plan-options-menu").click();
  // Wait for the menu item to become interactive instead of a bare sleep so
  // the click cannot fire before #delete-plan-option is attached on slow CI.
  await page.locator("#delete-plan-option").waitFor({ state: "visible" });
  // Arm the waiter before clicking: the old click-then-wait order could
  // miss a fast DELETE response and hang for the whole test budget. The
  // method check keeps refetch GETs under /api/plans/ from satisfying it.
  await Promise.all([
    // Give the DELETE its own generous timeout instead of the suite-wide
    // actionTimeout: 15000. This delete runs right after two phases were
    // created, so the plan/program is often mid-recalculation and the
    // backend cascade delete can legitimately take longer than 15s on CI —
    // the whole test has a 120s budget, so the tight 15s cap (not the
    // delete itself) is what made this step flaky.
    page.waitForResponse(
      (response) =>
        response.url().includes("/api/plans/") &&
        response.request().method() === "DELETE" &&
        response.ok(),
      { timeout: 60000 },
    ),
    page.locator("#delete-plan-option").click(),
  ]);
}
async function filterByFieldInGrid(
  page: Page,
  field: string | Array<string>,
  propertyName: string,
  url: "adding" | "entityName" = "entityName",
) {
  const fields = typeof field === "string" ? [field] : field;
  console.log("*** waiting for api call: " + url);
  // Explicit timeouts for the same reason as in createPhasesPlans: without
  // them a missing element waits for the whole test budget on the QA runner.
  await Promise.all([
    page.waitForResponse((response) => response.url().endsWith(`/${url}`), {
      timeout: 30000,
    }),
    page
      .getByRole("link", { name: `${propertyName} Column Menu` })
      .click({ timeout: 15000 }),
  ]);
  const searchInput = page.locator('#searchSelectFilter');
  await expect(searchInput).toBeVisible();
  for (const singleField of fields) {
    await searchInput.fill(singleField, { timeout: 15000 });
    await page.waitForTimeout(2500);
    await page.getByLabel(singleField).first().check({ timeout: 15000 });
  }

  await page.locator('#filter-results').click({ timeout: 15000 });

  await page.waitForTimeout(
    process.env.E2E_ENV_NAME === "LOCAL" ? 3500 : 2000,
  );
}
async function createPlanCF(
  page: Page,
  locate: any,
  planName: string,
  programSelected?: string,
  userIsAlreadyInPlan: boolean = false,
): Promise<any> {
  console.log(
    "Creating a new plan based on CF program: ",
    programSelected ?? "Main Program",
  );

  if (!userIsAlreadyInPlan) {
    await Promise.all([
      page.waitForResponse(
        (res: any) => res.url().includes("/api/plans?program") && res.ok(),
      ),
      page.locator(locators.sidebar.plan).click(),
    ]);
    await page.waitForTimeout(5000);
  }
  await Promise.all([
    // HomeAnalyzeProgramToPlan1 re-fetches /analyze_programs in its setup,
    // so this waiter is satisfied by the destination view itself.
    page.waitForResponse(
      (res: any) => res.url().includes("/analyze_programs") && res.ok(),
    ),
    locate.click(),
  ]);

  // Web-first gate: the plan form must actually render before we type. If
  // the click above was swallowed, this fails in 30s with a clear signal
  // instead of burning the whole 120s test budget on the fill.
  const planNameInput = page.locator("input#period2");
  await expect(planNameInput).toBeVisible({ timeout: 30000 });
  console.log("*** Plan name is: " + planName);
  await planNameInput.fill(planName);
  console.log("*** Plan period: " + "1 Year");
  await page.locator(".custom-dropdown-selectPeriodForPlan").click();
  await page.locator('span.text-option[title="1 Year"]').click();
  if (
    !isNullOrUndefined(programSelected) &&
    !StringUtils.isEmpty(programSelected)
  ) {
    await page
      .locator("select#selectProgram")
      .selectOption("CF " + programSelected);
    await page.waitForTimeout(3000);
    await page.locator("select#selectPeriod").last().selectOption({ index: 9 });
  }

  await Promise.all([
    page.waitForResponse(
      (res: any) => res.url().includes("/api/plans") && res.ok(),
    ),
    page.locator(".btn.btn-primary:has-text('SAVE')").click(),
  ]);
  console.log("*** Finished the Plan creation ");
}
