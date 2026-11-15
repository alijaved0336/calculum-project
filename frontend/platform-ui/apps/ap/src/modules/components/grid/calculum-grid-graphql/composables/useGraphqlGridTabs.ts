import {
  computed,
  ref,
  toValue,
  watch,
  type MaybeRefOrGetter,
} from "vue";
import { useI18n } from "vue-i18n";

/** Kendo TabStrip pane class used to hide tab body content. */
export const GRAPHQL_GRID_TAB_CONTENT_CLASS = "classContentHide";

export type GraphqlGridTab = {
  title: string;
  contentClassName: string;
};

export interface GraphqlGridTabLabels {
  spends: string;
  suppliers: string;
  ultimateParent: string;
  salesLines: string;
  buyers: string;
}

export interface BuildGraphqlGridTabsInput {
  onlyShowActiveTab: boolean;
  selectedTabFromView: number;
  isReceivable: boolean;
  labels: GraphqlGridTabLabels;
}

export type GraphqlGridTabsEmit = (
  event: "change-tab-from-grid",
  ...args: unknown[]
) => void;

export interface GraphqlGridTabSelectEvent {
  selected: number;
}

export interface UseGraphqlGridTabsOptions {
  onlyShowActiveTab: MaybeRefOrGetter<boolean>;
  selectedTabFromView: MaybeRefOrGetter<number>;
  isReceivable: MaybeRefOrGetter<boolean>;
  emit: GraphqlGridTabsEmit;
}

function tab(title: string): GraphqlGridTab {
  return {
    title,
    contentClassName: GRAPHQL_GRID_TAB_CONTENT_CLASS,
  };
}

/**
 * TabStrip titles for CalculumGridGraphql.
 * Receivable screens swap Spends/Suppliers for Sales Lines/Buyers.
 * `onlyShowActiveTab` keeps a single tab matching `selectedTabFromView`.
 */
export function buildGraphqlGridTabs(
  input: BuildGraphqlGridTabsInput,
): GraphqlGridTab[] {
  const spendTab = [
    tab(input.isReceivable ? input.labels.salesLines : input.labels.spends),
  ];
  const supplierTab = [
    tab(input.isReceivable ? input.labels.buyers : input.labels.suppliers),
  ];
  const parentTab = [tab(input.labels.ultimateParent)];

  if (!input.onlyShowActiveTab) {
    return [...spendTab, ...supplierTab, ...parentTab];
  }

  if (input.selectedTabFromView === 0) {
    return [...spendTab];
  }
  if (input.selectedTabFromView === 1) {
    return [...supplierTab];
  }
  if (input.selectedTabFromView === 2) {
    return [...parentTab];
  }

  return [];
}

/**
 * TabStrip selected index and titles for CalculumGridGraphql.
 * Toolbar markup stays on the facade; this owns titles, `selectedTabIndex`,
 * and `change-tab-from-grid`. Entity-cell `change-tab` stays on the SFC.
 */
export function useGraphqlGridTabs(options: UseGraphqlGridTabsOptions) {
  const translate = useI18n({ warnHtmlMessage: false, useScope: "global" });

  const labels = computed<GraphqlGridTabLabels>(() => ({
    spends: translate.t("global.spends"),
    suppliers: translate.t("global.suppliers"),
    ultimateParent: translate.t("global.ultimateParent"),
    salesLines: "Sales Lines",
    buyers: "Buyers",
  }));

  const tabs = computed(() =>
    buildGraphqlGridTabs({
      onlyShowActiveTab: toValue(options.onlyShowActiveTab),
      selectedTabFromView: toValue(options.selectedTabFromView),
      isReceivable: toValue(options.isReceivable),
      labels: labels.value,
    }),
  );

  const selectedTabIndex = ref(toValue(options.selectedTabFromView));

  watch(
    () => toValue(options.selectedTabFromView),
    (index) => {
      selectedTabIndex.value = index;
    },
  );

  function onSelect(event: GraphqlGridTabSelectEvent) {
    selectedTabIndex.value = event.selected;
    options.emit("change-tab-from-grid", event.selected);
  }

  return {
    selectedTabIndex,
    tabs,
    onSelect,
  };
}
