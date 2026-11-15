/**
 * Tests for recalculation modal composable.
 */

import { describe, it, expect, vi } from "vitest";
import { defineComponent } from "vue";
import { mount } from "@vue/test-utils";
import { useGraphqlGridRecalculationModal } from "@/modules/components/grid/calculum-grid-graphql/composables/useGraphqlGridRecalculationModal";

describe("useGraphqlGridRecalculationModal", () => {
  it("shows and hides the modal; hide opens programs panel", () => {
    const openProgramsPanel = vi.fn();
    let api: ReturnType<typeof useGraphqlGridRecalculationModal> | undefined;

    mount(
      defineComponent({
        setup() {
          api = useGraphqlGridRecalculationModal({ openProgramsPanel });
          return {};
        },
        template: "<div />",
      }),
    );

    expect(api!.showModalRecalculation.value).toBe(false);

    api!.showRecalculation();
    expect(api!.showModalRecalculation.value).toBe(true);

    api!.hideModalRecalculation();
    expect(api!.showModalRecalculation.value).toBe(false);
    expect(openProgramsPanel).toHaveBeenCalledTimes(1);
  });
});
