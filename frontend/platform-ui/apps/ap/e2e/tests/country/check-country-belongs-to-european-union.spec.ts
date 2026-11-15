/**
 * @fileoverview
 * E2E tests for verifying if a country belongs to the European Union.
 *
 * This test suite checks the backend API for country details, specifically the
 * 'belongToEuropeanUnion' property, to ensure correct identification of EU membership.
 *
 * Test Flow:
 * 1. Ensure default login before each test.
 * 2. Change to a specific spend file.
 * 3. Call the /api/countries/:id endpoint for selected countries.
 * 4. Assert the 'belongToEuropeanUnion' property is present and correct for EU countries,
 *    and absent or false for non-EU countries.
 *
 * Acceptance Criteria:
 * - The /api/countries/:id endpoint returns a successful response.
 * - The 'belongToEuropeanUnion' property is true for France (EU member).
 * - The 'belongToEuropeanUnion' property is undefined for United Kingdom (non-EU member).
 * - The test is tagged for API and country validation.
 */

import { expect, test, Page } from "@playwright/test";
import Api2 from "../utils/APi2";
import { changeToSpendFile, ensureDefaultLogin } from "../utils/Utils";

let api: Api2 | null;
test.describe
  .serial("Check country belongs to the European Union @flakyResolved", () => {
  let page: Page;
  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();
    await ensureDefaultLogin(page);
    await changeToSpendFile(page, "PageroFull_20230308_2.xlsx (Ver. 1)");
    api = await Api2.getInstance(page);
  });

  test("TC-1 TC-9022 France belongs to the UE @flakyResolved", async () => {
    //  checks the Back End Response after the Who_am_I redirect.
    // /api/user/who_am_i
    const countriesResp = await api!.doGet("/api/countries/76");
    expect(countriesResp.ok()).toBeTruthy();
    const response = await countriesResp.json();
    console.log("response:", response);
    expect(response.hasOwnProperty("belongToEuropeanUnion")).toBeTruthy();
    expect(response.belongToEuropeanUnion).toBe(true);
  });

  test("TC-1 TC-9022 United Kingdom not belongs to the UE @flakyResolved", async () => {
    //  checks the Back End Response after the Who_am_I redirect.
    // /api/user/who_am_i
    const countriesResp = await api!.doGet("/api/countries/80");
    expect(countriesResp.ok()).toBeTruthy();
    const response = await countriesResp.json();
    console.log("response:", response);
    expect(response.belongToEuropeanUnion).toBeUndefined();
  });
  test.afterAll(async () => {
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
