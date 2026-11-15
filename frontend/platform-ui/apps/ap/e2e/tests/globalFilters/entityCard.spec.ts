import {expect, test} from "@playwright/test";

import {
  changeToSpendFile, ensureDefaultLogin,
  goToEntityCard,
  goToHomeSection
} from "../utils/Utils";
import {ApiWaitersUtils, GlobalFiltersUtils} from "../utils";
import {locators} from "../utils/locators";

const spendFileName = "PageroFull_20230308_2.xlsx (Ver. 1)";
test.beforeEach(async ({page}) => {
  await ensureDefaultLogin(page);
  await changeToSpendFile(page, spendFileName);
  await page.waitForSelector(".loading-modal", {state: "detached"});
})
test("number of suppliers change on filters applied change @flakyResolved @entities @global-filters @entity @ui @us-6300", async ({
                                                                                                                            page
                                                                                                                          }) => {
  // Persisted state.json (`ada-app`) carries a selected program for the
  // default user, so changeToSpendFile can leave the SPA on
  // /home/manage-module instead of /home/home-dashboard. goToEntityCard
  // asserts the latter, so click Home first when not already there.
  if (!page.url().includes("/home-dashboard")) {
    await page.locator(locators.sidebar.home).click();
    await page.waitForURL(/.*\/home\/home-dashboard/);
  }

  const [getEntityCardsResponse] = await Promise.all([
    ApiWaitersUtils.waitForEntityCardGetEntityCards(page),
    goToEntityCard(page)
  ]);

  const entityCardsCount = (await getEntityCardsResponse.json()).length;

  await GlobalFiltersUtils.openModal(page);

  await GlobalFiltersUtils.openCategory(page, "Industry");

  await Promise.all([
    GlobalFiltersUtils.waitForFieldResponse(page, "commodity"),
    GlobalFiltersUtils.openField(page, "Commodity")
  ]);

  await GlobalFiltersUtils.checkOptionInField(page, {
    fieldName: "Commodity",
    optionName: "Computers"
  });

  const [getEntityCardsResponseFiltersApplied] = await Promise.all([
    ApiWaitersUtils.waitForEntityCardGetEntityCards(page),
    await GlobalFiltersUtils.applyFilters(page)
  ]);

  let entityCardsFiltersAppliedCount = (
    await getEntityCardsResponseFiltersApplied.json()
  ).length;

  expect(entityCardsCount).toBeGreaterThan(entityCardsFiltersAppliedCount);

  console.log("Cleaning up...");

  await GlobalFiltersUtils.clearAllFiltersFromNavbar(page);
});

/**
 * US-17561 AC-07 / Bug#18535: removing the filter from INSIDE an open entity card has to
 * reload that card, not just the supplier list behind it. The regression it locks in:
 * EntityCardOverview only cleared the Apollo cache, so the card's REST figures (starting
 * with /spends) kept the filtered numbers until the card was closed and reopened.
 */
test("removing the global filter from inside the entity card refetches its data unfiltered @entities @global-filters @entity @ui @us-17561", async ({
  page
}) => {
  if (!page.url().includes("/home-dashboard")) {
    await page.locator(locators.sidebar.home).click();
    await page.waitForURL(/.*\/home\/home-dashboard/);
  }

  await Promise.all([
    ApiWaitersUtils.waitForEntityCardGetEntityCards(page),
    goToEntityCard(page)
  ]);

  // Apply a filter first, so the card is opened already scoped by it
  await GlobalFiltersUtils.openModal(page);

  await GlobalFiltersUtils.openCategory(page, "Industry");

  await Promise.all([
    GlobalFiltersUtils.waitForFieldResponse(page, "commodity"),
    GlobalFiltersUtils.openField(page, "Commodity")
  ]);

  await GlobalFiltersUtils.checkOptionInField(page, {
    fieldName: "Commodity",
    optionName: "Computers"
  });

  await Promise.all([
    ApiWaitersUtils.waitForEntityCardGetEntityCards(page),
    GlobalFiltersUtils.applyFilters(page)
  ]);

  // Open the first supplier left in the filtered list: its /spends carries the filter
  const [filteredSpends] = await Promise.all([
    page.waitForResponse(
      (response) => response.url().includes("/spends") && response.ok()
    ),
    page.locator(".current-name").first().click()
  ]);

  expect(
    new URL(filteredSpends.url()).searchParams.get("globalFilter")
  ).toBeTruthy();

  // Remove the filter from the notice inside the card: the card must refetch without it
  const [unfilteredSpends] = await Promise.all([
    page.waitForResponse(
      (response) => response.url().includes("/spends") && response.ok()
    ),
    page.getByTestId("global-filter-notice-remove").click()
  ]);

  // EntityCardOverview.onRemoveGlobalFilter resets the store to
  // `{ filters: [], logic: 'and' }` rather than clearing it to null/undefined
  // (GlobalFilterNotice's own field-level removal follows the same shape), and the
  // request builder always serializes the current store state onto `/spends` — so an
  // empty-but-present `globalFilter` param is the expected "no filter" representation,
  // not a sign the filter is still applied. What Bug#18535 actually guards against is
  // the *filters* staying non-empty (stale filtered figures), so assert on that.
  const unfilteredGlobalFilter = new URL(unfilteredSpends.url()).searchParams.get(
    "globalFilter"
  );
  const parsedUnfilteredGlobalFilter = unfilteredGlobalFilter
    ? JSON.parse(unfilteredGlobalFilter)
    : null;

  expect(parsedUnfilteredGlobalFilter?.filters ?? []).toEqual([]);
});
