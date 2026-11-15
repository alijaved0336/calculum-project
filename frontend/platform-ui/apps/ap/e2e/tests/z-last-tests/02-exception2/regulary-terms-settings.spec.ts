//Creted by Diego Mas
// Updated for US-16972 (Regulation Updates): the Regulatory Terms "More Settings"
// popup now opens with a new "Consider the following Country(ies) for the
// Regulations" section (Supplier Country / Buying Entity Country / Both) above the
// renamed "Limit Payment Terms Opportunity" options ("Limit Only Strict
// Regulations", "Limit All Regulations and Recommendations", "No Limitation").
import { expect, Page, test } from "@playwright/test";
import { locators } from "../../utils/locators";
// Global utils
import { ensureDefaultLogin, loginAsAdminException1 } from "../../utils/Utils";
import englishKeys from "@ada/design-system/locales/languages/en.json";

const textStrategies = englishKeys.home.entityCard.strategies;

// Maps the persisted regulatoryCountrySource value to its visible label.
const COUNTRY_SOURCE_LABEL: Record<string, string> = {
  supplier: textStrategies.SUPPLIER,
  buyer: textStrategies.BUYER,
  both: textStrategies.BOTH,
};

test.beforeEach(async ({ page }) => {
  await loginAsAdminException1(page);
});

/**
 * Opens the Setup section and returns the parsed allowed-status response so the
 * test can read the current regulatoryMethod / regulatoryCountrySource.
 */
async function openSettings(page: Page): Promise<any> {
  const [responseStrategies] = await Promise.all([
    page.waitForResponse(
      (response: any) =>
        response.url().includes("/api/spendfile/strategies/allowed-status") &&
        response.ok(),
    ),
    page.locator(locators.sidebar.settings).click(),
  ]);

  await page.evaluate(() => {
    (document.body.style as any).zoom = "50%";
  });

  await expect(page.locator(".loading-modal")).toBeHidden();
  return responseStrategies.json();
}

test("Regulatory Terms More Settings: country source + limit options @ui @settings @strategies @us-16972", async ({
  page,
}) => {
  // Enabling the strategy and saving triggers a full regulatory recalculation.
  test.setTimeout(120000);

  const resultResponse = await openSettings(page);

  const regulatory = resultResponse.strategies.find(
    (s: any) => s.key === "regulatoryTermsStrategy",
  );
  expect(regulatory, "regulatoryTermsStrategy missing from allowed-status").toBeTruthy();

  const slider = page.locator("#slider-id-regulatoryTermsStrategy");
  // The regulatory More Settings popup is the only .popup-settings that contains
  // the new country-source header; use it to scope both the trigger and the popup.
  const countryHeader = page.getByText(textStrategies.countryForRegulations, {
    exact: true,
  });
  const regulatoryPopup = page
    .locator(".popup-settings")
    .filter({ hasText: textStrategies.countryForRegulations });
  const moreSettingsTrigger = page
    .locator(".col-10.d-flex")
    .filter({ has: countryHeader })
    .first();

  // The popup can only be opened while the strategy is enabled (UI guard), so
  // ensure it is on. If it was off this marks an unsaved change that we persist
  // at the end of the test.
  if (!regulatory.isAllowed) {
    await slider.click();
  }

  // Selecting any option closes the popup (the regulatory popup is outside the
  // document click-to-close whitelist), so re-open before each interaction.
  async function openRegulatoryPopup() {
    if (await regulatoryPopup.isVisible()) return;
    await moreSettingsTrigger.click();
    await expect(regulatoryPopup).toBeVisible();
  }

  await openRegulatoryPopup();

  // --- US-16972: the new country-source section is present, above the limit
  // options, with the three radio choices and the renamed limit labels. ---
  await expect(countryHeader).toBeVisible();
  await expect(
    regulatoryPopup.getByText(textStrategies.SUPPLIER, { exact: true }),
  ).toBeVisible();
  await expect(
    regulatoryPopup.getByText(textStrategies.BUYER, { exact: true }),
  ).toBeVisible();
  await expect(
    regulatoryPopup.getByText(textStrategies.BOTH, { exact: true }),
  ).toBeVisible();
  await expect(
    regulatoryPopup.getByText(textStrategies.limitPaymentTermsOpportunity, {
      exact: true,
    }),
  ).toBeVisible();
  // Renamed limit labels ("Limit Only Strict Regulations", etc.).
  await expect(
    regulatoryPopup.getByText(textStrategies.ONLY_EXCEPTIONS, { exact: true }),
  ).toBeVisible();
  await expect(
    regulatoryPopup.getByText(textStrategies.ALL, { exact: true }),
  ).toBeVisible();
  await expect(
    regulatoryPopup.getByText(textStrategies.NONE, { exact: true }),
  ).toBeVisible();

  // --- Pick a different country source than the current one and apply it. ---
  const currentCountry = regulatory.regulatoryCountrySource || "supplier";
  const targetCountry = currentCountry === "supplier" ? "buyer" : "supplier";
  await regulatoryPopup
    .getByText(COUNTRY_SOURCE_LABEL[targetCountry], { exact: true })
    .click();
  // The country radio reflects the new selection.
  await openRegulatoryPopup();
  await expect(
    regulatoryPopup.locator(`input[value="${targetCountry}"]`),
  ).toBeChecked();

  // --- Toggle the limit method to the opposite of the current value. ---
  const targetMethod =
    regulatory.regulatoryMethod === "ONLY_EXCEPTIONS" ? "ALL" : "ONLY_EXCEPTIONS";
  const targetMethodLabel =
    targetMethod === "ALL"
      ? textStrategies.ALL
      : textStrategies.ONLY_EXCEPTIONS;
  await regulatoryPopup.getByText(targetMethodLabel, { exact: true }).click();

  // --- Save and assert the choices are persisted (full recalculation). ---
  const [updateResponse] = await Promise.all([
    page.waitForResponse((r: any) =>
      r.url().includes("/api/spendfile/strategies/allowed/update"),
    ),
    page.locator("#save-button-for-settings").click(),
  ]);
  expect(updateResponse.ok()).toBeTruthy();

  // The PATCH payload carries the new country source + method for the strategy.
  const sentBody = JSON.parse(updateResponse.request().postData() || "{}");
  const sentRegulatory = (sentBody.strategies || []).find(
    (s: any) => s.key === "regulatoryTermsStrategy",
  );
  expect(sentRegulatory?.regulatoryCountrySource).toBe(targetCountry);
  expect(sentRegulatory?.regulatoryMethod).toBe(targetMethod);
});

test.afterEach(async ({ page }) => {
  await ensureDefaultLogin(page);
});
