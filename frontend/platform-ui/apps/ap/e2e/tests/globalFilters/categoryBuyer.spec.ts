import { Page, expect, test } from "@playwright/test";

// Utils
import { changeToSpendFile, ensureDefaultLogin } from "../utils/Utils";

import { GlobalFiltersUtils } from "../utils";
import { KeyValue } from "../../../apps/ap/src/types";

const spendFileName = "PageroFull_20230308_2.xlsx (Ver. 1)";

const categoryName = "Buying Entity";

test.beforeEach(async ({ page }) => {
  await ensureDefaultLogin(page);
  await changeToSpendFile(page, spendFileName);
});

test("buyer category is showing in global filters dialog @filter @ui", async ({
  page,
}) => {
  const fieldNameInAPIResponse = "buyerName";
  const fieldName = "Buying Entity Name";
  await GlobalFiltersUtils.openModal(page);
  await GlobalFiltersUtils.openCategoryThenField(
    page,
    {
      categoryName,
      fieldName,
    },
    fieldNameInAPIResponse,
  );
});
