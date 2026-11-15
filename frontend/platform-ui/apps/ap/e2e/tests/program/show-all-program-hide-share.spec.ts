// Test for Feature: 1677

import { expect, Locator, test } from "@playwright/test";
import { changeToSpendFile, ensureDefaultLogin } from "../utils/Utils";
import { locators } from "../utils/locators";
import { ProgramUtils } from "../utils";

const spendFileName = "Spend Contractual Value.xlsx (Ver. 3)";

test.beforeEach(async ({ page }) => {
  await ensureDefaultLogin(page);
  await page.goto("/");
  // 60s rather than the 15s action default: this is a page-load settle, and on
  // the shared environment the overlay has stayed up past 15s while another run
  // recalculated a spend file.
  await page.waitForSelector(".loading-modal", {
    state: "detached",
    timeout: 60_000
  });
  await changeToSpendFile(page, spendFileName);
});

/**
 * Read the labels of an open menu, trimmed and with the empty entries dropped
 * (the menus interleave icons and separators with the labelled actions).
 */
async function menuLabels(entries: Locator): Promise<string[]> {
  return (await entries.allInnerTexts())
    .map(label => label.trim())
    .filter(label => label.length > 0);
}

test("Analize > Programs > Hidden Option Share @integrated @analyze @program @us-1677", async ({
  page
}) => {
  await ProgramUtils.goToProgramSection(page, { allPrograms: true });

  // Wait for a rendered card - SkeletonCard shares the `.card-v2` root and
  // only the rendered one carries the title span - and then pin the card by
  // position. Opening the kebab swaps the whole card body for the menu, title
  // span included, so a locator that keeps filtering on that span stops
  // matching this card mid-test and silently re-resolves to the next one,
  // which has no open menu.
  await expect(
    page.locator("div.card-v2 span.text-font-600-24").first()
  ).toBeVisible({ timeout: 30_000 });
  const card = page.locator(locators.program.card).first();

  // The card kebab is `span.options` — CalculumKebab renders a bare <svg>, so
  // locators.program.menuCard (`.icon-svg__button-18`, the class other icon
  // components carry) matches nothing on this card.
  await card.locator("span.options").click();

  // AnalyzeProgramCard replaces the card body with its menu, one labelled row
  // per action under `.options-menu-card`. Enumerate every row: the previous
  // version scanned every span on the card and started its loop at index 1, so
  // a "Share" in the first position would have gone unnoticed.
  const cardMenuEntries = card.locator(".options-menu-card span");
  await expect(cardMenuEntries.first()).toBeVisible({ timeout: 15_000 });
  const cardMenuLabels = await menuLabels(cardMenuEntries);
  console.log("Program card menu entries:", cardMenuLabels);
  expect(
    cardMenuLabels,
    "The program card menu offers a Share option"
  ).not.toContain("Share");

  // Close the menu — it hides the card body, SHOW button included — and open
  // the program view.
  await card.locator(".svg-icon-18").first().click();
  const showButton = card.getByRole("button", { name: "SHOW" });
  await expect(showButton).toBeVisible({ timeout: 15_000 });
  await showButton.click();

  // Same check on the program view's own options menu.
  const optionsButton = page.locator(
    locators.headerMenu.programHeader.keebabMenuButton
  );
  await expect(optionsButton).toBeVisible({ timeout: 60_000 });
  await optionsButton.click();

  const viewMenuEntries = page.locator("#options-menu li");
  await expect(viewMenuEntries.first()).toBeVisible({ timeout: 15_000 });
  const viewMenuLabels = await menuLabels(viewMenuEntries);
  console.log("Program view options entries:", viewMenuLabels);
  expect(
    viewMenuLabels,
    "The program view options menu offers a Share option"
  ).not.toContain("Share");
});

test("Analize > Programs > Verify if Show all programs @integrated @analyze @program @us-1677", async ({
  page
}) => {
  await ProgramUtils.goToProgramSection(page, { allPrograms: true });

  const myProgramsTab = page.locator("#myProgramsTab");
  const allProgramsTab = page.locator("#allProgramsTab");
  await expect(myProgramsTab).toBeVisible({ timeout: 30_000 });
  await expect(allProgramsTab).toBeVisible({ timeout: 30_000 });

  // Both scopes are served by the same
  // `/spend_file_versions/<uuid>/analyze_programs` URL — "all" travels as a
  // request parameter, not in the path — so the waiter cannot tell them apart
  // and the previous hardcoded version UUID bought nothing. Key off the tab's
  // own `active` class and the rendered card count instead. Note that
  // changeTypeOfPrograms returns early when the tab is already selected, which
  // is why the click is not paired with a response wait.
  const renderedCards = page
    .locator(locators.program.card)
    .filter({ has: page.locator("span.text-font-600-24") });

  const countCardsFor = async (tab: Locator, tabId: string): Promise<number> => {
    await tab.click();
    await expect(page.locator(`${tabId}.active`)).toBeVisible({
      timeout: 30_000
    });
    // The panel keeps the previous cards on screen while it reloads, so settle
    // on a count that stops moving rather than reading it straight away.
    let previous = -1;
    await expect
      .poll(
        async () => {
          const current = await renderedCards.count();
          const settled = current === previous;
          previous = current;

          return settled;
        },
        { timeout: 60_000, intervals: [1_000, 2_000, 2_000] }
      )
      .toBe(true);

    return renderedCards.count();
  };

  const myProgramsCount = await countCardsFor(myProgramsTab, "#myProgramsTab");
  console.log("My programs count: " + myProgramsCount);

  const allProgramsCount = await countCardsFor(
    allProgramsTab,
    "#allProgramsTab"
  );
  console.log("All programs count: " + allProgramsCount);

  expect(
    allProgramsCount,
    "All programs shows fewer cards than My programs"
  ).toBeGreaterThanOrEqual(myProgramsCount);
});
