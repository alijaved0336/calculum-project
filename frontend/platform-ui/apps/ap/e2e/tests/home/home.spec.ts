import { test, expect,Page,chromium, Browser } from '@playwright/test'
import {
  ensureDefaultLogin,
  changeToSpendFile
} from "../utils/Utils";
import Api2 from '../utils/APi2';
import { locators } from '../utils/locators';


const spendFileName = 'Pagero_Full_Home.xlsx (Ver. 1)'

test.describe.serial(
  "Home @ui @dmas",
  async () => {
    let page: Page;
    let browser: Browser;
    test.beforeAll(async() => {

      browser = await chromium.launch();
      page = await browser.newPage();
      
      await ensureDefaultLogin(page);
      await page.goto("/");
    })

    test.afterAll(async () => {
      await browser.close();
    });

    test('Cards Regarding Program is showing @ui', async() => {
      await changeToSpendFile(page, spendFileName);
      //Put a wait, because when change file is changed the api is called before inside the test
      await page.waitForTimeout(9000);

      // Persisted state.json (`ada-app`) can deep-link this user to
      // /home/analyze (Opportunity) instead of /home/home-dashboard, where
      // `.gauge-title` / `.home-title-section` do not exist. Force the
      // dashboard route before asserting tooltips.
      if (!page.url().includes("/home-dashboard")) {
        await page.locator(locators.sidebar.home).click();
        await page.waitForURL(/.*\/home\/home-dashboard/);
      }

      console.log("** all apis ended")

      /** Validate the sections are visible */
  
      await page.locator('h5:has-text("Payment Terms Progress (d)")')
      await page.locator('h5:has-text("Cash Flow Achieved")')
      await page.locator('h5:has-text("Numbers of Suppliers Negotiated")')
      await page.locator('h5:has-text("Recent Changes')   
      await page.locator('h5:has-text("Top Opportunities')       
      await page.locator('h5:has-text("Plan Summary')
      await page.locator('h5:has-text("Spend & Entities')
      await page.locator('h5:has-text("Recent Notifications")')
      await page.locator('h5:has-text("Recent Notes")')   


      /** Validate tooltips */

      /** start gauge titles */

      await expect
      .soft(
        page
          .locator(".gauge-title")
          .nth(0)          
          .getByTestId("tooltip-icon")
      )
      .toHaveAttribute(
        "data-original-title",
        "Shows the change in weighted average payment terms since the beginning of the process."
      );

      await expect
      .soft(
        page
          .locator(".gauge-title")
          .nth(1)          
          .getByTestId("tooltip-icon")
      )
      .toHaveAttribute(
        "data-original-title",
        "Shows the estimated change in cash flow given the changes in agreed payment terms since the beginning of the process."
      );

      await expect
      .soft(
        page
          .locator(".gauge-title")
          .nth(2)          
          .getByTestId("tooltip-icon")
      )
      .toHaveAttribute(
        "data-original-title",
        "Shows the number of suppliers that have agreed on new payment terms. (either increased or maintained)"
      );

      /** end gauge titles */

      await expect
      .soft(
        page
          .locator(".home-title-section")
          .nth(0)          
          .getByTestId("tooltip-icon")
      )
      .toHaveAttribute(
        "data-original-title",
        "Shows the most relevant progress of the plans by past, current and next phases."
      );

      await expect
      .soft(
        page
          .locator(".home-title-section")
          .nth(1)          
          .getByTestId("tooltip-icon")
      )
      .toHaveAttribute(
        "data-original-title",
        "The most relevant events will be shown in this space."
      );

      await expect
      .soft(
        page
          .locator(".home-title-section")
          .nth(2)          
          .getByTestId("tooltip-icon")
      )
      .toHaveAttribute(
        "data-original-title",
        "Shows in descending order the suppliers with the highest opportunity based on cash flow target amount."
      );

      await expect
      .soft(
        page
          .locator(".home-title-section")
          .nth(3)          
          .getByTestId("tooltip-icon")
      )
      .toHaveAttribute(
        "data-original-title",
        "Shows the most recent activity in terms of changes in supplier status."
      );

      await expect
      .soft(
        page
          .locator(".home-title-section")
          .nth(4)          
          .getByTestId("tooltip-icon")
      )
      .toHaveAttribute(
        "data-original-title",
        "When any user adds a note on any supplier card, it will be shown in this list."
      );
      
    })
})
