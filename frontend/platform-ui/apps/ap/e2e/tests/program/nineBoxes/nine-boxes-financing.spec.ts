/**
 * US-8569: the financing 9-box shows consistent selection totals.
 *
 * The old "Financing" metric option of the 9-box dropdown is offered today as
 * "SCF (Provider)" (partner-role users) or "SCF" (financing-feature users), so
 * the test picks whichever the fixture user is granted and runtime-skips when
 * neither is offered. The original currency dance was dropped: every checked
 * value is a count, so it is currency independent.
 */
import { Page, expect, test } from "@playwright/test";

import { changeToSpendFile, ensureDefaultLogin } from "../../utils/Utils";
import ProgramUtils from "../../utils/ProgramUtils";
import { locators } from "../../utils/locators";

const SPEND_FILE_VERSION_NAME = "Pagero_Full_9-Box-Finance.xlsx (Ver. 1)";
const PROGRAM_NAME = "Main Program";

// Metric options that land on a financing 9-box, in preference order, with
// the API each one loads its boxes from.
const FINANCING_OPTIONS: { title: string; boxesApi: string }[] = [
  { title: "SCF (Provider)", boxesApi: "/api/analyze/get-nine-boxes-financial-data" },
  { title: "SCF", boxesApi: "/api/analyze/get-nine-boxes-scf-data" },
];

/**
 * Select the given metric in the 9-box dropdown unless it is already the
 * current one, waiting for the boxes data of that metric.
 */
async function selectNineBoxMetric(
  page: Page,
  option: { title: string; boxesApi: string },
) {
  const dropdown = page.locator('[data-testid="active-metrics-dropdown"]');
  const item = dropdown
    .locator(".item-dropdown")
    .filter({ has: page.locator(".text-option", { hasText: new RegExp(`^\\s*${option.title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*$`) }) });

  if (await item.locator(".check-svg").isVisible()) {
    console.log(`Metric '${option.title}' is already selected`);
    await dropdown.locator("#metric-dropdown-options").click();
    return;
  }

  await Promise.all([
    page.waitForResponse(
      (response) =>
        new URL(response.url()).pathname === option.boxesApi && response.ok(),
      { timeout: 60000 },
    ),
    item.click(),
  ]);
}

test.beforeEach(async ({ page }) => {
  await ensureDefaultLogin(page);
  await page.goto("/");
  await page.waitForSelector(".loading-modal", { state: "detached" });
  await changeToSpendFile(page, SPEND_FILE_VERSION_NAME);
});

test("Nine boxes financing @nineboxes @ui @us-8569 @dmas", async ({ page }) => {
  console.log("Going to the program section");

  if (!page.url().includes("/home/analyze")) {
    await Promise.all([
      page.waitForResponse(
        (response) =>
          response.url().includes("/analyze_programs") && response.ok(),
        { timeout: 60000 },
      ),
      page.locator(locators.sidebar.program).click(),
    ]);
  }

  // The program navbar dropdown only renders inside the program section, so
  // the program is pinned here and not in beforeEach.
  await ProgramUtils.changeToProgram(page, PROGRAM_NAME, { wait: false });

  console.log("Opening the 9 boxes tab");

  await page.locator(locators.headerMenu.programHeader.nineBoxes).click();

  // The metric dropdown renders only when the user is granted at least one
  // metric besides Term Extension.
  const dropdown = page.locator('[data-testid="active-metrics-dropdown"]');
  const dropdownOffered = await dropdown
    .waitFor({ state: "visible", timeout: 30000 })
    .then(() => true)
    .catch(() => false);

  // Observed on dev (2026-08-28): joel+testnotadmin holds ROLE_PARTNER but
  // not FEATURE_9_BOXES_FINANCING, so no financing 9-box can render for it.
  // The exception-1 admin covers the financing 9-box (see 9boxes-scf.spec.ts)
  // until that feature role is granted to this fixture user.
  test.skip(
    !dropdownOffered,
    "No 9-box metric dropdown: the fixture user lacks the FEATURE_9_BOXES_FINANCING role (and the vCard feature) on this environment",
  );

  await dropdown.locator("#metric-dropdown-options").click();

  const offeredTitles = (
    await dropdown.locator(".item-dropdown .text-option").allInnerTexts()
  ).map((title) => title.trim());

  console.log(`Offered 9-box metrics: ${offeredTitles.join(", ")}`);

  const financingOption = FINANCING_OPTIONS.find((option) =>
    offeredTitles.includes(option.title),
  );

  test.skip(
    !financingOption,
    "Neither 'SCF (Provider)' nor 'SCF' is offered to the fixture user on this environment",
  );

  await selectNineBoxMetric(page, financingOption!);

  console.log(`Financing 9-box loaded via '${financingOption!.title}'`);

  // Suppliers is the level selected by default.
  await expect(
    page.locator(".custom_cursor_pointer.level-tab.mx-auto", {
      hasText: "Suppliers",
    }),
  ).toHaveClass(/active/, { timeout: 30000 });

  console.log("Selecting all boxes");

  await page.locator(".open-options.cursor-pointer").click();
  await page
    .locator('#user-options-popup >> span:has-text("Select All")')
    .nth(0)
    .click();

  // The summary table renders only once some boxes are selected; its counts
  // and the grid pager refresh together.
  const table = page.locator("#nine-boxes-table");
  await expect(table).toBeVisible({ timeout: 60000 });

  const pagerTotalOf = async (): Promise<number> => {
    const pagerText = await page.locator(".k-pager-info").innerText();
    return Number.parseInt(pagerText.trim().split("of")[1].trim().split(" ")[0], 10);
  };

  // With everything selected the Suppliers row shows the same count on the
  // Selection and Total columns, and it matches the grid pager total. The
  // count rows render grouped integers ('-' instead of a zero Selection).
  // Poll: the table and the pager refresh at their own pace after Select All.
  await expect
    .poll(
      async () => {
        const row = table.locator("tbody tr", { hasText: "Suppliers" }).first();
        const cells = await row.locator("td").allInnerTexts();
        const suppliersTotal = await pagerTotalOf();
        const grouped = suppliersTotal.toLocaleString("en-US", {
          maximumFractionDigits: 0,
        });
        // The Selection column goes through displayValue ('-' for zero); the
        // Total column renders the raw grouped count.
        const expectedSelection = suppliersTotal === 0 ? "-" : grouped;

        console.log(
          `Suppliers row: selection='${cells[0]?.trim()}' total='${cells[1]?.trim()}' pager=${suppliersTotal}`,
        );

        return (
          cells[0]?.trim() === expectedSelection && cells[1]?.trim() === grouped
        );
      },
      {
        timeout: 60000,
        message: "Suppliers row does not match the grid pager total after Select All",
      },
    )
    .toBe(true);

  // Every other row must show Selection equal to Total after Select All
  // (displayValue renders '-' instead of '0' on the Selection column).
  const rowsCount = await table.locator("tbody tr").count();

  for (let i = 0; i < rowsCount; i++) {
    const rowLoc = table.locator("tbody tr").nth(i);
    const title = (await rowLoc.locator("th").innerText()).trim();
    const rowCells = await rowLoc.locator("td").allInnerTexts();
    const selection = rowCells[0]?.trim();
    const total = rowCells[1]?.trim();

    if (total === "0") {
      expect(selection, `row '${title}' should show '-' for a 0 total`).toBe("-");
    } else {
      expect(selection, `row '${title}' selection differs from its total`).toBe(total);
    }
  }
});
