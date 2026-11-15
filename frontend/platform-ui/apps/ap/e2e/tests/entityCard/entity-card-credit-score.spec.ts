/**
 * @fileoverview
 * E2E tests for verifying the display and correctness of the Credit Score card in the Entity Card.
 *
 * Main Flows:
 * 1. Ensure the user is logged in with default credentials.
 * 2. Change to the spend file "Pagero_DSO_TEST.xlsx (Ver. 1)".
 * 3. Navigate to the Entity Card for the specified company.
 * 4. Assert that the Credit Score card displays the correct value, reference, source, and description.
 * 5. Repeat for different suppliers and their parent entities as needed.
 *
 * Acceptance Criteria:
 * - The test waits for the necessary navigation and spend file change to complete.
 * - The Entity Card for the target company loads successfully.
 * - The Credit Score card displays the correct score value, reference, source, and ADA score description for both the supplier and its parent.
 * - The test passes if all assertions are met and the UI displays the correct credit score data for each entity.
 */

import {
  expect,
  test,
  type Page,
  type Request,
  type Response,
} from "@playwright/test";
import { locators } from "../utils/locators";
import {
  changeToSpendFile,
  goToEntityCardEntityExactFull,
  ensureDefaultLogin,
} from "../utils/Utils";
import ProgramUtils from "../utils/ProgramUtils";
test.describe.serial("Entity-Card - Credit Score", async () => {
  let page: Page;
  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();
    await ensureDefaultLogin(page);
    await changeToSpendFile(page, "Pagero_DSO_TEST.xlsx (Ver. 1)");
    await ProgramUtils.changeToProgram(page, "Test Adabot (NO TOCAR)");
  });
  test("Entity-Card - Credit Score - Aarsleff Rail A/S @flakyResolved @integrated @adabot @us-781", async () => {
    const supplier = {
      companyName: "Aarsleff Rail A/S",
      creditScoreValue: 50,
      creditScoreRef: "BB+", //supplier.creditScoreRef
      source: "internal",
      adaScoreDescription: "Medium",
    };

    const parent = {
      companyName: "PER AARSLEFF HOLDING AS",
      creditScoreValue: 50,
      creditScoreRef: "BB+",
      source: "internal",
      adaScoreDescription: "Medium",
    };

    await checkCreditScore(supplier, parent, page);
    await page.locator(locators.entityCard.closeButton).click();
  });

  test("Entity-Card - Credit Score - Microelettrica Scientifica S.P.A. @flakyResolved @integrated @adabot @us-781", async () => {
    const supplier = {
      companyName: "Microelettrica Scientifica S.P.A.",
      creditScoreValue: 75,
      creditScoreRef: "A",
      source: "parent",
      adaScoreDescription: "Strong",
    };

    const parent = {
      companyName: "Knorr-Bremse AG",
      creditScoreValue: 75,
      creditScoreRef: "A",
      source: "external",
      adaScoreDescription: "Strong",
    };

    await checkCreditScore(supplier, parent, page);
    await page.locator(locators.entityCard.closeButton).click();
  });

  test("Entity-Card - Credit Score - Bio Rad Laboratories Inc @flakyResolved @integrated @adabot @us-781", async () => {
    const supplier = {
      companyName: "Bio Rad Laboratories Inc",
      creditScoreValue: 60,
      creditScoreRef: "BBB",
      source: "external",
      adaScoreDescription: "Medium",
    };

    const parent = {
      companyName: "BIO-RAD LABORATORIES INC",
      creditScoreValue: 60,
      creditScoreRef: "BBB",
      source: "external",
      adaScoreDescription: "Medium",
    };

    await checkCreditScore(supplier, parent, page);
    await page.locator(locators.entityCard.closeButton).click();
  });

  test("Entity-Card - Credit Score - Johannes Matzhold Gesmbh @flakyResolved @integrated @adabot @us-781", async () => {
    const supplier = {
      companyName: "Johannes Matzhold Gesmbh",
      creditScoreValue: 60,
      creditScoreRef: "BBB",
      source: "internal",
      adaScoreDescription: "Medium",
    };

    const parent = null;

    await checkCreditScore(supplier, parent, page);
    await page.locator(locators.entityCard.closeButton).click();
  });
  test.afterAll(async () => {
    // Close the page's context (not the worker `browser` fixture) so the
    // worker stays alive for the next spec in the workers=1 pipeline.
    await page?.context().close().catch((error) => {
      console.error(
        "afterAll: page.context().close() failed (non-critical):",
        error instanceof Error ? error.message : String(error),
      );
    });
  });
});

const ADABOT_ALL_PATH = /^\/api\/entity-card\/entity\/ada-bot\/all\/?$/;

// The entity card calls checkCreditScore waits on, directly or through
// goToEntityCardEntityExactFull.
const AWAITED_ENTITY_CARD_PATHS = [
  /^\/api\/entity-card\/get-entity-cards$/,
  /^\/api\/entity-card\/entity\/[^/]+\/detail$/,
  /^\/api\/entity-card\/entity\/[^/]+\/credit-score$/,
  ADABOT_ALL_PATH,
];

const isAwaitedEntityCardCall = (url: string) => {
  const { pathname } = new URL(url);
  return AWAITED_ENTITY_CARD_PATHS.some((path) => path.test(pathname));
};

/**
 * Rejects as soon as one of the awaited entity card calls fails.
 *
 * A request the browser blocks (the API answering a gateway or server error
 * without CORS headers, reported as net::ERR_FAILED) never emits a `response`
 * event, and the waiters only accept OK answers, so either failure otherwise
 * hangs until the test timeout with no trace of the cause. net::ERR_ABORTED is
 * ignored: it is the SPA cancelling a request it no longer needs.
 */
function failOnEntityCardCallError(page: Page) {
  let onRequestFailed: (request: Request) => void = () => {};
  let onResponse: (response: Response) => void = () => {};

  const failure = new Promise<never>((_, reject) => {
    onRequestFailed = (request) => {
      const errorText = request.failure()?.errorText ?? "unknown error";
      if (!isAwaitedEntityCardCall(request.url()) || errorText === "net::ERR_ABORTED")
        return;
      reject(
        new Error(
          `${request.method()} ${new URL(request.url()).pathname} failed in the browser with ${errorText}; net::ERR_FAILED here means the API answered without CORS headers (gateway or server error)`,
        ),
      );
    };
    onResponse = (response) => {
      if (!isAwaitedEntityCardCall(response.url()) || response.status() < 400)
        return;
      reject(
        new Error(
          `${response.request().method()} ${new URL(response.url()).pathname} answered HTTP ${response.status()}`,
        ),
      );
    };
  });

  page.on("requestfailed", onRequestFailed);
  page.on("response", onResponse);

  return {
    failure,
    dispose: () => {
      page.off("requestfailed", onRequestFailed);
      page.off("response", onResponse);
    },
  };
}

async function checkCreditScore(supplier: any, parent: any, page: Page) {
  const guard = failOnEntityCardCallError(page);
  let response: Response;
  try {
    [response] = await Promise.race([
      Promise.all([
        // Body-match the credit-score response to the supplier under test. In this
        // serial suite a search for a child also returns its parent, and a stale
        // credit-score response from a previously opened card could otherwise be
        // captured — both produced the flake where `result.supplier.companyName`
        // came back as the parent ("Knorr-Bremse AG").
        page.waitForResponse(async (response) => {
          if (!response.url().includes("/credit-score") || !response.ok())
            return false;
          try {
            const body = await response.json();
            return body?.supplier?.companyName === supplier.companyName;
          } catch {
            return false;
          }
        }),
        page.waitForResponse(
          (response) =>
            ADABOT_ALL_PATH.test(new URL(response.url()).pathname) &&
            response.ok(),
        ),
        // Open the card by exact name (reads the get-entity-cards body and clicks
        // the matching index) instead of nth(0), which non-deterministically
        // opened the parent card when it sorted ahead of the supplier.
        goToEntityCardEntityExactFull(page, supplier.companyName),
      ]),
      guard.failure,
    ]);
  } finally {
    guard.dispose();
  }

  const result = await response.json();
  // checking the endpoint values of supplier
  expect(result.supplier.adaScore).toBe(supplier.creditScoreValue);
  expect(result.supplier.adaScoreRef).toBe(supplier.creditScoreRef);
  expect(result.supplier.companyName).toBe(supplier.companyName);
  expect(result.supplier.source).toBe(supplier.source);
  expect(result.supplier.adaScoreDescription).toBe(
    supplier.adaScoreDescription,
  );

  // checking the endpoint values of parent
  if (parent) {
    expect(result.parent.adaScore).toBe(parent.creditScoreValue);
    expect(result.parent.adaScoreRef).toBe(parent.creditScoreRef);
    expect(result.parent.parentName).toBe(parent.companyName);
    expect(result.parent.source).toBe(parent.source);
    expect(result.parent.adaScoreDescription).toBe(parent.adaScoreDescription);
  } else {
    expect(result.parent).toBe(parent);
  }

  // Scope to the credit-rating card by its heading rather than a positional
  // nth() index, so the assertions survive cards being added/removed/reordered.
  const creditRatingCard = () =>
    page
      .locator(".card.shadow-none")
      .filter({ has: page.getByRole("heading", { name: "Company Credit Rating" }) })
      .first();

  let card = creditRatingCard();
  const letterGrade = card.locator(".text-4xl.font-bold").first();

  const cardCreditScore = await letterGrade.innerText();
  if (cardCreditScore.split(" ").length === 1) {
    await expect(letterGrade).toHaveText(supplier.creditScoreRef);
  }
  await expect(card).toContainText(supplier.adaScoreDescription);

  await page.locator(locators.entityCard.menu.ratingMetrics).click();
  card = creditRatingCard();

  await expect(card.locator(".text-4xl.font-bold").first()).toBeVisible();
  await expect(card).toContainText(supplier.adaScoreDescription);
}
