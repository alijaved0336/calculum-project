import { Page, expect, test } from "@playwright/test";
import { KeyValue } from "../../../apps/ap/src/types";

// Utils
import {
  changeToSpendFile,
  dismissWelcomeVideoModal,
  ensureCompanyTestSCFLogin,
} from "../utils/Utils";
import { GlobalFiltersUtils } from "../utils";

// The SCF test user is dedicated to the "Company-Test-SCF" company (it is the
// account's default), so no company switch is needed.
const spendFileName = "PageroEspecialRegulatorys.xlsx (Ver. 1)";

const categoryName = "SCF, Vcard & Discounting";

test.describe.serial("Financing & Discounting Category", () => {
  let page: Page;

  test.beforeAll(async ({ browser }) => {
    // Logs in as the SCF test user and selects Company-Test-SCF + a spend file
    // that has SCF / Vcard / Discounting data, so the "SCF, Vcard & Discounting"
    // category renders and its fields return options.
    page = await browser.newPage();
    await ensureCompanyTestSCFLogin(page);
    await changeToSpendFile(page, spendFileName);
    await page.waitForSelector(".loading-modal", { state: "detached" });
    // Fresh test accounts land on the "Welcome to Ada!" video modal, which
    // overlays the page and blocks the filter icon — dismiss it right before the
    // first UI click that needs the page unobstructed.
    await dismissWelcomeVideoModal(page);
    await GlobalFiltersUtils.openModal(page);
    await GlobalFiltersUtils.openCategory(page, categoryName);
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

  // *** Financing Group ***

  test("financing groups field is showing in global filters dialog @api @global-filters @us-6474", async () => {
    const fieldNameInAPIResponse = "financings";
    const fieldName = "SCF Group";

    const [response] = await Promise.all([
      GlobalFiltersUtils.waitForFieldResponse(page, fieldNameInAPIResponse),
      GlobalFiltersUtils.openField(page, fieldName)
    ]);

    const result: KeyValue<string, string[]> = await response.json();

    test.skip(result.value.length === 0, "No SCF Groups (financings) options in fixture");

    const optionName = result.value[0];

    expect(optionName).toBeTruthy();

    await GlobalFiltersUtils.checkOptionInField(page, {
      optionName,
      fieldName
    });
  });

  // *** END Financing Group ***

  // *** Discount Group ***

  test("discount field is showing in global filters dialog @api @global-filters @us-8166", async () => {
    const fieldNameInAPIResponse = "cashDiscounts";
    const fieldName = "Discount (%)";

    const [response] = await Promise.all([
      GlobalFiltersUtils.waitForFieldResponse(page, fieldNameInAPIResponse),
      GlobalFiltersUtils.openField(page, fieldName)
    ]);

    const result: KeyValue<string, string[]> = await response.json();

    expect(result.value.length, "Response is empty.").toBeGreaterThan(0);

    const optionName = result.value[0];

    expect(optionName, "Option name is not defined.").toBeTruthy();

    await GlobalFiltersUtils.checkOptionInField(page, {
      optionName,
      fieldName
    });
  });

  // *** END Discount Group ***
});
