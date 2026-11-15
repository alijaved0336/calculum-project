/**
 * Utility fns for Program section
 */

import { Locator, Page, Response, expect } from "@playwright/test";
import { goToProgramSection } from "../../utils/Utils";

export const PROGRAM_DEFAULT_NAME = "Main Program";

/**
 * Go to program and click on edit or show
 *
 * @param page
 * @param action
 * @param name
 * @param wait
 * @returns
 */
export async function goToProgramNameAndAction({
  page,
  action = "show",
  name = "",
  wait = true,
  isFromHome = true,
}: {
  page: Page;
  action?: "show" | "edit";
  name?: string;
  wait?: boolean;
  isFromHome?: boolean;
}) {
  // User is in Home section. Go to Program section first.
  if (isFromHome) {
    goToProgramSection(page);
  }

  let programCardLoc: Locator;

  // Program name not provided
  if (!name) {
    // Select first program
    programCardLoc = page.locator(".card-v2").first();
  } else {
    // Use exact match for program name
    programCardLoc = page.locator(".card-v2").filter({
      has: page.locator("span").getByText(name, { exact: true }),
    });

    // If there are multiple programs with similar name then select the first
    if ((await programCardLoc.count()) > 1) {
      programCardLoc = programCardLoc.first();
    }
  }

  if (action === "edit") {
    /**
     * Edit
     */
    

    // Go to program Edit page and wait for APIs
    await Promise.all([
      waitForFinancingGroupsFromApi(page),
      waitForFieldsDataFromApi(page),
      waitForHarmonizationGroupsFromApi(page),
      programCardLoc.getByRole("button", { name: "Edit" }).click(), // Click on edit button
    ]);

    if (
      await page
        .locator('button.btn.btn-primary >> span:has-text("Continue")')
        .isVisible()
    ) {
      await page
        .locator('button.btn.btn-primary >> span:has-text("Continue")')
        .click();
    }

    // Assert user is Program Edit page
    await expect(page).toHaveURL(/.*\/analyze\/step\/4/);
  } else {

    if (wait) await programCardLoc.locator('button:has-text("SHOW")').click();
    else await page.locator('button:has-text("SHOW")').click();

    // Assert user is in Program Overview page
    await expect(page).toHaveURL(/.*\/program_overview/);
  }
}

/**
 * Go to Program / List tab given its name
 * @param page {Page}
 * @param tabName {string}
 */
export async function goToProgramListLevelTab(page: Page, tabName: string) {
  

  // Click on tab
  await page.getByRole("tab", { name: tabName }).click();

  
}

export async function cardInProgram(
  page: Page,
  index: number
): Promise<Locator> {
  return page.locator(".card").nth(index);
}

// *** NINE BOX ***
interface Ids {
  uuid: string | undefined;
}

export interface Box {
  box: number;
  spends: number;
  suppliers: number;
  buyers: number;
  parents: number;
  volume: number;
  cashFlow: number;
  discounts: number;
  suppliersUuid: Array<Ids>;
  parentsUuid: Array<Ids>;
  spendsUuid: Array<Ids>;
}

export function initialize(): Box[] {
  let arrayNineBoxes: Box[] = [];

  for (let index = 0; index <= 9; index++) {
    arrayNineBoxes.push({
      box: index,
      spends: 0,
      suppliers: 0,
      buyers: 0,
      parents: 0,
      volume: 0,
      cashFlow: 0,
      discounts: 0,
      suppliersUuid: [],
      parentsUuid: [],
      spendsUuid: []
    });
  }
  return arrayNineBoxes;
}

export function fillDataNineBoxes(
  arrayNineBoxes: Box[],
  index: number,
  element: any
) {
  let listSuppliers = arrayNineBoxes[index].suppliersUuid;
  let listParents = arrayNineBoxes[index].parentsUuid;
  // this is for not repeat values
  let supplierUuid = listSuppliers.find(
    (item: Ids) => item.uuid == element["entityUuid"]
  );
  let parentUuid = listParents.find(
    (item: Ids) => item.uuid == element["parentUuid"]
  );

  if (!supplierUuid && element["entityUuid"]) {
    arrayNineBoxes[index].suppliersUuid.push({ uuid: element["entityUuid"] });
    arrayNineBoxes[index].suppliers += 1;
  }
  if (!parentUuid) {
    if (element["parentUuid"]) {
      arrayNineBoxes[index].parentsUuid.push({
        uuid: element["parentUuid"]
      });
      arrayNineBoxes[index].parents += 1;
    }
  }

  arrayNineBoxes[index].spends += 1;
  arrayNineBoxes[index].buyers = 1;
  arrayNineBoxes[index].volume +=
    element["volume"] !== null ? element["volume"] : 0;
  arrayNineBoxes[index].cashFlow +=
    element["modelCashFlow"] !== null ? element["modelCashFlow"] : 0;
  arrayNineBoxes[index].discounts +=
    element["capturedCashDiscount"] !== null
      ? element["capturedCashDiscount"]
      : 0;
}

export function fillDataNineBoxesSupplier(
  arrayNineBoxes: Box[],
  index: number,
  element: any
) {
  let listSuppliers = arrayNineBoxes[index].suppliersUuid;
  let listParents = arrayNineBoxes[index].parentsUuid;
  // this is for not repeat values
  let supplierUuid = listSuppliers.find(
    (item: Ids) => item.uuid == element["entityUuid"]
  );
  let parentUuid = listParents.find(
    (item: Ids) => item.uuid == element["parentUuid"]
  );

  if (!supplierUuid && element["entityUuid"]) {
    arrayNineBoxes[index].suppliersUuid.push({ uuid: element["entityUuid"] });
    arrayNineBoxes[index].suppliers += 1;
  }
  if (!parentUuid) {
    if (element["parentUuid"]) {
      arrayNineBoxes[index].parentsUuid.push({
        uuid: element["parentUuid"]
      });
      arrayNineBoxes[index].parents += 1;
    }
  }

  arrayNineBoxes[index].spends +=
    element["spendCounts"] !== null ? element["spendCounts"] : 0;
  arrayNineBoxes[index].buyers = 1;
  arrayNineBoxes[index].volume +=
    element["volume"] !== null ? element["volume"] : 0;
  arrayNineBoxes[index].cashFlow +=
    element["modelCashFlow"] !== null ? element["modelCashFlow"] : 0;
  arrayNineBoxes[index].discounts +=
    element["capturedCashDiscount"] !== null
      ? element["capturedCashDiscount"]
      : 0;
}

export function fillDataNineBoxesParent(
  arrayNineBoxes: Box[],
  index: number,
  element: any
) {
  let listParents = arrayNineBoxes[index].parentsUuid;
  let parentUuid = listParents.find(
    (item: Ids) => item.uuid == element["entityUuid"]
  );

  if (!parentUuid) {
    if (element["entityUuid"] && element["entityType"] === "parent") {
      arrayNineBoxes[index].parentsUuid.push({
        uuid: element["entityUuid"],
      });
      arrayNineBoxes[index].parents += 1;

      arrayNineBoxes[index].volume +=
        element["volume"] !== null ? element["volume"] : 0;
      arrayNineBoxes[index].cashFlow +=
        element["modelCashFlow"] !== null ? element["modelCashFlow"] : 0;
      arrayNineBoxes[index].discounts +=
        element["capturedCashDiscount"] !== null
          ? element["capturedCashDiscount"]
          : 0;
    }
  }

  arrayNineBoxes[index].suppliers +=
    element["supplierCounts"] !== null ? element["supplierCounts"] : 0;

  if (element["entityType"] && element["entityType"] === "supplier") {
    arrayNineBoxes[index].suppliers += 1;
  }

  arrayNineBoxes[index].spends +=
    element["spendCounts"] !== null ? element["spendCounts"] : 0;

    arrayNineBoxes[index].buyers = 1;
}

export function checkValues(
  level: string,
  nineBoxeResult: Box[],
  nineBoarrayNineBoxesResulteResult: Box[],
  checkBox0 = true
) {
  for (let index = 0; index < nineBoxeResult.length; index++) {
    

    if (!checkBox0 && index === 0) {
      continue;
    }
    expect(nineBoxeResult[index].box).toEqual(
      nineBoarrayNineBoxesResulteResult[index].box
    );

    if(level === 'spends') {
    expect(nineBoxeResult[index].spends).toEqual(
      nineBoarrayNineBoxesResulteResult[index].spends
    );
  }
    
    if(level === 'suppliers') {
    expect(nineBoxeResult[index].suppliers).toEqual(
      nineBoarrayNineBoxesResulteResult[index].suppliers
    );
    }
    if(level === 'buyers') {
    expect(nineBoxeResult[index].buyers).toEqual(
      nineBoarrayNineBoxesResulteResult[index].buyers
    );
  }
    if(level === 'parents') {
      expect(nineBoxeResult[index].parents).toEqual(
        nineBoarrayNineBoxesResulteResult[index].parents
      );
    }
    
    expect(nineBoxeResult[index].volume).toBeCloseTo(
      nineBoarrayNineBoxesResulteResult[index].volume,
      0
    );
    expect(nineBoxeResult[index].cashFlow).toBeCloseTo(
      nineBoarrayNineBoxesResulteResult[index].cashFlow,
      0
    );
    expect(nineBoxeResult[index].discounts).toBeCloseTo(
      nineBoarrayNineBoxesResulteResult[index].discounts,
      0
    );
  }
}

// *** Analyze API Waiters ***
/**
 *
 * @param {Page} page
 * @return {Promise<>}
 */
export async function waitForProgramsFromApi(page: Page): Promise<Response> {
  return page.waitForResponse(
    response => response.url().includes("/analyze_programs") && response.ok()
  );
}

/**
 *
 */
export async function waitForHarmonizationGroupsFromApi(page: Page) {
  return page.waitForResponse(
    response =>
      response.url().endsWith("/harmonization_groups") && response.ok()
  );
}

/**
 *
 */
export async function waitForFinancingGroupsFromApi(page: Page) {
  return page.waitForResponse(
    response => response.url().endsWith("/financing_groups") && response.ok()
  );
}

/**
 *
 */
export async function waitForProgramsSpendInfoFromApi(page: Page) {
  return page.waitForResponse(
    response =>
      response.url().endsWith("/analyze/programs/spend-info") && response.ok()
  );
}

/**
 *
 */
export async function waitForProgramsPotentialsCostFromApi(page: Page) {
  return page.waitForResponse(
    response =>
      response.url().endsWith("/analyze/programs/potentials-cost") &&
      response.ok()
  );
}

/**
 *
 */
export async function waitForProgramsPaymentTermsFromApi(page: Page) {
  return page.waitForResponse(
    response =>
      response.url().endsWith("/analyze/programs/payment-terms") &&
      response.ok()
  );
}

// *** END Analyze API Waiters ***

/**
 * Used for getRuleFiltersPossibilities
 */
export async function waitForFieldsDataFromApi(page: Page): Promise<Response> {
  return page.waitForResponse(
    response =>
      response.url().endsWith("/api/rules/get-fields-data") && response.ok()
  );
}

/**
 *
 * @param {Page} page - The page object representing the web page.
 * @return {Promise<Response>} A promise that resolves to the response when the programs are retrieved successfully.
 */
export async function waitForProgramsInEntitiesSectionFromApi(page: Page) {
  return page.waitForResponse(
    response => response.url().endsWith("/programs") && response.ok()
  );
}

// *** Spend File Versions API Waiters ***

/**
 *
 */
export async function waitForSpendFileVAnalyzeProgramsFromApi(
  page: Page
): Promise<Response> {
  return page.waitForResponse(
    response =>
      response.url().includes("/spend_file_versions/") &&
      response.url().includes("/analyze_programs") &&
      response.ok()
  );
}

// *** END Spend File Versions API Waiters ***
