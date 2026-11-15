/**
 * @fileoverview
 * E2E test for verifying the Adabot Opportunity entity card at the parent level.
 *
 * This test covers:
 * - Navigating to the Opportunity entity card for a parent-level supplier.
 * - Ensuring the correct program and spend file are selected.
 * - Verifying that the Adabot API returns the expected data for the parent level.
 *
 * Prerequisites:
 * - The test user must have access to the "Pagero_DSO_TEST.xlsx (Ver. 1)" spend file.
 * - The supplier "Knorr-Bremse AG" must exist in the test data.
 *
 * Utilities:
 * - Uses Playwright test runner and custom utility functions for navigation and assertions.
 */

import { expect, test, Page } from "@playwright/test";
import {
  changeToSpendFile,
  ensureDefaultLogin,
  goToEntityCardEntityExactFull,
} from "../../utils/Utils";
import Api2 from "../../utils/APi2";
import { ProgramUtils } from "../../utils";
import {
  logOperation,
  safeOperation,
  ensurePageActive,
} from "../../utils/PlaywrightTestHelpers";

const url = `/api/entity-card/entity/ada-bot/all/`;
const request = {
  programUUID: "55d088c4-b08d-40cf-bd97-040ae6c814fd",
  level: "parent",
  currency: "USD",
  currencyRate: 1,
  supplierUUID: "",
  cTarget: "",
  configUUID: "",
};

// let browser: Browser;
test.describe
  .serial("Entity-Card Oportunity - Adabot - Parent Level @flakyResolved", async () => {
  let page: Page;
  test.beforeAll(async ({ browser }) => {
    logOperation("Setting up test environment");
    page = await browser.newPage();

    await safeOperation(
      page,
      async () => {
        await ensureDefaultLogin(page);
        await changeToSpendFile(page, "Pagero_DSO_TEST.xlsx (Ver. 1)");
        await ProgramUtils.changeToProgram(page, "Test Adabot (NO TOCAR)");
      },
      "Setup test environment"
    );
    logOperation("Test environment setup completed");
  });
  test("Adabot - Knorr-Bremse AG - Parent Level -> @prq @api @entity @negotiation @adabot", async () => {
    await ensurePageActive(page);
    
    logOperation("Navigating to Knorr-Bremse AG entity card");
    await safeOperation(
      page,
      async () => {
        await goToEntityCardEntityExactFull(
          page,
          "Knorr-Bremse AG",
          0,
          true,
          "Germany",
        );
      },
      "Navigate to entity card"
    );

    logOperation("Getting API instance and preparing request", {
      supplierUUID: "3504cd6d-b2d6-4596-aaa1-f11c621d2264",
      supplierName: "Knorr-Bremse AG"
    });
    
    const api: Api2 | null = await Api2.getInstance(page);
    request.supplierUUID = "3504cd6d-b2d6-4596-aaa1-f11c621d2264"; // Name: Knorr-Bremse AG
    request.configUUID = "17478a40-db53-4240-a50d-c5fac5e0abdc";

    logOperation("Calling Adabot API");
    const adabotResp = await safeOperation(
      page,
      async () => {
        return await api!.doPost(url, request);
      },
      "Call Adabot API"
    );
    
    expect(adabotResp.ok()).toBeTruthy();
    logOperation("Adabot API response received successfully");

    logOperation("Parsing Adabot API response");
    const {
      cashDiscountConversionStrategy: respCashDiscount,
      buyerStandardStrategy: respBuyerStandardStrategy,
      industryRegionStandardStrategy: respIndustryRegion,
      payOnTermsStrategy: respPayOnTerms,
      peerGroupAvgStrategy: respPeerGroup,
      proposedTerms: respProposedTerms,
      snapshot: resultSnapshot,
      parentSupplierMaxStrategy: respParentMaxStrategy,
      supplierStandardStrategy: respSupplierStandard,
    } = await adabotResp.json();

    logOperation("Validating Adabot response strategies");
    // Parent Snapshot
    expect(resultSnapshot).not.toBeNull();
    expect(resultSnapshot.sectionName).toBe("Supplier Snapshot");
    expect(Object.keys(resultSnapshot.details)).toStrictEqual([
      "parent01",
      "parent02",
      "parent04",
      "parent06",
      "parent08",
    ]);

    // Pay on Terms Strategy
    expect(respPayOnTerms).not.toBeNull();
    expect(respPayOnTerms.sectionName).toBe("Pay on Terms Strategy");
    expect(Object.keys(respPayOnTerms.details)).toStrictEqual(["parent14"]);

    // Parent Max Strategy
    expect(respParentMaxStrategy).not.toBeNull();
    expect(respParentMaxStrategy.sectionName).toBe(
      "Supplier Parent Max Strategy",
    );
    expect(Object.keys(respParentMaxStrategy.details)).toStrictEqual([
      "parent22",
    ]);

    // Supplier Standard Strategy
    expect(respSupplierStandard).not.toBeNull();
    expect(respSupplierStandard.sectionName).toBe("Supplier Standard");
    expect(Object.keys(respSupplierStandard.details)).toStrictEqual([
      "parent42",
    ]);

    // Industry/Region Standard
    expect(respIndustryRegion).not.toBeNull();
    expect(respIndustryRegion.sectionName).toBe("Industry/Region Standard");
    expect(Object.keys(respIndustryRegion.details)).toStrictEqual([
      "parent60",
      "parent62",
      "parent63",
    ]);

    // Buyer Standard
    expect(respBuyerStandardStrategy).not.toBeNull();
    expect(respBuyerStandardStrategy.sectionName).toBe("Buyer Standard");
    expect(Object.keys(respBuyerStandardStrategy.details)).toStrictEqual([
      "parent71",
      "parent75",
      "parent70",
    ]);

    // Peer Group Average
    expect(respPeerGroup).not.toBeNull();
    expect(respPeerGroup.sectionName).toBe("Peer Group Average");
    expect(Object.keys(respPeerGroup.details)).toStrictEqual(["parent51"]);

    // Proposed
    expect(respProposedTerms).not.toBeNull();
    expect(respProposedTerms.sectionName).toBe("Proposed Payment Terms");
    expect(Object.keys(respProposedTerms.details)).toStrictEqual([
      "parent81",
      "parent83",
    ]);

    // Cash Discount Conversion
    expect(respCashDiscount).not.toBeNull();
    expect(respCashDiscount.sectionName).toBe("Cash Discount Conversion");
    expect(Object.keys(respCashDiscount.details)).toStrictEqual([
      "parent120",
      "parent122",
    ]);
    logOperation("All validations passed for Knorr-Bremse AG");
  });

  test("Adabot - ASSA ABLOY AB - Parent Level -> @api @entity @negotiation @adabot", async () => {
    await ensurePageActive(page);
    
    logOperation("Getting API instance and preparing request for ASSA ABLOY AB", {
      supplierUUID: "23673212-fa45-4bab-95dd-283e68b94fd6",
      supplierName: "ASSA ABLOY AB"
    });
    
    const api: Api2 | null = await Api2.getInstance(page);
    request.supplierUUID = "23673212-fa45-4bab-95dd-283e68b94fd6"; // Name: ASSA ABLOY AB
    request.configUUID = "237e472f-0d92-4a7c-9d53-1147dbacafdb";

    logOperation("Calling Adabot API for ASSA ABLOY AB");
    const adabotResp = await safeOperation(
      page,
      async () => {
        return await api!.doPost(url, request);
      },
      "Call Adabot API for ASSA ABLOY AB"
    );
    
    expect(adabotResp.ok()).toBeTruthy();
    logOperation("Adabot API response received successfully for ASSA ABLOY AB");

    const {
      cashDiscountConversionStrategy: respCashDiscount,
      buyerStandardStrategy: respBuyerStandardStrategy,
      industryRegionStandardStrategy: respIndustryRegion,
      payOnTermsStrategy: respPayOnTerms,
      peerGroupAvgStrategy: respPeerGroup,
      proposedTerms: respProposedTerms,
      snapshot: resultSnapshot,
      parentSupplierMaxStrategy: respParentMaxStrategy,
      supplierStandardStrategy: respSupplierStandard,
    } = await adabotResp.json();

    logOperation("Validating Adabot response strategies for ASSA ABLOY AB");
    // Snapshot
    expect(resultSnapshot).not.toBeNull();
    expect(resultSnapshot.sectionName).toBe("Supplier Snapshot");
    expect(Object.keys(resultSnapshot.details)).toStrictEqual([
      "parent01",
      "parent02",
      "parent04",
      "parent06",
      "parent08",
    ]);

    // Pay on Terms Strategy
    expect(respPayOnTerms).not.toBeNull();
    expect(respPayOnTerms.sectionName).toBe("Pay on Terms Strategy");
    expect(Object.keys(respPayOnTerms.details)).toStrictEqual(["parent14"]);

    // Parent Max Strategy
    expect(respParentMaxStrategy).not.toBeNull();
    expect(respParentMaxStrategy.sectionName).toBe(
      "Supplier Parent Max Strategy",
    );
    expect(Object.keys(respParentMaxStrategy.details)).toStrictEqual([
      "parent22",
    ]);

    // Supplier Standard Strategy
    expect(respSupplierStandard).not.toBeNull();
    expect(respSupplierStandard.sectionName).toBe("Supplier Standard");
    expect(Object.keys(respSupplierStandard.details)).toStrictEqual([
      "parent42",
    ]);

    // Industry/Region Standard
    expect(respIndustryRegion).not.toBeNull();
    expect(respIndustryRegion.sectionName).toBe("Industry/Region Standard");
    expect(Object.keys(respIndustryRegion.details)).toStrictEqual([
      "parent60",
      "parent61",
      "parent63",
    ]);

    // Buyer Standard
    expect(respBuyerStandardStrategy).not.toBeNull();
    expect(respBuyerStandardStrategy.sectionName).toBe("Buyer Standard");
    expect(Object.keys(respBuyerStandardStrategy.details)).toStrictEqual([
      "parent71",
      "parent75",
      "parent70",
    ]);

    // Peer Group Average
    expect(respPeerGroup).not.toBeNull();
    expect(respPeerGroup.sectionName).toBe("Peer Group Average");
    expect(Object.keys(respPeerGroup.details)).toStrictEqual(["parent51"]);

    // Proposed
    expect(respProposedTerms).not.toBeNull();
    expect(respProposedTerms.sectionName).toBe("Proposed Payment Terms");
    expect(Object.keys(respProposedTerms.details)).toStrictEqual([
      "parent81",
      "parent83",
    ]);

    // Cash Discount Conversion
    expect(respCashDiscount).not.toBeNull();
    expect(respCashDiscount.sectionName).toBe("Cash Discount Conversion");
    expect(Object.keys(respCashDiscount.details)).toStrictEqual([
      "parent120",
      "parent121",
    ]);
    logOperation("All validations passed for ASSA ABLOY AB");
  });

  test.afterAll(async () => {
    logOperation("Cleaning up test environment");
    if (page && !page.isClosed()) {
      await ensurePageActive(page);
    }
    // Close the page's context (not the worker `browser` fixture) so the
    // worker stays alive for the next spec in the workers=1 pipeline.
    await page?.context().close().catch((error) => {
      console.error(
        "afterAll: page.context().close() failed (non-critical):",
        error instanceof Error ? error.message : String(error),
      );
    });
    logOperation("Test cleanup completed");
  });
});
