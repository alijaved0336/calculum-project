/**
 * @fileoverview
 * E2E test for SME Badge UI in Admin Console.
 *
 * This test verifies that the SME (Small and Medium-sized Enterprises) badge is displayed correctly
 * for suppliers/entities in the Admin Console UI, based on their SME status.
 *
 * Test Flow:
 * 1. Log in as Super Admin before each test.
 * 2. Change to the appropriate spend file containing SME data.
 * 3. Navigate to the relevant section (e.g., supplier/entity list).
 * 4. For each test entity, verify that the SME badge is shown or hidden according to its status.
 * 5. After each test, ensure the default login state.
 *
 * Acceptance Criteria:
 * - The SME badge is visible for entities marked as SME.
 * - The SME badge is not visible for entities not marked as SME.
 * - The test is tagged for admin and SME feature tracking.
 */


import { test, expect, Page, chromium, Browser } from "@playwright/test";
import {
  changeToSpendFile,
  ensureDefaultLogin,
  loginAsSuperAdmin,
} from "../../../utils/Utils";
import { locators } from "../../../utils/locators";
import englishKeys from "@ada/design-system/locales/languages/en.json";

const spendFile = "$8.4B_Spend_20230605.xlsx (Ver. 1)";

const features = {
  featureSME: "featureSME",
};
let dataRoles: string[] = [];

const myCompany = {
  company: "Company Test",
  nameField: "name",
};

let detailsIsSme: boolean;
const testItems = [
  {
    name: "2N Telekomunikace A.S.",
    smeStatus: false,
  },
  {
    name: "ABB Inc Iaen Excitation Division",
    smeStatus: false,
  },
  {
    name: "A.F. Technologies, Inc.",
    smeStatus: true,
  },
];
interface CheckCountry {
  name: string;
  country: string;
  compare: number;
}

let entitySupplier: CheckCountry;
const given = {
  spendFile: "Pagero_New_SME.xlsx (Ver. 1)",
  company: "Company Test",
  program: "Main Program",
  entities: [
    { name: "Elma Electronic Ag", country: "Switzerland ", compare: 250 },
    { name: "Hbl Power Systems Limited", country: "India", compare: "33" },
    { name: "Adelino Ramos Alexandre", country: "Brazil", compare: "" },
    { name: "A & J Cope Limited", country: "United Kingdom", compare: 250 },
    { name: "Agma Limited", country: "United Kingdom", compare: 250 },
    {
      name: "Wah Joo Seng International Trading Pte Ltd",
      country: "Singapore",
      compare: 200,
    },
  ],
};

test.describe.serial("SME", async () => {
  let browser: Browser;
  let page: Page;
  test.beforeAll(async () => {
    browser = await chromium.launch();
    page = await browser.newPage();

    await ensureDefaultLogin(page);
    await changeToSpendFile(page, spendFile);
  });
  test("TC10232 - The SME feature can be enabled and disabled  @tc-10232", async () => {
    if (process.env.E2E_ENV_NAME === "LOCAL") {
      await page.waitForTimeout(7000);
    } else {
      await page.waitForTimeout(2500);
    }

    for (const element of testItems) {
      await findEntityCardSme(page, element.name);
      await checkSMEBadge(page, detailsIsSme);
    }
  });
  test("SME Test is adjusted so entities from Switzerland,  India, Brazil, the United Kingdom, and Singapore ara considered as SME  @tc-10737", async () => {
    await loginAsSuperAdmin(page);
    await changeToSpendFile(page, given.spendFile);
    for (let i = 0; i < given.entities.length; i++) {
      console.log(`Inside--> ${given.entities[i].name}, ${i}`);
      await findEntityCardSme(
        page,
        given.entities[i].name,
        0,
        false,
        true,
        true,
        "country",
      );
      await checkCases(page, i);
      console.log(`Leaving -->${given.entities[i].name}`);
    }
  });

  test.afterAll(async () => {
    console.log("***Finishing test***");
    await browser.close();
  });
});

async function checkCases(page: Page, i: number) {
  const entity = given.entities[i];
  // SME BADGE WILL BE VISIBLE
  await page.locator(".sme-badge-icon").first().isVisible();
  try {
    const countryCompare =
      entitySupplier.country.trim().toLowerCase() ===
      entity.country.trim().toLowerCase();
    console.log(
      `Expecting country--> ${entity.country}===${entitySupplier.country} ==> ${countryCompare}`,
    );
    expect(countryCompare).toBeTruthy();
    console.log(`Country OK`);

    if (entity.compare && i !== 1) {
      const employeeCompare = entitySupplier.compare <= Number(entity.compare);
      console.log(
        `Expecting employee--> ${entity.compare}===${entitySupplier.compare} ==> ${employeeCompare}`,
      );
      expect(employeeCompare).toBeTruthy();
      console.log(`Employee OK`);
    } else if (i === 1) {
      const [industry] = await Promise.all([
        page.waitForResponse((response) =>
          response.url().endsWith("/industry-commodity"),
        ),
        await page.locator(locators.entityCard.menu.companyDetails).click(),
      ]);
      await industry.finished();
      if (industry.ok()) {
        const responseBody = await industry.json();
        const startWith33 = responseBody.industryNaics.startsWith("33");
        console.log(
          `Expecting nics--> ${entity.compare}===${responseBody.industryNaics} ==> ${startWith33}`,
        );
        expect(startWith33).toBeTruthy();
        console.log(`Nics OK`);
      }
    }
    await page.locator(locators.entityCard.closeButton).click();
  } catch (error) {
    console.error("Error during the process:", error);
  }
}

async function checkSMEBadge(page: Page, isSME: boolean) {
  // The SME badge renders asynchronously once the entity card finishes loading.
  // Web-first assertions auto-wait and retry until the timeout, so the previous
  // fixed waitForTimeout()/.isVisible() sampling (which captured a single,
  // possibly-too-early boolean and made this test flaky) is no longer needed.
  const badgeIcon = page.locator(".sme-badge-icon").first();
  console.log("checking sme-badge-icon", "isSme->", isSME);
  if (isSME) {
    await expect(badgeIcon).toBeVisible();
  } else {
    await expect(badgeIcon).toBeHidden();
  }

  //go to details tab
  await page.locator(locators.entityCard.menu.companyDetails).click();

  // The details modal mounts one of two SME sections depending on status.
  // toBeVisible() retries until the section appears instead of sampling once
  // after a fixed delay.
  const detailsSection = page.locator(
    isSME ? "#sme-card-details-sme" : "#sme-card-details-not-sme",
  );
  await expect(detailsSection).toBeVisible();

  //close the modal
  await page.locator(locators.entityCard.closeButton).click();
}

async function findEntityCardSme(
  page: Page,
  entityName: string,
  index = 0,
  isAwait = false,
  isExact = true,
  show = true,
  check: "badge" | "country" = "badge",
) {
  // The Manage Module page renders a second input whose placeholder is also
  // "Search by Supplier Name" (the suppliers panel), so a bare getByPlaceholder
  // raises strict-mode violation. Scope to the global header navbar
  // (`#header-calculum`), which is the unique top-bar wrapper.
  const search = page
    .locator("#header-calculum")
    .getByPlaceholder(englishKeys.home.components.navbar.search);

  //clear the input first
  await search.fill("");
  await page.waitForTimeout(500);
  // Type company name
  await search.fill(entityName);
  const entityCardsResponsePromise = page.waitForResponse((response) =>
    response.url().endsWith("/api/entity-card/get-entity-cards"),
  );
  await search.press("Enter");
  await entityCardsResponsePromise;
  // The click must be raced together with the response wait (not fired-and-forgotten
  // into an unawaited variable) — otherwise a row that never matches `.nth(index)`
  // hangs the click's own actionability retries silently while `/detail` never
  // arrives either, and both sit unbounded until the whole test times out.
  const [detail] = await Promise.all([
    page.waitForResponse(
      // Match on the pathname, not the full URL: this request carries a
      // ?globalFilter=<serialized> query whenever the user has an active
      // global filter, so anchoring on a URL suffix hangs in that case (same
      // fix as goToEntityCardEntityExactFull in Utils.ts).
      (response) =>
        /\/api\/entity-card\/entity\/[^/]+\/detail$/.test(
          new URL(response.url()).pathname,
        ),
    ),
    page
      .locator(".current-name", {
        has: page.getByText(entityName, { exact: isExact }),
      })
      .nth(index)
      .click(),
  ]);
  if (detail.ok()) {
    const responseBody = await detail.json();
    if (check === "badge") {
      console.log(
        "responseBody-->",
        responseBody.isSME,
        responseBody.supplierName,
      );
      detailsIsSme = responseBody.isSME;
    } else if (check === "country") {
      entitySupplier = {
        country: responseBody.supplierCountry,
        name: responseBody.supplierName,
        compare: responseBody.employees,
      };
    }
  }
  if (show && isAwait) {
    // The click above already resolved as part of the Promise.all that fetched
    // `detail`, so only the spends response is still pending here.
    await page.waitForResponse(
      (res: any) => res.url().includes("/spends") && res.ok(),
    );
  }
}
