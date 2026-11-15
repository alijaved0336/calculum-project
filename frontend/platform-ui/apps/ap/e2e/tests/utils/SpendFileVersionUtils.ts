import { expect } from "@playwright/test";
import Api2 from "./APi2";

/**
 * Budget for the backend to clear the `pendingRecalculation` flag a write
 * sets on a spend file version. Dev recalculates the shared fixtures on its
 * own schedule, so every caller polls rather than assuming a fixed wait.
 */
export const RECALCULATION_POLL_BUDGET_MS = 240000;

/** Gap between polls of the version resource. */
const POLL_INTERVAL_MS = 10000;

export default class SpendFileVersionUtils {
  /**
   * Poll a spend file version until it is no longer flagged for
   * recalculation.
   *
   * Several parts of the app render nothing at all while the flag is armed:
   * the nine boxes hide their whole body behind `!programInrecalculation`,
   * the navbar supplier search is disabled behind the "needs to be
   * re-calculated" banner, and Setup turns read-only. A test that writes
   * something which enqueues a recalculation has to wait the flag out before
   * reading any of them.
   *
   * @param {Api2} api
   * @param {string} versionUUID active spend file version
   * @param {number} budgetMs how long to wait before giving up
   * @returns {Promise<string | null>} null once the version is ready, or the
   * last observed state when the budget runs out, for the caller to report.
   */
  static async waitForVersionRecalculated(
    api: Api2,
    versionUUID: string,
    budgetMs: number = RECALCULATION_POLL_BUDGET_MS,
  ): Promise<string | null> {
    // A missing UUID or a failing read is a broken premise, not a pending
    // recalculation. Both used to fall through to the caller's test.skip,
    // which turned an unverifiable run into a green one that asserts nothing.
    expect(
      versionUUID,
      "polling for recalculation needs the active spend file version UUID",
    ).toBeTruthy();

    const deadline = Date.now() + budgetMs;
    let lastState = "no response observed";

    while (Date.now() < deadline) {
      const response = await api.doGet(
        `/api/spend_file_versions/${versionUUID}`,
      );

      expect(
        response.ok(),
        `GET /api/spend_file_versions/${versionUUID} answered ${response.status()}`,
      ).toBe(true);

      const body = await response.json();

      if (body.pendingRecalculation === false) {
        return null;
      }

      lastState = `pendingRecalculation=${body.pendingRecalculation}`;
      console.log(`** waiting for recalculation: ${lastState}`);

      await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
    }

    // Reserved for the genuine case: the version really is still pending after
    // the full budget, which the caller reports as a skip.
    return lastState;
  }
}
