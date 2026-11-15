/**
 * @fileoverview
 * E2E tests for the Global Filters "Currency" and "9 Boxes" functionality.
 *
 * Split into two serial suites because they need different data:
 * - Currency runs on Company_SF + Pagero_ExclusionGroups (verifies that a USD
 *   currency filter excludes specific entities from the supplier list).
 * - The 9-box "apply" tests run on Company-Test-SCF + PageroEspecialRegulatorys,
 *   which has SCF / Vcard / Financing 9-box data (the default metric there is
 *   Financial). They assert the selected 9-box metric returns entities after the
 *   filter is applied (rather than checking a hard-coded entity name, which broke
 *   whenever the fixture data changed).
 *
 * Test tags:
 * - @global-filters-s82
 * - @tc-11670
 * - @tc-11666
 * - @tc-13087
 */

import test, { expect, Page } from "@playwright/test";
import {
  changeToSpendFile,
  dismissWelcomeVideoModal,
  ensureCompany_SFLogin,
  ensureCompanyTestSCFLogin,
  ensureDefaultLogin,
} from "../utils/Utils";
import { locators } from "../utils/locators";
import { GlobalFiltersUtils } from "../utils";
import englishKeys from "@ada/design-system/locales/languages/en.json";
import {
  safePromiseAll,
  waitForApiResponse,
  waitForMultipleApiResponses,
  logOperation,
  safeOperation,
  ensurePageActive,
  waitForElementVisible,
  retryOperation,
} from "../utils/PlaywrightTestHelpers";

/**
 * Labels of the 9-box metric options, as rendered by NineBoxesCF's
 * `getOptionsAvailable()`. "SCF (Provider)" is the Financing metric (value
 * `financing`, endpoint get-nine-boxes-financial-data) and is distinct from the
 * plain "SCF" option (value `scf9Box`).
 */
const TERM_EXTENSION_METRIC = englishKeys.global.termExtension;
const FINANCING_METRIC = englishKeys.global.scfProvider;

const given = {
  spendfile: "Pagero_ExclusionGroups.xlsx (Ver. 1)",
  company: "Company_SF",
  program: "Main Program",
  entities: [{ name: "2N Telekomunikace A.S." }, { name: "Axtone S.A." }],
  globalFilter: {
    currency: {
      checkboxField: "USD",
      title: "Invoice Currencies",
      category: "Spend Volume & Payment Terms",
      name: "currencyCode",
    },
    nineBoxes: {
      termExtension: {
        checkboxField: "Check All",
        title: englishKeys.global.globalFilters.box,
        category: "Opportunity",
        name: "box",
      },
      vcard: {
        checkboxField: "Check All",
        title: englishKeys.global.globalFilters.vCardBox,
        category: "Opportunity",
        name: "vCardBox",
      },
      financing: {
        checkboxField: "Check All",
        title: englishKeys.global.globalFilters.financialBox,
        category: "Opportunity",
        name: "financialBox",
      },
      financingScf: {
        checkboxField: "Check All",
        title: englishKeys.global.globalFilters.scfBox,
        category: "Opportunity",
        name: "scfBox",
      },
    },
  },
};

// The 9-box tests use the SCF test account, whose default company
// (Company-Test-SCF) + this spend file carry SCF / Vcard / Financing 9-box data.
const givenScf = {
  spendfile: "PageroEspecialRegulatorys.xlsx (Ver. 1)",
};

test.describe
  .serial("The Global filters for Currency work @global-filters-s82 @tc-11670 ", () => {
  let page: Page;
  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();
    await safeOperation(
      page,
      async () => {
        await ensureCompany_SFLogin(page);
        await changeToSpendFile(page, given.spendfile);
        logOperation("Test setup completed - logged in and spend file changed");
      },
      "Test setup - login and change spend file",
    );
  });

  test("Currency apply global filter @tc-11670", async () => {
    await ensurePageActive(page);

    logOperation("Starting currency filter test");
    await GlobalFiltersUtils.clearAllFiltersFromNavbar(page);
    await GlobalFiltersUtils.openModal(page);
    await GlobalFiltersUtils.openCategoryThenField(
      page,
      {
        categoryName: given.globalFilter.currency.category,
        fieldName: given.globalFilter.currency.title,
      },
      given.globalFilter.currency.name,
    );

    // Applying the filter re-queries the program data. Arm the wait for the
    // GraphQL response carrying the filtered supplier edges *before* clicking
    // "show results": the data refresh happens on filter apply, not when the
    // program List view is opened (that click triggers no GraphQL in this UI).
    //
    // The SPA inlines the active global filter in the query text
    // (graphqlUtils buildGlobalFilter: `globalFilter: "{\"filters\":[...]}"`),
    // so the request body is the only reliable way to tell the filtered
    // suppliers query from the unfiltered one fired by the initial view. A
    // late unfiltered response (25 edges instead of 14) was accepted here once
    // and made every "filtered out" assertion below fail.
    const suppliersResponse = page.waitForResponse(
      async (res) => {
        if (!res.url().includes("/api/graphql") || !res.ok()) return false;
        if (
          !(res.request().postData() ?? "").includes(
            given.globalFilter.currency.name,
          )
        ) {
          return false;
        }
        try {
          const body = await res.json();
          return Boolean(body?.data?.suppliers?.edges);
        } catch {
          return false;
        }
      },
      { timeout: 45000 },
    );

    await GlobalFiltersUtils.clickShowResult(
      page,
      given.globalFilter.currency.checkboxField,
      given.globalFilter.currency.title,
    );
    await waitForMomentOpportunitySidebar(page);

    const response = await (await suppliersResponse).json();
    const edges = await getEdges(page, response);
    logOperation("Currency filter supplier edges", { edgesCount: edges.length });

    // The USD currency filter must exclude the given entities at whatever level
    // the program view is showing.
    for (const element of given.entities) {
      const entityExist = edges.filter(
        (edge: any) => edge.node.entityName === element.name,
      );
      expect(
        entityExist.length,
        `Entity "${element.name}" should be filtered out by the USD currency filter`,
      ).toBe(0);
      logOperation("Entity check completed", { entityName: element.name });
    }
  });

  test.afterAll(async () => {
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

test.describe
  .serial("The Global filters for 9 Boxes work @global-filters-s82 @tc-11666-13087 ", () => {
  let page: Page;
  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();
    await ensureCompanyTestSCFLogin(page);
    await changeToSpendFile(page, givenScf.spendfile);
    await page
      .waitForSelector(".loading-modal", { state: "detached" })
      .catch(() => {});
    // Fresh SCF account lands on the "Welcome to Ada!" modal that overlays clicks.
    await dismissWelcomeVideoModal(page);
  });

  test("9 Box Financing apply global filter @tc-11666", async () => {
    logOperation("9 Box Financing apply global filter");

    await GlobalFiltersUtils.clearAllFiltersFromNavbar(page);
    await GlobalFiltersUtils.openModal(page);
    await GlobalFiltersUtils.openCategoryThenField(
      page,
      {
        categoryName: given.globalFilter.nineBoxes.financing.category,
        fieldName: given.globalFilter.nineBoxes.financing.title,
      },
      given.globalFilter.nineBoxes.financing.name,
    );
    await GlobalFiltersUtils.clickShowResult(
      page,
      given.globalFilter.nineBoxes.financing.checkboxField,
      given.globalFilter.nineBoxes.financing.title,
    );

    await waitForMomentOpportunitySidebar(page);
    // Registered together with the click, never after it: awaiting the click
    // first lets the GraphQL response land before the listener exists, and the
    // wait then times out on a view that loaded correctly.
    await safePromiseAll(
      [
        waitForApiResponse(
          page,
          "/api/graphql",
          15000,
          "Load graphql data for financing",
        ),
        page.locator(locators.program.supplierPriorization).click(),
      ],
      "Click supplier prioritization",
    );

    // The metric must be picked explicitly. NineBoxesCF.setActiveTab() opens on
    // `userStore.getLast9boxOptionVisited` and only falls back to 'financing'
    // when that preference is unset, so whichever 9-box tab the previous test
    // (or a previous run) left behind decides which endpoint the view fires.
    // Relying on the default made this test wait for
    // get-nine-boxes-financial-data while the view was serving another metric.
    const changeDropdown = page.locator("div.title-dropdown-parent");

    // Switching to Term Extension first guarantees the selection below is a
    // real transition: re-picking the metric already active leaves currentTab
    // untouched and fires no request.
    await changeDropdown.click();
    await waitForElementVisible(
      page,
      `span.text-option:has-text('${TERM_EXTENSION_METRIC}')`,
      5000,
      "Wait for term extension option",
    );
    // The switch fires the term-extension endpoint; waiting for it instead of
    // sleeping keeps the dropdown from being reopened mid-transition and stops
    // that response from still being in flight when getNineBoxEntities starts
    // listening for the financing one.
    await safePromiseAll(
      [
        waitForApiResponse(
          page,
          "/api/analyze/get-nine-boxes-terms-extension-data",
          15000,
          "Load term extension data before switching back to financing",
        ),
        page
          .locator(`span.text-option:has-text('${TERM_EXTENSION_METRIC}')`)
          .click(),
      ],
      "Click term extension option",
    );

    await changeDropdown.click();
    await waitForElementVisible(
      page,
      `span.text-option:has-text('${FINANCING_METRIC}')`,
      5000,
      "Wait for financing option",
    );
    const financingOptionLocator = page.locator(
      `span.text-option:has-text('${FINANCING_METRIC}')`,
    );

    const entities = await getNineBoxEntities(
      page,
      "Financing",
      financingOptionLocator,
    );
    logOperation("9 Box Financing entities", { count: entities.length });
    expect(entities.length).toBeGreaterThan(0);
  });

  test("9 Box Term extension apply global filter @tc-11666", async () => {
    logOperation("9 Box Term extension apply global filter");
    await GlobalFiltersUtils.clearAllFiltersFromNavbar(page);
    await GlobalFiltersUtils.openModal(page);
    await GlobalFiltersUtils.openCategoryThenField(
      page,
      {
        categoryName: given.globalFilter.nineBoxes.termExtension.category,
        fieldName: given.globalFilter.nineBoxes.termExtension.title,
      },
      given.globalFilter.nineBoxes.termExtension.name,
    );
    await GlobalFiltersUtils.clickShowResult(
      page,
      given.globalFilter.nineBoxes.termExtension.checkboxField,
      given.globalFilter.nineBoxes.termExtension.title,
    );

    await waitForMomentOpportunitySidebar(page);
    await safePromiseAll(
      [
        waitForApiResponse(
          page,
          "/api/graphql",
          15000,
          "Load graphql data for term extension",
        ),
        page.locator(locators.program.supplierPriorization).click(),
      ],
      "Click supplier prioritization",
    );

    const changeDropdown = page.locator("div.title-dropdown-parent");
    await changeDropdown.click();
    await waitForElementVisible(
      page,
      "span.text-option:has-text('Term Extension')",
      5000,
      "Wait for term extension option",
    );
    const termExtensionOptionLocator = page.locator(
      "span.text-option:has-text('Term Extension')",
    );

    const entities = await getNineBoxEntities(
      page,
      "Term ext",
      termExtensionOptionLocator,
    );
    logOperation("9 Box Term extension entities", { count: entities.length });
    expect(entities.length).toBeGreaterThan(0);
  });

  test("9 Box SCF apply global filter @tc-13087 ", async () => {
    logOperation("9 Box SCF apply global filter");
    await GlobalFiltersUtils.clearAllFiltersFromNavbar(page);
    await GlobalFiltersUtils.openModal(page);
    await GlobalFiltersUtils.openCategoryThenField(
      page,
      {
        categoryName: given.globalFilter.nineBoxes.financingScf.category,
        fieldName: given.globalFilter.nineBoxes.financingScf.title,
      },
      given.globalFilter.nineBoxes.financingScf.name,
    );
    await GlobalFiltersUtils.clickShowResult(
      page,
      given.globalFilter.nineBoxes.financingScf.checkboxField,
      given.globalFilter.nineBoxes.financingScf.title,
      false,
      given.globalFilter.nineBoxes.financingScf.name,
    );
    await waitForMomentOpportunitySidebar(page);
    await safePromiseAll(
      [
        waitForApiResponse(
          page,
          "/api/graphql",
          15000,
          "Load graphql data for scf",
        ),
        page.locator(locators.program.supplierPriorization).click(),
      ],
      "Click supplier prioritization",
    );

    const changeDropdown = page.locator("div.title-dropdown-parent");
    await changeDropdown.click();
    await waitForElementVisible(
      page,
      "span.text-option",
      5000,
      "Wait for SCF option",
    );
    // Exact "SCF" — the dropdown also has "SCF (Provider)" (the financial metric).
    const scfOptionLocator = page
      .locator("span.text-option")
      .filter({ hasText: /^SCF$/ });

    const entities = await getNineBoxEntities(page, "SCF", scfOptionLocator);
    logOperation("9 Box SCF entities", { count: entities.length });
    expect(entities.length).toBeGreaterThan(0);
  });

  test("9 Box Vcard apply global filter @tc-11666", async () => {
    logOperation("9 Box Vcard apply global filter");
    await GlobalFiltersUtils.clearAllFiltersFromNavbar(page);
    await GlobalFiltersUtils.openModal(page);
    await GlobalFiltersUtils.openCategoryThenField(
      page,
      {
        categoryName: given.globalFilter.nineBoxes.vcard.category,
        fieldName: given.globalFilter.nineBoxes.vcard.title,
      },
      given.globalFilter.nineBoxes.vcard.name,
    );
    await GlobalFiltersUtils.clickShowResult(
      page,
      given.globalFilter.nineBoxes.vcard.checkboxField,
      given.globalFilter.nineBoxes.vcard.title,
      false,
      given.globalFilter.nineBoxes.vcard.name,
    );

    await waitForMomentOpportunitySidebar(page);
    await safePromiseAll(
      [
        waitForApiResponse(
          page,
          "/api/graphql",
          15000,
          "Load graphql data for vcard",
        ),
        page.locator(locators.program.supplierPriorization).click(),
      ],
      "Click supplier prioritization",
    );

    const changeDropdown = page.locator("div.title-dropdown-parent");
    await changeDropdown.click();
    await waitForElementVisible(
      page,
      "span.text-option:has-text('Vcard')",
      5000,
      "Wait for vcard option",
    );
    const vCardOptionLocator = page.locator(
      "span.text-option:has-text('Vcard')",
    );

    const entities = await getNineBoxEntities(page, "Vcard", vCardOptionLocator);
    logOperation("9 Box Vcard entities", { count: entities.length });
    expect(entities.length).toBeGreaterThan(0);
  });

  test.afterAll(async () => {
    logOperation("*** After all (9 boxes)");
    await page?.context().close().catch((error) => {
      console.error(
        "afterAll: page.context().close() failed (non-critical):",
        error instanceof Error ? error.message : String(error),
      );
    });
  });
});

/**
 * Collection query each entity level sends, in the order AnalyzeLevelSelector
 * renders its tabs: spend lines, suppliers, ultimate parent. The query name is
 * what tells the three grid answers apart in the request body, since
 * ListsByChartsValue.vue builds them as `spends: collectionQueryProgramList...`
 * and they all hit the same `/api/graphql` URL.
 */
const LEVEL_COLLECTION_QUERIES = [
  "collectionQueryProgramListSpends",
  "collectionQueryProgramListSuppliers",
  "collectionQueryProgramListParents",
];

/**
 * Collection query the level currently on screen will send. Read from the tab
 * strip rather than assumed: the 9-box tests run serially on one page and only
 * the Financing and SCF ones drop to the Spend Lines level, so the level in
 * play depends on which test ran before.
 */
async function getActiveLevelCollectionQuery(page: Page): Promise<string> {
  const levelTabs = page.locator("span.custom_cursor_pointer.level-tab");
  await levelTabs.first().waitFor({ state: "visible", timeout: 10000 });
  const activeIndex = await levelTabs.evaluateAll((tabs) =>
    tabs.findIndex((tab) => tab.classList.contains("active")),
  );
  if (activeIndex < 0 || activeIndex >= LEVEL_COLLECTION_QUERIES.length) {
    throw new Error(
      `No active entity level tab found (active index ${activeIndex} against ${LEVEL_COLLECTION_QUERIES.length} known levels)`,
    );
  }
  return LEVEL_COLLECTION_QUERIES[activeIndex];
}

/**
 * Wait for a grid `/api/graphql` answer whose body is actually readable, and
 * return it already parsed.
 *
 * Selecting all the 9-box boxes re-queries the grid, and the SPA aborts the
 * in-flight query when a further re-render supersedes it. Playwright still
 * reports a `response` event for an aborted request, so a waiter matching the
 * bare URL can hand back a response whose body Chromium never stored — reading
 * it later fails with "Response body is not available for a response that was
 * navigated away from", which is what took this spec down on the pipeline even
 * after the read was moved up to right after the click. Reading the body
 * inside the predicate makes the unreadable answers simply not match, so the
 * waiter keeps listening until a complete one arrives.
 *
 * The Analyze view also keeps the three grids mounted, and
 * ListsByChartsValue.vue's `callOthersGrid` re-queries the other two whenever
 * one of them refreshes, so all of `spends`, `suppliers` and `parents` answer
 * the same select-all. Accepting whichever lands first reads the edges of a
 * level the test is not on. Match the operation on the request body, as the
 * categorize child-grid waiter does, and only then confirm the answer's shape.
 */
async function waitForReadableGridGraphql(
  page: Page,
  timeout: number,
  operationName: string,
  collectionQuery: string,
): Promise<any> {
  let parsed: any = null;
  try {
    await page.waitForResponse(
      async (response) => {
        if (!response.url().includes("/api/graphql") || !response.ok()) {
          return false;
        }
        if (!(response.request().postData() ?? "").includes(collectionQuery)) {
          return false;
        }
        const body = await response.json().catch(() => null);
        if (!body?.data) {
          return false;
        }
        const { spends, suppliers, parents } = body.data;
        if (!spends?.edges && !suppliers?.edges && !parents?.edges) {
          return false;
        }
        parsed = body;
        return true;
      },
      { timeout },
    );
  } catch (error) {
    console.error(`Error waiting for API response in ${operationName}:`, error);
    throw new Error(
      `Readable ${collectionQuery} /api/graphql response not received within timeout in ${operationName}`,
    );
  }
  return parsed;
}

async function getEdges(page: Page, response: any) {
  // Validate response structure
  if (!response || !response.data) {
    logOperation("Invalid response structure in getEdges", { response });
    throw new Error("Response does not contain data property");
  }

  const responseSpend = response?.data?.spends?.edges;
  const responseSupplier = response?.data?.suppliers?.edges;
  const responseParent = response?.data?.parents?.edges;

  const result = responseSpend ?? responseSupplier ?? responseParent;

  // Validate that we have edges
  if (!result) {
    logOperation("No edges found in response", {
      hasSpend: !!responseSpend,
      hasSupplier: !!responseSupplier,
      hasParent: !!responseParent,
      availableKeys: Object.keys(response.data),
      responseData: response.data,
    });
    throw new Error(
      "No edges found in response (neither spends, suppliers nor parents)",
    );
  }

  logOperation("Parsed response", {
    hasSpend: !!responseSpend,
    hasSupplier: !!responseSupplier,
    hasParent: !!responseParent,
    edgesCount: result.length,
  });
  return result;
}

/**
 * Navigate the supplier-prioritization 9-box for the given metric, select all
 * boxes, and return the entity names present in the resulting GraphQL edges.
 */
async function getNineBoxEntities(
  page: Page,
  type: "Term ext" | "Vcard" | "Financing" | "SCF",
  clickDispatch: any,
): Promise<string[]> {
  logOperation("Loading nine-box entities", { type });

  // Determine typeForWait and changeTab based on type
  const typeConfig: {
    typeForWait: "terms-extension" | "vcard" | "financial" | "scf";
    changeTab: boolean;
  } = (() => {
    switch (type) {
      case "Term ext":
        return { typeForWait: "terms-extension", changeTab: false };
      case "Vcard":
        return { typeForWait: "vcard", changeTab: false };
      case "Financing":
        return { typeForWait: "financial", changeTab: true };
      case "SCF":
        return { typeForWait: "scf", changeTab: true };
      default:
        throw new Error(`Unknown type: ${type}`);
    }
  })();

  const { typeForWait, changeTab } = typeConfig;

  await safePromiseAll(
    [
      waitForMultipleApiResponses(
        page,
        [`/api/analyze/get-nine-boxes-${typeForWait}-data`, "/api/graphql"],
        15000,
        `Wait for ${typeForWait} data and graphql`,
      ),
      clickDispatch.click(),
    ],
    `Click ${type} dispatch`,
  );

  //-Only for Financing / SCF: drop to the Spend Lines level. The per-type data
  // may already be loaded and not re-fire on the tab switch, so this is
  // best-effort — the select-all step below re-queries the edges regardless.
  if (changeTab) {
    logOperation("Changing to Spend Lines tab", { type });
    const spendLineTab = page.locator(
      'span.custom_cursor_pointer.level-tab:has-text("Spend Lines")',
    );
    await Promise.all([
      waitForApiResponse(
        page,
        "/api/graphql",
        15000,
        "Wait for graphql after spend lines tab change",
      ).catch(() => logOperation("No graphql after tab change, continuing")),
      spendLineTab
        .click()
        .catch(() => logOperation("Spend Lines tab click skipped")),
    ]);
  }
  // Wait for element to be visible instead of fixed timeout
  const openSelectAll = page.locator(
    "div.open-options.cursor-pointer:has(svg.chevrons)",
  );
  await waitForElementVisible(
    page,
    "div.open-options.cursor-pointer:has(svg.chevrons)",
    10000,
    "Wait for open select all button",
  );
  const optionsPopup = page.locator("#user-options-popup");
  // Kendo adds this class to the animation container once the enter
  // transition has finished (Popup.js, ANIMATION_CONTAINER_SHOWN).
  const settledOptionsPopup = page.locator(
    ".k-animation-container-shown #user-options-popup",
  );
  const selectAll = page.locator("#user-options-popup > span:nth-child(1)");
  // The options live in a Kendo Popup that slides its content in. While that
  // transition runs the point under "Select All" belongs to its sibling
  // "Reset Selection" (or to the popup container), so a plain click keeps
  // failing its hit-target check, and a view re-render can unmount the popup
  // between retries ("element was detached from the DOM") — on the slower
  // pipeline environment this looped until the test timed out. Click only
  // once the popup is settled, and redo the open-then-click when the popup
  // vanished under us; the GraphQL waiter is registered before the first
  // open so the response cannot be missed by a retry.
  // The select-all re-queries the grid, and `callOthersGrid` makes the other
  // two levels answer alongside it, so the waiter has to be told which of the
  // three answers belongs to the level under test.
  const collectionQuery = await getActiveLevelCollectionQuery(page);
  logOperation("Grid level under test", { type, collectionQuery });
  const [response] = await safePromiseAll(
    [
      waitForReadableGridGraphql(
        page,
        30000,
        "Load graphql data after select all",
        collectionQuery,
      ),
      retryOperation(
        async () => {
          if (!(await optionsPopup.isVisible().catch(() => false))) {
            await openSelectAll.click();
          }
          await settledOptionsPopup.waitFor({
            state: "visible",
            timeout: 5000,
          });
          await selectAll.click({ timeout: 5000 });
        },
        3, // maxRetries
        500, // baseDelay
        "Click select all",
      ),
    ],
    "Click select all",
  );
  // `waitForReadableGridGraphql` already returns the parsed body, read while
  // the response was still complete, so there is nothing left to read here.

  // Wait for response to be processed instead of fixed timeout
  await waitForApiResponse(
    page,
    "/api/graphql",
    10000,
    "Wait for graphql response processing",
  ).catch(() => {
    logOperation("Graphql response timeout, continuing anyway");
  });

  const edges = await getEdges(page, response);

  // Validate edges before iterating
  if (!edges || !Array.isArray(edges)) {
    logOperation("Invalid edges structure", { edges });
    throw new Error("Edges is not a valid array");
  }

  const entityNames = edges.map((element: any) => element.node.entityName);
  logOperation("Nine-box entities loaded", {
    type,
    count: entityNames.length,
  });
  return entityNames;
}

async function waitForMomentOpportunitySidebar(page: Page) {
  await safePromiseAll(
    [
      waitForApiResponse(
        page,
        "/api/statistics/get-chart-data",
        15000,
        "Load chart data for opportunity sidebar",
      ),
      page.locator(locators.sidebar.program).click(),
    ],
    "Click program sidebar",
  );

  // GlobalFilterSessionBanner (US-17561) renders inside #header-calculum and
  // overlays the Opportunity tab strip, so it swallows the clicks on
  // `a#ninebox_cf` that follow. It only appears once the restored filter is
  // known, which is after the filter steps above — dismissing it earlier, at
  // clearAllFiltersFromNavbar time, is too soon to help here. "keep" because
  // the filter under test has already been applied at this point.
  await GlobalFiltersUtils.dismissSessionBannerIfPresent(page, "keep");
}
