import { test, expect, Page } from "@playwright/test";
import {
  changeToSpendFile,
  createPlanCF,
  ensureDefaultLogin,
} from "../utils/Utils";
import { locators } from "../utils/locators";
import ProgramUtils from "../utils/ProgramUtils";

const planName = "Plan With One Phase";

test.describe
  .serial("Plan with one phase in -> Pagero_PlanTests.xlsx (Ver. 1) @flakyResolved", async () => {
  let page: Page;
  test.beforeAll(async ({ browser }) => {
    // The hook has to cover the login, the spend file change and — on the
    // shared environments — up to five minutes of waiting for the program to
    // come out of recalculation. A hook inherits the 120s test budget from
    // playwright.config.ts, so raise its own budget here.
    test.setTimeout(420000);
    page = await browser.newPage();
    await ensureDefaultLogin(page);
    await changeToSpendFile(page, "Pagero_PlanTests.xlsx (Ver. 1)");
    // Data precondition, not a rendering one: while every program of this
    // spend file version is recalculating, HomePlanAllPlans renders the
    // disabled New Plan placeholder (no `cursor-pointer`, no @click) and
    // `locators.plan.addPlan` matches nothing, so the assertion below would
    // fail on "element(s) not found" instead of reporting the real cause.
    await ProgramUtils.waitForProgramReadyToPlan(page, "Pagero_PlanTests.xlsx (Ver. 1)");
  });

  test(`In plan creation wizard only one program is available @flakyResolved @plan @api @us-5595 @tc-5741 @one-plan`, async () => {
    // ******* This code works for all tests in this file ********
    // ***********************************************************
    // Deleting the previous plan in this spend file if existed
    await Promise.all([
      page.waitForResponse(
        (res) =>
          res.url().includes("/api/plans?program.spendFileVersion.uuid=") &&
          res.ok(),
      ),
      page.locator(locators.sidebar.plan).click(),
    ]);

    // The plan section renders one of two anchors depending on whether a
    // leftover plan exists from a previous run:
    //   - `locators.plan.addPlan` ("NEW PLAN") on the all-plans home page
    //   - `#plan-options-menu` on the single-plan view (HomePlanV2)
    // The previous code called `addPlanBtn.isHidden()` immediately after
    // the click — a non-waiting check — so on a slow render it treated
    // the button as hidden, entered the delete branch, then waited 120s
    // on a long chained CSS selector that didn't match anything yet.
    // Wait until either anchor renders before deciding which branch.
    const addPlanBtn = page.locator(locators.plan.addPlan).first();
    const planOptionsMenu = page.locator("#plan-options-menu");
    await expect(addPlanBtn.or(planOptionsMenu).first()).toBeVisible({
      timeout: 30_000,
    });

    if (await planOptionsMenu.isVisible()) {
      console.log("Deleting the previous plan");
      await planOptionsMenu.click();
      // Use the stable id on the delete-plan option rather than the
      // fragile `#options-menu > ul > li:nth-child(3) > a > span` chain,
      // which breaks if the menu's order changes (e.g. when "Marked" or
      // "Edit Plan" are conditionally hidden).
      await page.locator("#delete-plan-option").click();
      await expect(addPlanBtn).toBeVisible({ timeout: 30_000 });
    }

    // Click on New Plan for testing the cancel button later.
    await Promise.all([
      page.waitForResponse(
        (res) =>
          res.url().includes("/api/analyze/programs/potentials-cost") &&
          res.ok(),
      ),
      page.locator(locators.plan.addPlan).first().click(),
    ]);
    //Canceling Plan creation
    await Promise.all([
      page.waitForResponse(
        (res) => res.url().includes("/api/plans") && res.ok(),
      ),
      page.locator(locators.plan.cancelPlanCreation).click(),
    ]);
  });

  test("Create a plan with one phase -> @flakyResolved @prq @plan", async () => {
    // await page.waitForSelector(".loading-modal", { state: "detached" });
    //create plan with Main Program
    // await page.waitForTimeout(2000);
    await createPlanCF(page, planName, undefined, true);
  });

  test("Create the single phase -> @flakyResolved @prq @plan", async () => {
    const phaseName = "Phase TEST";

    await page.waitForSelector(".loading-modal", { state: "detached" });
    await Promise.all([
      page.waitForResponse(
        (res) =>
          res.url().includes("/api/plans?program.spendFileVersion.uuid=") &&
          res.ok(),
      ),
      page.locator(locators.sidebar.plan).click(),
    ]);

    await Promise.all([
      page.waitForResponse(
        (res: any) => res.url().includes("/api/graphql") && res.ok(),
      ),
      await page.locator(locators.plan.newPhase).click(),
    ]);

    await page.locator("input.form-control.change-name").fill(phaseName);
    await page
      .locator("select[name='selectPeriod']")
      .selectOption({ label: "1 Week" });

    // Scope every subsequent interaction to the phase-popup modal. The
    // modal is teleported to <body> ([PlanPhase.vue:3](../../../apps/ap/src/modules/home/plan/components/PlanPhase.vue#L3))
    // so it sits as a sibling of the plan view that opened it — both
    // mount under <body>, both contain `div.k-grid-aria-root` (the plan
    // view has its own phase-cards grid), and both pass `:visible` since
    // the modal backdrop is translucent. Earlier the locator
    // `div.k-grid-aria-root:visible >> first` matched the grid BEHIND the
    // modal; Playwright then clicked at the page-grid's coordinates,
    // which land on the modal backdrop (`#calculum-modal-container`).
    // The backdrop has `@click.self="$emit('close')"` ([CalculumModal.vue:4](../../../apps/ap/src/modules/components/CalculumModal.vue#L4)),
    // so the click closed the phase modal instead of toggling a row. Once
    // the modal is gone the Save button doesn't exist and
    // `waitForResponse('/api/plan_phases')` waits forever.
    //
    // Anchor on the modal that contains the phase-name input — that input
    // is unique to this modal ([PlanPhase.vue:70](../../../apps/ap/src/modules/home/plan/components/PlanPhase.vue#L70)).
    const phaseModal = page
      .locator('[data-testid="modal"]')
      .filter({ has: page.locator("input.form-control.change-name") });
    await expect(phaseModal).toBeVisible({ timeout: 30_000 });

    // Wait for the active grid inside the modal to render rows. Kendo's
    // `headerselectionchange` event fires synchronously with the current
    // `gridData` array — if the grid still has zero rows, the event
    // passes an empty array, `selectAllRow` records no selection
    // ([PlanEditLists.vue:664-690](../../../apps/ap/src/modules/home/plan/components/PlanEditLists.vue#L664-L690))
    // and `withChangesGrid` stays false, leaving Save disabled
    // ([PlanPhase.vue:179](../../../apps/ap/src/modules/home/plan/components/PlanPhase.vue#L179)).
    const modalGrid = phaseModal
      .locator("div.k-grid-aria-root:visible")
      .first();
    await expect(modalGrid).toBeVisible({ timeout: 30_000 });
    await expect(modalGrid.locator("tbody tr").first()).toBeVisible({
      timeout: 30_000,
    });

    const selectAllCheckbox = modalGrid
      .locator("thead input.k-checkbox")
      .first();
    await selectAllCheckbox.check();
    await expect(selectAllCheckbox).toBeChecked();

    // The header checkbox flipping is necessary but not sufficient.
    // `headerselectionchange` emits `props.gridData` AS-IS at the time of
    // the click ([CalculumGridGraphql.vue:1464-1478](../../../apps/ap/src/modules/components/grid/CalculumGridGraphql.vue#L1464-L1478)).
    // If the suppliers/spends payload is still streaming in or the grid
    // just re-rendered (`allSelected.value = false` is reset in ~15 spots
    // of CalculumGridGraphql.vue, including on pagination/data refresh),
    // the header click can leave the header visually checked while the
    // row `selected` flags never get set. `selectAllRow` then records an
    // empty selection ([PlanEditLists.vue:664-690](../../../apps/ap/src/modules/home/plan/components/PlanEditLists.vue#L664-L690)),
    // so `selectedGlobalItems` stays empty. The Save button is still
    // enabled because name/period flipped `withChanges` true
    // ([PlanPhase.vue:408-414](../../../apps/ap/src/modules/home/plan/components/PlanPhase.vue#L408-L414)),
    // and clicking it pops the "Missing Selection" confirmation modal
    // ([PlanPhase.vue:564-572](../../../apps/ap/src/modules/home/plan/components/PlanPhase.vue#L564-L572)) —
    // `/api/plan_phases` is never called and the next `waitForResponse`
    // hangs to the test timeout. Assert that at least one row's
    // checkbox actually flipped (this is the real signal that Kendo's
    // selection state propagated), and if not, click the first row
    // directly — one selection is enough to clear the validation.
    const checkedRow = modalGrid
      .locator("tbody tr input.k-checkbox:checked")
      .first();
    try {
      await expect(checkedRow).toBeVisible({ timeout: 5_000 });
    } catch {
      console.log(
        "[plan-with-one-phase] header checkbox did not propagate row selection; selecting the first row directly.",
      );
      await modalGrid.locator("tbody tr input.k-checkbox").first().check();
      await expect(checkedRow).toBeVisible({ timeout: 5_000 });
    }

    // Scope Save to the modal too. `locators.plan.phasePopupSave` is
    // `div.row.mt-2 > div > button.btn.btn-primary.font-md`, and the
    // CalculumModal slot wraps every modal's buttons in that same
    // structure ([CalculumModal.vue:31-33](../../../apps/ap/src/modules/components/CalculumModal.vue#L31-L33))
    // — so without scoping it can match the Save button on a sibling
    // confirm modal. The button has a stable `span.saveBtn` marker
    // ([PlanPhase.vue:182](../../../apps/ap/src/modules/home/plan/components/PlanPhase.vue#L182)).
    const saveBtn = phaseModal.locator("button:has(span.saveBtn)");
    await expect(saveBtn).toBeEnabled({ timeout: 10_000 });

    await Promise.all([
      page.waitForResponse(
        (res: any) => res.url().includes("/api/plan_phases") && res.ok(),
      ),
      saveBtn.click(),
    ]);
    // await page.waitForTimeout(10000); //To guarantee the Phase Rest creation
    await page.reload();

    // Removing the plan — use the stable ids on the PlanOptions trigger
    // (`#plan-options-menu`) and the delete entry (`#delete-plan-option`)
    // rather than `#header-match >> getByRole("button")`. The old chain
    // hung after `page.reload()` until the test's 120s timeout because
    // the plan-options trigger only renders once `loadingPhases` flips
    // false ([HomePlanV2.vue:40-66](../../../apps/ap/src/modules/home/plan/views/HomePlanV2.vue#L40-L66)),
    // and the implicit auto-wait on `getByRole("button")` retried for the
    // whole test timeout instead of failing fast on a stable anchor.
    const planOptionsMenu = page.locator("#plan-options-menu");
    await expect(planOptionsMenu).toBeVisible({ timeout: 30_000 });
    await planOptionsMenu.click();
    await page.locator("#delete-plan-option").click();
    console.log("Plan Deleted.");
  });
  test.afterAll(async () => {
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
