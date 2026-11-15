import {createI18n} from "vue-i18n";

// Import constants
import {apiNamesResponses} from "./apiVariablesNames";

import {Browser, BrowserContext, expect, Locator, Page,} from "@playwright/test";

import {locators} from "./locators";
import {defaultLocale, messages} from "@ada/design-system/locales/index";
import Api2, {IprocessedResponse} from "./APi2";

import {
  waitForCountryRatingFromApi,
  waitForDetailFinancialMetricsFromApi,
  waitForIndustryRatingFromApi,
} from "../entityCard/utils";

import {AnalyzeUtils, GlobalFiltersUtils, isNullOrUndefined, ProgramUtils,} from "../utils";
import StringUtils from "./StringUtils";
import * as kendoChartRelated from "../utils/kendoChartRelated";
// Types
import {BigNumberThreeCols} from "../types";
import englishKeys from "@ada/design-system/locales/languages/en.json";

/*** Consts ***/

export const ENTITY_TYPE = {
  SUPPLIER: "supplier",
  PARENT: "parent",
  SPEND_LINE: "spendLine",
};

export const NEGOTIATION_STATUS = {
  NEGOTIATED: "negotiated",
  AGREED_NOT_EXTENDED: "Agreed (Not Extended)",
  AGREED_EXTENDED: "Agreed (Extended)",
};

export const HTTP_POST_RESULT_OK = 201;
export const HTTP_DELETE_RESULT_OK = 204;

export const DEFAULT_COMPANY_NAME = "Company Test";

export const DEFAULT_SPEND_FILE_NAME = "Pagero.xlsx";

export const ENTITY_LEVEL = {
  SPEND_LINES: 0,
  SUPPLIERS: 1,
  ULTIMATE_PARENT: 2,
} as const;

export const ENTITY_LEVEL_TAB = {
  SPEND_LINES: "Spend Lines",
  SUPPLIERS: "Suppliers",
  ULTIMATE_PARENT: "Parents",
} as const;

export const CREDIT_RATING_OPTIONS = [
  "AAA",
  "AA+",
  "AA",
  "AA-",
  "A+",
  "A",
  "A-",
  "BBB+",
  "BBB",
  "BBB-",
  "BB+",
  "BB",
  "BB-",
  "B+",
  "BB-",
  "CCC+",
  "CCC",
  "CCC-",
  "CC",
  "C",
  "D",
];

const entitySupplierNotesAPI = apiNamesResponses.entitySupplierNotes;
const addRecentAPI = apiNamesResponses.addRecent;
const noteDetails1API = apiNamesResponses.noteDetails1;
const noteDetails2API = apiNamesResponses.noteDetails2;
const programsAPI = apiNamesResponses.programs;
const notesNotificationsReadAPI = apiNamesResponses.notesNotificationsRead;
const characteristicsAPI = apiNamesResponses.characteristics;
const analyzeProgramsAPI = apiNamesResponses.analyzePrograms;
const creditScoreAPI = apiNamesResponses.creditScore;
const spendsAPI = apiNamesResponses.spends;
const spendParsedCompaniesAPI = apiNamesResponses.spendParsedCompanies;
const getSpendProgramConfigsByProviderAPI =
  apiNamesResponses.getSpendProgramConfigsByProvider;
const spendNegotiationAPI = apiNamesResponses.spendNegotiation;
const potentialCashNegotiationAPI = apiNamesResponses.potentialCashNegotiation;
const spendAPI = apiNamesResponses.spend;
const chartPotentialCashNegotiationAPI =
  apiNamesResponses.chartPotentialCashNegotiation;
const chartSpendNegotiationAPI = apiNamesResponses.chartSpendNegotiation;
const dataDepthRatingAPI = apiNamesResponses.dataDepthRating;
const harmonizationGroupsAPI = apiNamesResponses.harmonizationGroups;
const chartPaymentTermsOpportunitySpendAPI =
  apiNamesResponses.chartPaymentTermsOpportunitySpend;
const financingGroupsAPI = apiNamesResponses.financingGroups;
const adaBotAllAPI = apiNamesResponses.adaBotAll;

/*** END Consts ***/

/**
 * Going backwards: from bytestream, to percent-encoding, to original string.
 *
 * @param str
 * @returns
 */
export function b64DecodeUnicode(str: string) {
  return decodeURIComponent(
    atob(str)
      .split("")
      .map((c) => {
        return "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2);
      })
      .join(""),
  );
}

/**
 * Changes the active company to the specified one
 *
 * @param page - The Playwright page object.
 * @param companyName - The name of the company to change to.
 * @throws If the #company element is not found.
 */
export async function changeToCompany(page: Page, companyName: string) {
  console.log(`Changing to Company: '${companyName}'...`);

  const api = await Api2.getInstance(page);

  // If the company is already selected, do nothing
  if (companyName === api.activeCompanyName) return;

  // try {
  //   expect(page.locator("user-topbar >> label:has-text=('Company')"));
  // } catch (error) {
  //   throw new Error("Not found #company");
  // }

  // // Ensure we're on the home dashboard page where the dropdown exists
  // if (!page.url().includes("/home-dashboard")) {
  //   console.log("** Not on home dashboard, navigating to it first...");
  //   await goToHomeSection(page, 'changeToCompany');
  // }

  // // Wait for the new custom dropdown to be enabled with a longer timeout
  // await page.waitForSelector(`${locators.navbar.companyDropdown.container}:not([disabled])`, {
  //   timeout: 30000
  // });

  // Click on the dropdown to open it
  await page.locator(locators.navbar.companyDropdown.container).click();

  // Wait for dropdown options to be visible
  await page.waitForSelector(locators.navbar.companyDropdown.options, {
    state: "visible",
    timeout: 10000,
  });

  // Find and click the option with the specified company name
  const companyOption = page
    .locator(locators.navbar.companyDropdown.item)
    .filter({
      has: page.locator(`span:has-text("${companyName}")`),
    });

  await expect(companyOption).toBeVisible({timeout: 10000});

  await Promise.all([
    api.processAuthenticationEventFromBrowser(page, false),
    companyOption.click(),
  ]);
}

/**
 * Change active currency
 * @param page - The Playwright page object.
 * @param currency - The code of the currency to change to.
 */
export async function changeActiveCurrency(page: Page, currency: string) {
  console.log("changing active currency to: ", currency);

  // Ensure we're on the home dashboard page where the dropdown exists
  if (!page.url().includes("/home-dashboard")) {
    console.log("** Not on home dashboard, navigating to it first...");
    await goToHomeSection(page, "changeActiveCurrency");
  }
  // Get current currency from the dropdown
  const actualCurrency = await page
    .locator("#currency-dropdown-navbar .currency-selected-prefix")
    .textContent();

  if (actualCurrency != currency) {
    // Click on the currency dropdown to open it
    await page.locator(locators.navbar.currencyDropdown.container).click();
    await page.waitForTimeout(1000);

    await Promise.all([
      page.waitForResponse(
        (response) =>
          response
            .url()
            .includes("/api/externals-apis/currency-layer/convert") &&
          response.ok(),
      ),
      await page
        .locator(
          `${locators.navbar.currencyDropdown.options}:has-text('${currency}')`,
        )
        .first()
        .click(),
    ]);
    await page.waitForTimeout(1000);
  }
}

/*** Spend file */
/**
 * Select especified company spend file
 *
 * @param {Page} page
 * @param {string} spendName
 * @returns
 */
export async function changeToSpendFile(page: Page, spendName: string) {
  console.log(`** Changing to SpendFile: '${spendName}'...`);

  const api = await Api2.getInstance(page);

  // console.log(
  //   "** api.activeSpendFileVersionNameVersion: ",
  //   api,
  // );

  // If the spend file is already selected, do nothing
  if (spendName === api.activeSpendFileVersionNameVersion) return;

  // try {
  //   expect(page.locator(locators.navbar.spendFileDropdown.label));
  // } catch (error) {
  //   throw new Error("Not found #selectedSpendFileVersion");
  // }

  // Ensure we're on the home dashboard page where the dropdown exists
  // if (!page.url().includes("/home-dashboard")) {
  //   console.log("** Not on home dashboard, navigating to it first...");
  //   await goToHomeSection(page, 'changeToSpendFile');
  // }

  // Wait for the new custom dropdown to be enabled with a longer timeout
  // await page.waitForSelector(`${locators.navbar.spendFileDropdown.container}:not([disabled])`, {
  //   timeout: 30000
  // });

  // Click on the dropdown to open it
  await page.locator(locators.navbar.spendFileDropdown.container).click();

  // Wait for dropdown options to be visible
  await page.waitForSelector(locators.navbar.spendFileDropdown.options, {
    state: "visible",
    timeout: 10000,
  });

  // Find and click the option with the specified spend name. The filter is a
  // substring match, so a caller that passes the bare name without "(Ver. n)"
  // matches every version of that file; the first option wins, the same one
  // the click would resolve to.
  const spendFileOption = page
    .locator(locators.navbar.spendFileDropdown.item)
    .filter({
      has: page.locator(`span:has-text("${spendName}")`),
    })
    .first();

  await expect(spendFileOption).toBeVisible({timeout: 10000});

  // The option label is built as `${name} (Ver. ${version})`
  // (useSpendFileVersionSwitcher.ts, `nameFormatted`), the same string WhoAmI
  // reports in `activeSpendFileVersionNameVersion`, so it identifies the
  // version this call is switching to.
  const selectedNameVersion = (
    await spendFileOption
      .locator(locators.navbar.spendFileDropdown.itemName)
      .innerText()
  ).trim();

  await spendFileOption.click();

  // Refresh WhoAmI until the backend reports the selected version as active.
  // The app persists the switch with `PATCH /api/users/<uuid>`
  // (`userStore.changeActualFile`), and WhoAmI only reflects it once that
  // request has committed. The refresh used to run in the same Promise.all
  // as the click, so it could read the previous version: the pipeline run of
  // plan-with-one-phase on 2026-09-15 cached PageroFull_20230308_2.xlsx right
  // after switching to Pagero_PlanTests.xlsx, and every caller reading
  // `api.activeSpendFileVersion*` afterwards got the wrong file.
  //
  // Waiting for the PATCH itself is not an option: selecting the version
  // that is already active returns early without any request
  // (useSpendFileVersionSwitcher.ts, `changeCurrentSpendFileVersion`), and a
  // fresh Api2 instance always reaches this click because the early return
  // above compares against "-".
  //
  // The poll compares against the label of the option that was clicked, not
  // against the requested name: with a bare name and a switch between two
  // versions of the same file (Ver. 1 -> Ver. 2), a substring match on the
  // name is already satisfied by the stale WhoAmI, so the poll would return
  // before the PATCH commits and leave the same race in place.
  await expect
    .poll(
      async () => {
        await api.processAuthenticationEventFromBrowser(page, false);
        return api.activeSpendFileVersionNameVersion;
      },
      {
        message: `The active spend file version never became '${selectedNameVersion}' after selecting it in the navbar`,
        timeout: 60_000,
        intervals: [1_000, 2_000, 5_000],
      },
    )
    .toBe(selectedNameVersion);

  //  await Promise.all([
  //   page.waitForResponse(
  //     (response) =>
  //       response.url().includes("/get_max_end_date_spend") &&
  //       response.ok(),
  //   )
  // ]);

  // Wait for loading spinner to be hidden
  // await assertLoadingSpinnerIsHidden(page, 9000);
  await page.waitForTimeout(5000);

  console.log(`Already Changed to SpendFile: '${selectedNameVersion}'...`);
  await page.waitForSelector(".loading-modal", {state: "detached"});

}

/**
 * Upload a spend file. If not file name is provided, it will use the default name.
 *
 * @param page {Page}
 * @param options
 */
export async function uploadSpendFile(
  page: Page,
  options?: Partial<{
    fileName: string;
    hasToLoginAsSuperAdminBeforeUpload: boolean;
    hasToLoginAsRegularUserAfterUpload: boolean;
    hasToChangeToUploadedSpendFile: boolean;
  }>,
): Promise<{
  fileName: string;
  spendFileId: string;
  spendFileVersionId: string;
  version: number;
}> {
  // Set default values
  const {
    fileName = DEFAULT_SPEND_FILE_NAME,
    hasToLoginAsSuperAdminBeforeUpload = false,
    hasToLoginAsRegularUserAfterUpload = false,
    hasToChangeToUploadedSpendFile = false,
  } = options || {};

  const api = await Api2.getInstance(page);

  console.log(
    `Uploading Spend File: '${fileName}', to company: '${api.activeCompanyName}'...`,
  );

  // Login as super admin if needed
  if (hasToLoginAsSuperAdminBeforeUpload) {
    await loginAsSuperAdmin(page);
  }

  // Upload Spend File
  const response = await api.doGet(`/api/spendfile/add-new-test-file`);
  expect(response.ok()).toBeTruthy();

  const {
    name: fileNameResponse,
    spendFile: spendFileId,
    spendFileVersion: spendFileVersionId,
    version,
  } = await response.json();

  expect(fileNameResponse).toBe(fileName); // File name from response should be the same as the one provided
  expect(spendFileId).toBeTruthy(); // Spend file id should be defined
  expect(spendFileVersionId).toBeTruthy(); // Spend file version id should be defined
  expect(version).toBeGreaterThan(0); // Spend file version should be a positive number

  let status = "";

  // Wait for spend file to be ready to use
  while (status !== "ready") {
    // Try to get spend file status
    const spvStatus = await api.doGet(
      `/api/spendfile/get-file-version/${spendFileVersionId}`,
    );
    expect(spvStatus.ok()).toBeTruthy();

    const respStatus = await spvStatus.json();

    // Add delay to wait for status

    setTimeout(() => {
      status = respStatus.status;
    }, 5000);
  }

  // Assert spend file was uploaded correctly
  expect(status).toBe("ready");

  console.log(`Successfully uploaded Spend File: '${fileName}'`);

  // Login as regular user if needed
  if (hasToLoginAsRegularUserAfterUpload) {
    await ensureDefaultLogin(page);
  }

  // Change to spend file if needed
  if (hasToChangeToUploadedSpendFile) {
    await changeToSpendFile(page, `${fileName} (Ver. ${version})`);
  }

  return {fileName, spendFileId, spendFileVersionId, version};
}

/*** END Spend file */

/*** Move to main sections */
/**
 * Go to Home section
 *
 * @param page {Page}
 */

/*** Move to main sections */
/**
 * Go to Home section
 *
 * @param page {Page}
 */
export async function goToHomeSection(page: Page, isFrom: string = "null") {
  /**
   *  Assert user is in Home
   * First always go to Home Page
   */

  console.log("Going to Home section ... from: " + isFrom);
  if (page.url().includes("/home-dashboard")) {
    console.log("** URL includes: home-dashboard");
    return;
  }

  // Post-login redirect race: B2C lands on /?signin_success=true and the
  // SPA router then pushes /home/home-dashboard. The URL check above can
  // fire mid-redirect, in which case the Promise.all below re-navigates
  // to a URL the page is already settling into and the waitForResponses
  // never see fresh requests. Give the URL up to 3s to settle before
  // committing to a full re-navigation.
  try {
    await page.waitForURL(/\/home\/home-dashboard/, { timeout: 3000 });
    console.log("** URL settled on home-dashboard");
    return;
  } catch {
    // URL still elsewhere — proceed with the explicit navigation below.
  }

  // Persisted-state deep-link: when state.json carries `ada-app` with a
  // `selectedProgram`, the SPA can route the user straight to
  // /home/analyze/program_overview (or another /home/* deep link) and
  // never visit /home-dashboard. Forcing page.goto("/home/home-dashboard")
  // in that state often gets re-redirected by the router, leaving the
  // 6 waitForResponses below hung for the full test budget (QA report
  // 2026-05-20, user-list-graphql.spec.ts:153). The SPA shell (header,
  // sidebar, user-menu) renders identically across all /home/* routes,
  // so any /home/* URL is functionally "in Home" for downstream callers.
  if (page.url().includes("/home/")) {
    console.log("** URL settled inside /home/* — accepting as in-Home");
    return;
  }

  console.log("** not yet inside home dashboard ");

  const baseURL: string | undefined = process.env.E2E_BASE_URL;
  await Promise.all([
    //program list
    page.waitForResponse(
      (response) =>
        response.url().includes("/analyze_programs") && response.ok(),
    ),
    // agreed gauge
    page.waitForResponse(
      (response) =>
        response.url().includes("manage/stats_agreed") && response.ok(),
    ),
    // info gauge
    page.waitForResponse(
      (response) =>
        response.url().includes("manage/stats_info") && response.ok(),
    ),
    // suppliers negotiate gauge
    page.waitForResponse(
      (response) =>
        response.url().includes("manage/stats_suppliers_negotiate") &&
        response.ok(),
    ),
    // spend info
    page.waitForResponse(
      (response) =>
        response.url().includes("programs/spend-info") && response.ok(),
    ),
    // plan summary
    page.waitForResponse(
      (response) =>
        response.url().includes("plans/plans-summary") && response.ok(),
    ),
    page.goto(baseURL + "/home/home-dashboard"),
  ]);

  await page.waitForTimeout(2000);
  console.log("** Inside home dashboard");
}

/**
 * Go to Compare section
 *
 * @param page {Page}
 */
export async function goToCompareSection(page: Page) {
  console.log("Going to Compare...");

  await goToHomeSection(page, "goToCompareSection");

  await expect(page.locator(locators.sidebar.compare)).toBeVisible();
  // Click text=Compare
  console.log("Click on Compare...");
  page.locator(locators.sidebar.compare).click();
}

/**
 * Go to Match section
 * @param page {Page}
 */
export async function goToMatchSection(
  page: Page,
  isFromHome: boolean = true,
  waitApi: boolean = false,
) {
  console.log("Going to Match section ...");

  if (isFromHome) {
    // SPA can deep-link to /home/analyze/program_overview (or other /home/*)
    // when persisted state carries a selectedProgram, so home-dashboard is
    // not the only valid landing route. Mirrors the aflojamiento already
    // applied to goToHomeSection (see lines 436-448).
    await expect(page).toHaveURL(/.*\/home\//);
  }

  await expect(page.locator(locators.sidebar.match)).toBeVisible();

  // Click text=Match
  if (waitApi) {
    const [
      responseMatched,
      responseTopFive,
      responseSummary,
      responseDataQuality,
      responseLocationBox,
    ] = await Promise.all([
      page.waitForResponse(
        (response) =>
          response.url().includes("/api/data-match/matched") && response.ok(),
      ),
      page.waitForResponse(
        (response) =>
          response.url().includes("/api/data-match/top-five") && response.ok(),
      ),
      page.waitForResponse(
        (response) =>
          response.url().includes("/api/data-match/summary") && response.ok(),
      ),
      page.waitForResponse(
        (response) =>
          response.url().includes("/api/data-match/data-quality") &&
          response.ok(),
      ),
      page.waitForResponse(
        (response) =>
          response.url().includes("/api/data-match/location-box") &&
          response.ok(),
      ),
      page.locator(locators.sidebar.match).click(),
    ]);
    return [
      responseMatched,
      responseTopFive,
      responseSummary,
      responseDataQuality,
      responseLocationBox,
    ];
  }
  await page.locator(locators.sidebar.match).click();
}

/**
 * Go to Analyze (Old Categorize) section
 *
 * @param page {Page}
 * @param tab
 * @param wait
 * @param subtab
 */
export async function goToAnalyzeSection(
  page: Page,
  tab: string | null = null,
  wait: boolean | null = false,
  subtab: "Spends" | "Suppliers" | "Parents" = "Parents",
  isFromHome = true,
) {
  console.log(
    "(DEPRECATED) Utils / goToAnalyzeSection. Use AnalyzeUtils.goToAnalyzeSection instead.",
  );

  return await AnalyzeUtils.goToAnalyzeSection(page, {
    tab,
    wait,
    subtab,
    isFromHome,
  });
}

/**
 * DEPRECATED - Use ProgramUtils.goToProgramSection instead
 *
 * Go to Program section.
 * Lands on whatever the sidebar opens — the all-programs card list, or a
 * program's overview when one is already selected or the spend file holds a
 * single program. Callers that need the card list specifically should call
 * `ProgramUtils.goToProgramSection(page, { allPrograms: true })`.
 *
 * @param page {Page}
 * @param isFromHome unused — kept for signature compatibility with callers
 * @param wating
 */
export async function goToProgramSection(
  page: Page,
  isFromHome = false,
  wating = true,
): Promise<void> {
  console.log("DEPRECATED - Use ProgramUtils.goToProgramSection instead");

  await ProgramUtils.goToProgramSection(page, {
    wait: wating,
  });
}

/**
 * Go to Plan section
 *
 * @param page {Page}
 */
export async function goToPlanSection(page: Page) {
  console.log("Going to Plan...");

  const [response] = await Promise.all([
    page.waitForResponse(
      // Exactly the plans collection: a bare `includes("/api/plans")` also
      // matches /api/plans/plans-summary, whose body is not a hydra
      // collection, and goToPlanNameAndAction then crashes reading
      // hydra:member off it.
      (response) =>
        new URL(response.url()).pathname === "/api/plans" && response.ok(),
    ),
    await page.locator(locators.sidebar.plan).click(),
  ]);

  return response;
}

/**
 * Go to Preferences section
 * @param page {Page}
 */
export async function goToPreferences(
  page: Page,
  isFromHome = true,
  waitForNoty = false,
) {
  console.log("Going to Preferences...");

  if (isFromHome) {
    await expect(page).toHaveURL(/.*\/home\/home-dashboard/);
  }
  if (waitForNoty) {
    await page.waitForSelector(".noty_body", {state: "attached"});
  }

  // Open User menu
  await page.locator("#user-menu").isVisible();
  await page.locator("#user-menu").click();

  // Open Preferences section
  await page.locator(locators.headerMenu.topMenu.preferences).click();
}

/**
 * Go to Program section
 *
 * @param page {Page}
 */
export async function goToAreaProgram(page: Page) {
  console.log('Going to New Area "Program"...');

  await expect(page).toHaveURL(/.*\/home\/home-dashboard/);

  await expect(page.locator(locators.sidebar.program)).toBeVisible();

  await page.locator(locators.sidebar.program).click();

  await expect(page).toHaveURL(/.*\/home\/analyze/);

  console.log('Successfully in Area "Program".');
}

/**
 * PROGRAM SECTION
 */

/**
 *
 * Go to program and click on edit or show
 *
 * @param page
 * @param action
 * @param nameProgram
 * @param wait
 */
export async function goToProgramNameAndAction(
  page: Page,
  action: string,
  nameProgram: string,
  wait = true,
  isFromHome = true,
) {
  console.log(
    "*** DEPRECATED *** goToProgramNameAndAction. Use ProgramUtils.goToProgramNameAndAction instead.",
  );

  // Parse action to lowercase
  action = action.toLowerCase();

  console.log(`Going to Program: '${nameProgram}' with action:'${action}'...`);

  if (isFromHome) {
    await goToProgramSection(page);
  }

  // Use exact match for program name
  const programCardLoc = page.locator(".card-v2").filter({
    has: page.locator("span").getByText(nameProgram, {exact: true}),
  });
  console.log(programCardLoc);
  // Assert program card is visible
  await expect(programCardLoc).toBeVisible();

  // Assert program card is unique
  await expect(programCardLoc).toHaveCount(1);

  if (action.toLocaleLowerCase() === "edit") {
    /**
     * Edit
     */
    console.log("Edit program: " + nameProgram);

    if (wait) await programCardLoc.locator('button:has-text("EDIT")').click();
    else await waitElementVisibleAndClick(page, 'button:has-text("EDIT")');

    await page.waitForTimeout(1000);

    const btnContinue = page.locator(
      'button.btn.btn-primary >> span:has-text("Continue")',
    );

    if (await btnContinue.isVisible({timeout: 2000})) {
      await btnContinue.click();
    }

    // Assert user is Program Edit page
    await expect(page).toHaveURL(/.*\/analyze\/step\/4/);
  } else {
    /**
     * Show
     */
    console.log("Show program: " + nameProgram);

    if (wait) await programCardLoc.locator('button:has-text("SHOW")').click();
    else await waitElementVisibleAndClick(page, 'button:has-text("SHOW")');
    // Assert user is in Program Overview page
    await expect(page).toHaveURL(/.*\/program_overview/);
  }

  console.log(
    `Successfully moved to Program: '${nameProgram}' with action:'${action}'!`,
  );
}

export async function changeProgramForModalEntity(
  page: Page,
  programName: string,
) {
  await page
    .locator(
      ".custom-dropdown.d-flex >> .custom-dropdown-selected.custom-dropdown-items-program",
    )
    .click();

  let [creditScoreRespData] = await Promise.all([
    page.waitForResponse(
      (response) => response.url().includes("/credit-score") && response.ok(),
    ),
    page.getByText(programName, {exact: true}).click(),
  ]);

  return creditScoreRespData;
}

/**
 * Select a program in dropdown given its name
 *
 * @param page {Page}
 * @param programName {string}
 */
export async function changeToProgram(
  page: Page,
  programName: string,
  wait: boolean = true,
) {
  console.warn("DEPRECATED - Use ProgramUtils.changeToProgram instead");

  return await ProgramUtils.changeToProgram(page, programName, {wait});
}

/**
 * Unselect a program in dropdown
 *
 * @param page {Page}
 */
export async function unselectProgram(page: Page) {
  try {
    const dropdown = page.locator(".custom-dropdown");
    await dropdown.isVisible();
    expect(dropdown);
  } catch (error) {
    throw new Error("Not found .custom-dropdown");
  }

  const dropdown = await page.$(".custom-dropdown");
  await dropdown?.selectOption(null);
  await page.waitForTimeout(5000);
}

/**
 * END - PROGRAM SECTION - END
 */

/**
 * Format a number to a string with a suffix
 *
 * @param number {number}
 * @returns {string}
 */
export function formatBigNumber(
  value: number,
  maximumFractionDigits = 1,
  minimumFractionDigits = 1,
  lang = "en-US",
): string {
  if (Math.abs(value) > 1.0e12) {
    return (
      (value / 1.0e12).toLocaleString(lang, {
        maximumFractionDigits,
        minimumFractionDigits,
      }) + "t"
    );
  }

  if (Math.abs(value) > 1.0e9) {
    return (
      (value / 1.0e9).toLocaleString(lang, {
        maximumFractionDigits,
        minimumFractionDigits,
      }) + "b"
    );
  }

  if (Math.abs(value) > 1.0e6) {
    return (
      (value / 1.0e6).toLocaleString(lang, {
        maximumFractionDigits,
        minimumFractionDigits,
      }) + "m"
    );
  }

  if (Math.abs(value) > 1.0e3) {
    return (
      (value / 1.0e3).toLocaleString(lang, {
        maximumFractionDigits,
        minimumFractionDigits,
      }) + "k"
    );
  }

  return value.toLocaleString(lang, {
    maximumFractionDigits,
    minimumFractionDigits,
  });
}

/**
 * Format a number to add the sign. e.g: 1 -> "+1", -15 -> "-15", 0 -> "0"
 * @param {number} value
 * @returns {string | null}
 */
export function formatNumberWithSign(value: number): string | null {
  // Validate
  if (isNullOrUndefined(value)) {
    return null;
  }

  // Add sign
  switch (Math.sign(value)) {
    case 1:
      return "+" + value;
    case -1:
      return value.toString();
    case 0:
      return "0";
    case -0:
      return "0";
    default:
      return null;
  }
}

/**
 * Format a true, false or null value as "yes", "no" or "N/A"
 * example: true -> "yes"
 *
 * @param {boolean | null} value
 * @return {string}
 */
export function formatBooleanOrNull(
  value: boolean | null | undefined,
  options?: Partial<{ yes: string; no: string; notAvailable: string }>,
): string {
  // Set default values
  const {yes = "Yes", no = "No", notAvailable = "N/A"} = options || {};

  if (value === true) {
    return yes;
  }

  if (value === false) {
    return no;
  }

  return notAvailable;
}

/**
 * Ensure that the default user is logged in
 *
 * @param page {Page}
 */
export async function ensureDefaultLogin(page: Page) {
  console.log(
    "Ensuring that the default user is logged in. If not, it will login automatically.",
  );
  await ensureLogin(
    page,
    process.env.E2E_AUTH_USERNAME_SINGLE!,
    process.env.E2E_AUTH_PASSWORD_SINGLE!,
    "ensureDefaultLogin",
  );
}

export async function ensureStrategiesUserLogin(page: Page) {
  await ensureLogin(
    page,
    process.env.E2E_AUTH_USERNAME_STRATEGIES!,
    process.env.E2E_AUTH_PASSWORD_STRATEGIES!,
    "ensureStrategiesUserLogin",
  );
}

/**
 * Ensure that the user admin exception2 is logged infv
 *
 * @param page {Page}
 */
export async function ensureAdminException2Login(page: Page) {
  await ensureLogin(
    page,
    process.env.E2E_AUTH_USERNAME_EXCEPTION2!,
    process.env.E2E_AUTH_PASSWORD_EXCEPTION2!,
    "ensureAdminException2Login",
  );
}

/**
 * Ensure that the superadmin user is logged in
 *
 * @param page {Page}
 */
export async function ensureCompany_SFSuperAdminLogin(page: Page) {
  await ensureLogin(
    page,
    process.env.E2E_AUTH_USERNAME_SF_SUPER!,
    process.env.E2E_AUTH_PASSWORD_SF_SUPER!,
    "ensureCompany_SFSuperAdminLogin",
  );
}

/**
 * Ensure that the user is logged in
 *
 * @param page {Page}
 */
export async function ensureCompany_SFLogin(page: Page) {
  await ensureLogin(
    page,
    process.env.E2E_AUTH_USERNAME_SF_1!,
    process.env.E2E_AUTH_PASSWORD_SF_1!,
    "ensureCompany_SFLogin",
  );
}

export async function ensureCompanyTestSCFLogin(page: Page) {
  await ensureLogin(
    page,
    process.env.E2E_AUTH_USERNAME_SCF!,
    process.env.E2E_AUTH_PASSWORD_SCF!,
    "ensureCompanyTestSCFLogin",
  );
}

/**
 * Dismiss the "Welcome to Ada!" video modal shown to accounts that have not seen
 * it yet (e.g. freshly-provisioned test users). The modal overlays the page and
 * blocks clicks (filter icon, dropdowns). No-op if the modal is not present.
 */
export async function dismissWelcomeVideoModal(page: Page) {
  const remindMeLater = page.getByRole("button", { name: "Remind Me Later" });
  try {
    await remindMeLater.waitFor({ state: "visible", timeout: 5000 });
  } catch {
    return; // modal not shown for this account/run
  }
  console.log("Dismissing the 'Welcome to Ada!' video modal ...");
  await remindMeLater.click();
  await remindMeLater.waitFor({ state: "hidden", timeout: 10000 }).catch(() => {});
}

/**
 * Ensure that the admin user is logged in
 *
 * @param page {Page}
 */
export async function ensureAdminLogin(page: Page) {
  await ensureLogin(
    page,
    process.env.E2E_AUTH_USERNAME_ADMIN!,
    process.env.E2E_AUTH_PASSWORD_ADMIN!,
    "ensureAdminLogin",
  );
}

/**
 * Ensure that the strategies user is logged in
 *
 * @param page {Page}
 */
export async function ensureSuperAdminLogin(page: Page) {
  await ensureLogin(
    page,
    process.env.E2E_AUTH_USERNAME_SUPER_ADMIN!,
    process.env.E2E_AUTH_PASSWORD_SUPER_ADMIN!,
    "ensureSuperAdminLogin",
  );
}

export async function loginAsAdmin(page: Page) {
  await ensureLogin(
    page,
    process.env.E2E_AUTH_USERNAME_ADMIN!,
    process.env.E2E_AUTH_PASSWORD_ADMIN!,
    "loginAsAdmin",
  );
}

export async function loginAsAdminException1(page: Page) {
  await ensureLogin(
    page,
    process.env.E2E_AUTH_USERNAME_EXCEPTION1!,
    process.env.E2E_AUTH_PASSWORD_EXCEPTION1!,
    "loginAsAdminException1",
  );
}

export async function loginAsAdminException2(page: Page) {
  await ensureLogin(
    page,
    process.env.E2E_AUTH_USERNAME_EXCEPTION2!,
    process.env.E2E_AUTH_PASSWORD_EXCEPTION2!,
    "loginAsAdminException2",
  );
}

/**
 * Login as Super Admin
 *
 * @param page {Page}
 */
export async function loginAsSuperAdmin(page: Page) {
  await ensureLogin(
    page,
    process.env.E2E_AUTH_USERNAME_SUPER_ADMIN!,
    process.env.E2E_AUTH_PASSWORD_SUPER_ADMIN!,
    "loginAsSuperAdmin",
  );
}

export async function loginByUser(
  page: Page,
  userEmail: string,
  password: string,
) {
  console.log(`Performing Login with User: '${userEmail}'...`);
  process.env.E2E_AUTH_CURRENT_USER_EMAIL = userEmail;
  process.env.E2E_AUTH_CURRENT_USER_PASSWORD = password;

  const api = await Api2.getInstance(page);

  // Fail fast if the B2C sign-in form isn't on screen. ensureLogin
  // sometimes routes here based on a stale `/api/session/info` reply
  // (transient 5xx returns null) even though the user is already
  // authenticated — without this guard `page.fill` blocks for the full
  // 120s test timeout. 20s is enough for the B2C redirect chain on
  // dev/test under load. If still no form, re-check session: if the
  // expected user is in fact logged in, treat this as a no-op login.
  try {
    await page.waitForSelector('input[name="Email Address"]', {
      state: "visible",
      timeout: 20000,
    });
  } catch {
    const sessionEmail = await getIsValidSessionUser(page);
    if (sessionEmail === userEmail) {
      console.log(
        `[loginByUser] Sign-in form not present and session already valid for ${userEmail}; skipping form submission`,
      );
      return;
    }
    throw new Error(
      `[loginByUser] B2C sign-in form not visible after 20s (url=${page.url()}, sessionEmail=${sessionEmail})`,
    );
  }

  await page.fill(
    'input[name="Email Address"]',
    process.env.E2E_AUTH_CURRENT_USER_EMAIL,
  );
  await page.fill(
    'input[id="password"]',
    process.env.E2E_AUTH_CURRENT_USER_PASSWORD,
  );

  console.log("authenticating...");

  // Register the post-login response waiters BEFORE the click resolves. Doing
  // the click first and only THEN awaiting processAuthenticationEventFromBrowser
  // (the previous form) races the B2C redirect + app bootstrap: when
  // /api/users/<uuid> came back before waitForResponse had attached its
  // listener, the wait missed the event and timed out at 30s. On dev this hit
  // roughly half of strategies-user logins, surfacing as a beforeEach failure
  // in processAuthenticationEventFromBrowser (APi2.ts:300). global-setup already
  // pairs the click and the waiter in a single Promise.all for exactly this
  // reason — mirror it here so the listener is live when the response arrives.
  await Promise.all([
    api.processAuthenticationEventFromBrowser(page, true),
    page.click('button[id="next"]'),
  ]);
  console.log(`'Login with User:'${userEmail}' successfully.`);
}

export async function logout(page: Page) {
  console.log("Performing Logout...");

  let email = await getIsValidSessionUser(page);
  if (!email) {
    console.log("There is no user logged in. Please Login indeed first.");
    return;
  }
  // now the user super admin has the same view, he can switch to the admin console in the Preferences
  await page.locator("#user-menu").click();

  // Click text=Logout
  await page.locator("#dropdown_user a").filter({hasText: "Logout"}).click();

  // Block until the B2C logout chain fully settles. Clicking Logout kicks
  // off: app → /api/auth/logout → B2C /oauth2/v2.0/logout → hidden
  // front-channel iframes to every registered logout URL → post-logout
  // redirect → /authorize → B2C sign-in form. Starting the next login
  // before this finishes races PKCE code_verifier rotation and Policy_Flow
  // session-cookie writes, surfacing intermittently as AADB2C90085
  // invalid_grant or "Missing Policy_Flow in Session". The visible
  // Email Address input on the B2C sign-in form is the single observable
  // signal that every preceding hop has completed.
  await page
    .waitForSelector('input[name="Email Address"]', {
      state: "visible",
      timeout: 30000,
    })
    .catch(() => {
      // Swallow: a subset of callers skip straight to a new loginByUser
      // which will auto-wait on the same selector itself. Don't fail the
      // logout on its own — just ensure we waited as long as possible.
    });

  // Form is DOM-visible but B2C still loads hidden iframes for
  // CSRF/anti-forgery tokens. Give the network a beat to settle so the
  // next form submission carries fresh tokens instead of a stale/half-
  // written set — the root cause of AADB2C90085 invalid_grant under load.
  await page
    .waitForLoadState("networkidle", { timeout: 10000 })
    .catch(() => {
      // networkidle can be noisy with long-polling analytics; proceed
      // regardless. The selector wait above is the primary gate.
    });

  console.log("Logout Successfully.");
}

/**
 * Wait for element to be visible and click it.
 * It will select the first element that matches the locator by default.
 *
 * @param page {Page}
 * @param locator {string}
 */
export async function waitElementVisibleAndClick(
  page: Page,
  locator: string | Locator,
  selectFirst = true,
): Promise<void> {
  let locatorCast: Locator | null = null;
  let found: Locator | null = null;

  // Change type of variable locator to Locator
  if (typeof locator === "string") {
    locatorCast = page.locator(`${locator}`);
  } else {
    locatorCast = locator;
  }

  // Select the first element that matches the locator
  if (selectFirst) {
    found = locatorCast.first();
    // This will wait for the element to be visible
    await expect(found).toBeVisible();
  }
  await locatorCast.first().click();
}

/**
 * ? - Move to program utils
 * Deletes a program given its name.
 *
 * @param {Page} page - The page object representing the browser page.
 * @return {Promise<void>} A promise that resolves once the program is deleted.
 */
export async function deleteProgram(
  page: Page,
  options?: Partial<{ name: string }>,
) {
  console.log("*** DEPRECATED: Use ProgramUtils.deleteProgram() instead. ***");

  // Init
  const {name = ""} = options || {};

  const [response] = await Promise.all([
    page.waitForResponse(
      (responsePlans) =>
        responsePlans.url().includes("/analyze_programs") && responsePlans.ok(),
    ),
    goToProgramSection(page),
  ]);

  const resultPrograms = (await response.json())["hydra:totalItems"];

  if (resultPrograms.length === 0) {
    console.log("No programs available to delete");

    return;
  }

  // If there are programs to delete
  // ... and no name is provided, then delete the last created one
  if (!name) {
    console.log("Deleting last created program...");

    await page
      .locator(
        "div.card.card--program >> .btn.btn-simple.btn-simple--icon.link.link--icon.collapsed ",
      )
      .first()
      .click();
    await page
      .locator('.analyze-program-card-options >> span:has-text("Delete")')
      .click();
    await page
      .locator(
        '.calculum-modal-content.shadow >> .btn.btn-primary:has-text("Delete")',
      )
      .click();

    console.log("Last created program was deleted.");
  }
}

export async function deleteSpecificPlan(page: Page, planName: string) {
  console.log("Go to all plans");
  await Promise.all([
    page.waitForResponse(
      (responsePlans) =>
        responsePlans.url().includes("/plans?program.spendFileVersion.uuid") &&
        responsePlans.ok(),
    ),
    page.locator(locators.sidebar.plan).click(),
  ]);

  let currentPlanToDeleteCount = await page
    .locator("div.card-v2:has-text('" + planName + "')")
    .count();
  if (currentPlanToDeleteCount > 0) {
    console.log("click on option inside the card");
    await page
      .locator("div.card-v2:has-text('" + planName + "') >> svg")
      .click();
    console.log("click on delete");
    await page.locator('.card-menu >> span:has-text("Delete")').click();

    await Promise.all([
      page.waitForResponse(
        (res: any) =>
          res.url().includes("/api/plans") &&
          res.status() === HTTP_DELETE_RESULT_OK,
      ),
      page.locator('.options-menu-card >> span:has-text("Yes")').click(),
    ]);
    console.log("delete plan completed : ", planName);
  } else {
    console.log("no plan available to delete, was already deleted");
  }
}

export async function deletePlan(page: Page) {
  console.log("delete plan");
  const [response] = await Promise.all([
    page.waitForResponse(
      (responsePlans) =>
        responsePlans.url().includes("/plans?program.spendFileVersion.uuid") &&
        responsePlans.ok(),
    ),
    page.locator('ul.user-sidebar >> span:has-text("Plan")').click(),
  ]);

  const resultResponse = JSON.parse(await response.text())["hydra:totalItems"];

  //Changed to > 1, because if only exists a program, the user will be redirect automatically to the unique plan
  if (resultResponse > 1) {
    console.log("has plans");
    await page.locator("div.card-v2 >> .icon-svg__button-18").first().click();
    await page.locator('div.card-v2 >> span:has-text("Delete")').click();
    await page.locator('div.card-v2 >> span:has-text("Yes")').click();
    console.log("delete plan completed");
  } else {
    console.log("no plans available to delete");
  }
}

export async function checkParentList(page: Page) {
  const repeatedProviderTRs = page.locator(".k-master-row");
  const providerCount = await repeatedProviderTRs.count();
  console.log("Rows: " + providerCount);
  await expect(providerCount).toBeGreaterThanOrEqual(1);
}

export function generateRandomString(length: number) {
  let result = "";
  const characters =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const charactersLength = characters.length;
  let counter = 0;
  while (counter < length) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
    counter += 1;
  }
  return result;
}

export async function clearTextFieldAndPutValue(
  page: Page,
  locator: string,
  value: string,
) {
  await page.locator(locator).isVisible();
  const element = page.locator(locator);
  await element.selectText();
  await element.type(value);
}

export async function clearTextFieldAndPutValueLocator(
  locator: Locator,
  value: string,
) {
  await locator.isVisible();
  await locator.selectText();
  await locator.type(value);
}

export function upperCaseFirstCharacter(value: string) {
  const valueCapitalize = value.charAt(0).toUpperCase() + value.slice(1);
  return valueCapitalize;
}

export async function createPhase(
  page: Page,
  phaseName = "defaultPhase",
  level = "supplier",
  selectAll = true,
) {
  await page.locator(locators.plan.newPhase).click();
  await page.waitForResponse(
    (response: any) => response.url().includes("/api/graphql") && response.ok(),
  );
  await page.waitForTimeout(5000);

  await page.locator("input.form-control.change-name").fill(phaseName);
  await page
    .locator("select[name='selectPeriod']")
    .selectOption({label: "1 Week"});

  let levelSelected = "";
  if (level === "parent") {
    levelSelected = "Parents";
  } else if (level === "supplier") {
    levelSelected = "Suppliers";
  } else {
    levelSelected = "Spend Lines";
  }

  await page.locator(`span.k-link:has-text('${levelSelected}')`).click();

  await page.waitForTimeout(7000);

  if (selectAll) {
    console.log("select all");
    await page
      .locator(
        " .k-table-th.k-header.k-grid-header-sticky.k-filterable >> input.k-checkbox.k-checkbox-md.k-rounded-md",
      )
      .first()
      .click();
  } else {
    console.log("select the first entity");
    await page.locator(".k-checkbox.k-checkbox-md.k-rounded-md").nth(1).click();
  }

  await page.waitForTimeout(6000);

  await Promise.all([
    page.waitForResponse(
      (res: any) => res.url().includes("/api/plan_phases") && res.ok(),
    ),
    page.locator(locators.plan.phasePopupSave).click(),
  ]);
  await page.waitForTimeout(10000); //To guarantee the Phase 1 creation
}

export async function createPlanCF(
  page: Page,
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
  }

  // The Plan section has two entry points to the wizard, and neither exists
  // the moment the view mounts. On All Plans (HomePlanAllPlans.vue)
  // `allPrograms` starts empty, so the disabled `div.new-plan` placeholder —
  // no `cursor-pointer`, no @click — renders first and is swapped for the
  // clickable tile only once /analyze_programs answers. With a plan open
  // (HomePlanV2) the entry point is "New Plan" inside the
  // `#plan-options-menu` dropdown (PlanOptions.vue). The old code counted the
  // tile without waiting: right after the previous test cancelled the
  // wizard, the count sampled the placeholder and took the menu branch on the
  // All Plans page, where the first "New Plan" span is the placeholder's own
  // label. The click did nothing, the form never opened and the fill below
  // timed out. Wait for one of the two entry points before picking a branch.
  const newPlanTile = page.locator(".new-plan.cursor-pointer.mr-4").first();
  const planOptionsMenu = page.locator("#plan-options-menu");
  await expect(newPlanTile.or(planOptionsMenu).first()).toBeVisible({
    timeout: 30_000,
  });

  if (await newPlanTile.isVisible()) {
    await newPlanTile.click();
  } else {
    await planOptionsMenu.click();
    await Promise.all([
      page.waitForResponse(
        (res: any) => res.url().includes("/analyze_programs") && res.ok(),
      ),
      page
        .locator("#options-menu")
        .getByText("New Plan", { exact: true })
        .click(),
    ]);
  }

  // Web-first gate on the form instead of a fixed sleep: if the click above
  // is ever swallowed again, this fails in 30s with a clear signal.
  const planNameInput = page.locator("input#period2");
  await expect(planNameInput).toBeVisible({ timeout: 30_000 });
  await planNameInput.fill(planName);
  // The `selectPeriodForPlan` id is passed to the <Dropdown> component, which
  // renders it as the CSS class `custom-dropdown-selectPeriodForPlan` on its
  // clickable root (Dropdown.vue) — NOT as an id on the `.col-12` wrapper.
  // The deployed build wraps it in a plain `<div class="col-12">`, so scoping
  // to `div#selectPeriodForPlan.col-12` matched nothing and the click hung to
  // the timeout. Target the dropdown trigger directly (same as
  // plan-two-phases.spec.ts); the class is rendered in every build.
  const periodDropdown = page.locator(".custom-dropdown-selectPeriodForPlan");
  await expect(periodDropdown).toBeVisible({ timeout: 30_000 });
  await periodDropdown.click();
  await page.locator('span.text-option[title="1 Year"]').click();
  /*.locator("select[name='selectPeriod']")
    .selectOption({ value: "365" });*/

  if (
    !isNullOrUndefined(programSelected) &&
    !StringUtils.isEmpty(programSelected)
  ) {
    await page
      .locator("select#selectProgram")
      .selectOption("CF " + programSelected);
    await page.waitForTimeout(3000);
    await page.locator("select#selectPeriod").last().selectOption({index: 9});
  }

  await Promise.all([
    page.waitForResponse(
      (res: any) => res.url().includes("/api/plans") && res.ok(),
    ),
    page.locator(".btn.btn-primary:has-text('SAVE')").click(),
  ]);
}

/**
 * Zoom out at 50%
 */
export async function zoomIn50(page: Page) {
  console.log("Zoom in at:50%");

  await page.evaluate(() => {
    (document.body.style as any).zoom = "50%"; // as any to avoid type error
  });
}

const i18n = createI18n({
  messages,
  locale: defaultLocale,
  fallbackLocale: defaultLocale,
  legacy: false,
  globalInjection: true,
});

export const translate = i18n.global;

/**
 * Entity Card
 */

/**
 * Go to Entity Card section
 *
 * @param page {Page}
 * @param isFromHome
 */
export async function goToEntityCard(page: Page, isFromHome = true) {
  console.log("Going to Entity-Card...");

  if (isFromHome) {
    // Assert URL is /home/home-dashboard
    await expect(page).toHaveURL(/.*\/home\/home-dashboard/);
  }

  // Click on Entity Card section
  await page.locator(locators.sidebar.entities).click();

  // Wait for URL to be /home/entity_card
  await page.waitForURL("**/home/entity_card");

  // Assert URL is /home/entity_card
  await expect(page).toHaveURL(/.*\/home\/entity_card/);

  console.log('Successfully in Area "Entity-Card".');
}

export async function findEntityCard(
  page: Page,
  entityName: string,
  index = 0,
  isAwait = false,
  isExact = true,
  show = true,
) {
  const search = await page.getByPlaceholder(
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
  if (show) {
    if (isAwait) {
      await Promise.all([
        page.waitForResponse(
          (res: any) => res.url().includes("/spends") && res.ok(),
        ),
        page
          .locator(".current-name", {
            has: page.getByText(entityName, {exact: isExact}),
          })
          .nth(index)
          .click(),
      ]);
    } else {
      await page
        .locator(".current-name", {
          has: page.getByText(entityName, {exact: isExact}),
        })
        .nth(index)
        .click();
    }
  }
}

/**
 * Go to Entity Card given an entity name.
 *
 * @param page {Page}
 * @param entityName {string}
 * @param index {number}
 * @param wait {boolean}
 * @param entityName {string}
 * @param exact {boolean}
 */
export async function goToEntityCardEntity(
  page: Page,
  entityName: string,
  index: number = 0,
  wait: boolean = true,
  exact = true,
) {
  // Ensure we're on the home dashboard page where the dropdown exists
  if (!page.url().includes("/home-dashboard")) {
    console.log("** Not on home dashboard, navigating to it first...");
    await goToHomeSection(page, "goToEntityCardEntity");
  }

  console.log("Moving to entity: ", entityName);
  const search = page.getByPlaceholder(
    englishKeys.home.components.navbar.search,
  );

  // Type company name
  await search.fill(entityName);

  // Register the response listener BEFORE pressing Enter so it cannot miss
  // the response that fires synchronously after the keypress. The previous
  // form put `await search.press("Enter")` inside Promise.all, which sequenced
  // Enter → listener and intermittently left waitForResponse without an event.
  //
  // The gate on /get-entity-cards is honored only when `wait` is true. In a
  // serial suite with a shared page, re-searching the already-loaded entity
  // fills the search box with the same value, so Enter does not re-fire
  // /get-entity-cards (the SPA dedupes the identical query) and an
  // unconditional waitForResponse would hang until the test timeout. When
  // `wait` is false the caller has opted out of network gating, so we rely on
  // the auto-waiting `.current-name` click below as the readiness signal.
  const entityCardsResponsePromise = wait
    ? page.waitForResponse((response) =>
        response.url().endsWith("/api/entity-card/get-entity-cards"),
      )
    : null;
  console.log("fill entitycard");
  await search.press("Enter");
  if (entityCardsResponsePromise) await entityCardsResponsePromise;

  if (wait) {
    await Promise.all([
      page.waitForResponse(
        (res: any) => res.url().includes("/spends") && res.ok(),
      ),
      page
        .locator(
          ".current-name",
          //   , {
          //   has: page.getByText(entityName, { exact: exact })
          // }
        )
        .nth(index)
        .click(),
    ]);
  } else {
    await page
      .locator(
        ".current-name",
        //   , {
        //   has: page.getByText(entityName, { exact: exact })
        // }
      )
      .nth(index)
      .click();
  }

  console.log(
    "Successfully selected the entity and the modal should be now open: ",
    entityName,
  );
}

/**
 * Goes to the entity card's first card on the given page.
 *
 * @param {Page} page - The page to navigate to the entity card's first card.
 * @return {Promise<void>} Promise that resolves once the navigation is complete.
 */
export async function goToEntityCardFirstCard(page: Page) {
  console.log("go to entity page , and select the first card");
  const [res] = await Promise.all([
    page.waitForResponse((response) =>
      response.url().endsWith("/api/entity-card/get-entity-cards"),
    ),
    goToEntityCard(page),
  ]);
  const resBody = await res.json()
  console.log(`cant of entity cards ${await resBody.length}`)
  expect(await resBody.length).toBeGreaterThan(0)
  console.log("select the first card");

  await Promise.all([
    page.waitForResponse(
      (res: any) => res.url().endsWith("/credit-score") && res.ok(),
    ),
    page.waitForResponse(
      (res: any) =>
        res.url().endsWith("/api/entity-card/entity/ada-bot/all/") && res.ok(),
    ),
    page.waitForResponse(
      (res: any) =>
        res.url().includes("/chart/payment-terms-opportunity") && res.ok(),
    ),
    page.locator("div.card-body").first().click(),
  ]);
}

export async function goToEntityCardEntityExactFull(
  page: Page,
  entityName: string,
  index: number = 0,
  exactFull: boolean = true,
  country: string | null = null,
  type: 'parent' | 'supplier' | null = null
) {
  
  // Ensure we're on the home dashboard page where the dropdown exists
  if (!page.url().includes("/home-dashboard")) {
    console.log("** Not on home dashboard, navigating to it first...");
    await goToHomeSection(page, "goToEntityCardEntity");
    // await page.waitForSelector(".loading-modal", {state: "detached"});
  }

  console.log("Moving to entity: ", entityName);
  const search = page.getByPlaceholder(
    englishKeys.home.components.navbar.search,
  );

  // Type company name
  await search.fill(entityName);
  console.log("fill entitycard");
  const [resp] = await Promise.all([
    page.waitForResponse((response) =>
      response.url().endsWith("/api/entity-card/get-entity-cards"),
    ),
    await search.press("Enter"),
  ]);

  if (exactFull && resp.ok()) {
    const resBody = await resp.json();
    const resIndex = resBody.map((entity: any, index: number) => {
      const match = entity.name.toLowerCase() === entityName.toLowerCase() && (type === null || entity.companyType.toLowerCase() === type.toLowerCase()) && (country === null || entity.countryName.toLowerCase() === country.toLowerCase());
      console.log(`index=${index}, name=${entity.name.toLowerCase()}, companyType=${entity.companyType.toLowerCase()}, match=${match}`);
      return match ? index : -1;
    }).filter((item: number) => item !== -1);
    console.log('resIndex', resIndex)
    index = resIndex[0]
    console.log('Exact index', index);
  }
  // 30s historically wasn't enough on dev under load — the QA flaky run
  // for payment-terms-details-section-api.spec.ts:62 timed out at 30s on
  // attempt 0 and passed in 29.6s on retry. 60s keeps the explicit wait
  // shorter than the 120s test budget while absorbing the dev/test p99.
  await Promise.all([
    page.waitForResponse(
      // Match on the pathname: the detail request carries a
      // ?globalFilter=<serialized> query whenever the user has an active
      // global filter, so anchoring the regex on the full URL hangs there.
      (response) =>
        /\/api\/entity-card\/entity\/[^/]+\/detail$/.test(
          new URL(response.url()).pathname,
        ),
      { timeout: 60000 },
    ),
    page.locator(".current-name").nth(index).click(),
  ]);
  console.log(
    "Successfully selected the entity and the modal should be now open: ",
    entityName,
  );
}

export async function existEntityCard(
  page: Page,
  entityName: string,
) {
  // Ensure we're on the home dashboard page where the dropdown exists
  if (!page.url().includes("/home-dashboard")) {
    console.log("** Not on home dashboard, navigating to it first...");
    await goToHomeSection(page, "goToEntityCardEntity");
  }

  console.log("Moving to entity: ", entityName);
  const search = page.getByPlaceholder(
    englishKeys.home.components.navbar.search,
  );

  // Type company name
  await search.fill(entityName);
  console.log("fill entitycard");
  const [resp] = await Promise.all([
    page.waitForResponse((response) =>
      response.url().endsWith("/api/entity-card/get-entity-cards"),
    ),
    await search.press("Enter"),
  ]);

  if (resp.ok()) {
    const resBody = await resp.json()
    return resBody.length
  }
}

/**
 * Go to Ratings & Metrics section
 *
 * @param page {Page}
 * @param options
 * @param wait
 */
export async function goToRatingsAndMetrics(
  page: Page,
  options?: Partial<{
    isFromHome: boolean;
    entityName: string;
  }>,
  wait = true,
) {
  // Set default values
  const {isFromHome = false, entityName = ""} = options || {};

  console.log("Going to Ratings & Metrics...");

  if (isFromHome) {
    await page.waitForTimeout(2500);
    await goToEntityCardEntity(page, entityName);
  }

  // Assert URL is /home/entity_card
  // await expect(page).toHaveURL(/.*\/home\/entity_card/);

  if (wait) {
    // Click on section tab and wait for all API calls to finish

    console.log("click on ratings and metrics tab");

    await Promise.all([
      waitForCountryRatingFromApi(page),
      // waitForDataDepthRatingFromApi(page),
      waitForDetailFinancialMetricsFromApi(page),
      waitForIndustryRatingFromApi(page),
      // waitForESGFromApi(page),
      page.locator("#ratings-and-metrics-tab").click(),
    ]);
  } else {
    page.locator("#ratings-and-metrics-tab").click();
  }

  console.log('Successfully moved to "Rating and Metrics" section!');
}

/**
 * Go to Ratings & Metrics section
 *
 * @param page {Page}
 */
export async function goToCorporateTree(page: Page) {
  console.log("Going to Corporate Tree...");

  // Assert URL is /home/entity_card
  await expect(page).toHaveURL(/.*\/home\/entity_card/);

  // Assert all tabs are visible

  // Opportunity
  await expect(page.locator("#opportunity-tab")).toBeVisible();

  // Corporate Tree
  await expect(
    page.locator("a").filter({hasText: "Corporate Tree"}),
  ).toBeVisible();

  // Company Details
  await expect(
    page.locator("a").filter({hasText: "Company Details"}),
  ).toBeVisible();

  // Ratings & Metrics
  await expect(
    page.locator("a").filter({hasText: "Ratings & Metrics"}),
  ).toBeVisible();

  // Click on section tab
  await page.locator("a").filter({hasText: "Corporate Tree"}).click();

  console.log('OK - Successfully moved to "Corporate Tree" section!');
}

/**
 * END Entity Card
 */

/*** Icons ***/

/**
 * Assert tooltip is visible
 *
 * @param page {Page}
 * @param options
 */
export async function assertTooltipIsVisible(
  page: Page,
  options?: Partial<{
    locator: Locator;
  }>,
) {
  // Set default values
  const {locator} = options || {};

  if (!locator) {
    await expect(page.getByTestId("tooltip-icon")).toBeVisible();
  }

  if (locator === undefined) {
    return;
  }

  await expect.soft(locator.getByTestId("tooltip-icon")).toBeVisible();
}

/*** END Icons ***/

/*** Loading Spinner ***/
/**
 * Assert loading spinner is visible
 *
 * @param page {Page}
 */
export async function assertLoadingSpinnerIsVisible(page: Page) {
  await expect(page.locator(".loading-modal")).toBeVisible();
}

/**
 * Assert loading spinner is hidden
 *
 * @param page {Page}
 * @param timeout
 */
export async function assertLoadingSpinnerIsHidden(
  page: Page,
  // for local timeout = 50000
  timeout = Number(process.env.E2E_CUSTOM_TIME_OUT ?? "30000"),
) {
  await expect(page.locator(".loading-modal")).toBeHidden({timeout});
}

/*** END Loading Spinner ***/

/**
 * Modals
 */

/**
 * Assert modal is visible
 *
 * @param page {Page}
 */
export async function assertModalIsVisible(page: Page) {
  await expect(page.getByTestId("modal")).toBeVisible();
}

/**
 * Assert modal is hidden
 *
 * @param page {Page}
 */
export async function assertModalIsHidden(page: Page) {
  await expect(page.getByTestId("modal")).toBeHidden();
}

/**
 * Assert modal has the right title
 * @param page {Page}
 * @param title {string}
 */
export async function assertModalHasRightTitle(page: Page, title: string) {
  // Wait for modal to be visible
  await assertModalIsVisible(page);
  await expect
    .soft(page.getByTestId("modal").getByText(title).first())
    .toBeVisible();
}

/**
 * Close modal and assert it is hidden
 *
 * @param page {Page}
 */
export async function closeModal(page: Page) {
  // Click on close icon
  await page
    .locator(locators.modals.customModal)
    .getByTestId("close-icon")
    .click();

  await assertModalIsHidden(page);
}

export async function closeModalInsideEntityCard(page: Page) {
  // Click on close icon
  console.log("Click on close icon modal inside entity card");
  const closeLocator = page.locator('.btn-close[data-testid="close-icon"]')
  await closeLocator.click();

  await assertModalIsHidden(page);
}

/**
 * Open Global Filters modal
 *
 * @param page {Page}
 */
export async function openGlobalFiltersModal(page: Page) {
  console.log(
    "Warning: This function is deprecated. Utils / openGlobalFiltersModal will be removed in the next release. Please use GlobalFiltersUtils.",
  );

  await GlobalFiltersUtils.openModal(page);
}

/**
 * END Modals
 */

/*** Menus */
/**
 * Inside an entity card open the kebab menu in the top right corner
 * and click on the given option
 *
 * @param page {Page}
 * @param option
 */
export async function clickKebabMenuOption(page: Page, option: string) {
  // Open kebab menu
  await page.getByTestId("kebab-menu").click();

  await page
    .locator("#options-menu")
    .getByText(option, {exact: true})
    .click();
}

/**
/**
 * Go to Kendo Tab Strip tab.
 * Normally used for entity level tabs.
 *
 * @param page {Page}
 * @param tabName
 */
export async function goToKendoTabStripTab(page: Page, tabName: string) {
  await page.locator(".k-tabstrip").getByRole("tab", {name: tabName}).click();
}

/*** END Menus ***/

/*** Dates ***/
/**
 * Get current date in format YYYY-MM-DD
 */
export function getCurrentDate(): string {
  return new Date().toISOString().split("T")[0];
}

/*** Dates ***/
/**
 * Get current date * days in format YYYY-MM-DD
 */
export function getCurrentDateSubDays(days: number): string {
  return new Date(new Date().getTime() - days * 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0];
}

/**
 * Get date from current date + days in format YYYY-MM-DD
 */
export function getDateFromCurrentDate(days: number): string {
  return new Date(new Date().getTime() + days * 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0];
}

/*** END Dates ***/

/*** Components ***/
/**
 * Show only a maximum of given items per detail category
 * @param itemsStr
 * @param maxItems {number}
 */
export function formatDetailsItems(
  itemsStr: string | null,
  maxItems: number = 2,
) {
  // Validate string
  if (!itemsStr) {
    return "N/A";
  }

  // Get the list of items from the string
  const items = itemsStr.split(", ");

  // No items to show
  if (items.length === 0) {
    return "N/A";
  } else if (items.length === 1) {
    // Show only the first item
    return items[0];
  } else if (items.length <= maxItems) {
    // Show all items
    return items.join(", ");
  } else {
    // Show only the first items and the number of remaining items (+X)
    return (
      items.slice(0, maxItems).join(", ") +
      " (+" +
      (items.length - maxItems).toString() +
      ")"
    );
  }
}

/**
 * Format number as percentage
 * example: 0.1 -> 10%
 *
 * @param {number | null} value
 * @param options
 * @return {string}
 */
export function formatPercentage(
  value?: number | null,
  options?: Partial<{
    minimumFractionDigits: number;
    lang: string;
  }>,
): string {
  // Set default values
  const {minimumFractionDigits = 2, lang = "en-US"} = options || {};

  // Validate value is defined but could be 0
  if (typeof value !== "number") {
    return "N/A";
  }

  return value.toLocaleString(lang, {
    style: "percent",
    minimumFractionDigits,
  });
}

/**
 * Assert Big Number Three Cols component is showing properly
 */
export async function assertBigNumberThreeColsIsShowingProperly(
  page: Page,
  expected: BigNumberThreeCols,
) {
  console.log(
    "DEPRECATED - This fn was moved to components/index.ts:assertBigNumberThreeColsIsShowingProperly",
  );

  // Assert card title
  await expect(
    page.locator(".card").getByRole("heading", {name: expected.cardTitle}),
  ).toBeVisible();

  // Assert big number title
  if (expected.bigNumberTitle !== "") {
    await expect
      .soft(
        page
          .locator(".card")
          .filter({
            has: page.getByRole("heading", {name: expected.cardTitle}),
          })
          .locator(".row")
          .nth(1)
          .locator("p")
          .first(),
      )
      .toHaveText(expected.bigNumberTitle);
  }

  // Assert big number value
  if (expected.bigNumberValue !== "") {
    await expect
      .soft(
        page
          .locator(".card")
          .filter({
            has: page.getByRole("heading", {name: expected.cardTitle}),
          })
          .locator(".row")
          .nth(1)
          .locator("p")
          .nth(1),
      )
      .toHaveText(expected.bigNumberValue);
  }

  // Assert number left title
  if (expected.numberLeftTitle !== "") {
    await expect
      .soft(
        page
          .locator(".card")
          .filter({
            has: page.getByRole("heading", {name: expected.cardTitle}),
          })
          .locator(".col-xl-4")
          .first()
          .locator(".col-12")
          .first(),
      )
      .toHaveText(expected.numberLeftTitle);
  }

  // Assert number left value
  if (expected.numberLeftValue !== "") {
    await expect
      .soft(
        page
          .locator(".card")
          .filter({
            has: page.getByRole("heading", {name: expected.cardTitle}),
          })
          .locator(".col-xl-4")
          .first()
          .locator(".col-12")
          .nth(1),
      )
      .toHaveText(expected.numberLeftValue);
  }

  // Assert number center title
  if (expected.numberCenterTitle !== "") {
    await expect
      .soft(
        page
          .locator(".card")
          .filter({
            has: page.getByRole("heading", {name: expected.cardTitle}),
          })
          .locator(".col-xl-4")
          .nth(1)
          .locator(".col-12")
          .first(),
      )
      .toHaveText(expected.numberCenterTitle);
  }

  // Assert number center value
  if (expected.numberCenterValue !== "") {
    await expect
      .soft(
        page
          .locator(".card")
          .filter({
            has: page.getByRole("heading", {name: expected.cardTitle}),
          })
          .locator(".col-xl-4")
          .nth(1)
          .locator(".col-12")
          .nth(1),
      )
      .toHaveText(expected.numberCenterValue);
  }

  // Assert number right title
  if (expected.numberRightTitle !== "") {
    await expect
      .soft(
        page
          .locator(".card")
          .filter({
            has: page.getByRole("heading", {name: expected.cardTitle}),
          })
          .locator(".col-xl-4")
          .nth(2)
          .locator(".col-12")
          .first(),
      )
      .toHaveText(expected.numberRightTitle);
  }

  // Assert number right value
  if (expected.numberRightValue !== "") {
    await expect
      .soft(
        page
          .locator(".card")
          .filter({
            has: page.getByRole("heading", {name: expected.cardTitle}),
          })
          .locator(".row")
          .filter({has: page.locator(".col-xl-4")})
          .locator(".col-xl-4")
          .nth(2)
          .locator(".col-12")
          .nth(1),
      )
      .toHaveText(expected.numberRightValue);
  }
}

export async function checkIfModalEntityIsOpened(page: Page) {
  let closeButton = await page
    .locator(
      ".calculum-modal-content-custom >> .col-12.d-flex.justify-content-end >> .icon-svg__button-18",
    )
    .count();
  if (closeButton > 0) {
    console.log("modal entity is opened, will close it");
    await page
      .locator(
        ".calculum-modal-content-custom >> .col-12.d-flex.justify-content-end >> .icon-svg__button-18",
      )
      .click();
  }
}


/**
 * work in progress
 * // to make it more dynamic
 * @param page
 * @param givenApiName
 * @returns
 */
export async function getAllApiDataResponsesFromModalEntityOnLoad(
  page: Page,
  givenApiName: string = "adaBotAll",
) {
  let response;
  if (givenApiName === "adaBotAll") {
    response = await Promise.all([
      page.waitForResponse(
        (res: any) =>
          res.url().includes("/api/entity-card/entity/ada-bot/all/") &&
          res.status() === 200,
      ),
      page.locator("div.card-body").first().click(),
    ]);
  }
  if (givenApiName === "chartPotentialCashNegotiation") {
    response = await Promise.all([
      page.waitForResponse(
        (response) =>
          response
            .url()
            .includes("/chart/cashflow-or-savings-overview") &&
          response.ok(),
      ),
      page.locator("div.card-body").first().click(),
    ]);
  }
  return response;
}

/**
 * Close Entity Modal dialog in Entity Card
 * @param page
 */
export async function closeEntityModal(page: Page) {
  let count = await page
    .locator(
      ".calculum-modal.higher-z-index >> .calculum-modal-content-custom.content-higher-z-index",
    )
    .count();
  if (count > 0) {
    await page.locator(locators.entityCard.closeButton).click();
  }
}

export async function generateRandomNumber(
  page: Page,
  currentValue: number,
  hasToBeLess: boolean = false,
) {
  console.log("DEPRECATED: Use NumberUtils instead.");

  // Generate a random number between 1 and 360 (inclusive)
  let randomNum;

  do {
    randomNum = Math.floor(Math.random() * 360) + 1;
  } while (
    (hasToBeLess && randomNum >= currentValue) ||
    (!hasToBeLess && randomNum === currentValue)
    );

  return randomNum;
}

export async function showTargetModal(page: Page) {
  console.log("Show target modal");
  let targetHasBeenApplied = await checkIfTargetHasBeenApplied(page);
  if (targetHasBeenApplied) {
    console.log("Case target value applied, editing target");
    let targetTerms = page.locator(".targetTerms");
    await targetTerms.locator(".pencil-svg.pencil-icon-edit-target").click();
  } else {
    console.log("Case target value not applied, adding target");
    let proposedTerms = page.locator(".proposedTerms");
    let proposedTermsValueBar = await proposedTerms
      .locator(".value-container >> span")
      .innerText();
    console.log("proposedTermsValueBar : ", proposedTermsValueBar);
    await proposedTerms.locator(".pencil-svg.pencil-icon-add-target").click();
  }

  await page.waitForSelector(".calculum-modal-content-custom", {
    state: "visible",
    timeout: 10000,
  });
}

export async function applyTargetValue(page: Page, value: string) {
  await showTargetModal(page);

  // Write new Value
  await page
    .locator(".calculum-modal-content-custom >> input.form-control.required")
    .first()
    .fill(value);

  // Select every spend line in the modal. A bare click leaves the box focused
  // but unchecked whenever the grid re-renders as it settles, and an unchecked
  // header means Save posts nothing — which surfaced as the response waiter
  // below timing out rather than as the selection failing. `check()` is
  // idempotent and the assertion fails on the real cause.
  const selectAllSpendLines = page
    .locator(
      ".calculum-modal-content-custom >> .k-column-title >> input.k-checkbox",
    )
    .first();

  await selectAllSpendLines.check();
  await expect(selectAllSpendLines).toBeChecked();

  await Promise.all([
    page.waitForResponse(
      (res: any) =>
        res.url().includes("/chart/payment-terms-opportunity") && res.ok(),
    ),
    page.waitForResponse(
      (res: any) =>
        res
          .url()
          .includes("/api/analyze/update-spend-program-configurations") &&
        res.ok(),
    ),

    // Save Btn
    page
      .locator(
        ".calculum-modal-content-custom >> .btn.btn-primary.font-md.text-capitalize",
      )
      .click(),
  ]);
}

export async function clearTargetAllValues(page: Page) {
  console.log("edit the target value for clear");
  await showTargetModal(page);
  // Select every spend line in the modal. A bare click leaves the box focused
  // but unchecked whenever the grid re-renders as it settles, and an unchecked
  // header means Save posts nothing — which surfaced as the response waiter
  // below timing out rather than as the selection failing. `check()` is
  // idempotent and the assertion fails on the real cause.
  const selectAllSpendLines = page
    .locator(
      ".calculum-modal-content-custom >> .k-column-title >> input.k-checkbox",
    )
    .first();

  await selectAllSpendLines.check();
  await expect(selectAllSpendLines).toBeChecked();
  const container = page.locator("#calculum-modal-container");
  const clearButton = container.locator('button:has-text("Clear")');
  await Promise.all([
    page.waitForResponse(
      (res: any) =>
        res.url().includes("/chart/payment-terms-opportunity") && res.ok(),
    ),
    page.waitForResponse(
      (res: any) =>
        res
          .url()
          .includes("/api/analyze/update-spend-program-configurations") &&
        res.ok(),
    ),
    // Clear Btn
    clearButton.click(),
  ]);
}

export async function checkIfTargetHasBeenApplied(page: Page) {
  // Wait for a reasonable time for the element to become visible
  const targetTermsLocator = page.locator(".targetTerms");
  const isTargetVisible = await targetTermsLocator.isVisible({timeout: 3000});
  console.log('target is visble:', isTargetVisible)
  return isTargetVisible;
}

export async function removeAllBuyerStandardGroups(page: Page) {
  await page.waitForTimeout(2000);
  console.log("If group exists, delete it");
  console.log("checking for icons trash count");
  let iconTrashCount = await page.locator(".icon-trash").count();
  console.log("icons trash count before delete: ", iconTrashCount);
  if (iconTrashCount > 0) {
    for (let i = 0; i <= iconTrashCount; i++) {
      let visible = await page.locator(".icon-trash").nth(0).isVisible();
      if (visible) {
        await page.locator(".icon-trash").nth(0).click();
        await page.waitForTimeout(1000);
        await page.locator("button.delete-group").click();
        await page.waitForTimeout(1000);
      }
    }

    console.log("saving cleaned groups");
    await Promise.all([
      page.waitForResponse(
        (res: any) => res.url().includes("update-buyer-standard") && res.ok(),
      ),
      // page.waitForResponse(
      //   (response: any) =>
      //     response.url().includes("buyer_standard_groups") && response.ok()
      // ),
      page.locator(locators.settings.buyerStandardGroup.save).click(),
    ]);
  }

  iconTrashCount = await page.locator(".icon-trash").count();
  console.log("icons trash count after delete : ", iconTrashCount);

  await page.waitForTimeout(2000);
}

export async function getValidPage(
  page: Page,
  browser: Browser,
): Promise<{ page: Page; context?: BrowserContext }> {
  try {
    await page.title(); // Probe whether the page is still open
    return {page};
  } catch {
    console.warn("Page closed, creating a new one...");
    const context = await browser.newContext();
    const newPage = await context.newPage();
    return {page: newPage, context};
  }
}

export async function getIsValidSessionUser(
  page: Page,
): Promise<string | null> {
  try {
    const baseApiUrl = process.env.E2E_BASE_URL_API + "/api/session/info";
    const response = await page.request.get(baseApiUrl);

    if (!response.ok()) return null;

    const data = await response.json();
    return data?.email ?? null;
  } catch (err) {
    console.error("Error fetching session info:", err);
    return null;
  }
}

export async function ensureLogin(
  page: Page,
  username: string,
  password: string,
  context: string,
) {
  await page.goto("/");

  if (context) console.log(`Initializing login with context: ${context}`);

  let emailInSession = await getIsValidSessionUser(page);

  // /api/session/info has a transient null pattern on dev/test (one-off
  // 5xx or in-flight session-renewal) that historically tripped this
  // path into a needless logout/login cycle. A single retry after a
  // short wait disambiguates "really logged out" from "blip".
  if (emailInSession === null) {
    await page.waitForTimeout(2000);
    emailInSession = await getIsValidSessionUser(page);
  }

  if (emailInSession === username) {
    console.log(`User ${username} is already logged in, Not needed to login`);
  } else {
    if (emailInSession) {
      console.log(`User ${emailInSession} is logged in, logout...`);
      await logout(page);
    }
    console.log(
      `Not session user logged at the moment, Starting login as ${username}`,
    );

    await loginByUser(page, username, password);
  }

  //
  console.log("Go to Home Section ...");
  await goToHomeSection(page, context);
}

/*** END Components ***/
/**
 * Closes the admin console and navigates to the home page.
 * @param {Page} page - The page to interact with.
 * @param {boolean} withReturn - If true, the function will return the user's roles.
 * @returns {Promise<UserRoles>} - The user's roles if withReturn is true.
 */
export async function closeAdminConsole(
  page: Page,
  withReturn: boolean = false,
) {
  if (withReturn) {
    const [dataRol] = await Promise.all([
      page.waitForResponse(
        (response) => response.url().includes("/api/users/") && response.ok(),
      ),
      page.goto("/"),
    ]);
    if (dataRol.ok()) {
      const dataResult = await dataRol.json();
      return dataResult;
    }
  } else {
    await Promise.all([
      page.waitForResponse(
        (response) => response.url().includes("/api/users/") && response.ok(),
      ),
      page.goto("/"),
    ]);
  }
}

/**
 * Gets the user's roles or spendfiles only use for user can be enter to admin console.
 * @param {Page} page - The page to interact with.
 * @param {type} type - The type of data to retrieve, either "roles" or "spendfiles".
 * @returns {Promise<string[]>} - The user's roles or spendfiles.
 */
export async function getUserDatas(page: Page, type: 'roles' | 'spendfiles') {
  await page.locator(locators.headerMenu.topMenu.dropDownMenu).click();
  await Promise.all([
    page.waitForResponse(
      (response) => response.url().includes("/api/companies") && response.ok(),
    ),
    page.locator(locators.headerMenu.topMenu.adminConsole).click(),
  ]);
  let res: any;
  const result = await closeAdminConsole(page, true)
  console.log(`Result is: ${result}`)
  if (type === "roles") {
    console.log("Getting roles");
    res = (result.roles as string[]);
  } else if (type === 'spendfiles') {
    console.log("Getting spendfiles");
    res = (result.activeCompany.spendFileVersions as string[]);
  }
  console.log(`${type}: ${res}`);
  return res;
}

export async function goToAdminConsoleDataController(page: Page) {
  await page.locator(locators.headerMenu.topMenu.dropDownMenu).click();
  await Promise.all([
    page.waitForResponse(
      (response: any) =>
        response.url().endsWith("/api/companies") && response.ok(),
    ),
    page.locator(locators.headerMenu.topMenu.adminConsole).click(),
  ]);
  await Promise.all([
    page.waitForResponse(
      (response: any) =>
        response.url().endsWith("/api/companies/spend_files_versions") &&
        response.ok(),
    ),
    page.locator(locators.userMenu.adminConsole.dataController).click(),
  ]);
}

export async function resetFeatures(page: Page, features: string[], checkedStatus: boolean, filter: {
  company: string,
  nameField: string
}, waitForTotalItemsFilter: boolean = false) {
  await page.locator(locators.headerMenu.topMenu.dropDownMenu).click();
  let waitForTotalItems = null
  if (waitForTotalItemsFilter) {
    const [responseCompany] = await Promise.all([
      page.waitForResponse(
        (response: any) =>
          response.url().endsWith("/api/companies") && response.ok(),
      ),
      page.locator(locators.headerMenu.topMenu.adminConsole).click(),
    ]);
    const responseBody = await responseCompany.json()
    waitForTotalItems = {
      total: responseBody['hydra:totalItems'],
      firstElement: responseBody['hydra:member'][0].name
    }
  } else {
    await Promise.all([
      page.waitForResponse(
        (response: any) =>
          response.url().endsWith("/api/companies") && response.ok(),
      ),
      page.locator(locators.headerMenu.topMenu.adminConsole).click(),
    ]);
  }
  console.log("Filtering in kendo grid")
  await kendoChartRelated.filterByField(
    page,
    filter.company,
    filter.nameField, waitForTotalItems
  );
  console.log("Toggling features");
  for (const feature of features) {
    console.log("feature : ", feature);
    console.log("checked : ", checkedStatus);
    await kendoChartRelated.toggleCheckBoxFeature(page, checkedStatus, feature, filter.company);
  }
  await saveResults(page);
}

async function saveResults(page: Page) {
  const saveButton = page.locator(locators.userMenu.adminConsole.companyView.saveChanges)
  const isSaveButtonDisabled = await saveButton.isDisabled();

  console.log("saveButton is disabled: ", isSaveButtonDisabled);
  if (isSaveButtonDisabled) {
    console.log("save button is disabled, no changes have been made");
  } else {
    await Promise.all([
      page.waitForResponse(
        (response) =>
          response.url().includes("/api/companies") && response.ok(),
      ),
      saveButton.click(),
    ]);
  }
}

export async function uploadNewSpendFile(page: Page, testInfo: any, api: Api2 | null = null, urlApi: string) {
  const result = {
    spendFileNameOriginal: '',
    spendFileVersionOriginal: 0,
    spendFileUUIDOriginal: '',
    fullName: ''
  }
  // Starting
  Api2.printStarting(testInfo)

  // Uploading an Original Spend file to be updated
  const parsingResponseOriginal = await api!.doGet(urlApi)
  const parseResponseProcessedOriginal: IprocessedResponse = {data: null, status: null, result: false, body: null}
  await Api2.processApiResponse(parsingResponseOriginal, 'Upload and Parsing SpendFile', parseResponseProcessedOriginal)

  expect(parseResponseProcessedOriginal.data).toBeDefined()
  const dataCastedOriginal = <{
    spendFile: null,
    spendFileVersion: null,
    version: null,
    name: null
  }>parseResponseProcessedOriginal.data
  expect(dataCastedOriginal.spendFile).toBeDefined()
  expect(dataCastedOriginal.spendFileVersion).toBeDefined()
  expect(dataCastedOriginal.version).toBeDefined()
  expect(dataCastedOriginal.name).toBeDefined()

  result.spendFileUUIDOriginal = dataCastedOriginal.spendFileVersion!
  result.spendFileVersionOriginal = dataCastedOriginal.version!
  result.spendFileNameOriginal = dataCastedOriginal.name!

  // Wait SpendFile is ready
  const status = await api!.waitSpendFileReady(result.spendFileUUIDOriginal)
  expect(status).toBe('ready')
  Api2.printSuccess('Original Spend File Parsed.')

  const newSpendfile = `${result.spendFileNameOriginal} (Ver. ${result.spendFileVersionOriginal})`
  result.fullName = newSpendfile
  console.log(`newSpendfile ${newSpendfile}`)
  return result
}

export async function deleteUploadedSpendfile(page: Page) {
  console.log('Deleting last uploaded spendfile')
  await goToAdminConsoleDataController(page)
  const hasRecordsBefore = await page.locator(".k-master-row").count();
  if (hasRecordsBefore > 0) {
    const deleteA = page.locator('a:has-text("Delete")')
    const cloneAvailableCount = await deleteA.count();
    if (cloneAvailableCount > 0) {
      await deleteA.first().click();
      const cloneBtn = page.locator(
        ".btn.btn-primary.font-md >> span:has-text('Delete')",
      );
      await Promise.all([
        page.waitForResponse(
          (response: any) =>
            response.url().includes("/api/spend_file_versions") && response.ok(),
        ),
        cloneBtn.click(),
      ]);
    } else {
      console.log("delete is unavailable because no clone action btn visible");
    }
  } else {
    expect(hasRecordsBefore).toBe(0);
    console.log("No requests were found");
  }
}
/**
 * Changes to a tab by index (0-based)
 * @param page - Playwright Page object
 * @param tabIndex - Index of the tab (0 = Supplier, 1 = Spend 1, etc.)
 */
export async function changeTabByIndex(page: Page, tabIndex: number): Promise<void> {
  console.log("changeTabByIndex", tabIndex);
  const tab = page
    .locator('.k-tabstrip-items li[role="tab"]')
    .nth(tabIndex);
  console.log("tab", await tab.textContent());
  await tab.click();
  await expect(tab).toHaveAttribute('aria-selected', 'true');
}

const ALL_COMPANIES_LABEL = "All Companies";

/**
 * Selects a company in the Admin Console > Data Controller company picker.
 *
 * The native `<select id="listOfCompanies">` was replaced by the custom
 * `SearchableDropdown` component (commit 79fd3944 "change dropdowns"), so
 * Playwright's `selectOption` no longer applies — it would block waiting for
 * a `<select>` that no longer exists. This drives the new component: open it,
 * click the option by its visible name and, for a concrete company, wait for
 * the per-company `/api/companies/{uuid}/spend_files_versions` request that the
 * `companySelectedId` watcher fires.
 *
 * We reset to "All Companies" first to guarantee a v-model transition even when
 * the dropdown is already pinned to the target company from a previous test in
 * the same worker (selecting the same value again is a no-op and would never
 * fire the request).
 *
 * @returns the matched per-company `spend_files_versions` response when a
 *          concrete company is selected, otherwise `null`.
 */
export async function selectCompanyInDataController(
  page: Page,
  companyName: string,
) {
  // Only AdminUploadData (tab 0) is mounted on this view, so there is a single
  // SearchableDropdown in the DOM; `.first()` guards against future additions.
  const dropdown = page.locator(".custom-searchable-dropdown").first();
  const optionByName = (name: string) =>
    page
      .locator(".dropdown-options .dropdown-item")
      .filter({ has: page.locator(`span.name:text-is("${name}")`) })
      .first();

  // Reset to "All Companies" so selecting the target is always a real change.
  await dropdown.click();
  await optionByName(ALL_COMPANIES_LABEL).click();

  if (companyName === ALL_COMPANIES_LABEL || companyName === "all") {
    return null;
  }

  const perCompanySpendFilesRegex =
    /\/api\/companies\/[^/]+\/spend_files_versions(\?|$)/;

  await dropdown.click();
  const [responseSpendFile] = await Promise.all([
    page.waitForResponse(
      (response) =>
        perCompanySpendFilesRegex.test(response.url()) && response.ok(),
    ),
    optionByName(companyName).click(),
  ]);
  return responseSpendFile;
}

/**
 * Gets the data controller for post data.
 * @param page - The page to interact with.
 * @param companyName - The name of the company to get the data controller for.
 * @param spendFileName - The name of the spend file to get the data controller for.
 * @returns The data controller for post data.
 */
export async function getDataControllerForPostData(page: Page, companyName: string, spendFileName: string) {
  console.log("Navigate to Admin Console Data Controller");
  await goToAdminConsoleDataController(page);
  console.log("Select company:", companyName);

  const responseSpendFile = await selectCompanyInDataController(
    page,
    companyName,
  );
  if (!responseSpendFile) {
    throw new Error(
      `Could not load spend_files_versions for company '${companyName}'`,
    );
  }

  const companyUUIDMatch = responseSpendFile
    .url()
    .match(/\/api\/companies\/([^/]+)\/spend_files_versions/);
  const companyUUID = companyUUIDMatch?.[1] ?? "";

  const responseBodySpendfile = await responseSpendFile.json();
  const spendUUid = responseBodySpendfile.find(
    (item: any) => item.spendFileName === spendFileName.split(" ")[0],
  );

  const postData = {
    companyUUID,
    spendFileVersion: spendUUid?.uuid ?? "",
  };
  console.log("postData", postData);
  return postData;
}
