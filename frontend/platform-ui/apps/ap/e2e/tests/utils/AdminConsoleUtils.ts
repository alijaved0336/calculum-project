import { Page, expect } from "@playwright/test";
import { waitElementVisibleAndClick, goToHomeSection } from "./Utils";
import { locators } from "./locators";

export default class AdminConsoleUtils {
  static async goToAdminConsole(page: Page) {

    await goToHomeSection(page);

    console.log("Going to Admin Console...");

    // Open User menu
    await page.locator(locators.headerMenu.topMenu.dropDownMenu).click();

    // Open Admin Console section
    await page.locator(locators.userMenu.adminConsole.itself).click();

    // Wait for URL to contain /admin
    await page.waitForURL(/.*\/admin/);

    // Assert URL to contain /admin
    await expect(page).toHaveURL(/.*\/admin/);

    console.log('Successfully in Area "Admin Console".');
  }

  /**
   * Go to Companies section in Admin Console
   *
   * @param page
   */
  static async goToCompanies(
    page: Page,
    options?: Partial<{
      isFromHome: boolean;
    }>
  ) {
    // Set default values
    const { isFromHome = true } = options || {};

    console.log("Going to Companies section ...");

    if (isFromHome) {
      console.log("from Home ...");
      // await this.goToAdminConsole(page);
    }

    console.log("Moving inside Admin Console. Going to Data Changes...");

    const [response] = await Promise.all([
      page.waitForResponse(
        response => response.url().endsWith("/companies") && response.ok()
      ),
      isFromHome ? this.goToAdminConsole(page) : page.locator(locators.userMenu.adminConsole.listCompanies).click()
    ]);

    console.log('Successfully in Area "Data Changes".');

    return response;
  }

  /**
   * Go to Data Changes
   *
   * @param page
   */
  static async goToDataChanges(
    page: Page,
    options?: Partial<{
      isFromHome: boolean;
    }>
  ) {
    // Set default values
    const { isFromHome = true } = options || {};

    console.log("Going to Data Changes ...");

    if (isFromHome) {
      console.log("... from Home ...");

      // Assert URL is /home/home-dashboard
      await expect(page).toHaveURL(/.*\/home\/home-dashboard/);

      await this.goToAdminConsole(page);
    }

    console.log("Moving inside Admin Console. Going to Data Changes...");

    // Click text=Data Changes
    await waitElementVisibleAndClick(
      page,
      locators.userMenu.adminConsole.dataController
    );

    // Wait for URL to contain /admin/data_change
    await page.waitForURL(/.*\/admin\/data/);

    // Assert URL to contain /admin/data_change
    await expect(page).toHaveURL(/.*\/admin\/data/);

    //select the last tab = Data Change
    await page.locator('#data-3-data-change').click();

    // Assert that the table is visible
    await expect(page.locator(".k-grid")).toBeVisible();

    console.log('Successfully in Area "Data Changes".');
  }

  /**
   * Go to User Panel
   *
   * @param page
   */
  static async goToUserPanel(page: Page) {
    console.log("Going to User Panel ...");


    await Promise.all([
      page.waitForResponse(
        (response) =>
          response.url().includes("/get_max_end_date_spend") && response.ok(),
      ),
      page.locator(locators.userMenu.adminConsole.userPanel).click()
    ]);

    
  }
}
