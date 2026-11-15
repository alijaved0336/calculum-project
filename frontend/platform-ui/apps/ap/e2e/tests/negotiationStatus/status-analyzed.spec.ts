import { Page, Response, expect, test } from "@playwright/test";

// Utils
import {
  goToHomeSection,
  changeToSpendFile,
  loginAsAdmin,
  ensureDefaultLogin
} from "../utils/Utils";
import { GraphQlUtils, isNullOrUndefined, ProgramUtils } from "../utils";

const SPEND_FILE_VERSION_NAME: string = "Pagero_Small.xlsx (Ver. 1)";

import Api2 from "../utils/APi2";

/**
 * Matches the program List "Suppliers" graphql response. `/api/graphql` is a single
 * multiplexed endpoint, so waiting on the URL alone races and can capture an unrelated
 * operation whose body lacks `data.suppliers.edges`. The suppliers query is the only one
 * that references `collectionQueryProgramListSuppliers`, so disambiguate on that marker.
 */
const isProgramListSuppliersGraphQl = (response: Response): boolean =>
  response.url().includes("/api/graphql") &&
  response.request().method() === "POST" &&
  (response.request().postData() ?? "").includes(
    "collectionQueryProgramListSuppliers"
  ) &&
  response.ok();

/**
 * Same disambiguation as above, for the program List "Parents" query.
 */
const isProgramListParentsGraphQl = (response: Response): boolean =>
  response.url().includes("/api/graphql") &&
  response.request().method() === "POST" &&
  (response.request().postData() ?? "").includes(
    "collectionQueryProgramListParents"
  ) &&
  response.ok();

/**
 * Any of the three program List operations. The List views mount all three
 * grids together and fetch all three levels, but which query lands first - and
 * whether one lands at all when nothing the fetch depends on has changed -
 * follows the sub-tab the store restored. Waiting on the suppliers operation
 * alone to decide "the read-only grid has settled" therefore times out for
 * runs that restore a different level, which is what made the two edit-mode
 * tests below fail one per run, alternately.
 */
const isProgramListGraphQl = (response: Response): boolean =>
  isProgramListSuppliersGraphQl(response) ||
  isProgramListParentsGraphQl(response) ||
  (response.url().includes("/api/graphql") &&
    response.request().method() === "POST" &&
    (response.request().postData() ?? "").includes(
      "collectionQueryProgramListSpends"
    ) &&
    response.ok());

test.beforeEach(async ({ page }) => {
  // The login → home → whoAmI → spend-file → program-section preamble takes
  // ~20s locally but has burned 90s+ of the default 120s budget on the shared
  // pipeline env when another run is uploading/recalculating spend files
  // (2026-07-10 pipeline failure: the goToProgramListTab waiter died at the
  // global test timeout in under 30s of its own wait). Same mitigation as
  // other env-heavy specs in this suite.
  test.setTimeout(300_000);

  await goToHomeSection(page);

  await changeToSpendFile(page, SPEND_FILE_VERSION_NAME);

  await ProgramUtils.goToProgramSection(page);
});

test.afterEach(async ({ page }) => {
  // The edit-mode test switches to the admin session; make sure every test
  // hands the default session back to the rest of the suite.
  await ensureDefaultLogin(page);
});

// Program / List / Suppliers (analyzed) -> Spends (analyzed)
test('in the list tab of the program section, if a supplier status is analyzed, all its spends statuses should be analyzed @tc-7239 @us-7157 @negotiation-status', async ({
  page
}: {
  page: Page;
}) => {
  // HomeOpportunity keeps the List grid mounted once visited, so it only
  // refetches when currentTab actually changes to it. If the program view has
  // already landed on List, arming the suppliers waiter and re-navigating
  // would never see a fresh query (it fired before the waiter existed) and
  // hang. Land on Overview first so the goToProgramListTab click below always
  // flips currentTab -> remount -> fresh `collectionQueryProgramListSuppliers`
  // query, which the waiter armed right after is guaranteed to capture.
  await page.locator("#program_overview").click();
  await expect(page.locator("#program_overview.active")).toBeVisible({
    timeout: 30_000
  });

  // Attach the suppliers-specific waiter BEFORE navigating so we capture the
  // right multiplexed /api/graphql operation regardless of which one
  // goToProgramListTab happens to catch.
  const suppliersResponsePromise = page.waitForResponse(
    isProgramListSuppliersGraphQl,
    // Default 30s is too tight when the shared env is churning (concurrent
    // spend-file recalculations slow the List queries).
    { timeout: 60_000 }
  );
  await ProgramUtils.goToProgramListTab(page, { subtab: "Supplier" });
  const responseProgramListTab = await suppliersResponsePromise;

  const resultProgramListTab = await responseProgramListTab.json();

  const resultProgramListTabParsed = GraphQlUtils.getDataSuppliers(
    resultProgramListTab
  );

  expect(
    isNullOrUndefined(resultProgramListTabParsed),
    "The suppliers query returned a collection"
  ).toBe(false);
  expect(
    resultProgramListTabParsed.length,
    "The grid has some suppliers"
  ).toBeGreaterThan(0);

  // Get an entity with "analyzed" status and 2 children
  const supplier: {
    entityName: string;
  } = resultProgramListTabParsed.find(
    (item: any) =>
      item.negotiationStatus === "analyzed" &&
      item.negotiationStatusCodes.split(",").length === 1 &&
      item.spendCounts === 2
  );

  expect(supplier, "Supplier was found").toBeTruthy();

  const supplierName = supplier.entityName;

  console.log("Supplier name:", supplierName);

  // Expand the supplier's child grid. The program-list grid (CalculumGridGraphql)
  // uses Kendo's hierarchy cell — the expand control is `td.k-hierarchy-cell > a`
  // (plus icon) on the master row, not a named "Expand Details" link.
  //
  // IMPORTANT: the program List section keeps all three sub-tab grids (Spend
  // Lines / Suppliers / Parents) mounted at the same time. The *hidden* "Spend
  // Lines" grid renders spend-level rows ("<Supplier> Spend N") that also carry
  // `tr.k-master-row` and sit earlier in the DOM than the Suppliers-grid row,
  // and it finishes painting ~1s after the Suppliers grid. A bare
  // `tr.k-master-row` + hasText locator therefore races: once Spend Lines paints,
  // `.first()` resolves to a hidden spend row in the inactive tab panel and
  // `toBeVisible()` fails for the whole timeout (passes locally in isolation,
  // fails in the loaded pipeline). Scope to `:visible` rows so only the active
  // Suppliers grid is considered, and require the hierarchy expand cell so we
  // always target the on-screen supplier master row.
  const supplierRow = page
    .locator("tr.k-master-row:visible", { hasText: supplierName })
    .filter({ has: page.locator("td.k-hierarchy-cell a") })
    .first();
  await expect(supplierRow).toBeVisible({ timeout: 30_000 });
  await supplierRow.locator("td.k-hierarchy-cell a").first().click();

  // Expect both spends to be analyzed. The status renders as a text pill
  // ("Analyzed"), not a gridcell with that accessible name, so match on text.
  // The expanded child spend rows carry the supplier name; the supplier was
  // selected with spendCounts===2, so both spends being analyzed means at least
  // two "Analyzed" pills appear in the supplier-scoped rows after expanding.
  await expect
    .poll(
      async () =>
        page
          .getByRole("row")
          .filter({ hasText: supplier.entityName })
          .getByText("Analyzed", { exact: true })
          .count(),
      { timeout: 30_000 }
    )
    .toBeGreaterThanOrEqual(2);
});

// Program / List / Parent (analyzed) -> Suppliers (analyzed)
test(`in the list tab of the program section, if a parent status is analyzed,
      all its suppliers status should be analyzed @tc-7239 @us-7157 @negotiation-status`, async ({
  page
}: {
  page: Page;
}) => {
  // Same remount dance as the suppliers test above: land on Overview first so
  // the List navigation below always triggers a fresh Parents query for the
  // waiter to capture.
  await page.locator("#program_overview").click();
  await expect(page.locator("#program_overview.active")).toBeVisible({
    timeout: 30_000
  });

  const parentsResponsePromise = page.waitForResponse(
    isProgramListParentsGraphQl,
    { timeout: 60_000 }
  );
  await ProgramUtils.goToProgramListTab(page, { subtab: "Parents" });
  const responseProgramListTab = await parentsResponsePromise;

  const resultProgramListTab = await responseProgramListTab.json();

  const resultProgramListTabParsed = GraphQlUtils.getDataParents(
    resultProgramListTab
  );

  expect(
    isNullOrUndefined(resultProgramListTabParsed),
    "The parents query returned a collection"
  ).toBe(false);
  expect(
    resultProgramListTabParsed.length,
    "The grid has some parents"
  ).toBeGreaterThan(0);

  // Get an entity with "analyzed" status and 1 child
  const parent: {
    entityName: string;
  } = resultProgramListTabParsed.find(
    (item: any) =>
      item.negotiationStatus === "analyzed" &&
      item.negotiationStatusCodes.split(",").length === 1 &&
      item.supplierCounts === 1
  );

  expect(parent, "Parent not found").toBeTruthy();

  const parentName = parent.entityName;

  console.log("Parent name", parentName);

  // Expand the parent's child grid via the Kendo hierarchy cell, scoped to
  // visible rows so the hidden sibling sub-tab grids cannot steal the match
  // (see the suppliers test above for the full rationale).
  const parentRow = page
    .locator("tr.k-master-row:visible", { hasText: parentName })
    .filter({ has: page.locator("td.k-hierarchy-cell a") })
    .first();
  await expect(parentRow).toBeVisible({ timeout: 30_000 });
  await parentRow.locator("td.k-hierarchy-cell a").first().click();

  // The child supplier's name does not necessarily contain the parent's name,
  // so scope the assertion to the Kendo detail row that follows the expanded
  // master row instead of re-filtering rows by text. The parent was selected
  // with supplierCounts===1 and a single "analyzed" status code, so its only
  // supplier must render an "Analyzed" pill inside that detail row.
  const detailRow = parentRow.locator(
    "xpath=following-sibling::tr[contains(@class,'k-detail-row')][1]"
  );
  await expect
    .poll(
      async () => detailRow.getByText("Analyzed", { exact: true }).count(),
      { timeout: 30_000 }
    )
    .toBeGreaterThanOrEqual(1);
});

// Program / Edit / Supplier (analyzed) -> Spends (analyzed)
test(`in the program edit section, if a supplier status is analyzed,
      all its spends statuses should be analyzed @tc-7239 @us-7157 @negotiation-status`, async ({
  page
}: {
  page: Page;
}) => {
  // The edit grid (ListsCFEdit) only mounts for admin users behind the
  // "Edit Mode" toggle on the List tab — the kebab-menu "Edit" entry this test
  // used to click no longer exists. Switch to the admin session and redo the
  // spend-file / program-section navigation under it.
  await loginAsAdmin(page);
  await changeToSpendFile(page, SPEND_FILE_VERSION_NAME);
  await ProgramUtils.goToProgramSection(page);

  // Land on Overview first (same remount dance as the List tests above). The
  // header only paints once the program view is up, so wait for the tab rather
  // than clicking into whatever is on screen when the section opens.
  const overviewTab = page.locator("#program_overview");
  await expect(overviewTab).toBeVisible({ timeout: 60_000 });
  await overviewTab.click();
  await expect(page.locator("#program_overview.active")).toBeVisible({
    timeout: 30_000
  });

  // Enter the List tab and let the read-only grid's own query settle, so the
  // waiter armed for the edit grid below cannot capture it instead. Any of the
  // three List operations counts, and none arriving is not a failure either:
  // this only sequences the two fetches, and the tab's `active` class is the
  // deterministic signal that the navigation itself worked.
  const readOnlyListSettled = page
    .waitForResponse(isProgramListGraphQl, { timeout: 60_000 })
    .catch(() => null);
  await page.locator("#program_list").click();
  await expect(page.locator("#program_list.active")).toBeVisible({
    timeout: 60_000
  });
  await readOnlyListSettled;

  const editModeButton = page.locator("button.edit-btn", {
    hasText: "Edit Mode"
  });
  await expect(editModeButton).toBeVisible({ timeout: 30_000 });

  const editSuppliersPromise = page.waitForResponse(
    isProgramListSuppliersGraphQl,
    { timeout: 60_000 }
  );
  await editModeButton.click();
  const response = await editSuppliersPromise;

  const result = await response.json();

  const resultParsed = GraphQlUtils.getDataSuppliers(result);

  expect(
    isNullOrUndefined(resultParsed),
    "The edit-grid suppliers query returned a collection"
  ).toBe(false);
  expect(
    resultParsed.length,
    "The edit grid has some suppliers"
  ).toBeGreaterThan(0);

  // Get a supplier with "analyzed" status and 2 spends
  const supplier: {
    entityName: string;
  } = resultParsed.find(
    (item: any) =>
      item.negotiationStatus === "analyzed" &&
      item.negotiationStatusCodes.split(",").length === 1 &&
      item.spendCounts === 2
  );

  expect(supplier, "Supplier with two analyzed spends was found").toBeTruthy();

  const supplierName = supplier.entityName;

  console.log("Supplier name:", supplierName);

  // Expand the supplier's child grid via the Kendo hierarchy cell, scoped to
  // visible rows (see the first test's rationale).
  const supplierRow = page
    .locator("tr.k-master-row:visible", { hasText: supplierName })
    .filter({ has: page.locator("td.k-hierarchy-cell a") })
    .first();
  await expect(supplierRow).toBeVisible({ timeout: 30_000 });
  await supplierRow.locator("td.k-hierarchy-cell a").first().click();

  // The child grid renders statuses through the same text-pill column as the
  // read-only grid, so both spends being analyzed means at least two
  // "Analyzed" pills in the supplier-scoped rows.
  await expect
    .poll(
      async () =>
        page
          .getByRole("row")
          .filter({ hasText: supplierName })
          .getByText("Analyzed", { exact: true })
          .count(),
      { timeout: 30_000 }
    )
    .toBeGreaterThanOrEqual(2);
});

// Program / Edit / Parent (analyzed) -> Suppliers (analyzed)
test(`in the program edit section, if a parent status is analyzed,all its suppliers statuses should be analyzed @tc-7239 @us-7157 @negotiation-status`, async ({
  page
}: {
  page: Page;
}) => {
  // Same preamble as the suppliers edit test above: ProgramUtils
  // .goToProgramEditFromProgramOverview clicks a kebab-menu "Edit" entry that
  // no longer exists, and ListsCFEdit only mounts for admin users behind the
  // "Edit Mode" toggle on the List tab.
  await loginAsAdmin(page);
  await changeToSpendFile(page, SPEND_FILE_VERSION_NAME);
  await ProgramUtils.goToProgramSection(page);

  // Land on Overview first (same remount dance as the List tests above). The
  // header only paints once the program view is up, so wait for the tab rather
  // than clicking into whatever is on screen when the section opens.
  const overviewTab = page.locator("#program_overview");
  await expect(overviewTab).toBeVisible({ timeout: 60_000 });
  await overviewTab.click();
  await expect(page.locator("#program_overview.active")).toBeVisible({
    timeout: 30_000
  });

  // Enter the List tab and let the read-only grid's own query settle, so the
  // waiter armed for the edit grid below cannot capture it instead. Any of the
  // three List operations counts, and none arriving is not a failure either:
  // this only sequences the two fetches, and the tab's `active` class is the
  // deterministic signal that the navigation itself worked.
  const readOnlyListSettled = page
    .waitForResponse(isProgramListGraphQl, { timeout: 60_000 })
    .catch(() => null);
  await page.locator("#program_list").click();
  await expect(page.locator("#program_list.active")).toBeVisible({
    timeout: 60_000
  });
  await readOnlyListSettled;

  const editModeButton = page.locator("button.edit-btn", {
    hasText: "Edit Mode"
  });
  await expect(editModeButton).toBeVisible({ timeout: 30_000 });

  // ListsCFEdit fetches all three entity levels when it mounts, so the parents
  // query fires as Edit Mode opens. Selecting the Parents sub-tab afterwards
  // only flips which grid is displayed — changeTabFromGrid sets the index and
  // does not refetch — so the waiter has to wrap the toggle, not the sub-tab
  // click.
  const editParentsPromise = page.waitForResponse(
    isProgramListParentsGraphQl,
    { timeout: 60_000 }
  );
  await editModeButton.click();
  const response = await editParentsPromise;

  const result = await response.json();

  const resultParsed = GraphQlUtils.getDataParents(result);

  expect(
    isNullOrUndefined(resultParsed),
    "The edit-grid parents query returned a collection"
  ).toBe(false);
  expect(
    resultParsed.length,
    "The edit grid has some parents"
  ).toBeGreaterThan(0);

  // Get a parent with "analyzed" status and 1 child
  const parent: {
    entityName: string;
  } = resultParsed.find(
    (item: any) =>
      item.negotiationStatus === "analyzed" &&
      // A level with no statuses carries a null/undefined
      // negotiationStatusCodes. "".split(",") is [""] (length 1), so
      // defaulting to "" would make such a row match instead of being
      // excluded - require an actual string first.
      typeof item.negotiationStatusCodes === "string" &&
      item.negotiationStatusCodes.split(",").length === 1 &&
      item.supplierCounts === 1
  );

  expect(
    parent,
    "Parent with a single analyzed supplier was found"
  ).toBeTruthy();

  const parentName = parent.entityName;

  console.log("Parent name:", parentName);

  // Show the Parents grid. The three edit grids stay mounted together and the
  // inactive ones carry `hidden-grid` (display: none), so only the selected
  // tab strip is matchable by role and the `:visible` row filter below only
  // ever resolves inside this grid.
  await page.getByRole("tab", { name: "Parents" }).click();

  // Expand the parent's child grid via the Kendo hierarchy cell.
  const parentRow = page
    .locator("tr.k-master-row:visible", { hasText: parentName })
    .filter({ has: page.locator("td.k-hierarchy-cell a") })
    .first();
  await expect(parentRow).toBeVisible({ timeout: 30_000 });
  await parentRow.locator("td.k-hierarchy-cell a").first().click();

  // The child supplier's name does not necessarily contain the parent's name,
  // so scope the assertion to the Kendo detail row that follows the expanded
  // master row. The parent was selected with supplierCounts===1 and a single
  // "analyzed" status code, so its only supplier must render an "Analyzed"
  // pill inside that detail row.
  const detailRow = parentRow.locator(
    "xpath=following-sibling::tr[contains(@class,'k-detail-row')][1]"
  );
  await expect
    .poll(
      async () => detailRow.getByText("Analyzed", { exact: true }).count(),
      { timeout: 30_000 }
    )
    .toBeGreaterThanOrEqual(1);
});
