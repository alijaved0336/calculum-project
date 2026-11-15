/**
 * Tests for Graphql grid pilot blur helpers / composable.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { defineComponent, ref } from "vue";
import { mount } from "@vue/test-utils";
import {
  GRAPHQL_GRID_NO_BLUR_SECTIONS,
  graphqlGridPilotBlurSuffix,
  graphqlGridSectionAllowsBlur,
  useGraphqlGridPilotBlur,
  type UseGraphqlGridPilotBlurOptions,
} from "@/modules/components/grid/calculum-grid-graphql/composables/useGraphqlGridPilotBlur";

const mockIsPilotAccount = vi.fn(() => false);

vi.mock("@/composables", () => ({
  useUser: () => ({
    isPilotAccount: mockIsPilotAccount,
  }),
}));

function mountPilotBlur(
  overrides: Partial<UseGraphqlGridPilotBlurOptions> = {},
) {
  const section = ref("analyze");
  const disableBlurEffect = ref(false);
  const editList = ref(false);

  const options: UseGraphqlGridPilotBlurOptions = {
    section,
    disableBlurEffect,
    editList,
    ...overrides,
  };

  let api: ReturnType<typeof useGraphqlGridPilotBlur> | undefined;

  const wrapper = mount(
    defineComponent({
      setup() {
        api = useGraphqlGridPilotBlur(options);
        return {};
      },
      template: "<div />",
    }),
  );

  return {
    api: api!,
    section,
    disableBlurEffect,
    editList,
    wrapper,
  };
}

describe("graphqlGridSectionAllowsBlur", () => {
  it.each([
    ...GRAPHQL_GRID_NO_BLUR_SECTIONS.map(
      (section) => [section, false] as const,
    ),
    ["analyze", true],
    ["plan", true],
  ])("%s → %s", (section, expected) => {
    expect(graphqlGridSectionAllowsBlur(section)).toBe(expected);
  });
});

describe("graphqlGridPilotBlurSuffix", () => {
  it.each([
    [
      "section disallows",
      {
        sectionAllowsBlur: false,
        disableBlurEffect: false,
        editList: false,
        isPilotAccount: true,
        rowIsPilot: false,
      },
      "",
    ],
    [
      "disableBlurEffect",
      {
        sectionAllowsBlur: true,
        disableBlurEffect: true,
        editList: false,
        isPilotAccount: true,
        rowIsPilot: false,
      },
      "",
    ],
    [
      "editList",
      {
        sectionAllowsBlur: true,
        disableBlurEffect: false,
        editList: true,
        isPilotAccount: true,
        rowIsPilot: false,
      },
      "",
    ],
    [
      "pilot account non-pilot row",
      {
        sectionAllowsBlur: true,
        disableBlurEffect: false,
        editList: false,
        isPilotAccount: true,
        rowIsPilot: false,
      },
      " blur-effect",
    ],
    [
      "pilot account pilot row",
      {
        sectionAllowsBlur: true,
        disableBlurEffect: false,
        editList: false,
        isPilotAccount: true,
        rowIsPilot: true,
      },
      "",
    ],
    [
      "non-pilot account",
      {
        sectionAllowsBlur: true,
        disableBlurEffect: false,
        editList: false,
        isPilotAccount: false,
        rowIsPilot: false,
      },
      "",
    ],
  ] as const)("%s", (_label, input, expected) => {
    expect(graphqlGridPilotBlurSuffix(input)).toBe(expected);
  });
});

describe("useGraphqlGridPilotBlur", () => {
  beforeEach(() => {
    mockIsPilotAccount.mockReset();
    mockIsPilotAccount.mockReturnValue(false);
  });

  it("returns empty suffix when section is home", () => {
    mockIsPilotAccount.mockReturnValue(true);
    const { api } = mountPilotBlur({
      section: ref("home"),
    });

    expect(
      api.verifyIfPilotAccountAddBlurEffect({
        dataItem: { isPilot: false },
      }),
    ).toBe("");
    expect(api.verifySectionTosetBlurEffect.value).toBe(false);
  });

  it("returns blur-effect for pilot account on non-pilot row", () => {
    mockIsPilotAccount.mockReturnValue(true);
    const { api } = mountPilotBlur();

    expect(
      api.verifyIfPilotAccountAddBlurEffect({
        dataItem: { isPilot: false },
      }),
    ).toBe(" blur-effect");
  });
});
