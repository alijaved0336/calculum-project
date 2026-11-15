/**
 * Tests for useClientGridExpand — expand / detail mechanism for CalculumGrid.
 * Does not mount CalculumGrid.vue (DistinctValues spec documents why).
 */

import { describe, it, expect } from "vitest";
import { defineComponent, ref } from "vue";
import { mount } from "@vue/test-utils";
import {
  CLIENT_GRID_EXPAND_FIELD,
  clientGridDetailName,
  clientGridExpandField,
  useClientGridExpand,
  type ClientGridExpandableItem,
  type UseClientGridExpandOptions,
} from "@/modules/components/grid/calculum-grid/composables/useClientGridExpand";

function mountExpand(
  overrides: Partial<UseClientGridExpandOptions> = {},
) {
  const isExpanded = ref(false);
  const nameTemplateChild = ref("detailTemplateSupplier");

  const options: UseClientGridExpandOptions = {
    isExpanded,
    nameTemplateChild,
    ...overrides,
  };

  let api: ReturnType<typeof useClientGridExpand> | undefined;

  const wrapper = mount(
    defineComponent({
      setup() {
        api = useClientGridExpand(options);
        return {};
      },
      template: "<div />",
    }),
  );

  return {
    api: api!,
    isExpanded,
    nameTemplateChild,
    wrapper,
  };
}

describe("clientGridExpandField", () => {
  it.each([
    ["true", true, CLIENT_GRID_EXPAND_FIELD],
    ["false", false, undefined],
    ["undefined", undefined, undefined],
  ] as const)("%s → %s", (_label, isExpanded, expected) => {
    expect(clientGridExpandField(isExpanded)).toBe(expected);
  });
});

describe("clientGridDetailName", () => {
  it.each([
    [
      "expanded with slot name",
      true,
      "detailTemplateSupplier",
      "detailTemplateSupplier",
    ],
    ["expanded with empty name", true, "", ""],
    ["not expanded", false, "detailTemplateSupplier", undefined],
    ["undefined isExpanded", undefined, "detailTemplateSupplier", undefined],
  ] as const)("%s", (_label, isExpanded, name, expected) => {
    expect(clientGridDetailName(isExpanded, name)).toBe(expected);
  });
});

describe("useClientGridExpand", () => {
  it("when isExpanded is false, expand-field and detail name are undefined", () => {
    const { api } = mountExpand({
      isExpanded: ref(false),
      nameTemplateChild: ref("detailTemplateSupplier"),
    });

    expect(api.expandField.value).toBeUndefined();
    expect(api.detailName.value).toBeUndefined();
  });

  it.each([
    ["detailTemplateSupplier"],
    ["detailTemplateParentAnalyze"],
    ["detailPlanSuppliersGraphql"],
  ] as const)(
    "when isExpanded is true, binds expand-field and %s",
    (slotName) => {
      const { api } = mountExpand({
        isExpanded: ref(true),
        nameTemplateChild: ref(slotName),
      });

      expect(api.expandField.value).toBe(CLIENT_GRID_EXPAND_FIELD);
      expect(api.detailName.value).toBe(slotName);
    },
  );

  it.each([
    ["expand", false, true],
    ["collapse", true, false],
  ] as const)("expandChange %s the expand field", (_label, before, value) => {
    const row: ClientGridExpandableItem = { expanded: before };
    const { api } = mountExpand({ isExpanded: ref(true) });

    api.expandChange({
      dataItem: row,
      value,
      target: { $props: { expandField: CLIENT_GRID_EXPAND_FIELD } },
    });

    expect(row.expanded).toBe(value);
  });
});
