//Created by Josh
import { test, expect } from "@playwright/test";
import {
  changeToSpendFile,
  ensureDefaultLogin,
  goToHomeSection,
} from "../../utils/Utils";

import Api2 from "../../utils/APi2";

test.beforeEach(async ({ page }) => {
  await ensureDefaultLogin(page);
  await changeToSpendFile(page, 'PageroFull_20230308_2.xlsx (Ver. 1)')
});

test("Test fixed header in Analyze List @analyze @integrated @us-4530 ", async ({
  page
}) => {


  // The SPA deep-links to /home/analyze* whenever state.json carries a
  // selected program, so /home-dashboard is not a reachable precondition.
  // goToHomeSection is the canonical wait and accepts any /home/* route.
  await goToHomeSection(page);
  await page
    .locator("ul.user-sidebar >> .icon-categorize.icon-svg-sidebar")
    .click();

  await Promise.all([
    page.waitForResponse((res:any) => res.url().includes("api/graphql") && res.ok()),
    page
      .locator(
        'a.btn.btn-clean.font-md.text-capitalize.custom-padding-btn.rounded-tbl-none:has-text("List")'
      )
      .click()
  ]);

  // The List section keeps all three sub-tab grids (Spend Lines / Suppliers /
  // Parents) mounted at the same time and hides the inactive ones with
  // display:none (`.hidden-grid`). The Spend Lines grid sits earlier in the DOM
  // and paints about a second after the active Suppliers grid, so a page-wide
  // CSS locator plus `.first()` is a race: fast local runs bind to the visible
  // row, the loaded pipeline binds to a hidden Spend Lines row and stays
  // `hidden` for the whole timeout. Scope every grid locator to the active
  // sub-tab instead. `getByRole` is a11y-tree based and already excludes
  // display:none panels, but the wrapper is scoped for consistency.
  const activeGrid = page.locator(".k-grid:visible").first();

  // Role-based locator: the toolbar is rendered by Kendo's GridToolbar, whose
  // class list is owned by the theme. Alternative: page.locator("#toolbarTabsFilterOptions").
  const toolbar = activeGrid.getByRole("toolbar");
  const gridContent = activeGrid.locator(".k-grid-content:visible").first();
  const firstRow = activeGrid.locator("tr.k-master-row:visible").first();

  await expect(toolbar).toBeVisible();
  await expect(firstRow).toBeVisible();

  // The grid scrolls its own virtualized viewport, not the window.
  await gridContent.evaluate((el) => el.scrollTo({ top: el.scrollHeight }));

  // Guard the premise of the assertion below: scrolling a pane that never
  // overflows is a no-op, and the fixed-header check would then pass without
  // the grid having moved at all.
  await expect
    .poll(async () => gridContent.evaluate((el) => el.scrollTop))
    .toBeGreaterThan(0);

  // The header is fixed: it stays in the viewport once the grid has scrolled.
  await expect(toolbar).toBeInViewport();
});
