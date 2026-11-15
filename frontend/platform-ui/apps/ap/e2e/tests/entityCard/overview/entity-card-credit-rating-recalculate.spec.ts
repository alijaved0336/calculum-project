/**
 * @fileoverview
 * E2E test for verifying the recalculation of credit rating in the Entity Card Overview after spend file recalculation.
 *
 * Main Flow:
 * 1. Log in as a super admin.
 * 2. Recalculate the specified spend file version.
 * 3. Change to the recalculated spend file.
 * 4. Navigate to the Entity Card for "CARGILL".
 * 5. Wait for the credit score API response.
 * 6. Assert that the credit rating letter grade is displayed as expected ("A").
 *
 * Acceptance Criteria:
 * - The test waits for the spend file recalculation to complete.
 * - The correct spend file is selected after recalculation.
 * - The Entity Card for "CARGILL" loads successfully.
 * - The credit score API responds with status 200.
 * - The UI displays the expected credit rating letter grade ("A").
 * - The test passes if all assertions are met.
 */

import { expect, test, Page } from "@playwright/test";
import Api2, { IprocessedResponse } from "../../utils/APi2";
import {
  ensureDefaultLogin,
  changeToSpendFile,
  goToEntityCardEntity,
  loginAsSuperAdmin,
} from "../../utils/Utils";

let api: Api2 | null = null;
const spendFileVersionID = "586173c6-6ceb-47cc-b001-28c4616ce4e6";

test.beforeEach(async ({ page }) => {
  await loginAsSuperAdmin(page);
  api = await Api2.getInstance(page);
  await page.goto("/");
  await page.waitForSelector(".loading-modal", { state: "detached" });
  await changeToSpendFile(page, "Spend Credit Score2.xlsx (Ver. 1)");
});

test("Entity Card > CARGILL > Overview > Test credit rating after recalculation spend file @integrated @entity @us-3732 @heavy", async ({
  page,
}) => {
  await recalculateSpendFileVersion(spendFileVersionID, page);

  await changeToSpendFile(page, "Pagero_Credit_Score.xlsx (Ver. 2)");

  const [response] = await Promise.all([
    page.waitForResponse((response) =>
      response.url().includes("/credit-score"),
    ),
    goToEntityCardEntity(page, "CARGILL"),
  ]);
  expect(response.status()).toBe(200);
  expect(await page.locator(".entity_card_letterGrade").innerText()).toBe("A");
});
async function recalculateSpendFileVersion(
  spendFileVersionID: string,
  page: Page,
) {
  const spendListProcessResult: IprocessedResponse = {
    data: {},
    status: null,
    result: false,
    body: null,
  };
  const postResponse = await api!.doPost(
    `/api/analyze/spend-file-version/${spendFileVersionID}/recalculate`,
    {},
    "application/json",
    500000,
  );
  await Api2.processApiResponse(
    postResponse,
    "Recalculating spend file version",
    spendListProcessResult,
  );

  expect(spendListProcessResult.status).toBe(200);

  let status = "unknown";
  const url2 = `/api/spendfile/get-file-version/${spendFileVersionID}`;
  while (status !== "ready") {
    console.log(
      "wating for status ready for spend file: " + spendFileVersionID,
    );
    const spvStatus = await api!.doGet(url2);
    expect(spvStatus.ok()).toBeTruthy();
    const respStatus = JSON.parse(await spvStatus.text());
    setTimeout(() => {
      status = respStatus.status;
    }, 5000);
  }

  expect(status).toBe("ready");
}

test.afterEach(async ({ page }) => {
  await ensureDefaultLogin(page);
});
