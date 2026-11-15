/**
 * Tests for useClientGridTabs — TabStrip titles, selected index, and
 * change-tab-from-grid for CalculumGrid. Does not mount CalculumGrid.vue.
 */

import { describe, it, expect, vi } from "vitest";
import { defineComponent, ref } from "vue";
import { mount } from "@vue/test-utils";

vi.mock("vue-i18n", async (importOriginal) => {
  const actual = await importOriginal<typeof import("vue-i18n")>();
  return {
    ...actual,
    useI18n: () => ({
      t: (key: string) => key,
    }),
  };
});

import {
  CLIENT_GRID_TAB_CONTENT_CLASS,
  buildClientGridTabs,
  useClientGridTabs,
  type ClientGridTabLabels,
  type UseClientGridTabsOptions,
} from "@/modules/components/grid/calculum-grid/composables/useClientGridTabs";

const labels: ClientGridTabLabels = {
  spends: "Spends",
  suppliers: "Suppliers",
  ultimateParent: "Ultimate Parent",
};

function mountTabs(overrides: Partial<UseClientGridTabsOptions> = {}) {
  const selectedTabFromView = ref(0);
  const emit = vi.fn();

  const options: UseClientGridTabsOptions = {
    selectedTabFromView,
    emit,
    ...overrides,
  };

  let api: ReturnType<typeof useClientGridTabs> | undefined;

  const wrapper = mount(
    defineComponent({
      setup() {
        api = useClientGridTabs(options);
        return {};
      },
      template: "<div />",
    }),
  );

  return {
    api: api!,
    selectedTabFromView,
    emit,
    wrapper,
  };
}

describe("buildClientGridTabs", () => {
  it("returns the three AP tabs with classContentHide", () => {
    const tabs = buildClientGridTabs(labels);

    expect(tabs.map((tab) => tab.title)).toEqual([
      "Spends",
      "Suppliers",
      "Ultimate Parent",
    ]);
    expect(tabs.map((tab) => tab.contentClassName)).toEqual([
      CLIENT_GRID_TAB_CONTENT_CLASS,
      CLIENT_GRID_TAB_CONTENT_CLASS,
      CLIENT_GRID_TAB_CONTENT_CLASS,
    ]);
  });
});

describe("useClientGridTabs", () => {
  it("starts selectedTabIndex from selectedTabFromView", () => {
    const { api } = mountTabs({
      selectedTabFromView: ref(2),
    });

    expect(api.selectedTabIndex.value).toBe(2);
  });

  it("syncs selectedTabIndex when selectedTabFromView changes", async () => {
    const selectedTabFromView = ref(0);
    const { api } = mountTabs({ selectedTabFromView });

    selectedTabFromView.value = 1;
    await Promise.resolve();

    expect(api.selectedTabIndex.value).toBe(1);
  });

  it("onSelect updates index and emits change-tab-from-grid", () => {
    const { api, emit } = mountTabs({
      selectedTabFromView: ref(0),
    });

    api.onSelect({ selected: 2 });

    expect(api.selectedTabIndex.value).toBe(2);
    expect(emit).toHaveBeenCalledTimes(1);
    expect(emit).toHaveBeenCalledWith("change-tab-from-grid", 2);
  });

  it("does not emit change-tab from TabStrip onSelect", () => {
    const { api, emit } = mountTabs();

    api.onSelect({ selected: 1 });

    expect(emit).not.toHaveBeenCalledWith("change-tab", expect.anything());
  });

  it("uses i18n titles for the three AP tabs", () => {
    const { api } = mountTabs();

    expect(api.tabs.value.map((tab) => tab.title)).toEqual([
      "global.spends",
      "global.suppliers",
      "global.ultimateParent",
    ]);
  });
});
