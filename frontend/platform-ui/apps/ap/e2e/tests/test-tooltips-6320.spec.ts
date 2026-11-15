/**
 * 6320 Advanced Tooltips
 */
import { test, expect, Page } from "@playwright/test";
import { changeToSpendFile, ensureDefaultLogin } from "./utils/Utils";
import { ProgramUtils } from "./utils";

interface Cards {
  /** Popover header text, from the popover definition in src/composables/data/index.ts */
  name: string;
  /**
   * `uniqueIdentifier` of the CalculumTooltipIcon, which ButtonIconStandard also
   * renders as a class. Targeting this instead of the card body text keeps the
   * test independent of the card heading, which changes to "Spend (F) & Entities"
   * when showForecastVolume is enabled.
   */
  anchor: string;
  /**
   * True when the host section is rendered only for some program data, so its
   * absence must not fail the test. Set for Program Distribution only.
   */
  dataDependent?: boolean;
}

/**
 * The three advanced tooltips rendered on Program Overview
 * (HomeAnalyzeProgramOverview.vue lines 14, 55 and 111). The former "Groups"
 * card was removed from this view — its popover definition
 * (key "programOverviewGroups") is now unreferenced by any component — so
 * Program Distribution is the third advanced tooltip on the page.
 */
const cards: Cards[] = [
  {
    name: "Payment Terms (days)",
    anchor: ".program-payment-terms",
  },
  {
    name: "Spend & Entities",
    anchor: ".program-spend-n-entities",
  },
  {
    // showProgramDistributionComponent (HomeAnalyzeProgramOverview.vue:623)
    // requires at least two of termExtScfTotal / vcardTotal / excludedTotal to
    // be greater than 0 in the program's spend-volume distribution. The program
    // used here does not always satisfy that, so this entry is asserted only
    // when the section renders.
    name: "Program Distribution",
    anchor: ".program-distribution",
    dataDependent: true,
  },
];


test.beforeEach(async ({ page }) => {

  await ensureDefaultLogin(page);
  await page.goto("/");
  await page.waitForSelector(".loading-modal", { state: "detached" });
});

test("Test for Advanced Tooltips in Program Overview @entity @ui @us-6320", async ({
  page,
}) => {
  console.log("Change to Spend File Pagero_Full_SME.xlsx (Ver. 1)");
  await changeToSpendFile(page, "Pagero_Full_SME.xlsx (Ver. 1)");

  console.log('test started for "TestTooltips"');

  // Land on a Program Overview without gating on a network response. The
  // original navigation raced a /api/analyze/programs/payment-terms waiter
  // against the sidebar click, but that request only fires once a program view
  // is open, and the default goToProgramSection waiter
  // (spend_file_versions/.../analyze_programs) does not fire either when the
  // sidebar click is a no-op because the section is already active. Both are
  // state-dependent; what the test actually needs is the rendered page.
  await ProgramUtils.goToProgramSection(page, { wait: false });

  const showFirstProgram = page
    .locator("#container-main-id div")
    .getByRole("button", { name: "Show" })
    .first();
  const firstTooltip = page.locator(`${cards[0].anchor} .tooltipIcon`).first();

  // The sidebar opens either the program card list or a program view directly.
  await expect(
    showFirstProgram.or(firstTooltip).first(),
    "The sidebar opened neither the program card list nor a program view",
  ).toBeVisible({ timeout: 60000 });

  if (await showFirstProgram.isVisible()) {
    await showFirstProgram.click();
  }

  // Always inside a program from here on.
  await checkCards(page, cards);
});

async function checkCards(page: Page, cards: Cards[]) {
  let asserted = 0;

  for (const element of cards) {
    const icon = page.locator(`${element.anchor} .tooltipIcon`).first();

    if (element.dataDependent) {
      if (!(await icon.isVisible())) {
        console.log(
          `Skipping "${element.name}": its section is not rendered for this program.`,
        );
        continue;
      }
    } else {
      await icon.waitFor({ state: "visible" });
    }

    await icon.click();

    // Gate on the popover instead of a fixed wait: Shepherd mounts the step
    // asynchronously, and the previous step's node is removed on cancel.
    //
    // toBeVisible must come first and cannot be dropped. toHaveText compares
    // normalized textContent, which is already populated while Shepherd's
    // element is still display:none — asserting the text alone passes against a
    // popover the user cannot see, which is the opposite of what this test is
    // for. innerText returns "" in that state, which is how the gap surfaced.
    const header = page.locator(".shepherd-header >> h3");
    await expect(header).toBeVisible();
    await expect(header).toHaveText(element.name);
    console.log("headerTitle : ", await header.innerText());

    await page.locator(".shepherd-cancel-icon").click();
    await expect(header).toHaveCount(0);
    asserted += 1;
  }

  // Guard against a vacuous pass: the two non-data-dependent tooltips must
  // always have been opened and read.
  const mandatory = cards.filter(card => !card.dataDependent).length;
  expect(
    asserted,
    `Only ${asserted} advanced tooltips were verified, expected at least ${mandatory}`,
  ).toBeGreaterThanOrEqual(mandatory);
}
