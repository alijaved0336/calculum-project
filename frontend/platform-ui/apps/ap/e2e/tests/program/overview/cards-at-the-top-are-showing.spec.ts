import { expect, test, Page, Response } from "@playwright/test";

// Global utils
import {
  changeToSpendFile,
  ensureDefaultLogin,
  formatBigNumber,
  changeToProgram,
} from "../../utils/Utils";
// The copy in utils/Utils is the deprecated one; components/index.ts is the
// maintained implementation and the only one that accepts a partial expectation.
import { assertBigNumberThreeColsIsShowingProperly } from "../../components";
import { locators } from "../../utils/locators";

// Types
import { BigNumberThreeCols } from "../../types";

const spendFileName = "PageroFull_20230308_2.xlsx (Ver. 1)";
const programName = "Financing Harmonization";

/**
 * Expected Values. The card renders one BarsComponent per section; the old
 * standalone "Actual" section is now the "/ AvgDP:" extra value inside the
 * Contractual bar, and the "Expected" bar only renders when the company shows
 * expected opportunity values.
 */
const expectedFirstCard = {
  cardTitle: "Payment Terms (days)",
  firstSectionTitle: "Contractual",
  secondSectionTitle: "Opportunity",
  thirdSectionTitle: "Expected"
};

const expectedThirdCard = {
  cardTitle: "Spend & Entities",
  bigNumberTitle: "Spend Volume",
  numberLeftTitle: "Parents",
  numberCenterTitle: "Suppliers",
  numberRightTitle: "Spend Lines"
};

/**
 * Open the program section and return the body of the overview request named
 * by `matcher`, having made `programName` the active program.
 *
 * The sidebar opens a program view when one is already active for this spend
 * file version, and the program card list otherwise. Only the program view
 * fetches the overview endpoints on landing, so the waiter is armed for that
 * case and left to lapse for the other one, where showing the target program
 * is what triggers the fetch. Every body is read inside its own chain, as soon
 * as the response arrives, so it can never be consumed late against a card the
 * view has already re-rendered.
 */
async function openProgramOverviewAndWaitFor(
  page: Page,
  matcher: (response: Response) => boolean,
  endpointLabel: string
): Promise<any> {
  const waitForOverviewCall = () =>
    page.waitForResponse(matcher, { timeout: 60_000 });

  const landingCall: Promise<any> = waitForOverviewCall()
    .then(response => response.json())
    .catch(() => null);
  await page.locator(locators.sidebar.program).click();

  const programCardShow = page
    .locator("div.card-v2")
    .filter({
      has: page.locator("span").getByText(programName, { exact: true })
    })
    .first()
    .getByRole("button", { name: "SHOW" });
  // #program_overview is the program view's own tab, present whether or not
  // the company has the multi-program dropdown.
  const programOverviewTab = page.locator("#program_overview");
  await expect(
    programCardShow.or(programOverviewTab).first(),
    "The sidebar opened neither the program card list nor a program view"
  ).toBeVisible({ timeout: 60_000 });

  if (await programCardShow.isVisible()) {
    // No program was active, so the card list opened: showing the target
    // program is what fetches its overview data.
    console.log("Program card list opened - showing " + programName);
    const cardCallPromise = waitForOverviewCall();
    await programCardShow.click();

    return (await cardCallPromise).json();
  }

  let result = await landingCall;
  expect(
    result,
    `the program view did not call ${endpointLabel} on landing`
  ).not.toBeNull();

  // Select the target program from the overview dropdown (it only exists in
  // this section). Changing programs refetches the overview; if the target is
  // already active, the landing response above is the one to assert against.
  const programDropdown = page
    .locator('[data-testid="active-program-dropdown"]')
    .first();
  await expect(programDropdown).toBeVisible({ timeout: 30_000 });
  // The dropdown's textContent concatenates the selected name with every
  // (hidden) option, so read the selected-name span specifically.
  const currentProgram = (
    (await programDropdown
      .locator(".custom-dropdown-selected .title-dropdown-parent span")
      .first()
      .textContent()) ?? ""
  ).trim();

  if (currentProgram !== programName) {
    const changedCallPromise = waitForOverviewCall();
    await changeToProgram(page, programName);
    result = await (await changedCallPromise).json();
  }

  return result;
}

test.describe.serial(
  "Validation Cards",
  async () => {

test.beforeEach(async ({ page }) => {
  // Ensure default user is logged in
  await ensureDefaultLogin(page);
  await page.goto("/");
  // Change spend file. The program itself is selected inside each test once
  // the program section is open: the program dropdown only exists there, so
  // calling changeToProgram from the home dashboard is a no-op, and the old
  // /api/plans/plans-summary wait no longer fires on this route.
  await changeToSpendFile(page, spendFileName);
});

/**
 * Card 1: Payment Terms
 */
test("card 1 - payment terms card is showing properly @integrated @ui @us-4477 @tc-4918", async ({
  page
}) => {
  const result = await openProgramOverviewAndWaitFor(
    page,
    response =>
      response.url().includes("/api/analyze/programs/payment-terms") &&
      response.ok(),
    "/api/analyze/programs/payment-terms"
  );

  // The view rounds every value it renders (expected is passed through as-is).
  const contractual =
    result.contractualAvgPaymentTerms !== null
      ? Math.round(result.contractualAvgPaymentTerms)
      : null;
  const actual = Math.round(result.currentAvgPaymentTerms);
  const proposed = Math.round(result.proposedAvgPaymentTerms);

  console.log("payment-terms API:", JSON.stringify(result));

  // Card title and its advanced tooltip anchor
  const card = page
    .locator(".card")
    .filter({ has: page.locator("h5", { hasText: expectedFirstCard.cardTitle }) })
    .first();
  await expect(
    card.locator("h5", { hasText: expectedFirstCard.cardTitle })
  ).toBeVisible();
  await expect.soft(card.locator(".program-payment-terms")).toBeVisible();

  // Contractual bar: main value is the contractual average (falls back to the
  // actual average when contractual is null), with the actual average shown
  // inline as "/ AvgDP:" when it is positive.
  const contractualBar = card
    .locator(".line-chart")
    .filter({ hasText: expectedFirstCard.firstSectionTitle })
    .first();
  await expect(contractualBar).toBeVisible();
  await expect
    .soft(contractualBar.locator(".value-container span"))
    .toHaveText(String(contractual ?? actual));
  await expect.soft(contractualBar.getByTestId("tooltip-icon")).toBeVisible();
  await expect.soft(contractualBar.locator(".first-chartline")).toBeVisible();
  if (actual > 0 && (await contractualBar.locator(".avg-days-paid-value").count()) > 0) {
    await expect
      .soft(contractualBar.locator(".avg-days-paid-value"))
      .toHaveText(String(actual));
  }

  // Opportunity bar: main value is the proposed average.
  const opportunityBar = card
    .locator(".line-chart")
    .filter({ hasText: expectedFirstCard.secondSectionTitle })
    .first();
  await expect(opportunityBar).toBeVisible();
  await expect
    .soft(opportunityBar.locator(".value-container span"))
    .toHaveText(String(proposed));
  await expect.soft(opportunityBar.getByTestId("tooltip-icon")).toBeVisible();
  await expect.soft(opportunityBar.locator(".first-chartline")).toBeVisible();

  // Expected bar: renders only when the company shows expected opportunity
  // values, so assert it only when present.
  const expectedBar = card
    .locator(".line-chart")
    .filter({ hasText: expectedFirstCard.thirdSectionTitle })
    .first();
  if ((await expectedBar.count()) > 0 && (await expectedBar.isVisible())) {
    console.log("Expected bar is rendered - asserting its value");
    if (typeof result.expectedAvgPaymentTerms === "number") {
      await expect
        .soft(expectedBar.locator(".value-container span"))
        .toHaveText(String(result.expectedAvgPaymentTerms));
    }
    await expect.soft(expectedBar.locator(".first-chartline")).toBeVisible();
  } else {
    console.log("Expected bar is not rendered for this company - skipping it");
  }
});

/**
 * Card 3: Spend Card
 */
test("card 3 - spend card is showing properly @integrated @ui @us-4470 @tc-4987", async ({
  page
}) => {
  // e.g. result:
  // groupCount: 11
  // spendCount: 100
  // supplierCount: 78
  // totalSpend: 13203892.18
  // ultimateParentCount: 69
  const result = await openProgramOverviewAndWaitFor(
    page,
    response =>
      response.url().endsWith("/api/analyze/programs/spend-info") &&
      response.ok(),
    "/api/analyze/programs/spend-info"
  );

  console.log("spend-info API:", JSON.stringify(result));

  // The three counts go through getNumberWithDecimals(value, 0), which is an
  // Intl.NumberFormat - a count of four digits or more is rendered with a
  // thousands separator, so String(value) is not the rendered text.
  const formatCount = (value: number): string =>
    new Intl.NumberFormat("en-US", {
      maximumFractionDigits: 0,
      minimumFractionDigits: 0
    }).format(value);

  // When the forecast-volume feature is on and the spend file carries a
  // forecast, the card renames itself "Spend (F) & Entities", appends " (F)"
  // to the big-number title and swaps the big number for the forecast value.
  // The three counts are unaffected, so assert the volume only in the plain
  // variant and say so in the log rather than asserting a value this test
  // does not receive from spend-info.
  const forecastTitle = page
    .locator(".card")
    .getByRole("heading", { name: "Spend (F) & Entities" });
  const showsForecastVolume = (await forecastTitle.count()) > 0;

  if (showsForecastVolume) {
    console.log(
      "The card is showing the forecast volume - the Spend Volume value comes " +
        "from the forecast, not from spend-info, so only the counts are asserted"
    );
  }

  const expected: Partial<BigNumberThreeCols> = {
    cardTitle: showsForecastVolume
      ? "Spend (F) & Entities"
      : expectedThirdCard.cardTitle,
    bigNumberTitle: showsForecastVolume
      ? `${expectedThirdCard.bigNumberTitle} (F)`
      : expectedThirdCard.bigNumberTitle,
    // formatBigNumber mirrors StringUtils.formatBigNumbers for every magnitude
    // this fixture reaches; they only diverge at exact powers of ten and above
    // a trillion. A falsy totalSpend leaves the view rendering nothing at all
    // - the value is passed as undefined - so there is no text to compare.
    bigNumberValue:
      showsForecastVolume || !result.totalSpend
        ? ""
        : formatBigNumber(result.totalSpend),
    numberLeftTitle: expectedThirdCard.numberLeftTitle,
    numberLeftValue: formatCount(result.ultimateParentCount ?? 0),
    numberCenterTitle: expectedThirdCard.numberCenterTitle,
    numberCenterValue: formatCount(result.supplierCount ?? 0),
    numberRightTitle: expectedThirdCard.numberRightTitle,
    numberRightValue: formatCount(result.spendCount ?? 0)
  };

  // Assert Spend Card / BigNumberThreeCols component is showing properly
  await assertBigNumberThreeColsIsShowingProperly(page, expected);
});

})
