import { test, expect, Page, chromium, Browser } from "@playwright/test";
import { ensureLogin, changeToCompany } from "../utils/Utils";
import Api2 from "../utils/APi2";
import { locators } from "../utils/locators";

/**
 * Company Switching Stress Test
 *
 * Validates that rapidly switching between companies does not produce HTTP 500
 * errors caused by race conditions where stale program/SFV parameters are sent
 * to the API after the active company has already changed.
 *
 * The test dynamically discovers available companies from the authenticated
 * user's session and runs multiple rounds at different switching speeds.
 *
 * Defense layers under test:
 *  - Layer 1: getDisableWatchers flag blocks Vue watchers during transitions
 *  - Layer 2: isProgramSfvConsistent() validates program-SFV consistency at API layer
 *
 * @see docs/context/race-condition-company-change.md
 * @see docs/plans/program-sfv-consistency-check.md
 */

// Minimum number of companies needed to run the test meaningfully
const MIN_COMPANIES_FOR_TEST = 3;

// Maximum companies to use per round (to keep test duration reasonable)
const MAX_COMPANIES_PER_ROUND = 8;

// A single switch must never consume more than a slice of the test budget.
// The dropdown-item click is capped on its own; this caps the auth refresh
// that runs in parallel with it (see raceWithTimeout / switchCompanyViaUI).
const AUTH_SETTLE_TIMEOUT_MS = 20000;

// Stop starting new switches once a round has run this long, so the round
// always reaches its assertions instead of being killed at the 180s test
// timeout mid-switch — which closes the context and throws "Target page,
// context or browser has been closed". Kept well under test.setTimeout(180000)
// to leave headroom for the in-flight switch + settle + assertions.
const ROUND_TIME_BUDGET_MS = 140000;

/**
 * Races a promise against a timeout. Used to bound a single company switch.
 *
 * `processAuthenticationEventFromBrowser` → `refreshWhoAmI` issues a who_am_i
 * GET whose timeout is `E2E_CUSTOM_TIME_OUT` (300000ms in CI) and retries up to
 * 4× with 1.5/3/6s backoff. Under rapid switching a session renewal
 * (302 → /api/users/{uuid}) can stall one refresh long past the 180s test
 * timeout, tearing the context down mid-round. Bounding it makes a stuck
 * refresh fail THAT switch (caught in switchCompanyViaUI → returns false)
 * rather than hanging the whole serial round.
 */
function raceWithTimeout<T>(
  promise: Promise<T>,
  ms: number,
  label: string,
): Promise<T> {
  // Swallow a late settle from the losing promise: the underlying GET can run
  // for minutes and would otherwise surface as an unhandled rejection after the
  // round — or after afterAll has already closed the browser.
  promise.catch(() => {});
  let timer: ReturnType<typeof setTimeout>;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(
      () =>
        reject(
          new Error(`[stress-test] ${label} did not settle within ${ms}ms`),
        ),
      ms,
    );
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

// Multi company user credentials
const E2E_AUTH_USERNAME_MULTI_COMPANY = process.env.E2E_AUTH_USERNAME_MULTI_COMPANY !== undefined ? process.env.E2E_AUTH_USERNAME_MULTI_COMPANY : '<undefined>';
const E2E_AUTH_PASSWORD_MULTI_COMPANY = process.env.E2E_AUTH_PASSWORD_MULTI_COMPANY !== undefined ? process.env.E2E_AUTH_PASSWORD_MULTI_COMPANY : '<undefined>';

// The MULTI_COMPANY user is the only fixture with 3+ companies, which is
// required to exercise cross-company switching. The credentials live in
// `e2e/.env.dev` (gitignored), so CI runners without those secrets injected
// would otherwise crash at login — skip cleanly instead.
const MULTI_COMPANY_CREDS_AVAILABLE =
  E2E_AUTH_USERNAME_MULTI_COMPANY !== '<undefined>' &&
  E2E_AUTH_PASSWORD_MULTI_COMPANY !== '<undefined>';

interface Http500Error {
  url: string;
  status: number;
  time: string;
}

test.describe.serial(
  "Company Switching - No HTTP 500 Errors @integrated @stability",
  () => {
    test.skip(
      !MULTI_COMPANY_CREDS_AVAILABLE,
      "E2E_AUTH_USERNAME_MULTI_COMPANY / E2E_AUTH_PASSWORD_MULTI_COMPANY not set — multi-company stress test requires a fixture user with 3+ companies",
    );

    let page: Page;
    let browser: Browser;
    let api: Api2;
    let availableCompanyNames: string[] = [];
    let initialCompanyName: string = "";

    test.beforeAll(async () => {
      browser = await chromium.launch();
      page = await browser.newPage();

      // Super admin has access to multiple companies — required to exercise
      // the cross-company switching race condition. The default SINGLE user
      // has only one company so the test has nothing to switch between.
      await ensureLogin(page,E2E_AUTH_USERNAME_MULTI_COMPANY,E2E_AUTH_PASSWORD_MULTI_COMPANY,"loginAsAdmin");
      api = await Api2.getInstance(page);

      // On retry the serial block re-runs in a fresh worker, so `getInstance`
      // can return a brand-new Api2 with `companies = []` until `whoAmI` is
      // processed, and when `ensureLogin` short-circuits (session already
      // valid) the instance never gets hydrated. Force a `whoAmI` refresh
      // here — pure GET to `/api/user/who_am_i`, no logout, no state.json
      // write — so `api.companies` is populated before the first assertion.
      // Avoid `checkAuthentication(true)`: it triggers a full logout + login
      // cycle and overwrites `e2e/state.json`, contaminating downstream
      // tests that rely on the SINGLE/ADMIN session in the shared storage
      // state (playwright.config.ts:55).
      await api.refreshWhoAmI(true);

      // Store initial company to restore later
      initialCompanyName = api.activeCompanyName;

      // Dynamically get available companies from the user's session
      const companies: any[] = api.companies;
      availableCompanyNames = companies.map((c: any) => c.name).filter(Boolean);

      console.log(
        `[stress-test] Found ${availableCompanyNames.length} companies:`,
        availableCompanyNames,
      );

      // Navigate to home dashboard and wait for the company dropdown — the
      // single UI element every switching round depends on. Avoid
      // `networkidle`: Apollo `cache-and-network`, PostHog and Sentry keep
      // the network busy so it never settles within the timeout.
      await page.goto("/");
      await page.waitForSelector(locators.navbar.companyDropdown.container, {
        state: "visible",
        timeout: 30000,
      });
    });

    test.afterAll(async () => {
      // Restore to initial company
      if (initialCompanyName && api.activeCompanyName !== initialCompanyName) {
        try {
          await changeToCompany(page, initialCompanyName);
        } catch {
          // Best-effort restore
        }
      }
      await browser.close();
    });

    /**
     * Injects a fetch/XHR interceptor that records HTTP 500+ responses.
     * Returns functions to query and reset the recorded errors.
     */
    async function installNetworkMonitor(): Promise<void> {
      await page.evaluate(() => {
        (window as any).__http500Errors = [];
        (window as any).__httpRequestCount = 0;

        // Intercept fetch
        const originalFetch = window.fetch;
        window.fetch = async function (input: RequestInfo | URL, init?: RequestInit) {
          (window as any).__httpRequestCount++;
          const response = await originalFetch.call(this, input, init);
          if (response.status >= 500) {
            const url =
              typeof input === "string"
                ? input
                : (input as Request)?.url || String(input);
            (window as any).__http500Errors.push({
              url,
              status: response.status,
              time: new Date().toISOString(),
            });
          }
          return response;
        };

        // Intercept XMLHttpRequest
        const originalOpen = XMLHttpRequest.prototype.open;
        XMLHttpRequest.prototype.open = function (
          method: string,
          url: string | URL,
          ...rest: any[]
        ) {
          (this as any).__url = url;
          this.addEventListener("load", function () {
            (window as any).__httpRequestCount++;
            if (this.status >= 500) {
              (window as any).__http500Errors.push({
                url: (this as any).__url,
                status: this.status,
                time: new Date().toISOString(),
              });
            }
          });
          return originalOpen.call(this, method, url, ...(rest as [any]));
        };
      });
    }

    async function getMonitorResults(): Promise<{
      errors: Http500Error[];
      requestCount: number;
    }> {
      return page.evaluate(() => ({
        errors: (window as any).__http500Errors as Http500Error[],
        requestCount: (window as any).__httpRequestCount as number,
      }));
    }

    async function resetMonitor(): Promise<void> {
      await page.evaluate(() => {
        (window as any).__http500Errors = [];
        (window as any).__httpRequestCount = 0;
      });
    }

    /**
     * Picks a subset of companies for a test round, always including
     * a different company than the currently active one and cycling back.
     */
    function pickCompaniesForRound(count: number): string[] {
      // Never pick the currently-active company: re-selecting it fires no
      // company-change event and the dropdown click on the already-selected
      // item never resolves, hanging the whole serial round until the 180s
      // test timeout (Target page/context closed at waitForTimeout).
      const candidates = availableCompanyNames.filter(
        (name) => name !== api.activeCompanyName,
      );
      const shuffled = [...candidates].sort(() => Math.random() - 0.5);
      return shuffled.slice(0, Math.min(count, MAX_COMPANIES_PER_ROUND));
    }

    /**
     * Switches companies using the UI dropdown at the specified delay.
     */
    async function switchCompanyViaUI(companyName: string): Promise<boolean> {
      try {
        await page
          .locator(locators.navbar.companyDropdown.container)
          .click({ timeout: 10000 });
        await page.waitForSelector(
          locators.navbar.companyDropdown.options,
          { state: "visible", timeout: 10000 },
        );

        const companyOption = page
          .locator(locators.navbar.companyDropdown.item)
          .filter({
            has: page.locator(`span:has-text("${companyName}")`),
          })
          .first();

        await Promise.all([
          // Bound the auth refresh (see raceWithTimeout). Without this, a stuck
          // who_am_i renewal on one switch runs the serial round past the 180s
          // test timeout and tears the context down mid-round.
          raceWithTimeout(
            api.processAuthenticationEventFromBrowser(page, false),
            AUTH_SETTLE_TIMEOUT_MS,
            `auth refresh for "${companyName}"`,
          ),
          // Bound the click: a dropdown option that never resolves must fail
          // THIS switch (caught below → returns false), not hang the whole
          // serial round to the 180s test timeout.
          companyOption.click({ timeout: 10000 }),
        ]);
        return true;
      } catch (error) {
        console.warn(
          `[stress-test] Failed to switch to "${companyName}":`,
          error,
        );
        return false;
      }
    }

    /**
     * Runs a switching round at the given delay between company changes.
     */
    async function runSwitchingRound(
      roundName: string,
      delayMs: number,
      companyCount: number,
    ): Promise<{ errors: Http500Error[]; requestCount: number; switches: number }> {
      await resetMonitor();
      const companies = pickCompaniesForRound(companyCount);
      let successfulSwitches = 0;

      console.log(
        `[stress-test] ${roundName}: switching through ${companies.length} companies with ${delayMs}ms delay`,
      );

      const roundStart = Date.now();
      for (const company of companies) {
        // Guarantee the round ends before the 180s test timeout. A switch that
        // burns its full bounded budget (~30s) must not push the loop past the
        // deadline and get the context torn down mid-switch.
        if (Date.now() - roundStart > ROUND_TIME_BUDGET_MS) {
          console.warn(
            `[stress-test] ${roundName}: time budget (${ROUND_TIME_BUDGET_MS}ms) reached after ${successfulSwitches} switches — stopping early so assertions run`,
          );
          break;
        }
        const ok = await switchCompanyViaUI(company);
        if (ok) successfulSwitches++;
        if (delayMs > 0) {
          await page.waitForTimeout(delayMs);
        }
      }

      // Wait for all in-flight requests to settle
      const settleTime = Math.max(5000, delayMs * 2);
      await page.waitForTimeout(settleTime);

      const results = await getMonitorResults();
      console.log(
        `[stress-test] ${roundName} done: ${successfulSwitches} switches, ` +
          `${results.requestCount} requests, ${results.errors.length} HTTP 500 errors`,
      );

      return {
        errors: results.errors,
        requestCount: results.requestCount,
        switches: successfulSwitches,
      };
    }

    test("should have enough companies to run stress test", async () => {
      expect(
        availableCompanyNames.length,
        `Need at least ${MIN_COMPANIES_FOR_TEST} companies, found ${availableCompanyNames.length}`,
      ).toBeGreaterThanOrEqual(MIN_COMPANIES_FOR_TEST);
    });

    test("should install network monitor", async () => {
      await installNetworkMonitor();
      const results = await getMonitorResults();
      expect(results.errors).toHaveLength(0);
      expect(results.requestCount).toBe(0);
    });

    test("SLOW round (1200-2000ms) - no HTTP 500 errors", async () => {
      test.setTimeout(180000);

      const result = await runSwitchingRound(
        "SLOW (1200-2000ms)",
        1500,
        Math.min(availableCompanyNames.length, 6),
      );

      expect(result.switches).toBeGreaterThan(0);

      if (result.errors.length > 0) {
        console.error(
          "[stress-test] SLOW round HTTP 500 errors:",
          JSON.stringify(result.errors, null, 2),
        );
      }
      expect(
        result.errors,
        "SLOW round should produce zero HTTP 500 errors",
      ).toHaveLength(0);
    });

    test("FAST round (500ms) - no HTTP 500 errors", async () => {
      test.setTimeout(180000);

      const result = await runSwitchingRound(
        "FAST (500ms)",
        500,
        Math.min(availableCompanyNames.length, 8),
      );

      expect(result.switches).toBeGreaterThan(0);

      if (result.errors.length > 0) {
        console.error(
          "[stress-test] FAST round HTTP 500 errors:",
          JSON.stringify(result.errors, null, 2),
        );
      }
      expect(
        result.errors,
        "FAST round should produce zero HTTP 500 errors",
      ).toHaveLength(0);
    });

    test("VERY FAST round (200ms) - no HTTP 500 errors", async () => {
      test.setTimeout(180000);

      const result = await runSwitchingRound(
        "VERY FAST (200ms)",
        200,
        Math.min(availableCompanyNames.length, 6),
      );

      expect(result.switches).toBeGreaterThan(0);

      if (result.errors.length > 0) {
        console.error(
          "[stress-test] VERY FAST round HTTP 500 errors:",
          JSON.stringify(result.errors, null, 2),
        );
      }
      expect(
        result.errors,
        "VERY FAST round should produce zero HTTP 500 errors",
      ).toHaveLength(0);
    });

    test("ULTRA FAST round (0ms) - no HTTP 500 errors", async () => {
      test.setTimeout(180000);

      const result = await runSwitchingRound(
        "ULTRA FAST (0ms)",
        0,
        Math.min(availableCompanyNames.length, 5),
      );

      expect(result.switches).toBeGreaterThan(0);

      if (result.errors.length > 0) {
        console.error(
          "[stress-test] ULTRA FAST round HTTP 500 errors:",
          JSON.stringify(result.errors, null, 2),
        );
      }
      expect(
        result.errors,
        "ULTRA FAST round should produce zero HTTP 500 errors",
      ).toHaveLength(0);
    });
  },
);
