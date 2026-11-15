import { test, expect, Locator, Page } from "@playwright/test";
import { changeToSpendFile, ensureDefaultLogin } from "../utils/Utils";
import {
  safePromiseAll,
  waitForApiResponse,
  waitForElementVisible,
  waitForElementAttached,
  logOperation,
  safeOperation,
  retryOperation,
} from "../utils/PlaywrightTestHelpers";
import { ProgramUtils } from "../utils";

const PROGRAM_NAME = "All Spends CF";
const ACTIVE_LEVEL_SELECTOR =
  ".custom_cursor_pointer.level-tab.mx-auto.active";
const NINE_BOXES_API = "api/analyze/get-nine-boxes-terms-extension-data";

/**
 * Switches the active level tab and waits for the UI to actually reflect the
 * change. Source of truth is the active-tab text, NOT the API response: the
 * product's program-SFV consistency guard
 * (src/utils/validation/programSfvConsistency.ts) can silently no-op the
 * `get-nine-boxes-terms-extension-data` request during the brief window where
 * `selectedProgram` and `allPrograms` are out of sync after an SFV change.
 * In that case the click still lands and the active tab still flips, so we
 * wait on the visible state and treat the API call as opportunistic.
 */
const switchToLevel = async (
  page: Page,
  tabLocator: Locator,
  targetLevel: string,
  attachmentSelector: string,
) => {
  await waitForElementAttached(
    page,
    attachmentSelector,
    30000,
    `wait for ${targetLevel} tab attachment`,
  );
  await tabLocator.waitFor({ state: "visible", timeout: 30000 });

  // Race the API wait alongside the click so retries still benefit when it
  // does fire, but use a short window and swallow timeouts: the active-tab
  // text change below is the authoritative signal.
  const apiSettle = waitForApiResponse(
    page,
    NINE_BOXES_API,
    15000,
    `load ${targetLevel} level data`,
  ).catch((error) => {
    logOperation(
      `API for ${targetLevel} did not fire within window — relying on active-tab change`,
      { error: error instanceof Error ? error.message : String(error) },
    );
    return null;
  });

  await tabLocator.click();

  await expect(
    page.locator(`${ACTIVE_LEVEL_SELECTOR}:has-text("${targetLevel}")`),
  ).toBeVisible({ timeout: 30000 });
  await expect(page.locator(ACTIVE_LEVEL_SELECTOR)).toHaveCount(1);

  await apiSettle;
};

test.beforeEach(async ({ page }) => {
  await ensureDefaultLogin(page);
  await changeToSpendFile(page, "PageroFull_20230308_2.xlsx (Ver. 1)");
  await ProgramUtils.changeToProgram(page, PROGRAM_NAME);
  await ProgramUtils.goToProgramSection(page);
});

test("Test levels for nine boxes data @integrated @us-4078 @nine-box @program", async ({
  page,
}) => {
  test.setTimeout(180_000);
  logOperation("Starting test: Test levels for nine boxes data");

  // Open the nine-box CF tab. This is the view opener (not a level switch),
  // so the API response is still the right wait signal here.
  await retryOperation(
    async () => {
      const nineBoxTab = page.locator("#ninebox_cf");
      await waitForElementAttached(
        page,
        "#ninebox_cf",
        60000,
        "wait for nine box CF tab attachment",
      );
      await nineBoxTab.waitFor({ state: "visible", timeout: 60000 });

      logOperation("Nine box CF tab is visible and ready, clicking");
      await safePromiseAll(
        [
          waitForApiResponse(
            page,
            NINE_BOXES_API,
            30000,
            "load nine boxes data",
          ),
          nineBoxTab.click(),
        ],
        "click nine box CF tab",
      );
    },
    3,
    2000,
    "click nine box CF tab with retry",
  );

  await waitForElementVisible(
    page,
    ACTIVE_LEVEL_SELECTOR,
    10000,
    "wait for initial active level tab",
  );
  await expect(page.locator(ACTIVE_LEVEL_SELECTOR)).toHaveCount(1);

  const initialActiveLevel = await safeOperation(
    page,
    async () => page.locator(ACTIVE_LEVEL_SELECTOR).innerText(),
    "get initial active level text",
  );
  logOperation("Initial active level", { level: initialActiveLevel });

  // Switch to Spend Lines — wait on the active-tab change, not the API.
  await switchToLevel(
    page,
    page.locator('span.level-tab:has-text("Spend Lines")'),
    "Spend Lines",
    'span.level-tab:has-text("Spend Lines")',
  );
  logOperation("Active level is now Spend Lines");

  // Switch to Parents.
  await switchToLevel(
    page,
    page.locator(
      '.custom_cursor_pointer.level-tab.mx-auto:has-text("Parents")',
    ),
    "Parents",
    '.custom_cursor_pointer.level-tab.mx-auto:has-text("Parents")',
  );

  const finalActiveLevel = await safeOperation(
    page,
    async () => page.locator(ACTIVE_LEVEL_SELECTOR).innerText(),
    "get Parents active level text",
  );
  expect(finalActiveLevel).toBe("Parents");

  logOperation("Test completed successfully");
});
