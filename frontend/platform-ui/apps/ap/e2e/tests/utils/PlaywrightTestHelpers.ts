/**
 * Playwright Test Helper Functions
 * 
 * This file contains reusable helper functions for Playwright tests
 * to improve reliability, error handling, and maintainability.
 * 
 * @fileoverview Reusable Playwright test utilities
 * @module PlaywrightTestHelpers
 */

import { Page } from "@playwright/test";

/**
 * Helper function to run Promise.all with robust error handling
 * @param promises - Array of promises to execute
 * @param operationName - Descriptive name of the operation for logging
 * @returns Promise that resolves with the Promise.all results
 * @throws Error with specific context if any promise fails
 */
export const safePromiseAll = async (promises: Promise<any>[], operationName: string) => {
  try {
    return await Promise.all(promises);
  } catch (error) {
    console.error(`Error in ${operationName}:`, error);
    throw new Error(`Failed to complete ${operationName}: ${error instanceof Error ? error.message : String(error)}`);
  }
};

/**
 * Helper function to verify that the page is active before critical operations
 * @param page - Playwright Page instance
 * @throws Error if the page has been closed
 */
export const ensurePageActive = async (page: Page) => {
  if (page.isClosed()) {
    console.log("Page was closed, test needs to be retried");
    throw new Error("Page was closed unexpectedly - test needs to be retried");
  }
  return true;
};

/**
 * Helper function to wait for an element to become visible with an appropriate timeout
 * @param page - Playwright Page instance
 * @param selector - Element selector
 * @param timeout - Timeout in milliseconds (default: 5000)
 * @param operationName - Name of the operation for logging
 */
export const waitForElementVisible = async (
  page: Page, 
  selector: string, 
  timeout: number = 5000,
  operationName: string = "element visibility check"
) => {
  try {
    const element = page.locator(selector).first();
    await element.waitFor({ state: 'visible', timeout });
    return element;
  } catch (error) {
    console.error(`Error waiting for element visibility in ${operationName}:`, error);
    throw new Error(`Element not visible within timeout: ${selector}`);
  }
};

/**
 * Helper function to wait for the network to become idle with an appropriate timeout
 * @param page - Playwright Page instance
 * @param timeout - Timeout in milliseconds (default: 3000)
 * @param operationName - Name of the operation for logging
 */
export const waitForNetworkIdle = async (
  page: Page, 
  timeout: number = 3000,
  operationName: string = "network idle wait"
) => {
  try {
    await page.waitForLoadState('networkidle', { timeout });
  } catch (error) {
    console.error(`Error waiting for network idle in ${operationName}:`, error);
    throw new Error(`Network did not become idle within timeout: ${timeout}ms`);
  }
};

/**
 * Helper function to wait for an element to be attached to the DOM
 * @param page - Playwright Page instance
 * @param selector - Element selector
 * @param timeout - Timeout in milliseconds (default: 5000)
 * @param operationName - Name of the operation for logging
 */
export const waitForElementAttached = async (
  page: Page, 
  selector: string, 
  timeout: number = 5000,
  operationName: string = "element attachment check"
) => {
  try {
    const element = page.locator(selector);
    await element.first().waitFor({ state: 'attached', timeout });
    return element;
  } catch (error) {
    console.error(`Error waiting for element attachment in ${operationName}:`, error);
    throw new Error(`Element not attached within timeout: ${selector}`);
  }
};

/**
 * Helper function to wait for API responses with a specific timeout.
 *
 * Matches responses by URL only — the HTTP status is NOT checked, so 4xx/5xx
 * responses will resolve this promise just like 2xx. This is intentional: it
 * surfaces the real response to the caller (aiding debugging) instead of
 * silently timing out when the server replies with an error. If the caller
 * needs to enforce a successful status, assert explicitly after awaiting:
 *   const response = await waitForApiResponse(page, url);
 *   expect(response.ok()).toBeTruthy();
 *
 * @param page - Playwright Page instance
 * @param urlPattern - URL pattern to wait for
 * @param timeout - Timeout in milliseconds (default: 5000)
 * @param operationName - Name of the operation for logging
 * @returns Promise that resolves with the response (of any status)
 */
export const waitForApiResponse = async (
  page: Page,
  urlPattern: string | RegExp,
  timeout: number = 5000,
  operationName: string = "API response wait"
) => {
  try {
    return await page.waitForResponse(
      (response) => {
        const url = response.url();
        const matches = typeof urlPattern === 'string'
          ? url.includes(urlPattern)
          : urlPattern.test(url);
        return matches;
      },
      { timeout }
    );
  } catch (error) {
    console.error(`Error waiting for API response in ${operationName}:`, error);
    throw new Error(`API response not received within timeout: ${urlPattern}`);
  }
};

/**
 * Helper function for critical operations with closed-page handling
 * @param page - Playwright Page instance
 * @param operation - Function containing the operation to execute
 * @param operationName - Descriptive name of the operation
 * @returns Result of the operation
 */
export const safeOperation = async (
  page: Page,
  operation: () => Promise<any>, 
  operationName: string
) => {
  try {
    await ensurePageActive(page);
    return await operation();
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (errorMessage.includes("Target page, context or browser has been closed") || 
        errorMessage.includes("Page was closed unexpectedly")) {
      console.log(`Page closed during ${operationName}, test needs retry`);
      throw new Error(`Page closed during ${operationName} - test needs retry`);
    }
    throw error;
  }
};

/**
 * Helper function to wait for multiple API responses simultaneously.
 *
 * Matches responses by URL only — HTTP status is NOT checked, matching the
 * behavior of {@link waitForApiResponse}. Callers that need to enforce a
 * successful status should assert `response.ok()` explicitly on each
 * returned response.
 *
 * @param page - Playwright Page instance
 * @param urlPatterns - Array of URL patterns to wait for
 * @param timeout - Timeout in milliseconds (default: 10000)
 * @param operationName - Name of the operation for logging
 * @returns Array of responses in the same order as the patterns
 */
export const waitForMultipleApiResponses = async (
  page: Page,
  urlPatterns: (string | RegExp)[],
  timeout: number = 10000,
  operationName: string = "multiple API responses wait"
) => {
  try {
    const promises = urlPatterns.map(pattern =>
      page.waitForResponse(
        (response) => {
          const url = response.url();
          const matches = typeof pattern === 'string'
            ? url.includes(pattern)
            : pattern.test(url);
          return matches;
        },
        { timeout }
      )
    );
    return await Promise.all(promises);
  } catch (error) {
    console.error(`Error waiting for multiple API responses in ${operationName}:`, error);
    throw new Error(`API responses not received within timeout: ${urlPatterns.join(', ')}`);
  }
};

/**
 * Helper function to check the visibility of multiple elements
 * @param page - Playwright Page instance
 * @param selectors - Array of selectors to check
 * @param timeout - Timeout in milliseconds (default: 5000)
 * @param operationName - Name of the operation for logging
 */
export const checkMultipleElementsVisible = async (
  page: Page,
  selectors: string[],
  timeout: number = 5000,
  operationName: string = "multiple elements visibility check"
) => {
  try {
    const promises = selectors.map(selector => 
      page.locator(selector).waitFor({ state: 'visible', timeout })
    );
    await Promise.all(promises);
  } catch (error) {
    console.error(`Error checking multiple elements visibility in ${operationName}:`, error);
    throw new Error(`Not all elements visible within timeout: ${selectors.join(', ')}`);
  }
};

/**
 * Helper function to retry operations with exponential backoff
 * @param operation - Function to execute
 * @param maxRetries - Maximum number of retries (default: 3)
 * @param baseDelay - Base delay in milliseconds (default: 1000)
 * @param operationName - Name of the operation for logging
 * @returns Result of the operation
 */
export const retryOperation = async (
  operation: () => Promise<any>,
  maxRetries: number = 3,
  baseDelay: number = 1000,
  operationName: string = "retry operation"
) => {
  let lastError: Error;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      console.log(`Attempt ${attempt}/${maxRetries} failed for ${operationName}:`, lastError.message);
      
      if (attempt === maxRetries) {
        throw lastError;
      }
      
      const delay = baseDelay * Math.pow(2, attempt - 1);
      console.log(`Retrying ${operationName} in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError!;
};

/**
 * Helper function for structured operation logging
 * @param operationName - Name of the operation
 * @param details - Additional details for logging
 */
export const logOperation = (operationName: string, details?: any) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${operationName}`, details ? JSON.stringify(details, null, 2) : '');
};

/**
 * Helper function to measure the execution time of operations
 * @param operation - Function to execute
 * @param operationName - Name of the operation for logging
 * @returns Object containing the result and the execution time
 */
export const measureOperation = async (
  operation: () => Promise<any>,
  operationName: string = "operation"
) => {
  const startTime = Date.now();
  try {
    const result = await operation();
    const duration = Date.now() - startTime;
    console.log(`${operationName} completed in ${duration}ms`);
    return { result, duration };
  } catch (error) {
    const duration = Date.now() - startTime;
    console.log(`${operationName} failed after ${duration}ms`);
    throw error;
  }
};

/**
 * Helper function to wait for any recalculation process to complete.
 * Checks whether the recalculation indicator exists and waits for it to be hidden.
 * @param page - Playwright Page instance
 * @param timeout - Timeout in milliseconds to wait for the element to be hidden (default: 30000)
 * @param selector - Selector of the recalculation element (default: "span.recalculating-in-progress")
 * @returns Promise that resolves when the recalculation is complete or no indicator is found
 */
export const waitForRecalculation = async (
  page: Page,
  timeout: number = 30000,
  selector: string = "span.recalculating-in-progress"
): Promise<boolean> => {
  try {
    const recalculatingElement = page.locator(selector);
    const elementCount = await recalculatingElement.count();
let result=true;
    if (elementCount > 0) {
      logOperation("Recalculating indicator found, waiting for completion");
      // Wait for the element to be hidden with a reasonable timeout
      await recalculatingElement.first().waitFor({
        state: "hidden",
        timeout,
      });
      logOperation("Recalculation completed");
    } else {
      logOperation("No recalculating indicator found, continuing");
    }
    return result;
  } catch (error) {
    // If recalculating element is not found or doesn't appear, continue
    logOperation(
      "No recalculating indicator found or timeout, continuing",
      {
        error: error instanceof Error ? error.message : String(error),
      }
    );
    return false;
    // No rethrow - we continue even if recalculation indicator doesn't appear
  }
};