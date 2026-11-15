/**
 * @fileoverview
 * E2E tests for the Adabot "Extra" section in the Opportunity tab (Entity Card).
 *
 * Clicking the "Supplier Standard" / "Peer Group Standard" strategy lines of
 * "3A Composites Mobility S.A." loads the strategy details on the right side,
 * whose extra section carries the "3rd Quartile (days)" and "Average (days)"
 * detail chips.
 */

import { Page, expect, test } from "@playwright/test";
import {
  changeToSpendFile,
  ensureDefaultLogin,
  goToEntityCardEntityExactFull,
} from "../../../utils/Utils";

test.describe.serial("adabot - Extra - Section", () => {
  let page: Page;

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();

    await ensureDefaultLogin(page);
    await page.goto("/");
    await changeToSpendFile(page, "Pagero.xlsx (Ver. 26)");

    // Open the supplier card gated on its own strategy responses: the extra
    // section renders only once the ada-bot payload is loaded.
    await Promise.all([
      page.waitForResponse(
        (response) =>
          response
            .url()
            .includes("/chart/payment-terms-opportunity/supplier") &&
          response.ok(),
      ),
      page.waitForResponse(
        (response) =>
          response.url().includes("/api/entity-card/entity/ada-bot/all") &&
          response.ok(),
      ),
      goToEntityCardEntityExactFull(
        page,
        "3A Composites Mobility S.A.",
        0,
        true,
        null,
        "supplier",
      ),
    ]);

    // The strategy lines render skeletons while the program recalculates.
    await expect(page.locator("#termsbars .proposedTerms")).toBeAttached({
      timeout: 120000,
    });
  });

  for (const strategyTitle of ["Supplier Standard", "Peer Group Standard"]) {
    test(`Adabot - Extra - Section - ${strategyTitle} - Strategy - @ui @entity @adabot @tc-5976 @us-5926`, async () => {
      const line = page
        .locator("#termsbars .line-chart")
        .filter({ hasText: strategyTitle })
        .first();

      // An unused strategy line lives in the collapsed "Unused Strategies" block.
      if (!(await line.isVisible())) {
        await page
          .locator("#termsbars .unused-div span.cursor-pointer")
          .first()
          .click();
      }
      await expect(line).toBeVisible();
      await line.click();

      const extraSection = page.locator(".extra-section");
      await expect(
        extraSection.getByText("3rd Quartile (days)").first(),
      ).toBeVisible();
      await expect(
        extraSection.getByText("Average (days)").first(),
      ).toBeVisible();
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
});
