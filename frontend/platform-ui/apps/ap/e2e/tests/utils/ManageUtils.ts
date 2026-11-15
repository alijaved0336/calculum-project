import { Page } from "@playwright/test";
import { locators } from "./locators";

export default class ManageUtils {
  static async goToManageSection(page: Page) {
    console.log("Going to Manage Section ...");
    
    await Promise.all([
      page.waitForResponse(
        responsePrograms =>
          responsePrograms.url().includes("/api/manage/status_cards_number") &&
          responsePrograms.ok()
      ),
      await page.locator(locators.sidebar.manage).click()
    ]);

    console.log("Successfully navigated to Manage Section!");
  }
}
