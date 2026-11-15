import { expect, test } from "@playwright/test";
import { changeToSpendFile, ensureAdminLogin } from "../../utils/Utils";
import { locators } from "../../utils/locators";
import ProgramUtils from "../../utils/ProgramUtils";

const SPEND_FILE = "Pagero-SF4.xlsx (Ver. 1)";

test.beforeEach(async ({ page }) => {
  await ensureAdminLogin(page);
  await page.goto("/");
  await page.waitForSelector(".loading-modal", { state: "detached" });
  await changeToSpendFile(page, SPEND_FILE);
});

test("Test for the last selected category tab is selected once the user returns @tc5978 @program", async ({ page }) => {
  console.log("Going to Program Page...");
  await ProgramUtils.goToProgramSection(page);
  await page.waitForTimeout(2000);
  if (!page.url().includes("/analyze/program_overview")) {
    const showBtn = page.getByRole("button", { name: "Show", exact: true }).first();
    if (await showBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await showBtn.click();
      await page.waitForURL(/.*\/analyze\/program_overview/, { timeout: 30000 });
    }
  }
  await page.waitForTimeout(3000);

  // Select option index 4 from #select-group
  await page.locator("#select-group").first().selectOption({ index: 4 });
  await page.waitForTimeout(2000);

  const selectedOptionGroup2 = await page.evaluate(() => {
    const selectElement = document.querySelector("#select-group") as HTMLSelectElement | null;
    if (!selectElement || !(selectElement instanceof HTMLSelectElement)) {
      return null;
    }
    return selectElement.options[selectElement.selectedIndex].textContent;
  });
  console.log("Selected option after change:", selectedOptionGroup2);

  // Navigate to Compare
  await Promise.all([
    page.waitForResponse(
      (response) =>
        response.url().includes("/api/statistics/compare/peers") && response.ok(),
    ),
    page.locator(locators.sidebar.compare).click(),
  ]);

  // Navigate back to Program
  await Promise.all([
    page.waitForResponse(
      (response) =>
        response.url().includes("api/analyze/programs/") && response.ok(),
    ),
    page.waitForResponse(
      (response) =>
        response.url().includes("api/statistics/getCategoriesData/") && response.ok(),
    ),
    page.locator(locators.sidebar.program).click(),
  ]);
  await page.waitForTimeout(1000);

  const selectedOptionGroup3 = await page.evaluate(() => {
    const selectElement = document.querySelector("#select-group") as HTMLSelectElement | null;
    if (!selectElement || !(selectElement instanceof HTMLSelectElement)) {
      return null;
    }
    return selectElement.options[selectElement.selectedIndex].textContent;
  });
  console.log("Selected option after return:", selectedOptionGroup3);

  expect(selectedOptionGroup3).toEqual(selectedOptionGroup2);
});
