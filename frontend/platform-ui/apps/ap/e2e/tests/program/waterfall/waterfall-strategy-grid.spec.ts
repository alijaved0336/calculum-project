import { expect, test } from "@playwright/test";
import { changeToSpendFile, ensureDefaultLogin } from "../../utils/Utils";
import { locators } from "../../utils/locators";
import { ProgramUtils } from "../../utils";

const spendFileName = "PageroFull_20230308_2.xlsx (Ver. 1)";

test.beforeEach(async ({ page }) => {
  await ensureDefaultLogin(page);
  await page.goto("/");
  await changeToSpendFile(page, spendFileName);
});

test("Waterfall Strategy Grid @integrated @us-7203 @waterfall @program", async ({
  page
}) => {
  test.setTimeout(180_000);

  // `wait: false`: goToProgramSection's default waits up to 15s for
  // /analyze_programs, and clicking the sidebar entry for the section the app
  // is already showing fires no request at all - a spec that runs after another
  // program spec then dies in the helper before reaching its own first line.
  // The visibility race below is the deterministic signal that the section
  // opened.
  await ProgramUtils.goToProgramSection(page, { wait: false });

  // The sidebar opens the program card list when no program is active for this
  // spend file version and a program view otherwise; the Waterfall tab only
  // exists in the second one.
  const showButton = page
    .locator("div.card-v2")
    .first()
    .getByRole("button", { name: "SHOW" });
  const waterfallTab = page.locator(
    locators.headerMenu.programHeader.waterfall
  );
  await expect(
    showButton.or(waterfallTab).first(),
    "The sidebar opened neither the program card list nor a program view"
  ).toBeVisible({ timeout: 60_000 });

  if (await showButton.isVisible()) {
    console.log("Program card list opened - showing the first program");
    await showButton.click();
  }
  await expect(waterfallTab).toBeVisible({ timeout: 60_000 });

  const waterfallChartPromise = page.waitForResponse(
    response =>
      response.url().includes("/api/analyze/program/waterfall-chart") &&
      response.ok(),
    { timeout: 60_000 }
  );
  await waterfallTab.click();
  const waterfallData = await (await waterfallChartPromise).json();
  const steps: Array<{ period: string }> = waterfallData?.byTerms ?? [];
  console.log("waterfall-chart steps:", steps.map(step => step.period).join(", "));

  expect(
    steps.length,
    "The waterfall endpoint returned no strategy steps to chart"
  ).toBeGreaterThan(0);

  // Kendo renders one `g.k-chart-point` per waterfall step, each holding the
  // bar's own path. The previous version hunted for the literal label "106.4k"
  // and, when it did not find it, logged "Element not found" and finished
  // green - so it reported success for a chart that had not rendered at all.
  const bars = page.locator(".waterfall-chart .k-chart-point path");
  await expect
    .poll(async () => bars.count(), { timeout: 60_000 })
    .toBeGreaterThan(0);

  // Click the tallest bar rather than the first one: a waterfall draws its
  // near-zero steps as a few-pixel sliver, and a click at the centre of one of
  // those lands outside the series as often as not. The chart hit-tests the
  // click on its own surface, so any point inside a bar raises seriesclick.
  const barCount = await bars.count();
  let target = bars.first();
  let widestArea = -1;
  for (let index = 0; index < barCount; index++) {
    const box = await bars.nth(index).boundingBox();

    if (box === null) {
      continue;
    }

    const area = box.width * box.height;

    if (area > widestArea) {
      widestArea = area;
      target = bars.nth(index);
    }
  }

  expect(
    widestArea,
    "None of the waterfall bars has a measurable area to click"
  ).toBeGreaterThan(0);

  const gridQueryPromise = page.waitForResponse(
    response =>
      response.url().includes("/api/graphql") && response.ok(),
    { timeout: 60_000 }
  );
  // Forced: Kendo paints a translucent white highlight path over the hovered
  // bar, and that overlay sits on top of the series path for the whole click
  // budget, so the actionability check never clears. The chart hit-tests the
  // click against its own surface by coordinates, so a click delivered at the
  // bar's centre still resolves to that data point.
  await target.click({ force: true });
  await gridQueryPromise;

  // Selecting a strategy is what mounts the grid section: it renders only
  // while `strategyCategorySelected` is set.
  const strategyView = page.locator("#selected-strategy-view");
  await expect(
    strategyView,
    "Clicking a waterfall bar did not open the strategy grid"
  ).toBeVisible({ timeout: 60_000 });

  // The section names the strategy it is showing, and the grid underneath is
  // the point of the story.
  await expect.soft(strategyView.locator("span.grid-title")).not.toBeEmpty();
  await expect(strategyView.locator("tr.k-master-row").first()).toBeVisible({
    timeout: 60_000
  });
});
