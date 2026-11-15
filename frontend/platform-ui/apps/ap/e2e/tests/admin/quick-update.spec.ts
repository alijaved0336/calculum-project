import { test,expect } from "@playwright/test";
import {
  ensureDefaultLogin,
  getDataControllerForPostData,
  ensureSuperAdminLogin,
} from "../utils/Utils";
import Api2 from "../utils/APi2";
const given = {
  company: "Company_Quick_Update",
  spendfile: "Pagero_Privacy-1.xlsx (Ver. 1)",
  templates: [
    {url:"/api/tests/templates/process/quick_fix_happy",result:true},
    {url:"/api/tests/templates/process/quick_fix_error",result:true},
  ],
};
let api: Api2 | null = null;
test.beforeEach(async ({ page }) => {
  api = await Api2.getInstance(page);
  await ensureSuperAdminLogin(page);
});

test("Admin > Data > Quick Update Test @admin @integrated @tc-12861", async ({
  page,
}) => {
  const postData = await getDataControllerForPostData(
    page,
    given.company,
    given.spendfile,
  );
  for (const template of given.templates) {
    const response = await api!.doPost(template.url, postData);
    console.log(`${template.url.split("/").pop()} response`, await response.json());
    expect(response.ok()).toBe(template.result);
  }
});

test.afterEach(async ({ page }) => {
  await ensureDefaultLogin(page);
});
