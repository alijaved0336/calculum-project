/**
 * Tests for row-update emit composable.
 */

import { describe, it, expect, vi } from "vitest";
import { defineComponent, ref } from "vue";
import { mount } from "@vue/test-utils";
import { useClientGridRowUpdate } from "@/modules/components/grid/calculum-grid/composables/useClientGridRowUpdate";

describe("useClientGridRowUpdate", () => {
  it("clears showMenuFilter then emits update-row-data-parent", () => {
    const showMenuFilter = ref<boolean | string>("columnMenuTemplate");
    const emit = vi.fn();
    let api: ReturnType<typeof useClientGridRowUpdate> | undefined;

    mount(
      defineComponent({
        setup() {
          api = useClientGridRowUpdate({ showMenuFilter, emit });
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

  it("clears showMenuFilter then emits update-row-data-notes", () => {
    const showMenuFilter = ref<boolean | string>(true);
    const emit = vi.fn();
    let api: ReturnType<typeof useClientGridRowUpdate> | undefined;

    mount(
      defineComponent({
        setup() {
          api = useClientGridRowUpdate({ showMenuFilter, emit });
          return {};
        },
        template: "<div />",
      }),
    );

    api!.updateRowDataNotes([{ id: 2 }], "notes");

    expect(showMenuFilter.value).toBe(false);
    expect(emit).toHaveBeenCalledWith(
      "update-row-data-notes",
      [{ id: 2 }],
      "notes",
    );
  });
});
