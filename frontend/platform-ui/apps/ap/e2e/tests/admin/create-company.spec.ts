/**
 * @fileoverview
 * E2E test for Admin - Create Company in Admin Console.
 *
 * This test verifies that a super admin can create a new company via the Admin Console UI.
 * It covers the following flow:
 *
 * Test Flow:
 * 1. Log in as Super Admin before each test.
 * 2. Navigate to the Admin Console and open the Create Company section.
 * 3. Fill out the company creation form with random data.
 * 4. Submit the form and verify the company is created.
 *
 * Acceptance Criteria:
 * - Super admin can access the Create Company section.
 * - A new company can be created with valid data.
 * - The test is tagged for admin, integration, and user story tracking.
 */

import { expect, test } from "@playwright/test";
import {
  ensureDefaultLogin,
  loginAsSuperAdmin,
  generateRandomString,
} from "../utils/Utils";
import { locators } from "../utils/locators";

let api: Api2 | null = null;
let companyIri = "";

import Api2 from "../utils/APi2";

test.beforeEach(async ({ page }) => {
  await loginAsSuperAdmin(page);
});

test("Create Company One Step flow @flakyResolved @api @integrated @admin @us-2172", async ({
  page,
}) => {
  // beforeEach (loginAsSuperAdmin) can take ~55s when the previous spec left
  // a different user logged in (full B2C logout + sign-in). afterEach
  // (ensureDefaultLogin) does the same in reverse. The form-filling body
  // is ~35s on its own. The default 120s budget covers all three only on a
  // perfect run; bump to 5 min so transient B2C/network slowness doesn't
  // surface as a timeout. Same pattern as data-sincronize-choices.spec.ts.
  test.setTimeout(200000);

  // Regenerate per invocation so a Playwright retry doesn't collide with a
  // half-cleaned-up company from the failed first attempt.
  const companyName = "New test CO  " + generateRandomString(6);

  await page.locator(locators.headerMenu.topMenu.dropDownMenu).click();
  await Promise.all([
    page.waitForResponse(
      (response: any) =>
        response.url().endsWith("/api/companies") && response.ok(),
    ),
    page.locator(locators.headerMenu.topMenu.adminConsole).click(),
  ]);
  await Promise.all([
    page.waitForResponse(
      // `getIndustries()` now calls `/api/industries?itemsPerPage=500`
      // (axios params), so `endsWith("/api/industries")` no longer matches
      // — compare against the pathname instead of the full URL.
      (response: any) =>
        new URL(response.url()).pathname === "/api/industries" &&
        response.ok(),
    ),
    page.locator(locators.userMenu.adminConsole.createCompany).click(),
  ]);
  const companyLoc = page.getByPlaceholder(
    "Enter your Company Name or Stock Symbol",
  );
  await companyLoc.click();
  await companyLoc.fill(companyName);

  const streetLoc = page.getByPlaceholder("Enter Street and Number");
  await streetLoc.click();
  await streetLoc.fill("strt 45");

  await page
    .getByRole("combobox", { name: "Country*" })
    .selectOption("/api/countries/235");
  const cityLoc = page.getByPlaceholder("Enter City");
  await cityLoc.click();
  await cityLoc.fill("miami");
  const zipLoc = page.getByPlaceholder("Enter ZIP Code");
  await zipLoc.click();
  await zipLoc.fill("85214");
  await page
    .getByRole("combobox", { name: "Currency*" })
    .selectOption("/api/currencies/10");
  await page
    .getByRole("combobox", { name: "Company ID" })
    .selectOption("/api/company_identification_types/1");
  const idLoc = page.getByPlaceholder("Enter Indentification Number");
  await idLoc.click();
  await idLoc.fill("id number");
  const websiteLoc = page.getByPlaceholder("Enter Company Website");
  await websiteLoc.click();
  await websiteLoc.fill("www.calculum.ai");
  // toHaveValue auto-retries up to expect.timeout (20s) — the Kendo numeric
  // inputs are populated asynchronously after the form mounts, so a one-shot
  // inputValue() read can race the init and read "" once in a while.
  await expect(page.locator("input#wacc")).toHaveValue("9");
  await expect(page.locator("input#taxRate")).toHaveValue("35");

  const limitUserLoc = page.locator("#limit-user");
  await limitUserLoc.click();
  await limitUserLoc.fill("10");

  await page
    .getByRole("combobox", { name: "Industry Activity (First level)*" })
    .selectOption("[object Object]");
  await page.waitForResponse(
    (response) =>
      response.url().includes("/child_industries") && response.ok(),
  );
  await page
    .getByRole("combobox", { name: "Industry Activity (Second level)*" })
    .selectOption("[object Object]");
  await page.waitForResponse(
    (response) =>
      response.url().includes("/child_industries") && response.ok(),
  );
  await page
    .getByRole("combobox", { name: "Industry Activity (Third level)*" })
    .selectOption("[object Object]");
  const annualSalesRevenueLoc = page.getByPlaceholder(
    "Enter Annual Sales Revenue",
  );
  await annualSalesRevenueLoc.click();
  await annualSalesRevenueLoc.fill("34");
  const annualDirectSpendVolumeLoc = page.getByPlaceholder(
    "Enter Annual Direct Spend Volume",
  );
  await annualDirectSpendVolumeLoc.click();
  await annualDirectSpendVolumeLoc.fill("45");
  const tradeReceivablesLoc = page.getByPlaceholder("Enter Trade Receivables");
  await tradeReceivablesLoc.click();
  await tradeReceivablesLoc.fill("56");
  const avgPSuppliersLoc = page
    .locator("label")
    .filter({ hasText: "Average Payment Terms with Suppliers (Days)*days" })
    .getByRole("spinbutton");
  await avgPSuppliersLoc.click();
  await avgPSuppliersLoc.fill("120");
  const avgPCustomersLoc = page
    .locator("label")
    .filter({ hasText: "Average Payment Terms with Customers (Days)*days" })
    .getByRole("spinbutton");
  await avgPCustomersLoc.click();
  await avgPCustomersLoc.fill("125");
  const avgTInvoiceLoc = page
    .locator("label")
    .filter({
      hasText:
        "Average Time to approve your invoices received from your Suppliers (Days)*days",
    })
    .getByRole("spinbutton");
  await avgTInvoiceLoc.click();
  await avgTInvoiceLoc.fill("134");

  const [response] = await Promise.all([
    page.waitForResponse(
      (response) =>
        response.url().includes("/api/companies") && response.status() === 201,
    ),
    page.locator("a").filter({ hasText: "Save" }).click(),
  ]);
  let dataResponse = await response.json();

  companyIri = dataResponse["@id"];
  api = await Api2.getInstance(page);
  if (companyIri.length > 0) {
    const response = await api!.doDelete(companyIri);
    expect(response.ok()).toBeTruthy();
  }
});

test.afterEach(async ({ page }) => {
  // Best-effort switch-back to the default non-admin user so the next
  // spec's beforeEach has less to do. Wrapped in try/catch because dev
  // B2C occasionally drops the post-login `/api/users/<uuid>` response
  // (Api2.ts:300, 30s timeout) — that is an environment hiccup, not a
  // failure of this test. Any next spec calls ensureLogin first, which
  // re-detects whoever is currently logged in and corrects it.
  try {
    await ensureDefaultLogin(page);
  } catch (err) {
    console.warn(
      "afterEach: ensureDefaultLogin failed; leaving session as-is for the next spec to recover.",
      (err as Error)?.message ?? err,
    );
  }
});
