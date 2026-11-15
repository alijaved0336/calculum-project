import { computed, ComputedRef, reactive, ref, Ref, watch } from "vue";
import { EntityCard } from "@/types";
import type {
  NegotiationResultsFeedbackSlice,
  NegotiationTabsSlice,
} from "@/modules/home/entityCard/components/opportunity/negotiation-view-types";
import { useEntityCardStore } from "@/stores/entityCard";
import { isNullOrUndefined, StringUtils } from "@/utils";

export interface UseNegotiationSpendTabsProps {
  companyId: string;
  companyType: string;
  overviewTabEventUUID: string;
  retrieveAllSpends: any;
  programUuid: string;
}

export interface NegotiationMoveToPhaseSlice {
  level: string;
  uuid: string | number;
}

export interface UseNegotiationSpendTabsLoaders {
  fetchCalculatedCashFlow: (level: string) => Promise<void>;
  retrieveSpendInk: () => void;
  retrieveSupplierSpendInK: () => void;
  retrieveSavings: () => void;
  getEntityDetails: (flagLoading?: boolean) => void;
  getSpends: () => void;
  retrieveHarmonizationGroupsArray: () => void;
  retrieveFinancingGroupsArray: () => void;
  beginCashFlowLoad: () => void;
  failVCardInfoLoad: () => void;
}

export type NegotiationTabsResultsFeedback = Pick<
  NegotiationResultsFeedbackSlice,
  "feedbackRating" | "additionalFeedback" | "feedbackLabels"
>;

export interface UseNegotiationSpendTabsOptions {
  tabsSlice: NegotiationTabsSlice;
  props: Readonly<UseNegotiationSpendTabsProps>;
  translate: { t: (key: string) => string };
  moveToPhaseData: NegotiationMoveToPhaseSlice;
  selectedTabIndex: Ref<number>;
  loaders: UseNegotiationSpendTabsLoaders;
  paymentTermsDescriptions: Ref<Array<any> | null>;
  keyGrid: Ref<number>;
}

const useNegotiationSpendTabs = (options: UseNegotiationSpendTabsOptions) => {
  const {
    tabsSlice,
    props,
    translate,
    moveToPhaseData,
    selectedTabIndex,
    loaders,
    paymentTermsDescriptions,
    keyGrid,
  } = options;

  const entityCardStore = useEntityCardStore();

  const resultsFeedback = reactive<NegotiationTabsResultsFeedback>({
    feedbackRating: null,
    additionalFeedback: "",
    feedbackLabels: [],
  });

  // *** Entities Tabs - Supplier | Spend Lines ***

  const tabsDataTabSelected: ComputedRef<EntityCard.TabsData | null> = computed(
    () => {
      return tabsSlice.tabsData[selectedTabIndex.value] ?? null;
    },
  );

  // Stable, complete spend-volume source: the full spend list from the parent
  // (props.retrieveAllSpends), matched by spendUUID — the same source the results modal uses.
  // Unlike data.dataSpends (the entity-card grid's paged rows), this covers every spend, so the
  // tab order is stable and complete regardless of grid paging.
  const getStableSpendVolume = (spendsUUID: string): number => {
    return (
      props.retrieveAllSpends.find((s: any) => s.spendUUID === spendsUUID)
        ?.spend_volume ?? 0
    );
  };

  // Tab titles are a LIVE PROJECTION of tabsSlice.tabsData — the single source of truth for both
  // the order and the content of the tabs. There is no separate stored `tabs` array to keep in
  // sync (that dual-list was exactly what let the titles drift from their data): tabsData is
  // ordered in one place (sortTabsDataByVolumeDesc) and this computed just mirrors it 1:1, so
  // tab i and tabsData[i] are always the same spend.
  const tabs: ComputedRef<any[]> = computed(() => {
    // Evaluated eagerly on every render (unlike the old setTabs, which ran only after tabsData
    // was built), so guard against an empty/partial tabsData to avoid touching undefined rows.
    if (!Array.isArray(tabsSlice.tabsData) || tabsSlice.tabsData.length === 0)
      return [];
    const forRows =
      props.companyType === "parent" ? 1 : tabsSlice.tabsData.length;
    const projected: any[] = [];
    for (let i = 0; i < forRows; i++) {
      const row = tabsSlice.tabsData[i];
      if (!row) continue;
      // In-program spends (have a uuid and are not disabled) render the "program" slot;
      // everything else renders "noBelongProgram".
      let titleRender = "noBelongProgram";
      if (row.uuid && !row.disabled) {
        titleRender = "program";
      }
      projected.push({
        id: row.id,
        title: tabsGetTabTitleByAlias({ alias: row.alias ?? "", forRows, i }),
        tabIndex: i,
        spendUUID: row.spendUUID,
        volume:
          i === 0 ? row.spend_volume : getStableSpendVolume(row.spendUUID),
        hasResults: row.hasResults,
        contentClassName: "classContentHide",
        titleRender,
        disabled: row.disabled,
      });
    }
    return projected;
  });

  // Single ordering authority: sort tabsSlice.tabsData (index 0 = the synthetic supplier row)
  // by volume desc, reordering the existing item references so tabsDataTabSelected keeps its
  // reference. The `tabs` computed above mirrors this order 1:1, so the tab titles and their
  // data can never drift apart.
  function sortTabsDataByVolumeDesc(preserveSelection = false): void {
    if (!Array.isArray(tabsSlice.tabsData) || tabsSlice.tabsData.length <= 1)
      return;
    const selectedUuid = preserveSelection
      ? tabsSlice.tabsData[selectedTabIndex.value]?.spendUUID
      : null;
    const [supplierRow, ...tail] = tabsSlice.tabsData;
    tail.sort(
      (a: any, b: any) =>
        getStableSpendVolume(b.spendUUID) - getStableSpendVolume(a.spendUUID),
    );
    tabsSlice.tabsData = [supplierRow, ...tail];
    if (preserveSelection && selectedUuid && selectedTabIndex.value !== 0) {
      const i = tabsSlice.tabsData.findIndex(
        (t: any) => t.spendUUID === selectedUuid,
      );
      if (i >= 0) selectedTabIndex.value = i;
    }
  }

  function tabsGetTabTitleByAlias({
    alias,
    forRows,
    i,
  }: {
    alias: string;
    forRows: number;
    i: number;
  }): string {
    // Only one tab
    if (forRows === 1) {
      return translate.t("global.allSpendLines");
    }

    // More than one
    // Default title
    if (StringUtils.isNullUndefinedOrEmpty(alias)) {
      return "Spend " + i;
    }

    // Has alias
    return alias;
  }

  function entityCardNegotiationTabsOnTabSelect(e: any) {
    paymentTermsDescriptions.value = null;
    selectedTabIndex.value = e.selected;
  }

  // *** END Entities Tabs ***

  // *** Spend Program Configuration (1) ***

  const spendProgramConfigs: Ref<
    EntityCard.SpendProgramConfigByProviderAPIResponse[]
  > = ref([]);

  // *** END Spend Program Configuration (1) ***

  /**
   * Get spend's feedback rating
   *
   * @param hasResults {string} Spend Lines result id
   */
  function retrieveSpendNewTerms(hasResults: string) {
    const params = {
      resultId: hasResults,
      callbackSuccess: (callbackSuccessData: any) => {
        // Feedback rating
        resultsFeedback.feedbackRating = callbackSuccessData.feedbackRating; // Update backend

        resultsFeedback.additionalFeedback =
          callbackSuccessData.additionalFeedback;

        // Labels
        resultsFeedback.feedbackLabels = callbackSuccessData.labels; // Update backend
      },
      callbackError: () => {},
    };
    entityCardStore.getSpendNewTerms(params);
  }

  /**
   * When user clicks on a tab
   */
  watch(tabsDataTabSelected, () => {
    // Validate
    if (
      isNullOrUndefined(tabsSlice.tabsData) ||
      isNullOrUndefined(tabsDataTabSelected.value)
    ) {
      return;
    }
    // Check if the tab belongs to a program
    tabsSlice.belongtoProgram = tabsDataTabSelected.value.uuid
      ? !tabsSlice.tabsData[selectedTabIndex.value].disabled
      : false;

    // Return if the tab does not belong to a program
    if (!tabsSlice.belongtoProgram) {
      return;
    }

    // Hide strategies
    tabsSlice.showStrategies = false;

    // Spend configuration uuid
    tabsSlice.spendConfigurationUuid = tabsDataTabSelected.value.uuid;
    tabsSlice.spendUUID = tabsDataTabSelected.value.spendUUID;

    // The level type for first tab is the company type. The level type for the rest of tabs is spend
    tabsSlice.levelType =
      selectedTabIndex.value === 0 ? props.companyType : "spend";

    if (props.companyType === "parent") {
      tabsSlice.levelTypeForStrategies = props.companyType;
    } else {
      tabsSlice.levelTypeForStrategies =
        selectedTabIndex.value === 0 ? props.companyType : "spend";
    }

    // Add description
    if (tabsSlice.allSpendsTab && selectedTabIndex.value === 0) {
      //For suppliers and parent levels
      tabsSlice.hideControls = true;
      loaders.retrieveSupplierSpendInK();
      loaders.retrieveSavings();
      loaders.fetchCalculatedCashFlow(props.companyType);
    } else {
      //For spend level or supplier with only one spend
      tabsSlice.hideControls = false;
      loaders.retrieveSpendInk();
      loaders.fetchCalculatedCashFlow("spend");
    }

    // Get spend details
    loaders.getEntityDetails();

    tabsSlice.keyTermsStrategies++;
    moveToPhaseData.level = tabsSlice.levelType;
    moveToPhaseData.uuid = tabsDataTabSelected.value.spendUUID;

    if (tabsDataTabSelected.value.hasResults) {
      retrieveSpendNewTerms(tabsDataTabSelected.value.hasResults);
    } else {
      resultsFeedback.feedbackRating = null;
      resultsFeedback.additionalFeedback = "";
      resultsFeedback.feedbackLabels = [];
    }
  });

  /**
   * Get all spend-program-configurations.
   * To get and set information for the TABS.
   * Route: GET /api/analyze/get-spend-program-configs-by-provider
   *
   * @return {void}
   */
  function postSpendsBySupplierAndButProgram(): void {
    // Validate
    if (StringUtils.isNullUndefinedOrEmpty(props.programUuid)) {
      if (import.meta.env.DEV)
        console.error("props.programUuid is null, undefined or empty");
      return;
    }

    // Enable loading (CF-owned state — loaders mutate it)
    loaders.beginCashFlowLoad();

    function setSelectedTabFromOverviewEvent(): void {
      if (!props.overviewTabEventUUID?.length) {
        return;
      }

      const indexOfSelectedTab = tabsSlice.tabsData.findIndex(
        (item: any) => item.spendUUID === props.overviewTabEventUUID,
      );

      if (props.companyType === "parent") {
        entityCardStore.setSelectedTabIndex(0);
        return;
      }

      if (
        indexOfSelectedTab === 0 &&
        tabsSlice.tabsData[indexOfSelectedTab + 1].disabled === true
      ) {
        entityCardStore.setSelectedTabIndex(0);
        return;
      }

      const t =
        indexOfSelectedTab === 0 ? indexOfSelectedTab + 1 : indexOfSelectedTab;

      entityCardStore.setSelectedTabIndex(t);
    }

    const params = {
      companyId: props.companyId,
      programId: props.programUuid,
      callbackSuccess: (
        callbackSuccessData: EntityCard.SpendProgramConfigByProviderAPIResponse[],
      ) => {
        spendProgramConfigs.value = callbackSuccessData;

        // Move to module and watch for spend program config changes
        // Add an id for each spend program config starting from 0
        tabsSlice.tabsData = spendProgramConfigs.value.map(
          (item, index: number) => {
            return {
              ...item,
              cashDiscountEnabled:
                "cashDiscountEnabled" in item
                  ? item.cashDiscountEnabled
                  : false,
              cashDiscounts:
                "cashDiscounts" in item ? item.cashDiscounts : null,
              hasResults: item.negotiationId,
              id: index.toString(),
            };
          },
        );

        // If the company is a parent, set the level type to parent
        if (props.companyType === "parent" || selectedTabIndex.value === 0) {
          tabsSlice.levelType = props.companyType;
          tabsSlice.levelTypeForStrategies = props.companyType;
        } else {
          tabsSlice.levelType = "spend";
          tabsSlice.levelTypeForStrategies = "spend";
        }

        tabsSlice.allSpendsTab = true;

        // Prepend the first tab to the tabs
        tabsSlice.tabsData = [
          // Set first tab data
          {
            id: spendProgramConfigs.value.length.toString(),
            alias: translate.t("global.allSpendLines"),
            approach: null,
            cashDiscountEnabled: false,
            cashDiscounts: null,
            contractualPaymentTermsWithCashDiscounts: null,
            contractualPaymentTermsWithoutCashDiscounts: null,
            disabled: false,
            financingGroup: null,
            financingName: null,
            harmonizationGroup: null,
            harmonizationLevel: props.companyType,
            hasDynamicHarmonization: null,
            hasResults: null,
            model_payment_terms: null,
            negotiationId: "",
            spend_volume: null,
            spendUUID: spendProgramConfigs.value[0]?.spendUUID, // Use the first id for spend
            team: null,
            uuid: spendProgramConfigs.value[0]?.uuid, // Use the first id for spend configuration
            approachSupplierSavings: null,
            financingColor: null,
          },
          // Append the rest
          ...tabsSlice.tabsData,
        ];

        // Order the spend tabs by volume desc on the single source (tabsData) before the
        // initial tab is chosen, so the tab titles and their data share one order
        // (index 0 stays the supplier "All Spend Lines" row).
        sortTabsDataByVolumeDesc();

        setSelectedTabFromOverviewEvent();
        /** Get information for grid and plan data */
        loaders.getSpends();

        // Validate
        if (isNullOrUndefined(tabsDataTabSelected.value)) {
          // Reset the selected tab
          entityCardStore.setSelectedTabIndex(0);
        }

        // Check if the tab belongs to a program
        tabsSlice.belongtoProgram = false;

        if (!isNullOrUndefined(tabsDataTabSelected.value)) {
          tabsSlice.belongtoProgram = !tabsDataTabSelected.value.disabled;
        }

        if (!tabsSlice.belongtoProgram) {
          tabsSlice.showStrategies = true;
        }

        if (!isNullOrUndefined(tabsDataTabSelected.value)) {
          // Spend configuration uuid
          tabsSlice.spendConfigurationUuid = tabsDataTabSelected.value.uuid;
        }

        if (tabsSlice.allSpendsTab && selectedTabIndex.value === 0) {
          tabsSlice.hideControls = true;
        } else {
          tabsSlice.hideControls = false;
        }

        // Move to sep module and watch for changes on spendLinesProgramConfigurations
        // Get spend details
        loaders.getEntityDetails(false);

        // `tabs` is a computed projection of tabsSlice.tabsData (already sorted above), so there
        // is nothing to rebuild here.

        loaders.retrieveHarmonizationGroupsArray();
        loaders.retrieveFinancingGroupsArray();

        keyGrid.value++;
      },
      callbackError: (callbackErrorData: unknown) => {
        if (import.meta.env.DEV) {
          console.error(
            "** Error on getSpendsBySupplierAndButProgram: ",
            callbackErrorData,
          );
        }
        loaders.failVCardInfoLoad();
      },
    };
    entityCardStore.postSpendsBySupplierAndButProgram(params);
  }
  // *** END Spend Program Configuration ***

  // props.retrieveAllSpends (the volume source) is populated by an async API call in the parent,
  // so it can arrive after tabsData is first built. Re-sort the single source and re-project the
  // tabs when it changes, preserving the user's selected spend by uuid.
  watch(
    () => props.retrieveAllSpends,
    () => {
      // `tabs` re-projects reactively when tabsData is reassigned — only the source needs sorting.
      if (tabsSlice.tabsData.length > 1) {
        sortTabsDataByVolumeDesc(true);
      }
    },
  );

  return {
    selectedTabIndex,
    tabsDataTabSelected,
    tabs,
    spendProgramConfigs,
    resultsFeedback,
    entityCardNegotiationTabsOnTabSelect,
    postSpendsBySupplierAndButProgram,
    tabsSlice,
  };
};

export default useNegotiationSpendTabs;
