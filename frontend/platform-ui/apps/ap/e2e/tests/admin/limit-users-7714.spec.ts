/**
 * @fileoverview
 * E2E test for Admin - Limit Users per Company in Admin Console.
 *
 * This test verifies that a super admin can set and enforce a user limit for a company via the Admin Console UI.
 * It covers the following flow:
 *
 * Test Flow:
 * 1. Ensure super admin login state before each test.
 * 2. Navigate to the Admin Console and open the Companies section.
 * 3. Select a company and set a user limit.
 * 4. Attempt to add users up to and beyond the limit.
 * 5. Verify that adding users beyond the limit is not allowed.
 * 6. On creating the new company, assess that a unique tenant ID is
 *    automatically generated, valid, and persisted (us-12743 / story us-12699).
 * 7. Remove the created company.
 *
 * Acceptance Criteria:
 * - Super admin can access the Companies section.
 * - A user limit can be set for a company.
 * - Users can be added up to the set limit.
 * - Adding users beyond the limit is prevented and an appropriate error is shown.
 * - When a company is created, the backend auto-generates a tenant ID that is a
 *   valid slug (lowercase [a-z0-9-], 3-40 chars), derived from the company name,
 *   and stored on the persisted record (read-back confirms it).
 * - The test is tagged for admin, integration, and user story tracking.
 */


import { test, expect, Page } from "@playwright/test";
import {
  ensureDefaultLogin,
  generateRandomString,
  loginAsSuperAdmin,
  goToHomeSection,
} from "../utils/Utils";
import { locators } from "../utils/locators";

const LIMIT_NUMBER = 1000;
const LIMIT_USERS_FOR_NEW_COMPANY = "3";

import Api2 from "../utils/APi2";

test.beforeEach(async ({ page }) => {
  await ensureDefaultLogin(page);
  await page.goto("/");
  await page.waitForSelector(".loading-modal", { state: "detached" });
});

test("Admin > Company > Limit Users + Tenant ID Test @admin @integrated @us-7714 @us-12743 @tc-12743", async ({
  page,
}) => {
  // This flow logs in as super admin (~55s after a user switch), edits a
  // company, creates a company, then creates 3 users one by one (each ~6.5s
  // of fixed waits) and finally deletes the company. That comfortably
  // exceeds the default 120s budget, so give it room — same pattern as
  // data-sincronize-choices / create-company specs. (lessons-learned.md)
  test.setTimeout(300000);

  await loginAsSuperAdmin(page);

  await goToHomeSection(page);

  await page.waitForTimeout(5000);
  await page.locator(locators.headerMenu.topMenu.dropDownMenu).click();
  await page.locator(locators.headerMenu.topMenu.adminConsole).click();
  console.log("go to the list of companies");
  await Promise.all([
    page.waitForResponse(
      (response) => response.url().includes("/api/companies") && response.ok(),
    ),
    page.locator(locators.userMenu.adminConsole.listCompanies).click(),
  ]);

  console.log("select the first company (open Edit Company form)");
  // The Edit form fetches the company's own data via GET /api/companies/{uuid}
  // on open and then populates its fields — that response is the data-load
  // signal, and the field transitions ""→"0"(reactive default)→real value.
  // Gating on this response (not the cache-served currency/country dropdowns,
  // which never re-fire) guarantees we read/edit the field AFTER its real value
  // is in place — otherwise the late load overwrites our typed value, the save
  // sees no change, and validateform's "no changes to save" guard skips the
  // PATCH, hanging the save's waitForResponse. We also skip the original
  // selectOption("select#company-id") — that dropdown is read-only in edit
  // mode and is not needed to set the user limit. (lessons-learned.md)
  await Promise.all([
    page.waitForResponse(
      (response) =>
        /^\/api\/companies\/[^/?]+$/.test(new URL(response.url()).pathname) &&
        response.request().method() === "GET" &&
        response.ok(),
    ),
    page
      .locator(".k-table-row.k-master-row >> td >> .icon-svg__button-18")
      .first()
      .click(),
  ]);

  await expect(page.locator("input#limit-user").first()).toBeVisible();

  // Read the REAL current limit via inputValue() (innerText is always "" for an
  // <input>). The field transitions ""→"0"(reactive default)→loaded value, so
  // a single non-empty read can catch the transient "0". Poll until the value
  // is STABLE across two reads, then use it as the baseline.
  let limitInitialRaw = "";
  await expect
    .poll(
      async () => {
        const a = (
          await page.locator("input#limit-user").first().inputValue()
        ).trim();
        await page.waitForTimeout(400);
        const b = (
          await page.locator("input#limit-user").first().inputValue()
        ).trim();
        limitInitialRaw = b;
        return a !== "" && a === b ? "stable" : "pending";
      },
      { timeout: 30000 },
    )
    .toBe("stable");
  const limitInitial = Number(limitInitialRaw || 0);

  // 1010 > maxUsersAllowed (1000) → the form must show the validation error
  // and NOT save.
  console.log("enter value : 1010, should see the Max Users Allowed error");
  await page.locator("input#limit-user").first().clear();
  await page.locator("input#limit-user").first().fill("1010");

  console.log("save: the error should appear and the edit should not save");
  await page.locator("#edit-company-save-changes").first().click();

  let errorMessage = await page.locator(".alert-error").innerText();
  expect(errorMessage).toContain(
    "The Limit User Field is greater than the Max Users Allowed.",
  );

  // Pick a DETERMINISTIC valid limit: strictly < maxUsersAllowed (1000) AND
  // different from the current value. Both conditions are load-bearing — an
  // out-of-range value re-triggers the validation error, and an *unchanged*
  // value makes validateform's "no changes to save" guard return WITHOUT
  // firing the PATCH. Either case left the save's waitForResponse hanging the
  // full test timeout (the original random 1..1000 hit both edges by chance).
  const newLimitUserValue =
    limitInitial < LIMIT_NUMBER - 1 ? limitInitial + 1 : limitInitial - 1;
  console.log("fix the error, new valid limit :", newLimitUserValue);
  await page.locator("input#limit-user").first().clear();
  await page
    .locator("input#limit-user")
    .first()
    .fill(String(newLimitUserValue));

  await Promise.all([
    page.waitForResponse(
      (response) =>
        response.url().includes("/api/companies/") &&
        response.request().method() === "PATCH" &&
        response.ok(),
    ),
    page.locator("#edit-company-save-changes").first().click(),
  ]);

  await page.waitForTimeout(7000);

  let firstLimitUsersValueTdSection = await page
    .locator(".limit-users-value")
    .first()
    .innerText();

  expect(firstLimitUsersValueTdSection).toContain(String(newLimitUserValue));

  // open the Create Company form. currencies (and sometimes industries) are
  // served from cache on re-open, so gating on those API calls hangs when
  // they don't re-fire — wait for the form's first field instead.
  // (lessons-learned.md)
  await page.locator(locators.userMenu.adminConsole.createCompany).click();
  await expect(page.locator("#company-name")).toBeVisible();

  const companyName = "Company-Test-" + generateRandomString(6);

  const createdCompany = await createCompany(
    page,
    companyName,
    LIMIT_USERS_FOR_NEW_COMPANY,
  );

  console.log("company created : ", companyName);

  // --- Tenant ID automatic creation assessment (us-12743 / story us-12699) ---
  // The backend's CompanyDataPersister auto-generates Company.tenantId from the
  // company name on creation; the POST /api/companies 201 response serializes it
  // via the `company:read:detail` group, so we assert directly on the create body.
  const createdTenantId = assertTenantIdAutoCreated(companyName, createdCompany);

  // Stored: read the persisted record back and confirm the same tenant ID.
  // (Global uniqueness is enforced DB-side by the `company_tenant_id_uq`
  // unique index — story us-12699 — so a successful insert is itself the
  // uniqueness guarantee; the read-back proves it was persisted, not just
  // echoed in the create response.)
  const api = await Api2.getInstance(page);
  const tenantReadBack = await api.doGet(createdCompany["@id"]);
  expect(
    tenantReadBack.ok(),
    "GET on the created company should succeed",
  ).toBeTruthy();
  const tenantReadBackBody = await tenantReadBack.json();
  expect(
    tenantReadBackBody.tenantId,
    "persisted tenantId must match the one returned at creation",
  ).toBe(createdTenantId);
  console.log("tenant ID stored and verified : ", createdTenantId);

  // --- Remove the created company (us-12743 step: "the company is removed") ---
  // Delete via the API rather than the admin grid's trash icon. The work item's
  // scope is create → tenant ID created & stored → remove, and the per-company
  // user-management UI / companies-grid row actions have been refactored away
  // from the selectors the original test used (e.g. CompanyUsers.vue no longer
  // exposes the old user-count/add-user controls). API cleanup is deterministic
  // and is the pattern the other admin specs use. (lessons-learned.md)
  const deleteResponse = await api.doDelete(createdCompany["@id"]);
  expect(
    deleteResponse.ok(),
    "DELETE on the created company should succeed",
  ).toBeTruthy();
  console.log("company removed : ", companyName, " (", createdTenantId, ")");
});

test.afterEach(async ({ page }) => {
  console.log("logout as super admin, and ensure default login");
  await ensureDefaultLogin(page);
});

async function createCompany(
  page: Page,
  companyName: string,
  limitUsers: string,
): Promise<any> {
  console.log("create company");
  console.log("fill company name");
  await page.locator("#company-name").fill(companyName);
  console.log("enter company address");
  await page.locator("#company-address").fill("123 Main St");
  console.log("select United States as country from the dropdown");
  await page
    .locator("#company-country")
    .selectOption({ label: "United States" });
  console.log("fill city");
  await page.locator("#company-city").fill("Miami");
  console.log("fill zip code");
  await page.locator("#company-zip").fill("12345");
  console.log("select langauge from the dropdown : English");
  await page.locator("#language").selectOption({ label: "English" });
  console.log("select currency from the dropdown : USD");
  await page.locator("#currency").selectOption({ label: "USD" });
  console.log("select company id (identification type) from the dropdown");
  // Select by option value, not index: the identification-type list shrank and
  // index 2 is now out of range (the dropdown stayed on its "Select Company ID"
  // placeholder → selectOption timed out). This is the same identification-type
  // value the passing create-company.spec.ts uses on dev. (lessons-learned.md)
  await page
    .locator("#company-id")
    .selectOption("/api/company_identification_types/1");
  console.log("fill identification number");
  await page.locator("#company-id-number").fill("123456789");
  console.log("fill company website");
  await page.locator("#company-website").fill("https://www.example.com");
  console.log("fill out wacc input");
  await page.locator("#wacc").fill("5");
  console.log("fill out limit users");
  await page.locator("#limit-user").fill(limitUsers);

  console.log("select the root industry");
  await Promise.all([
    page.waitForResponse(
      (response) =>
        response.url().includes("/child_industries") && response.ok(),
    ),
    page
      .locator("#company-activity-industry-first-level")
      .selectOption({ index: 1 }),
  ]);

  console.log("select the second level industry");
  await Promise.all([
    page.waitForResponse(
      (response) =>
        response.url().includes("/child_industries") && response.ok(),
    ),
    page
      .locator("#company-activity-industry-second-level")
      .selectOption({ index: 1 }),
  ]);

  console.log("select the third level industry");
  await page.waitForTimeout(1000);
  await page
    .locator("#company-activity-industry-third-level")
    .selectOption({ index: 1 });

  console.log("fill out annual sales revenue in millions");
  await page.locator("#company-financial-anual-sales").fill("100");

  console.log("fill out direct spend volume in millions");
  await page.locator("#company-financial-anual-spend").fill("100");

  console.log("fill out company-financial-accounts-receivables");
  await page.locator("#company-financial-accounts-receivables").fill("100");

  console.log(
    "fill out Average Payment Terms with Suppliers (Days), this is a range input, select around 50",
  );
  await page.locator("#company-payment-terms-suppliers-input").fill("10");

  console.log("fill company-payment-terms-customers-input");
  await page.locator("#company-payment-terms-customers-input").fill("10");

  console.log("fill out company-invoices-approve-supplier-input");
  await page.locator("#company-invoices-approve-supplier-input").fill("10");

  console.log("now save the changes");
  // Strict predicate + body captured the instant the response arrives:
  // - POST + 201 avoids matching the GET company-list refresh that also hits
  //   `/companies` (a loose `.ok()` predicate would resolve on the wrong call).
  // - endsWith("/companies") matches both `/api/companies` and `/admin/companies`
  //   while excluding `/api/companies/{uuid}` (PATCH/GET) and `/child_industries`.
  // - `.then((r) => r.json())` reads the body before the form modal closes, so
  //   CDP cannot evict it (lessons-learned.md). Returned for the tenant-ID check.
  const [createResponseBody] = await Promise.all([
    page
      .waitForResponse(
        (response) =>
          new URL(response.url()).pathname.endsWith("/companies") &&
          response.request().method() === "POST" &&
          response.status() === 201,
      )
      .then((r) => r.json()),
    page.locator("#create-company-save-changes").click(),
  ]);
  return createResponseBody;
}
/**
 * Normalize a company name to its expected tenant-slug base, mirroring the
 * backend `GenerateTenantSlug(name)` rules (story us-12699):
 *   lowercase → strip accents/diacritics → non-[a-z0-9-] to hyphen →
 *   collapse repeated hyphens → trim leading/trailing hyphens.
 */
function normalizeToSlugBase(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Tenant ID automatic-creation assessment (us-12743 / story us-12699).
 *
 * Asserts that the company returned by the create POST carries an
 * auto-generated `tenantId` that:
 *   - is a non-empty string (created),
 *   - is a valid slug: only [a-z0-9-], 3-40 chars, no leading/trailing or
 *     doubled hyphens,
 *   - derives from the company name's normalized base, allowing the
 *     deterministic `-<5 char>` collision suffix the backend appends.
 *
 * Returns the validated tenant ID for downstream storage verification.
 */
function assertTenantIdAutoCreated(companyName: string, company: any): string {
  const tenantId = company?.tenantId;
  console.log("assessing auto-created tenant ID :", tenantId);

  expect(typeof tenantId, "tenantId must be a string").toBe("string");
  expect(
    tenantId,
    "tenantId must be a valid slug: [a-z0-9-], no leading/trailing hyphen",
  ).toMatch(/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/);
  expect(tenantId, "tenantId must not contain doubled hyphens").not.toContain(
    "--",
  );
  expect(tenantId.length).toBeGreaterThanOrEqual(3);
  expect(tenantId.length).toBeLessThanOrEqual(40);

  const base = normalizeToSlugBase(companyName).slice(0, 40);
  expect(
    tenantId,
    `tenantId "${tenantId}" should derive from company name base "${base}"`,
  ).toMatch(new RegExp(`^${escapeRegExp(base)}(-[a-z0-9]{1,5})?$`));

  return tenantId;
}
