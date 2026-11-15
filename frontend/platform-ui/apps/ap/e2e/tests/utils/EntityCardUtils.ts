import { Page, expect } from "@playwright/test";
import englishKeys from "@ada/design-system/locales/languages/en.json"

/**
 * Entity Card section utils
 */
export default class EntityCardUtils {
  /**
   * Go to Entity Card given an entity name.
   *
   * @param page {Page}
   * @param entityName {string}
   * @param index {number}
   * @param wait {boolean}
   * @param entityName {string}
   * @param exact {boolean}
   * @returns {Promise<void>}
   */
  static async goToEntityCardEntity(
    page: Page,
    {
      entityName,
      index = 0,
      wait = true,
      exact = true
    }: {
      entityName: string;
      index?: number;
      wait?: boolean;
      exact?: boolean;
    }
  ): Promise<void> {
    console.log("Moving to entity: ", entityName);

    // Add api waiting

    const search = page.getByPlaceholder(englishKeys.home.components.navbar.search);

    // Type company name
    await search.fill(entityName);

    await Promise.all([
      page.waitForResponse(response =>
        response.url().endsWith("/api/entity-card/get-entity-cards")
      ),
      await search.press("Enter")
    ]);

    if (wait) {
      await page
        .locator(".card")
        .filter({
          has: page.locator(".current-name").getByText(entityName, { exact })
        })
        .nth(index)
        .click();

      await expect(page).toHaveURL(
        /.*\/home\/entity_card\/overview\/[\w,\d]{8}-[\w,\d]{4}-[\w,\d]{4}-[\w,\d]{4}-[\w,\d]{12}/
      );
    }
    // No wait
    else {
      await page
        .locator(".card")
        .filter({
          has: page.getByText(entityName, { exact })
        })
        .nth(index)
        .click();
    }

    console.log("Successfully moved to entity: ", entityName);
  }

  /**
   * Close the entity card modal.
   *
   * @param page {Page}
   * @returns {Promise<void>}
   */
  static async entityCardEntityCloseModal(page: Page): Promise<void> {
    console.log("Closing entity card modal...");

    await page
      // .getByTestId("modal")
      .getByTestId("close-icon")
      .click();
  }
}
