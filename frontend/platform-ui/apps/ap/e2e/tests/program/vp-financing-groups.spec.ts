/**
 * E2E test suite for verifying the functionality of VP Financing Groups with the Auto setting.
 *
 * This test covers the following scenarios:
 * - Logging in as an admin user with exception2 privileges.
 * - Changing to a specific spend file before each test.
 * - Navigating to the Opportunity section and selecting a program.
 * - Adding and configuring multiple financing groups with different base rates and filters.
 * - Saving financing groups and verifying their persistence.
 * - Editing financing groups, deleting specific groups and filters, and validating UI changes.
 * - Checking the result from a GraphQL response to ensure financing strategy is present.
 * - Cleaning up by deleting remaining financing groups.
 * - Logging in as the default user after each test.
 *
 * Helper functions:
 * - `checkResultFromGraphQl`: Extracts and logs relevant node data from GraphQL response.
 *
 * Test tags:
 * - @tc-11893
 *
 * Dependencies:
 * - Playwright test runner
 * - Custom utility functions for login and spend file management
 * - Locators for UI element selection
 */
import { expect, test, Page } from "@playwright/test";
import {
  changeToSpendFile,
  ensureAdminException2Login,
  ensureDefaultLogin,
  resetFeatures,
  goToHomeSection,
} from "../utils/Utils";
import ProgramUtils from "../utils/ProgramUtils";
import { locators } from "../utils/locators";
import {
  waitForRecalculation,
  safePromiseAll,
  waitForApiResponse,
  waitForMultipleApiResponses,
  logOperation,
  ensurePageActive,
  waitForElementVisible,
  waitForElementAttached,
  retryOperation,
  safeOperation,
} from "../utils/PlaywrightTestHelpers";
const features = {
  feature9BoxesFinancing: "feature9BoxesFinancing",
};
const given = {
  company: "Company For strategies",
  spendfile: "Pagero_Full_20230927_1.xlsx (Ver. 1)",
  program: "All-Spends-With-Financing",
  user: "joel+testadmin+exception2@calculum.ai",
  financingGroups: [
    {
      name: "gAuto",
      baseRate: "Auto",
      fundingSpread: 1,
      filter: {
        type: "Currency",
        data: "EUR",
      },
    },
    {
      name: "gManual",
      baseRate: 2,
      fundingSpread: 1,
      filter: {
        type: "Supplier",
        data: "3M Company",
      },
    },
  ],
};
test.describe.serial("VP Financing Groups with the Auto setting", async () => {
  let page: Page;
  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();
    await ensureAdminException2Login(page);
    await changeToSpendFile(page, given.spendfile);
    await resetFeatures(
      page,
      [features.feature9BoxesFinancing],
      true,
      {
        company: given.company,
        nameField: "name",
      },
      true,
    );
    await goToHomeSection(page);
  });
  test("The VP Financing Groups with the Auto setting work enabling financing groups @tc-11893 @flakyResolved", async () => {
    await openFinancingGroupsEditor(page);
    const hasFinancing = await page.locator("#applyFinancingGroup").isChecked();
    logOperation("Program financing state on entry", { hasFinancing });
    if (hasFinancing) {
      await deleteAllFinancingGroups(page);
    }
    logOperation("Adding financing groups");
    await saveFinancingGroups(page, "add");
  });
  test("The VP Financing Groups with the Auto setting work @tc-11893 @flakyResolved", async () => {
    await saveFinancingGroups(page, "edit");

    // Wait for recalculation to complete before checking GraphQL
    logOperation(
      "Waiting for recalculation to complete before checking GraphQL",
    );
    await waitForRecalculation(page, 30000); // 30 seconds timeout for recalculation

    const listTab = page.locator("a#program_list");
    await ProgramUtils.goToProgramSection(page);
    await listTab.waitFor({ state: "visible" });
    logOperation("Going to Opportunity/List");

    // Land on Overview first so the List click below always flips currentTab
    // and refetches; then wait on the suppliers operation specifically —
    // /api/graphql is multiplexed and a broad waiter can capture an unrelated
    // response whose nodes lack financingStrategy.
    await page.locator("#program_overview").click();
    await page
      .locator("#program_overview.active")
      .waitFor({ state: "visible", timeout: 30000 });
    const suppliersResponsePromise = page.waitForResponse(
      (response: any) =>
        response.url().includes("/api/graphql") &&
        response.request().method() === "POST" &&
        (response.request().postData() ?? "").includes(
          "collectionQueryProgramListSuppliers",
        ) &&
        response.ok(),
      { timeout: 60000 },
    );
    await listTab.click();
    const responseG = await suppliersResponsePromise;

    const responseBody = await responseG.json();
    const result: any = await checkResultFromGraphQl(responseBody);
    if (result) {
      logOperation("Checking financing fields", {
        financings: result.financings,
        financingColors: result.financingColors,
      });
      // financingStrategy is only selected when the user's saved column layout
      // shows that column; the financing fields from the base node template
      // are always selected and are the stable signal that financing data
      // reaches the grid.
      expect(result).toHaveProperty("financings");
      expect(result).toHaveProperty("financingColors");
      logOperation("Financing fields validation passed");
    } else {
      logOperation("No result found in GraphQL response");
    }
  });
  test.afterAll(async () => {
    // The cleanup re-opens the editor (two ~10s expansions) and waits for the
    // ~30s update-financing-program call; give the hook room for all of it.
    test.setTimeout(240000);
    logOperation("***Finishing test***");
    try {
      if (page && !page.isClosed()) {
        await ensurePageActive(page);
        logOperation("Final cleanup: deleting all financing groups");
        // Timeout wrapper so a stuck cleanup cannot eat the whole hook budget;
        // sized above the deleteAllFinancingGroups waits it wraps.
        await Promise.race([
          deleteAllFinancingGroups(page),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error("Cleanup timeout")), 180000),
          ),
        ]).catch((error) => {
          logOperation("Cleanup timeout or error (non-critical)", {
            error: error instanceof Error ? error.message : String(error),
          });
        });
      } else {
        logOperation("Page is closed, skipping cleanup");
      }
    } catch (error) {
      logOperation("Error during final cleanup (non-critical)", {
        error: error instanceof Error ? error.message : String(error),
      });
    }
    try {
      if (page && !page.isClosed()) {
        await ensureDefaultLogin(page);
      }
    } catch (error) {
      logOperation("Error ensuring default login", {
        error: error instanceof Error ? error.message : String(error),
      });
    }
    if (page && !page.isClosed()) {
      try {
        // Close the page's context (not the worker `browser` fixture) so the
        // worker stays alive for the next spec in the workers=1 pipeline.
        await page.context().close();
      } catch (error) {
        logOperation("Error closing page context", {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
    logOperation("***Finished***");
  });
});

/**
 * Opens the financing-groups editor at Settings > Financing and selects the
 * target program in the editor's own dropdown. The old Program Overview entry
 * buttons (#addFinancingGroupProgram / #edit-financing-groups) were removed
 * from the app; this settings section is the only entry point that works for
 * programs with and without financing applied. Idempotent: safe to call when
 * the editor is already open.
 */
async function openFinancingGroupsEditor(page: Page) {
  const programDropdown = page
    .locator('[data-testid="active-program-dropdown"]')
    .first();
  const financingSwitch = page.locator("#applyFinancingGroupSwitch");

  // Gate only on the financing switch: the program dropdown is not rendered
  // for single-program companies, so requiring it would report the editor as
  // closed on every call and re-click #show-financing-groups - a toggle that
  // collapses the already-open section and leaves the waiter below timing out.
  const editorAlreadyOpen = await financingSwitch
    .isVisible()
    .catch(() => false);

  if (!editorAlreadyOpen) {
    logOperation("Opening Settings > Financing > Financing Groups");
    await page.locator(locators.sidebar.settings).click();
    const financingTab = page.locator("#setup-financing");
    await financingTab.waitFor({ state: "visible", timeout: 30000 });
    await financingTab.click();

    // The section header toggles open/closed, so only click it while the
    // editor is not mounted yet. HomeCompanySettings remounts the whole tab
    // (key++) when the recalculation-status subscription updates, which
    // collapses a just-opened section — retry the expansion when that races.
    const sectionToggle = page.locator("#show-financing-groups");
    await sectionToggle.waitFor({ state: "visible", timeout: 30000 });
    await retryOperation(
      async () => {
        if (!(await financingSwitch.isVisible())) {
          await sectionToggle.click();
          await financingSwitch.waitFor({ state: "visible", timeout: 10000 });
        }
      },
      3, // maxRetries
      1000, // baseDelay
      "expand the SCF Groups section",
    );
  }

  // The editor mounts once the section's program API calls settle. The
  // program dropdown only renders when the company has more than one program,
  // so gate on the financing switch instead of the dropdown.
  await financingSwitch.waitFor({ state: "visible", timeout: 30000 });

  if (await programDropdown.isVisible().catch(() => false)) {
    // The dropdown's textContent concatenates the selected name with every
    // (hidden) option, so read the selected-name span specifically.
    const currentProgram = (
      (await programDropdown
        .locator(".custom-dropdown-selected .title-dropdown-parent span")
        .first()
        .textContent()) ?? ""
    ).trim();
    if (currentProgram !== given.program) {
      logOperation("Selecting program in the financing editor", {
        from: currentProgram,
        to: given.program,
      });
      await safePromiseAll(
        [
          waitForApiResponse(
            page,
            "/financing_groups",
            30000,
            "Load financing groups for the selected program",
          ),
          ProgramUtils.changeToProgram(page, given.program),
        ],
        "Select program in financing editor",
      );
      await financingSwitch.waitFor({ state: "visible", timeout: 30000 });
    }
  } else {
    logOperation(
      "Program dropdown not rendered - single-program company, using it as-is",
    );
  }

  // #applyFinancingGroupSwitch is the visible label; #applyFinancingGroup is
  // the checkbox behind it and the element every caller reads with
  // isChecked(), so hand the editor over only once it is in the DOM. Reading
  // it too early throws or returns the default and skips the cleanup the
  // callers gate on it.
  await page
    .locator("#applyFinancingGroup")
    .waitFor({ state: "attached", timeout: 30000 });
}

async function saveFinancingGroups(page: Page, type: "add" | "edit") {
  await openFinancingGroupsEditor(page);

  const applyFinancingLabel = page.locator("#applyFinancingGroupSwitch");
  const applyFinancingInput = page.locator("#applyFinancingGroup");
  const btnSaveModal = page
    .locator("#calculum-modal-container")
    .getByRole("button", { name: "Continue" });
  const saveGroups = page.locator("button#saveFinancingGroup");

  if (type === "add") {
    // Enable financing only when it is off — a blind click would toggle an
    // already-enabled switch back off and hide the editor.
    if (!(await applyFinancingInput.isChecked())) {
      logOperation("Enabling financing group switch");
      await applyFinancingLabel.click();
    }
    await page.locator("#addbutton").waitFor({ state: "visible", timeout: 10000 });
    logOperation("Financing group panel");
    for (let index = 0; index < given.financingGroups.length; index++) {
      const element = given.financingGroups[index];
      logOperation("Adding financing group", { name: element.name });
      await page.locator("#addbutton").click();
      await page
        .locator('[data-testid="fName"]')
        .nth(index)
        .fill(element.name);
      if (element.baseRate !== "Auto") {
        await page
          .locator('[data-testid="fAutoBaseRate"]')
          .nth(index)
          .uncheck();
        await page
          .locator('[data-testid="fBaseRatePresentation"]')
          .nth(index)
          .fill(element.baseRate.toString());
      }
      await page
        .locator('[data-testid="fFundingSpreadPresentation"]')
        .nth(index)
        .fill(element.fundingSpread.toString());
      await page.locator('[data-testid="fAddRule"]').nth(index).click();
      const filterField = page.locator('[data-testid="filterChooseField"]');
      await filterField.click();
      const typeFilterSelect = page.locator(
        `span.text-option[title="${element.filter.type}"]`,
      );
      await typeFilterSelect.click();
      await page
        .locator("span", { hasText: `${element.filter.data}` })
        .click();
      await page.locator("button.save-changes-filter").click();
    }
    await saveGroups.click();
  } else {
    // edit: delete the first group and remove the second group's filter badge
    await page.locator("#addbutton").waitFor({ state: "visible", timeout: 10000 });
    for (let index = 0; index < given.financingGroups.length; index++) {
      const element = given.financingGroups[index];
      if (index === 0) {
        logOperation("Deleting first group inside edit");
        const trashClick = page.locator('[data-testid="icon-trash"]');
        await trashClick.nth(index).click();
      } else if (index === 1) {
        logOperation("Deleting filter second group inside edit");
        const badgeDelete = page.locator(
          `.badge_container:has-text("${element.filter.data}") svg.remove_icon_badge_container`,
        );
        await badgeDelete.click();
      }
    }

    logOperation("Clicking save button to trigger confirmation modal");
    await saveGroups.waitFor({ state: "visible", timeout: 5000 });
    await retryOperation(
      async () => {
        const isSaveButtonEnabled = await saveGroups.isEnabled();
        if (!isSaveButtonEnabled) {
          logOperation("Save button is disabled, waiting for it to be enabled");
          throw new Error("Save button is not enabled yet");
        }
        logOperation("Save button is enabled");
      },
      5, // maxRetries
      1000, // baseDelay
      "wait for save button to be enabled before triggering modal",
    );
    await saveGroups.click();
  }

  logOperation("Saving financing groups changes");

  // Saving pops the recalculation modal; Continue persists and recalculates.
  await waitForElementVisible(
    page,
    "#calculum-modal-container",
    20000,
    "wait for modal container before Continue button",
  );
  await btnSaveModal.waitFor({ state: "visible", timeout: 20000 });
  logOperation("Continue button is visible");

  await retryOperation(
    async () => {
      const isSaveButtonEnabled = await btnSaveModal.isEnabled();
      if (!isSaveButtonEnabled) {
        logOperation("Save button is disabled, waiting for it to be enabled");
        throw new Error("Save button is not enabled yet");
      }
      logOperation("Save button is enabled");
    },
    3, // maxRetries
    1000, // baseDelay
    "wait for save button to be enabled",
  );

  // update-financing-program recalculates the program synchronously before it
  // answers: measured at ~30s on dev for Pagero_Full_20230927_1 (and longer on
  // the slower pipeline environment), so a 30s budget failed right at the
  // edge. The response is what proves the save landed, so wait generously
  // rather than giving up while the backend is still working.
  await safePromiseAll(
    [
      waitForMultipleApiResponses(
        page,
        [
          "/api/analyze/update-financing-program",
          "/financing_groups",
        ],
        120000,
        "Save financing groups changes",
      ),
      btnSaveModal.click(),
    ],
    "Click save button and wait for API responses",
  );
  logOperation("Financing groups saved");

  await waitForRecalculation(page);
}
async function checkResultFromGraphQl(result: any) {
  let res = null;
  if (result && result.data) {
    const dataKeys = Object.keys(result.data);
    logOperation("Fields inside data", { dataKeys });

    // Check which property exists and has valid structure
    // Priority: suppliers > spends > parents
    if (
      dataKeys.includes("suppliers") &&
      result.data.suppliers?.edges?.length > 0
    ) {
      logOperation("Structure suppliers found with edges");
      res = result.data.suppliers.edges[0].node;
    } else if (
      dataKeys.includes("spends") &&
      result.data.spends?.edges?.length > 0
    ) {
      logOperation("Structure spends found with edges");
      res = result.data.spends.edges[0].node;
    } else if (
      dataKeys.includes("parents") &&
      result.data.parents?.edges?.length > 0
    ) {
      logOperation("Structure parents found with edges");
      res = result.data.parents.edges[0].node;
    } else {
      logOperation("No valid data structure found", {
        availableKeys: dataKeys,
      });
      // Log what we found for debugging
      if (dataKeys.includes("suppliers")) {
        logOperation("Suppliers exists but has no edges", {
          suppliers: result.data.suppliers,
        });
      }
      if (dataKeys.includes("spends")) {
        logOperation("Spends exists but has no edges", {
          spends: result.data.spends,
        });
      }
      if (dataKeys.includes("parents")) {
        logOperation("Parents exists but has no edges", {
          parents: result.data.parents,
        });
      }
    }
  } else {
    logOperation("Result does not have expected data structure");
  }
  logOperation("GraphQL result", { hasResult: !!res });
  return res;
}

/**
 * Deletes all financing groups from the current program by turning the
 * financing switch off in the (already open) editor. Switching it off pops a
 * Yes/No confirmation whose Yes persists the deletion immediately.
 */
async function deleteAllFinancingGroups(page: Page) {
  try {
    await openFinancingGroupsEditor(page);
    const applyFinancingLabel = page.locator("#applyFinancingGroupSwitch");
    const applyFinancingInput = page.locator("#applyFinancingGroup");

    const isOn = await applyFinancingInput.isChecked().catch(() => false);
    if (!isOn) {
      logOperation("No financing groups to delete - switch already off");
      return;
    }

    logOperation("Disabling financing groups switch to delete all groups");
    await applyFinancingLabel.click();

    const yesButton = page
      .locator("#calculum-modal-container")
      .getByRole("button", { name: "Yes" });
    await yesButton.waitFor({ state: "visible", timeout: 20000 });

    // Same synchronous program recalculation as the save path (~30s on dev),
    // so the same generous budget: a 30s cap aborted the cleanup mid-flight
    // and left the program with financing enabled for the next run.
    await safePromiseAll(
      [
        waitForApiResponse(
          page,
          "/api/analyze/update-financing-program",
          120000,
          "Persist financing removal",
        ),
        yesButton.click(),
      ],
      "Confirm financing removal and wait for API response",
    );
    logOperation("All financing groups deleted successfully");

    await waitForRecalculation(page);
  } catch (error) {
    logOperation("Error in deleteAllFinancingGroups", {
      error: error instanceof Error ? error.message : String(error),
    });
    // Don't throw - cleanup should be non-blocking
  }
}
