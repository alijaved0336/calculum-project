import { Locator, Page, Response, expect } from "@playwright/test";
import { locators } from "./locators";
import { ApiWaitersUtils } from ".";

export default class SetupUtils {
  static async goToSetupSection(page: Page): Promise<Response | null> {
    console.log("Going to Setup section...");

    const [response] = await Promise.all([
      ApiWaitersUtils.waitForSpendFileStrategiesAllowedStatus(page),
      page.locator(locators.sidebar.settings).click()
    ]);

    return response;
  }
}
