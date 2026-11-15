import test, { BrowserContext, Page, expect } from "@playwright/test";
import {
  changeToSpendFile,
  ensureCompany_SFSuperAdminLogin,
  ensureDefaultLogin,
} from "../utils/Utils";
import { locators } from "../utils/locators";
import { StringUtils } from "../utils";

const given = {
  company: "Company_SF",
  spendfile: "Pagero_ExclusionGroups.xlsx (Ver. 1)", //Already existent, and additionally attached here.
  program: "Main Program.", //Created by default.
  user: "sergio+comany_sf_superadmin@calculum.ai",
  shares: [
    "joel+testnotadmin-1@calculum.ai",
    "sergio+comany_sf_superadmin@calculum.ai",
  ],
};

test.describe
  .serial("Value proposition(VP) CRUD @us-11736 @tc-11802", async () => {
  let page: Page;
  let context: BrowserContext;

  const apiListVP = "/api/value_propositions?spendFileVersion.uuid=";
  let createdVPId: string;
  test.beforeAll(async ({ browser }) => {
    context = await browser.newContext();
    page = await context.newPage();
    await ensureCompany_SFSuperAdminLogin(page);
    await changeToSpendFile(page, given.spendfile);
    await page.waitForSelector(".loading-modal", { state: "detached" });
  });
  test("Resolving address VP @tc-11802", async () => {
    await page.locator(locators.headerMenu.topMenu.userMenu).click();
    //Go to VP
    console.log("Navigating to Value Proposition...");
    await Promise.all([
      page.waitForResponse((res) => res.url().includes(apiListVP) && res.ok()),
      page.locator(locators.headerMenu.topMenu.valueProposition).click(),
    ]);
  });
  test("Creating VP @tc-11802", async () => {
    const btnAdd = page.locator("#add-button-for-value-proposition");
    console.log("creating VP");
    // Block popups by closing any new page
    context.on("page", async (popup) => {
      await popup.close();
    });
    const [createResponse] = await Promise.all([
      page.waitForResponse((res) =>
        res.url().endsWith("/api/value_propositions"),
      ),
      btnAdd.click(),
    ]);
    expect(createResponse.ok()).toBeTruthy();
    await page.bringToFront();
    const responseBody = await createResponse.json();
    console.log(`VP creation response received`);
    if (responseBody) {
      const createdVPIdFull = responseBody["@id"];
      createdVPId = StringUtils.removeIRI(createdVPIdFull);
      console.log(`VP created with UUID: ${createdVPId}`);
    }
  });
  test("Sharing VP @tc-11802", async () => {
    const btnDots = page.locator(`#myid-${createdVPId}`);
    await btnDots.click();
    const shareWithBtn = page.locator(".fa-share + span", {
      hasText: "Share with",
    });
    await shareWithBtn.click();
    await page.waitForTimeout(1000);
    const switchToPublicBtn = page.locator("button", {
      hasText: "Yes, Switch to Public Mode",
    });
    const shareList =
      "api/invitation_value_propositions?valueProposition.uuid=";
    await Promise.all([
      page.waitForResponse((res) => res.url().includes(shareList) && res.ok()),
      switchToPublicBtn.click(),
    ]);
    const addShareEmail = page.locator("#add-button-share-email");
    await addShareEmail.click();    
    const stringEmails = given.shares.join(", ");
    await page.locator("#email").fill(stringEmails);
    const sendShareEmail = page.locator("#send-button-share-email-btn");
    // Remove the 'disabled' attribute directly to enable the button
    await sendShareEmail.evaluate((btn) => btn.removeAttribute("disabled"));
    const [shareResponse] = await Promise.all([
      page.waitForResponse((res) => res.url().includes(shareList) && res.ok()),
      sendShareEmail.click(),
    ]);
    expect(shareResponse.ok()).toBeTruthy();
    const responseShareBody = await shareResponse.json();
    console.log(`VP sharing response received`, responseShareBody);
    if (responseShareBody) {
      const totalItems = responseShareBody["hydra:totalItems"];
      console.log(`VP created with total: ${totalItems}`);
      expect(totalItems).toBe(given.shares.length);
    }
    const closeModalBtn = page.locator("svg[data-testid='close-icon']");
    await closeModalBtn.click();
  });
  test("Expiration Date VP @tc-11802", async () => {
    const btnDots = page.locator(`#myid-${createdVPId}`);
    await btnDots.click();
    const expirationDateBtn = page.locator(".fa-calendar-days + span", {
      hasText: "Expiration Date",
    });
    await expirationDateBtn.click();
    await page.waitForTimeout(1000);
    const currentDate = new Date();
    const futureDate = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth() + 1,
      currentDate.getDate(),
    );
    const year = futureDate.getFullYear();
    const month = String(futureDate.getMonth() + 1).padStart(2, "0");
    const day = String(futureDate.getDate()).padStart(2, "0");

    const formattedDate = `${year}-${month}-${day}`;
    await page.locator("#newExpirationDate").fill(formattedDate);
    const saveExpirationDateBtn = page.locator("#save-expiration-date");
    const [expirationResponse] = await Promise.all([
      page.waitForResponse(
        (res) => res.url().includes("/api/value_propositions") && res.ok(),
      ),
      saveExpirationDateBtn.click(),
    ]);
    expect(expirationResponse.ok()).toBeTruthy();
    console.log(`VP expiration date response received`);
  });
  test("Clone VP @tc-11802", async () => {
    const btnDots = page.locator(`#myid-${createdVPId}`);
    await btnDots.click();
    const cloneBtn = page.locator(".fa-clone + span", {
      hasText: "Clone",
    });
    await cloneBtn.click();
    const continueCloneBtn = page.locator("#save-clone");
    const [cloneResponse] = await Promise.all([
      page.waitForResponse(
        (res) => res.url().endsWith("/api/value_proposition/clone_value_proposition") && res.ok(),
      ),
      continueCloneBtn.click(),
    ]);
    
    await page.waitForTimeout(1000);
    expect(cloneResponse.ok()).toBeTruthy();
    console.log(`VP clone response received`);
  });
  test("Delete VP @tc-11802", async () => {
    const btnDots = page.locator(`#myid-${createdVPId}`);
    await btnDots.click();
    const deleteBtn = page.locator('svg[data-testid="icon-trash"] + span', { hasText: 'Delete' });
    await deleteBtn.click();
    const confirmDeleteBtn = page.locator("#save-delete");
    const [deleteResponse] = await Promise.all([
      page.waitForResponse(
        (res) => res.url().includes("/api/value_propositions") && res.ok(),
      ),
      confirmDeleteBtn.click(),
    ]);
    expect(deleteResponse.ok()).toBeTruthy();
    console.log(`VP delete response received`);
  });
  test.afterAll(async () => {
    await ensureDefaultLogin(page);
    // Close the context (not the worker `browser` fixture) so the
    // worker stays alive for the next spec in the workers=1 pipeline.
    await context?.close().catch((error) => {
      console.error(
        "afterAll: context.close() failed (non-critical):",
        error instanceof Error ? error.message : String(error),
      );
    });
  });
});
