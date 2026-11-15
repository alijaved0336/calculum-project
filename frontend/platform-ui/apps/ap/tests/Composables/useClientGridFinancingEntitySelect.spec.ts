/**
 * Tests for financing entity selection helpers / composable.
 */

import { describe, it, expect, vi } from "vitest";
import { defineComponent, ref } from "vue";
import { mount } from "@vue/test-utils";
import {
  selectClientGridFinancingEntity,
  useClientGridFinancingEntitySelect,
  type UseClientGridFinancingEntitySelectOptions,
} from "@/modules/components/grid/calculum-grid/composables/useClientGridFinancingEntitySelect";

describe("selectClientGridFinancingEntity", () => {
  it("marks the matching entity selected and clears others", () => {
    const gridData = [
      { name: "A", selected: true },
      { name: "B", selected: false },
      { name: "C", selected: true },
    ];

    selectClientGridFinancingEntity({
      gridData,
      entity: { name: "B" },
    });

    expect(gridData.map((row) => row.selected)).toEqual([false, true, false]);
  });
});

describe("useClientGridFinancingEntitySelect", () => {
  it("mutates gridData then emits select event", () => {
    const gridData = ref([
      { name: "A", selected: false },
      { name: "B", selected: false },
    ]);
    const emit = vi.fn();

    let api: ReturnType<typeof useClientGridFinancingEntitySelect> | undefined;

    mount(
      defineComponent({
        setup() {
          const options: UseClientGridFinancingEntitySelectOptions = {
            gridData,
            emit,
          };
          api = useClientGridFinancingEntitySelect(options);
          return {};
        },
        template: "<div />",
      }),
    );

    const entity = { name: "A" };
    api!.selectCompanyEntity(entity);

    expect(gridData.value[0].selected).toBe(true);
    expect(gridData.value[1].selected).toBe(false);
    expect(emit).toHaveBeenCalledWith(
      "select-company-entity-financing-data-view",
      entity,
    );
  });
});
