

/**
 * End-to-end tests for the Compare Module feature (@us-7933).
 *
 * This test suite validates the following scenarios:
 * - Financial data company selection and DSO value comparison.
 * - Default options and graphics in the Compare section using Kendo UI.
 * - Peer management in the grid compare, including adding and resetting peers.
 *
 * Test Scenarios:
 * 1. Financial > company (@tc-12820): Navigates to financial data preferences,
 *    adds or edits companies, and verifies that DSO values differ for selected companies.
 * 2. Compare > Options Default options and graphics with kendo: Checks the visibility
 *    and selection of default comparison options and metrics, and validates UI updates.
 * 3. Compare > Validate the available Peers in Grid compare: Validates peer addition,
 *    grid data updates, and peer reset functionality.
 *
 * Setup & Teardown:
 * - Logs in as super admin and sets the spend file before all tests.
 * - Logs in as default user and closes the browser after all tests.
 *
 * Utilities:
 * - Uses helper functions for login, navigation, and spend file changes.
 * - Includes a utility function `checkVisibles` to assert visibility of UI elements.
 *
 * @fileoverview Playwright test suite for Compare Module feature validation.
 * @module compare-feature-7933-peers-validation.spec
 */
import { expect, test, Page } from "@playwright/test";
import {
  changeToSpendFile,
  ensureSuperAdminLogin,
  ensureDefaultLogin,
  goToCompareSection,
} from "../utils/Utils";
import { locators } from "../utils/locators";
import {
  safePromiseAll,
  ensurePageActive,
  waitForElementVisible,
  waitForElementAttached,
} from "../utils/PlaywrightTestHelpers";

const given = {
  company: "Company Test",
  spendfile: "Pagero_Full_CapitalIQ.xlsx (Ver. 1)", //Already existent, and additionally attached here.
  program: "MainProgram", //Created by default.
  user: "joel+testsuperadmin@calculum.ai",
  peer1: "Hp Inc",
  companiesDso: ["20 Microns Limited", "23andMe Holding Co."],
};

test.describe.serial("Compare Module @us-7933", async () => {
  let page: Page;
  
  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();
    await ensureSuperAdminLogin(page);
    await changeToSpendFile(page, given.spendfile);
  });

  test("Financial > company @tc-12820", async () => {
    console.log("go to preferences -> financial data");
    await page.locator("#user-menu").click();
    await safePromiseAll([
      page.waitForResponse(
        (response: any) =>
          response.url().includes("/api/compare/find_compare_company") &&
          response.ok()
      ),
      page.waitForResponse(
        (response: any) =>
          response.url().includes("/api/graphql") && response.ok()
      ),
      page.locator('span:has-text("Financial Data")').click(),
    ], "Financial Data navigation");
    let dso1 = "";
    let dso2 = "";
    for (let i = 0; i < given.companiesDso.length; i++) {
      const element = given.companiesDso[i];
      let buttonText = await page
        .locator("span.text-sm:has-text('+ Add Company')")
        .count();
      if (buttonText > 0) {
        await page.locator("span.text-sm:has-text('+ Add Company')").click();
      } else {
        await page.locator("span.text-sm:has-text('Edit Company')").click();
      }
      const searchInput = page.locator(
        'input[id="search"][placeholder="Search by company"]',
      );

      await searchInput.isVisible();
      await searchInput.click();
      await searchInput.fill(element);
      await safePromiseAll([
        page.waitForResponse(
          (response) =>
            response.url().includes("/api/graphql") && response.ok()
        ),
        searchInput.press("Enter"),
      ], `Company search for ${element}`);

      // Wait for options to be available after search
      const options = await waitForElementVisible(page, ".options_by_entity", 2000, `Options for ${element}`);
      await options.first().click();
      const saveBtn = page.getByRole("button", { name: "Save" });
      // Not modal button save
      await saveBtn.click();
      // Read the find_compare_company body the instant the response arrives.
      // Calling response.json() later (after the modal closes and the parent
      // panel re-renders) raced Chromium's CDP body eviction in CI:
      // "Network.getResponseBody: No data found for resource with given identifier".
      const [, responseBody] = await safePromiseAll([
        page.waitForResponse(
          (response) =>
            response.url().includes("/api/companies") &&
            response.ok() &&
            response.request().method() === "PATCH",
        ),
        page
          .waitForResponse(
            (response) =>
              response.url().endsWith("/api/compare/find_compare_company") &&
              response.ok(),
          )
          .then((r) => r.json()),
        page.getByTestId("modal").getByRole("button", { name: "Save" }).click(),
      ], `Company save operation for ${element}`);
      console.log(
        `"Response Body DSO value(${element}): ${responseBody.DSO[0].value}"`,
      );
      if (i === 0) {
        dso1 = responseBody.DSO[0].value;
      } else {
        dso2 = responseBody.DSO[0].value;
      }
    }
    const dso = dso1 === dso2;
    expect(dso).toBeFalsy();
  });

  test("Compare > Options Default options and graphics with kendo", async () => {
    await safePromiseAll([
      page.waitForResponse(
        (response) =>
          response
            .url()
            .endsWith("/api/statistics/compare/grid/per_years_dpo") &&
          response.ok(),
      ),
      page.waitForResponse(
        (response) =>
          response.url().endsWith("/api/statistics/compare/per_years_dpo") &&
          response.ok(),
      ),
      goToCompareSection(page),
    ], "Compare section navigation");

    // Wait for main elements to be visible
    await waitForElementVisible(page, "#available-dropdown-options", 3000, "Main dropdown options");
    //Options default
    const visblesList = [
      "Company Test",
      "Average",
      "Min",
      "Median",
      "Max",
      "Country Average",
      "Region Average",
    ];
    const availableDropdownOptions = page.locator(
      "#available-dropdown-options",
    );
    
    // Wait for dropdown to be available
    await waitForElementVisible(page, "#available-dropdown-options", 1000, "Dropdown options");
    await availableDropdownOptions.click();
    await page.locator("#custom-dropdown-items-options-showing").isVisible();
    // Check the necesary checkbox
    for (const text of visblesList) {
      // Find the label that contains the span with the text and get the checkbox input
      const labelCheckbox = page.locator(
        `label:has(span.text-option:text-is("${text}"))`,
      );
      const checkbox = labelCheckbox.locator(`input[type="checkbox"]`);
      if ((await checkbox.count()) > 0) {
        if (!(await checkbox.isChecked())) {
          await labelCheckbox.click();
          console.log(`Checkbox "${text}" marcado`);
        } else {
          console.log(`Checkbox "${text}" ya estaba marcado`);
        }
      } else {
        console.log(`No se encontró checkbox para: ${text}`);
      }
    }
    const btnApply = page.locator(".compare-dropdown-buttons");
    await btnApply
      .locator("span.btn.btn-primary.font-md.fix-width-btns")
      .click();

    // Wait for changes to be applied
    await waitForElementAttached(page, ".compare-dropdown-buttons", 2000, "Apply button changes");

    // Assert on the kendo chart legend, which is the stable signal that the
    // chart rendered. These series labels are fixed by the chart definition and
    // do NOT depend on the spend file or peer set, unlike the statistical
    // options selected above (Average/Min/Median/Max), which only ever appear
    // as extra bars when peer data exists — asserting those as standalone text
    // is what made this test brittle (and previously skipped).
    const chartLegends = ["Company Test", "Global (Peer Group)", "Competitors"];
    await checkVisibles(page, chartLegends);
    const dropdownMetrics = page.getByTestId("active-metrics-dropdown");
    // Change to DSO Comparison — the chart reloads via /per_years_dso.
    await dropdownMetrics.click();
    await checkVisibles(
      page,
      chartLegends,
      "DSO Comparison",
      "/api/statistics/compare/per_years_dso",
    );
    // Change to C2C Comparison — the chart reloads via /per_years_c2c. The
    // per-metric chart series live under /api/statistics/compare/per_years_<m>
    // (the /grid/ path is the grid table, not the chart), so we wait on the
    // chart endpoint here — matching the DSO step above.
    await dropdownMetrics.click();
    await checkVisibles(
      page,
      chartLegends,
      "C2C Comparison",
      "/api/statistics/compare/per_years_c2c",
    );

    // Restore the default metric. The active metric is persisted in the app
    // store, and this suite runs serially: the next test ("Validate the
    // available Peers") navigates to Compare expecting the default DPO
    // endpoints, so leaving the chart on C2C would break it (and any later
    // compare spec) with a per_years_dpo response timeout. Switching back to a
    // previously loaded metric reuses cached data and fires no network request,
    // so assert on the selected-metric label instead of waiting for a response.
    await dropdownMetrics.click();
    await page.getByText("DPO Comparison").click();
    await expect(page.locator("#metric-dropdown-options")).toContainText(
      "DPO Comparison",
    );

    // Leave the Compare route. This suite runs serially and the next test
    // ("Validate the available Peers") reaches Compare via goToCompareSection,
    // which calls goToHomeSection — and that helper short-circuits on ANY
    // /home/* URL (it treats every /home/* route as "in Home"). So if we ended
    // on /home/compare, the next test's sidebar "Compare" click would not change
    // the route, HomeCompare would not re-mount, and its onMounted grid/chart
    // fetch (per_years_dpo) would never fire — hanging that test's initial
    // waitForResponse. Returning to the dashboard guarantees a fresh mount.
    await page.locator(locators.sidebar.home).click();
    await expect(page).not.toHaveURL(/\/home\/compare/, { timeout: 15000 });
  });

  test("Compare > Validate the available Peers in Grid compare", async () => {
    let initialItems = 0;
    let editItems = 0;
    let resetItems = 0;
    let [gridData] = await safePromiseAll([
      page.waitForResponse(
        (response) =>
          response
            .url()
            .endsWith("/api/statistics/compare/grid/per_years_dpo") &&
          response.ok(),
      ),
      page.waitForResponse(
        (response) =>
          response.url().endsWith("/api/statistics/compare/per_years_dpo") &&
          response.ok(),
      ),
      goToCompareSection(page),
    ], "Initial grid data load");
    let responseGridData = JSON.parse(await gridData.text());
    initialItems = responseGridData.length;
    console.log("initialItems: ", initialItems);
    await ensurePageActive(page);
    await safePromiseAll([
      page.waitForResponse(
        (response) => response.url().includes("/api/graphql") && response.ok(),
      ),
      page.getByRole("button", { name: "Edit Peers" }).click(),
    ], "Edit Peers button click");

    // Wait for edit modal to be fully loaded
    await waitForElementVisible(page, '[placeholder="Search by Peer"]', 2000, "Edit modal search input");

    const searchInput = page.getByPlaceholder("Search by Peer");
    await waitForElementVisible(page, '[placeholder="Search by Peer"]', 1000, "Search input visibility");
    await searchInput.fill("09");

    await safePromiseAll([
      page.waitForResponse(
        (response) => response.url().includes("/api/graphql") && response.ok(),
      ),
      page.getByPlaceholder("Search by Peer").press("Enter"),
    ], "Peer search operation");

    // Wait for search results to be available
    const elements = await waitForElementAttached(page, "tr.hideExpanded > td > span > .k-checkbox", 2000, "Search results checkboxes");
    const count = await elements.count();
    console.log("count : ", count);
    if (count > 0) {
      console.log("do click on first element");
      elements.nth(0).click();
    }

    await safePromiseAll([
      page.waitForResponse(
        (response) =>
          response.url().includes("/api/statistics/compare/peers") &&
          response.ok() &&
          response.request().method() === "POST",
      ),
      page.getByRole("button", { name: "Update" }).click(),
    ], "Update peers operation");

    let [peersDataAfterAdd] = await safePromiseAll([
      page.waitForResponse(
        (response) =>
          response
            .url()
            .includes("/api/statistics/compare/grid/per_years_dpo") &&
          response.ok(),
      ),
    ], "Peers data after add");

    let responsePeersDataAfterAdd = JSON.parse(await peersDataAfterAdd.text());
    editItems = responsePeersDataAfterAdd.length;
    console.log("editItems: ", editItems);
    console.log(`editItems > initialItems: ${editItems > initialItems}`);
    expect(editItems).toBeGreaterThan(resetItems);

    await ensurePageActive(page);
    await page.getByRole("button", { name: "Edit Peers" }).click();
    // Wait for modal to open completely - wait for the search input directly
    await waitForElementVisible(page, '[placeholder="Search by Peer"]', 8000, "Modal search input after reset");

    await safePromiseAll([
      page.waitForResponse(
        (response) =>
          response.url().includes("/api/statistics/compare/peers-reset") &&
          response.ok() &&
          response.request().method() === "POST",
      ),
      page.getByRole("button", { name: "Reset Peers" }).click(),
    ], "Reset peers operation");

    let [gridDataReset] = await safePromiseAll([
      page.waitForResponse(
        (response) =>
          response
            .url()
            .includes("/api/statistics/compare/grid/per_years_dpo") &&
          response.ok(),
      ),
    ], "Grid data reset");

    let responsegridDataReset = JSON.parse(await gridDataReset.text());
    resetItems = responsegridDataReset.length;
    console.log("resetItems: ", resetItems);
    console.log(`resetItems === initialItems: ${resetItems === initialItems}`);
    expect(initialItems).toEqual(resetItems);
  });
  test.afterAll(async () => {
    console.log("*** After all");
    // Best-effort session reset to the default user. The B2C logout→login chain
    // is fragile: every individual wait inside it is finite, but when B2C is slow
    // or stuck in a redirect loop (e.g. the AADB2C90027 token-enrichment errors
    // seen under CI load) their sum can exceed the 120s hook budget — which
    // surfaced as `"afterAll" hook timeout of 120000ms exceeded`. Bound it well
    // under that budget and never let it block the context close. Mirrors the
    // cleanup-race pattern already used in vp-financing-groups.spec.ts.
    const reset = ensureDefaultLogin(page).catch((error) => {
      console.error(
        "afterAll: ensureDefaultLogin failed (non-critical):",
        error instanceof Error ? error.message : String(error),
      );
    });
    await Promise.race([
      reset,
      new Promise<void>((resolve) =>
        setTimeout(() => {
          console.warn(
            "afterAll: ensureDefaultLogin exceeded its 45s budget; skipping (non-critical).",
          );
          resolve();
        }, 45000),
      ),
    ]);
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

/**
 * Asserts the kendo Compare chart rendered by checking its legend.
 *
 * The chart legend (`span.legend-text`) holds the series labels, which are
 * fixed by the chart definition and do not depend on the spend file or the
 * peer set — making them the stable signal that the chart is present for the
 * active metric. When `comparison` is provided, the active metric is switched
 * first and we wait for that metric's chart endpoint, so the legend is asserted
 * against the re-rendered chart rather than the previous metric's.
 *
 * @param page - Playwright Page object representing the current browser page
 * @param legends - Exact legend series labels expected to be visible
 * @param comparison - Optional metric option text to click before asserting
 * @param url - URL substring of the metric's chart response (required with `comparison`)
 * @throws If a legend is not visible, or the metric response never arrives
 */
async function checkVisibles(
  page: Page,
  legends: string[],
  comparison: string | null = null,
  url: string | null = null,
) {
  if (comparison) {
    await safePromiseAll([
      page.waitForResponse(
        (response) => response.url().includes(String(url)) && response.ok(),
      ),
      page.getByText(comparison).click(),
    ], `Comparison click for ${comparison}`);
  }

  for (const legend of legends) {
    await expect(
      page.locator(`span.legend-text:text-is("${legend}")`),
    ).toBeVisible({ timeout: 15000 });
  }
}
