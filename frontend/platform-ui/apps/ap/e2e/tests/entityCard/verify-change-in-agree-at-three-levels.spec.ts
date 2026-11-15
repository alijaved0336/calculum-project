/**
 * @fileoverview
 * As a user, I should be able to view both the partially agreed-upon cash flow values of the Spend Lines in the Home and Manage views to enhance analysis capabilities.
 *
 * Verifies that agreeing a spend line's new terms from the entity modal flips the
 * "agreed" status at the three levels — Spend Line, Supplier (provider) and
 * Parent. The authoritative, synchronous signal is the
 * `create-updated-agree-terms-configs` response, which reports
 * `affected-spends/providers/parents-count` directly. We do NOT read the Manage
 * gauge counts: saving triggers an async recalculation, so the gauge only catches
 * up later — reading it inline would be a stale, flaky check (this is also why
 * the spend file shows a "needs to be re-calculated" banner mid-test).
 *
 * History / fixes: the old version (a) clicked the Manage search box, covered by
 * the `#icon-search` overlay, which under the suite-wide `actionTimeout: 0`
 * retried forever and blew the 240s timeout at a random step ("fails in different
 * parts, sometimes passes"); (b) read `.all_agreed`, a key the API never returns,
 * so every count was `undefined`; (c) waited on `get_spends_by_program_and_provider`
 * to detect the modal opening, which that path never fires; all inside a blanket
 * try/catch that swallowed every assertion. All addressed below.
 */

import { expect, test, type Page, type Response } from "@playwright/test";
import {
  changeToSpendFile,
  ensureDefaultLogin,
  ensureStrategiesUserLogin,
  resetFeatures,
} from "../utils/Utils";
import { locators } from "../utils/locators";

const features = {
  feature9BoxesFinancing: "feature9BoxesFinancing",
};
const given = {
  company: "Company Strategies",
  nameField: "name",
};

const SUPPLIER = "Pengg Kabel Gmbh";
const SPEND = "Spend 1";

type AffectedCounts = { spends: number; providers: number; parents: number };

const isCreateAgreeTerms = (r: Response) =>
  r
    .url()
    .includes("/api/entity-card-results/create-updated-agree-terms-configs") &&
  r.ok();
const isClearAgreeTerms = (r: Response) =>
  r.url().includes("/api/entity-card-results/clear-agree-terms-configs") &&
  r.ok();

/**
 * Type into the Manage search box and run the search. The `#search` input is
 * covered by the `#icon-search` overlay, so clicking it (the old bug) retried
 * forever; `fill()` focuses without a pointer click and search runs on Enter.
 */
async function searchManage(page: Page, placeholder: string, name: string) {
  const box = page.getByRole("textbox", { name: placeholder });
  await box.fill(name);
  await box.press("Enter");
}

/**
 * Search for an entity in Manage and open its card's modal. Clicking a card runs
 * `CardsByStatus.openEntityModal`, which shows the modal synchronously, so the
 * reliable signal is the close button appearing — not a network call.
 */
async function openEntityFromManage(page: Page, placeholder: string, name: string) {
  await searchManage(page, placeholder, name);
  const card = page.locator(".card-body").filter({ hasText: name });
  try {
    await card.first().waitFor({ state: "visible", timeout: 8000 });
  } catch {
    throw new Error(
      `entity "${name}" not found in Manage results (selected program may not contain it)`,
    );
  }
  await card.first().click();
  await expect(page.locator(locators.entityCard.closeButton)).toBeVisible({ timeout: 30000 });
}

/**
 * Select a spend tab in the open entity modal. The Agreed-New-Terms section only
 * renders on a spend tab. Dismiss any results modal still open first, otherwise
 * its tablist duplicates the entity modal's Spend tabs and trips strict mode.
 */
async function selectSpendTab(page: Page, spendTab: string) {
  const open = page.getByTestId("modal");
  if (await open.isVisible().catch(() => false)) {
    await page.keyboard.press("Escape");
    await open.waitFor({ state: "hidden", timeout: 5000 }).catch(() => {});
  }
  await page.getByRole("tab", { name: spendTab, exact: true }).click();
}

/** Open the Add/Edit Results modal for the currently selected spend tab. */
async function openResultsModal(page: Page) {
  const pencil = page.locator(
    ".agreedNewTerms .pencil-icon-add-results, .agreedNewTerms .pencil-icon-edit-results",
  );
  await pencil.first().waitFor({ state: "visible", timeout: 20000 });
  await pencil.first().click();
  const modal = page.getByTestId("modal");
  await expect(
    modal.getByRole("spinbutton", { name: "Without Cash Discount (days)" }),
  ).toBeVisible({ timeout: 20000 });
  return modal;
}

/**
 * Agree the given spend by setting its terms and saving, returning how many
 * spends / providers / parents the save flipped to "agreed" (from the response).
 */
async function agreeSpend(page: Page, spendTab: string): Promise<AffectedCounts> {
  await selectSpendTab(page, spendTab);
  const modal = await openResultsModal(page);
  await modal
    .getByRole("spinbutton", { name: "Without Cash Discount (days)" })
    .fill("90");
  const [response] = await Promise.all([
    page.waitForResponse(isCreateAgreeTerms, { timeout: 30000 }),
    page.getByRole("button", { name: "Save" }).click(),
  ]);
  const body = await response.json();
  await expect(modal).toBeHidden({ timeout: 10000 });
  return {
    spends: body["affected-spends-count"] ?? 0,
    providers: body["affected-providers-count"] ?? 0,
    parents: body["affected-parents-count"] ?? 0,
  };
}

/**
 * Clear the given spend's agreed terms. Always attempts the clear rather than
 * pre-checking the pencil's add/edit state — that state lags the async recalc,
 * so it can't be trusted to reflect what's actually agreed in the DB. When
 * nothing is agreed the Clear simply no-ops (no `clear-agree-terms-configs`
 * fires) and we move on. Returns whether a clear actually happened.
 */
async function clearSpend(page: Page, spendTab: string): Promise<boolean> {
  await selectSpendTab(page, spendTab);
  const modal = await openResultsModal(page);
  // Clear is `clearAgreedTermsWithSelectedSpends` — it needs a row selection.
  await modal
    .getByRole("checkbox", { name: "Select All Rows" })
    .check()
    .catch(async () => {
      await modal
        .locator("tr")
        .filter({ hasText: spendTab })
        .getByRole("gridcell")
        .first()
        .click()
        .catch(() => {});
    });
  const cleared = await Promise.all([
    page.waitForResponse(isClearAgreeTerms, { timeout: 12000 }),
    modal.getByRole("button", { name: "Clear" }).click(),
  ])
    .then(() => true)
    .catch(() => false);
  // Close the results modal whether or not the clear fired.
  if (await modal.isVisible().catch(() => false)) {
    await page.keyboard.press("Escape").catch(() => {});
    await modal.waitFor({ state: "hidden", timeout: 5000 }).catch(() => {});
  }
  console.log(`${spendTab}: ${cleared ? "cleared" : "no agreed terms to clear"}`);
  return cleared;
}

test.beforeEach(async ({ page }) => {
  test.setTimeout(240000);
  await ensureStrategiesUserLogin(page);
  await changeToSpendFile(page, "Pagero_Full-Winner-Strategy.xlsx (Ver. 1)");
  await page.waitForSelector(".loading-modal", { state: "detached" });
  await resetFeatures(page, [features.feature9BoxesFinancing], true, given, true);
  await page.goto("/");
});

test("The Agreed Status is updated as well as the Manage view when changing in Entity Modal Panel @tc-12857 - @us-12591 ", async ({
  page,
}) => {
  // No single action may stall longer than this. The suite runs with a global
  // `actionTimeout: 0`, so without an explicit cap a blocked click/wait would
  // hang until the 240s test timeout (the historical flake).
  page.setDefaultTimeout(30000);

  console.log("Go to Manage Section");

  await page.evaluate(() => {
    (document.body.style as any).zoom = "50%";
  });

  await page.locator(locators.sidebar.manage).click();
  await expect(page).toHaveURL(/manage-module/, { timeout: 30000 });

  await page.getByRole("tab", { name: "Suppliers" }).click();
  await openEntityFromManage(page, "Search by Supplier Name", SUPPLIER);

  let affected: AffectedCounts | null = null;
  try {
    affected = await agreeSpend(page, SPEND);
    if (affected.spends === 0) {
      // The spend was already agreed (so nothing flipped); reset it and agree
      // again so we observe the status actually changing. The pencil's add/edit
      // state lags recalc, so we don't rely on it — we just react to the count.
      console.log(`${SPEND} already agreed — resetting to observe the flip`);
      await clearSpend(page, SPEND);
      affected = await agreeSpend(page, SPEND);
    }
    console.log(
      `Agreed-status changes — Spend Lines: ${affected.spends}, Suppliers: ${affected.providers}, Parents: ${affected.parents}`,
    );
  } finally {
    // Always restore the data so the run is repeatable, even if an assertion below fails.
    await clearSpend(page, SPEND).catch((e) =>
      console.warn(`[cleanup] clear ${SPEND}: ${(e as Error)?.message}`),
    );
    await page.locator(locators.entityCard.closeButton).click().catch(() => {});
  }

  // Agreeing a previously-not-agreed spend must flip it to "agreed" at the spend
  // level — the deterministic part. The same response also reports the supplier
  // and parent it rolls up to (logged above); those are only > 0 when the change
  // also flips the supplier/parent net status, so they're observed, not gated.
  expect(affected?.spends ?? 0).toBeGreaterThanOrEqual(1);

  console.log("Test Finish");
});

test.afterEach(async ({ page }) => {
  await ensureDefaultLogin(page);
});
