/**
 * @fileoverview
 * Component assertion utilities for E2E tests.
 *
 * This file provides helper functions to assert the correct rendering and values
 * of UI components such as BigNumberTwoCols and BigNumberThreeCols in Playwright tests.
 *
 * These utilities are used across E2E test suites to ensure consistency and reduce duplication
 * when verifying card components in the application's UI.
 */


import { Page, expect } from "@playwright/test";
import { BigNumberTwoCols, BigNumberThreeCols } from "../types";

/**
 * Assert Big Number Two Cols component is showing properly
 */
export async function assertBigNumberTwoColsIsShowingProperly(
  page: Page,
  expected: Partial<BigNumberTwoCols>,
) {
  // Set default values
  const {
    cardTitle = "",
    bigNumberTitle = "",
    bigNumberValue = "",
    numberLeftTitle = "",
    numberLeftValue = "",
    numberRightTitle = "",
    numberRightValue = "",
  } = expected || {};

  // Card Locator
  const cardLoc = page.locator(".card").filter({
    has: page.getByRole("heading", { name: cardTitle }),
  });

  // Assert card title
  await expect(
    page.locator(".card").getByRole("heading", { name: cardTitle }),
  ).toBeVisible();

  // Assert big number title
  if (bigNumberTitle !== "") {
    await expect.soft(cardLoc.locator("h5")).toHaveText(bigNumberTitle);
  }

  // Assert big number value
  if (bigNumberValue !== "") {
    await expect
      .soft(
        page
          .locator(".card")
          .filter({
            has: page.getByRole("heading", { name: expected.cardTitle }),
          })
          .locator(".row") //#container-main-id > div.sub-main-sections > div:nth-child(1) > div:nth-child(2) > div > div > div:nth-child(1) > div > h5
          .nth(1)
          .locator("p")
          .nth(1),
      )
      .toHaveText(bigNumberValue);
  }

  // Assert number left title
  if (numberLeftTitle !== "") {
    await expect
      .soft(cardLoc.locator(".col-xl-6").first().locator(".col-12").first())
      .toHaveText(numberLeftTitle);
  }

  // Assert number left value
  if (numberLeftValue !== "") {
    await expect
      .soft(cardLoc.locator(".col-xl-6").first().locator(".col-12").nth(1))
      .toHaveText(numberLeftValue);
  }

  // Assert number right title
  if (numberRightTitle !== "") {
    await expect
      .soft(cardLoc.locator(".col-xl-6").nth(1).locator(".col-12").first())
      .toHaveText(numberRightTitle);
  }

  // Assert number right value
  if (numberRightValue !== "") {
    await expect
      .soft(
        cardLoc
          .locator(".row")
          .filter({ has: page.locator(".col-xl-6") })
          .locator(".col-xl-6")
          .nth(1)
          .locator(".col-12")
          .nth(1),
      )
      .toHaveText(numberRightValue);
  }
}

/**
 * Assert Big Number Three Cols component is showing properly
 */
export async function assertBigNumberThreeColsIsShowingProperly(
  page: Page,
  expected: Partial<BigNumberThreeCols>,
) {
  // Set default values
  const {
    cardTitle = "",
    bigNumberTitle = "",
    bigNumberValue = "",
    numberLeftTitle = "",
    numberLeftValue = "",
    numberCenterTitle = "",
    numberCenterValue = "",
    numberRightTitle = "",
    numberRightValue = "",
  } = expected || {};

  // Card Locator
  const cardLoc = page.locator(".card").filter({
    has: page.getByRole("heading", { name: cardTitle }),
  });

  // Assert card title
  await expect(
    page.locator(".card").getByRole("heading", { name: cardTitle }),
  ).toBeVisible();

  // Assert big number title
  if (bigNumberTitle !== "") {
    await expect
      .soft(cardLoc.locator(".row").nth(1).locator("p").first())
      .toHaveText(bigNumberTitle);
  }

  // Assert big number value. The value is the `text-5xl` span next to the
  // title paragraph, not a second <p>: the row holds exactly one <p> (the
  // title), so the old `p` nth(1) locator resolved to nothing and the soft
  // assertion reported a missing element for every caller.
  if (bigNumberValue !== "") {
    await expect
      .soft(cardLoc.locator(".row").nth(1).locator("span.text-5xl"))
      .toHaveText(bigNumberValue);
  }

  // Assert number left title
  if (numberLeftTitle !== "") {
    await expect
      .soft(cardLoc.locator(".col-xl-4").first().locator(".col-12").first())
      .toHaveText(numberLeftTitle);
  }

  // Assert number left value
  if (numberLeftValue !== "") {
    await expect
      .soft(cardLoc.locator(".col-xl-4").first().locator(".col-12").nth(1))
      .toHaveText(numberLeftValue);
  }

  // Assert number center title
  if (numberCenterTitle !== "") {
    await expect
      .soft(cardLoc.locator(".col-xl-4").nth(1).locator(".col-12").first())
      .toHaveText(numberCenterTitle);
  }

  // Assert number center value
  if (numberCenterValue !== "") {
    await expect
      .soft(cardLoc.locator(".col-xl-4").nth(1).locator(".col-12").nth(1))
      .toHaveText(numberCenterValue);
  }

  // Assert number right title
  if (numberRightTitle !== "") {
    await expect
      .soft(cardLoc.locator(".col-xl-4").nth(2).locator(".col-12").first())
      .toHaveText(numberRightTitle);
  }

  // Assert number right value
  if (numberRightValue !== "") {
    await expect
      .soft(
        cardLoc
          .locator(".row")
          .filter({ has: page.locator(".col-xl-4") })
          .locator(".col-xl-4")
          .nth(2)
          .locator(".col-12")
          .nth(1),
      )
      .toHaveText(numberRightValue);
  }
}
