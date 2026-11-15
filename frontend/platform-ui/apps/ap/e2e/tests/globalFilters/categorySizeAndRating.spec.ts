import { expect, test } from "@playwright/test";

// Utils
import { changeToSpendFile, ensureDefaultLogin } from "../utils/Utils";
import { GlobalFiltersUtils } from "../utils";

const spendFileName =
  "Pagero_GlobalFilterTest-TwoBuyers_One_Program_Financing.xlsx.xlsx (Ver. 1)";

const categoryName = "Size & Rating";

test.beforeEach(async ({ page }) => {
  await ensureDefaultLogin(page);
  await changeToSpendFile(page, spendFileName);
  await page.waitForSelector(".loading-modal", { state: "detached" });
});

// *** Company Size ***

test("company size field is showing in global filters dialog @api @global-filters @us-6474", async ({
  page,
}) => {
  const fieldNameInAPIResponse = "entityCompanySize";
  const fieldName = "Company Size";

  await GlobalFiltersUtils.openModal(page);
  await GlobalFiltersUtils.openCategory(page, categoryName);

  const [response] = await Promise.all([
    GlobalFiltersUtils.waitForFieldResponse(page, fieldNameInAPIResponse),
    GlobalFiltersUtils.openField(page, fieldName),
  ]);

  const result = await response.json();
  expect(result.value.length).toBeGreaterThan(0);
});

// *** END Company Size ***

// *** Spend Volume ***
// Test location: categorySpendVolAndPT.spec.ts
// *** END Spend Volume ***
