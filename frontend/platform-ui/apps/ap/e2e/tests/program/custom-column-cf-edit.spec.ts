import { expect, test } from "@playwright/test";
import { changeToSpendFile, ensureAdminLogin } from "../utils/Utils";
import { locators } from "../utils/locators";

test.beforeEach(async ({ page }) => {  

  await ensureAdminLogin(page);
  await page.goto("/");
  await changeToSpendFile(page, "Pagero_Full_Home.xlsx (Ver. 1)");
});

test("Test custom columns in  CF Program in Program Edit List View @api @program @us-4458", async ({
  page
}) => {
  await Promise.all([
    page.waitForResponse(
      responsePrograms =>
        responsePrograms.url().includes("/analyze_programs") &&
        responsePrograms.ok()
    ),
    page.locator(locators.sidebar.program).click()
  ]);
  await page.waitForTimeout(5000);

  // Open a CF program first (like the passing sibling custom-column-cf.spec.ts). The
  // List grid only refires api/graphql once inside a program, so if we are on the
  // "all programs" cards view we must open one before navigating to List.
  const programsCount = await page.locator(locators.program.card).count();
  if (programsCount > 0) {
    await page.locator(locators.program.showProgramCF).first().click();
    await page.waitForTimeout(3000);
  }

  // Navigate to List. Do NOT gate on api/graphql: the grid is served from the SPA
  // store and the response does not reliably refire on this navigation; wait on the
  // List tab UI instead.
  await page.locator(locators.headerMenu.programHeader.list).click();
  const spendLinesTab = page.getByRole("tab", { name: "Spend Lines" }).first();
  await spendLinesTab.waitFor({ state: "visible", timeout: 20000 });
  await page.waitForTimeout(3000);
  await spendLinesTab.locator("span").click();
  await page.waitForTimeout(4000);

  // Enter edit mode via the dedicated "Edit Mode" button in the program header.
  // (The old kebab-menu "Edit" item no longer exists — the current UI exposes edit
  // mode as a top-level header button.) A confirmation modal may appear afterwards.
  const editModeBtn = page.getByRole("button", { name: "Edit Mode" });
  await editModeBtn.waitFor({ state: "visible", timeout: 20000 });
  await editModeBtn.click();
  const continueBtn = page.locator('span:has-text("Continue")');
  if (await continueBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
    await continueBtn.click();
  }
  await page.waitForTimeout(6000);

  await spendLinesTab.locator("span").click();
  await page.waitForTimeout(3000);
  await page
    .locator(".k-table-th.k-header.k-filterable")
    .first()
    .waitFor({ state: "visible", timeout: 20000 });


  // Edit Mode grew a read-only exclusion-reason column in second position (AB#20307,
  // `globalColumns.programExclusionReason`, wired into
  // `defaultProgramGridSpendEditColumn` right after `disabled`), so the filterable
  // headers now read Included, Reason for Exclusion, Supplier Name, Spend Alias.
  // Only the Edit Mode grids carry it - the read-only List grid asserted by
  // custom-column-cf.spec.ts is unchanged. The column was first labelled "Reason" and
  // renamed to "Reason for Exclusion" in 0d33224c6b (i18n key
  // `home.analyze.table.exclusionReason`).
  const headers = page.locator(".k-table-th.k-header.k-filterable");

  console.log("headers : ", await headers.allInnerTexts());

  await expect(headers.nth(0)).toHaveText("Included", { useInnerText: true });
  await expect(headers.nth(1)).toHaveText("Reason for Exclusion", {
    useInnerText: true
  });
  await expect(headers.nth(2)).toHaveText("Supplier Name", {
    useInnerText: true
  });
  await expect(headers.nth(3)).toHaveText("Spend Alias", { useInnerText: true });
});
