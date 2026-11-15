/**
 * Tests for CalculumGridGraphql unique-values (column filter dropdown) helpers.
 *
 * CalculumGridGraphql.vue cannot be mounted in the Vitest/Node.js environment:
 * it has 50+ child-component imports (Kendo Grid, ColumnMenuGraphql, dozens of
 * column renderers), calls useI18n() with no i18n plugin, and has no existing
 * mount-based test precedent. Importing `@/utils/graphqlUtils` pulls in the
 * Apollo client / router chain and fails under Vitest's SSR transform (same
 * class of problem documented in ManageTeamAction.spec.ts).
 *
 * Unique-values decision helpers live in graphqlGridColumnMenuHelpers.ts.
 * `FormatData.convertFiltersToREST` (used for `globalFilter`; identical to
 * graphqlUtils.convertFiltersToREST used for `telerikFilter`) is also covered
 * by tests/Unit/Utils/FormatData.spec.ts.
 */

import { describe, it, expect, vi } from "vitest";
import { convertFiltersToREST } from "@/utils/FormatData";
import {
  buildGraphqlGridUniqueValuesParams,
  getSearchChangeFlags,
  isStaleSearchResponse,
  needsUniqueValuesCountRefresh,
  resolveDataForColumns,
  shouldFallBackToUnfilteredValues,
  shouldSkipUniqueValuesListFetch,
  unfilteredUniqueValuesFallbackParams,
  uniqueValuesActiveSpendFileVersion,
  uniqueValuesListAction,
  uniqueValuesTargetOperation,
} from "@/modules/components/grid/calculum-grid-graphql/composables/graphqlGridColumnMenuHelpers";

describe("telerikFilter serialization (AC-07: active column filter sent alongside globalFilter)", () => {
  it("serializes an active column filter", () => {
    const activeColumnFilter = {
      filters: [
        { field: "negotiationStatus", operator: "eq", value: "Pending" },
      ],
      logic: "and",
    };
    expect(convertFiltersToREST(activeColumnFilter)).toBe(
      JSON.stringify(activeColumnFilter),
    );
  });

  it("returns null when no column filter is active", () => {
    expect(convertFiltersToREST(undefined)).toBeNull();
  });

  it("AC-07: combines multiple active column filters into a single telerikFilter value", () => {
    const multiConditionFilter = {
      filters: [
        { field: "negotiationStatus", operator: "eq", value: "Pending" },
        { field: "category", operator: "eq", value: "IT Services" },
      ],
      logic: "and",
    };
    const result = convertFiltersToREST(multiConditionFilter);
    expect(result).toBe(JSON.stringify(multiConditionFilter));
    const parsed = JSON.parse(result as string);
    expect(parsed.filters).toHaveLength(2);
  });

  it("puts the serialized filter on unique-values request params", () => {
    const telerikFilter = convertFiltersToREST({
      filters: [{ field: "status", operator: "eq", value: "Pending" }],
      logic: "and",
    });
    const params = buildGraphqlGridUniqueValuesParams({
      telerikFilter,
      column: "negotiationStatus",
      cantRecords: 20,
      fromRecord: 0,
      countDatas: false,
      gridSearch: "",
      levelOfGrid: "spends",
      currencyRate: 1,
      selectedProgramId: null,
      planId: null,
      phaseId: null,
      section: "analyze",
      globalFilter: '{"country":"Italy"}',
      activeSpendFileVersion: "sfv-1",
      targetOperation: null,
      summaryOperation: "unique",
      editList: false,
      companyType: "",
      entityUuid: "",
      groupUuid: "",
    });
    expect(params.telerikFilter).toBe(telerikFilter);
    expect(params.globalFilter).toBe('{"country":"Italy"}');
  });
});

describe("getSearchChangeFlags", () => {
  it("is unchanged when there is no search and no reset", () => {
    expect(getSearchChangeFlags(null, false)).toEqual({
      searchQ: null,
      changeDataColumns: false,
    });
  });

  it("treats typed search text as a dataset change", () => {
    expect(getSearchChangeFlags({ value: "suh" }, false)).toEqual({
      searchQ: "suh",
      changeDataColumns: true,
    });
  });

  it("treats a search cleared to blank as a dataset change", () => {
    expect(
      getSearchChangeFlags({ value: "", isBlank: true }, false),
    ).toEqual({
      searchQ: "",
      changeDataColumns: true,
    });
  });

  it("treats an explicit reset as a dataset change", () => {
    expect(getSearchChangeFlags(null, true).changeDataColumns).toBe(true);
  });
});

describe("AF-1 fallback-on-failure decision", () => {
  it("retries without filters on a genuine failure", () => {
    expect(shouldFallBackToUnfilteredValues({ success: false } as { skipped?: boolean })).toBe(
      true,
    );
    expect(shouldFallBackToUnfilteredValues(undefined)).toBe(true);
  });

  it("does not retry when the response is the intentional race-condition-guard skip", () => {
    expect(shouldFallBackToUnfilteredValues({ skipped: true })).toBe(false);
  });

  it("fallback params omit globalFilter and telerikFilter while keeping the rest of the request", () => {
    const originalParams = {
      telerikFilter: JSON.stringify({
        filters: [{ field: "status", value: "Pending" }],
      }),
      globalFilter: JSON.stringify({
        filters: [{ field: "country", value: "Italy" }],
      }),
      level: "spends",
      field: "negotiationStatus",
      section: "analyze",
    };

    const callbackSuccess = vi.fn();
    const fallbackParams = {
      ...unfilteredUniqueValuesFallbackParams(originalParams),
      callbackSuccess,
    };

    expect(fallbackParams.globalFilter).toBeNull();
    expect(fallbackParams.telerikFilter).toBeNull();
    expect(fallbackParams.level).toBe(originalParams.level);
    expect(fallbackParams.field).toBe(originalParams.field);
    expect(fallbackParams.section).toBe(originalParams.section);
    expect(fallbackParams.callbackSuccess).toBe(callbackSuccess);
  });
});

describe("stale search-response guard", () => {
  it("is not stale when the response matches the currently typed search text", () => {
    expect(isStaleSearchResponse({ value: "suh" }, "suh")).toBe(false);
  });

  it("is stale when an earlier keystroke resolves after a later one was issued", () => {
    expect(isStaleSearchResponse({ value: "s" }, "suh")).toBe(true);
  });

  it("is never stale for non-search calls (pagination, initial load, filter reset)", () => {
    expect(isStaleSearchResponse(null, "suh")).toBe(false);
  });

  it("is not stale for the final keystroke once nothing newer supersedes it", () => {
    expect(isStaleSearchResponse({ value: "suh" }, "suh")).toBe(false);
  });

  it("is stale when the search box was cleared after this response was issued", () => {
    expect(isStaleSearchResponse({ value: "suh" }, "")).toBe(true);
  });

  it("is stale when a blank search is superseded by later typed text", () => {
    expect(isStaleSearchResponse({ value: "" }, "suh")).toBe(true);
  });
});

describe("first-page display decision", () => {
  it("shows the first page fetched even when recordsCount is 0 (stale/mismatched COUNT response)", () => {
    const result = resolveDataForColumns(
      [],
      ["Acme Corp", "Acme Canada Inc."],
      0,
    );
    expect(result.dataForColumns).toEqual(["Acme Corp", "Acme Canada Inc."]);
  });

  it("shows the first page fetched even when recordsCount is still null", () => {
    const result = resolveDataForColumns([], ["Acme Corp"], null);
    expect(result.dataForColumns).toEqual(["Acme Corp"]);
  });

  it("correctly shows no results when the first page genuinely has none", () => {
    const result = resolveDataForColumns([], [], 0);
    expect(result.dataForColumns).toEqual([]);
  });

  it("appends a later page while more remain per recordsCount", () => {
    const result = resolveDataForColumns(
      ["Acme Corp"],
      ["Acme Canada Inc."],
      5,
    );
    expect(result.dataForColumns).toEqual(["Acme Corp", "Acme Canada Inc."]);
    expect(result.remainItem).toBe(true);
  });

  it("stops pagination once recordsCount has been reached", () => {
    const result = resolveDataForColumns(
      ["Acme Corp", "Acme Canada Inc."],
      ["Acme Corp", "Acme Canada Inc."],
      2,
    );
    expect(result.dataForColumns).toEqual(["Acme Corp", "Acme Canada Inc."]);
    expect(result.remainItem).toBe(false);
  });
});

describe("unique-values count refresh and list skip", () => {
  it("refreshes COUNT when recordsCount is still null", () => {
    expect(needsUniqueValuesCountRefresh(null, "", "name", false)).toBe(true);
  });

  it("refreshes COUNT when the column changed", () => {
    expect(needsUniqueValuesCountRefresh(10, "old", "name", false)).toBe(true);
  });

  it("skips COUNT when the same column is already counted and data did not change", () => {
    expect(needsUniqueValuesCountRefresh(10, "name", "name", false)).toBe(
      false,
    );
  });

  it("skips LIST when the first page is already loaded for the same column", () => {
    expect(
      shouldSkipUniqueValuesListFetch(0, 3, "name", "name", false),
    ).toBe(true);
  });

  it("does not skip LIST on later pages", () => {
    expect(
      shouldSkipUniqueValuesListFetch(20, 3, "name", "name", false),
    ).toBe(false);
  });
});

describe("unique-values request flags", () => {
  it("maps list summary operations to summaryAction", () => {
    expect(uniqueValuesListAction("browsing")).toBe("browse");
    expect(uniqueValuesListAction("editing")).toBe("edit");
    expect(uniqueValuesListAction("adding")).toBe("add");
    expect(uniqueValuesListAction("unique")).toBe("");
  });

  it("nulls agreed / ptTargetList target operations", () => {
    expect(uniqueValuesTargetOperation("agreed")).toBeNull();
    expect(uniqueValuesTargetOperation("ptTargetList")).toBeNull();
    expect(uniqueValuesTargetOperation("forecast")).toBe("forecast");
  });

  it("omits spend-file version for management and adminBackend", () => {
    expect(uniqueValuesActiveSpendFileVersion("management", "sfv-1")).toBeNull();
    expect(
      uniqueValuesActiveSpendFileVersion("adminBackend", "sfv-1"),
    ).toBeNull();
    expect(uniqueValuesActiveSpendFileVersion("analyze", "sfv-1")).toBe("sfv-1");
  });

  it("uses companyUuid/groupUuid on adminBackend and entityUuid elsewhere", () => {
    const admin = buildGraphqlGridUniqueValuesParams({
      telerikFilter: null,
      column: "name",
      cantRecords: 20,
      fromRecord: 0,
      countDatas: false,
      gridSearch: "",
      levelOfGrid: "spends",
      currencyRate: 1,
      selectedProgramId: null,
      planId: null,
      phaseId: "all",
      section: "adminBackend",
      globalFilter: null,
      activeSpendFileVersion: null,
      targetOperation: null,
      summaryOperation: "unique",
      editList: false,
      companyType: "",
      entityUuid: "company-1",
      groupUuid: "group-1",
    });
    expect(admin.companyUuid).toBe("company-1");
    expect(admin.groupUuid).toBe("group-1");
    expect(admin.entityUuid).toBeUndefined();

    const analyze = buildGraphqlGridUniqueValuesParams({
      telerikFilter: null,
      column: "name",
      cantRecords: 20,
      fromRecord: 0,
      countDatas: true,
      searchQuery: { value: "acme" },
      gridSearch: "ignored",
      levelOfGrid: "spends",
      currencyRate: 1,
      selectedProgramId: null,
      planId: null,
      phaseId: null,
      section: "analyze",
      globalFilter: null,
      activeSpendFileVersion: "sfv-1",
      targetOperation: null,
      summaryOperation: "unique",
      editList: false,
      companyType: "",
      entityUuid: "entity-1",
      groupUuid: "",
    });
    expect(analyze.entityUuid).toBe("entity-1");
    expect(analyze.companyUuid).toBeUndefined();
    expect(analyze.summaryOperation).toBe("count");
    expect(analyze.searchingText).toBe("acme");
  });
});
