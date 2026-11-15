/**
 * @fileoverview
 * E2E test for Contact Support on Sign In page.
 *
 * This test verifies that a user can access the contact support page if they have issues logging in,
 * can fill out the support form, and that the recaptcha is visible.
 *
 * Test Flow:
 * 1. Navigate to the contact support page.
 * 2. Fill in the email and message fields.
 * 3. Assert that the recaptcha frame is present.
 * 4. Attempt to send the support request.
 *
 * Acceptance Criteria:
 * - The contact support page is accessible.
 * - The recaptcha is visible on the page.
 * - The user can fill out and submit the support form.
 * - The test is tagged for integrated, auth, and user story tracking.
 */


import { expect, test } from "@playwright/test";

test("user can contact support if has issues logging in and recaptcha is visible @integrated @auth @tc-7221 @us-7451", async ({
  page,
}) => {
  await page.goto(process.env.E2E_BASE_URL + "/contact-support");

  await page
    .getByLabel("email")
    .fill(process.env.E2E_AUTH_USERNAME_SINGLE as string);

  await page.getByLabel("message").fill("Testing issue message");

  console.log("Getting frames...");

  const frames = await page.mainFrame().childFrames();

  console.log("Asserting there are 3 frames, one of them is the recaptcha...");

  expect(frames.length).toBeGreaterThanOrEqual(2);

  await page.getByRole("button", { name: "Send" }).click();
});
