/**
 * AB#20086 — the "-(empty)-" null marker must be offered as an option in every
 * multiple-checkboxes global filter, rendered first and under a translated label.
 *
 * The back end already ships the marker end to end: it emits it in the option list and
 * turns an `eq` on it back into `IS NULL`. These tests pin the front-end half — that the
 * option survives to the screen, sits first, and reaches the user as words rather than as
 * the raw sentinel — while the emitted key stays the untranslated marker.
 */

import { describe, it, expect, vi } from "vitest";
import { mount } from "@vue/test-utils";
import { Checkbox } from "@progress/kendo-vue-inputs";

// `StringUtils` imports the `@/utils` barrel, which cycles through the whole app and leaves
// sibling utils undefined when this component is mounted on its own. Only `isEmpty` is used
// here (to detect an active search box), so stubbing that one leaf keeps the mount isolated
// while `itemsComputed` and the template still run for real.
vi.mock("@/utils/StringUtils", () => ({
  default: { isEmpty: (value: string) => value === "" },
}));

import MultipleCheckboxes from "@/modules/components/MultipleCheckboxes.vue";
import { GLOBAL_FILTER_EMPTY_VALUE } from "@/utils/globalFilterEmptyValue";
import type { CheckboxItem } from "@/types";

type Item = { key: unknown; value: unknown; label?: string; checked: boolean };

function emptyItem(): Item {
  return {
    key: GLOBAL_FILTER_EMPTY_VALUE,
    value: GLOBAL_FILTER_EMPTY_VALUE,
    label: GLOBAL_FILTER_EMPTY_VALUE,
    checked: false,
  };
}

function textItem(value: string): Item {
  return { key: value, value, label: value, checked: false };
}

function mountFilter(items: Item[], isBoxFilter = false) {
  return mount(MultipleCheckboxes, {
    // `CheckboxItem` declares `value: string`, but the box filters are `?int` fields and
    // really do arrive as numbers alongside the string marker. The cast keeps the fixtures
    // faithful to what the API sends rather than to what the type claims.
    props: { items: items as unknown as CheckboxItem[], isBoxFilter },
    global: {
      mocks: { $t: (key: string) => key },
    },
  });
}

/** Labels of the rendered checkboxes, minus the "Check all" selector. */
function optionLabels(wrapper: ReturnType<typeof mountFilter>): unknown[] {
  return wrapper
    .findAllComponents(Checkbox)
    .map((c) => c.props("label"))
    .filter((label) => label !== "global.globalFilters.checkAll");
}

describe("MultipleCheckboxes — empty option (AB#20086)", () => {
  it("should offer the null marker as an option", () => {
    const wrapper = mountFilter([
      textItem("2.00"),
      textItem("3.50"),
      emptyItem(),
    ]);

    expect(optionLabels(wrapper)).toHaveLength(3);
  });

  // The API sends the marker last (ASC order, Postgres sorts NULLs last). Ordering itself is
  // covered by the sortEmptyValueFirst unit tests; this pins the acceptance criterion at the
  // component boundary, so a later change to the template cannot quietly re-sort it away.
  it("should render the null-marker option first", () => {
    const wrapper = mountFilter([
      textItem("2.00"),
      textItem("3.50"),
      emptyItem(),
    ]);

    expect(optionLabels(wrapper)[0]).toBe("global.globalFilters.emptyValue");
  });

  it("should label the null marker with a translation rather than the raw sentinel", () => {
    const wrapper = mountFilter([textItem("2.00"), emptyItem()]);

    const labels = optionLabels(wrapper);
    expect(labels).toContain("global.globalFilters.emptyValue");
    expect(labels).not.toContain(GLOBAL_FILTER_EMPTY_VALUE);
  });

  // Defensive: the box fields discard the marker upstream in mapNumberArrayToItems, so this
  // pairing does not occur today. It guards the label expression itself — if a numeric filter
  // ever does pass the marker through, it must not render as "Box -(empty)-".
  it("should not prefix the null marker with the Box label in box filters", () => {
    const wrapper = mountFilter(
      [
        { key: 1, value: 1, label: "1", checked: false },
        emptyItem(),
      ],
      true,
    );

    expect(optionLabels(wrapper)).toContain("global.globalFilters.emptyValue");
    expect(optionLabels(wrapper)).not.toContain(
      `Box ${GLOBAL_FILTER_EMPTY_VALUE}`,
    );
  });
});
