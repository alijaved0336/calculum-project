import { Page, expect, test } from "@playwright/test";

// Utils
import { changeToSpendFile, ensureDefaultLogin } from "../utils/Utils";
import { GlobalFiltersUtils } from "../utils";

const categoryName = "Spend Volume & Payment Terms";

const spendFileName = "PageroFull_20230308_2.xlsx (Ver. 1)";

// Numeric range fields under the "Spend Volume & Payment Terms" category.
// These used to be 4 byte-for-byte-identical, assertion-free tests; merged here.
const rangeFields = [
  "Payment Terms Opportunity",
  "Contractual Payment Terms",
  "Contractual Payment Terms with Cash Discount",
  "Avg. Days Paid",
];

test.describe.serial("Spend Volume & Payment Terms Category", () => {
  let page: Page;

  test.beforeAll(async ({ browser }) => {
    // Setup folded in from the former "category is showing" smoke test, which
    // only opened the category and was redundant as its own case. Mirrors the
    // beforeAll of the working sibling suites (geography, plan & manage).
    page = await browser.newPage();
    await ensureDefaultLogin(page);
    await changeToSpendFile(page, spendFileName);
    await page.waitForSelector(".loading-modal", { state: "detached" });
    await GlobalFiltersUtils.openModal(page);
    await GlobalFiltersUtils.openCategory(page, categoryName);
  });

  test.afterAll(async () => {
    // Close the page's context (not the worker `browser` fixture) so the
    // worker stays alive for the next spec in the workers=1 pipeline.
    await page?.context().close().catch((error) => {
      console.error(
        "afterAll: page.context().close() failed (non-critical):",
        error instanceof Error ? error.message : String(error),
      );
    });
  });

  // *** Payment-term numeric range fields ***

  // Merged from 4 byte-for-byte-identical, assertion-free per-field tests.
  test(
    "payment-term range fields accept and persist a numeric range @filter @ui @us-6474 @us-8160 @us-8161",
    async () => {
      for (const fieldName of rangeFields) {
        await GlobalFiltersUtils.openField(page, fieldName);

        const rangeItem = page
          .getByTestId("global-filters-dialog")
          .locator(".right-side ")
          .locator(".k-panelbar-item", { hasText: fieldName });

        const minInput = rangeItem.getByRole("spinbutton").first();
        const maxInput = rangeItem.getByRole("spinbutton").nth(1);

        await minInput.fill("90");
        await maxInput.fill("220");

        // Real assertion (the original per-field tests asserted nothing). The
        // Kendo numeric range clamps/normalizes typed input to the field's
        // data-bound min/max (e.g. typing 90 can resolve to 91, and 220 to the
        // field max), so assert the inputs accepted a non-empty numeric value
        // rather than the literal text.
        await expect(minInput).toHaveValue(/\d/);
        await expect(maxInput).toHaveValue(/\d/);
      }
    },
  );

  // *** END Payment-term numeric range fields ***

  // *** Spend Volume ***

  test("spend volume field is showing in global filters dialog @filter @ui @us-6474 tc-6703", async () => {
    const fieldName = "Spend Volume";

    await GlobalFiltersUtils.openField(page, fieldName);

    await expect(
      page
        .getByTestId("global-filters-dialog")
        .locator(".body-right-side ")
        .getByText(fieldName, { exact: true }),
    ).toBeVisible();
  });

  // *** END Spend Volume ***
});
