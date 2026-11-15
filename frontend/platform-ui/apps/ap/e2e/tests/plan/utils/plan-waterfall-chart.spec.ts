import { expect, test } from "@playwright/test";
import type { Locator, Page } from "@playwright/test";
import translation from "@ada/design-system/locales/languages/en.json";
import { locators } from "../../utils/locators";
import { changeToSpendFile, ensureDefaultLogin } from "../../utils/Utils";

const given = {
  company: "Company Test",
  spendfile: "Pagero_DifferentBuyers.xlsx (Ver. 1)",
  program: "Main Program",
  user: "joel+testnotadmin@calculum.ai",
  plan: "Plan 1",
  contractual: { name: "Contractual" },
  target: { name: "Target" },
};

/**
 * Shape of POST /api/plans/phases-waterfall.
 *
 * `byTerms` carries the contractual starting point followed by one delta per
 * phase and a trailing `final` entry the view drops; `original` carries the
 * running totals, so its last entry is the value the Target bar must show.
 */
type WaterfallItem = {
  index: number;
  itemTitle: string;
  amount: number;
  phaseNumber?: number;
  phaseName?: string;
};

type WaterfallPayload = {
  byTerms: WaterfallItem[];
  original: WaterfallItem[];
};

const WATERFALL_URL = "/api/plans/phases-waterfall";

/**
 * Decimal places the amounts are compared to.
 *
 * The waterfall amounts are weighted payment-term figures, not integers, and
 * two of the numbers this spec compares are accumulated rather than read: the
 * summary column is a running total Kendo sums itself, and the assertion below
 * sums the phase deltas in JavaScript. Both drift from the total the API
 * computed in the last bits of the double, so every amount comparison carries a
 * tolerance instead of asking for exact equality. Two decimals is finer than
 * anything the chart can show and coarse enough to absorb that drift.
 */
const AMOUNT_PRECISION = 2;

/**
 * The bars the chart is expected to draw, derived from the payload rather than
 * hardcoded.
 *
 * HomePlanV2 feeds Kendo the `byTerms` amounts minus the `final` entry, and
 * WaterfallChart appends a summary column so Kendo computes the running total
 * itself. The plan fixture gains and loses phases on the shared environment, so
 * the bar count is read from the response; what the test pins is the contract
 * between the payload and what is plotted.
 */
function expectedBarValues(payload: WaterfallPayload): number[] {
  const deltas = payload.byTerms.filter((item) => item.itemTitle !== "final");
  const total = payload.original[payload.original.length - 1].amount;

  return [...deltas.map((item) => item.amount), total];
}

/**
 * Asserts the rendered bars against the payload.
 *
 * The values are read from each point's `aria-label`, which carries the raw
 * number, instead of the visible label, which goes through the big-number
 * formatter and renders "94.0" for 94. Indexing into `text:nth-child(N)` was
 * what made this test fail once the plan grew from one phase to three: the
 * label at a fixed SVG position stopped being the Target bar.
 */
async function expectWaterfallToRender(
  chartSurface: Locator,
  payload: WaterfallPayload,
): Promise<void> {
  const expected = expectedBarValues(payload);
  const points = chartSurface.locator("g.k-chart-point");

  await expect(async () => {
    const rendered = await points.evaluateAll((nodes) =>
      nodes.map((node) => node.getAttribute("aria-label")),
    );
    expect(
      rendered,
      `The chart drew ${rendered.length} bars and the payload describes ${expected.length}`,
    ).toHaveLength(expected.length);
    rendered.forEach((label, index) => {
      expect(
        label,
        `The bar at position ${index} carries no aria-label`,
      ).not.toBeNull();
      expect(
        Number(label),
        `The bar at position ${index} plots ${label}`,
      ).toBeCloseTo(expected[index], AMOUNT_PRECISION);
    });
  }).toPass({ timeout: 20000 });

  // The summary column is the sum of the contractual start and every phase
  // delta. Asserting it here keeps the check meaningful when the payload itself
  // changes: a chart that plotted the payload but broke the waterfall still fails.
  const deltas = payload.byTerms.filter((item) => item.itemTitle !== "final");
  const sum = deltas.reduce((total, item) => total + item.amount, 0);
  expect(
    sum,
    "The Target column is not the sum of the contractual start and the phase deltas",
  ).toBeCloseTo(
    payload.original[payload.original.length - 1].amount,
    AMOUNT_PRECISION,
  );

  // The two ends of the waterfall are fixed by the view: `initial` renders as
  // "Contractual" (setColumnNames) and the summary column as "Target"
  // (WaterfallChart). They anchor the chart no matter how many phases sit between.
  await expect(chartSurface).toContainText(given.contractual.name);
  await expect(chartSurface).toContainText(given.target.name);
}

function waitForWaterfallPayload(page: Page): Promise<WaterfallPayload> {
  return page
    .waitForResponse(
      (response) => response.url().includes(WATERFALL_URL) && response.ok(),
    )
    .then((response) => response.json() as Promise<WaterfallPayload>);
}

test.beforeEach(async ({ page }) => {
  await ensureDefaultLogin(page);
  await page.goto("/");
  await changeToSpendFile(page, given.spendfile);
  await page.waitForSelector(".loading-modal", { state: "detached" });
});

test("Test for review the waterfall chart in plan @integrated @tc-11154", async ({
  page,
}) => {
  console.log("Select plan section");
  // The plan view fetches the waterfall once the phase cards resolve, so the
  // waiter is armed before the section is opened.
  const planOnlyPayload = waitForWaterfallPayload(page);

  await Promise.all([
    page.waitForResponse(
      (responsePlans) =>
        responsePlans.url().includes("/plans?program.spendFileVersion.uuid") &&
        responsePlans.ok(),
    ),
    page.locator(locators.sidebar.plan).click(),
  ]);

  // Selecting the chart only flips a local flag - `selectPlanChart` issues no
  // request - so no waiter belongs behind this click.
  await page
    .locator(
      "div.d-flex.align-items-baseline.selected-chart-container.cursor-pointer.bg-white",
      {
        hasText: translation.global.paymentTermsOpportunity,
      },
    )
    .click();

  const chartSurface = page
    .locator("#container-main-id")
    .locator(".k-chart-surface");

  console.log("*** Expecting the plan-only waterfall to match its payload");
  await expectWaterfallToRender(chartSurface, await planOnlyPayload);
  console.log("*** Plan-only waterfall OK");

  console.log('Select option "All suppliers" in dropdown');
  await page.getByTestId("active-metrics-dropdown").click();

  // "All suppliers" re-runs the fetch with onlyPlan=false, so the chart has to
  // follow the new payload rather than keep the previous numbers.
  const [allSuppliersPayload] = await Promise.all([
    waitForWaterfallPayload(page),
    page
      .locator("#custom-dropdown-items-metrics-showing")
      .getByText("All suppliers")
      .click(),
  ]);

  console.log("*** Expecting the all-suppliers waterfall to match its payload");
  await expectWaterfallToRender(chartSurface, allSuppliersPayload);
  console.log("*** All-suppliers waterfall OK");
});

test.afterEach(async ({ page }) => {
  await ensureDefaultLogin(page);
});
