/**
 * Tests for companies-admin modules composable (pilot + active client).
 */

import { describe, it, expect, vi } from "vitest";
import { defineComponent, ref } from "vue";
import { mount } from "@vue/test-utils";
import {
  useClientGridCompaniesAdminModules,
  type UseClientGridCompaniesAdminModulesOptions,
} from "@/modules/components/grid/calculum-grid/composables/useClientGridCompaniesAdminModules";

vi.mock(
  "@/modules/components/grid/calculum-grid/utils/formatDateForInput",
  () => ({
    formatDateForInput: () => "2099-01-15",
  }),
);

function mountCompaniesAdmin(
  overrides: Partial<UseClientGridCompaniesAdminModulesOptions> = {},
) {
  const savedEntities = ref<
    UseClientGridCompaniesAdminModulesOptions["savedEntities"]["value"]
  >([]);
  const emit = vi.fn();
  const t = vi.fn((key: string) => `t:${key}`);

  const options: UseClientGridCompaniesAdminModulesOptions = {
    savedEntities,
    t,
    emit,
    ...overrides,
  };

  let api: ReturnType<typeof useClientGridCompaniesAdminModules> | undefined;

  mount(
    defineComponent({
      setup() {
        api = useClientGridCompaniesAdminModules(options);
        return {};
      },
      template: "<div />",
    }),
  );

  return { api: api!, savedEntities, emit, t };
}

describe("useClientGridCompaniesAdminModules", () => {
  it("activeClientModeLabel translates known modes and empty otherwise", () => {
    const { api, t } = mountCompaniesAdmin();

    expect(api.activeClientModeLabel({ activeClientMode: "manual" })).toBe(
      "t:adminBackend.companiesAdmin.activeClientMode.manual",
    );
    expect(api.activeClientModeLabel({ activeClientMode: "auto" })).toBe(
      "t:adminBackend.companiesAdmin.activeClientMode.auto",
    );
    expect(api.activeClientModeLabel({ activeClientMode: null })).toBe("");
    expect(t).toHaveBeenCalledTimes(2);
  });

  it("activeClientOnChecked emits company IRI payload", () => {
    const { api, emit } = mountCompaniesAdmin();

    api.activeClientOnChecked({
      dataItem: { "@id": "/companies/1" },
      checked: true,
    });

    expect(emit).toHaveBeenCalledWith("active-client-checked", {
      companyIRI: "/companies/1",
      checked: true,
    });
  });

  it("companiesGridModuleOnChecked adds pilot entity and emits date-selected", () => {
    const { api, savedEntities, emit } = mountCompaniesAdmin();
    const dataItem = {
      "@id": "/companies/pilot",
      pilotTimeExpire: null as string | null,
    };

    api.companiesGridModuleOnChecked({
      fieldName: "featurePilotAccountIsAvailable",
      dataItem,
      checked: true,
    });

    expect(savedEntities.value).toEqual([
      { id: "/companies/pilot", pilotTimeExpire: null },
    ]);
    expect(emit).toHaveBeenCalledWith(
      "date-selected",
      dataItem,
      "2099-01-15",
    );
    expect(emit).toHaveBeenCalledWith("companies-grid-module-checked", {
      fieldName: "featurePilotAccountIsAvailable",
      companyIRI: "/companies/pilot",
      checked: true,
    });
  });

  it("companiesGridModuleOnChecked removes pilot entity when unchecked", () => {
    const savedEntities = ref([
      { id: "/companies/pilot", pilotTimeExpire: null as string | null },
    ]);
    const { api, emit } = mountCompaniesAdmin({ savedEntities });

    api.companiesGridModuleOnChecked({
      fieldName: "featurePilotAccountIsAvailable",
      dataItem: { "@id": "/companies/pilot", pilotTimeExpire: null },
      checked: false,
    });

    expect(savedEntities.value).toEqual([]);
    expect(emit).toHaveBeenCalledWith("companies-grid-module-checked", {
      fieldName: "featurePilotAccountIsAvailable",
      companyIRI: "/companies/pilot",
      checked: false,
    });
  });

  it("seedPilotSavedEntities pushes FEATURE_PILOT rows", () => {
    const { api, savedEntities } = mountCompaniesAdmin();

    api.seedPilotSavedEntities([
      {
        "@id": "/companies/a",
        roles: ["FEATURE_PILOT"],
        pilotTimeExpire: "2026-01-01",
      },
      { "@id": "/companies/b", roles: ["OTHER"], pilotTimeExpire: null },
    ]);

    expect(savedEntities.value).toEqual([
      { id: "/companies/a", pilotTimeExpire: "2026-01-01" },
    ]);
  });

  it("handleUpdateLevelOfAccess re-emits", () => {
    const { api, emit } = mountCompaniesAdmin();
    const dataItem = { "@id": "/c/1" };

    api.handleUpdateLevelOfAccess("public", true, dataItem);

    expect(emit).toHaveBeenCalledWith(
      "update-level-of-access",
      "public",
      true,
      dataItem,
    );
  });
});
