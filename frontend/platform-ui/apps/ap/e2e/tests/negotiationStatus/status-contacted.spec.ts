import { Page, expect, test } from "@playwright/test";

import { changeToSpendFile, goToHomeSection } from "../utils/Utils";
import { GlobalFiltersUtils } from "../utils";
import ProgramUtils from "../utils/ProgramUtils";
import { GraphQlUtils, isNullOrUndefined } from "../utils";
import { goToPlanNameAndAction } from "../plan/utils";
import { locators } from "../utils/locators";
import {
  waitForNegotiationStatusUpdateFromApi,
  waitForSpendsByProgramAndProviderFromApi,
} from "../entityCard/utils";
import {
  closeLeftoverModals,
  openFirstPhaseEditModal,
  waitForGraphqlGridResponse,
  waitForPhaseSave,
} from "./utils";

// Same fixture as status-planned: the plan section lists the plans of the
// whole ACTIVE spend file version (getAllPlans filters by
// program.spendFileVersion.uuid). The program is still pinned because the
// entity-card and phase-grid requests are program-scoped; the pin runs from
// the Home dashboard, whose program dropdown renders whenever the version
// holds several programs.
const SPEND_FILE_VERSION_NAME: string = "Company Testing.xlsx (Ver. 1)";
const PROGRAM_NAME: string = "RABC-CF-Test-Multiple-Spend-By-Spend";

let entity: any;
let addedToPhase = false;

/** The phase grid row of the target supplier (child rows carry no expander link). */
function supplierRow(page: Page, entityName: string) {
  return page
    .getByRole("row")
    .filter({ hasText: entityName })
    .filter({ has: page.getByRole("link", { name: "Expand Details" }) })
    .first();
}

/**
 * Open the entity card of the supplier from the phase grid and return the
 * spends of the get_spends_by_program_and_provider response.
 */
async function openEntityDetails(page: Page, entityName: string): Promise<any[]> {
  const [responseEntityDetails] = await Promise.all([
    waitForSpendsByProgramAndProviderFromApi(page),
    supplierRow(page, entityName).getByText(entityName).first().click(),
  ]);

  return responseEntityDetails.json();
}

/**
 * On the opened entity card, select the tab of the given spend and move its
 * negotiation status through the pill dropdown option with the given label.
 */
async function changeSpendStatus(
  page: Page,
  spendAlias: string,
  optionLabel: RegExp,
) {
  console.log(`Going to the '${spendAlias}' tab`);

  await page.getByRole("tab", { name: spendAlias }).first().click();

  // Only one status pill is rendered at a time (supplier or selected spend).
  const pill = page.getByTestId("pill-badge-with-dropdown");

  await expect(pill).toBeVisible({ timeout: 30000 });
  await pill.click();

  await Promise.all([
    waitForNegotiationStatusUpdateFromApi(page),
    page
      .locator("#dropdown-for-pill-badge span", { hasText: optionLabel })
      .first()
      .click(),
  ]);
}

// Plan / List / Suppliers (planned) -> contacted spends -> Supplier (contacted)
test(`in the list tab of the plan section, if a supplier status is contacted,
  all its spends statuses should be contacted @tc-7265 @us-7161 @negotiation-status`, async ({
  page,
}: {
  page: Page;
}) => {
  await goToHomeSection(page);

  // A leftover global filter from another spec silently empties the plan
  // grids: they refetch with the applied filter on mount.
  await GlobalFiltersUtils.clearAllFiltersFromNavbar(page);

  await changeToSpendFile(page, SPEND_FILE_VERSION_NAME);

  await ProgramUtils.changeToProgram(page, PROGRAM_NAME, { wait: false });

  // The plan view fires the phase suppliers grid query while it loads, so the
  // waiter must be registered before navigating.
  const phaseGridPromise = waitForGraphqlGridResponse(
    page,
    "collectionQueryProgramListSuppliers",
    "suppliers",
    60000,
  ).catch(() => null);

  const responsePlanNameAndAction = await goToPlanNameAndAction(page);

  test.skip(
    isNullOrUndefined(responsePlanNameAndAction),
    "No plan exists for the fixture spend file version",
  );

  const resultPlanNameAndAction = await responsePlanNameAndAction!.json();

  expect(
    !isNullOrUndefined(resultPlanNameAndAction["hydra:member"]) &&
      resultPlanNameAndAction["hydra:member"].length,
    "Plan was not found in the list of plans",
  ).toBeGreaterThan(0);

  // Tab 0 is "All Phases"; tab 1 is the first phase. Selecting it filters the
  // already-loaded grids client-side, so the phase card is the readiness one.
  const tabPhase1Loc = page.getByRole("tab").nth(1);

  await expect(tabPhase1Loc).toBeVisible();
  await tabPhase1Loc.click();
  await expect(page.locator(".card-view-plan").first()).toBeVisible({
    timeout: 30000,
  });

  const phaseGridResponse = await phaseGridPromise;

  test.skip(
    isNullOrUndefined(phaseGridResponse),
    "The phase suppliers grid query was not observed while the plan loaded",
  );

  const phaseSuppliers = GraphQlUtils.getDataSuppliers(
    await phaseGridResponse!.json(),
  );

  console.log("Searching for a planned supplier with more than one spend");

  const candidates = phaseSuppliers.filter(
    (item: any) =>
      item.negotiationStatus === "planned" &&
      item.negotiationStatusCodes.split(",").length === 1 &&
      item.spendCounts > 1,
  );

  // The grid is paginated: only a candidate whose row is rendered is usable.
  entity = null;
  for (const candidate of candidates) {
    const visible = await supplierRow(page, candidate.entityName)
      .isVisible()
      .catch(() => false);
    if (visible) {
      entity = candidate;
      break;
    }
  }

  if (isNullOrUndefined(entity)) {
    console.log(
      "No planned supplier found. Adding an analyzed multi-spend supplier to the phase (it becomes planned)",
    );

    const responseEditPlan = await openFirstPhaseEditModal(page);
    const editCandidates = GraphQlUtils.getDataSuppliers(
      await responseEditPlan.json(),
    ).filter(
      (item: any) =>
        item.negotiationStatus === "analyzed" &&
        item.negotiationStatusCodes.split(",").length === 1 &&
        item.spendCounts > 1,
    );

    const modal = page.getByTestId("modal");

    let addable: any = null;
    for (const candidate of editCandidates) {
      const visible = await modal
        .getByRole("row")
        .filter({ hasText: candidate.entityName })
        .first()
        .isVisible()
        .catch(() => false);
      if (visible) {
        addable = candidate;
        break;
      }
    }

    // Observed on dev (2026-08-27): the phase edit grid renders only its
    // header while every spend file version is flagged pendingRecalculation
    // and plan editing shows "Disabled until recalculations are complete".
    test.skip(
      isNullOrUndefined(addable),
      "No planned supplier in the phase and no analyzed multi-spend supplier is rendered on the phase edit grid - plan editing is blocked while the spend file version is pending recalculation on this environment",
    );

    console.log(`Adding ${addable.entityName} with ${addable.spendCounts} spends`);

    await modal
      .getByRole("row")
      .filter({ hasText: addable.entityName })
      .getByRole("checkbox")
      .check();

    await Promise.all([
      waitForPhaseSave(page),
      modal.getByRole("button", { name: "Save" }).click(),
    ]);

    await expect(page.getByTestId("modal")).toBeHidden({ timeout: 30000 });

    entity = addable;
    addedToPhase = true;
  }

  console.log(`Target supplier: ${entity.entityName} (${entity.spendCounts} spends)`);

  await expect(supplierRow(page, entity.entityName)).toBeVisible({
    timeout: 30000,
  });

  console.log("Opening entity details ...");

  const spends = await openEntityDetails(page, entity.entityName);

  console.log(
    `Spend tabs: ${spends.map((spend: any) => `${spend.alias} (${spend.negotiationStatus})`).join(", ")}`,
  );

  for (const spend of spends) {
    if (spend.negotiationStatus !== "planned") {
      console.log(
        `Skipping '${spend.alias}': its status is '${spend.negotiationStatus}'`,
      );
      continue;
    }

    await changeSpendStatus(page, spend.alias, /^Contacted$/);

    console.log(`Status set to contacted on ${spend.alias}`);
  }

  console.log(`Now ${entity.entityName} status should be contacted`);

  await page.locator(locators.entityCard.closeButton).click();

  console.log("Checking the entity status is contacted in the phase grid ...");

  await expect(
    supplierRow(page, entity.entityName)
      .getByRole("cell")
      .filter({ hasText: "Contacted" })
      .first(),
    "Entity status is not contacted in the phase grid",
  ).toBeVisible({ timeout: 60000 });
});

// *** Cleanup ***

test.afterEach(async ({ page }) => {
  if (isNullOrUndefined(entity)) {
    console.log("Entity was not modified");

    return;
  }

  console.log("Undoing changes ...");

  await closeLeftoverModals(page);

  const spendsUndo = await openEntityDetails(page, entity.entityName);

  for (const spend of spendsUndo) {
    if (spend.negotiationStatus !== "contacted") {
      continue;
    }

    await changeSpendStatus(page, spend.alias, /^Remove Contacted$/);

    console.log(`Contacted status removed on ${spend.alias}`);
  }

  await page.locator(locators.entityCard.closeButton).click();

  await expect(
    supplierRow(page, entity.entityName)
      .getByRole("cell")
      .filter({ hasText: "Planned" })
      .first(),
    "Entity status is not planned in the phase grid",
  ).toBeVisible({ timeout: 60000 });

  if (addedToPhase) {
    console.log(`Removing ${entity.entityName} from the phase ...`);

    const responseEditPlanUndo = await openFirstPhaseEditModal(page);
    const editSuppliers = GraphQlUtils.getDataSuppliers(
      await responseEditPlanUndo.json(),
    );

    if (
      !isNullOrUndefined(
        editSuppliers.find((item: any) => item.entityName === entity.entityName),
      )
    ) {
      await page
        .getByTestId("modal")
        .getByRole("row")
        .filter({ hasText: entity.entityName })
        .getByRole("checkbox")
        .uncheck();

      await Promise.all([
        waitForPhaseSave(page),
        page.getByTestId("modal").getByRole("button", { name: "Save" }).click(),
      ]);
    }
  }

  entity = null;
  addedToPhase = false;
});
