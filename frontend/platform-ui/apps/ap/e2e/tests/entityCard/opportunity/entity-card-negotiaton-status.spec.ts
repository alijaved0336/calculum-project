
/**
 * Test suite for verifying negotiation status changes in the Entity Card component.
 * 
 * @file entity-card-negotiaton-status.spec.ts
 * @module e2e/tests/entityCard/opportunity
 * 
 * This suite covers:
 * - Changing negotiation status for parent entities belonging to a plan.
 * - Changing negotiation status for parent entities not belonging to a plan and their suppliers.
 * - Changing negotiation status for a spend line of a supplier not belonging to a plan.
 * 
 * Utilities:
 * - Uses Playwright for browser automation.
 * - Relies on custom utility functions for login, navigation, and spend file selection.
 * 
 * Test Data:
 * - Uses predefined entities and statuses for scenario coverage.
 * 
 * Helper Functions:
 * - `assertContactedRoundTrip`: Drives an entity to Contacted and back, asserting
 *   the update's own response and the status the card's pill shows each time.
 * - `changeStatus`: Handles status change interactions and validates backend responses.
 * - `openCardAndReadStatus`: Opens the card and returns the status on its pill.
 * - `goToEntityCardEntity`: Navigates to the entity card modal for a given entity.
 * 
 * @see ../../utils/Utils
 * @see @ada/design-system/locales/languages/en.json
 */
import { Page, test, expect } from "@playwright/test";
import { locators } from "../../utils/locators";
import {
  changeToSpendFile,
  ensureDefaultLogin,
  ensureStrategiesUserLogin,
  goToHomeSection,
} from "../../utils/Utils";
import englishKeys from "@ada/design-system/locales/languages/en.json";
const given = {
  company: "Company Strategies", //automatically determined by the user: joel+teststrategies@calculum.ai
  spendFile: "Pagero_Full-Winner-Strategy.xlsx (Ver. 1)",
  // No expected statuses here: each round trip reads its starting status from
  // the card's pill and asserts it comes back.
  levelParent: {
    parent: "Knorr-Bremse AG",
  },
  levelParent2: {
    parent: "WESTINGHOUSE AIR BRAKE TECHNOLOGIES CORP",
    // The search returns it as "Metalocaucho Sl": the exact-name lookup in
    // `goToEntityCardEntity` needs the name the API answers, not the trade name.
    supplier: "Metalocaucho Sl",
  },
  levelSupplier: {
    // On dev (2026-09-28) its Spend 1 is Agreed and its Spend 2 is Analyzed.
    supplier: "Tresse Metallique J Forissier",
  },
};
test.describe.serial("Changing status @us-12590", async () => {
  let page: Page;
  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();
    await ensureStrategiesUserLogin(page);
    // await changeToSpendFile(page, given.spendFile);
    await page.waitForSelector(".loading-modal", { state: "detached" });
  });
  // SKIPPED (this test only): fixture-blocked. It assumes
  // Knorr-Bremse AG belongs to a plan, but the entity card shows "Not in plan"
  // for the strategies user on dev — plans are user-scoped, that user has no
  // plans, and one cannot be seeded through the UI (NEW PLAN is gated while
  // its Main Program is not recalculated; see plan/move-between-phases.spec.ts).
  test.skip("The Negotiation Status change works for Parent that belongs to a Plan. @tc-12844", async () => {
    await assertContactedRoundTrip(page, given.levelParent.parent, {
      level: "parent",
    });
  });
  // These two used to be skipped because `changeStatus` waited on two requests
  // the app does not issue after an update: on success
  // `negotiationStatusAPIUpdate` toasts, remounts the pill and reloads the
  // card's `/detail`, never the spend list or the Ada Bot list, so the waits
  // timed out. It now waits on POST /api/entity-card/negotiation-status/update
  // and asserts its body, and the statuses are re-read from the card's own pill.
  test("The Negotiation Status change works for parents who do not belong to a Plan. @tc-12847", async () => {
    await assertContactedRoundTrip(page, given.levelParent2.parent, {
      level: "parent",
    });
    // The supplier opens at its default "Supplier" selection, so this round
    // trip is the suite's whole-supplier update (level "supplier").
    await assertContactedRoundTrip(page, given.levelParent2.supplier, {
      level: "supplier",
    });
  });

  // Spend line only. The whole-supplier half this case used to run is not
  // restorable on this supplier: its Spend 1 is Agreed, and a supplier-level
  // change to Contacted deletes the agreed terms of every spend it targets
  // (`cleanNegotiationData` in the back-end's NegotiationManager::changeStatus),
  // which "Remove Contacted" cannot put back. The whole-supplier update is
  // covered by tc-12847's round trip on "Metalocaucho Sl".
  test("The Negotiation Status change works for a Spend Line of a Supplier that doesn't belong to a Plan. @tc-12837", async () => {
    await assertContactedRoundTrip(page, given.levelSupplier.supplier, {
      level: "spend",
      spendTab: "Spend 2",
    });
  });

  test.afterAll(async () => {
    console.log("***Finishing test***");
    await ensureDefaultLogin(page);
    // Close the page's context (not the worker `browser` fixture) so the
    // worker stays alive for the next spec in the workers=1 pipeline.
    await page?.context().close().catch((error) => {
      console.error(
        "afterAll: page.context().close() failed (non-critical):",
        error instanceof Error ? error.message : String(error),
      );
    });
  });
});

/**
 * Which pill a round trip drives: the card's default selection, at the level
 * of the entity itself, or one spend tab of a supplier card.
 */
type RoundTripScope =
  | { level: "parent" | "supplier" }
  | { level: "spend"; spendTab: string };

/**
 * Take an entity to Contacted from the Entity Card pill and back again.
 *
 * Three things are asserted, and between them they are the claim of these
 * tests: the update goes out at the scope's level, it reports it changed at
 * least one spend, and the card's own pill shows the new status and then the
 * original one again. The round trip is also what leaves the shared fixture as
 * it was found.
 *
 * The statuses are read from the pill rather than from
 * `get_spends_by_program_and_provider`: that request is not issued on every
 * card open (the parent card of this fixture opens without it on dev), and the
 * update issues nothing at all.
 *
 * @param {Page} page
 * @param {string} entityName entity to drive, by exact name
 * @param {RoundTripScope} scope level to change at, and for a spend the tab
 * to select first
 */
async function assertContactedRoundTrip(
  page: Page,
  entityName: string,
  scope: RoundTripScope,
) {
  const contacted = englishKeys.global.contacted;

  const originalStatus = await openCardAndReadStatus(page, entityName, scope);

  expect(
    originalStatus,
    "the round trip has to start from a status that can be contacted",
  ).not.toBe(contacted);

  await changeStatus(page, contacted, scope.level);

  expect(await openCardAndReadStatus(page, entityName, scope)).toBe(contacted);

  await changeStatus(page, englishKeys.global.removeFromContacted, scope.level);

  expect(await openCardAndReadStatus(page, entityName, scope)).toBe(
    originalStatus,
  );

  // The next entity is reached through the navbar search, which the open card
  // covers.
  await page.locator(locators.entityCard.closeButton).click();
}

/**
 * Open the entity card and return the status its pill shows.
 *
 * For a spend the read is gated on the pill itself, not on a response. The
 * pill's label is computed from state the card already holds, so it follows
 * the tab in the same render, and `/chart/payment-terms-opportunity/spend` is
 * only requested after that. What can lag is the spend list
 * (`get_spends_by_program_and_provider`), requested when the tabs first
 * render: until it answers, the supplier-level pill stays mounted, showing the
 * supplier's status, and its dropdown would update the whole supplier. The
 * spend-level pill is a different component, so the supplier pill's node is
 * replaced exactly when the spend's own status renders. The helper marks that
 * node and waits for a pill without the mark.
 *
 * @param {Page} page
 * @param {string} entityName
 * @param {RoundTripScope} scope
 * @returns {Promise<string>} the status label
 */
async function openCardAndReadStatus(
  page: Page,
  entityName: string,
  scope: RoundTripScope,
): Promise<string> {
  await goToEntityCardEntity(page, entityName, 0, false, true, true);

  const modal = page.locator(".calculum-modal");
  const pill = modal.getByTestId("pill-badge-current-status");

  await expect(pill).toBeVisible();

  if (scope.level === "spend") {
    await pill.evaluate((el) => el.setAttribute("data-e2e-supplier-pill", ""));

    const tab = modal.getByRole("tab", { name: scope.spendTab, exact: true });

    await tab.click();
    await expect(tab).toHaveAttribute("aria-selected", "true");
    await expect(
      modal.locator(
        '[data-testid="pill-badge-current-status"]:not([data-e2e-supplier-pill])',
      ),
      `the pill never switched to ${scope.spendTab}'s own status`,
    ).toBeVisible();
  }

  return ((await pill.textContent()) ?? "").trim();
}

/**
 * Change the status of the open entity card through its pill dropdown.
 *
 * Gated on the update itself. After a successful update the app does not
 * refetch the spend list: `negotiationStatusAPIUpdate`'s callback toasts,
 * remounts the pill (`pillLabelNumberBadgeKey++`) and reloads the card's
 * `/detail`, so the waits this helper used to hold on
 * `get_spends_by_program_and_provider` and `entity/ada-bot/all/` could never
 * resolve. The request's level and the update's own body are asserted here,
 * and the caller re-reads the statuses by reopening the card.
 *
 * @param {Page} page
 * @param {string} newStatus label of the option to click
 * @param {RoundTripScope["level"]} level level the update has to go out at: a
 * pill that has not switched to its spend yet would send "supplier"
 */
async function changeStatus(
  page: Page,
  newStatus: string,
  level: RoundTripScope["level"],
) {
  const modal = page.locator(".calculum-modal");

  console.log(`Changing status to ${newStatus}`);

  await modal.getByTestId("chevron-down").click();

  const changeStatusPopover = page.locator("#dropdown-for-pill-badge");

  await changeStatusPopover.waitFor({ state: "visible" });

  const [response] = await Promise.all([
    page.waitForResponse(
      (res) =>
        new URL(res.url()).pathname ===
          "/api/entity-card/negotiation-status/update" && res.ok(),
    ),
    changeStatusPopover.getByText(newStatus, { exact: true }).click(),
  ]);

  expect(
    response.request().postDataJSON().level,
    "the update went out at the wrong level",
  ).toBe(level);

  const body = await response.json();

  expect(
    body.result,
    `the update answered "${body.result}": ${body.subject}`,
  ).not.toBe("failed");

  expect(
    body.summary.changedCount,
    "the update reported no spend changed",
  ).toBeGreaterThan(0);

  await page.locator(locators.entityCard.closeButton).click();
}

/**
 * Go to Entity Card given an entity name.
 *
 * @param {Page} page - The page object
 * @param {string} entityName - The name of the entity to search
 * @param {number} index - The index of the entity card to select
 * @param {boolean} wait - If true, the function will wait for the entity card modal to open
 * @param {boolean} exact - If true, the entity name must be exact, if false, it can be partial
 * @param {boolean} exactFull - If true, the function will search for the exact entity name in the response body and update the index accordingly
 * @returns {Promise<void>}
 */
async function goToEntityCardEntity(
  page: Page,
  entityName: string,
  index: number = 0,
  wait: boolean = true,
  exact: boolean = true,
  exactFull: boolean = false,
) {
  // Ensure we're on the home dashboard page where the dropdown exists
  if (!page.url().includes("/home-dashboard")) {
    console.log("** Not on home dashboard, navigating to it first...");
    await goToHomeSection(page, "goToEntityCardEntity");
  }

  console.log("Moving to entity: ", entityName);
  const search = page.getByPlaceholder(
    englishKeys.home.components.navbar.search,
  );

  // Type company name
  await search.fill(entityName);
  console.log("fill entitycard");
  const [resp] = await Promise.all([
    page.waitForResponse((response) =>
      response.url().endsWith("/api/entity-card/get-entity-cards"),
    ),
    await search.press("Enter"),
  ]);

  if (exactFull && resp.ok()) {
    const resBody = await resp.json();
    const exactIndex = resBody.findIndex(
      (entity: any) => entity.name === entityName,
    );

    // A missing match used to fall through as -1, which `nth(-1)` turns into
    // the last card of whatever the search returned — a different entity,
    // silently.
    expect(
      exactIndex,
      `the search returned no card named exactly "${entityName}": ${resBody
        .map((entity: any) => entity.name)
        .join(", ")}`,
    ).toBeGreaterThanOrEqual(0);

    index = exactIndex;
  }

  if (wait) {
    await Promise.all([
      page.waitForResponse(
        (res) =>
          res
            .url()
            .endsWith("/api/analyze/get_spends_by_program_and_provider") &&
          res.ok(),
      ),
      page.waitForResponse(
        (res: any) => res.url().includes("/spends") && res.ok(),
      ),
      page.locator(".current-name").nth(index).click(),
    ]);
  } else {
    await page.locator(".current-name").nth(index).click();
  }

  console.log(
    "Successfully selected the entity and the modal should be now open: ",
    entityName,
  );
}
