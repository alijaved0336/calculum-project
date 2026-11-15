import { Locator, Page, Response, expect } from "@playwright/test";
import { locators } from "./locators";
import { ApiWaitersUtils, GridUtils, StringUtils } from "../utils";

// API waiting
import {
  waitForFieldsDataFromApi,
  waitForFinancingGroupsFromApi,
  waitForHarmonizationGroupsFromApi,
  waitForProgramsFromApi,
  waitForProgramsPaymentTermsFromApi,
  waitForProgramsPotentialsCostFromApi,
  waitForProgramsSpendInfoFromApi,
} from "../program/utils";
import {
  changeToSpendFile,
  clickKebabMenuOption,
  waitElementVisibleAndClick,
} from "./Utils";
import Api2 from "./APi2";

type GridTabName = "Spends" | "Supplier" | "Parents";

export type ProgramSectionTabName =
  | "Overview"
  | "Supplier Prioritization"
  | "9 Boxes Financing"
  | "Waterfall"
  | "Vcard"
  | "List";

export default class ProgramUtils {
  static readonly PROGRAM_NAME_MAIN = "Main Program";

  static readonly ProgramTabName: Record<string, ProgramSectionTabName> =
    Object.freeze({
      Overview: "Overview",
      SupplierPrioritization: "Supplier Prioritization",
      NineBoxesFinancing: "9 Boxes Financing",
      Waterfall: "Waterfall",
      List: "List",
      VCard: "Vcard",
    });

  /**
   * Go to the Program section via the sidebar.
   *
   * Where the sidebar lands depends on state the caller does not control:
   * the all-programs card list when several programs exist and none is
   * selected, or a program's overview when one is already selected or the
   * spend file holds exactly one program.
   *
   * `allPrograms` makes the destination explicit instead of leaving it to
   * that state: pass `true` when the caller needs the card list (to click a
   * program card, count cards, or assert on the list UI). The default keeps
   * whatever the sidebar opened, which is what callers that pre-select a
   * program with `changeToProgram` and then work inside the program view
   * need.
   *
   * @param page {Page}
   * @param options.wait skip the programs-API wait and return immediately
   * @param options.allPrograms follow the "All Programs" breadcrumb back to
   *   the card list when the sidebar opened a program overview. Requires a
   *   spend file version with more than one program — call
   *   `ensureSpendFileVersionWithPrograms` first, since a single-program
   *   version has no card list and no breadcrumb to get back to it
   * @returns the programs API response, or null when `wait` is false
   */
  static async goToProgramSection(
    page: Page,
    options?: Partial<{
      wait: boolean | null;
      allPrograms: boolean;
    }>,
  ): Promise<Response | null> {
    const { wait = true, allPrograms = false } = options || {};

    console.log("Going to Program section...");

    if (!wait) {
      console.log("Going to Program (Click and go on) ...");

      await page.locator(locators.sidebar.program).click();

      return null;
    }

    // Clicking the sidebar item for the section the SPA is already on is inert:
    // vue-router drops a push to the current route, so no request is issued and
    // the waiter below runs until the test times out. The pipeline run of
    // 2026-09-20 lost show-all-program-hide-share this way — `page.goto("/")`
    // deep-links to the last section the user visited, so a spec that never
    // left Opportunity starts there, and the click produced no traffic at all
    // for the remaining 83s of its budget.
    //
    // Reload instead. It fires the request the waiter needs and, because
    // HomeAnalyzeProgramsPanel fetches only in `onMounted` and watches neither
    // the active spend file version nor the route, it is also what rebuilds the
    // card list against the version a preceding `changeToSpendFile` selected.
    //
    // Only the panel route itself is inert: from `/home/analyze/program_overview/…`
    // the click is a real navigation, and reloading there would keep the page on
    // the overview instead of returning to the card list, so match the path
    // exactly rather than by prefix.
    const currentPath = new URL(page.url()).pathname.replace(/\/+$/, "");
    const alreadyOnProgramsPanel = currentPath === "/home/analyze";

    console.log(
      alreadyOnProgramsPanel
        ? "Already on the programs panel, reloading to refire the programs API..."
        : "Clicking the Opportunity sidebar item...",
    );

    const [response] = await Promise.all([
      ApiWaitersUtils.waitForSpendFileVersionsAnalyzePrograms(page),
      alreadyOnProgramsPanel
        ? page.reload()
        : page.locator(locators.sidebar.program).click(),
    ]);

    if (!allPrograms) {
      return response;
    }

    // A rendered program card, not a bare `.card-v2`: `SkeletonCard` renders a
    // `.card-v2` root while the list loads and holds a Skeleton in place of the
    // title span, so the title is what tells the two apart.
    const programCardTitle = page.locator("div.card-v2 span.text-font-600-24");

    // The overview route is reached both as
    // `/analyze/program_overview/<id>` and as
    // `/analyze/program_overview?selectedProgramId=<id>`, and the SPA can
    // push it *after* the sidebar click resolves. Testing the URL at a
    // single instant therefore detects only some of the cases — key off the
    // breadcrumb, which is present whenever a program view is open.
    const allProgramsBreadcrumb = page.locator(
      locators.headerMenu.programHeader.allPrograms,
    );

    // Race both destinations instead of polling the breadcrumb alone for a
    // fixed window: an overview that renders slowly used to be read as "the
    // card list is already up", and the panel drops its loading flag before it
    // decides to redirect, so its own chrome can flash for a frame on the way
    // out. Neither view appearing means the card list is unreachable for the
    // active spend file version — see ensureSpendFileVersionWithPrograms.
    await expect(
      programCardTitle.or(allProgramsBreadcrumb).first(),
      "The sidebar opened neither the program card list nor a program view",
    ).toBeVisible();

    if (!(await allProgramsBreadcrumb.isVisible())) {
      return response;
    }

    console.log("Going back to the All Programs list...");

    const [allProgramsResponse] = await Promise.all([
      page.waitForResponse(
        (response) =>
          response.url().includes("/analyze_programs") && response.ok(),
      ),
      allProgramsBreadcrumb.click(),
    ]);

    // `goToAllPrograms` clears the selected program before reopening the panel,
    // so this time the card list is the view that stays.
    await expect(programCardTitle.first()).toBeVisible();

    return allProgramsResponse;
  }

  /**
   * Select a spend file version whose program count keeps the all-programs
   * card list open.
   *
   * `HomeAnalyzeProgramsPanel` redirects to a program's overview as soon as the
   * active spend file version holds a single program, so the card list only
   * exists from two programs upwards. The active spend file version is
   * server-side user state that any other test can change, so a test that
   * needs the card list has to select a version itself rather than trust
   * whatever ran before it.
   *
   * @param page {Page}
   * @param minPrograms programs the version has to hold — two by default,
   *   the threshold the panel itself applies
   * @returns the "<name> (Ver. <n>)" label of the selected version, or null
   *   when no spend file version of the active company holds that many
   *   programs
   */
  static async ensureSpendFileVersionWithPrograms(
    page: Page,
    minPrograms = 2,
  ): Promise<string | null> {
    const api = await Api2.getInstance(page);
    await api.checkAuthentication();

    const label = (version: any) =>
      `${version.spendFileName} (Ver. ${version.version})`;

    const countPrograms = async (version: any): Promise<number> => {
      const response = await api.doGet(
        `/api/spend_file_versions/${version.versionUUid}/analyze_programs`,
      );

      if (!response.ok()) {
        console.log(
          `Skipping '${label(version)}': programs request answered ${response.status()}.`,
        );

        return 0;
      }

      return ((await response.json())["hydra:member"] ?? []).length;
    };

    const versions = api.getCurrentCompanySpendFileVersions();
    const activeVersion = versions.find(
      (version) => version.versionUUid === api.activeSpendFileVersionUUid,
    );

    // The active version first and on its own: when it already qualifies there
    // is nothing to switch and the other versions cost no requests at all.
    if (activeVersion && (await countPrograms(activeVersion)) >= minPrograms) {
      console.log(`Active SpendFileVersion '${label(activeVersion)}' is used.`);

      return label(activeVersion);
    }

    const otherVersions = versions.filter(
      (version) => version.versionUUid !== api.activeSpendFileVersionUUid,
    );

    // One request per version, all in flight together: a company carries tens
    // of spend file versions and a sequential scan would spend more of the test
    // budget on the precondition than on the assertions.
    const counts = await Promise.all(otherVersions.map(countPrograms));
    const index = counts.findIndex((count) => count >= minPrograms);

    if (index === -1) {
      console.log(
        `No SpendFileVersion of company '${api.activeCompanyName}' holds ${minPrograms} programs.`,
      );

      return null;
    }

    const selected = label(otherVersions[index]);
    console.log(
      `SpendFileVersion '${selected}' holds ${counts[index]} programs.`,
    );

    await changeToSpendFile(page, selected);

    return selected;
  }

  /**
   * Go to program and click on edit or show
   *
   * @param page
   * @param action
   * @param name
   * @param wait
   * @returns
   */
  static async goToProgramNameAndAction(
    page: Page,
    options?: Partial<{
      action: "show" | "edit";
      name: string;
      wait: boolean;
      isFromHome: boolean;
    }>,
  ): Promise<Response | null | undefined> {
    // Set default options
    const {
      action = "show",
      name = "",
      wait = true,
      isFromHome = true,
    } = options || {};

    let response: Response | null = null;

    console.log(
      `Going to ${StringUtils.isEmpty(name) ? "first" : name} program ...`,
    );

    // Edit
    if (action === "edit") console.log("... with action: 'edit'...");
    // Show - Default
    else console.log("... with action: 'show'...");

    if (isFromHome) {
      console.log("(Program Utils) Going to Program section from Home...");

      [response] = await Promise.all([
        ApiWaitersUtils.waitForSpendFileVersionsAnalyzePrograms(page),
        this.goToProgramSection(page),
      ]);
    }

    let programsCount = 0;

    if (response !== null && response.ok()) {
      const body = await response?.json();
      programsCount = body["hydra:member"].length;
    }

    if (programsCount === 0) {
      console.log("(Program Utils) No programs found...");

      return null;
    } else if (programsCount === 1) {
      console.log(
        "(Program Utils) Only one program found, user should be on program overview page...",
      );
      return;
    }

    console.log("(Program Utils) Programs count: " + programsCount);

    console.log("Checking if user is already on program overview page...");

    const url = page.url();

    console.log("User is on URL: " + url);

    if (url.includes("analyze/program_overview?selectedProgramId=")) {
      console.log(
        "(Program Utils) User is already on program overview page...",
      );

      return;
    }

    let cardLoc: Locator;

    // If program name not provided, select first program
    if (!name) {
      console.log("Program name not provided, selecting first program...");

      cardLoc = page.locator(".card-v2").first();
    } else {
      console.log("Program name provided, going to program with name: " + name);

      // Use exact match for program name
      cardLoc = page.locator(".card-v2").filter({
        has: page.locator("span").getByText(name, { exact: true }),
      });

      // If there are no programs with this name then return null
      if (!(await cardLoc.isVisible())) {
        return null;
      }

      // If there are multiple programs with similar name then select the first
      if ((await cardLoc.count()) > 1) {
        cardLoc = cardLoc.first();
      }
    }

    /**
     * Show
     */
    if (action === "show") {
      console.log("Show program: " + name);

      if (!wait) {
        await cardLoc.locator('button:has-text("SHOW")').click();

        return null;
      }

      [response] = await Promise.all([
        waitForFinancingGroupsFromApi(page),
        waitForProgramsFromApi(page),
        waitForHarmonizationGroupsFromApi(page),
        waitForProgramsSpendInfoFromApi(page),
        waitForProgramsPotentialsCostFromApi(page),
        waitForProgramsPaymentTermsFromApi(page),
        cardLoc.getByRole("button", { name: "SHOW" }).click(),
      ]);

      console.log(
        `Successfully moved to Program: '${name}' with action:'${action}'!`,
      );

      return response;
    } else if (action === "edit") {
      /**
       * Edit
       */
      console.log("Edit program: " + name);

      // Go to program Edit page and wait for APIs
      [response] = await Promise.all([
        page.waitForResponse(
          (response) =>
            response.url().includes("/api/graphql") && response.ok(),
        ),
        waitForFinancingGroupsFromApi(page),
        waitForFieldsDataFromApi(page),
        waitForHarmonizationGroupsFromApi(page),
        cardLoc.getByRole("button", { name: "Edit" }).click(), // Click on edit button
      ]);

      // Assert user is Program Edit page
      await expect(page).toHaveURL(/.*\/analyze\/step\/4/);

      console.log(
        `Successfully moved to Program: '${name}' with action:'${action}'!`,
      );

      return response;
    }

    console.log("Error: Action not supported");

    return null;
  }

  /**
   * Go to first program available.
   * Similar behavior is implemented in goToProgramNameAndAction.
   *
   * @param page
   * @param options
   */
  static async goToProgramFirstAvailable(
    page: Page,
    options?: Partial<{
      wait: boolean | null;
    }>,
  ): Promise<void> {
    const { wait = true } = options || {};

    await ProgramUtils.goToProgramSection(page, {
      wait,
    });

    await page
      .locator("#container-main-id div")
      .getByRole("button", {
        name: "Show",
      })
      .first()
      .click();
  }

  /**
   * Open the List tab of the Program section.
   *
   * `subtab` selects the grid level once the tab is open. Pass null to leave
   * the level alone: the view restores the one the user looked at last, and a
   * caller that asserts on that restoration must not overwrite it first.
   *
   * @param {Page} page
   * @param {{ subtab: GridTabName | null, defaultTab: GridTabName }} options
   * @returns {Promise<Response | null>} the query backing the requested level
   */
  static async goToProgramListTab(
    page: Page,
    options?: Partial<{
      subtab: GridTabName | null;
      defaultTab: GridTabName;
    }>,
  ): Promise<Response | null> {
    const { subtab = "Parents", defaultTab = "Supplier" } = options || {};

    let response: Response | null = null;

    const listTabLoc = page.locator("#program-header-menu").getByText("List", {
      exact: true,
    });

    await listTabLoc.waitFor({ state: "visible" });

    // Clicking "List" while it is already the active tab is a no-op:
    // HomeOpportunity.changeTab() re-assigns the same currentTab, and the tab
    // view only remounts (and refetches) when that value actually changes
    // (`:key="currentTab + keyTabsViews"`). Pairing the click with
    // waitForResponse therefore hangs the whole budget whenever the view has
    // already landed on List — the previous broad `/api/graphql && ok()`
    // waiter timed out at 60s with the grid already painted from an earlier
    // fetch. Gate on the tab's own `active` class (deterministic UI state)
    // instead of a network response that may never arrive; callers that need
    // the grid payload arm their own operation-specific waiter around this
    // call. count() (not waitFor-visible) detects the active class even while
    // a transient loading overlay obscures the header, which is what made the
    // old guard false-negative and fire the hanging no-op click.
    const activeListTab = page.locator("#program_list.active");

    if ((await activeListTab.count()) === 0) {
      await listTabLoc.click();
    }
    await expect(activeListTab).toBeVisible({ timeout: 60_000 });

    switch (subtab) {
      case "Spends":
        if (subtab !== defaultTab) {
          response = await GridUtils.goToGridSpendsTab(page);
        }

        break;

      case "Supplier":
        console.log("Going to Tab List->Suppliers...");
        if (subtab !== defaultTab) {
          response = await GridUtils.goToGridSuppliersTab(page);
        }
        break;

      case "Parents":
        if (subtab !== defaultTab) {
          response = await GridUtils.goToGridParentsTab(page);
        }

        break;
    }

    return response;
  }

  static async goToProgramWaterfallTab(
    page: Page,
    options?: Partial<{}>,
  ): Promise<Response | null> {
    console.log("Going to Waterfall tab...");

    let response: Response | null = null;

    [response] = await Promise.all([
      page.waitForResponse(
        (responsePrograms) =>
          responsePrograms.url().includes("/waterfall-chart") &&
          responsePrograms.ok(),
      ),
      page.locator(locators.headerMenu.programHeader.waterfall).click(),
    ]);

    console.log("Successfully moved to Waterfall tab!");

    return response;
  }

  /**
   * Select a program in dropdown given its name
   *
   * @param page {Page}
   * @param programName {string}
   */
  static async changeToProgram(
    page: Page,
    programName: string,
    options?: Partial<{ wait: boolean }>,
  ) {
    const { wait = true } = options || {};

    await page.waitForTimeout(5000);

    console.log(`Changing to Program: '${programName}'...`);

    // Click on dropdown when it is visible.
    // Other sections (Compare, Plan, …) render their own `.custom-dropdown`
    // controls — e.g. `active-metrics-dropdown` / `active-options-dropdown` on
    // Compare — so a bare `.custom-dropdown` selector violates strict mode
    // when changeToProgram runs from those pages. Pin the program dropdown by
    // its dedicated data-testid set in HomeProgramStatusDropdown.vue.
    const programDropdownSelector = '[data-testid="active-program-dropdown"]';
    let currentProgram;

    if (await page.locator(programDropdownSelector).first().isVisible()) {
      currentProgram = await page
        .locator(programDropdownSelector)
        .first()
        .textContent();
    } else {
      console.log("Only one Program, nothing to change...");
      return;
    }

    console.log(`current Program: '${currentProgram}'...`);
    console.log(`Program to change: '${programName}'...`);

    if (currentProgram == programName) {
      console.log(`Already Program: '${programName}'.`);
      return;
    }

    const element = page.locator(programDropdownSelector);
    await expect(element).toBeVisible();

    await waitElementVisibleAndClick(page, programDropdownSelector);

    /*var programResponse: Response = null
    var paymentTermsOpportunityResponse : Response = null*/

    let paymentTermsOpportunityResponseResponse: Response | null = null;
    let programResponseResponse: Response | null = null;

    if (wait) {
      const promiseClick = page
        .locator(".custom-dropdown-items")
        .getByText(programName, { exact: true })
        .click();

      if (page.url().endsWith("/home/home-dashboard")) {
        // *********** Home ***********
        console.log("Current Section: 'HOME'.");
        await Promise.all([
          page.waitForResponse(
            (response) =>
              response.url().match(/.*\/api\/manage\/stats_agreed/) !== null,
          ),
          page.waitForResponse(
            (response) =>
              response.url().match(/.*\/api\/manage\/stats_info/) !== null,
          ),
          page.waitForResponse(
            (response) =>
              response.url().match(/.*\/api\/analyze\/programs\/spend-info/) !==
              null,
          ),
          page.waitForResponse(
            (response) =>
              response.url().match(/.*\/api\/plans\/plans-summary/) !== null,
          ),
          page.waitForResponse(
            (response) =>
              response
                .url()
                .match(/.*\/api\/manage\/stats_suppliers_negotiated/) !== null,
          ),
          promiseClick,
        ]);
      } else if (page.url().endsWith("/home/categorize")) {
        // *********** Analyze ***********
        console.log("Current Section: 'ANALYZE'.");
        let [programResponse] = await Promise.all([
          page.waitForResponse(
            (response) =>
              response
                .url()
                .match(
                  /.*\/api\/entity-card\/spend-program-configuration\/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}\/chart\/payment-terms-opportunity/,
                ) !== null,
          ),
          promiseClick,
        ]);

        programResponseResponse = programResponse;
      } else if (page.url().endsWith("/home/entity_card")) {
        console.log("Current Section: 'ENTITY-CARD'.");
        let [programResponse] = await Promise.all([
          page.waitForResponse(
            (response) =>
              response
                .url()
                .match(
                  /.*\/api\/entity-card\/spend-program-configuration\/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}\/chart\/payment-terms-opportunity/,
                ) !== null,
          ),
          page.waitForResponse(
            (response) =>
              response
                .url()
                .match(
                  /.*\/api\/analyze\/get_spends_by_program_and_provider/,
                ) !== null,
          ),
          page.waitForResponse(
            (response) =>
              response
                .url()
                .match(/.*\/api\/entity-card\/entity\/ada-bot\/all/) !== null,
          ),
          promiseClick,
        ]);

        programResponseResponse = programResponse;
      } else {
        // *********** Oportunity **********
        console.log("Current Section: 'OPPORTUNITY'.");
        await promiseClick;
      }

      console.log(`Changed to Program: '${programName}'.`);

      return {
        programResponseResponse,
        paymentTermsOpportunityResponseResponse,
      };
    } else {
      await waitElementVisibleAndClick(
        page,
        `.custom-dropdown-items >> text=${programName}`,
      );

      return null;
    }
  }

  /**
   * Wait until the active spend file version has at least one program that is
   * neither recalculating nor pending recalculation.
   *
   * This is a *data* precondition of every test that creates a plan, not a
   * rendering one. `HomePlanAllPlans` only renders the clickable New Plan tile
   * (`div.new-plan.cursor-pointer`, with the `@click` that opens the wizard)
   * when at least one program of the active spend file version has both
   * `recalculationInProgress` and `pendingRecalculation` false
   * (HomePlanAllPlans.vue:9-17 and its
   * `hasOneAtleastOneProgramNotRecalculatedAndNotPending` computed). While
   * every program is busy it renders a disabled placeholder with no click
   * handler and prints "Plans are currently unavailable as the program
   * recalculates. Please check back later." instead of the plan list.
   *
   * Without this wait the test fails 30s later on an opaque
   * "element(s) not found" for the New Plan locator, which reads like a broken
   * selector while the application is in fact behaving as designed. Program
   * recalculations are asynchronous and shared across the whole environment —
   * a deploy that marks spend file versions pending, or another suite touching
   * the same file, leaves the program busy for minutes — so poll the same
   * endpoint the view consumes instead of guessing with a fixed sleep.
   *
   * @param page {Page}
   * @param spendFileNameVersion spend file the test switched to, in the
   *   dropdown format `changeToSpendFile` takes (`"<name> (Ver. <n>)"`).
   * @param options.timeout total budget for the poll, in milliseconds.
   * @param options.pollIntervalMs delay between polls, in milliseconds.
   * @returns {Promise<void>}
   */
  static async waitForProgramReadyToPlan(
    page: Page,
    spendFileNameVersion: string,
    options?: Partial<{ timeout: number; pollIntervalMs: number }>,
  ): Promise<void> {
    const { timeout = 300000, pollIntervalMs = 10000 } = options ?? {};
    const api = await Api2.getInstance(page);
    const READY = "ready";
    // Last version resolved inside the poll; kept only for the log line.
    let spendFileVersionUuid = "-";

    await expect
      .poll(
        async () => {
          // Resolve the active version on every poll instead of trusting
          // `api.activeSpendFileVersionUUid`, so the wait is tied to the
          // spend file the test asked for and not to whatever the cached
          // instance last saw. Until 2026-09-15 `changeToSpendFile` read
          // WhoAmI before the PATCH that persists the switch had landed: the
          // pipeline run of plan-with-one-phase cached
          // PageroFull_20230308_2.xlsx right after switching to
          // Pagero_PlanTests.xlsx. `changeToSpendFile` now waits for the
          // switch, but this waiter has to stay correct for any caller that
          // reaches it another way.
          const whoAmI = await api.doGet("/api/user/who_am_i");
          if (!whoAmI.ok()) {
            return `who_am_i responded ${whoAmI.status()}`;
          }

          let activeVersion: Record<string, any> | null = null;
          try {
            activeVersion = (await whoAmI.json()).activeSpendFileVersion ?? null;
          } catch {
            return "who_am_i returned a non-JSON body";
          }

          const activeNameVersion = `${activeVersion?.name} (Ver. ${activeVersion?.version})`;
          if (activeNameVersion !== spendFileNameVersion) {
            return `active spend file version is '${activeNameVersion}', expected '${spendFileNameVersion}'`;
          }
          spendFileVersionUuid = StringUtils.removeIRI(activeVersion!["@id"]);

          const response = await api.doGet(
            `/api/spend_file_versions/${spendFileVersionUuid}/analyze_programs`,
          );

          if (!response.ok()) {
            return `analyze_programs responded ${response.status()}`;
          }

          // A transient 5xx serves an HTML error page that fails JSON.parse:
          // report it as "not ready yet" and keep polling, the same way
          // Api2.waitSpendFileReady does.
          let programs: Array<Record<string, any>> = [];
          try {
            programs = (await response.json())["hydra:member"] ?? [];
          } catch {
            return "analyze_programs returned a non-JSON body";
          }

          if (programs.length === 0) {
            return "the spend file version has no program";
          }

          const isReady = programs.some(
            (program) =>
              program.recalculationInProgress === false &&
              program.pendingRecalculation === false,
          );

          return isReady
            ? READY
            : `every program is still recalculating -> ${programs
                .map(
                  (program) =>
                    `'${program.name}'(recalculationInProgress=${program.recalculationInProgress}, ` +
                    `pendingRecalculation=${program.pendingRecalculation}, ` +
                    `calculationStatus=${program.calculationStatus})`,
                )
                .join(", ")}`;
        },
        {
          message:
            "The Plan section disables its New Plan tile while every program of the spend file version " +
            `'${spendFileNameVersion}' is recalculating. This is an environment/data precondition: the program ` +
            "has to finish recalculating before a plan can be created from the UI.",
          timeout,
          intervals: [pollIntervalMs],
        },
      )
      .toBe(READY);

    console.log(
      `*** Program ready to plan on spend file version: ${spendFileVersionUuid}`,
    );
  }

  /**
   * Go to program edition.
   *
   * @param page {Page}
   * @returns {Promise<void>}
   */
  static async goToProgramEditFromProgramOverview(
    page: Page,
  ): Promise<Response> {
    const [response] = await Promise.all([
      ApiWaitersUtils.waitForGraphqlResponse(page),
      // ? - Add rest of endpoints here
      clickKebabMenuOption(page, "Edit"),
    ]);

    return response;
  }

  // *** Assertions ***

  static async assertProgramTabIsVisible(
    page: Page,
    tabName: ProgramSectionTabName,
  ): Promise<void> {
    const tabLocator = await page
      .locator("#program-header-menu")
      .locator(".btn")
      .filter({ hasText: tabName });

    await expect(tabLocator).toBeVisible();
  }

  // *** END Assertions ***
}
