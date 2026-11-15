/**
 * Tests for useGraphqlGridTabs — TabStrip titles, selected index, and
 * change-tab-from-grid for CalculumGridGraphql.
 * Does not mount CalculumGridGraphql.vue (DistinctValues spec documents why).
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
  GRAPHQL_GRID_TAB_CONTENT_CLASS,
  buildGraphqlGridTabs,
  useGraphqlGridTabs,
  type GraphqlGridTabLabels,
  type UseGraphqlGridTabsOptions,
} from "@/modules/components/grid/calculum-grid-graphql/composables/useGraphqlGridTabs";

const labels: GraphqlGridTabLabels = {
  spends: "Spends",
  suppliers: "Suppliers",
  ultimateParent: "Ultimate Parent",
  salesLines: "Sales Lines",
  buyers: "Buyers",
};

function titlesOf(
  onlyShowActiveTab: boolean,
  selectedTabFromView: number,
  isReceivable: boolean,
) {
  return buildGraphqlGridTabs({
    onlyShowActiveTab,
    selectedTabFromView,
    isReceivable,
    labels,
  }).map((tab) => tab.title);
}

function mountTabs(overrides: Partial<UseGraphqlGridTabsOptions> = {}) {
  const onlyShowActiveTab = ref(false);
  const selectedTabFromView = ref(0);
  const isReceivable = ref(false);
  const emit = vi.fn();

  const options: UseGraphqlGridTabsOptions = {
    onlyShowActiveTab,
    selectedTabFromView,
    isReceivable,
    emit,
    ...overrides,
  };

  let api: ReturnType<typeof useGraphqlGridTabs> | undefined;

  const wrapper = mount(
    defineComponent({
      setup() {
        api = useGraphqlGridTabs(options);
        return {};
      },
      template: "<div />",
    }),
  );

  return {
    api: api!,
    onlyShowActiveTab,
    selectedTabFromView,
    isReceivable,
    emit,
    wrapper,
  };
}

describe("buildGraphqlGridTabs", () => {
  it("uses classContentHide on every tab", () => {
    const tabs = buildGraphqlGridTabs({
      onlyShowActiveTab: false,
      selectedTabFromView: 0,
      isReceivable: false,
      labels,
    });

    expect(tabs.map((tab) => tab.contentClassName)).toEqual([
      GRAPHQL_GRID_TAB_CONTENT_CLASS,
      GRAPHQL_GRID_TAB_CONTENT_CLASS,
      GRAPHQL_GRID_TAB_CONTENT_CLASS,
    ]);
  });

  it.each([
    [
      "all three AP tabs",
      false,
      0,
      false,
      ["Spends", "Suppliers", "Ultimate Parent"],
    ],
    ["onlyShowActiveTab index 0", true, 0, false, ["Spends"]],
    ["onlyShowActiveTab index 1", true, 1, false, ["Suppliers"]],
    ["onlyShowActiveTab index 2", true, 2, false, ["Ultimate Parent"]],
    [
      "all three receivable tabs",
      false,
      0,
      true,
      ["Sales Lines", "Buyers", "Ultimate Parent"],
    ],
    ["receivable onlyShowActiveTab index 0", true, 0, true, ["Sales Lines"]],
    ["receivable onlyShowActiveTab index 1", true, 1, true, ["Buyers"]],
    [
      "receivable onlyShowActiveTab index 2",
      true,
      2,
      true,
      ["Ultimate Parent"],
    ],
  ] as const)(
    "%s",
    (_label, onlyShowActiveTab, selectedTabFromView, isReceivable, expected) => {
      expect(
        titlesOf(onlyShowActiveTab, selectedTabFromView, isReceivable),
      ).toEqual([...expected]);
    },
  );
});

describe("useGraphqlGridTabs", () => {
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

  it.each([
    [0, "global.spends"],
    [1, "global.suppliers"],
    [2, "global.ultimateParent"],
  ] as const)(
    "onlyShowActiveTab index %s uses the AP i18n title",
    (index, title) => {
      const { api } = mountTabs({
        onlyShowActiveTab: ref(true),
        selectedTabFromView: ref(index),
        isReceivable: ref(false),
      });

      expect(api.tabs.value.map((tab) => tab.title)).toEqual([title]);
    },
  );

  it("uses receivable titles when isReceivable is true", () => {
    const { api } = mountTabs({
      isReceivable: ref(true),
    });

    expect(api.tabs.value.map((tab) => tab.title)).toEqual([
      "Sales Lines",
      "Buyers",
      "global.ultimateParent",
    ]);
  });
});
