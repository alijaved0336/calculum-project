/**
 * Tests for column filter-change header class + reprocess wiring.
 */

import { describe, it, expect, vi } from "vitest";
import { defineComponent, ref } from "vue";
import { mount } from "@vue/test-utils";
import { useClientGridFilterChange } from "@/modules/components/grid/calculum-grid/composables/useClientGridFilterChange";

vi.mock("@progress/kendo-vue-grid", () => ({
  filterGroupByField: vi.fn((field: string, filter: unknown) => {
    void field;
    return Boolean(filter);
  }),
}));

describe("useClientGridFilterChange", () => {
  it("sets headerClassName active when filter applies, then reprocesses", () => {
    const columns = ref([
      { field: "name", headerClassName: "" },
      { field: "status", headerClassName: "" },
    ]);
    const setFilterAndReprocess = vi.fn();
    let api: ReturnType<typeof useClientGridFilterChange> | undefined;

    mount(
      defineComponent({
        setup() {
          api = useClientGridFilterChange({
            columns,
            setFilterAndReprocess,
          });
          return {};
        },
        template: "<div />",
      }),
    );

    const filter = { filters: [{ field: "name" }], logic: "and" };
    api!.onFilterChange({
      event: { field: "name" },
      filter,
    });

    expect(columns.value[0].headerClassName).toBe("active");
    expect(columns.value[1].headerClassName).toBe("");
    expect(setFilterAndReprocess).toHaveBeenCalledWith(filter);
  });

  it("clears headerClassName when filter is inactive", () => {
    const columns = ref([{ field: "name", headerClassName: "active" }]);
    const setFilterAndReprocess = vi.fn();
    let api: ReturnType<typeof useClientGridFilterChange> | undefined;

    mount(
      defineComponent({
        setup() {
          api = useClientGridFilterChange({
            columns,
            setFilterAndReprocess,
          });
          return {};
        },
        template: "<div />",
      }),
    );

    api!.onFilterChange({
      event: { field: "name" },
      filter: null,
    });

    expect(columns.value[0].headerClassName).toBe("");
    expect(setFilterAndReprocess).toHaveBeenCalledWith(null);
  });
});
