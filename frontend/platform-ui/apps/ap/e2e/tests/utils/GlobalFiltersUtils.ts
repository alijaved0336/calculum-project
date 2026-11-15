import { expect, Page, Response } from "@playwright/test";

export interface TestFilter {
  rowsCount: number;
  filterId: number;
  summary: {
    counts: {
      spends: number;
      entities: number;
      parents: number;
    };
    times: {
      "1. Create": number;
      "2. Counts": number;
      "3. Tests": number;
      "4. Total": number;
    };
  };
}

/**
 * Global Filters section utils
 */
export default class GlobalFiltersUtils {
  /**
   * Open Global Filters modal
   *
   * @param page {Page}
   */
  static async openModal(page: Page): Promise<void> {
    console.log("Opening Global Filters dialog ...");

    await page.getByTestId("filter-icon").click();

    console.log("Global Filters dialog is open!");
  }

  /**
   * Open category then open field
   *
   * @param page {Page}
   * @param categoryName {string}
   * @param fieldName {string}
   */
  static async openCategoryThenField(
    page: Page,
    {
      categoryName,
      fieldName,
    }: {
      categoryName: string;
      fieldName: string;
    },
    fieldRequestName: string | null = null,
  ): Promise<void> {
    await GlobalFiltersUtils.openCategory(page, categoryName);

    await GlobalFiltersUtils.openField(page, fieldName, fieldRequestName);
  }

  /**
   * Open category
   *
   * @param page {Page}
   * @param categoryName
   */
  static async openCategory(page: Page, categoryName: string): Promise<void> {
    console.log(`Opening category: ${categoryName} ...`);

    const category = page
      .getByTestId("global-filters-dialog")
      .locator(".left-side")
      .getByText(categoryName);
    await category.click();
    console.log(`Category ${categoryName} opened.`);
  }

  /**
   * Open field
   *
   * @param page {Page}
   * @param fieldName
   */
  static async openField(
    page: Page,
    fieldName: string,
    fieldRequestName: string | null = null,
  ): Promise<void> {
    console.log(`Selecting field ${fieldName}...`);
    const field = page
      .getByTestId("global-filters-dialog")
      .locator(".body-right-side ")
      .getByText(fieldName, { exact: true });
    // Check if the field is already opened
    if (await field.isVisible()) {
      console.log(`Field ${fieldName} already opened.`);
      if (fieldRequestName) {
        console.log(`Field ${fieldName} request name: ${fieldRequestName}`);
        const [response] = await Promise.all([
          page.waitForResponse((response: any) =>
            response.url().includes(fieldRequestName),
          ),
          field.click(),
        ]);
        if (response.ok()) {
          console.log(`Field ${fieldName} selected.`);
        } else {
          console.log(
            `Field ${fieldName} not selected because the request failed`,
            response.status(),
            response.url(),
          );
          expect(response.ok()).toBe(true);
        }
      } else {
        await field.click();
        console.log(`Field ${fieldName} selected.`);
      }
    }
    return;
  }

  /**
   * Check option in field
   *
   * @param page {Page}
   * @param optionName {string}
   * @param fieldName {string}
   * @param field {string} Optional field attribute value (e.g., "volume")
   * @param showMore
   */
  static async checkOptionInField(
    page: Page,
    { optionName, fieldName, field }: { optionName: string; fieldName: string; field?: string | null },
    showMore: boolean = false,
  ): Promise<void> {
    console.log(`Checking option ${optionName} in field ${fieldName} ...`);
    const globalFilterDialog = page.locator(
      '.active[data-testid="global-filters-dialog"]',
    );
    console.log(
      "globalFilterDialog is visible: ",
      await globalFilterDialog.isVisible(),
    );
    const rightSide = globalFilterDialog.locator(".right-side.body-right-side");
    console.log(
      "globalFilterDialog>rightSide is visible: ",
      await rightSide.isVisible(),
    );
    // Build selector with field attribute if provided
    const baseSelector = field != null 
      ? `.k-panelbar-item[field='${field}']`
      : `.k-panelbar-item`;
    console.log("baseSelector: ", baseSelector, "field: ", field, "fieldName: ", fieldName);
    const panelBar = rightSide.locator(baseSelector).filter({ hasText: fieldName });
    console.log(
      "globalFilterDialog>rightSide>panelBar is visible: ",
      await panelBar.isVisible(),
    );
    if (showMore) {
      console.log(`Selecting optionName ${optionName} by search input`);
      const inputSearch = page.locator('input#search[name="search"]');
      await inputSearch.fill(optionName);
    }
    const getLabel = panelBar.getByLabel(optionName);

    console.log(
      "globalFilterDialog>rightSide>panelBar>getLabel is visible: ",
      await getLabel.isVisible(),
    );
    const isAlreadyChecked = await getLabel.isChecked();
    console.log(
      "globalFilterDialog>rightSide>panelBar>getLabel is checked: ",
      isAlreadyChecked,
    );

    if (isAlreadyChecked) {
      console.log("Option already checked.");
    } else {
      console.log("Checking option");
      await expect(getLabel).toBeEnabled();
      // Scroll into view if needed
      await getLabel.scrollIntoViewIfNeeded();

      try {
        // Use a force option as a primary solution
        await getLabel.check({ force: true });
      } catch (e) {
        console.log(
          "Using getLabel.click() because getLabel.check() avoid error",
        );
        await getLabel.click();
      }

      // Verify the action was successful
      await expect(getLabel).toBeChecked({ timeout: 5000 });

      console.log("Option checked successfully.");
    }
  }

  /**
   * Uncheck option in field
   *
   * @param page {Page}
   * @param optionName {string}
   * @param fieldName {string}
   */
  static async uncheckOptionInField(
    page: Page,
    { optionName, fieldName }: { optionName: string; fieldName: string },
  ): Promise<void> {
    console.log(`Unchecking option ${optionName} in field ${fieldName} ...`);

    await page
      .getByTestId("global-filters-dialog")
      .locator(".right-side ")
      .locator(".k-panelbar-item", { hasText: fieldName })
      .getByLabel(optionName)
      .uncheck();

    console.log("Option unchecked.");
  }

  /**
   * Search option in field
   *
   * @param page {Page}
   * @param optionName {string}
   * @param fieldName {string}
   */
  static async searchOptionInField(
    page: Page,
    { optionName, fieldName }: { optionName: string; fieldName: string },
  ): Promise<void> {
    console.log(`Searching option ${optionName} in field ${fieldName} ...`);

    // Type in the search field
    await page
      .locator(".filters-container")
      .locator('input[name="search"]')
      .first()
      .fill(optionName);
  }

  /**
   * Apply filters
   *
   * @param page {Page}
   * @returns {Promise<TestFilter>}
   */
  static async applyFilters(page: Page): Promise<TestFilter> {
    console.log("Applying filters ...");

    // Wait for the button to be visible and enabled
    const showResultsButton = page
      .getByTestId("global-filters-dialog")
      .getByRole("button", { name: "Show Results" });

    console.log("Waiting for Show Results button to be visible...");
    await showResultsButton.waitFor({ state: "visible", timeout: 10000 });

    console.log("Checking if Show Results button is enabled...");
    const isEnabled = await showResultsButton.isEnabled();
    if (!isEnabled) {
      throw new Error(
        "Show Results button is disabled. No filters selected to apply.",
      );
    }

    console.log("Show Results button is enabled, clicking...");

    const [testFilterResponse] = await Promise.all([
      page.waitForResponse(
        (res: any) => res.url().includes("/test_filter") && res.ok(),
        { timeout: 30000 },
      ),
      showResultsButton.click(),
    ]);

    console.log("Test filter response received successfully");
    return await testFilterResponse.json();
  }

  /**
   * Clear all filters
   *
   * @param page {Page}
   * @returns {Promise<void>}
   */
  static async clearAllFiltersFromDialog(page: Page): Promise<void> {
    console.log(
      "Clicking on Clear All button on the global filters dialog ...",
    );

    const isClearAllButtonDisabled = await page
      .getByTestId("global-filters-dialog")
      .getByRole("button", { name: "Clear All" })
      .isDisabled();

    if (isClearAllButtonDisabled) {
      console.log("Filters already cleared.");

      return;
    }

    await page
      .getByTestId("global-filters-dialog")
      .getByRole("button", { name: "Clear All" })
      .click();
  }

  /**
   * Whether the page is inside the app shell.
   *
   * HomeNavbar mounts only within HomeBackend, the `/home/*` shell, so outside
   * it there is no `#header-calculum`, no session banner and no filter bar —
   * nothing this class reads exists. Cleanup hooks land here legitimately:
   * Playwright still runs afterEach when beforeEach failed, so an intermittent
   * B2C login failure (AADB2C90027, see playwright.config.ts) leaves the page
   * sitting on the sign-in screen with an afterEach still to run.
   *
   * Uses the same `/home` test as Utils.goToHomeSection, which covers both
   * `/home/home-dashboard` and the `/home/*` deep links.
   *
   * @param page {Page}
   * @returns {boolean}
   */
  private static isInsideAppShell(page: Page): boolean {
    try {
      return page.url().includes("/home");
    } catch {
      return false; // closed page or no context: nothing to read either way
    }
  }

  /**
   * Wait until the navbar has rendered.
   *
   * Everything this class reads out of the navbar — the session banner, the
   * clear-all button — is decided when HomeNavbar mounts, so a check that runs
   * before that resolves against an empty header and reports "absent" for
   * something that is merely late. Idempotent and effectively free once the
   * header is up, so callers can anchor on it without coordinating.
   *
   * Rejects rather than degrading, and deliberately so: callers screen out the
   * legitimate no-navbar cases with isInsideAppShell first, which leaves "the
   * header never rendered inside the shell" as a real defect. Swallowing it
   * would let a cleanup that could not run report success and leak filter
   * state into the next test — the failure this helper exists to prevent.
   *
   * @param page {Page}
   * @returns {Promise<void>}
   */
  private static async waitForNavbarReady(page: Page): Promise<void> {
    await page
      .locator("#header-calculum")
      .waitFor({ state: "visible", timeout: 15000 });
  }

  /**
   * Whether the session banner has already been dismissed this login.
   *
   * HomeNavbar records the dismissal in sessionStorage under
   * `ada-globalFilterSessionBannerSeen` — the key is duplicated here on purpose,
   * since the e2e suite has no import path into the app's navbar. Once the flag
   * is set the banner cannot render again, which turns a timed wait into an
   * immediate answer for every caller that runs after an earlier dismissal.
   *
   * Treats an unreadable sessionStorage as "not seen" so the caller falls
   * through to the wait rather than skipping a banner that may be there.
   *
   * @param page {Page}
   * @returns {Promise<boolean>}
   */
  private static async hasSeenSessionBanner(page: Page): Promise<boolean> {
    return page
      .evaluate(
        () =>
          globalThis.sessionStorage?.getItem(
            "ada-globalFilterSessionBannerSeen",
          ) === "1",
      )
      .catch(() => false);
  }

  /**
   * Dismiss the global-filter session-restore banner.
   *
   * US-17561 (commit cbe829ee22) added GlobalFilterSessionBanner: the store
   * persists `filtersApplied` under `ada-globalFilters`, so a filter left
   * behind by an earlier test is still active on the next login and the banner
   * announces it once per login. It renders inside `#header-calculum` and
   * overlays the tab strip, so while it is up it swallows clicks aimed at the
   * header.
   *
   * The action matters: "clear" drops the restored filter and is what a caller
   * that wants a clean slate needs, while "keep" only dismisses the banner and
   * must be used once a test has applied a filter of its own, since clearing
   * would throw that filter away too.
   *
   * Best-effort: the banner only renders when a filter actually survived. That
   * makes "is it there?" a race rather than a question, so the absence is
   * established in three steps instead of with a bare `isVisible()`, which is a
   * single immediate poll and reports `false` for a banner that simply has not
   * rendered yet:
   *
   * 1. Wait for the navbar. HomeNavbar resolves the banner's visibility flag in
   *    its `onMounted` hook, so nothing can be decided before the header is up.
   *    This costs nothing — every caller needs the navbar anyway.
   * 2. Short-circuit on the once-per-login flag. When it is already set the
   *    banner cannot render at all, so no wait is warranted.
   * 3. Only then wait for the button, and briefly: after steps 1 and 2 the only
   *    remaining gap is the tick between mount and render.
   *
   * @param page {Page}
   * @param action {"keep" | "clear"} whether to preserve or drop the filter
   * @returns {Promise<void>}
   */
  static async dismissSessionBannerIfPresent(
    page: Page,
    action: "keep" | "clear" = "keep",
  ): Promise<boolean> {
    if (!GlobalFiltersUtils.isInsideAppShell(page)) {
      console.log("Not inside the app shell, no session banner to dismiss");

      return false;
    }

    await GlobalFiltersUtils.waitForNavbarReady(page);

    if (await GlobalFiltersUtils.hasSeenSessionBanner(page)) {
      return false;
    }

    const button = page.locator(
      action === "clear"
        ? ".global-filter-session-banner .banner-clear-btn"
        : ".global-filter-session-banner .banner-keep-btn",
    );

    try {
      await button.waitFor({ state: "visible", timeout: 1000 });
    } catch {
      return false; // no filter survived this login, so there is nothing to dismiss
    }

    console.log(`Global filter session banner present, dismissing (${action})`);

    await button.click();
    await page
      .locator(".global-filter-session-banner")
      .waitFor({ state: "hidden", timeout: 10000 })
      .catch(() => {
        console.log("Session banner did not hide, continuing");
      });

    return true;
  }

  /**
   * Clear all filters from the navbar
   *
   * @param page {Page}
   * @returns {Promise<void>}
   */
  static async clearAllFiltersFromNavbar(
    page: Page /*, options?*/,
  ): Promise<void> {
    console.log("Clearing all filters from navbar ...");

    // Says what actually happened, unlike the "Filters already cleared." below:
    // outside the shell nothing was read and nothing was cleared.
    if (!GlobalFiltersUtils.isInsideAppShell(page)) {
      console.log("Not inside the app shell, no filters to clear");

      return;
    }

    // Anchored here as well as inside the helper below, so the early return
    // stays protected no matter how the two calls are reordered later.
    await GlobalFiltersUtils.waitForNavbarReady(page);

    // Must run before the early return below: the banner keeps a restored
    // filter active even when the navbar shows nothing left to clear.
    const bannerCleared = await GlobalFiltersUtils.dismissSessionBannerIfPresent(
      page,
      "clear",
    );

    // Clearing through the banner drops every filter, so the clear-all button is
    // on its way out of the navbar. Only the banner is waited on above, and that
    // wait swallows its own timeout, so without settling here the poll below can
    // still catch the button mid-removal and click a control that is going away.
    if (bannerCleared) {
      // Tolerant on purpose, and with its own budget rather than the default
      // expect timeout: this is a cleanup helper called from afterEach, so a
      // clear that round-trips slowly must not turn into a hard failure of a
      // test that already passed. Nothing is clicked after this point, so the
      // wait only has to settle — mirrors the banner-hide wait in
      // dismissSessionBannerIfPresent.
      await page
        .locator("#higher-z-index-btn")
        .waitFor({ state: "hidden", timeout: 10000 })
        .catch(() => {
          console.log("Clear all button still visible after the banner clear");
        });

      console.log("Filters cleared from the session banner.");

      return;
    }

    // Safe as an immediate poll only because the navbar is up by now: the
    // button is driven by the synchronously-hydrated filter store, so its
    // state is settled once the header has rendered. Before that this read
    // returned false for an unrendered navbar and the function silently
    // reported "already cleared" without clearing anything.
    let isClearAllButtonVisible = await page
      .locator("#higher-z-index-btn")
      .isVisible();

    if (!isClearAllButtonVisible) {
      console.log("Filters already cleared.");

      return;
    }

    console.log("Click on clear all button");

    await page.locator("#higher-z-index-btn").click();

    console.log("The modal for confirm to clear all filters");

    await page
      .locator(
        ".calculum-modal-content-custom  >> button.btn.btn-primary.font-md",
      )
      .click();
  }

  // *** API Waiters ***

  /**
   * Wait for Unique API response
   *
   * @param page {Page}
   * @param fieldName
   */
  static waitForFieldResponse(
    page: Page,
    fieldName: string,
  ): Promise<Response> {
    console.log(
      `Wait for field ${fieldName} data API response when open rigth side accordion field ...`,
    );
    return page.waitForResponse(
      (response) =>
        response.url().includes("/list/") &&
        response.url().endsWith(fieldName) &&
        response.ok(),
    );
  }

  /**
   * Wait for filter validation API response
   *
   * @param page {Page}
   */
  static waitForFilterValidationResponse(page: Page): Promise<Response> {
    console.log("Waiting for filter validation API response ...");

    return page.waitForResponse(
      (response) => response.url().endsWith("/test_filter") && response.ok(),
      { timeout: 30000 },
    );
  }

  // *** END Waiters ***

  static async clickShowResult(
    page: Page,
    optionName: string,
    fieldName: string,
    showMoreBtn: boolean = false,
    field: string | null = null,
  ) {
    const checkOption = {
      optionName,
      fieldName,
      field,
    };
    await GlobalFiltersUtils.checkOptionInField(page, checkOption, showMoreBtn);
    console.log("save the results");
    console.log("click on show results");
    const resultBTn = page.locator(
      ' .footer-filter.d-flex >> .btn.btn-primary.font-md:has-text("Show Results")',
    );
    
    // Wait for button to be visible and enabled
    await resultBTn.waitFor({ state: "visible", timeout: 10000 });
    const isEnabled = await resultBTn.isEnabled();
    if (!isEnabled) {
      throw new Error(
        "Show Results button is disabled. No filters selected to apply.",
      );
    }
    
    await Promise.all([
      page.waitForResponse(
        (response: any) =>
          response.url().endsWith("/test_filter") && response.ok(),
        { timeout: 30000 },
      ),
      resultBTn.click(),
    ]);
  }
}
