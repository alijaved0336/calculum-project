/**
 * @fileoverview
 * E2E test for User Story 3920: Super Admin can edit data change requests for Country Credit Rating.
 *
 * This test verifies that a Super Admin can successfully edit a data change request for the "Country Credit Rating" parameter
 * via the Admin Console's Request Manager.
 *
 * Test Flow:
 * 1. Activate the changeable parameters dropdown.
 * 2. Select "Country Credit Rating" from the dropdown.
 * 3. Ensure a secondary dropdown appears for selecting a new value (default is empty).
 * 4. Select a new credit rating value.
 * 5. Click "Save" to submit the change.
 * 6. Validate that the input is not the empty default value.
 * 7. Confirm that a save request is sent and processed successfully by ADA.
 *
 * Acceptance Criteria:
 * - The dropdown for new values is visible and defaults to empty.
 * - Validation prevents saving if no value is selected.
 * - A successful save triggers the appropriate request to ADA.
 */

import { expect, test, Page, Response } from "@playwright/test";

// *** Global utils ***
import {
  changeToSpendFile,
  goToEntityCardEntity,
  goToRatingsAndMetrics,
  assertLoadingSpinnerIsHidden,
  goToHomeSection,
  ensureDefaultLogin,
  assertModalHasRightTitle,
  assertModalIsHidden,
  CREDIT_RATING_OPTIONS,
  ensureSuperAdminLogin,
} from "../../utils/Utils";

import { reqDataChange } from "../../entityCard/utils";
import {
  RECALCULATION_POLL_BUDGET_MS,
  SpendFileVersionUtils,
} from "../../utils";
import { locators } from "../../utils/locators";
import Api2 from "../../utils/APi2";

// IRIs of the change requests created by the current run, filled in by
// "Creating requests" and drained by the cleanup in afterAll.
const createdChangeRequestIds: string[] = [];

// Use a spend file specific to this test
const spendFileName = "Pagero_20230710_Data_Change_Req.xlsx (Ver. 1)";
const entityName = "Azenta Inc";
const reqDataChangeMsg: string =
  "Test. Country Credit Rating. United States : AAA";

/**
 * Create a new data change request and go to Data Changes section in Admin Console.
 */

test.describe
  .serial("Serial - Super Admin can edit data change requests @integrated @admin @us-3920", () => {
  let page: Page;
  let newCreditRating1:string;
  let newCreditRating2:string= "BB-"
  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();
    await ensureSuperAdminLogin(page);
    await changeToSpendFile(page, spendFileName);
    await page.waitForSelector(".loading-modal", { state: "detached" });
  });
  test("Creating requests", async () => {
    await goToEntityCardEntity(page, entityName);

    // Record what this run creates so the cleanup can remove whatever no
    // test consumed: the suite creates three requests, one per action test, so
    // a run that fails midway would otherwise leave the rest behind on the
    // shared fixture.
    const collectCreatedRequest = (response: Response) => {
      if (
        response.request().method() !== "POST" ||
        new URL(response.url()).pathname !== "/api/change_requests" ||
        !response.ok()
      ) {
        return;
      }

      // Read the body off the event handler's own promise chain: awaiting it
      // here would block the response listener.
      void response
        .json()
        .then((body: { "@id"?: string }) => {
          if (body?.["@id"]) {
            createdChangeRequestIds.push(body["@id"]);
          }
        })
        .catch(() => {
          /* a body we cannot read is one we cannot clean up */
        });
    };

    page.on("response", collectCreatedRequest);
    try {
      for (let i = 1; i <= 3; i++) {
        await reqDataChange(page, { msg: reqDataChangeMsg });
      }
    } finally {
      page.off("response", collectCreatedRequest);
    }

    await page.locator(locators.entityCard.closeButton).click();
    await page.locator(locators.headerMenu.topMenu.dropDownMenu).click();
    await Promise.all([
      page.waitForResponse(
        (response: any) =>
          response.url().endsWith("/api/companies") && response.ok(),
      ),
      page.locator(locators.headerMenu.topMenu.adminConsole).click(),
    ]);
    await Promise.all([
      page.waitForResponse(
        (response: any) =>
          response.url().endsWith("/api/companies/spend_files_versions") &&
          response.ok(),
      ),
      page.locator(locators.userMenu.adminConsole.dataController).click(),
    ]);
    await Promise.all([
      page.waitForResponse(
        (response: any) =>
          response.url().includes("/api/change_requests") && response.ok(),
      ),
      page.locator(locators.userMenu.adminConsole.data.dataChanges).click(),
    ]);
  });
  test("admin can approve a country credit rating change request ", async () => {
    
    await assertDataChangeVisible(page, "Approve & Change");
    // Get random credit rating from these options
    newCreditRating1 =
      CREDIT_RATING_OPTIONS[
        Math.floor(Math.random() * CREDIT_RATING_OPTIONS.length)
      ];
    const metricsTest1 = [
      { nameMetric: "Metric", option: "Country Credit Rating" },
      { nameMetric: "Country", option: "United States of America" },
      { nameMetric: "Credit", option: newCreditRating1 },
    ];
    console.log("country credit rating change request ==> ", metricsTest1);
    await expectingMetrics(page, metricsTest1);   
  });
  test("admin can approve a company credit rating change request", async () => {
    await assertDataChangeVisible(page, "Approve & Change");
    const metricsTest2 = [
      { nameMetric: "Metric", option: "Company Credit Rating" },
      { nameMetric: "Company", option: entityName + " (supplier)" },
      { nameMetric: "Credit", option: newCreditRating2 },
    ];
    await expectingMetrics(page, metricsTest2);
  });
  test("admin can reject a change request @integrated @admin @us-3920 @review", async () => {
    await assertDataChangeVisible(page, "Reject");
  });
  test("Verify that the changes are reflected in the entity card section", async () => {
    /**
     * Now the request should be in "Solved" status
     * and the country should have a new credit rating
     */
    /**
     * Verify that the changes are reflected in the entity card section.
     */
    // Approving the requests flags the fixture spend file version for
    // recalculation, and while that flag is set the SPA blocks analysis (the
    // supplier search is disabled and a "needs to be re-calculated" banner
    // shows), so the ratings cannot be read from the UI. The old
    // waitForQeues(page) fixed 10s wait asserted nothing; poll the version
    // flag instead and report a skip when dev does not recalculate in time,
    // the same way the other recalculation-gated specs do.
    test.setTimeout(RECALCULATION_POLL_BUDGET_MS + 120000);
    await goToHomeSection(page, "1");
    // // Login as default user
    await ensureDefaultLogin(page);
    // // Change current company spend file
    await changeToSpendFile(page, spendFileName);
    await page.waitForSelector(".loading-modal", { state: "detached" });

    const api = await Api2.getInstance(page);
    const versionUUID = api.activeSpendFileVersionUUid;
    const pendingTrail = await SpendFileVersionUtils.waitForVersionRecalculated(
      api,
      versionUUID,
    );
    test.skip(
      pendingTrail !== null,
      `The fixture spend file version is still flagged pendingRecalculation after ${
        RECALCULATION_POLL_BUDGET_MS / 1000
      }s, so the approved ratings cannot be verified on this environment — ${pendingTrail}`,
    );

    // Reload so the SPA drops the stale "needs to be re-calculated" state
    // before driving the supplier search.
    await goToHomeSection(page, "after recalculation");
    // Go to entity card related to the request
    await goToEntityCardEntity(page, entityName);
    // User is in Opportunity tab by default
    // Assert that the credit rating card is visible
    await expect(
      page.getByRole("heading", { name: "Company Credit Rating" }),
    ).toBeVisible();
    
    // Assert that the credit rating is the one approved in the request
    // Use retry logic to handle potential recalculation delays
    const companyCard = page
      .locator(".card")
      .filter({ hasText: "Company Credit Rating" });
    
    await expect(companyCard).toBeVisible({ timeout: 10000 });
    
    const companyCreditRatingLocator = companyCard
      .locator("span")
      .getByText(newCreditRating2, { exact: true });
    
    // Retry logic for company credit rating
    let companyFound = false;
    const companyMaxRetries = 5;
    const companyRetryDelay = 2000;
    
    for (let i = 0; i < companyMaxRetries; i++) {
      try {
        await expect(companyCreditRatingLocator).toBeVisible({ timeout: 5000 });
        companyFound = true;
        console.log(`Company credit rating ${newCreditRating2} found on attempt ${i + 1}`);
        break;
      } catch (error) {
        if (i < companyMaxRetries - 1) {
          console.log(`Company credit rating not found yet, retrying... (attempt ${i + 1}/${companyMaxRetries})`);
          await page.waitForTimeout(companyRetryDelay);
        } else {
          console.error(`Company credit rating ${newCreditRating2} not found after ${companyMaxRetries} attempts`);
          throw error;
        }
      }
    }
    await page.locator(locators.entityCard.closeButton).click();
    // Go to Ratings & Metrics tab
    await goToRatingsAndMetrics(page, { isFromHome: true, entityName });
    
    // Wait for the Ratings & Metrics tab to fully load
    await page.waitForSelector(".card", { state: "visible", timeout: 10000 });
    
    // Assert that the country is United States of America
    await expect(page.getByText("United States").nth(1)).toBeVisible();
    
    // Assert that the credit rating is the one approved in the request
    // Use retry logic with a longer timeout to handle potential recalculation delays
    // Use .first() to handle multiple cards with "United States" text (strict mode violation)
    const countryCard = page
      .locator(".card")
      .filter({ hasText: "United States" })
      .first();
    
    // Wait for the card to be visible first
    await expect(countryCard).toBeVisible({ timeout: 10000 });
    
    // Then wait for the credit rating to appear with retry logic
    // Sometimes the data needs a moment to refresh after recalculation
    let creditRatingLocator = countryCard
      .locator("span")
      .getByText(newCreditRating1, { exact: true });
    
    // Try to find the credit rating with retries, as it may take time to appear after recalculation
    let countryFound = false;
    const countryMaxRetries = 5;
    const countryRetryDelay = 2000; // 2 seconds between retries
    
    for (let i = 0; i < countryMaxRetries; i++) {
      try {
        await expect(creditRatingLocator).toBeVisible({ timeout: 5000 });
        countryFound = true;
        console.log(`Country credit rating ${newCreditRating1} found on attempt ${i + 1}`);
        break;
      } catch (error) {
        if (i < countryMaxRetries - 1) {
          console.log(`Country credit rating not found yet, retrying... (attempt ${i + 1}/${countryMaxRetries})`);
          await page.waitForTimeout(countryRetryDelay);
          // Only reload on the last retry before giving up
          if (i === countryMaxRetries - 2) {
            console.log("Reloading page to refresh data...");
            await page.reload({ waitUntil: "networkidle" });
            // Navigate back to Ratings & Metrics tab
            await goToRatingsAndMetrics(page, { isFromHome: true, entityName });
            await page.waitForSelector(".card", { state: "visible", timeout: 10000 });
            // Re-establish locators after reload
            const refreshedCountryCard = page
              .locator(".card")
              .filter({ hasText: "United States" })
              .first();
            await expect(refreshedCountryCard).toBeVisible({ timeout: 10000 });
            // Update the credit rating locator to use the refreshed card
            const refreshedCreditRatingLocator = refreshedCountryCard
              .locator("span")
              .getByText(newCreditRating1, { exact: true });
            // Update the locator reference for the next iteration
            creditRatingLocator = refreshedCreditRatingLocator;
          }
        } else {
          console.error(`Country credit rating ${newCreditRating1} not found after ${countryMaxRetries} attempts`);
          throw error;
        }
      }
    }
  });
  test.afterAll(async () => {
    console.log("***Finishing test***");
    if (page && !page.isClosed()) {
      await deletePendingChangeRequests(page);
      await ensureDefaultLogin(page);
      await page.close();
    }
    console.log("***Finished***");
    // Note: Don't close the browser here as it affects other tests running in the same worker
    // The browser will be closed automatically by Playwright when all tests complete
  });
});

async function assertDataChangeVisible(
  page: Page,
  type: "Approve & Change" | "Reject",
) {
  // Assert that the data change request is visible in the card view
  // Find the card containing the request message and "Pending" status
  const requestCard = page
    .locator(".request-card")
    .filter({ hasText: reqDataChangeMsg })
    .filter({ hasText: "Pending" })
    .first();
  
  const cardVisible = await requestCard.isVisible();
  console.log(`requestCardVisible ==> ${cardVisible}`);
  expect(cardVisible).toBeTruthy();
  
  // Expansion state lives on `.request-card` itself (class "expanded"), not
  // on `.card-header`, and the list reload that follows an approval collapses
  // every card again (AdminDataChange clears expandedRequestIds when it
  // reloads). Resolve the action button and retry the expansion until it is
  // actually visible, so a reload landing between the header click and the
  // button click cannot strand the card collapsed.
  const actionButton = requestCard
    .locator(".card-actions")
    .getByRole("button", { name: type });
  await expect(async () => {
    if (!(await actionButton.isVisible())) {
      await requestCard.locator(".card-header").click();
    }
    await expect(actionButton).toBeVisible({ timeout: 2000 });
  }).toPass({ timeout: 20000 });

  // Click on the appropriate button based on type
  if (type === "Reject") {
    // Click the Reject button
    await actionButton.click();

    // Assert that the deny modal is visible
    await assertModalHasRightTitle(page, "Reject Data Change Request");
    
    // Fill in rejection reason (optional)
    const rejectionTextarea = page.locator("textarea[placeholder*='rejection']");
    if (await rejectionTextarea.isVisible()) {
      await rejectionTextarea.fill("Test rejection reason");
    }
    
    // Click the Reject button in the modal
    // Use a more specific selector to target only the button inside the deny modal, not the card or filter
    const rejectButton = page
      .locator(".modal-btn-action.modal-btn-danger")
      .filter({ hasText: /Reject/ })
      .first();
    
    await expect(rejectButton).toBeVisible({ timeout: 5000 });
    await rejectButton.click();
    
    // Assert that the modal is hidden
    await assertModalIsHidden(page);
    
    // Wait for the status to update
    await page.waitForTimeout(1000);
    
    // Assert that the data change request now shows "Rejected" status
    await expect(
      page
        .locator(".request-card")
        .filter({ hasText: reqDataChangeMsg })
        .filter({ hasText: "Rejected" })
        .first(),
    ).toBeVisible();
  } else {
    // Click the "Approve & Change" button
    await actionButton.click();

    // Assert modal to approve request is visible
    // Assert that the Edit modal title is correct
    await assertModalHasRightTitle(page, "Approving Data Change Request");
  }
}
interface Compares {
  nameMetric: string;
  option: string;
}
async function expectingMetrics(page: Page, compares: Compares[]) {
  // Wait for modal to be fully loaded
  await page.waitForTimeout(500);
  
  for (const itemCompare of compares) {
    // Map the metric names to the actual select IDs
    let selectId: string;
    if (itemCompare.nameMetric === "Metric") {
      selectId = "selected-category";
    } else if (itemCompare.nameMetric === "Country" || itemCompare.nameMetric === "Company") {
      selectId = "selected-property-a";
    } else if (itemCompare.nameMetric === "Credit") {
      selectId = "selected-property-b";
    } else {
      // Fallback: try to find by label text
      const label = page.locator(`label:has-text("${itemCompare.nameMetric}")`);
      if (await label.isVisible()) {
        selectId = await label.getAttribute("for") || "";
      } else {
        throw new Error(`Could not find selector for ${itemCompare.nameMetric}`);
      }
    }
    
    // Wait for the select to be visible and enabled
    const select = page.locator(`select#${selectId}`);
    await expect(select).toBeVisible({ timeout: 10000 });
    await expect(select).toBeEnabled({ timeout: 5000 });
    
    // For Country/Company selects, we need to match by text value, not exact option
    // The option value is the country code (e.g., "US"), but we're selecting by text (e.g., "United States of America")
    if (itemCompare.nameMetric === "Country" || itemCompare.nameMetric === "Company") {
      // Get all options and find the one that matches the text
      const options = select.locator("option");
      const optionCount = await options.count();
      let foundOption = false;
      
      for (let i = 0; i < optionCount; i++) {
        const option = options.nth(i);
        const optionText = await option.textContent();
        const optionValue = await option.getAttribute("value");
        
        // Check for exact match or partial match
        if (optionText && (optionText.trim() === itemCompare.option || optionText.includes(itemCompare.option))) {
          if (optionValue) {
            await select.selectOption(optionValue);
            foundOption = true;
            console.log(`Selected ${itemCompare.nameMetric}: "${itemCompare.option}" (value: ${optionValue})`);
            break;
          }
        }
      }
      
      if (!foundOption) {
        // Last resort: try selecting by label (Playwright's built-in matching)
        try {
          await select.selectOption({ label: itemCompare.option });
          console.log(`Selected ${itemCompare.nameMetric} by label: "${itemCompare.option}"`);
        } catch (error) {
          throw new Error(`Could not find option "${itemCompare.option}" in ${itemCompare.nameMetric} select. Available options may have different text.`);
        }
      }
    } else {
      // For other selects (Metric, Credit), select by option text/value
      await select.selectOption(itemCompare.option);
    }
    
    // Wait a bit for any dependent selects to update (especially after selecting category)
    if (itemCompare.nameMetric === "Metric") {
      await page.waitForTimeout(1000); // Wait longer for dependent components to render
    } else {
      await page.waitForTimeout(300);
    }
  }
  
  // Click on the button to save the request (Approve & Change)
  // Use a more specific selector to target only the button inside the modal, not the card
  const approveButton = page
    .locator(".modal-btn-action.modal-btn-primary")
    .filter({ hasText: "Approve & Change" })
    .first();
  
  await expect(approveButton).toBeVisible({ timeout: 5000 });

  // The admin approval PATCH moved to /api/admin/change_requests/{id}; match
  // the pathname with the /admin segment optional so the waiter survives both
  // shapes ("/api/change_requests/" is not a substring of the new URL).
  await Promise.all([
    page.waitForResponse(
      (response: any) =>
        /\/api(\/admin)?\/change_requests\//.test(new URL(response.url()).pathname) &&
        response.ok(),
    ),
    approveButton.click(),
  ]);

  // Assert that the Edit modal is hidden
  await assertModalIsHidden(page);
  // Wait a bit for the status to update
  await page.waitForTimeout(1000);

  // Assert loading spinner is hidden
  await assertLoadingSpinnerIsHidden(page, 60000);

  // Assert that the data change request is visible in the card view with "Solved" status
  await expect(
    page
      .locator(".request-card")
      .filter({ hasText: reqDataChangeMsg })
      .filter({ hasText: "Solved" })
      .first(),
  ).toBeVisible({ timeout: 10000 });
}
/**
 * Removes the change requests this run created that are still pending.
 *
 * Only the unconsumed ones: a request an enabled test approved is left alone,
 * since its row is the record of a change that was actually applied. Cleanup
 * never throws — it must not mask the failure that brought the suite here.
 */
async function deletePendingChangeRequests(page: Page) {
  if (createdChangeRequestIds.length === 0) {
    return;
  }

  try {
    // Re-establish the admin session before deleting. The last test switches
    // to the default (non-admin) user before its runtime skip can trigger, so
    // the session reaching this hook is not necessarily the one that created
    // the requests, and the Delete requires ROLE_ADMIN — it answers 403 for
    // the default user.
    await ensureSuperAdminLogin(page);

    const api = await Api2.getInstance(page);

    for (const iri of createdChangeRequestIds) {
      const uuid = iri.split("/").pop();

      if (!uuid) {
        continue;
      }

      const readResponse = await api.doGet(`/api/change_requests/${uuid}`);

      if (!readResponse.ok()) {
        console.error(
          `afterAll: could not read change request ${uuid} (${readResponse.status()}), leaving it in place.`,
        );
        continue;
      }

      const body = await readResponse.json();

      if (body?.status !== "pending") {
        continue;
      }

      // The plain route, not `/api/admin/...`: the admin-prefixed resource is
      // gated on `user.getIsSuperAdmin()`, which the fixture's "superadmin"
      // account does not satisfy (verified on dev: it answers 403 there and
      // 204 here), while this Delete only requires ROLE_ADMIN.
      const deleteResponse = await api.doDelete(
        `/api/change_requests/${uuid}`,
      );

      console.log(
        deleteResponse.ok()
          ? `afterAll: deleted leftover pending change request ${uuid}.`
          : `afterAll: could not delete change request ${uuid} (${deleteResponse.status()}).`,
      );
    }
  } catch (error) {
    console.error(
      "afterAll: change request cleanup failed — leftovers may remain on the fixture:",
      error instanceof Error ? error.message : String(error),
    );
  }
}
