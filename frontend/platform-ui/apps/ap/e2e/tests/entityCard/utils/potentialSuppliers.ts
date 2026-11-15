/**
 * @fileoverview
 * Shared setup for the specs that exercise the Potential Suppliers view.
 *
 * The view is a main tab of the entity card and renders only while the
 * potential-suppliers feature is enabled for the company, which is a super
 * admin setting rather than anything a test user can reach - so every spec on
 * that view has to turn it on first.
 */

import { Page, expect } from "@playwright/test";
import { locators } from "../../utils/locators";
import { filterByField, toggleCheckBoxFeature } from "../../utils/kendoChartRelated";

export const POTENTIAL_SUPPLIERS_COMPANY = "Company Test";

const COMPANY_NAME_FIELD = "name";

/**
 * Enables the potential-suppliers feature for `company`, which the caller must
 * already be signed in for as super admin.
 *
 * `resetFeatures` is not enough here: CompaniesAdmin keeps Save disabled while
 * any company has the feature checked with a request limit of 0, so the limit
 * input - rendered only once the checkbox is on - must also hold a positive
 * value.
 */
export async function enablePotentialSuppliersFeature(
  page: Page,
  company: string = POTENTIAL_SUPPLIERS_COMPANY,
) {
  await page.locator(locators.headerMenu.topMenu.dropDownMenu).click();
  const [companiesResponse] = await Promise.all([
    page.waitForResponse(
      (response) => response.url().endsWith("/api/companies") && response.ok(),
    ),
    page.locator(locators.headerMenu.topMenu.adminConsole).click(),
  ]);
  const companiesBody = await companiesResponse.json();
  await filterByField(page, company, COMPANY_NAME_FIELD, {
    total: companiesBody["hydra:totalItems"],
    firstElement: companiesBody["hydra:member"][0].name,
  });

  const companyRow = page.locator("tr", {
    has: page.locator("td.k-grid-content-sticky", {
      hasText: new RegExp(`^${company}$`),
    }),
  });
  const featureCheckbox = companyRow.locator(
    'td.featurePotentialSuppliersIsAvailable input[type="checkbox"]',
  );
  await expect(featureCheckbox).toBeVisible();
  const featureWasOn = await featureCheckbox.isChecked();

  await toggleCheckBoxFeature(
    page,
    true,
    "featurePotentialSuppliersIsAvailable",
    company,
  );

  const limitInput = companyRow.locator("input.limit-input");
  await expect(limitInput).toBeVisible();
  const currentLimit = Number((await limitInput.inputValue()) || "0");
  console.log("Current potential-suppliers request limit: ", currentLimit);
  const limitNeedsFilling = !(currentLimit > 0);
  if (limitNeedsFilling) {
    await limitInput.fill("10");
    // The limit-changed emit fires on the change event, which needs a blur.
    await limitInput.press("Tab");
  }

  const saveButton = page.locator(
    locators.userMenu.adminConsole.companyView.saveChanges,
  );

  if (featureWasOn && !limitNeedsFilling) {
    // Nothing was edited, so there is nothing to save and Save stays disabled.
    // Deciding this from the state read above - rather than from the button -
    // keeps a pending edit from being mistaken for an already-valid company.
    console.log("Feature already enabled with a valid limit - nothing to save");
    await expect(saveButton).toBeDisabled();
    return;
  }

  // The checkbox change emit and the parent's dirty-state recompute are
  // asynchronous, so wait for Save to pick the pending edit up instead of
  // reading its disabled state one tick too early and skipping the save.
  await expect(saveButton).toBeEnabled();
  await Promise.all([
    page.waitForResponse(
      (response) => response.url().includes("/api/companies") && response.ok(),
    ),
    saveButton.click(),
  ]);
  console.log("Potential-suppliers feature saved for " + company);
}

/**
 * The Potential Suppliers main tab. The entity card's "Lists" sub-tab reuses
 * the `entity-lists-tab` id, so the label is what disambiguates them.
 */
export function potentialSuppliersTab(page: Page) {
  return page.locator("a#entity-lists-tab", { hasText: "Potential Suppliers" });
}
