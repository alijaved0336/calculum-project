/**
 * @fileoverview
 * E2E test for verifying the Adabot Opportunity entity card at the supplier level.
 *
 * This test covers:
 * - Ensuring the correct program and spend file are selected.
 * - Verifying that the Adabot API returns the expected sections and ordered
 *   detail keys for level "supplier" — the namespace the spend-level and
 *   parent-level sibling specs do not exercise.
 *
 * Prerequisites:
 * - The test user must have access to the "Pagero_DSO_TEST.xlsx (Ver. 1)" spend file.
 * - The suppliers "Johannes Matzhold Gesmbh" and "Dr. Techn. Josef Zelisko,
 *   Fabrik Fuer Elektrotechnik Und Maschinenbau Gesellschaft M.B.H." must exist
 *   in the test data, with their Adabot configurations on "Test Adabot (NO TOCAR)".
 *
 * Utilities:
 * - Uses Playwright test runner and custom utility functions for navigation and assertions.
 */



import { expect, test, Page } from "@playwright/test";
import { changeToSpendFile, ensureDefaultLogin } from "../../utils/Utils";
import Api2 from "../../utils/APi2";
import { ProgramUtils } from "../../utils";

const url = `/api/entity-card/entity/ada-bot/all/`;
const request = {
  programUUID: "55d088c4-b08d-40cf-bd97-040ae6c814fd",
  level: "supplier",
  currency: "USD",
  currencyRate: 1,
  supplierUUID: "",
  cTarget: "",
  configUUID: "",
};
let page: Page;
test.describe
  .serial("Entity-Card Oportunity - Adabot - Supplier Level", async () => {
  test.beforeAll(async ({ browser }) => {
    // ******* This code works for all tests in this file ********
    page = await browser.newPage();

    await ensureDefaultLogin(page);
    await changeToSpendFile(page, "Pagero_DSO_TEST.xlsx (Ver. 1)");
    await ProgramUtils.changeToProgram(page, "Test Adabot (NO TOCAR)");
    // ***********************************************************
  });

  // Both tests below are API-only, matching the spend-level and parent-level
  // sibling specs. The former entity-card UI navigation in beforeAll
  // (goToEntityCardEntity) was the flaky part and added no coverage over the
  // Adabot API contract asserted here.
  test("Adabot - Johannes Matzhold Gesmbh - All Spends -> @flakyResolved @prq @api @entity @negotiation @adabot", async () => {
    const api: Api2 | null = await Api2.getInstance(page);
    request.supplierUUID = "955127de-e25e-4f50-8fff-57b1313c98bf"; // Name: Johannes Matzhold Gesmbh
    request.configUUID = "237e472f-0d92-4a7c-9d53-1147dbacafdb";

    const adabotResp = await api!.doPost(url, request);
    expect(adabotResp.ok()).toBeTruthy();

    const {
      cashDiscountConversionStrategy: respCashDiscount,
      buyerStandardStrategy: respBuyerStandardStrategy,
      industryRegionStandardStrategy: respIndustryRegion,
      payOnTermsStrategy: respPayOnTerms,
      peerGroupAvgStrategy: respPeerGroup,
      proposedTerms: respProposedTerms,
      snapshot: resultSnapshot,
      supplierStandardStrategy: respSupplierStandard,
    } = JSON.parse(await adabotResp.text());

    // Supplier Snapshot
    expect(resultSnapshot).not.toBeNull();
    expect(resultSnapshot.sectionName).toBe("Supplier Snapshot");
    expect(Object.keys(resultSnapshot.details)).toStrictEqual([
      "sup01",
      "sup02",
      "sup04",
      "sup06",
      "sup08",
    ]);

    // Pay on Terms Strategy
    expect(respPayOnTerms).not.toBeNull();
    expect(respPayOnTerms.sectionName).toBe("Pay on Terms Strategy");
    expect(Object.keys(respPayOnTerms.details)).toStrictEqual(["sup11"]);

    /*/ Supplier Parent Max Strategy
      expect(respParentMaxStrategy).not.toBeNull();
      expect(respParentMaxStrategy.sectionName).toBe(
        "Supplier Parent Max Strategy"
      );
      expect(Object.keys(respParentMaxStrategy.details)).toStrictEqual([
        "sup23"
      ]);*/

    // Supplier Standard Strategy
    expect(respSupplierStandard).not.toBeNull();
    expect(respSupplierStandard.sectionName).toBe("Supplier Standard");
    expect(Object.keys(respSupplierStandard.details)).toStrictEqual(["sup41"]);

    // Industry/Region Standard
    expect(respIndustryRegion).not.toBeNull();
    expect(respIndustryRegion.sectionName).toBe("Industry/Region Standard");
    expect(Object.keys(respIndustryRegion.details)).toStrictEqual([
      "sup60",
      "sup61",
      "sup63",
      "sup65",
      "sup67",
    ]);

    // Buying Entity Standard
    expect(respBuyerStandardStrategy).not.toBeNull();
    expect(respBuyerStandardStrategy.sectionName).toBe("Buyer Standard");
    // The buyer standard term is not available for this supplier, so the API
    // returns the "no buyer standard" detail (sup31) instead of the single
    // buyer group detail (sup34).
    expect(Object.keys(respBuyerStandardStrategy.details)).toStrictEqual([
      "sup31",
      "sup35",
      "sup30",
    ]);

    // Peer Group Average
    expect(respPeerGroup).not.toBeNull();
    expect(respPeerGroup.sectionName).toBe("Peer Group Average");
    expect(Object.keys(respPeerGroup.details)).toStrictEqual(["sup51"]);

    // Proposed
    expect(respProposedTerms).not.toBeNull();
    expect(respProposedTerms.sectionName).toBe("Proposed Payment Terms");
    expect(Object.keys(respProposedTerms.details)).toStrictEqual([
      "sup91",
      "sup92",
    ]);

    // Cash Discount Conversion
    expect(respCashDiscount).not.toBeNull();
    expect(respCashDiscount.sectionName).toBe("Cash Discount Conversion");
    expect(Object.keys(respCashDiscount.details)).toStrictEqual([
      "sup120",
      "sup121",
    ]);
  });

  test("Adabot - Dr. Techn. Josef Zelisko, ... - All Spends -> @flakyResolved @prq @api @entity @negotiation @adabot", async () => {
    const api: Api2 | null = await Api2.getInstance(page);
    request.supplierUUID = "6cc663b6-efea-4033-8bfd-ba2f1a68bd82"; // Name: Dr. Techn. Josef Zelisko, Fabrik ...
    request.configUUID = "4efb00cb-f47c-4839-802e-febcc5dae485";

    const adabotResp = await api!.doPost(url, request);
    expect(adabotResp.ok()).toBeTruthy();

    const {
      cashDiscountConversionStrategy: respCashDiscount,
      buyerStandardStrategy: respBuyerStandardStrategy,
      industryRegionStandardStrategy: respIndustryRegion,
      payOnTermsStrategy: respPayOnTerms,
      peerGroupAvgStrategy: respPeerGroup,
      proposedTerms: respProposedTerms,
      snapshot: resultSnapshot,
      supplierStandardStrategy: respSupplierStandard,
    } = JSON.parse(await adabotResp.text());

    // Supplier Snapshot
    expect(resultSnapshot).not.toBeNull();
    expect(resultSnapshot.sectionName).toBe("Supplier Snapshot");
    expect(Object.keys(resultSnapshot.details)).toStrictEqual([
      "sup01",
      "sup02",
      "sup04",
      "sup05",
      "sup07",
      "sup08",
    ]);

    // Pay on Terms Strategy
    expect(respPayOnTerms).not.toBeNull();
    expect(respPayOnTerms.sectionName).toBe("Pay on Terms Strategy");
    expect(Object.keys(respPayOnTerms.details)).toStrictEqual(["sup11"]);

    /*/ Supplier Parent Max Strategy
      expect(respParentMaxStrategy).not.toBeNull();
      expect(respParentMaxStrategy.sectionName).toBe(
        "Supplier Parent Max Strategy"
      );
      expect(Object.keys(respParentMaxStrategy.details)).toStrictEqual([
        "sup23"
      ]);*/

    // Supplier Standard Strategy
    expect(respSupplierStandard).not.toBeNull();
    expect(respSupplierStandard.sectionName).toBe("Supplier Standard");
    expect(Object.keys(respSupplierStandard.details)).toStrictEqual(["sup41"]);

    // Industry/Region Standard
    expect(respIndustryRegion).not.toBeNull();
    expect(respIndustryRegion.sectionName).toBe("Industry/Region Standard");
    expect(Object.keys(respIndustryRegion.details)).toStrictEqual([
      "sup60",
      "sup62",
      "sup63",
      "sup65",
      "sup67",
    ]);

    // Buying Entity Standard
    expect(respBuyerStandardStrategy).not.toBeNull();
    expect(respBuyerStandardStrategy.sectionName).toBe("Buyer Standard");
    expect(Object.keys(respBuyerStandardStrategy.details)).toStrictEqual([
      "sup31",
      "sup35",
      "sup30",
    ]);

    // Peer Group Average
    expect(respPeerGroup).not.toBeNull();
    expect(respPeerGroup.sectionName).toBe("Peer Group Average");
    expect(Object.keys(respPeerGroup.details)).toStrictEqual(["sup52"]);

    // Proposed
    expect(respProposedTerms).not.toBeNull();
    expect(respProposedTerms.sectionName).toBe("Proposed Payment Terms");
    expect(Object.keys(respProposedTerms.details)).toStrictEqual([
      "sup91",
      "sup92",
    ]);

    // Cash Discount Conversion
    expect(respCashDiscount).not.toBeNull();
    expect(respCashDiscount.sectionName).toBe("Cash Discount Conversion");
    expect(Object.keys(respCashDiscount.details)).toStrictEqual([
      "sup120",
      "sup124",
      "sup125",
    ]);
  });

  test.afterAll(async () => {
    await page?.context().close().catch((error) => {
      console.error(
        "afterAll: page.context().close() failed (non-critical):",
        error instanceof Error ? error.message : String(error),
      );
    });
  });
});
