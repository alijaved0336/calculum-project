/**
 * @fileoverview
 * US-4772: the payment terms section of the entity card renders its chart
 * lines with the values the level's chart API returns.
 *
 * For each level (parent, supplier, spend line) the test opens the entity and
 * asserts the three promised bars against /chart/payment-terms-opportunity/{level}:
 * the Contractual value, its Actual (Avg. Days Paid) companion and the
 * Proposed Terms (opportunity) value.
 */

import { Page, expect, test } from "@playwright/test";

import {
  changeToSpendFile,
  ensureDefaultLogin,
  goToEntityCardEntityExactFull,
  goToHomeSection,
} from "../../utils/Utils";
import ProgramUtils from "../../utils/ProgramUtils";
import ApiWaitersUtils from "../../utils/ApiWaitersUtils";

let page: Page;

const programName = "All Suppliers - CF - No Financing";
const spendFileName = "PageroFull_20230308_2.xlsx (Ver. 1)";

const testParams = [
  {
    entityLevel: "parent",
    entityType: "parent",
    entityName: "HITACHI LTD",
    tags: "@tc-4958 @tc-4961 @tc-4954",
  },
  {
    entityLevel: "supplier",
    entityType: "supplier",
    entityName: "Microelettrica Scientifica S.P.A.",
    tags: "@tc-4957 @tc-4960 @tc-4953",
  },
  {
    entityLevel: "spend line",
    entityType: "spend",
    entityName: "3M Company",
    tags: "@tc-4956 @tc-4959 @tc-4955",
  },
] as const;

test.beforeAll(async ({ browser }) => {
  // A hook inherits the 120s test budget by default, and this preamble is a
  // login plus a full page remount on the shared environment.
  test.setTimeout(180_000);

  page = await browser.newPage();
  await ensureDefaultLogin(page);
  await page.goto("/");
  await changeToSpendFile(page, spendFileName);

  // The dashboard builds its program dropdown once, on mount, and nothing
  // watches the active spend file version, so after a navbar switch the
  // dropdown keeps listing the previous file's programs. In the run of
  // 2026-09-20 it still showed "Program CF (COB)…" from the file that was
  // active at page load while this file's own list had arrived 1.3s earlier,
  // and changeToProgram then failed to find the program with a correct
  // selector. Waiting longer does not help: the component never re-renders,
  // so remount it and wait for the list that belongs to the active version.
  await Promise.all([
    ApiWaitersUtils.waitForSpendFileVersionsAnalyzePrograms(page),
    page.reload(),
  ]);
  await page.waitForSelector(".loading-modal", {
    state: "detached",
    timeout: 60_000,
  });

  await ProgramUtils.changeToProgram(page, programName, { wait: false });
});

/**
 * Close any entity-card modal a previous test left open on the shared page:
 * its backdrop would intercept the next test's search click (same guard as
 * cards-at-the-top.spec.ts).
 */
async function closeLeftoverEntityModals(sharedPage: Page) {
  const modals = sharedPage.locator(".calculum-modal");
  for (let i = 0; i < 4; i++) {
    const openCount = await modals.count();
    if (openCount === 0) break;
    const topModalClose = modals
      .last()
      .locator("[data-testid='close-icon']")
      .first();
    if (!(await topModalClose.isVisible().catch(() => false))) break;
    await topModalClose.click();
    await expect
      .poll(async () => await modals.count(), { timeout: 5000 })
      .toBeLessThan(openCount);
  }
  await expect(modals).toHaveCount(0);
}

function findTerm(chartResponse: any, key: string) {
  return chartResponse.terms.find((term: any) => term.key === key) ?? null;
}

for (const { entityLevel, entityType, entityName, tags } of testParams) {
  test(`${entityLevel} level - payment terms section charts are showing properly @entity @integrated @us-4772 ${tags}`, async () => {
    await closeLeftoverEntityModals(page);
    await goToHomeSection(page);

    // Spend lines are reached through their supplier's card.
    const searchType = entityType === "spend" ? "supplier" : entityType;
    let [chartData] = await Promise.all([
      page
        .waitForResponse(
          (response) =>
            response
              .url()
              .includes(`/chart/payment-terms-opportunity/${searchType}`) &&
            response.ok(),
        )
        .then((r) => r.json()),
      goToEntityCardEntityExactFull(page, entityName, 0, true, null, searchType),
    ]);

    if (entityType === "spend") {
      // Switch to the first spend tab: the strategies block remounts and
      // requests the spend-level payment terms.
      const tabs = page.locator(
        "#kendo-k-tabstrib-items-entiticard-negotiation li.k-item",
      );
      await expect(tabs.nth(1)).toBeVisible({ timeout: 30000 });
      [chartData] = await Promise.all([
        page
          .waitForResponse(
            (response) =>
              new URL(response.url()).pathname.endsWith(
                "/chart/payment-terms-opportunity/spend",
              ) && response.ok(),
          )
          .then((r) => r.json()),
        tabs.nth(1).click(),
      ]);
    }

    // The lines render skeletons while the program recalculates.
    const bars = page.locator("#termsbars");
    await expect(bars.locator(".proposedTerms")).toBeAttached({
      timeout: 120000,
    });

    const contractual = findTerm(chartData, "contractualTerms");
    const current = findTerm(chartData, "currentTerms");
    const proposed = findTerm(chartData, "proposedTerms");

    // 1. Contractual bar: the big value shows the contractual terms, falling
    //    back to the actual terms (default 0) the way EntityTermsChartLine does.
    const contractualLine = bars.locator(".contractualTerms");
    await expect(contractualLine).toBeAttached({ timeout: 60000 });
    const expectedContractual =
      contractual?.terms !== null &&
      contractual?.terms !== undefined &&
      contractual.terms >= 0
        ? String(contractual.terms)
        : String(current?.terms ?? 0);
    await expect(contractualLine.locator(".value-container")).toHaveText(
      expectedContractual,
    );

    // 2. Actual bar: the "/ Avg. Days Paid" companion value on the same line.
    if (current?.terms !== null && current?.terms !== undefined) {
      await expect(
        contractualLine.locator(".avg-days-paid-value").last(),
      ).toHaveText(String(current.terms));
    }

    // 3. Opportunity bar: the Proposed Terms line shows the level's value.
    const expectedProposed =
      proposed?.terms !== null && proposed?.terms !== undefined
        ? String(proposed.terms)
        : "N/A";
    await expect(bars.locator(".proposedTerms .value-container")).toHaveText(
      expectedProposed,
    );

    await closeLeftoverEntityModals(page);
  });
}

test.afterAll(async () => {
  await page
    ?.context()
    .close()
    .catch((error) => {
      console.error(
        "afterAll: page.context().close() failed (non-critical):",
        error instanceof Error ? error.message : String(error),
      );
    });
});
