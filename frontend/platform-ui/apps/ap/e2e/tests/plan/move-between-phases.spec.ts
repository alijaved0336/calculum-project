
/**
 * Test suite for verifying movement between plan phases in the Pagero_PlanTests.xlsx (Ver. 1) spend file.
 * 
 * This suite performs the following:
 * - Logs in as a strategies user and switches to the specified spend file.
 * - Iterates over a list of entities and verifies their plan/phase status.
 * - Tests movement between phases for different entities using UI interactions.
 * - Handles special cases for non-admin users.
 * - Cleans up by logging in as the default user and closing the browser.
 * 
 * @file move-between-phases.spec.ts
 * @module e2e/tests/plan/move-between-phases
 */

/**
 * Test data used for the plan and phase movement tests.
 * @property {string} company - The company name.
 * @property {string} spendfile - The spend file name.
 * @property {string} program - The program name.
 * @property {string} user - The user email.
 * @property {string} planName - The plan name.
 * @property {object} phasesPlan - Object containing phase names.
 * @property {Array<{name: string}>} entities - List of entity objects with names.
 */
import { test, expect, Page } from "@playwright/test";
import { changeToSpendFile, ensureDefaultLogin, ensureStrategiesUserLogin } from "../utils/Utils";
import { locators } from "../utils/locators";
import englishKeys from "@ada/design-system/locales/languages/en.json";
import ProgramUtils from "../utils/ProgramUtils";



const given = {
  company: "Company Test",
  spendfile: "Pagero_Full-Winner-Strategy.xlsx (Ver. 1)", //Already existent, and additionally attached here.
  program: "Main Program.", //Created by default.
  user: "joel+teststrategies@calculum.ai",
  planName: "Plan 1",
  phasesPlan: { phaseName: "Phase 1", phaseName1: "PhaseRest" },
  entities: [
    { name: "Advantage Resources Inc." },
    { name: "Axtone S.A." },
    {
      name: "Dr. Techn. Josef Zelisko, Fabrik Fuer Elektrotechnik Und Maschinenbau Gesellschaft M.B.H.",
    },
  ],
};
test.describe
  .serial("Plan with two phases in -> Pagero_PlanTests.xlsx (Ver. 1)", async () => {
  let page: Page;
  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();
    await ensureStrategiesUserLogin(page);
    await changeToSpendFile(page, given.spendfile);
    await ProgramUtils.changeToProgram(page, ProgramUtils.PROGRAM_NAME_MAIN);
  });
  // TODO(unskip): flaky + fixture-dependent, and the fixture CANNOT be seeded via the
  // UI as this test's user. Findings from attempting a beforeAll seed against dev:
  //   1. The test assumes a pre-existing plan "Plan 1" (phases "Phase 1"/"PhaseRest") on
  //      Pagero_Full-Winner-Strategy.xlsx and never restores entities after moving them,
  //      so runs are non-deterministic (entity lands in an unexpected phase, popover node
  //      missing, etc.).
  //   2. The strategies user (joel+teststrategies) has NO usable "NEW PLAN" control on the
  //      plan section (it is gated — its Main Program is not in a recalculated state), so
  //      it cannot create a plan via the UI.
  //   3. The admin user CAN create plans here, but plans are USER-SCOPED: a plan created by
  //      admin is not visible to the strategies user (verified: strategies plan count = 0
  //      after admin created one). So seeding-as-admin does not help this test's user.
  // Second blocker, re-derived on 2026-09-23: kendoChartRelated's selection-column
  //      menu is gone from the program edit grid. The move action is now
  //      `#dropdown-edit-program-option-moveBetween` in the "Selected: N" bar
  //      (MovePhasesAction.vue, a CalculumTreeSelect of plans and phases); see the
  //      note on setVCardBulk in utils/kendoChartRelated.ts.
  // To stabilize, the fixture must be provisioned out-of-band for the strategies user
  // (backend seed / DB fixture, or recalculate that user's Main Program so NEW PLAN
  // enables), then create Plan 1 + phases in beforeAll and restore phases in afterAll.
  // The recalc-wait / popover-node-wait hardening below is kept.
  test.skip("The movement between Plan/Phase is working @tc-11623 @integrated-plan @flaky", async () => {
    for (let index = 0; index < given.entities.length; index++) {
      const element = given.entities[index];
      console.log("*** Supplier-->", element.name);
      await findEntityCard(page, element.name);
      const planBadge = page.locator("span.data-plan-status");
      const textInitial = await planBadge.innerText();
      console.log("*** textInitial", textInitial);
      const isPlanned=textInitial!=='Not in plan'
      expect(isPlanned).toBeTruthy()
      const plan = textInitial.split(" - ")[0].trim();
      const phase = textInitial.split(" - ")[1].trim();
      console.log(
        `*** textInitial--> ${textInitial}, *** plan--> ${plan}, *** phase-->  ${phase}`,
      );
      if (index === 0) {
        await planBadge.click();
        const planPopover=page.locator('.tree-container.popover-nested');
        await planPopover.waitFor({state:'visible'})
        await planPopover.locator(`span.node-label:has-text("${given.planName}")`).click();      
        await moveTo(page, phase, true);
        const textResult = await planBadge.innerText();
        const planResult = textResult.split(" - ")[0].trim();
        const phaseResult = textResult.split(" - ")[1].trim();
        console.log(
          `*** textResult--> ${textResult}, *** plan--> ${planResult}, *** phase-->  ${phaseResult}`,
        );
        const expectedText = `${planResult}&${phaseResult}`;
        const receivedText = `${plan}&${phase}`;
        console.log("*** compare change", expectedText, receivedText);
        expect(textInitial === textResult).toBeFalsy();
        await page.locator(locators.entityCard.closeCard).click();
      } else if (index === 1) {
        await page.waitForTimeout(3000);
        await page.getByRole("checkbox", { name: "Select All Rows" }).check();
        await page.waitForTimeout(300);
        await page.getByRole("link", { name: `selected Column Menu` }).click();
        await page
          .getByText(englishKeys.home.analyze.moveBetween, { exact: true })
          .click();
        await page.getByText(given.planName, { exact: true }).last().click();
        await moveTo(page, phase, true);
        const textResult = await planBadge.innerText();
        const planResult = textResult.split(" - ")[0].trim();
        const phaseResult = textResult.split(" - ")[1].trim();
        console.log(
          `*** textResult--> ${textResult}, *** plan--> ${planResult}, *** phase-->  ${phaseResult}`,
        );
        const expectedText = `${planResult}&${phaseResult}`;
        const receivedText = `${plan}&${phase}`;
        console.log("*** compare change", expectedText, receivedText);
        expect(textInitial === textResult).toBeFalsy();
        const close = page.locator(locators.entityCard.closeCard).first();
        await close.click();
      } 
      
      //-This actions is not allowed for non admin users
      else if (index === 2) {
        const close = page.locator(locators.entityCard.closeCard).first();
        await close.click();
        await page.locator(locators.sidebar.program).click();
        await page.locator("svg.three-dots-icon").click(); // Click the three dots icon
        await page
          .locator(
            'button.btn.btn-simple.btn-with-icon.link.link--icon span:has-text("Edit")',
          )
          .click(); // Click the Edit span
        await Promise.all([
          page.waitForResponse(
            (response) =>
              response.url().includes("/api/graphql") && response.ok(),
          ),
          page
            .locator(
              'button.btn.btn-primary.font-md:has(span:text("Continue"))',
            ).click(), // Click the 'Yes' button
        ]);
        const supplierTab = page
          .locator('li[role="tab"]:has(span:text("Suppliers"))')
          .nth(1);
        await supplierTab.click(); // Click the Suppliers tab
        await filterByFieldInGrid(page, element.name, "entityName");
        await page.getByRole("checkbox", { name: "Select All Rows" }).check();
        await page.waitForTimeout(300);
        await page.getByRole("link", { name: `selected Column Menu` }).click();
        await page
          .getByText(englishKeys.home.analyze.moveBetween, { exact: true })
          .click();
        await page.getByText(given.planName, { exact: true }).last().click();
        await moveTo(page, phase, false);
      }    }    
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

/**
 * Find an entity card and wait until it is fully loaded and visible in the 
 * entity card view. The entity card view is the view that appears when you 
 * click on an entity card. It shows the entity's name and some other information.
 * 
 * @param page The page object of the page where the entity cards are located.
 * @param entityName The name of the entity to search for.
 * @param index The index of the entity card to select, starting from 0. If not
 * specified, the first entity card with the given name will be selected.
 * @param isExact If true, the entity name must match exactly. If false, the
 * entity name does not have to match exactly.
 */
async function findEntityCard(
  page: Page,
  entityName: string,
  index = 0,
  isExact = true,
) {
  const search = page.getByPlaceholder(
    englishKeys.home.components.navbar.search,
  );
  //clear the input first
  await search.fill("");
  await page.waitForTimeout(500);
  // Type company name
  await search.fill(entityName);
  await Promise.all([
    page.waitForResponse((response) =>
      response.url().endsWith("/api/entity-card/get-entity-cards"),
    ),
    search.press("Enter"),
  ]);
  const currentNameLocator = page
    .locator(".current-name", {
      has: page.getByText(entityName, { exact: isExact }),
    })
    .nth(index);
  await waitForEntitySelectedFinish(
    page,
    currentNameLocator,
    "/chart/payment-terms-opportunity/supplier",
    true,
  );
}
/**
 * Filter a grid by a field or an array of fields, and wait for the request to finish.
 * @param page Page object
 * @param field The field(s) to filter by. Can be a single string or an array of strings.
 * @param propertyName The name of the property to filter by. This is used to select the column menu.
 * @param url The URL to wait for. This can be either "adding" or "entityName". Defaults to "entityName".
 */
async function filterByFieldInGrid(
  page: Page,
  field: string | Array<string>,
  propertyName: string,
  url: "adding" | "entityName" = "entityName",
) {
  const fields = typeof field === "string" ? [field] : field;
  console.log("*** waiting for api call: " + url);
  await Promise.all([
    page.waitForResponse((response) => response.url().endsWith(`/${url}`)),
    page.getByRole("link", { name: `${propertyName} Column Menu` }).click(),
  ]);
  const searchInput = page.locator('#searchSelectFilter');
  expect(searchInput).toBeVisible()
  for (const singleField of fields) {
    await searchInput.fill(singleField);
    await page.waitForTimeout(2500);
    await page.getByLabel(singleField).first().check();
  }
  
  await page.locator('#filter-results').click();

  await page.waitForTimeout(
    process.env.E2E_ENV_NAME === "LOCAL" ? 3500 : 2000,
  );
}
  /**
   * Change the phase inside a plan.
   * @param page Playwright page.
   * @param childOld Name of the phase to be changed from.
   * @param insideEntity If true, wait for entity to be selected
   */
async function moveTo(page: Page, childOld: string, insideEntity: boolean) {
  let changeTo = given.phasesPlan.phaseName;
  if (given.phasesPlan.phaseName.trim() === childOld) {
    changeTo = given.phasesPlan.phaseName1;
  }
  console.log(
    `*** changeTo--> ${given.planName}[${changeTo}] from--> ${given.planName}[${childOld}]`,
  );
  // Wait for the target phase node to render in the move popover before clicking
  // — after selecting the plan the phase tree expands asynchronously.
  const targetPhaseNode = page.getByText(changeTo, { exact: true });
  await targetPhaseNode.waitFor({ state: "visible" });
  await targetPhaseNode.click();
  const saveBtnModal = page.locator(
    'button.btn.btn-primary.font-md:has(span:text("Yes"))',
  );
  const recalculatingInProgress = page.locator(
    "span.recalculating-in-progress",
  );
  await waitForEntitySelectedFinish(
    page,
    saveBtnModal,
    "/api/analyze/update-spend-program-configurations",
    insideEntity,
  );
  if (await recalculatingInProgress.first().isVisible()) {
    console.log("*** recalculatingInProgress is visible");
    await page.waitForSelector("span.recalculating-in-progress", {
      state: "hidden",
    }); // Wait for recalculating to disappear
    if (insideEntity) {
      await waitForEntitySelectedFinish(page, saveBtnModal, null, false);
    } else {
      await Promise.all([
        page.waitForResponse(
          (res) => res.url().includes("/api/graphql") && res.ok(),
        ),
      ]);
    }
  } else {
    console.log("*** recalculatingInProgress is not visible");
  }
}
/**
 * Waits for the entity to be selected after a move between phases.
 * @param page playwright page
 * @param currentNameLocator locator of the current phase name
 * @param url url to wait for, or null if not needed
 * @param waitForAll whether to wait for both the phase to be changed and the entity to be selected
 */
async function waitForEntitySelectedFinish(
  page: Page,
  currentNameLocator: any,
  url: string | null,
  waitForAll: boolean,
) {
  if (url) {
    console.log(`*** waiting for api call: ${url}`);
    if (waitForAll) {
      await page.waitForTimeout(1000);
      // Best-effort: the entity-card ada-bot recalc refetch can lag behind the
      // save or not fire at all depending on the card state, so it must not gate
      // the move. The authoritative signal is the update-spend-program-
      // configurations response awaited below.
      const adaBotRefetch = page
        .waitForResponse(
          (res) =>
            res.url().endsWith("/api/entity-card/entity/ada-bot/all/") &&
            res.ok(),
          { timeout: 10000 },
        )
        .catch(() => null);
      await Promise.all([
        page.waitForResponse((res) => res.url().endsWith(url) && res.ok()),
        currentNameLocator.click(),
      ]);
      await adaBotRefetch;
    } else {
      await Promise.all([
        page.waitForResponse((res) => res.url().endsWith(url) && res.ok()),
        currentNameLocator.click(),
      ]);
    }
  } else {
    // Best-effort recalc refetch — see note above; do not fail the flow if the
    // entity-card ada-bot refetch does not arrive.
    await page
      .waitForResponse(
        (res) =>
          res.url().endsWith("/api/entity-card/entity/ada-bot/all/") &&
          res.ok(),
        { timeout: 10000 },
      )
      .catch(() => null);
  }
}
