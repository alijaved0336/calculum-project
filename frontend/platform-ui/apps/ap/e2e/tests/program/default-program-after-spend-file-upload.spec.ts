import { test, expect, Page, chromium, Browser } from "@playwright/test";
import Api2 from "../utils/APi2";

// *** Global utils ***
import {
  ensureDefaultLogin,
  goToHomeSection,
  goToProgramSection,
  uploadSpendFile
} from "../utils/Utils";

import { waitForProgramsFromApi } from "../program/utils";

test.describe(
  "environment setup after user finishes uploading a new spend file @heavy @program @integrated @us-5622",
  async () => {
    // Annotate tests as inter-dependent. Each test will have a timeout of 5 minutes
    test.describe.configure({ mode: "serial", timeout: 300000 });

    let page: Page;
    let browser: Browser;
    let spendFileVersionId = "";

    test.beforeAll(async () => {
      
      // Set timeout for this hook.


      // Open new page
      browser = await chromium.launch();
      page = await browser.newPage();

      await goToHomeSection(page);

      // Upload spend file
      const {
        spendFileVersionId: spendFileVersionIdResponse
      } = await uploadSpendFile(page, {
        hasToLoginAsSuperAdminBeforeUpload: true,
        hasToLoginAsRegularUserAfterUpload: true,
        hasToChangeToUploadedSpendFile: true
      });

      // Get spend file version id from response for clean up
      spendFileVersionId = spendFileVersionIdResponse;
    });

    test("default program was created successfully after uploadig a new spend file @integrated @program @heavy @us-5622 @tc-5625", async () => {
      // Go to program section and get all programs from API
      const [response] = await Promise.all([
        waitForProgramsFromApi(page),
        goToProgramSection(page)
      ]);

      const programs = (await response.json())["hydra:member"];

      // Assert default program was created
      expect(programs.length).toBe(1);

      // Assert program name is correct
      expect(programs[0].name).toEqual(expect.stringContaining("Main Program"));
    });

    test("a new program should have 10 harmonization groups @program @integrated @heavy @tc-5625 @us-5622", async () => {
      // Go to program Edit page
      // call at the first time all endoints
      await Promise.all([
        page.waitForResponse(
          (res: any) =>
            res.url().includes("/get-custom-data-points") &&
            res.ok()
        ),
        page.getByRole("button", { name: "Edit" }).click()
      ]);

      // call at the second time all endoints
      await Promise.all([
        page.waitForResponse(
          (res: any) =>
            res.url().includes("/get-custom-data-points") &&
            res.ok()
        ),
        page.waitForResponse(
          (res: any) =>
            res.url().includes("/harmonization_groups") &&
            res.ok()
        ),
        page.locator("a").getByText("Harmonization").click()
      ]);

      // ? - Temp fix
      await page.waitForTimeout(5000);

      // ? - Not used yet
      // const harmonizationGroups = (await response.json())["hydra:member"];

      const defaultGroups = await page.locator(".buttons_groups_analyze");

      const numRows = await defaultGroups.count();

      // first validation
      expect(numRows).toBe(13);

      const inputsRow = page.locator(".inputNumberRight");

      for (let i = 0; i < numRows; i++) {
        const label = await defaultGroups.nth(i).innerText();
        const value = await inputsRow.nth(i).inputValue();
        expect(label).toEqual("H" + (i + 1) + ", " + value + "D");
      }
    });

    // Clean up
    test.afterAll(async () => {


      const api = await Api2.getInstance(page);

      // If program was created, delete it
      if (spendFileVersionId !== "") {
        const response = await api.doDelete(
          `/api/spend_file_versions/${spendFileVersionId}`
        );
        expect(response.ok()).toBeTruthy();
      }

      // Login as regular user
      await ensureDefaultLogin(page);
      await browser.close();
    });
  }
);
