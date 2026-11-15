/**
 * TC8046 The SCF strategy is checked in both disabled and enabled statuses.
 *
 * Each test drives the Setup / Payment Terms (Strategies) screen to move the
 * SCF Peer Standard toggle to a known state, saves, and verifies against the
 * strategies status API that the change persisted. TC8071 (switching the
 * strategy to the 3rd quartile) is not covered here.
 */
import { Browser, Page, chromium, expect, test } from "@playwright/test";

import { changeToSpendFile, ensureDefaultLogin, loginAsAdmin } from "../utils/Utils";
import { locators } from "../utils/locators";

const SPEND_FILE_VERSION_NAME = "Pagero_Full_2024_03_25.xlsx (Ver. 1)";
const STRATEGY_KEY = "scfStandardStrategy";
const STRATEGY_LABEL = "SCF Peer Standard";

/** The GET carries a ?spendUUID= query string, so anchor on the pathname. */
function waitForAllowedStatus(page: Page) {
  return page.waitForResponse(
    (response) =>
      new URL(response.url()).pathname ===
        "/api/spendfile/strategies/allowed-status" && response.ok(),
    { timeout: 60000 },
  );
}

/**
 * Enter the Setup section (Strategies is its default tab) through the sidebar
 * and return the SCF strategy entry of the status response the screen was
 * rendered from. In-app navigation only: a hard goto of the settings route is
 * redirected by the admins-only guard before the session hydrates. Leaving to
 * Home first makes the Setup click below always trigger a fresh fetch.
 */
async function openStrategiesAndGetScf(page: Page): Promise<any> {
  if (page.url().includes("/home/company-settings")) {
    await page.locator(locators.sidebar.home).click();
    await page.waitForURL((url) => !url.pathname.includes("company-settings"));
  }

  const [statusResponse] = await Promise.all([
    waitForAllowedStatus(page),
    page.locator(locators.sidebar.settings).click(),
  ]);

  const body = await statusResponse.json();
  const scf = (body.strategies ?? []).find(
    (strategy: any) => strategy.key === STRATEGY_KEY,
  );

  expect(
    scf,
    `${STRATEGY_KEY} is missing from the strategies status response`,
  ).toBeTruthy();

  await page
    .locator(`#slider-id-${STRATEGY_KEY}`)
    .waitFor({ state: "attached", timeout: 60000 });

  return scf;
}

// Serial on a shared page: both tests drive the same settings screen and the
// afterAll restore depends on the initial state captured by the first one.
test.describe.serial("SCF Strategy", () => {
  let browser: Browser;
  let page: Page;
  let initialAllowed: boolean | null = null;

  /**
   * Ensure the SCF toggle ends up in `desired` state and, when a change was
   * needed, verify it persisted by reloading the screen. Runtime-skips when
   * the toggle is disabled because the environment is recalculating.
   */
  async function setScfAllowed(desired: boolean) {
    const scf = await openStrategiesAndGetScf(page);

    if (initialAllowed === null) {
      initialAllowed = Boolean(scf.isAllowed);
    }

    // The strategy row renders exactly once with its label.
    await expect(
      page.locator(".text-base.font-medium", { hasText: STRATEGY_LABEL }),
    ).toHaveCount(1);

    if (Boolean(scf.isAllowed) === desired) {
      console.log(`SCF strategy is already ${desired ? "enabled" : "disabled"}`);
      return;
    }

    test.skip(
      await scfToggleInput().isDisabled(),
      "Strategy toggles are disabled while the spend file version is pending recalculation on this environment",
    );

    await toggleAndSave();

    const persisted = await openStrategiesAndGetScf(page);

    expect(
      Boolean(persisted.isAllowed),
      `the ${desired ? "enable" : "disable"} was not persisted`,
    ).toBe(desired);
  }

  function scfToggleInput() {
    return page.locator(
      `label.switch:has(#slider-id-${STRATEGY_KEY}) input[type="checkbox"]`,
    );
  }

  /** Flip the already-rendered SCF switch and save through the update API. */
  async function toggleAndSave() {
    await page.locator(`#slider-id-${STRATEGY_KEY}`).click();

    await Promise.all([
      page.waitForResponse(
        (response) =>
          new URL(response.url()).pathname ===
            "/api/spendfile/strategies/allowed/update" &&
          response.request().method() === "POST" &&
          response.ok(),
        { timeout: 60000 },
      ),
      page.locator("button:has(#save-button-for-settings)").click(),
    ]);
  }

  test.beforeAll(async () => {
    browser = await chromium.launch();
    page = await browser.newPage();

    await loginAsAdmin(page);
    await page.waitForSelector(".loading-modal", { state: "detached" });
    await changeToSpendFile(page, SPEND_FILE_VERSION_NAME);
  });

  test.afterAll(async () => {
    // Leave the shared environment as it was found. test.skip is not allowed
    // in afterAll, so a disabled toggle is only logged here - a disabled
    // toggle also means the tests changed nothing.
    if (initialAllowed !== null) {
      const current = await openStrategiesAndGetScf(page);
      if (
        Boolean(current.isAllowed) !== initialAllowed &&
        !(await scfToggleInput().isDisabled())
      ) {
        await toggleAndSave();
      }
    }

    await ensureDefaultLogin(page);
    await browser.close();
  });

  test("Enable SFC strategy @global @ui @settings @strategies @tc-8046 @sergio", async () => {
    await setScfAllowed(true);
  });

  test("Disable SFC strategy @global @ui @settings @strategies @tc-8046 @sergio", async () => {
    await setScfAllowed(false);
  });
});
