/**
 * Tests for row-update emit composable.
 */

import { describe, it, expect, vi } from "vitest";
import { defineComponent, ref } from "vue";
import { mount } from "@vue/test-utils";
import { useGraphqlGridRowUpdate } from "@/modules/components/grid/calculum-grid-graphql/composables/useGraphqlGridRowUpdate";

describe("useGraphqlGridRowUpdate", () => {
  it("clears showMenuFilter then emits update-row-data-parent", () => {
    const showMenuFilter = ref<boolean | string>("columnMenuTemplate");
    const emit = vi.fn();
    let api: ReturnType<typeof useGraphqlGridRowUpdate> | undefined;

    mount(
      defineComponent({
        setup() {
          api = useGraphqlGridRowUpdate({ showMenuFilter, emit });
          return {};
        },
        template: "<div />",
      }),
    );

    api!.updaterowData([{ id: 1 }], "harmonization");

    expect(showMenuFilter.value).toBe(false);
    expect(emit).toHaveBeenCalledWith(
      "update-row-data-parent",
      [{ id: 1 }],
      "harmonization",
    );
  });
});
