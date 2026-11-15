/**
 * @fileoverview
 * E2E test for verifying the "Proposed Payment Terms" metric calculation method in the Opportunity entity card.
 *
 * This test covers:
 * - Navigating to the Opportunity entity card for a specific supplier.
 * - Ensuring the correct program and spend file are selected.
 * - Verifying that the "Proposed Payment Terms" metric is displayed correctly in the chart.
 *
 * Prerequisites:
 * - The test user must have access to the "Pagero_20230124.xlsx (Ver. 1)" spend file.
 * - The supplier "Axtone S.A." must exist in the test data.
 *
 * Utilities:
 * - Uses Playwright test runner and custom utility functions for navigation and assertions.
 */

import { expect, test } from "@playwright/test";
import {
  changeToSpendFile,
  goToEntityCardEntityExactFull,
  goToHomeSection,
} from "../../utils/Utils";
import ProgramUtils from "../../utils/ProgramUtils";

const spendFileName = "Pagero_20230124.xlsx (Ver. 1)";

const testParams: { entityType: "supplier" | "parent"; entityName: string }[] = [
  {
    entityType: "supplier",
    entityName: "Axtone S.A.",
  },
  {
    entityType: "parent",
    entityName: "Hitachi Ltd",
  },
];

for (const { entityType, entityName } of testParams) {
  test(`${entityType} level - verify proposed payment terms metric calculation @entity @api @us-4606`, async ({
    page,
  }) => {
    // Go to home page
    await goToHomeSection(page);

    // Select a spend file
    await changeToSpendFile(page, spendFileName);

    // change to correct program
    await ProgramUtils.changeToProgram(page, "9 boxes CF (Read Only)", {
      wait: false,
    });

    await page.waitForTimeout(2000);

    // Read bodies inside Promise.all (chained .then(r => r.json())) so the
    // body is captured while CDP's Network.getResponseBody buffer is still
    // warm. Reading them after Promise.all resolves races against the
    // entity-card XHR fanout (ada-bot, cards, details, ...) and on CI the
    // buffer is evicted before .json() runs — see
    // e2e/context/lessons-learned.md "Network.getResponseBody: No data found".
    const [result, resultTarget] = await Promise.all([
      page
        .waitForResponse(
          (response) => {
            const path = new URL(response.url()).pathname;
            return (
              path.startsWith("/api/entity-card/") &&
              path.endsWith("/spends") &&
              response.ok()
            );
          },
        )
        .then((r) => r.json() as Promise<any[]>),
      page
        .waitForResponse(
          (response) =>
            response
              .url()
              .includes(`/chart/payment-terms-opportunity/${entityType}`) &&
            response.ok(),
        )
        .then((r) => r.json()),
      // Exact match by companyType — search hits can rank a corporate-tree
      // parent ahead of the named supplier (or vice versa), which fires the
      // /chart/payment-terms-opportunity/<wrong-type> endpoint and hangs the
      // predicate above. See lessons-learned 2026-05-05 (show-bar-cards).
      goToEntityCardEntityExactFull(page, entityName, 0, true, null, entityType),
    ]);

    // -> User is in Opportunity Tab

    // Only Supplier Level has level tabs
    if (entityType === "supplier") {
      // Assert first tab is selected
      await expect(page.getByRole("tab").first()).toHaveAttribute(
        "aria-selected",
        "true",
      );
    }

    // Calculate the weighted average of the "Proposed Payment Terms" for all enabled spends
    const proposedPT =
      result.reduce(
        (acc: any, spend: any) =>
          acc +
          (spend.disabled === false
            ? spend.spend_volume * spend.model_payment_terms
            : 0),
        0,
      ) /
      result.reduce(
        (acc: number, spend: any) =>
          acc + (spend.disabled === false ? spend.spend_volume : 0),
        0,
      );

    // Format the total value to be displayed
    // Only keep four decimals
    const parsedProposedPT = Math.ceil(Number(proposedPT.toFixed(4)));

    // Assert API response
    expect(
      Number(
        resultTarget.terms.find(({ key }: { key: string }) => key === "proposedTerms").terms,
      ),
    ).toBe(Number(parsedProposedPT));
  });
}
