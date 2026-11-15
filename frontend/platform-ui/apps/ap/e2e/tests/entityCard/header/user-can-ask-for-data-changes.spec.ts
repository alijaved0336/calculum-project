/**
 * @fileoverview
 * E2E tests for "Request a change" functionality in the Entity Card header.
 *
 * This test suite validates that a user can open the "Request a change" modal from the entity card header,
 * sees the correct modal title and content, and can close the modal.
 *
 * Test Flow:
 * 1. Ensure default login before each test.
 * 2. Change to a specific spend file.
 * 3. Open the entity card for a given entity.
 * 4. Open the kebab menu and select "Request a change".
 * 5. Assert that the modal is visible and has the correct title.
 * 6. Assert that the modal contains the expected content.
 * 7. Close the modal and assert it is hidden.
 *
 * Acceptance Criteria:
 * - The "Request a change" modal opens from the kebab menu.
 * - The modal displays the correct title and content.
 * - The modal can be closed.
 * - The test is tagged for integrated, entity, and user story tracking.
 */


import { expect, test } from "@playwright/test";

// Global utils
import {
  assertModalHasRightTitle,
  assertModalIsVisible,
  changeToSpendFile,
  goToEntityCardEntity,
  assertModalIsHidden,
} from "../../utils/Utils";

// Entity card utils
import { clickKebabMenuOption } from "../../entityCard/utils";

/**
 * Create a new program and go to List tab.
 * This is executed only once before all the tests.
 */
import Api2 from "../../utils/APi2";

test.beforeEach(async ({ page }) => {
  // Go Home
  await page.goto("/");

  // Wait for loading modal to be hidden
  expect(page.locator(".loading-modal")).toBeHidden();

  // Change company spend file
  await changeToSpendFile(page, "Pagero_20230124.xlsx (Ver. 1)");

  // Wait for loading modal to be hidden
  await expect(page.locator(".loading-modal")).toBeHidden();

  // Go to Entity section
  await goToEntityCardEntity(page, "3M CO");
});

test("user can ask for data changes @integrated @entity @us-3914", async ({
  page,
}) => {
  // Click on the three dots menu icon
  await clickKebabMenuOption(page, "Request a change");

  // Assert modal is visible
  await assertModalIsVisible(page);

  /**
   * Check modal content
   */

  // Assert modal title is correct
  await assertModalHasRightTitle(page, "Request Data Change");

  // Assert modal text is correct
  await expect
    .soft(
      page.getByText(
        "Please describe the specific data parameters you would like to change or update ",
      ),
    )
    .toBeVisible();

  /**
   * Assert modal buttons
   */

  // Assert "Show Parameters" button is visible
  await expect
    .soft(page.getByRole("button", { name: "Show Parameters" }))
    .toHaveText("Show Parameters");

  // Assert parameters are showing when clicking on Show Parameters button
  await page.getByRole("button", { name: "Show Parameters" }).click();

  await expect
    .soft(
      page.getByText(
        "Country Credit Rating, Company Credit Rating, Funding Costs, Peer Group Average,",
      ),
    )
    .toBeVisible();

  // Assert parameters are hidden when clicking on Hide Parameters button
  await expect
    .soft(page.getByRole("button", { name: "Hide Parameters" }))
    .toBeVisible();

  await page.getByRole("button", { name: "Hide Parameters" }).click();

  await expect
    .soft(
      page.getByText(
        "Country Credit Rating, Company Credit Rating, Funding Costs, Peer Group Average,",
      ),
    )
    .toBeHidden();

  // Cancel button
  await expect(page.getByRole("button", { name: "Cancel" })).toHaveText(
    "Cancel",
  );

  // Assert modal is closed when clicking on Cancel button
  await page.getByRole("button", { name: "Cancel" }).click();

  // Assert modal is hidden
  await assertModalIsHidden(page);

  // Open modal again
  await clickKebabMenuOption(page, "Request a change");

  // Assert modal is visible
  await assertModalIsVisible(page);

  // Close button
  await expect(
    page.locator(".calculum-modal").getByRole("img").first(),
  ).toBeVisible();

  // Assert modal is closed when clicking on Close button
  await page
    .getByTestId("modal")
    .getByTestId("close-icon")
    .locator("path")
    .click();

  // Assert modal is hidden
  //await assertModalIsHidden(page);

  // Create a new data change request is tested in admin related tests
  // to be able to delete it after the test is finished
});
