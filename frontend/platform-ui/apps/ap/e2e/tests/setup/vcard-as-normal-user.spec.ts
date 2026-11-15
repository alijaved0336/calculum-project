/**
 * Normal users doesn't see Setup button
 */

import { expect, test } from "@playwright/test";
import { locators } from "../utils/locators";
// Global utils
import {
  ensureDefaultLogin,
  logout,
  } from "../utils/Utils";

test.beforeEach(async ({ page }) => {
  
  await ensureDefaultLogin(page);

});

test("Normal user does not see Setup button @global @ui @settings @vcards @us-9653", async ({ page }) => {

  await expect(page.locator(locators.sidebar.settings)).toBeHidden();  

});

