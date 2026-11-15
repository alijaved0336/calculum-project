/**
 * Tests for useGraphqlGridExcel — Excel visibility, exportCSV emit, and
 * options-menu click-outside for CalculumGridGraphql.
 * Does not mount CalculumGridGraphql.vue (DistinctValues spec documents why).
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { defineComponent, ref } from "vue";
import { mount } from "@vue/test-utils";
import {
  EXPORT_EXCEL_FEATURE,
  FEATURE_DOWNLOAD_EXCEL,
  FEATURE_DOWNLOAD_EXCEL_MATCH,
  ROLE_COMPANY_ADMIN,
} from "@/constants";

const { userRef, rolesRef, companyActiveIdRef } = vi.hoisted(() => ({
  userRef: { value: { isSuperAdmin: false } },
  rolesRef: { value: [] as string[] },
  companyActiveIdRef: { value: "" },
}));

vi.mock("@/composables", () => ({
  useUser: () => ({
    user: userRef,
    userSessionRoles: rolesRef,
  }),
  useCompany: () => ({
    companyActiveId: companyActiveIdRef,
  }),
}));

import {
  closeGraphqlGridExportXlsModal,
  GRAPHQL_GRID_EXPORT_CSV_BUTTON_SELECTOR,
  GRAPHQL_GRID_EXPORT_CSV_MENU_ID,
  isGraphqlGridExcelVisible,
  shouldShowGraphqlGridExcelToolbar,
  useGraphqlGridExcel,
  type GraphqlGridExcelVisibilityInput,
  type UseGraphqlGridExcelOptions,
} from "@/modules/components/grid/calculum-grid-graphql/composables/useGraphqlGridExcel";

const OTHER_COMPANY_ID = "11111111-1111-1111-1111-111111111111";

function visibility(
  overrides: Partial<GraphqlGridExcelVisibilityInput> = {},
): GraphqlGridExcelVisibilityInput {
  return {
    forCompanyAdmin: false,
    isForMatchView: false,
    userSessionRoles: [],
    isSuperAdmin: false,
    companyActiveId: OTHER_COMPANY_ID,
    ...overrides,
  };
}

function mountExcel(overrides: Partial<UseGraphqlGridExcelOptions> = {}) {
  const forCompanyAdmin = ref(false);
  const isForMatchView = ref(false);
  const collectionQuery = ref("collectionQueryAnalyzeListSpends");
  const loadingExtra = ref(false);
  const allowExportExcel = ref(true);
  const emit = vi.fn();

  const options: UseGraphqlGridExcelOptions = {
    forCompanyAdmin,
    isForMatchView,
    collectionQuery,
    loadingExtra,
    allowExportExcel,
    emit,
    ...overrides,
  };

  let api: ReturnType<typeof useGraphqlGridExcel> | undefined;

  const wrapper = mount(
    defineComponent({
      setup() {
        api = useGraphqlGridExcel(options);
        return {};
      },
      template: "<div />",
    }),
  );

  return {
    api: api!,
    forCompanyAdmin,
    isForMatchView,
    collectionQuery,
    loadingExtra,
    allowExportExcel,
    emit,
    wrapper,
  };
}

describe("isGraphqlGridExcelVisible", () => {
  it.each([
    [
      "company admin screen, company admin role",
      visibility({
        forCompanyAdmin: true,
        userSessionRoles: [ROLE_COMPANY_ADMIN],
      }),
      true,
    ],
    [
      "company admin screen, no admin role",
      visibility({ forCompanyAdmin: true, userSessionRoles: [] }),
      false,
    ],
    [
      "company admin screen, super-admin without company admin role",
      visibility({ forCompanyAdmin: true, isSuperAdmin: true }),
      true,
    ],
    [
      "company on EXPORT_EXCEL_FEATURE list, no roles",
      visibility({ companyActiveId: EXPORT_EXCEL_FEATURE }),
      true,
    ],
    [
      "company not on feature list, no roles, not super-admin",
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
      "list view, super-admin without feature roles",
      visibility({ isSuperAdmin: true }),
      true,
    ],
    [
      "company admin screen ignores feature list and match roles",
      visibility({
        forCompanyAdmin: true,
        isForMatchView: true,
        companyActiveId: EXPORT_EXCEL_FEATURE,
        userSessionRoles: [FEATURE_DOWNLOAD_EXCEL_MATCH],
      }),
      false,
    ],
  ] as const)("%s", (_label, input, expected) => {
    expect(isGraphqlGridExcelVisible(input)).toBe(expected);
  });
});

describe("shouldShowGraphqlGridExcelToolbar", () => {
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
        shouldShowGraphqlGridExcelToolbar(
          visible,
          loadingExtra,
          allowExportExcel,
        ),
      ).toBe(expected);
    },
  );
});

describe("closeGraphqlGridExportXlsModal", () => {
  let menu: HTMLDivElement;
  let trigger: HTMLButtonElement;

  beforeEach(() => {
    menu = document.createElement("div");
    menu.id = GRAPHQL_GRID_EXPORT_CSV_MENU_ID;
    menu.className = "float-menu collapse show";
    trigger = document.createElement("button");
    trigger.className = "open-grid-options";
    document.body.append(trigger, menu);
  });

  afterEach(() => {
    menu.remove();
    trigger.remove();
  });

  it("clicks the options trigger when the open menu is clicked outside", () => {
    const click = vi.spyOn(trigger, "click");
    closeGraphqlGridExportXlsModal(
      new MouseEvent("click", { bubbles: true }),
    );
    expect(click).toHaveBeenCalledTimes(1);
  });

  it("does not click when the menu is already collapsed", () => {
    menu.classList.remove("show");
    const click = vi.spyOn(trigger, "click");
    closeGraphqlGridExportXlsModal(
      new MouseEvent("click", { bubbles: true }),
    );
    expect(click).not.toHaveBeenCalled();
  });

  it("does not click when the event is inside the menu", () => {
    const click = vi.spyOn(trigger, "click");
    const inside = document.createElement("span");
    menu.appendChild(inside);
    closeGraphqlGridExportXlsModal({ target: inside } as unknown as Event);
    expect(click).not.toHaveBeenCalled();
  });

  it("does not click when the event is on the options trigger", () => {
    const click = vi.spyOn(trigger, "click");
    closeGraphqlGridExportXlsModal({ target: trigger } as unknown as Event);
    expect(click).not.toHaveBeenCalled();
  });
});

describe("useGraphqlGridExcel", () => {
  beforeEach(() => {
    userRef.value = { isSuperAdmin: false };
    rolesRef.value = [];
    companyActiveIdRef.value = OTHER_COMPANY_ID;
  });

  it("emits exportCSV with collectionQuery", () => {
    const { api, emit, collectionQuery } = mountExcel();

    api.exportExcel();

    expect(emit).toHaveBeenCalledTimes(1);
    expect(emit).toHaveBeenCalledWith("exportCSV", collectionQuery.value);
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

  it("registers click-outside on mount and removes it on unmount", () => {
    const add = vi.spyOn(document, "addEventListener");
    const remove = vi.spyOn(document, "removeEventListener");
    const { wrapper } = mountExcel();

    expect(add).toHaveBeenCalledWith("click", closeGraphqlGridExportXlsModal);

    wrapper.unmount();

    expect(remove).toHaveBeenCalledWith(
      "click",
      closeGraphqlGridExportXlsModal,
    );

    add.mockRestore();
    remove.mockRestore();
  });
});
