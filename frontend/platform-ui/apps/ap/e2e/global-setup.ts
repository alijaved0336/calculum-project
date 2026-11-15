import { chromium, FullConfig, test } from "@playwright/test";
import dotenv from "dotenv";
import path from "path";
import { b64DecodeUnicode } from "./tests/utils/Utils";
import Api2 from "./tests/utils/APi2";
import config from "../playwright.config";
import { time } from "console";

async function globalSetup(fullConfig: FullConfig): Promise<void> {
  if (process.env.test_env) {
    dotenv.config({
      path: path.relative(
        process.cwd(),
        path.join(__dirname, `.env.${process.env.test_env}`)
      ),
      override: true
    });
  } else {
    dotenv.config({
      path: path.relative(process.cwd(), path.join(__dirname, ".env.dev")),
      override: true
    });
  }

  config.timeout = Number(process.env.E2E_CUSTOM_TIME_OUT ?? 300000);

  const { storageState } = fullConfig.projects[0].use;

  const baseURL: string = process.env.E2E_BASE_URL ?? "-<None Base URL>-"; // password decode 64 IF NEEDED

  process.env.E2E_AUTH_PASSWORD_SINGLE = process.env.E2E_AUTH_PASSWORD_SINGLE!.endsWith(
    "="
  )
    ? b64DecodeUnicode(process.env.E2E_AUTH_PASSWORD_SINGLE!)
    : process.env.E2E_AUTH_PASSWORD_SINGLE;
  process.env.E2E_AUTH_PASSWORD_ADMIN = process.env.E2E_AUTH_PASSWORD_ADMIN!.endsWith(
    "="
  )
    ? b64DecodeUnicode(process.env.E2E_AUTH_PASSWORD_ADMIN!)
    : process.env.E2E_AUTH_PASSWORD_ADMIN;
  process.env.E2E_AUTH_PASSWORD_SUPER_ADMIN = process.env.E2E_AUTH_PASSWORD_SUPER_ADMIN!.endsWith(
    "="
  )
    ? b64DecodeUnicode(process.env.E2E_AUTH_PASSWORD_SUPER_ADMIN!)
    : process.env.E2E_AUTH_PASSWORD_SUPER_ADMIN;

  Api2.printHeader("Environment Summary");
  console.log("Base URL               : ", process.env.E2E_BASE_URL);
  console.log("Base URL(API)          : ", process.env.E2E_BASE_URL_API);
  console.log("USERNAME_SINGLE        : ",process.env.E2E_AUTH_USERNAME_SINGLE);
  console.log("       PASSWORD        : ",process.env.E2E_AUTH_PASSWORD_SINGLE);
  console.log("USERNAME_ADMIN         : ", process.env.E2E_AUTH_USERNAME_ADMIN);
  console.log("      PASSWORD         : ", process.env.E2E_AUTH_PASSWORD_ADMIN);
  console.log("USERNAME_ADMIN(Excep#1): ", process.env.E2E_AUTH_USERNAME_EXCEPTION1);
  console.log("      PASSWORD(Excep#1): ", process.env.E2E_AUTH_PASSWORD_EXCEPTION1);
  console.log("USERNAME_SUPER_ADMIN   : ", process.env.E2E_AUTH_USERNAME_SUPER_ADMIN);
  console.log("           PASSWORD    : ", process.env.E2E_AUTH_PASSWORD_SUPER_ADMIN);
  Api2.printFooter();

  const browser = await chromium.launch(/*{ headless: false }*/);
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    await context.tracing.start({ screenshots: true, snapshots: true }); // Storing for Api Rebuild // process.env.E2E_AUTH_CURRENT_USER_EMAIL = process.env.E2E_AUTH_USERNAME_ADMIN! // process.env.E2E_AUTH_CURRENT_USER_PASSWORD = process.env.E2E_AUTH_PASSWORD_ADMIN!

    await tryLogin();
  } catch (firstError) {
    console.log("!!! Exception in Global Setup, will try again...");
    console.log("    First attempt error:", (firstError as Error)?.message ?? firstError);

    // Stop tracing before retry (context is still open)
    try {
      await context.tracing.stop({
        path: "./test-results/failed-setup-trace.zip"
      });
    } catch (tracingError) {
      console.log("Could not stop tracing:", tracingError);
    }

    console.log("!!! waiting 30 seconds to try again...");
    await new Promise(resolve => setTimeout(resolve, 30000));

    // First attempt is swallowed on purpose to ride out transient auth flakiness.
    // The retry is NOT swallowed: if it also fails we clean up and re-throw so Playwright aborts the run.
    try {
      await tryLogin();
    } catch (retryError) {
      console.log("!!! Retry also failed, aborting global setup.");
      console.log("    Retry error:", (retryError as Error)?.message ?? retryError);
      try {
        await browser.close();
      } catch {
        // browser may already be closed by tryLogin's happy path — ignore
      }
      throw retryError;
    }
  }

  async function tryLogin() {
    process.env.E2E_AUTH_CURRENT_USER_EMAIL = process.env.E2E_AUTH_USERNAME_SINGLE!;
    process.env.E2E_AUTH_CURRENT_USER_PASSWORD = process.env.E2E_AUTH_PASSWORD_SINGLE!; // Authenticate

    console.log("Openning Browser to authenticate...");

    await page.goto(baseURL);

    await page.fill(
      'input[name="Email Address"]',
      process.env.E2E_AUTH_CURRENT_USER_EMAIL,
      { timeout: 60000 }
    );

    await page.fill(
      'input[id="password"]',
      process.env.E2E_AUTH_CURRENT_USER_PASSWORD
    );
    const api = await Api2.getInstance(page);

    console.log("authenticating...?");
    await Promise.all([
      api.processAuthenticationEventFromBrowser(page, true),
      page.click('button[id="next"]')
    ]);

    console.log("GlobalSetup authenticate successfully.");
    console.log("Saving State....");

    await page.context().storageState({ path: storageState as string });

    console.log("State saved.");
    console.log("Closing Browser...");

    //Add small time to be sure all the flags are set correctly
    await page.waitForTimeout(5000);


    await browser.close();
    console.log("Browser closed.");
  }
}

export default globalSetup;
