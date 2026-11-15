import {
  computed,
  ref,
  toValue,
  watch,
  type MaybeRefOrGetter,
} from "vue";
import { useI18n } from "vue-i18n";

/** Kendo TabStrip pane class used to hide tab body content. */
export const CLIENT_GRID_TAB_CONTENT_CLASS = "classContentHide";

export type ClientGridTab = {
  title: string;
  contentClassName: string;
};

export interface ClientGridTabLabels {
  spends: string;
  suppliers: string;
  ultimateParent: string;
}

export type ClientGridTabsEmit = (
  event: "change-tab-from-grid",
  ...args: unknown[]
) => void;

export interface ClientGridTabSelectEvent {
  selected: number;
}

export interface UseClientGridTabsOptions {
  selectedTabFromView: MaybeRefOrGetter<number>;
  emit: ClientGridTabsEmit;
}

function tab(title: string): ClientGridTab {
  return {
    title,
    contentClassName: CLIENT_GRID_TAB_CONTENT_CLASS,
  };
}

/**
 * Fixed three-pane TabStrip titles for CalculumGrid (client process path).
 * Does not include receivable or onlyShowActiveTab modes.
 */
export function buildClientGridTabs(
  labels: ClientGridTabLabels,
): ClientGridTab[] {
  return [
    tab(labels.spends),
    tab(labels.suppliers),
    tab(labels.ultimateParent),
  ];
}

/**
 * TabStrip selected index and titles for CalculumGrid.
 * Toolbar markup stays on the facade; this owns titles, `selectedTabIndex`,
 * and `change-tab-from-grid`. Entity-cell `change-tab` stays on the SFC.
 */
export function useClientGridTabs(options: UseClientGridTabsOptions) {
  const translate = useI18n({ warnHtmlMessage: false, useScope: "global" });

  const labels = computed<ClientGridTabLabels>(() => ({
    spends: translate.t("global.spends"),
    suppliers: translate.t("global.suppliers"),
    ultimateParent: translate.t("global.ultimateParent"),
  }));

  const tabs = computed(() => buildClientGridTabs(labels.value));

  const selectedTabIndex = ref(toValue(options.selectedTabFromView));

  watch(
    () => toValue(options.selectedTabFromView),
    (index) => {
      selectedTabIndex.value = index;
    },
  );

  function onSelect(event: ClientGridTabSelectEvent) {
    selectedTabIndex.value = event.selected;
    options.emit("change-tab-from-grid", event.selected);
  }

  return {
    selectedTabIndex,
    tabs,
    onSelect,
  };
}
