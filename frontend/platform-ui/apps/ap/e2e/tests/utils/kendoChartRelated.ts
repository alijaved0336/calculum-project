import {Page} from "@playwright/test";
import {locators} from "./locators";
import { retryOperation, logOperation } from "./PlaywrightTestHelpers";

/**
 *
 * @param page
 * @param field
 * @param propertyName - property name from parsing or api which you are using for the specific column
 * @param waitForTotalItems
 */
export async function filterByField(
  page: Page,
  field: string | Array<string>,
  propertyName: string,
  waitForTotalItems: { total: number, firstElement: string } | null = null
) {
  const fields = typeof field === "string" ? [field] : field;
  if (waitForTotalItems !== null) {
    console.log('waitForTotalItems', waitForTotalItems)
    if (waitForTotalItems.total > 0) {
      const element = page.locator('td.k-grid-content-sticky', {hasText: waitForTotalItems.firstElement});
      if (!(await element.isVisible())) {
        console.log("waiting for table filled")
        await element.waitFor({state: 'visible'})
      } else {
        console.log("table already filled")
      }

    }
  }
  const column = page.getByRole("link", {name: `${propertyName} Column Menu`});
  logOperation("Opening column filter", { propertyName });

  await retryOperation(
    async () => {
      // Kendo column menu links are CSS-hidden (opacity 0) until hover;
      // scroll into view first, then force-click to bypass the visibility check.
      await column.waitFor({ state: "attached", timeout: 10000 });
      await column.scrollIntoViewIfNeeded();
      await column.click({ force: true });

      // Confirm the filter dropdown opened by waiting for the first target label
      await page.getByLabel(fields[0]).waitFor({ state: "visible", timeout: 5000 });
    },
    3,
    1000,
    `Open column filter menu for '${propertyName}'`,
  );

  for (const singleField of fields) {
    // click() avoids the post-state verification that check() performs;
    // the Kendo filter popup dismisses itself right after the click, so
    // check()'s "ensure checked" step races a detached element.
    await page.getByLabel(singleField).click({ force: true });
    console.log('element checked', singleField)
  }
  await page.getByRole("button", {name: "Filter"}).click({ force: true })
  await page.waitForTimeout(
    process.env.E2E_ENV_NAME === "LOCAL" ? 3500 : 2000,
  );
}

export async function confirmModal(page: Page) {
  const [response] = await Promise.all([
    page.waitForResponse(
      (res: any) =>
        res.url().includes("/api/analyze/update-spend-program-configurations") &&
        res.ok(),
    ),
    page
      .locator(".calculum-modal-content-custom.show-scroll.calculum-modal-md")
      .getByRole("button", {name: "Continue"})
      .click(),
  ]);

  // Get the JSON payload from the response
  return await response.json();
}


// The bulk actions are NOT in the grid's selection-column menu any more, and
// that menu cannot be reached from the program edit grid at all:
// `ListsCFEdit.vue` passes `handleEditProgramAction: true`, and
// `graphqlGridSelectableColumnMenu` (useGraphqlGridColumnCache.ts) returns
// false for exactly that combination, so `ColumnMenuActions` never mounts in
// the only view that asks for those actions. Probed on dev 2026-09-23: after
// "Select All Rows" the selection column's `th`
// (`k-grid-header-sticky filter-options`) carries no anchor at all, while every
// data column carries its `<field> Column Menu` link.
//
// They live in the "Selected: N" bar instead (`EditOptionProgram.vue` ->
// `CalculumDropdownEditProgramOption.vue`): one dropdown per action, each with
// id `dropdown-edit-program-option-<keyId>`, opened by clicking its
// `.dropdown-selected` and rendering its content in a Kendo Popup. The keyIds
// are vcardGroup, setTarget, financingGroup, harmonizationGroup, updateStatus,
// includeExclude, moveBetween, exportPdf, manageTeam, commodity,
// supplierIndustry, supplierCreditRating, supplierUltimateParent.
//
// For this helper the replacement is `#dropdown-edit-program-option-vcardGroup`
// plus, inside its popup, `.buttons_group_item` per group and
// `.remove_group_main` to clear it (VcardAction.vue). Left as it is until a
// run on dev can verify the rewrite end to end.
export async function setVCardBulk(page: Page, myobj: {
  propertyString: string | null;
  removeGroups?: boolean
} = {propertyString: null, removeGroups: false}) {
  await page.waitForTimeout(3000);

  // await page.locator(".k-icon.k-svg-icon.k-svg-i-more-vertical").filter({ has: page.locator(':visible') }).first().click();
  await page.getByRole('link', {name: 'selected Column Menu'}).click();

  await page.locator("span:has-text('Vcard Groups')").waitFor({state: 'visible', timeout: 5000});

  await page.locator("span:has-text('Vcard Groups')").hover();

  if (myobj.removeGroups) {

    await Promise.all([
      page.waitForResponse(
        (response) => response.url().includes("/api/analyze/update-spend-program-configurations") && response.ok(),
      ),
      page.locator(".remove-v-card-group").click()
    ])
  } else {

  }
}


export async function setTargetBulk(page: Page, propertyType: string) {
  await page
    .locator(".k-icon.k-svg-icon.k-svg-i-more-vertical")
    .first()
    .click();
  await page.locator("#set-target-span").hover();

  if (propertyType === "paymentTermsOpportunity") {
    await page.locator("#save-target-bulk-btn").click();
  } else if (propertyType === "custom") {
    await page.locator("#custom-target").click();
    await page.waitForTimeout(1500);
    await page.locator("#custom-input-target").fill("120");
    await page.locator("#save-target-bulk-btn").click();
  } else if (propertyType !== "clear") {
    await page
      .locator(`#${propertyType}-target`)
      .click({timeout: 3000})
      .catch(() => {
        throw new Error(`Target not found for property type: ${propertyType}`);
      });
    await page.locator("#save-target-bulk-btn").click();
  } else {
    await page.locator("#clear-target-bulk-btn").click();
  }
}

/**
 * Clears the filters for the given column
 *
 * @param page
 * @param propertyName
 */
export async function clearByField(page: Page, propertyName: string) {
  await page.getByRole("link", {name: `${propertyName} Column Menu`}).click();
  // await page.getByText("Select", { exact: true }).click();
  if (process.env.E2E_ENV_NAME === "LOCAL") {
    await page.waitForTimeout(8500);
  } else {
    await page.waitForTimeout(2500);
  }
  await page.getByRole("button", {name: "Clear"}).click();
  if (process.env.E2E_ENV_NAME === "LOCAL") {
    await page.waitForTimeout(5500);
  } else {
    await page.waitForTimeout(2000);
  }
}

export async function toggleCheckBoxFeature(
  page: Page,
  checked: boolean = false,
  nameProperty: string,
  rowIdentifier?: string,
) {
  // When a rowIdentifier is supplied, scope the checkbox to the <tr> whose
  // sticky name cell matches it exactly — otherwise the locator resolves to
  // every row in the grid (Kendo filter application can race test timing).
  const rowScope = rowIdentifier
    ? page.locator("tr", {
        has: page.locator("td.k-grid-content-sticky", {
          hasText: new RegExp(
            `^${rowIdentifier.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`,
          ),
        }),
      })
    : page;
  const checkBoxLocator = rowScope.locator(
    `td.${nameProperty} input[type="checkbox"]`,
  );
  const isCheckedCheck = await checkBoxLocator.isChecked();
  console.log(`Initial checkbox status: ${isCheckedCheck} to ${checked}`)
  if (checked && !isCheckedCheck) {
    // If we want the checkbox checked and it's not already checked
    await checkBoxLocator.check();
  } else if (!checked && isCheckedCheck) {
    // If we want the checkbox unchecked and it's currently checked
    await checkBoxLocator.uncheck();
  }
  // Wait for UI to update and confirm the final state
  await checkBoxLocator.isVisible()
  const finalCheckboxStatus = await checkBoxLocator.isChecked();
  console.log(`Final checkbox status: ${finalCheckboxStatus} from ${checked}`)
}

/**
 * selected all rows to exclude
 * @param page
 * @param reset
 */
export async function checkBoxAllRowsPhase(page: Page, reset: boolean = true) {
  if (reset) {
    await page.getByRole('checkbox', {name: 'Select All Rows'}).check();
    await page.waitForTimeout(1500);
  } else {
    await page.getByRole('checkbox', {name: 'Select All Rows'}).uncheck();
    await page.waitForTimeout(1500);
  }
}

/**
 * selected all rows to exclude
 * @param page
 * @param reset
 */
export async function checkBoxFeaturePilot(page: Page, reset: boolean = false) {
  let lastCheckboxStatus = await page
    .locator('input[type="checkbox"]')
    .last()
    .isChecked();

  if (reset) {
    if (!lastCheckboxStatus) {
      // need to be implemented
    } else {
      await page.locator('input[type="checkbox"]').last().uncheck();

      await page.waitForTimeout(2500);

      await page
        .locator('input[type="checkbox"]')
        .last()
        .isChecked();

      await Promise.all([
        page.waitForResponse(
          (response) =>
            response.url().includes("/api/companies") && response.ok(),
        ),
        page
          .locator(locators.userMenu.adminConsole.companyView.saveChanges)
          .click(),
      ]);
    }
  }

  if (!lastCheckboxStatus) {
    await page.locator('input[type="checkbox"]').last().check();

    await page.waitForTimeout(2500);
    await Promise.all([
      page.waitForResponse(
        (response) =>
          response.url().includes("/api/companies") && response.ok(),
      ),
      page
        .locator(locators.userMenu.adminConsole.companyView.saveChanges)
        .click(),
    ]);
  }
}

/**
 * selected all rows to exclude
 * @param page
 */
/**
 * BLOCKED: there is no Pilot Account entry in the edit-mode actions bar at all
 * (see the note on setVCardBulk for where the menu moved). ColumnMenuActions.vue
 * still renders "Pilot Account" with its Include and Exclude buttons, but that
 * component cannot mount in the program edit grid, and
 * CalculumDropdownEditProgramOption.vue offers no equivalent option. The bulk
 * pilot include/exclude is therefore unreachable in the product, which is a
 * question for product rather than a selector to re-derive.
 */
export async function selectAllRowsExclude(page: Page) {
  await page.getByRole("checkbox", {name: "Select All Rows"}).check();
  await page.waitForTimeout(1500);
  await page.getByRole("link", {name: "selected Column Menu"}).click();
  await page.waitForTimeout(1500);
  await page.getByText("Pilot Account Include Exclude").click();
  await page.waitForTimeout(1500);

  await Promise.all([
    page.waitForResponse(
      (response) =>
        response
          .url()
          .includes("/api/analyze/update-spend-program-configurations") &&
        response.ok(),
    ),
    page.getByRole("button", {name: "Exclude"}).click(),
  ]);
}

export async function filter(page: Page, company: any, nameField: string) {
  await page.waitForTimeout(2500);
  await filterByField(page, company, nameField);
}

export async function filterFeature(
  page: Page,
  checked: boolean = true,
  feature: any,
) {
  await toggleCheckBoxFeature(page, checked, feature);
  await page.waitForTimeout(2000);
}

export async function saveResults(page: Page) {
  let saveButton = await page
    .locator(locators.userMenu.adminConsole.companyView.saveChanges)
    .isDisabled();
  if (!saveButton) {
    await Promise.all([
      page.waitForResponse(
        (response: any) =>
          response.url().includes("/api/companies") && response.ok(),
      ),
      page
        .locator(locators.userMenu.adminConsole.companyView.saveChanges)
        .click(),
    ]);
  }
}
