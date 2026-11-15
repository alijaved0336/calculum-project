import { expect, test } from "@playwright/test";

// Utils
import {
  assertModalHasRightTitle,
  changeToSpendFile,
  goToHomeSection,
  generateRandomString,
  ensureDefaultLogin
} from "../utils/Utils";
import { GlobalFiltersUtils } from "../utils";
import { Field, KeyValue } from "../../../apps/ap/src/types";


const spendFileName = "Pagero.xlsx (Ver. 1)";

test.beforeEach(async ({ page }) => {    

  await ensureDefaultLogin(page);
});

// Clean up
test.afterEach(async ({ page }) => {
  await GlobalFiltersUtils.clearAllFiltersFromNavbar(page);
});

test(`user can save global filters templates @global-filters @integrated @tc-5942 @us-5615`, async ({
  page
}) => {
  await goToHomeSection(page);

  await changeToSpendFile(page, spendFileName);

  await GlobalFiltersUtils.openModal(page);

  // *** Industry category / Commodity ***

  const fieldNameInAPIResponse1 = "commodity";

  const fieldName1 = "Commodity";

  await GlobalFiltersUtils.openCategory(page, "Industry");

  const [response1] = await Promise.all([
    GlobalFiltersUtils.waitForFieldResponse(page, fieldNameInAPIResponse1),
    GlobalFiltersUtils.openField(page, fieldName1)
  ]);

  const result1: KeyValue<Field, string[]> = await response1.json();

  expect(result1.value.length, "Response is empty.").toBeGreaterThan(0);

  const optionName1 = result1.value[0];

  await GlobalFiltersUtils.checkOptionInField(page, {
    fieldName: fieldName1,
    optionName: optionName1
  });

  // *** Buying Entity category / Buying Entity ***

  const fieldNameInAPIResponse2 = "buyerName";

  const fieldName2 = "Buying Entity Name";

  await GlobalFiltersUtils.openCategory(page, "Buying Entity");

  const [response2] = await Promise.all([
    GlobalFiltersUtils.waitForFieldResponse(page, fieldNameInAPIResponse2),
    GlobalFiltersUtils.openField(page, fieldName2)
  ]);

  const result2: KeyValue<Field, string[]> = await response2.json();

  expect(result2.value.length, "Response is empty.").toBeGreaterThan(0);

  const optionName2 = result2.value[0];

  await GlobalFiltersUtils.checkOptionInField(page, {
    fieldName: fieldName2,
    optionName: optionName2
  });

  await GlobalFiltersUtils.applyFilters(page);

  console.log("Saving template...");

  // User clicks on Save button to save the template
  await page
    .locator(".topbar-filters")
    .getByRole("button", { name: "Save" })
    .click();

  // Assert that the modal for saving the template is visible
  await assertModalHasRightTitle(page, "Save Filter");

  const templateName = `Filter1 ${generateRandomString(4)}`;

  console.log(`Template name: ${templateName}`);

  // User fills in the template name
  await page
    .getByTestId("modal")
    .getByRole("textbox")
    .fill(templateName);

  // User clicks on Save button
  const [responseSaveTemplate] = await Promise.all([
    page.waitForResponse(
      response =>
        response.url().endsWith("/global_filters_templates") && response.ok()
    ),
    page
      .getByTestId("modal")
      .getByRole("button", { name: "Save" })
      .click(),
    console.log("Saving template...")
  ]);

  

  // Assert that the template was saved successfully
  // Template name
  expect((await responseSaveTemplate.json()).title).toBe(templateName);

  // Filters
  expect(
    (await responseSaveTemplate.json()).filters.filters.length
  ).toBeGreaterThan(0);

  console.log("Asserting modal is closed...");

  // Assert that the modal is closed
  await expect(page.getByTestId("modal")).toBeHidden();

  console.log("Modal closed");

  // Assert active template selector is visible
  await expect(page.locator("#selectedGFTemplate")).toBeVisible();

  console.log("Removing filters...");

  // User removes the Commodity category filter badge from the navbar
  await page
    .locator(".filter-applied-badge")
    .first()
    .getByRole("img")
    .click();

  console.log("Waiting for noty to close...");

  await page.waitForTimeout(3000);

  console.log("Filters removed");

  console.log("Saving template...");

  // User clicks on Save button to save the template
  await page
    .locator(".topbar-filters")
    .getByRole("button", { name: "Save" })
    .click();

  console.log("Asserting save template modal is visible...");

  // Assert that the modal for saving the template is visible
  await assertModalHasRightTitle(page, "Save Filter");

  console.log("Asserting update template option is selected by default...");

  // Update option is selected by default
  await expect(page.getByTestId("modal").getByText("Update")).toBeChecked();

  // User clicks on Save button
  const [responseSaveTemplateUpdate] = await Promise.all([
    page.waitForResponse(
      response =>
        response.url().includes("/global_filters_templates/") && response.ok()
    ),
    page
      .getByTestId("modal")
      .getByRole("button", { name: "Save" })
      .click(),
    console.log("Saving template...")
  ]);

  

  // Assert that the template was saved successfully
  // Template name
  expect((await responseSaveTemplateUpdate.json()).title).toBe(templateName);

  // *** Clean up ***

  console.log("Cleaning up...");

  console.log("Going to saved filters...");

  await GlobalFiltersUtils.openModal(page);

  // User clicks on Saved Filters
  await GlobalFiltersUtils.openCategory(page, "Saved Filters");

  const iconTrashCount = await page.getByTestId("icon-trash").count();

  console.log(`iconTrashCount: ${iconTrashCount}`);

  // Check if there are any templates
  if (iconTrashCount <= 0) return;

  // User clicks on Delete button
  await Promise.all([
    page.waitForResponse(
      response =>
        response.url().includes("/global_filters_templates") && response.ok()
    ),
    page
      .locator(".body-right-side")
      .getByTestId("icon-trash")
      .first()
      .click(),
    console.log("Deleting template...")
  ]);

  console.log("Template deleted");
});
