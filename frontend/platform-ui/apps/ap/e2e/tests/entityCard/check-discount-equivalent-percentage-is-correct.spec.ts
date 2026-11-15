/**
 * @fileoverview
 * As a user, I should see the discount-equivalent (What is the Cost) percentage of the proposed Cash Flow gain in any Supplier, Spend Line, and Ultimate Parente, to have better analysis capabilities.
 */

import { expect, test } from "@playwright/test";
import {
  changeToSpendFile,
  ensureDefaultLogin,
  goToEntityCardEntityExactFull,
} from "../utils/Utils";
import {
  safePromiseAll,
  waitForApiResponse,
  logOperation,
} from "../utils/PlaywrightTestHelpers";

test.beforeEach(async ({ page }) => {
  await ensureDefaultLogin(page);
  await changeToSpendFile(page, "Pagero_Small.xlsx (Ver. 1)");
});

test("Check discount-equivalent percentage @flakyResolved @tc-12933 - @us-12886", async ({ page }) => {
  logOperation("Starting discount-equivalent percentage check");
  
  const [valToCheck] = await safePromiseAll(
    [
      waitForApiResponse(
        page,
        "/chart/cashflow-or-savings-overview",
        15000,
        "Load cashflow or savings overview data"
      ),
      goToEntityCardEntityExactFull(page, "3M Company"),
    ],
    "Navigate to entity card and wait for API response"
  );
  
  const equivalentDiscount = await valToCheck.json();
  logOperation("Received API response", { 
    hasEquivalentDiscount: !!equivalentDiscount.equivalentDiscount 
  });
  
  const valueofEquivalentDiscount = equivalentDiscount.equivalentDiscount;
  
  // Validate that the value exists and is a valid number
  expect(valueofEquivalentDiscount).toBeDefined();
  expect(typeof valueofEquivalentDiscount).toBe("number");
  logOperation("Discount equivalent percentage validated", { 
    value: valueofEquivalentDiscount 
  });
});
