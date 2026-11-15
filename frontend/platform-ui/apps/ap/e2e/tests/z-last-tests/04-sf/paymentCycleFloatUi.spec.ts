/**
 * TC10356 Payment Term Float is working on Company Test
 * TC10358 Payment Term Float is working on Company_SF
 */

/**
 * @company = "Company_SF".

    @Spendfile = "Pagero_Vcard.xlsx" //Already existent, and additionally attached here.

    @program = "Main Program." //Created by default.

@user = "user-test@softwaresinlimite.comi"

    @entity = "Axtone S.A."
 *
 *
 */

const spendFileName = "Pagero_VCard.xlsx (Ver. 1)";

import { test, expect,chromium,Page, Browser } from "@playwright/test";
import {
  changeToSpendFile,
  goToEntityCardEntityExactFull,
  ensureDefaultLogin,
  ensureCompany_SFLogin,
} from "../../utils/Utils";
import { locators } from "../../utils/locators";
import {
  waitForElementVisible,
  safePromiseAll,
  safeOperation,
  logOperation,
  ensurePageActive,
  waitForApiResponse,
} from "../../utils/PlaywrightTestHelpers";

test.describe.serial("Payment Term Float is working both company and Entity levels", () => {
  let page: Page;
  let browser: Browser;
    test.beforeAll(async () => {
      logOperation("Setting up test - launching browser and logging in");
      // Open new page
      browser = await chromium.launch();
      page = await browser.newPage();

      await safeOperation(page, async () => {
        await ensurePageActive(page);
        logOperation("Performing Company_SF login");
        await ensureCompany_SFLogin(page);
      }, "Company_SF login");

      await safeOperation(page, async () => {
        await ensurePageActive(page);
        logOperation("Changing to spend file", { spendFileName });
        await changeToSpendFile(page, spendFileName);
      }, "Change to spend file");
  });

  test("Payment Term Float is working on Company", async () => {
    test.setTimeout(30000); // 30 seconds timeout for this test
    logOperation("Starting Payment Term Float test on Company level");

    await safeOperation(page, async () => {
      // go to programs
      await ensurePageActive(page);
      logOperation("Navigating to programs section");
      
      // Wait for sidebar program element to be visible before clicking
      const programElement = await waitForElementVisible(
        page,
        locators.sidebar.program,
        5000,
        "Program sidebar element"
      );
      await programElement.click();
      
      // Wait for the payment terms card to be visible.
      // Web-first assertion auto-retries until the Program Overview route mounts
      // (navigation after a spend-file switch can take >5s in CI). Role-based
      // locator is resilient to CSS/class refactors; level:5 == <h5>.
      logOperation("Waiting for Payment Terms card");
      await expect(
        page.getByRole("heading", { name: "Payment Terms (days)", level: 5 })
      ).toBeVisible({ timeout: 20000 });
    }, "Navigate to programs section");

    let firstCardPaymentTerms = await page
      .locator(
        'div.card-body >> h5:has-text("Payment Terms (days)")',
      )
      .count();
    logOperation("Payment Terms card count", { count: firstCardPaymentTerms });

    if (firstCardPaymentTerms <= 0) {
      await safeOperation(page, async () => {
        await ensurePageActive(page);
        logOperation("Clicking SHOW button to expand card");
        
        // Wait for SHOW button to be visible before clicking
        const showButton = await waitForElementVisible(
          page,
          'button:has-text("SHOW")',
          5000,
          "SHOW button visibility"
        );
        await showButton.first().click();
        
        // Wait for the payment terms to appear after clicking SHOW
        await waitForElementVisible(
          page,
          'div.card-body >> h5:has-text("Payment Terms (days)")',
          5000,
          "Payment Terms card after SHOW click"
        );
      }, "Click SHOW button");
    }

    await safeOperation(page, async () => {
      await ensurePageActive(page);
      logOperation("Reading Payment Float text and value");
      
      // Wait for Payment Float text element
      const floatText = await waitForElementVisible(
        page,
        'span.payment-float:has-text("Payment Float")',
        10000,
        "Payment Float text"
      );
      
      // Wait for Payment Float value element (without specifying the value)
      const floatValue = await waitForElementVisible(
        page,
        'span.payment-float-value',
        10000,
        "Payment Float value"
      );
      
      const floatTextContent = await floatText.innerText();
      const floatValueContent = await floatValue.innerText();
      
      logOperation("Payment Float values retrieved", {
        text: floatTextContent,
        value: floatValueContent,
      });
      
      // Validate that Payment Float value exists and is a number
      expect(floatValueContent).toBeDefined();
      expect(floatValueContent).not.toBeNull();
      expect(floatValueContent.trim()).not.toBe("");
      
      // Validate that the value is numeric (contains digits)
      const numericValue = floatValueContent.match(/\d+/);
      expect(numericValue).not.toBeNull();
      logOperation("Payment Float value validation passed", {
        value: floatValueContent,
        numericValue: numericValue ? numericValue[0] : null
      });
    }, "Retrieve Payment Float values");
  });

  test("Payment Term Float is working on Axtone S.A.", async () => {
    test.setTimeout(30000); // 30 seconds timeout for this test
    let companyName = "Axtone S.A.";
    logOperation("Starting Payment Term Float test for entity", { companyName });

    await safeOperation(page, async () => {
      await ensurePageActive(page);
      logOperation("Navigating to entity card and waiting for API response", { companyName });
      
      await safePromiseAll([
        waitForApiResponse(page, /\/api\/entity-card\/entity\/.*\/all/, 30000, "Entity card API response"), // Increased timeout to 30 seconds
        goToEntityCardEntityExactFull(page, companyName),
      ], "Navigate to entity card and wait for response");
      
      logOperation("Entity card navigation completed", { companyName });
    }, "Navigate to entity card");

    await safeOperation(page, async () => {
      await ensurePageActive(page);
      logOperation("Reading Payment Float text and value for entity");
      
      // Increased timeout to allow page to fully load after navigation
      const floatText = await waitForElementVisible(
        page,
        'span.payment-float:has-text("Payment Float")',
        10000,
        "Payment Float text for entity"
      );
      const floatValue = await waitForElementVisible(
        page,
        'span.payment-float-value:has-text("25")',
        10000,
        "Payment Float value for entity"
      );
      
      const floatTextContent = await floatText.innerText();
      const floatValueContent = await floatValue.innerText();
      
      logOperation("Payment Float values retrieved for entity", {
        companyName,
        text: floatTextContent,
        value: floatValueContent,
      });
    }, "Retrieve Payment Float values for entity");
  });

  test.afterAll(async () => {
    test.setTimeout(30000); // 30 seconds timeout for cleanup
    logOperation("Cleaning up test - restoring default login");
    
    try {
      // Restore default login with timeout wrapper
      await Promise.race([
        safeOperation(page, async () => {
          if (page && !page.isClosed()) {
            await ensurePageActive(page);
            await ensureDefaultLogin(page);
          }
        }, "Restore default login"),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error("Cleanup timeout")), 60000)
        )
      ]).catch((error) => {
        logOperation("Cleanup timeout or error (non-critical)", { 
          error: error instanceof Error ? error.message : String(error) 
        });
      });
    } catch (error) {
      logOperation("Error during cleanup (non-critical)", { 
        error: error instanceof Error ? error.message : String(error) 
      });
    }
    
    // Close page first - ensure it's closed before closing browser
    try {
      if (page && !page.isClosed()) {
        await page.close().catch(() => {
          logOperation("Page close error, forcing close");
        });
        logOperation("Page closed successfully");
      } else {
        logOperation("Page is already closed");
      }
    } catch (error) {
      logOperation("Error closing page (non-critical)", { 
        error: error instanceof Error ? error.message : String(error) 
      });
    }
    
    // Close all browser contexts to ensure browser closes
    try {
      if (browser && browser.isConnected()) {
        const contexts = browser.contexts();
        logOperation(`Closing ${contexts.length} browser contexts`);
        for (const context of contexts) {
          try {
            await context.close();
          } catch (error) {
            logOperation("Error closing context (non-critical)", { 
              error: error instanceof Error ? error.message : String(error) 
            });
          }
        }
        // Close browser after all contexts are closed
        await browser.close();
        logOperation("Browser closed successfully");
      } else {
        logOperation("Browser is already closed or not connected");
      }
    } catch (error) {
      logOperation("Error closing browser (non-critical)", { 
        error: error instanceof Error ? error.message : String(error) 
      });
    }
    
    logOperation("***Finished***");
  });
});