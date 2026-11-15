/**
 * Tests for useGraphqlGridExpand — expand / detail mechanism for CalculumGridGraphql.
 * Does not mount CalculumGridGraphql.vue (DistinctValues spec documents why).
 */

import { describe, it, expect } from "vitest";
import { defineComponent, ref } from "vue";
import { mount } from "@vue/test-utils";
import {
  GRAPHQL_GRID_EXPAND_FIELD,
  graphqlGridDetailName,
  graphqlGridExpandField,
  useGraphqlGridExpand,
  type GraphqlGridExpandableItem,
  type UseGraphqlGridExpandOptions,
} from "@/modules/components/grid/calculum-grid-graphql/composables/useGraphqlGridExpand";

function mountExpand(
  overrides: Partial<UseGraphqlGridExpandOptions> = {},
) {
  const isExpanded = ref(false);
  const nameTemplateChild = ref("detailTemplateSupplier");

  const options: UseGraphqlGridExpandOptions = {
    isExpanded,
    nameTemplateChild,
    ...overrides,
  };

  let api: ReturnType<typeof useGraphqlGridExpand> | undefined;

  const wrapper = mount(
    defineComponent({
      setup() {
        api = useGraphqlGridExpand(options);
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

describe("graphqlGridExpandField", () => {
  it.each([
    ["true", true, GRAPHQL_GRID_EXPAND_FIELD],
    ["false", false, undefined],
    ["undefined", undefined, undefined],
  ] as const)("%s → %s", (_label, isExpanded, expected) => {
    expect(graphqlGridExpandField(isExpanded)).toBe(expected);
  });
});

describe("graphqlGridDetailName", () => {
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
    expect(graphqlGridDetailName(isExpanded, name)).toBe(expected);
  });
});

describe("useGraphqlGridExpand", () => {
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

      expect(api.expandField.value).toBe(GRAPHQL_GRID_EXPAND_FIELD);
      expect(api.detailName.value).toBe(slotName);
    },
  );

  it.each([
    ["expand", false, true],
    ["collapse", true, false],
  ] as const)("expandChange %s the expand field", (_label, before, value) => {
    const row: GraphqlGridExpandableItem = { expanded: before };
    const { api } = mountExpand({ isExpanded: ref(true) });

    api.expandChange({
      dataItem: row,
      value,
      target: { $props: { expandField: GRAPHQL_GRID_EXPAND_FIELD } },
    });

    expect(row.expanded).toBe(value);
  });
});
