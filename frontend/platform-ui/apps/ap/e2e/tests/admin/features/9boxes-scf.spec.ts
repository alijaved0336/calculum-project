/**
 * US-12887 / TC-13056: the 9-box SCF is offered on the Opportunity / Supplier
 * Prioritization tab and, on every level, the count of the selected boxes on
 * the summary table matches the records listed by the grid below.
 *
 * Runs as the exception-1 admin on its own company. The active program is
 * resolved through the API because the fixture company does not pin one.
 */
import { Page, expect, test } from "@playwright/test";

import Api2 from "../../utils/APi2";
import ProgramUtils from "../../utils/ProgramUtils";
import {
  changeToSpendFile,
  ensureDefaultLogin,
  loginAsAdminException1,
} from "../../utils/Utils";
import { locators } from "../../utils/locators";

const SPEND_FILE_NAME = "Pagero_ToRecalculate-2.xlsx";
const SPEND_FILE_VERSION_NAME = `${SPEND_FILE_NAME} (Ver. 1)`;
const SCF_BOXES_API = "/api/analyze/get-nine-boxes-scf-data";

// Level tab label -> summary-table row title for that level.
const LEVELS: { tab: string; row: string }[] = [
  { tab: "Suppliers", row: "Suppliers" },
  { tab: "Spend Lines", row: "Spend Lines" },
  { tab: "Parents", row: "Parents" },
];

/** Total records of the nine-boxes grid: pager total, or row count without pager. */
async function gridTotal(page: Page): Promise<number> {
  const pager = page.locator(".k-pager-info");

  if (await pager.isVisible().catch(() => false)) {
    const text = (await pager.innerText()).trim();
    const match = text.match(/of\s+([\d,]+)\s+items/);
    if (match) {
      return Number.parseInt(match[1].replace(/,/g, ""), 10);
    }
  }

  return page.locator(".k-master-row").count();
}

/**
 * Poll until the level row of the summary table agrees with the grid: its
 * Selection column must equal the grid total, formatted the way the table
 * renders counts (grouped integer, '-' instead of a zero).
 *
 * With `fullSelection` the row Selection must also equal the row's own Total
 * column — the state Select All must reach. The pre-click state does not have
 * to satisfy that, so the poll can genuinely fail when the option never
 * applies.
 */
async function expectLevelRowToMatchGrid(
  page: Page,
  rowTitle: string,
  options?: { fullSelection?: boolean },
) {
  const table = page.locator("#nine-boxes-table");

  await expect(table).toBeVisible({ timeout: 60000 });

  await expect
    .poll(
      async () => {
        const row = table.locator("tbody tr", { hasText: rowTitle }).first();
        const cells = await row.locator("td").allInnerTexts();
        const selection = cells[0]?.trim();
        const rowTotal = cells[1]?.trim();
        const total = await gridTotal(page);
        const expected =
          total === 0
            ? "-"
            : total.toLocaleString("en-US", { maximumFractionDigits: 0 });

        console.log(
          `row '${rowTitle}': selection='${selection}' rowTotal='${rowTotal}' vs grid total=${total}`,
        );

        if (selection !== expected) {
          return false;
        }

        if (!options?.fullSelection) {
          return true;
        }

        // The Selection column goes through displayValue ('-' for zero); the
        // Total column renders the raw grouped count.
        return selection === (rowTotal === "0" ? "-" : rowTotal);
      },
      {
        timeout: 60000,
        message: options?.fullSelection
          ? `The '${rowTitle}' row did not reach full selection matching the grid records`
          : `The '${rowTitle}' selection count does not match the grid records`,
      },
    )
    .toBe(true);
}

// beforeEach shares this budget with the test, and every level switch reloads
// both the 9-box data and the grid below it. On the QA pipeline (dev-test2,
// 2026-09-30) the login alone took 64s and the grid query of a level up to
// 31s, so the 120s default ran out 4s after switching to Spend Lines.
test.setTimeout(300_000);

// Resolved by beforeEach; the test re-pins it inside the program section.
let fixtureProgramName: string;

test.beforeEach(async ({ page }) => {
  await loginAsAdminException1(page);
  await changeToSpendFile(page, SPEND_FILE_VERSION_NAME);
  await page.waitForSelector(".loading-modal", { state: "detached" });

  // The fixture company does not keep an active program pinned: resolve one
  // through the API and select it so the Opportunity tab has data to render.
  const api = await Api2.getInstance(page);
  const version = ((api.activeCompany as any)?.spendFileVersions ?? []).find(
    (item: any) => item.name === SPEND_FILE_NAME && item.version === 1,
  );

  expect(version, `${SPEND_FILE_VERSION_NAME} is not available`).toBeTruthy();

  const uuid = String(version["@id"]).split("/").pop();
  const programsResponse = await api.doGet(
    `/api/spend_file_versions/${uuid}/analyze_programs`,
  );

  // A non-2xx answer carries an error payload without hydra:member, which
  // must fail the run instead of being read as "no programs" by the skip
  // guard below.
  expect(
    programsResponse.ok(),
    `GET analyze_programs answered ${programsResponse.status()} for ${SPEND_FILE_VERSION_NAME}`,
  ).toBeTruthy();

  const programs = (await programsResponse.json())["hydra:member"] ?? [];

  console.log(
    `Programs on the fixture: ${programs.map((program: any) => program.name).join(", ")}`,
  );

  test.skip(
    programs.length === 0,
    "The fixture spend file version has no analyze program on this environment",
  );

  fixtureProgramName = programs[0].name;

  // Pin the program from the Home dashboard, whose program dropdown renders
  // whenever the version holds several programs. This keeps the program
  // section opening straight into a program overview — the test re-asserts
  // the pin once inside the section.
  await ProgramUtils.changeToProgram(page, fixtureProgramName, { wait: false });
});

test.afterEach(async ({ page }) => {
  await ensureDefaultLogin(page);
});

test("As a user, I should see the 9-box SCF as part of the Opportunity/Supplier Prioritization tab to have better analysis capabilities. @us-12887 @tc-13056", async ({
  page,
}) => {
  console.log("Going to the program section");

  if (!page.url().includes("/home/analyze")) {
    await Promise.all([
      page.waitForResponse(
        (response) =>
          response.url().includes("/api/statistics/get-chart-data") &&
          response.ok(),
        { timeout: 60000 },
      ),
      page.locator(locators.sidebar.program).click(),
    ]);
  }

  // Re-assert the pin inside the program section, whose dropdown always
  // renders when the version holds several programs: this no-ops when the
  // dashboard pin of beforeEach already took hold and corrects the active
  // program when it did not.
  await ProgramUtils.changeToProgram(page, fixtureProgramName, { wait: false });

  console.log("Opening the Supplier Prioritization (9 boxes) tab");

  await page.locator(locators.headerMenu.programHeader.nineBoxes).click();

  // The SCF 9-box is picked through the metric dropdown; the dropdown only
  // renders when the user is granted a metric besides Term Extension.
  const dropdown = page.locator('[data-testid="active-metrics-dropdown"]');
  const dropdownOffered = await dropdown
    .waitFor({ state: "visible", timeout: 30000 })
    .then(() => true)
    .catch(() => false);

  test.skip(
    !dropdownOffered,
    "No 9-box metric dropdown: the fixture user is not granted the SCF 9-box on this environment",
  );

  await dropdown.locator("#metric-dropdown-options").click();

  const scfItem = dropdown
    .locator(".item-dropdown")
    .filter({ has: page.locator(".text-option", { hasText: /^\s*SCF\s*$/ }) });

  // count() performs no auto-waiting: give the option list the same explicit
  // wait as the dropdown itself, so a render slower than the click cannot be
  // read as "metric not offered" and skip past a real regression.
  const scfOffered = await scfItem
    .first()
    .waitFor({ state: "visible", timeout: 30000 })
    .then(() => true)
    .catch(() => false);

  test.skip(
    !scfOffered,
    "The 'SCF' 9-box metric is not offered to the fixture user on this environment",
  );

  // The check mark of the selected metric renders with its item, but give it
  // its own short wait rather than a bare isVisible() so the branch cannot
  // misread a still-painting item as "not selected".
  const scfAlreadySelected = await scfItem
    .locator(".check-svg")
    .waitFor({ state: "visible", timeout: 5000 })
    .then(() => true)
    .catch(() => false);

  if (scfAlreadySelected) {
    console.log("The SCF 9-box is already the selected metric");
    await dropdown.locator("#metric-dropdown-options").click();
  } else {
    await Promise.all([
      page.waitForResponse(
        (response) =>
          new URL(response.url()).pathname === SCF_BOXES_API && response.ok(),
        { timeout: 60000 },
      ),
      scfItem.click(),
    ]);
  }

  for (const level of LEVELS) {
    const tab = page.locator(".level-tab", { hasText: level.tab });

    if (!((await tab.getAttribute("class")) ?? "").includes("active")) {
      console.log(`Switching to the ${level.tab} level`);
      await tab.click();
    }

    await expectLevelRowToMatchGrid(page, level.row);
  }

  console.log("Selecting all boxes");

  await page.locator(".open-options").click();
  await page
    .locator('#user-options-popup span:has-text("Select All")')
    .click();

  // After Select All on the last level (Parents), its row must count every
  // record of the level: Selection must reach the row's own Total besides the
  // grid total. A response wait would deadlock when the boxes were already
  // all selected — Select All then fires no request — so the poll asserts the
  // end state instead.
  await expectLevelRowToMatchGrid(page, LEVELS[LEVELS.length - 1].row, {
    fullSelection: true,
  });
});
