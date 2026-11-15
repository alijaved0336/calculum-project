import { computed, ComputedRef, watch } from "vue";
import type { TabStripSelectEventArguments } from "@progress/kendo-vue-layout";
import type { DataInterface } from "@/modules/home/entityCard/types";
import { useEntityCardStore } from "@/stores/entityCard";
import { EntityCard, EntityType } from "@/types";
import { isNullOrUndefined, StringUtils } from "@/utils";

export interface UseCalculatorSpendTabsProps {
  companyId: string;
  companyType: EntityType;
  programUuid: string;
}

export interface UseCalculatorSpendTabsOptions {
  data: DataInterface;
  props: Readonly<UseCalculatorSpendTabsProps>;
  translate: { t: (key: string) => string };
}

const useCalculatorSpendTabs = (options: UseCalculatorSpendTabsOptions) => {
  const { data, props, translate } = options;
  const entityCardStore = useEntityCardStore();

  function postSpendsBySupplierAndButProgram(): void {
    // Validate
    if (StringUtils.isNullUndefinedOrEmpty(props.programUuid)) {
      data.loadingSpends = false;

      data.belongtoProgram = false;

      data.loadingCalculation = true;

      data.loadingMatrix = true;

      if (import.meta.env.DEV) {
        console.error(
          "** (postSpendsBySupplierAndButProgram) Selected program is null, undefined or empty",
        );
      }

      return;
    }

    data.loadingSpends = true;

    const params = {
      companyId: props.companyId,
      programId: props.programUuid,
      callbackSuccess: (
        callbackSuccessData: EntityCard.SpendProgramConfigByProviderAPIResponse[],
      ) => {
        data.spendProgramConfigs = callbackSuccessData;

        // Move to module and watch for spend program config changes
        // Add an id for each spend program config starting from 0
        data.tabsData = data.spendProgramConfigs.map(
          (item: any, index: number) => {
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
        if (props.companyType === "parent") {
          data.levelType = props.companyType;
        }
        // If there is only one spend line, set the level type to spend
        else if (data.spendProgramConfigs.length === 1) {
          data.levelType = "spend";
          // If there are more than one spend line, set the level type to spend
          // for the first tab to parent / supplier
        } else if (data.selectedTabIndex === 0) {
          data.levelType = props.companyType;
        }
        // and the rest to spend
        else {
          data.levelType = "spend";
        }

        // If there are more than one spend line
        // Or if the company is a parent
        if (
          data.spendProgramConfigs.length > 1 ||
          props.companyType === "parent"
        ) {
          // Activate the all spends tab
          data.allSpendsTab = true;

          // Prepend the first tab to the tabs
          data.tabsData = [
            // Set first tab data
            {
              id: data.spendProgramConfigs.length.toString(),
              alias: translate.t("global.allSpendLines"),
              approach: null,
              cashDiscountEnabled: false,
              cashDiscounts: null,
              contractualPaymentTermsWithCashDiscounts: null,
              contractualPaymentTermsWithoutCashDiscounts: null,
              disabled: data.tabsData[data.selectedTabIndex].disabled,
              financingGroup: null,
              financingName: null,
              harmonizationGroup: null,
              harmonizationLevel: props.companyType,
              hasDynamicHarmonization: null,
              hasResults: null,
              model_payment_terms: null,
              negotiationId: "",
              spend_volume: null,
              spendUUID: data.spendProgramConfigs[0].spendUUID, // Use the first id for spend
              team: null,
              uuid: data.spendProgramConfigs[0].uuid, // Use the first id for spend configuration
              approachSupplierSavings: null,
              financingColor: null,
            },
            // Append the rest
            ...data.tabsData,
          ];
        }

        if (data.tabs.length === 0) {
          setTabs();
        }

        data.loadingSpends = false;
      },
      callbackError: (callbackErrorData: unknown) => {
        data.loadingSpends = false;
        if (import.meta.env.DEV) {
          console.error(
            "** Error on getSpendsBySupplierAndButProgram: ",
            callbackErrorData,
          );
        }
      },
    };
    entityCardStore.postSpendsBySupplierAndButProgram(params);
  }

  const tabsDataTabSelected: ComputedRef<EntityCard.TabsData | null> =
    computed(() => {
      return data.tabsData?.[data.selectedTabIndex] ?? null;
    });

  watch(tabsDataTabSelected, () => {
    // Validate
    if (
      isNullOrUndefined(data.tabsData) ||
      isNullOrUndefined(tabsDataTabSelected.value)
    ) {
      return;
    }

    // Check if the tab belongs to a program
    data.belongtoProgram = tabsDataTabSelected.value.uuid
      ? !data.tabsData[data.selectedTabIndex].disabled
      : false;

    // Spend configuration uuid
    data.spendConfigurationUuid = tabsDataTabSelected.value.uuid;

    // The level type for first tab is the company type. The level type for the rest of tabs is spend
    data.levelType =
      data.selectedTabIndex === 0 ? props.companyType : "spend";
  });

  function setTabs(): void {
    let forRows = 0;

    if (props.companyType === "parent") {
      forRows = 1;
    } else if (data.tabsData) {
      forRows = data.tabsData.length;
    }

    for (let i = 0; i < forRows; i++) {
      let tabTitle: string = tabsGetTabTitleByAlias({
        alias: data.tabsData[i].alias ?? "",
        forRows,
        i,
      });

      let titleRender = "";

      if (data.tabsData[i].uuid) {
        titleRender = data.tabsData[i].disabled
          ? "noBelongProgram"
          : "program";
      } else {
        titleRender = "noBelongProgram";
      }

      const newTab = {
        id: data.tabsData[i].id,
        title: tabTitle,
        hasResults: data.tabsData[i].hasResults,
        contentClassName: "classContentHide",
        titleRender,
      };

      data.tabs.push(newTab);
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
      return "Spend " + (i + 1);
    }

    // Has alias
    return alias;
  }

  function entityCardNegotiationTabsOnTabSelect(
    e: TabStripSelectEventArguments,
  ) {
    data.scenariosByConfig = [];
    data.someScenarioApiRequest = true;
    data.selectedScenario = null;
    data.selectedTabIndex = e.selected;
  }

  return {
    tabsDataTabSelected,
    postSpendsBySupplierAndButProgram,
    entityCardNegotiationTabsOnTabSelect,
  };
};

export default useCalculatorSpendTabs;
