/**
 * Tests for useClientGridExcel — Excel visibility and local saveExcel for
 * CalculumGrid. Does not mount CalculumGrid.vue.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { defineComponent, ref } from "vue";
import { mount } from "@vue/test-utils";
import {
  FEATURE_DOWNLOAD_EXCEL,
  FEATURE_DOWNLOAD_EXCEL_MATCH,
  ROLE_COMPANY_ADMIN,
} from "@/constants";

const { userRef, rolesRef, saveExcelMock } = vi.hoisted(() => ({
  userRef: { value: { isSuperAdmin: false } },
  rolesRef: { value: [] as string[] },
  saveExcelMock: vi.fn(),
}));

vi.mock("@/composables", () => ({
  useUser: () => ({
    user: userRef,
    userSessionRoles: rolesRef,
  }),
}));

vi.mock("@progress/kendo-vue-excel-export", () => ({
  saveExcel: saveExcelMock,
}));

import {
  isClientGridExcelVisible,
  shouldShowClientGridExcelToolbar,
  useClientGridExcel,
  type ClientGridExcelVisibilityInput,
  type UseClientGridExcelOptions,
} from "@/modules/components/grid/calculum-grid/composables/useClientGridExcel";

function visibility(
  overrides: Partial<ClientGridExcelVisibilityInput> = {},
): ClientGridExcelVisibilityInput {
  return {
    isForMatchView: false,
    userSessionRoles: [],
    isSuperAdmin: false,
    ...overrides,
  };
}

function mountExcel(overrides: Partial<UseClientGridExcelOptions> = {}) {
  const isForMatchView = ref(false);
  const loadingExtra = ref(false);
  const allowExportExcel = ref(true);
  const gridData = ref([{ id: 1, name: "a" }]);
  const csvFileName = ref("List");
  const csvColumns = ref([{ field: "name", title: "Name" }]);

  const options: UseClientGridExcelOptions = {
    isForMatchView,
    loadingExtra,
    allowExportExcel,
    gridData,
    csvFileName,
    csvColumns,
    ...overrides,
  };

  let api: ReturnType<typeof useClientGridExcel> | undefined;

  mount(
    defineComponent({
      setup() {
        api = useClientGridExcel(options);
        return {};
      },
      template: "<div />",
    }),
  );

  return {
    api: api!,
    isForMatchView,
    loadingExtra,
    allowExportExcel,
    gridData,
    csvFileName,
    csvColumns,
  };
}

describe("isClientGridExcelVisible", () => {
  it.each([
    [
      "super-admin without feature roles",
      visibility({ isSuperAdmin: true }),
      true,
    ],
    [
      "list view, excel feature and company admin",
      visibility({
        userSessionRoles: [FEATURE_DOWNLOAD_EXCEL, ROLE_COMPANY_ADMIN],
      }),
      true,
    ],
    [
      "list view, excel feature without company admin",
      visibility({ userSessionRoles: [FEATURE_DOWNLOAD_EXCEL] }),
      false,
    ],
    [
      "list view, company admin without excel feature",
      visibility({ userSessionRoles: [ROLE_COMPANY_ADMIN] }),
      false,
    ],
    [
      "list view, match feature does not grant list export",
      visibility({
        userSessionRoles: [FEATURE_DOWNLOAD_EXCEL_MATCH, ROLE_COMPANY_ADMIN],
      }),
      false,
    ],
    [
      "list view, no roles, not super-admin",
      visibility(),
      false,
    ],
    [
      "match view, match feature and company admin",
      visibility({
        isForMatchView: true,
        userSessionRoles: [FEATURE_DOWNLOAD_EXCEL_MATCH, ROLE_COMPANY_ADMIN],
      }),
      true,
    ],
    [
      "match view, match feature without company admin",
      visibility({
        isForMatchView: true,
        userSessionRoles: [FEATURE_DOWNLOAD_EXCEL_MATCH],
      }),
      false,
    ],
    [
      "match view, company admin without match feature",
      visibility({
        isForMatchView: true,
        userSessionRoles: [ROLE_COMPANY_ADMIN],
      }),
      false,
    ],
    [
      "match view, list excel feature does not grant match export",
      visibility({
        isForMatchView: true,
        userSessionRoles: [FEATURE_DOWNLOAD_EXCEL, ROLE_COMPANY_ADMIN],
      }),
      false,
    ],
    [
      "match view, super-admin without feature roles",
      visibility({ isForMatchView: true, isSuperAdmin: true }),
      true,
    ],
  ] as const)("%s", (_label, input, expected) => {
    expect(isClientGridExcelVisible(input)).toBe(expected);
  });
});

describe("shouldShowClientGridExcelToolbar", () => {
  it.each([
    ["visible, not loading, allowed", true, false, true, true],
    ["hidden icon", false, false, true, false],
    ["loading extra", true, true, true, false],
    ["export not allowed", true, false, false, false],
    ["loading extra and not allowed", true, true, false, false],
  ] as const)(
    "%s",
    (_label, visible, loadingExtra, allowExportExcel, expected) => {
      expect(
        shouldShowClientGridExcelToolbar(
          visible,
          loadingExtra,
          allowExportExcel,
        ),
      ).toBe(expected);
    },
  );
});

describe("useClientGridExcel", () => {
  beforeEach(() => {
    userRef.value = { isSuperAdmin: false };
    rolesRef.value = [];
    saveExcelMock.mockClear();
  });

  it("calls saveExcel with gridData, csvFileName, and columns", () => {
    const { api, gridData, csvFileName, csvColumns } = mountExcel();

    api.exportExcel();

    expect(saveExcelMock).toHaveBeenCalledTimes(1);
    expect(saveExcelMock).toHaveBeenCalledWith({
      data: gridData.value,
      fileName: csvFileName.value,
      columns: csvColumns.value,
      filterable: true,
    });
  });

  it("does not expose or call exportCSV", () => {
    const { api } = mountExcel();

    expect(api).not.toHaveProperty("emit");
    api.exportExcel();
    expect(saveExcelMock).toHaveBeenCalled();
  });

  it("hides the toolbar while loadingExtra even when export is allowed", () => {
    rolesRef.value = [FEATURE_DOWNLOAD_EXCEL, ROLE_COMPANY_ADMIN];
    const { api, loadingExtra } = mountExcel();

    expect(api.showExcelToolbar.value).toBe(true);

    loadingExtra.value = true;

    expect(api.iconExcelIsNotHidden.value).toBe(true);
    expect(api.showExcelToolbar.value).toBe(false);
  });

  it("hides the toolbar when allowExportExcel is false", () => {
    rolesRef.value = [FEATURE_DOWNLOAD_EXCEL, ROLE_COMPANY_ADMIN];
    const allowExportExcel = ref(false);
    const { api } = mountExcel({ allowExportExcel });

    expect(api.iconExcelIsNotHidden.value).toBe(true);
    expect(api.showExcelToolbar.value).toBe(false);
  });
});
