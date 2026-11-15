import { Locator, Page, Response, expect } from "@playwright/test";

import { goToPlanSection } from "../../utils/Utils";
import { StringUtils, isNullOrUndefined } from "../../utils";

/**
 *
 * Go to program and click on edit or show
 *
 * @param page

* TODO Update action type to be "show" | "edit"
 */
export async function goToPlanNameAndAction(
  page: Page,
  options?: Partial<{
    name: string;
    action: "show" | "edit";
  }>
) {
  // Set default options
  const { action = "show", name = "" } = options || {};

  let response: Response | null = null;

  console.log(
    `Going to ${
      StringUtils.isEmpty(name) ? "first" : name
    } plan with action:'${action}'...`
  );

  // If not in plan section, go to plan section
  response = await goToPlanSection(page);

  const result = await response.json();

  // console.log("goToPlan response : ", await response.json());

  if (
    !isNullOrUndefined(result["hydra:member"]) &&
    result["hydra:member"].length === 0
  ) {
    console.log("No plans found for the selected program");

    return null;
  } else if (result["hydra:member"].length === 1) {
    console.log("Only one plan found for the selected program");

    return response;
  }

  let cardLoc: Locator;

  // If no name is provided, select first program
  if (!name) {
    cardLoc = page.locator(".card-v2").first();
  }
  // Name provided
  else {
    // Use exact match for name
    cardLoc = page.locator(".card-v2").filter({
      has: page.locator("span").getByText(name, { exact: true })
    });

    // If there are multiple cards with similar name then select the first
    if ((await cardLoc.count()) > 1) {
      cardLoc = cardLoc.first();
    }
  }

  //
  // Show
  //
  if (action === "show") {
    [response] = await Promise.all([
      page.waitForResponse(
        response => response.url().includes("/plans") && response.ok()
      ),
      page.waitForResponse(
        response => response.url().endsWith("/plan_phases") && response.ok()
      ),
      page.waitForResponse(
        response =>
          response.url().endsWith("/api/plan/summary") && response.ok()
      ),
      cardLoc.getByRole("button", { name: "Show" }).click()
    ]);
    await page.waitForTimeout(5000);
    return response;
  }
  //
  // Edit
  //
  else if (action === "edit") {
    // Go to program Edit page and wait for APIs
    [response] = await Promise.all([
      page.waitForResponse(
        response =>
          response.url().endsWith("/analyze_programs") && response.ok()
      ),
      page.waitForResponse(
        response => response.url().includes("/plans") && response.ok()
      ),
      page.waitForResponse(
        response =>
          response.url().endsWith("/analyze/programs/potentials-cost") &&
          response.ok()
      ),
      cardLoc.getByRole("button", { name: "Edit" }).click() // Click on edit button
    ]);

    // Assert user is Program Edit page
    await expect(page).toHaveURL(/.*\/analyze\/step\/4/);

    console.log(
      `Successfully moved to ${
        StringUtils.isEmpty(name) ? "first" : name
      } plan with action:'${action}'...!`
    );

    return response;
  }

  console.log("Error: Action not supported");

  return null;
}

/**
 * Go to Plan tab given its name
 * @param page {Page}
 * @param params {tabName: string}
 */
export async function goToPlanTab(page: Page, params?: { tabName: string }) {
  // Set default tab name
  const { tabName = "" } = params || {};

  console.log("Going to tab...");

  // Click on tab
  await page
    .getByText(tabName, {
      exact: true
    })
    .click();

  console.log("Successfully in " + tabName + " tab!");
}
