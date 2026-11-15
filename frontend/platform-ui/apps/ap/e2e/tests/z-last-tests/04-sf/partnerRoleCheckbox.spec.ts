/**
 * TC 10067 : The Partner Role is working
 */
import { expect, test } from "@playwright/test";
import {
  ensureCompany_SFSuperAdminLogin,
  ensureDefaultLogin,
} from "../../utils/Utils";
import { locators } from "../../utils/locators";

test.beforeEach(async ({ page }) => {
  await ensureCompany_SFSuperAdminLogin(page);
});
test("Partner Role Data Role @admin @integrated @us-10067", async ({
  page,
}) => {  //go to manage users
  await page.locator(locators.headerMenu.topMenu.dropDownMenu).click();
  // get list of users from the api
  await Promise.all([
    page.waitForResponse(
      (req: any) => req.url().includes("/api/graphql") && req.ok(),
    ),
    page.locator(locators.headerMenu.topMenu.manageTeam).click(),
  ]);
  console.log("inside manage users view");
  // click on btn add-user
  await page.locator("#add-user-to-company").click();
  // fill email input
  await page.locator("#email").fill("example@calculum.ai");

  // the partner and data checkboxes should be both present
  await expect(page.locator(".k-checkbox-wrap.partner-checkbox")).toBeVisible();
});

test.afterEach(async ({ page }) => {
  await ensureDefaultLogin(page);
});
