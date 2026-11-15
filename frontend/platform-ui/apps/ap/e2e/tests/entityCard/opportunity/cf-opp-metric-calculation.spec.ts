/**
 * @fileoverview
 * User Story 4606: New "Cash Flow" metric calculation method
 *
 * -> As an ADA system, I should have a new "Cash Flow" metric calculation method
 *    under the Entity Negotiation Tab at Supplier Level to make the information
 *    provided more accurate.
 *
 * Main flow:
 * 1. The user opens the entity card of a supplier with multiple spends
 *    ("Axtone S.A.") or a parent with multiple suppliers ("Hitachi Ltd").
 * 2. The Opportunity tab is displayed by default.
 * 3. The "Cash Flow Opportunity" card shows the level's total potential cash
 *    flow: at supplier level it equals the sum of the cashFlowOpportunity info
 *    cards of every spend tab; at parent level it equals the parent-level API
 *    value.
 */

import { expect, test } from "@playwright/test";
import {
  changeToSpendFile,
  ensureDefaultLogin,
  goToEntityCardEntityExactFull,
} from "../../utils/Utils";
import ProgramUtils from "../../utils/ProgramUtils";
import { locators } from "../../utils/locators";

const spendFileName = "Pagero_20230124.xlsx (Ver. 1)";
const programName = "9 boxes CF (Read Only)";

const testParams: { entityType: "supplier" | "parent"; entityName: string }[] = [
  { entityType: "supplier", entityName: "Axtone S.A." },
  { entityType: "parent", entityName: "Hitachi Ltd" },
];

/**
 * Format a number the way the SPA renders the Cash Flow Opportunity card
 * (StringUtils.formatBigNumbers with its default one-decimal options). Note it
 * differs from Utils.formatBigNumber: thresholds compare with ">=" and a zero
 * renders as a bare "0".
 */
function formatAsCashFlowCard(value: number): string {
  const options = { maximumFractionDigits: 1, minimumFractionDigits: 1 };
  const suffixes: [number, string][] = [
    [1.0e21, "s"],
    [1.0e18, "i"],
    [1.0e15, "q"],
    [1.0e12, "t"],
    [1.0e9, "b"],
    [1.0e6, "m"],
    [1.0e3, "k"],
  ];

  for (const [threshold, suffix] of suffixes) {
    if (Math.abs(value) >= threshold) {
      return (value / threshold).toLocaleString("en-US", options) + suffix;
    }
  }

  if (Math.abs(value) === 0) {
    return "0";
  }

  return value.toLocaleString("en-US", options);
}

/** The cashFlowOpportunity info card value of a /chart/payment-terms-opportunity response. */
function cashFlowOf(chartResponse: any): number {
  const proposed = chartResponse.terms.find(
    (term: any) => term.key === "proposedTerms",
  );
  const card = proposed?.infoCards?.find(
    (infoCard: any) => infoCard.key === "cashFlowOpportunity",
  );

  return card?.value ?? 0;
}

for (const { entityType, entityName } of testParams) {
  test(`${entityType} level - verify cash flow opportunity metric calculation @us-4606 @entity @integrated`, async ({
    page,
  }) => {
    // ensureDefaultLogin + goto instead of goToHomeSection: the latter gates on
    // the three home gauges and flakes when dev serves them before its waiters
    // register. Nothing below needs them - the spend file dropdown is global
    // and goToEntityCardEntityExactFull navigates home by itself.
    await ensureDefaultLogin(page);
    await page.goto("/");
    await page.waitForSelector(".loading-modal", { state: "detached" });
    await changeToSpendFile(page, spendFileName);
    await ProgramUtils.changeToProgram(page, programName, { wait: false });

    // Open the entity card gated on its own level chart response.
    const [levelData] = await Promise.all([
      page
        .waitForResponse(
          (response) =>
            response
              .url()
              .includes(`/chart/payment-terms-opportunity/${entityType}`) &&
            response.ok(),
        )
        .then((r) => r.json()),
      goToEntityCardEntityExactFull(page, entityName, 0, true, null, entityType),
    ]);

    // A target on the entity makes the card show the target value instead of
    // the computed cash flow; the fixture is expected to carry none.
    const targetTerms = levelData.terms.find(
      (term: any) => term.key === "targetTerms",
    );
    test.skip(
      targetTerms?.terms !== null &&
        targetTerms?.terms !== undefined &&
        targetTerms?.terms !== "null",
      `${entityName} has a payment terms target applied, so the card shows the target instead of the cash flow`,
    );

    // The strategy lines render skeletons while the program recalculates; wait
    // for the card to settle, then read the value while the All Spends tab is
    // still the selected one.
    await expect(page.locator("#termsbars .proposedTerms")).toBeAttached({
      timeout: 120000,
    });
    const cashFlowValue = page
      .locator('[id^="potentialCashFlowComputed"]')
      .first();
    await expect(cashFlowValue).not.toBeEmpty({ timeout: 60000 });
    const shownValue = (await cashFlowValue.innerText()).trim();

    let expectedValue: number;

    if (entityType === "supplier") {
      // US-4606: the All Spends value totals the cash flow of every spend tab.
      const tabs = page.locator(
        "#kendo-k-tabstrib-items-entiticard-negotiation li.k-item",
      );
      const count = await tabs.count();
      expect(
        count,
        "the supplier fixture must have at least two spend tabs",
      ).toBeGreaterThan(2);

      let sum = 0;
      for (let i = 1; i < count; i++) {
        const [spendData] = await Promise.all([
          page
            .waitForResponse(
              (response) =>
                new URL(response.url()).pathname.endsWith(
                  "/chart/payment-terms-opportunity/spend",
                ) && response.ok(),
            )
            .then((r) => r.json()),
          tabs.nth(i).click(),
        ]);
        sum += cashFlowOf(spendData);
      }
      expectedValue = sum;
    } else {
      // Parent level has no spend tabs; the card shows the level value itself.
      expectedValue = cashFlowOf(levelData);
    }

    console.log(
      `*** ${entityName}: shown="${shownValue}" expected=${expectedValue} (${formatAsCashFlowCard(expectedValue)})`,
    );
    expect(shownValue).toBe(formatAsCashFlowCard(expectedValue));

    await page.locator(locators.entityCard.closeButton).click();
  });
}
