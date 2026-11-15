import {
  computed,
  toValue,
  type ComputedRef,
  type MaybeRefOrGetter,
} from "vue";
import { useUser } from "@/composables";

/** Sections that never apply pilot blur on Graphql grid rows. */
export const GRAPHQL_GRID_NO_BLUR_SECTIONS = [
  "compareCompany",
  "adminBackend",
  "home",
] as const;

export type GraphqlGridPilotBlurRowProps = {
  dataItem: {
    isPilot?: boolean;
    [key: string]: unknown;
  };
};

export interface GraphqlGridPilotBlurSuffixInput {
  sectionAllowsBlur: boolean;
  disableBlurEffect: boolean;
  editList: boolean;
  isPilotAccount: boolean;
  rowIsPilot: boolean;
}

/**
 * Whether the grid section is allowed to apply pilot blur.
 */
export function graphqlGridSectionAllowsBlur(section: string): boolean {
  return !(GRAPHQL_GRID_NO_BLUR_SECTIONS as readonly string[]).includes(
    section,
  );
}

/**
 * CSS class suffix for pilot blur, matching historical SFC branches.
 */
export function graphqlGridPilotBlurSuffix(
  input: GraphqlGridPilotBlurSuffixInput,
): string {
  if (
    !input.sectionAllowsBlur ||
    input.disableBlurEffect ||
    input.editList
  ) {
    return "";
  }

  if (input.isPilotAccount && !input.rowIsPilot) {
    return " blur-effect";
  }

  return "";
}

export interface UseGraphqlGridPilotBlurOptions {
  section: MaybeRefOrGetter<string>;
  disableBlurEffect: MaybeRefOrGetter<boolean>;
  editList: MaybeRefOrGetter<boolean | undefined>;
}

/**
 * Pilot-account blur gating for CalculumGridGraphql row-render.
 * Domain row-class builder receives the resolved suffix from here.
 */
export function useGraphqlGridPilotBlur(
  options: UseGraphqlGridPilotBlurOptions,
) {
  const { isPilotAccount } = useUser();

  const verifySectionTosetBlurEffect: ComputedRef<boolean> = computed(() =>
    graphqlGridSectionAllowsBlur(toValue(options.section)),
  );

  function verifyIfPilotAccountAddBlurEffect(
    rowProps: GraphqlGridPilotBlurRowProps,
  ): string {
    return graphqlGridPilotBlurSuffix({
      sectionAllowsBlur: verifySectionTosetBlurEffect.value,
      disableBlurEffect: toValue(options.disableBlurEffect),
      editList: Boolean(toValue(options.editList)),
      isPilotAccount: isPilotAccount(),
      rowIsPilot: Boolean(rowProps.dataItem.isPilot),
    });
  }

  return {
    verifySectionTosetBlurEffect,
    verifyIfPilotAccountAddBlurEffect,
  };
}
