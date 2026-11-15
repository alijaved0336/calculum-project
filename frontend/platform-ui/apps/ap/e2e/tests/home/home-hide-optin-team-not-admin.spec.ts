// Created By Josh
// Test for Feature: 1898
import { test, expect } from "@playwright/test";
import { ensureDefaultLogin } from "../utils/Utils";


test.beforeEach(async ({ page }) => {
  
  await ensureDefaultLogin(page);
  await page.goto("/");
  await page.waitForSelector(".loading-modal", { state: "detached" });
});

test('Remove access to Manage Teams for "Not admins" @ui @auth @us-1919 @prq', async ({
  page,
}) => {
  expect(page.locator('button:has-text("Manage Users")')).toHaveCount(0);
});

test.afterEach(async ({ page }) => {
  await ensureDefaultLogin(page);
});
