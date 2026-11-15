/**
 * TC
 */
import { test, expect, Page } from "@playwright/test";
import { changeToSpendFile, ensureDefaultLogin } from "./utils/Utils";
import { locators } from "./utils/locators";

let veryLow: string = "#4A5578"; // $color-coolgray-600
let low: string = "#FF4405"; // $color-orangedark-500
let medium: string = "#FFB524"; // $color-sun-yellow
let high: string = "#66C61C"; // $color-green-light
let veryHigh: string = "#0E9384"; // $color-teal-600

/** No Level */
let noLevel: string = "#EBECF0"; // $color-gray-200
let noLevelText: string = "#98A2B3"; // $color-gray-400
let colorArray = [veryLow, low, medium, high, veryHigh, noLevel, noLevelText];


test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await ensureDefaultLogin(page);
  await changeToSpendFile(page, "PageroFull_20230308_2.xlsx (Ver. 1)");
});

test("new colors are applied in entities section @entity @ui @us-5767", async ({
  page,
}) => {
  // Persisted state.json (`ada-app`) carries a `selectedProgram` for this user,
  // so the SPA can deep-link to /home/analyze/program_overview after goto('/').
  // Force-click the Home sidebar to land on /home-dashboard before continuing.
  if (!page.url().includes("/home-dashboard")) {
    await page.locator(locators.sidebar.home).click();
  }
  await expect(page).toHaveURL(/.*\/home\/home-dashboard/);

  console.log("Go to Entity First Available Card");

  await Promise.all([
    page.waitForResponse(
      (res: any) =>
        res.url().includes("/api/entity-card/get-recent-entity-cards") &&
        res.ok(),
    ),
    page.waitForResponse(
      (res: any) =>
        res.url().includes("/api/entity-card/get-entity-cards") && res.ok(),
    ),
    page.locator(locators.sidebar.entities).click(),
  ]);

  console.log("Go to Entity Card");

  await Promise.all([
    page.waitForResponse(
      (res: any) => res.url().includes("/credit-score") && res.ok(),
    ),
    page.waitForResponse(
      (res: any) =>
        res.url().includes("/api/entity-card/spend-program-configuration/") &&
        res.ok(),
    ),
    page.locator("div.card-body").first().click(),
  ]);

  await page.waitForTimeout(7000);
  console.log("Entity/Opportunity/Company Credit Rating");

  let companyBuyerCreditRating = page.locator(
    "div.card-body:has-text('Company Credit Rating')",
  );

  let pieChartSvg = companyBuyerCreditRating.locator("svg").nth(1);

  let countPaths = await pieChartSvg.locator("path").count();

  // Now you can access each path element and get its stroke color if needed
  for (let i = 0; i < countPaths; i++) {
    let pathElement = pieChartSvg.locator("path").nth(i);
    const strokeColor = await pathElement.evaluate((ele) => {
      return window.getComputedStyle(ele).getPropertyValue("stroke");
    });
    let hexColor = rgbToHex(strokeColor);
    let hasNewColor = isInArrayCaseInsensitive(hexColor, colorArray);

    expect(hasNewColor).toBeTruthy();
  }

  expect(await checkBacgroundColorBuyerLeverageMateriality(
    page,
    colorArray,
    1,
    false,'Buyer'
  )).toBeTruthy();

  console.log("click on buyer leverage materiality show details");

  await checkBacgroundColorBuyerLeverageMateriality(page, colorArray, 1, true,'Buyer');

  let showDetailsDashesTop = page
    .locator(".calculum-modal-content-custom >> .col.dash")
    .first();

  let showDetailsDashesBottom = page
    .locator(".calculum-modal-content-custom >> .col.dash")
    .last();

  let bgColorShowDetailsDashesTop = await showDetailsDashesTop.evaluate(
    (ele) => {
      return window.getComputedStyle(ele).getPropertyValue("background");
    },
  );

  let bgColorShowDetailsDashesBottom = await showDetailsDashesBottom.evaluate(
    (ele) => {
      return window.getComputedStyle(ele).getPropertyValue("background");
    },
  );

  expect( await getHasNewColor(page, colorArray, bgColorShowDetailsDashesTop)).toBeTruthy();

  expect(await getHasNewColor(page, colorArray, bgColorShowDetailsDashesBottom)).toBeTruthy();

  await page.waitForTimeout(5000);

  await page
    .getByTestId("modal")
    .getByTestId("close-icon")
    .locator("path")
    .click();

  console.log("Go to Ratings & Metrics");

  await Promise.all([
    page.waitForResponse(
      (res: any) => res.url().includes("/chart/country-rating") && res.ok(),
    ),
    page.waitForResponse(
      (res: any) =>
        res.url().includes("/chart/detail-financial-metrics") && res.ok(),
    ),
    page.waitForResponse(
      (res: any) => res.url().includes("/chart/industry-rating") && res.ok(),
    ),
    page.waitForResponse(
      (res: any) => res.url().includes("/data-depth-rating") && res.ok(),
    ),
    page.locator("#ratings-and-metrics-tab").click(),
  ]);

  await page.waitForTimeout(7000);

  console.log("Check Company Credit Rating");

  let selectedCard = page.locator(
    "div.card-body:has-text('Company Credit Rating')",
  );

  pieChartSvg = selectedCard.locator("svg").nth(1);

  // Count the number of path elements within the SVG
  countPaths = await pieChartSvg.locator("path").count();

  // Now you can access each path element and get its stroke color if needed
  for (let i = 0; i < countPaths; i++) {
    let pathElement = pieChartSvg.locator("path").nth(i);
    const strokeColor = await pathElement.evaluate((ele) => {
      return window.getComputedStyle(ele).getPropertyValue("stroke");
    });
    let hexColor = rgbToHex(strokeColor);
    let hasNewColor = isInArrayCaseInsensitive(hexColor, colorArray);
    expect(hasNewColor).toBeTruthy();
  }

  companyBuyerCreditRating = page.locator(
    "div.card-body:has-text('Company Credit Rating')",
  );
  pieChartSvg = companyBuyerCreditRating.locator("svg").nth(1);

  // Count the number of path elements within the SVG
  countPaths = await pieChartSvg.locator("path").count();

  // Now you can access each path element and get its stroke color if needed
  for (let i = 0; i < countPaths; i++) {
    let pathElement = pieChartSvg.locator("path").nth(i);
    const strokeColor = await pathElement.evaluate((ele) => {
      return window.getComputedStyle(ele).getPropertyValue("stroke");
    });
    let hexColor = rgbToHex(strokeColor);
    let hasNewColor = isInArrayCaseInsensitive(hexColor, colorArray);

    expect(hasNewColor).toBeTruthy();
  }

  console.log("Check Country Rating");
  selectedCard = page.locator("div.card-body:has-text('Country Rating')");
  pieChartSvg = selectedCard.locator("svg").nth(1);

  // Now you can access each path element and get its stroke color if needed
  for (let i = 0; i < countPaths; i++) {
    let pathElement = pieChartSvg.locator("path").nth(i);
    const strokeColor = await pathElement.evaluate((ele) => {
      return window.getComputedStyle(ele).getPropertyValue("stroke");
    });
    let hexColor = rgbToHex(strokeColor);
    let hasNewColor = isInArrayCaseInsensitive(hexColor, colorArray);

    expect(hasNewColor).toBeTruthy();
  }

  console.log("Check ESG Rating");
  selectedCard = page.locator("div.card-body:has-text('ESG Rating')");
  pieChartSvg = selectedCard.locator("svg").nth(1);

  // Count the number of path elements within the SVG
  countPaths = await pieChartSvg.locator("path").count();

  // Now you can access each path element and get its stroke color if needed
  for (let i = 0; i < countPaths; i++) {
    let pathElement = pieChartSvg.locator("path").nth(i);
    const strokeColor = await pathElement.evaluate((ele) => {
      return window.getComputedStyle(ele).getPropertyValue("stroke");
    });
    let hexColor = rgbToHex(strokeColor);
    let hasNewColor = isInArrayCaseInsensitive(hexColor, colorArray);

    expect(hasNewColor).toBeTruthy();
  }
  console.log("Check Buying Entity Leverage");

 expect(await checkBacgroundColorBuyerLeverageMateriality(
    page,
    colorArray,
    2,
    false,'Buyer'
  )).toBeTruthy();
  console.log("click on buyer leverage materiality show details");

    await checkBacgroundColorBuyerLeverageMateriality(
    page,
    colorArray,
    2,
    true,'Buyer'
  )
  showDetailsDashesTop = page
    .locator(".calculum-modal-content-custom >> .col.dash")
    .first();
  showDetailsDashesBottom = page
    .locator(".calculum-modal-content-custom >> .col.dash")
    .last();
  bgColorShowDetailsDashesTop = await showDetailsDashesTop.evaluate((ele) => {
    return window.getComputedStyle(ele).getPropertyValue("background");
  });
  bgColorShowDetailsDashesBottom = await showDetailsDashesBottom.evaluate(
    (ele) => {
      return window.getComputedStyle(ele).getPropertyValue("background");
    },
  );

  expect(await getHasNewColor(page, colorArray, bgColorShowDetailsDashesTop)).toBeTruthy();

  expect(await getHasNewColor(page, colorArray, bgColorShowDetailsDashesBottom)).toBeTruthy();

  await page
    .getByTestId("modal")
    .getByTestId("close-icon")
    .locator("path")
    .click();

  console.log("Check DEI");

  let levelDash = page
    .locator(
      ".col-6.d-flex.flex-column.p-5.justify-content-between.rounded-lg.bg-white.border-gray-100 >> .row.mx-0.w-100.flex-nowrap >> div.col.dash",
    )
    .first();

  let bgColorLevelDash = await levelDash.evaluate((ele) => {
    return window.getComputedStyle(ele).getPropertyValue("background");
  });

  let hashColor = rgbToHex(bgColorLevelDash.split("rgb(")[1].split(")")[0]);

  let hasNewColor = isInArrayCaseInsensitive(hashColor, colorArray);

  expect(hasNewColor).toBeTruthy();
expect(await checkBacgroundColorBuyerLeverageMateriality(
    page,
    colorArray,
    1,
    false,'Data'
  )).toBeTruthy();
  console.log("Check Entity/Rating and Metrics/Data Depth/Show Details");
await checkBacgroundColorBuyerLeverageMateriality(
    page,
    colorArray,
    2,
    false,'Data'
  )
expect(await checkBacgroundColorBuyerLeverageMateriality(
    page,
    colorArray,
    2,
    false,'Data'
  )).toBeTruthy();
  await page.waitForTimeout(5000);
await page.locator('#header-entitycard').click()
  let modalCount = await page.locator(".calculum-modal.higher-z-index").count();
console.log("Modal Count: ", modalCount);
  if (modalCount > 0) {
    console.log("there is a modal");
    await page.getByTestId("close-icon").click();
  }
});

/**
 * Function to check if an item is in an array case-insensitively
 *
 * @param item string hex
 * @param array given color array
 * @returns
 */
function isInArrayCaseInsensitive(item: string, array: string[]) {
  const lowercaseItem = item.toLowerCase();

  return array.some((elem) => elem.toLowerCase() === lowercaseItem);
}

/**
 * Converts rgb values to hex
 *
 * @param rgbColor
 * @returns
 */
function rgbToHex(rgbColor: string) {
  // Parse the RGB color components
  const [r, g, b] = rgbColor.match(/\d+/g) || ['0', '0', '0'];

  // Convert the individual components to their hexadecimal representation
  const red = parseInt(r, 10).toString(16).padStart(2, "0");
  const green = parseInt(g, 10).toString(16).padStart(2, "0");
  const blue = parseInt(b, 10).toString(16).padStart(2, "0");

  // Construct the hex-style color
  const hexColor = `#${red}${green}${blue}`;

  return hexColor;
}

async function checkBacgroundColorBuyerLeverageMateriality(
  page: Page,
  colorArray: string[],
  num: number,
  onlyLocator: boolean,
  type:'Buyer'|'Data'
) {
  if (type === 'Buyer') {
    console.log("Buying Entity Leverage / Materiality");
    
  } else {
    console.log("Check Entity/Rating and Metrics/Data Depth");
  }
  const buyerLeverageMateriality = page.locator("#entity-card-text-dashes");
  const dashesColorsContainer =
    buyerLeverageMateriality.locator("#dashes-colors");
  const cantDash = await dashesColorsContainer.locator("div.col.dash").count();
  console.log(`cantDash ${num}`, cantDash);
  const levelDash = dashesColorsContainer.locator("div.col.dash").first();

  const bgColorLevelDash = await levelDash.evaluate((ele) => {
    return window.getComputedStyle(ele).getPropertyValue("background");
  });

  const hashColor = rgbToHex(bgColorLevelDash.split("rgb(")[1].split(")")[0]);

  if (onlyLocator) {
    if (type === 'Buyer') {
      await buyerLeverageMateriality
        .locator("span:has-text('Show Details')").first()
        .click();
    } else {
      await buyerLeverageMateriality
        .locator("span:has-text('Show Details')").last()
        .click();
    }    
  } else {
    return isInArrayCaseInsensitive(hashColor, colorArray);
  }
}
async function getHasNewColor(page: Page, colorArray: string[], locator: any) {
  const hashColor = rgbToHex(locator.split("rgb(")[1].split(")")[0]);

  const hasNewColor = isInArrayCaseInsensitive(hashColor, colorArray);
  return hasNewColor;
}
