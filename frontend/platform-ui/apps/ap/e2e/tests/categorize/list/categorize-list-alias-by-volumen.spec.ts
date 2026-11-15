/**
 * @fileoverview
 * E2E test for Categorize List Alias By Volume.
 *
 * This test verifies that the alias and volume information for spends in the Categorize List
 * are displayed and handled correctly.
 *
 * Test Flow:
 * 1. Navigate to the application and ensure the correct spend file is selected.
 * 2. Go to the Analyze > List section for Spends.
 * 3. Use the API to update spend aliases.
 * 4. Fetch the spends data and verify that the volume is defined for duplicate provider names.
 *
 * Acceptance Criteria:
 * - The Categorize List displays spends with correct alias and volume information.
 * - For providers with duplicate names, the spend volume is defined.
 * - The test is tagged for API, analyze, and user story tracking.
 */


import { expect, test } from "@playwright/test";
import {
  changeToSpendFile,
  ensureDefaultLogin,
  goToAnalyzeSection,
} from "../../utils/Utils";

test.beforeEach(async ({ page }) => {
  await ensureDefaultLogin(page);
  await changeToSpendFile(page, "Pagero_20230124.xlsx (Ver. 1)");
});

test("Categorize List Alias Spend By Volume @api @analyze @us-2468", async ({
  page,
}) => {
  // The test-only seeding call this test used to make,
  // POST /test/spendfileversion/update-alias-by-volumen, is commented out
  // in the backend (TestController::updateAliasSpendByVolume) and now
  // answers 404. Spend aliases are assigned by the regular ingestion
  // pipeline, so the fixture already carries them and no seeding is needed.
  const response = await goToAnalyzeSection(
    page,
    "List",
    true,
    "Spends",
    false,
  );

  const body = JSON.parse(await response!.text());
  const spends = body["data"]["spends"]["edges"].map(
    (edge: any) => edge["node"],
  );
  expect(spends.length).toBeGreaterThan(0);

  // A supplier appearing on more than one spend line is the case the
  // alias-by-volume rule exists for: every one of those lines must carry a
  // numeric volume and a non-empty alias, because the alias ordering is
  // derived from the volume. The previous assertion was
  // `expect(parseFloat(item.volume)).toBeDefined()`, which passes even for
  // NaN and so could never fail.
  const seenNames = new Set<string>();
  let duplicatesChecked = 0;

  spends.forEach((item: any) => {
    if (!seenNames.has(item.entityName)) {
      seenNames.add(item.entityName);

      return;
    }

    console.log(
      `Provider: ${item.entityName} - alias: ${item.spendAlias} - volume: ${item.volume}`,
    );
    expect(Number.isFinite(parseFloat(item.volume))).toBe(true);
    expect(item.spendAlias ?? "").not.toBe("");
    duplicatesChecked += 1;
  });

  console.log(`Duplicated provider spend lines checked: ${duplicatesChecked}`);
});
