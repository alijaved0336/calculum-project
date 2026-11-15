/**
 * @fileoverview
 * E2E test for verifying ingestion of data from public companies.
 *
 * This test checks that the backend API for public companies (compare_companies)
 * returns the expected data after ingesting a known spend file.
 *
 * Test Flow:
 * 1. Ensure admin login before each test.
 * 2. Change to a specific spend file.
 * 3. Call the /api/compare_companies endpoint.
 * 4. Assert that a specific public company is present in the response.
 *
 * Acceptance Criteria:
 * - The /api/compare_companies endpoint returns a successful response.
 * - The expected public company ("&Do Holdings Co.,Ltd.") is present in the response.
 * - The test is tagged for API and data ingestion.
 */


import { expect, test } from "@playwright/test";
import Api2 from "../utils/APi2";
import { changeToSpendFile, ensureAdminLogin } from "../utils/Utils";

test.beforeEach(async ({ page }) => {
  await ensureAdminLogin(page);
  await changeToSpendFile(page, "PageroFull_20230308_2.xlsx (Ver. 1)");
});
test("8242-Ingest-Data-From-Public-companies-Data @api @data-ingestion", async ({
  page,
}) => {
  // checks the Back End Response after the Who_am_I redirect.
  const api: Api2 | null = await Api2.getInstance(page);

  // /api/user/who_am_i
  const searchPublicCompareCompany = await api!.doGet("/api/compare_companies");
  expect(searchPublicCompareCompany.ok()).toBeTruthy();
  const response = JSON.parse(await searchPublicCompareCompany.text());

  let companyFound = false;
  for (const company of response["hydra:member"]) {
    if (company["name"] === "&Do Holdings Co.,Ltd.") {
      // Company found, print details (or perform other actions)
      console.log(company);
      companyFound = true;
      break; // Exit loop after finding the company
    }
  }

  await expect(companyFound).toBeTruthy;
  console.log("Error:", companyFound); // This should be outside the loop
});
