/**
 * Tests for financing entity selection helpers / composable.
 */

import { describe, it, expect, vi } from "vitest";
import { defineComponent, ref } from "vue";
import { mount } from "@vue/test-utils";
import {
  selectGraphqlGridFinancingEntity,
  useGraphqlGridFinancingEntitySelect,
  type UseGraphqlGridFinancingEntitySelectOptions,
} from "@/modules/components/grid/calculum-grid-graphql/composables/useGraphqlGridFinancingEntitySelect";

describe("selectGraphqlGridFinancingEntity", () => {
  it("marks the matching entity selected and clears others", () => {
    const gridData = [
      { entityName: "A", selected: true },
      { entityName: "B", selected: false },
      { entityName: "C", selected: true },
    ];

    selectGraphqlGridFinancingEntity({
      gridData,
      entity: { entityName: "B" },
    });

    expect(gridData.map((row) => row.selected)).toEqual([false, true, false]);
  });
});

describe("useGraphqlGridFinancingEntitySelect", () => {
  it("mutates gridData then emits select event", () => {
    const gridData = ref([
      { entityName: "A", selected: false },
      { entityName: "B", selected: false },
    ]);
    const emit = vi.fn();

    let api:
      | ReturnType<typeof useGraphqlGridFinancingEntitySelect>
      | undefined;

    mount(
      defineComponent({
        setup() {
          const options: UseGraphqlGridFinancingEntitySelectOptions = {
            gridData,
            emit,
          };
          api = useGraphqlGridFinancingEntitySelect(options);
          return {};
        },
        template: "<div />",
      }),
    );

    const entity = { entityName: "A" };
    api!.selectCompanyEntity(entity);

    expect(gridData.value[0].selected).toBe(true);
    expect(gridData.value[1].selected).toBe(false);
    expect(emit).toHaveBeenCalledWith(
      "select-company-entity-financing-data-view",
      entity,
    );
  });
});
