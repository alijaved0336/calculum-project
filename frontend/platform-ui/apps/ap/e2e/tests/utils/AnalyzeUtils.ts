import { expect, Page, Response } from "@playwright/test";
import { locators } from "./locators";

type GridTabName = "Spends" | "Suppliers" | "Parents";

/**
 * GraphQL root field each Analyze/List level tab queries. Used to tell the
 * tab's own response apart from the sibling queries that are still in
 * flight when the tab is clicked.
 */
const GRID_TAB_ROOT_FIELD: Record<GridTabName, string> = {
  Spends: "spends",
  Suppliers: "suppliers",
  Parents: "parents"
};

/**
 * Label Kendo's TabStrip renders for each level tab. Only the tabstrip of the
 * grid the user is looking at reaches the accessibility tree — the other two
 * grids stay mounted behind `.hidden-grid { display: none }` — so a role-based
 * lookup resolves to the visible one on its own.
 */
const GRID_TAB_LABEL: Record<GridTabName, string> = {
  Spends: "Spend Lines",
  Suppliers: "Suppliers",
  Parents: "Parents"
};

export default class AnalyzeUtils {

  static async goToAnalyzeSection(
    page: Page,
    options?: Partial<{
      tab: string | null;
      wait: boolean | null;
      subtab: GridTabName;
      isFromHome: boolean;
    }>
  ): Promise<Response | null> {
    const {
      tab = null,
      wait = false,
      subtab = "Parents",
      isFromHome = true
    } = options || {};

    console.log("Going to Analyze section...");

    if (isFromHome) {
      await expect(page).toHaveURL(/.*\/home\/home-dashboard/);
    }

    await page.locator(locators.sidebar.analyze).click();

    await expect(page).toHaveURL(/.*\/home\/categorize/);

    console.log("Successfully in Analyze section.");

    switch (tab) {
      case "List":
        if (wait) {
          return await this.goToAnalyzeListTab(page, { subtab });
        } else {
          page.locator(locators.analyze.list.itself).click();

          return null;
        }

      case "Overview":
        if (wait) {
          return await this.goToAnalyzeOverviewTab(page);
        } else {
          page.locator(locators.analyze.overview.itself).click();

          return null;
        }
    }

    return null;
  }

  static async goToAnalyzeOverviewTab(page: Page): Promise<null> {
    // await page.locator('.tabs-parent >> a:has-text("List")').click()
    await Promise.all([
      page.waitForResponse(
        response =>
          response.url().includes("api/categorize/overview-info-panels") &&
          response.ok()
      ),
      page.waitForResponse(
        response =>
          response.url().includes("api/statistics/get-chart-data") &&
          response.ok()
      ),
      page.waitForResponse(
        response =>
          response.url().includes("api/statistics/getCategoriesData") &&
          response.ok()
      ),
      page.locator(locators.analyze.overview.itself).click()
    ]);

    return null;
  }

  /**
   * Open the List tab of the Analyze section on a given level tab.
   *
   * The view does not always land on the same level: it restores the one the
   * user last looked at from the persisted home store
   * (`entityLevelTabSelected`, `stores/home.ts`), and an e2e run inherits that
   * value through `e2e/state.json` — `Api2.getInstance` snapshots the whole
   * browser storage into it, so a level a previous spec left behind carries
   * over. Assuming a fixed starting level made this helper click a tab that
   * was already selected, which fires nothing at all (see
   * `selectGridLevelTab`).
   *
   * @param {Page} page
   * @param {{ subtab: GridTabName }} options
   * @returns {Promise<Response | null>} the query backing the requested level
   */
  static async goToAnalyzeListTab(
    page: Page,
    options?: {
      subtab: GridTabName;
    }
  ): Promise<Response | null> {
    const { subtab = "Parents" } = options || {};

    // Mounting the List view fetches every level, not just the visible one:
    // `loadGridsData` asks the active level for its data and that fetch chains
    // the other two (`callOthersGrid` in Lists.vue). The query behind the
    // requested level is therefore already in flight when the tab opens, which
    // is what makes it safe to wait for it here without knowing which level
    // the view restored.
    const [mountResponse] = await Promise.all([
      this.waitForGridQuery(page, subtab),
      page.locator(locators.analyze.list.itself).click()
    ]);

    await this.selectGridLevelTab(page, subtab);

    return mountResponse;
  }

  /**
   * Make a level tab the selected one of the List grid.
   *
   * Deliberately waits on the tab's own selected state and never on a
   * request. Kendo's TabStrip drops the `select` event when the clicked tab is
   * the selected one already — `onSelect` guards on `selected !== index`
   * (kendo-vue-layout 4.3.3) — so the view fires nothing and a network waiter
   * behind this click hangs for the whole test budget, which is what happened
   * every time the view had restored the very level being asked for.
   *
   * A single read of the selected state cannot decide the click either.
   * `CalculumGridGraphql` initialises `selectedTabIndex` to 0 and only syncs it
   * from `selectedTabFromView` in `onMounted` and in a watcher that fires
   * whenever the prop changes, so a read taken before that sync reports the
   * pre-sync selection. That is wrong in both directions: it can skip a click
   * the view then undoes by restoring another level, and the restore can also
   * land after a click. Retrying the read-and-click as one unit absorbs both —
   * the click stays idempotent (harmless on the active tab, effective
   * otherwise) and a late sync is corrected on the next attempt instead of
   * being waited out to the timeout.
   *
   * @param {Page} page
   * @param {GridTabName} tab
   */
  static async selectGridLevelTab(page: Page, tab: GridTabName): Promise<void> {
    console.log(`Going to Tab List->${tab}...`);

    const label = GRID_TAB_LABEL[tab];
    const selectedTab = page.getByRole("tab", {
      name: label,
      exact: true,
      selected: true
    });

    await expect(async () => {
      if (!(await selectedTab.isVisible())) {
        await page.getByRole("tab", { name: label, exact: true }).click();
      }

      await expect(selectedTab).toBeVisible({ timeout: 2_000 });
    }).toPass({ timeout: 30_000 });
  }

  /**
   * Wait for the Analyze/List GraphQL query that backs a given level tab.
   *
   * Every level tab posts to the same `/api/graphql` endpoint, so matching
   * on the URL alone returns whichever query resolves first — usually the
   * previous tab's, which is still in flight when the new tab is clicked.
   * Matching on the response's root field pins it to the right one.
   *
   * @param {Page} page
   * @param {GridTabName} tab
   * @returns {Promise<Response>} response
   */
  static async waitForGridQuery(
    page: Page,
    tab: GridTabName
  ): Promise<Response> {
    const rootField = GRID_TAB_ROOT_FIELD[tab];

    return await page.waitForResponse(async response => {
      if (!response.url().includes("/api/graphql") || !response.ok()) {
        return false;
      }

      try {
        const body = await response.json();

        return Boolean(body?.data?.[rootField]);
      } catch {
        return false;
      }
    });
  }
}
