import { Page, Response } from "@playwright/test";

export default class ApiWaitersUtils {
  // *** GraphQl API Waiters ***

  /**
   * Wait for graphql response
   *
   * @param {Page} page
   * @return {Promise<Response>}
   */
  static async waitForGraphqlResponse(page: Page): Promise<Response> {
    return page.waitForResponse(
      (response) => response.url().includes("/api/graphql") && response.ok(),
    );
  }

  // *** END GraphQl API Waiters ***

  // *** Spend File API Waiters ***

  /**
   * The SPA requests this endpoint with a query string
   * (`/api/spendfile/strategies/allowed-status?spendUUID=...`, see
   * `retrieveStrategies` in src/modules/home/api), so the match is done on the
   * URL pathname — an `endsWith` on the full URL never matches and the waiter
   * hangs until the test times out.
   */
  static async waitForSpendFileStrategiesAllowedStatus(
    page: Page,
  ): Promise<Response> {
    return page.waitForResponse(
      (response) =>
        new URL(response.url()).pathname.endsWith(
          "/spendfile/strategies/allowed-status",
        ) && response.ok(),
    );
  }

  /**
   * Matched on the pathname for the same reason as the status waiter above: an
   * `endsWith` over the full URL stops matching the moment the caller appends a
   * query string, and the waiter then hangs until the test times out.
   */
  static async waitForSpendFileStrategiesAllowedUpdate(
    page: Page,
    options?: Partial<{
      hasResponseToBeOk: boolean;
    }>,
  ): Promise<Response> {
    const { hasResponseToBeOk = true } = options || {};

    const isAllowedUpdate = (response: Response): boolean =>
      new URL(response.url()).pathname.endsWith(
        "/spendfile/strategies/allowed/update",
      );

    if (hasResponseToBeOk) {
      return page.waitForResponse(
        (response) => isAllowedUpdate(response) && response.ok(),
      );
    }

    return page.waitForResponse(isAllowedUpdate);
  }

  static async waitForSpendFileVersionsAnalyzePrograms(
    page: Page,
  ): Promise<Response> {
    return page.waitForResponse(
      (response) =>
        response.url().includes("api/spend_file_versions") &&
        response.url().endsWith("/analyze_programs") &&
        response.ok(),
    );
  }

  // *** END Spend File API Waiters ***

  // *** Analyze API Waiters ***

  static async waitForAnalyzeNineBoxes(page: Page): Promise<Response> {
    return page.waitForResponse(
      (response) =>
        response.url().endsWith("/api/analyze/get-nine-boxes-terms-extension-data") &&
        response.ok(),
    );
  }

  // *** END Analyze API Waiters ***

  // *** Entity Card API Waiters ***

  /*
   * example: /api/entity-card/spend-program-configuration/4d4b24c7-0d2d-4e70-8b61-7df4fa7fe214/chart/payment-terms-opportunity/supplier
   */
  static async waitForEntityCardGetEntityCards(page: Page): Promise<Response> {
    return page.waitForResponse(
      (response) =>
        response.url().endsWith("api/entity-card/get-entity-cards") &&
        response.ok(),
    );
  }

  /*
   * example: /api/entity-card/spend-program-configuration/4d4b24c7-0d2d-4e70-8b61-7df4fa7fe214/chart/payment-terms-opportunity/supplier
   *
   * `timeout` overrides the page default for callers that have to wait
   * through a program recalculation on the shared environments.
   */
  static async waitForEntityCardSPConfigChartPTOpp(
    page: Page,
    timeout?: number,
  ): Promise<Response> {
    return page.waitForResponse(
      (response) =>
        response.url().includes("/entity-card/spend-program-configuration") &&
        response.url().includes("/chart/payment-terms-opportunity") &&
        // (response.url().endsWith("/supplier") ||
        //   response.url().endsWith("/spends")) &&
        response.ok(),
      { timeout },
    );
  }

  /**
   * Get Entity or Spend File Details
   * Route: /api/entity-card/details/{uuid}/{type}
   *
   * @param {Page} page
   * @return {Promise<Response>}
   */
  static async waitForEntityCardDetailsSpend(page: Page): Promise<Response> {
    return page.waitForResponse(
      (response) =>
        response.url().includes("/entity-card/details") &&
        response.url().endsWith("/spend") &&
        response.ok(),
    );
  }

  // *** END Entity Card API Waiters ***
}
