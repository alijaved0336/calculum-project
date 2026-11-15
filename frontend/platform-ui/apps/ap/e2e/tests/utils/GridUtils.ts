import { Page, Response, expect } from "@playwright/test";

export default class GridUtils {
  /**
   * Go to Spends tab
   *
   * @param {Page} page
   * @returns {Promise<Response | null>} response
   */
  static async goToGridSpendsTab(page: Page): Promise<Response | null> {
    console.log("Going to Tab List->Spends...");

    const [response] = await Promise.all([
      page.waitForResponse(
        response => response.url().includes("/api/graphql") && response.ok()
      ),
      page.getByRole("tab", { name: "Spend Lines" }).click()
    ]);

    return response;
  }

  static async goToGridSuppliersTab(page: Page): Promise<Response | null> {
    console.log("Going to Tab List->Suppliers...");

    const [response] = await Promise.all([
      page.waitForResponse(
        response => response.url().includes("/api/graphql") && response.ok()
      ),
      page.getByRole("tab", { name: "Suppliers" }).click()
    ]);

    return response;
  }

  // Return type is `null`, not `Response | null`: unlike the Spends/Suppliers
  // tabs above, this one never has a real Response to hand back (see below),
  // so the signature says so instead of promising a value it can't produce —
  // a caller that tried to read the response (the pattern this replaced in
  // status-analyzed.spec.ts) now fails to compile instead of throwing on
  // `response.json()` at runtime.
  static async goToGridParentsTab(page: Page): Promise<null> {
    console.log("Going to Tab List->Parents...");

    // The List section prefetches all three level grids and only toggles
    // visibility on tab switch, so a click here does not always trigger a
    // new /api/graphql call (nothing the query depends on may have
    // changed) — waiting for a network response can then hang for the
    // whole test budget. Gate on the tab's own selected state instead;
    // callers that need the grid payload arm their own operation-specific
    // waiter around this call.
    await page.getByRole("tab", { name: "Parents" }).click();
    await expect(
      page.getByRole("tab", { name: "Parents", selected: true })
    ).toBeVisible({ timeout: 30_000 });

    return null;
  }
}
