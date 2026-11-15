// Created By Oviedo
// Test for Feature: 18984
import { test, expect, Page } from "@playwright/test";

import {
  ensureDefaultLogin,
  generateRandomString,
  loginAsSuperAdmin,
  goToHomeSection
} from "../../utils/Utils";

import { locators } from "../../utils/locators";

const nameRelease = "Test Realease " + generateRandomString(6);

import Api2 from "../../utils/APi2";

test.beforeEach(async ({ page }) => {
  
  await ensureDefaultLogin(page);
  await page.goto("/");
});

test("Preferences > Release > New Release @us-2062 @admin @integrated @heavy", async ({
  page
}) => {
  await createRelease(page);
  await verifyRelease(page);
});

async function createRelease(page: Page) {
  await loginAsSuperAdmin(page);

  await goToHomeSection(page);
  
  await page.locator(locators.headerMenu.topMenu.dropDownMenu).click();
  await page.locator(locators.headerMenu.topMenu.adminConsole).click();

  

  await expect(page).toHaveURL(/.*\/admin\/create_company/);
  await page.locator("text=Release").click();

  await page.locator('button:has-text("+ Add New")').click();

  await page.locator('input[name="releaseDate"]').fill("2023-01-10");

  await page
    .locator('input[type="text"]')
    .first()
    .fill("https://www.loom.com/embed/94f0baf95efa40749afda11ac8f4c509");

  await page
    .locator('input[type="text"]')
    .nth(1)
    .type(`${nameRelease}`);

  await page.waitForTimeout(2000);

  console.log("Saving realease");
  await Promise.all([
    page.waitForResponse(
      response =>
        response.url().includes("/api/media_contents?category=release") &&
        response.ok()
    ),
    page.locator('button:has-text("Save")').click()
  ]);
  console.log("Realease saved");
  console.log("Publish realease");
  await Promise.all([
    page.waitForResponse(
      response =>
        response.url().includes("/api/media_contents?category=release") &&
        response.ok()
    ),
    page.locator("text=Publish /").click()
  ]);

  console.log("Published realease");
}

async function verifyRelease(page: Page) {
  console.log("Verify realease: ", nameRelease);
  await ensureDefaultLogin(page);
  await page.goto("/");
  await expect(page).toHaveURL(/.*\/home\/home-dashboard/);
  await page.waitForSelector(".loading-modal", { state: "detached" });
  // Click button:has-text("Preferences")
  await page.locator('button:has-text("Preferences")').click();
  // Click text=Releases
  await Promise.all([
    page.waitForResponse(
      response =>
        response
          .url()
          .includes(
            "/api/media_contents?isVisible=true&isPublished=true&section=release"
          ) && response.ok()
    ),
    page.locator("text=Releases").click()
  ]);
  await expect(page).toHaveURL(/.*\/home\/videos\/release/);
  await expect(page.locator(`text=${nameRelease}`)).toHaveCount(1);
}

test.afterEach(async ({ page }) => {
  console.log("Delete realease: ", nameRelease);
  await loginAsSuperAdmin(page);
  await page.locator("text=Release").click();
  await Promise.all([
    page.waitForResponse(
      response =>
        response.url().includes("/api/media_contents") &&
        response.status() === 204
    ),
    page.locator('span:has-text("Delete") >> nth=0').click()
  ]);
  await ensureDefaultLogin(page);
});
