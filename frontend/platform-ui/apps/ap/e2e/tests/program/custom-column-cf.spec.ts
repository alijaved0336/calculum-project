import { expect, test } from "@playwright/test";
import {
  changeToSpendFile,
  waitElementVisibleAndClick,
  ensureDefaultLogin} from "../utils/Utils";
import { locators } from "../utils/locators";
import Api2 from "../utils/APi2";


test.beforeEach(async ({ page }) => {
  

  
  await ensureDefaultLogin(page);
  await page.goto("/");
  await changeToSpendFile(page, "Pagero.xlsx (Ver. 1)")
});

test("Test custom columns in  CF Program in Program EList View @api @program @us-4403", async ({
  page
}) => {


  await Promise.all([
    page.waitForResponse(
      responsePrograms =>
        responsePrograms.url().includes("/analyze_programs") &&
        responsePrograms.ok()
    ),
    waitElementVisibleAndClick(page, locators.sidebar.program)
  ]);
  await page.waitForTimeout(5000);

  
  const programsCount = await page.locator(locators.program.card).count();
  // If there are programs
  if (programsCount > 0) {
    // click first cf program
    waitElementVisibleAndClick(page, locators.program.showProgramCF);

    await Promise.all([
      page.waitForResponse(
        getProgram =>
          getProgram.url().includes("/api/graphql") &&
          getProgram.ok()
      ),
      page.locator(locators.headerMenu.programHeader.list).click()
    ]);

    await page.waitForTimeout(5000);

    page.locator('span.k-link:has-text("Spend Lines")').click();

   await page.waitForTimeout(4000);

    let header1 = await page.locator('.k-table-th.k-header.k-filterable').nth(0).innerText();
    let heder2 = await page.locator('.k-table-th.k-header.k-filterable').nth(1).innerText();
    let header3 = await page.locator('.k-table-th.k-header.k-filterable').nth(2).innerText();

    console.log("header1 : ", header1);
    console.log("header2 : ", heder2);
    console.log("header3 : ", header3);

    await expect(header1).toBe("Supplier Name");
    await expect(heder2).toBe("Spend Lines");
    await expect(header3).toBe("Parents");
  }
});
