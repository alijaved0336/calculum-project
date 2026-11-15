/**
 * Tests for useClientGridColumnMenus — header filter active class and
 * thin menu action emits for CalculumGrid.
 */

import { describe, it, expect, vi } from "vitest";
import { defineComponent, ref } from "vue";
import { mount } from "@vue/test-utils";
import type { ClientGridColumn } from "@/modules/components/grid/calculum-grid/composables/useClientGridColumnCache";
import {
  findClientGridColumnByField,
  stampClientGridColumnHeaderFilterClass,
  useClientGridColumnMenus,
  type UseClientGridColumnMenusOptions,
} from "@/modules/components/grid/calculum-grid/composables/useClientGridColumnMenus";

function mountColumnMenus(
  overrides: Partial<UseClientGridColumnMenusOptions> = {},
) {
  const childrenColumns = ref(false);
  const columnsToShow = ref<ClientGridColumn[]>([]);
  const defaultColumns = ref<ClientGridColumn[]>([
    { field: "name", title: "Name", headerClassName: "inactive" },
    { field: "spend", title: "Spend", headerClassName: "inactive" },
  ]);
  const allSelected = ref(false);
  const showMenuFilter = ref<"columnMenuTemplateActions" | false>(
    "columnMenuTemplateActions",
  );
  const levelOfGrid = ref("spends");
  const emit = vi.fn();

  const options: UseClientGridColumnMenusOptions = {
    childrenColumns,
    columnsToShow,
    defaultColumns,
    allSelected,
    showMenuFilter,
    levelOfGrid,
    emit,
    ...overrides,
  };

  let api: ReturnType<typeof useClientGridColumnMenus> | undefined;

  mount(
    defineComponent({
      setup() {
        api = useClientGridColumnMenus(options);
        return {};
      },
      template: "<div />",
    }),
  );

  return {
    api: api!,
    childrenColumns,
    columnsToShow,
    defaultColumns,
    allSelected,
    showMenuFilter,
    levelOfGrid,
    emit,
  };
}

describe("findClientGridColumnByField / stampClientGridColumnHeaderFilterClass", () => {
  it("finds flat columns on defaultColumns", () => {
    const defaults: ClientGridColumn[] = [
      { field: "name" },
      { field: "spend" },
    ];
    expect(
      findClientGridColumnByField([], defaults, false, "spend")?.field,
    ).toBe("spend");
  });

  it("finds nested children on columnsToShow when childrenColumns", () => {
    const child: ClientGridColumn = { field: "childA" };
    const columnsToShow: ClientGridColumn[] = [
      { title: "Group", children: [child] },
    ];
    expect(
      findClientGridColumnByField(columnsToShow, [], true, "childA"),
    ).toBe(child);
  });

  it("stamps active/inactive on flat columns and clears all when field null", () => {
    const defaults: ClientGridColumn[] = [
      { field: "name", headerClassName: "inactive" },
      { field: "spend", headerClassName: "inactive" },
    ];
    stampClientGridColumnHeaderFilterClass([], defaults, false, "name", true);
    expect(defaults[0].headerClassName).toBe("active");
    expect(defaults[1].headerClassName).toBe("inactive");

    stampClientGridColumnHeaderFilterClass([], defaults, false, null, false);
    expect(defaults.every((c) => c.headerClassName === "inactive")).toBe(true);
  });

  it("stamps nested children headers when childrenColumns", () => {
    const child: ClientGridColumn = {
      field: "childA",
      headerClassName: "inactive",
    };
    const columnsToShow: ClientGridColumn[] = [
      { title: "Group", children: [child] },
    ];
    stampClientGridColumnHeaderFilterClass(
      columnsToShow,
      [],
      true,
      "childA",
      true,
    );
    expect(child.headerClassName).toBe("active");

    stampClientGridColumnHeaderFilterClass(
      columnsToShow,
      [],
      true,
      null,
      false,
    );
    expect(child.headerClassName).toBe("inactive");
  });
});

describe("sendColumnFiltered", () => {
  it("marks matching column active when filterGroupByField finds filters", () => {
    const { api, defaultColumns } = mountColumnMenus();
    // Kendo expects a nested CompositeFilterDescriptor group for filterGroupByField
    api.sendColumnFiltered(
      {
        logic: "and",
        filters: [
          {
            filters: [{ field: "name", operator: "eq", value: "x" }],
          },
        ],
      },
      { field: "name" },
    );
    expect(defaultColumns.value[0].headerClassName).toBe("active");
    expect(defaultColumns.value[1].headerClassName).toBe("inactive");
  });

  it("clears all header classes when filters are null", () => {
    const { api, defaultColumns } = mountColumnMenus();
    defaultColumns.value[0].headerClassName = "active";
    api.sendColumnFiltered(null, null);
    expect(
      defaultColumns.value.every((col) => col.headerClassName === "inactive"),
    ).toBe(true);
  });
});

describe("menu action emits", () => {
  it("clears selection and menu then emits grid-exclude / approach / remove / add", () => {
    const { api, allSelected, showMenuFilter, emit } = mountColumnMenus();
    allSelected.value = true;

    api.gridExclude("exclude");
    expect(allSelected.value).toBe(false);
    expect(showMenuFilter.value).toBe(false);
    expect(emit).toHaveBeenCalledWith("grid-exclude", "exclude");

    showMenuFilter.value = "columnMenuTemplateActions";
    allSelected.value = true;
    api.gridApproach("approach");
    expect(emit).toHaveBeenCalledWith("grid-approach", "approach");

    showMenuFilter.value = "columnMenuTemplateActions";
    allSelected.value = true;
    api.gridRemoveGroup("group");
    expect(emit).toHaveBeenCalledWith("grid-remove", "group");

    showMenuFilter.value = "columnMenuTemplateActions";
    allSelected.value = true;
    api.gridAddGroup("id", "type", "harm");
    expect(emit).toHaveBeenCalledWith("grid-add-group", "id", "type", "harm");
  });

  it("emits show-target-modal with levelOfGrid from options", () => {
    const { api, emit, levelOfGrid } = mountColumnMenus();
    levelOfGrid.value = "suppliers";
    api.showTargetModal("ignored");
    expect(emit).toHaveBeenCalledWith("show-target-modal", "suppliers");
  });

  it("emits match-remove, harmonization modal, and negotiation status", () => {
    const { api, emit, allSelected, showMenuFilter } = mountColumnMenus();
    api.gridMatchRemove();
    expect(emit).toHaveBeenCalledWith("grid-match-remove");

    api.closeHarmonizationModal("level", ["u1"], "entity");
    expect(emit).toHaveBeenCalledWith(
      "show-harmonization-modal",
      "level",
      ["u1"],
      "entity",
    );

    allSelected.value = true;
    showMenuFilter.value = "columnMenuTemplateActions";
    api.negotiationStatusOnChanged("open");
    expect(allSelected.value).toBe(false);
    expect(showMenuFilter.value).toBe(false);
    expect(emit).toHaveBeenCalledWith("negotiation-status-changed", "open");
  });
});
