import { Page } from "@playwright/test";

/**
 * /api/graphql is multiplexed and each grid ALSO issues a totals query with
 * the same operation name, so the wait anchors on both the request's operation
 * marker and the response body actually carrying the grid edges.
 */
export function waitForGraphqlGridResponse(
  page: Page,
  operationName: string,
  rootField: "suppliers" | "spends",
  timeout?: number,
) {
  return page.waitForResponse(
    async (response) => {
      if (!response.url().includes("/api/graphql") || !response.ok()) {
        return false;
      }
      if (!(response.request().postData() ?? "").includes(operationName)) {
        return false;
      }
      try {
        const body = await response.json();
        return Boolean(body?.data?.[rootField]?.edges);
      } catch {
        return false;
      }
    },
    timeout ? { timeout } : undefined,
  );
}

/** The phase-suppliers save request (edit-plan-phase, with plan_phases as fallback). */
export function waitForPhaseSave(page: Page) {
  return page.waitForResponse((response) => {
    const path = new URL(response.url()).pathname;
    return (
      (path.endsWith("/api/plans/edit-plan-phase") ||
        path.includes("/api/plan_phases")) &&
      response.request().method() !== "GET" &&
      response.ok()
    );
  });
}

/** Open the first phase card's kebab menu and enter its Edit modal. */
export async function openFirstPhaseEditModal(page: Page) {
  await page
    .locator(".card-view-plan")
    .first()
    .getByTestId("kebab-menu")
    .click();

  const [editResponse] = await Promise.all([
    waitForGraphqlGridResponse(
      page,
      "collectionQueryProgramListSuppliers",
      "suppliers",
    ),
    page
      .locator(".card-view-plan")
      .first()
      .getByRole("listitem")
      .filter({ hasText: "Edit" })
      .locator("a")
      .click(),
  ]);

  return editResponse;
}

/**
 * A failed body can leave the entity card or the phase edit modal open, and
 * its backdrop intercepts every click below it: close any leftover modal
 * (bounded loop).
 */
export async function closeLeftoverModals(page: Page) {
  const modals = page.locator(".calculum-modal");
  for (let i = 0; i < 4 && (await modals.count()) > 0; i++) {
    const close = modals.last().locator("[data-testid='close-icon']").first();
    if (!(await close.isVisible().catch(() => false))) break;
    await close.click();
    await modals
      .last()
      .waitFor({ state: "hidden", timeout: 5000 })
      .catch(() => null);
  }
}
