/**
 * @fileoverview
 * E2E test for checking modules response in who_am_i API.
 *
 * This test verifies that the who_am_i API response contains the expected user roles and modules.
 *
 * Test Flow:
 * 1. Ensure default login before each test.
 * 2. Call the who_am_i API endpoint.
 * 3. Assert that the response contains all required module and role identifiers.
 *
 * Acceptance Criteria:
 * - The who_am_i API response includes all expected module and role strings.
 * - The test is tagged for integration, entity, strategies, and user story tracking.
 */


import { expect, test } from "@playwright/test";
import { ensureDefaultLogin } from "../utils/Utils";

import Api2 from "../utils/APi2";

test.beforeEach(async ({ page }) => {
  await ensureDefaultLogin(page);
  await page.goto("/");
});
test("TC-1 TC-7849 The who_am_I redirect response contains user roles @integrated @entity @strategies @us-7849", async ({
  page,
}) => {
  //  checks the Back End Response after the Who_am_I redirect.
  const api: Api2 | null = await Api2.getInstance(page);

  // /api/user/who_am_i
  const whoAmIResp = await api!.doGet(
    "/api/users/b666d622-1088-49b6-9f5e-f59a3edc3dbf",
  );
  expect(whoAmIResp.ok()).toBeTruthy();
  const response = JSON.parse(await whoAmIResp.text());

  expect(response && response.roles).toBeTruthy();
  expect(response.roles).toContain("MODULE_PLAN");
  expect(response.roles).toContain("MODULE_OPPORTUNITY");
  expect(response.roles).toContain("MODULE_PLAN");
  expect(response.roles).toContain("MODULE_SUPPLIERS");
  expect(response.roles).toContain("MODULE_COMPARE");
  expect(response.roles).toContain("MODULE_MATCH");
  expect(response.roles).toContain("ROLE_USER");
  expect(response.roles).toContain("MODULE_ANALYZE");
  expect(response.roles).toContain("MODULE_MANAGE");
  expect(response.roles).toContain("FEATURE_DOWNLOAD_EXCEL");
});
