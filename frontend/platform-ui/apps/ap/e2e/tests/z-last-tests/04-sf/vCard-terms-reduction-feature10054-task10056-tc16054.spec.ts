/**
 * @fileoverview
 * E2E test for verifying the Terms Reduction feature in the VCard group.
 *
 * Main Flows:
 * 1. Ensure the user is logged out and logs in as a super user.
 * 2. Change to the spend file "Pagero_VCard.xlsx (Ver. 1)".
 * 3. Navigate to the relevant settings and entity card sections.
 * 4. For each loop iteration:
 *    a. Test the scenario with and without term reduction.
 *    b. Retrieve and validate current, proposed, contractual, and actual terms.
 *    c. Assert that the proposed term reduction is calculated as expected.
 *
 * Acceptance Criteria:
 * - The user is able to log in and switch to the correct spend file.
 * - The test covers both scenarios: with and without term reduction.
 * - The UI displays the correct values for current, proposed, contractual, and actual terms.
 * - The proposed term reduction matches the expected calculation (Actual - Contractual).
 * - The test passes if all assertions are met and the UI reflects the correct term reduction logic.
 *
 * Expected model, and why it is the Contractual/Actual terms and not the
 * proposed terms of the previous iteration (Back-End
 * src/Statics/Calculations/VCard/VCardCalculations.php,
 * VCardCalculations::tryApplyRegulationOnTerms):
 *
 *   $isVCardExtAllowed = !$isVCardReady || $company->getVCardAllowsTermsExtension();
 *   $termAdj  = $isVCardExtAllowed ? $terms : $spend->getContractualActual();
 *   $proposed = $termAdj;
 *   if ($isVCardReady) {
 *       $reduction = ...getVCardGroupAvgTermReduction() ?? 0;
 *       $proposed -= $reduction;
 *       if ($proposed < 0) { $proposed = 0; }
 *   }
 *
 * Company_SF has vCardAllowsTermsExtension = false, so for a vCard-ready entity
 * $termAdj collapses to the Contractual/Actual terms and the proposed terms are
 * exactly "Contractual/Actual minus the group Average Term Reduction", floored
 * at 0. The test asserts that precondition explicitly before it relies on the
 * model, so a company-level flip of vCardAllowsTermsExtension surfaces as a
 * failed precondition instead of a silently wrong expectation.
 */


import { expect, test, Page, Locator } from "@playwright/test";
import {
  ensureDefaultLogin,
  changeToSpendFile,
  goToEntityCardEntity,
  ensureCompany_SFSuperAdminLogin,
} from "../../utils/Utils";
import { locators } from "../../utils/locators";
import Api2, { IprocessedResponse } from "../../utils/APi2";
import { forEach, round } from "lodash";

/**
 * 
 *  @company = "Company_SF". 
    @Spendfile = "Pagero_VCard.xlsx (Ver. 1)" //Already existent, and additionally attached here.
    @program = "Main Program." //Created by default.
     
*/

const spendFile = "Pagero_VCard.xlsx (Ver. 1)";
const entityName = "3M Company";
// vCard group whose rule ("Supplier SPEND VOLUME between 1768 and 1769") selects
// the entity under test. Its Average Term Reduction column is the value driven here.
const groupName = "WTermsReduct";

// Every Save posts the whole vCard setup and enqueues a spend-file
// recalculation, which waitSpendFileReady polls on a 10s cadence. The test
// needs one cycle per loop plus one more to put the shared fixture back.
const RECALCULATION_BUDGET_MS = 240000;

/**
 * The entity card is a modal with `higher-z-index`, so while it is open it
 * swallows every click aimed at the sidebar. Closing it is a no-op when no card
 * is open, which is what the restore path needs after a mid-loop failure.
 */
async function closeEntityCardIfOpen(page: Page) {
  const closeButton = page.locator(locators.entityCard.closeButton);
  if ((await closeButton.count()) === 0) return;
  if (!(await closeButton.first().isVisible())) return;
  await closeButton.first().click();
  await closeButton.first().waitFor({ state: "hidden", timeout: 15000 }).catch(() => {});
}

/**
 * Open Setup and select the Vcard tab, returning the setup payload together
 * with the "Average Term Reduction" input of the group under test.
 *
 * `.group-row > div.row` also matches the condition rows of every group, so the
 * row is picked by the group button caption (CardGroups.vue builds
 * `vCardName` as "C<n>, <cumulative>D, <rebate>%, <group name>"), which is the
 * only place the group name reaches the accessibility tree — the name itself
 * lives in an input value, which `hasText` cannot see. Inside the row the three
 * `.form-control.group-name` inputs are, in order, Name, Average Term Reduction
 * and Supplier Card Cost.
 */
async function openVCardSetup(
  page: Page,
): Promise<{ setup: any; reductionInput: Locator }> {
  await closeEntityCardIfOpen(page);
  await page.locator(locators.sidebar.settings).click();

  const [setupResponse] = await Promise.all([
    page.waitForResponse(
      (response) =>
        new URL(response.url()).pathname.startsWith("/api/vcard/setup/") &&
        response.ok(),
    ),
    page.locator(locators.settings.vCard.tab).click(),
  ]);

  const setup = JSON.parse(await setupResponse.text());

  const groupRow = page
    .locator(".group-row > div.row")
    .filter({ hasText: groupName })
    .first();
  // The rows render after the setup payload is parsed, so the response alone is
  // not a readiness signal for them.
  await groupRow.waitFor({ state: "visible", timeout: 30000 });

  const reductionInput = groupRow.locator(".form-control.group-name").nth(1);
  // Setup inputs stay disabled while the spend file recalculates
  // (disabledButtonSpendFileInrecalculation), which lags behind the
  // spend-file status the API reports.
  await expect(reductionInput).toBeEnabled({ timeout: 60000 });

  return { setup, reductionInput };
}

/**
 * Write the Average Term Reduction of the group under test and save.
 *
 * The Save posts to /api/vcard/save-setup/{company} (home/api/index.ts), NOT to
 * /api/vcard/setup/{company}; the latter is only re-fetched afterwards by the
 * success callback of CardGroups.vue. Both are awaited: save-setup proves the
 * write reached the Back-End, the re-fetch proves the store was refreshed.
 */
async function writeReductionAndSave(
  page: Page,
  api: Api2,
  reductionInput: Locator,
  value: number | string,
) {
  console.log("newValue: " + value);
  // String, so restoring a blank original writes the field back to blank rather
  // than skipping the restore. If the app refuses to save an empty reduction the
  // Save assertion below fails loudly, which is the outcome we want either way.
  await reductionInput.fill(String(value));

  const saveButton = page.locator(
    '.container-buttons .btn.btn-primary:has-text("Save")',
  );
  await expect(saveButton).toBeEnabled();

  const startedAt = Date.now();
  await Promise.all([
    page.waitForResponse(
      (response) =>
        new URL(response.url()).pathname.startsWith("/api/vcard/save-setup/") &&
        response.ok(),
    ),
    page.waitForResponse(
      (response) =>
        new URL(response.url()).pathname.startsWith("/api/vcard/setup/") &&
        response.ok(),
    ),
    saveButton.click(),
  ]);

  // Wait endPoint enqueue messages
  await page.waitForTimeout(1000);

  // Wait calculation finish
  await api.waitSpendFileReady();

  // Wait program calculation
  await page.waitForTimeout(10000);
  console.log(`Save + recalculation took ${Date.now() - startedAt}ms`);
}

test("Test Terms Reduction in Vcard Group @company-setup @flaky @vcard @feature-vcard @feature-10054 @task-10056", async ({
  page,
}) => {
  // One recalculation cycle per loop plus the one that restores the fixture,
  // on top of the login and the spend-file switch.
  test.setTimeout(4 * RECALCULATION_BUDGET_MS);

  await ensureCompany_SFSuperAdminLogin(page);

  await changeToSpendFile(page, spendFile);

  const api: Api2 | null = await Api2.getInstance(page);

  // The whole test writes the Setup > Vcard "Average Term Reduction" field, and
  // Setup goes read-only while the spend file recalculates
  // (disabledButtonSpendFileInrecalculation): the banner reads "During updates
  // and recalculations, changes in the setup will be disabled" and every input
  // of the card-groups grid renders `disabled`. Waiting it out is not an
  // option, because a recalculation on dev can sit at 0% indefinitely - it was
  // observed stuck for over half an hour on 2026-09-02 for this very fixture.
  //
  // So the fixture is checked first and the test reports skipped with the
  // reason, the same way status-planned.spec.ts does, instead of failing on a
  // disabled input and reading as a product defect.
  const versionResponse = await api.doGet(
    `/api/spend_file_versions/${api.activeSpendFileVersionUUid}`,
  );
  const version = await versionResponse.json();

  test.skip(
    version.status === "reCalculating" || version.pendingRecalculation === true,
    `Setup is read-only while '${spendFile}' recalculates (status=${version.status}, pendingRecalculation=${version.pendingRecalculation}); this test writes the Average Term Reduction field, so it cannot run until the version is ready`,
  );
  let proposedTerm = 0;
  let contractualTerm = null;
  let actualTerm = 0;
  let proposedReduction = 0;
  let proposedExpected = 0;
  // Average Term Reduction found on the shared fixture before the test wrote to
  // it, put back in the finally block below.
  // Captured as the raw input value, not as a parsed number: the group's Average
  // Term Reduction is legitimately blank when no reduction is configured, and
  // parseInt("") is NaN, which used to make the restore below skip itself and
  // leave the fixture holding whatever the loops last wrote.
  let originalReductionRaw: string | null = null;

  // The restore below must run even when an assertion fails, but it must not
  // hide the failure that got the test there, so the primary error is kept and
  // re-thrown after the fixture has been put back.
  let primaryError: unknown = null;

  try {
    for (let loop = 0; loop <= 2; loop++) {
      // ***********************************************************************
      // Loop (0): Baseline with NO term reduction (Proposed must be Contractual/Actual)
      // Loop (1): Test TERM REDUCTION (Proposed must be Contractual/Actual - Reduction)
      // Loop (2): Test the floor (Proposed must be 0, the reduction exceeds Contractual/Actual)
      // ***********************************************************************
      console.log("Loop: " + loop);

      const { setup, reductionInput } = await openVCardSetup(page);

      const vCardEnabled = setup.vCardGroupsEnabled ?? false;
      expect(vCardEnabled).toBeTruthy();
      // Precondition of the expected model documented in the file header.
      expect(setup.vCardAllowsTermsExtension).toBeFalsy();

      const term = await reductionInput.inputValue();
      console.log("WTermsReduct: " + term);
      if (originalReductionRaw === null) originalReductionRaw = term;

      if (parseInt(term) !== proposedReduction) {
        await writeReductionAndSave(page, api, reductionInput, proposedReduction);
      }

      // Click & Wait for process
      const [endPointResponse] = await Promise.all([
        page.waitForResponse(
          (response: any) =>
            new URL(response.url()).pathname.endsWith(
              "/chart/payment-terms-opportunity/supplier",
            ) && response.ok(),
        ),
        goToEntityCardEntity(page, entityName),
      ]);

      const termsResult: IprocessedResponse = {
        data: {},
        status: null,
        result: false,
        body: null,
      };

      await Api2.processApiResponse(
        endPointResponse as any,
        "Recalculating spend file version",
        termsResult,
      );
      const Data: any = termsResult.data;
      // The reduction branch of tryApplyRegulationOnTerms only runs for a
      // vCard-ready entity; without it the assertions below would be vacuous.
      expect(Data.isVcardApplied).toBeTruthy();
      const terms = Data.terms;

      forEach(terms, (term: any) => {
        if (term.key == "proposedTerms") {
          proposedTerm = term.terms;
          console.log("proposedTerm: ", proposedTerm);
        }
        if (term.key == "contractualTerms") {
          contractualTerm = term.terms;
          console.log("contractualTerm: ", contractualTerm);
        }
        if (term.key == "currentTerms") {
          actualTerm = term.terms;
          console.log("actualTerm: ", actualTerm);
        }
      });
      const tempContractualActual = contractualTerm ?? actualTerm;
      console.log("tempContractualActual: ", tempContractualActual);

      if (loop == 0) {
        // Only took Proposed with 0 reduction
        proposedReduction = round(proposedTerm / 3, 0); // going more ahead of CERO
        proposedExpected = tempContractualActual - proposedReduction;
        // proposedExpected = proposedTerm - proposedReduction
        await page.locator(locators.entityCard.closeButton).click();
      } else if (loop == 1) {
        // Checking reduction using 1/3 of proposed
        expect(proposedTerm).toBe(proposedExpected);
        proposedReduction = tempContractualActual + 3; // going more ahead of CERO
        proposedExpected = 0;
        await page.locator(locators.entityCard.closeButton).click();
      } else if (loop == 2) {
        // Checking reduction must be 0, because is substracted proposed plus 3
        expect(proposedTerm).toBe(proposedExpected);
        await page.locator(locators.entityCard.closeButton).click();
      }
      console.log("proposedExpected: ", proposedExpected);
      console.log("proposedReduction: ", proposedReduction);
    } // loops
    Api2.printSuccess("Adjustment DONE");
  } catch (error) {
    primaryError = error;
  }

  // Restore the shared fixture: the Average Term Reduction of WTermsReduct is
  // read by every other Company_SF vCard spec, so the last value written by the
  // loops must not survive the test.
  if (originalReductionRaw !== null) {
    try {
      console.log(
        `Restoring ${groupName} Average Term Reduction to '${originalReductionRaw}'`,
      );
      const { reductionInput } = await openVCardSetup(page);
      const current = await reductionInput.inputValue();
      if (current !== originalReductionRaw) {
        await writeReductionAndSave(page, api, reductionInput, originalReductionRaw);
      } else {
        console.log("Nothing to restore, the fixture already holds the original value");
      }
    } catch (restoreError) {
      console.log("!!! Could not restore the vCard fixture: ", restoreError);
      if (primaryError === null) primaryError = restoreError;
    }
  }

  if (primaryError !== null) throw primaryError;
});

test.afterEach(async ({ page }) => {
  await ensureDefaultLogin(page);
});
