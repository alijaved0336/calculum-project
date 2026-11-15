/**
 * @fileoverview
 * E2E tests for verifying the display of the Industry/Region Standard in the Entity Card.
 *
 * Main Flows:
 * 1. Ensure the user is logged in with default credentials.
 * 2. Change to the spend file "Pagero_Full_SME.xlsx (Ver. 1)".
 * 3. Navigate to the Entity Card for "Axtone S.A.".
 * 4. Assert that the Industry/Region Standard is displayed correctly.
 *
 * Acceptance Criteria:
 * - The test waits for the necessary navigation and spend file change to complete.
 * - The Entity Card for "Axtone S.A." loads successfully.
 * - The Industry/Region Standard is displayed correctly.
 * - The test passes if all assertions are met and the UI displays the correct Industry/Region Standard data.
 */

import { expect, Page, test } from "@playwright/test";
import { changeToSpendFile, ensureDefaultLogin } from "../utils/Utils";
import englishKeys from "@ada/design-system/locales/languages/en.json";
const given = {
  company: "Company Test",
  spendfile: "Pagero_Full_SME.xlsx (Ver. 1)", //Already existent, and additionally attached here.
  program: "Main Program.", //Created by default.
  user: "joel+testnotadmin@calculum.ai",
  entity: "Axtone S.A.",
  datasExpected: {
    industry: {
      spends: 5,
      min: 30,
      third_quartile: 90,
      max: 90,
      average: 66,
    },
    region: {
      spends: 9,
      min: 30,
      third_quartile: 60,
      max: 90,
      average: 52,
    },
    industryRegion: {
      spends: 2,
      min: 60,
      third_quartile: 82,
      max: 90,
      average: 75,
    },
  },
};
let datasReceived: any;
test.beforeEach(async ({ page }) => {
  await ensureDefaultLogin(page);
  await page.goto("/");
  await changeToSpendFile(page, given.spendfile);
  await page.waitForSelector(".loading-modal", { state: "detached" });
});
test("The Industry/Region Standard is working properly @tc-11576", async ({
  page,
}) => {
  await findEntityCard(page, given.entity);
  expect(datasReceived).toMatchObject(given.datasExpected);
});
test.afterEach(async ({ page }) => {
  await ensureDefaultLogin(page);
});
async function findEntityCard(
  page: Page,
  entityName: string,
  index = 0,
  isExact = true,
) {
  const search = page.getByPlaceholder(
    englishKeys.home.components.navbar.search,
  );
  //clear the input first
  await search.fill("");
  await page.waitForTimeout(500);
  // Type company name
  await search.fill(entityName);
  await Promise.all([
    page.waitForResponse((response) =>
      response.url().endsWith("/api/entity-card/get-entity-cards"),
    ),
    search.press("Enter"),
  ]);
  const currentNameLocator = page
    .locator(".current-name", {
      has: page.getByText(entityName, { exact: isExact }),
    })
    .nth(index);
  const [detail] = await Promise.all([
    page.waitForResponse((response) =>
      response.url().endsWith("/chart/payment-terms-opportunity/supplier"),
    ),
    currentNameLocator.click(),
  ]);
  if (detail.ok()) {
    const responseBody = await detail.json();
    console.log(
      "*** checking if entity show disable and unable -->",
      responseBody.isFullExcluded,
    );
    expect(responseBody.isFullExcluded).toBeFalsy();
    const industryRegionElements = responseBody.strategies.find(
      (item: any) => item.key === "industryRegionStandardStrategy",
    );
    const industryGroupStrategy =
      industryRegionElements.extra.industryGroupStrategy.details;
    const industryRegionStandardStrategy =
      industryRegionElements.extra.industryRegionStandardStrategy.details;
    const regionGroupStrategy =
      industryRegionElements.extra.regionGroupStrategy.details;
    datasReceived = {
      industry: industryGroupStrategy,
      region: regionGroupStrategy,
      industryRegion: industryRegionStandardStrategy,
    };
  }
}
