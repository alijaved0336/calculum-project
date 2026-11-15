import { ref, Ref } from "vue";
import { SpendLine } from "@/types";
import { ObjectUtils, StringUtils, isNullOrUndefined } from "@/utils";
import * as cacheGrid from "@/utils/dataGridClear";
import { columnsNegotiationTab } from "@/modules/home/entityCard/data/columns";
import { useAnalyzeStore } from "@/stores/analyze";
import { useUser } from "@/composables";
import { GridColumnProps } from "@progress/kendo-vue-grid";

export interface UseNegotiationSpendGridProps {
  companyId: string;
  programData: any;
}

export interface UseNegotiationSpendGridOptions {
  listSpend: Ref<SpendLine[]>;
  props: Readonly<UseNegotiationSpendGridProps>;
  translate: { t: (key: string) => string };
}

const useNegotiationSpendGrid = (options: UseNegotiationSpendGridOptions) => {
  const { listSpend, props, translate } = options;
  const analyzeStore = useAnalyzeStore();
  const { isPilotAccount } = useUser();

  const patchGrid = ref(false);
  const keyGrid = ref(new Date().getUTCMilliseconds());

  /**
   * Retrieves the grid columns.
   *
   * @return {GridColumnProps[]} The array of grid columns.
   */
  function getGridColumns(): GridColumnProps[] {
    // Clone the original columns
    let columns = JSON.parse(JSON.stringify(columnsNegotiationTab));

    let resetcolumns = [];

    resetcolumns = columns;

    if (isPilotAccount()) {
      const parentName = resetcolumns.findIndex(
        (x: any) => x.field === "parentName",
      );
      if (parentName > -1) {
        resetcolumns[parentName].cell = "restrictModalEntitySpend";
      }
    }

    resetcolumns = cacheGrid.removeFinancingRelatedColumns(
      resetcolumns,
      props.programData.externalFinancingEnabled,
    );

    return resetcolumns;
  }

  const columnsGrid = ref(getGridColumns());

  /**
   * Retrieves the spendProgramConfigs for a given supplier and program.
   *
   * @return {void}
   *
   * To get information for the grids
   */
  function getSpends(): void {
    try {
      // Validate
      if (isNullOrUndefined(props.companyId)) {
        throw new Error("props.companyId is undefined");
      }

      if (isNullOrUndefined(props.programData)) {
        throw new Error("props.programData is undefined");
      }

      if (isNullOrUndefined(props.programData["@id"])) {
        throw new Error('props.programData["@id"] is undefined');
      }

      const programUUID = StringUtils.removeIRI(props.programData["@id"]);

      if (StringUtils.isEmpty(programUUID)) {
        throw new Error("programUUID param is empty");
      }

      const params = {
        supplierUUID: props.companyId,
        programUUID,
        disabled: null,
        callbackSuccess: (
          callbackSuccessData: /*Analyze.SpendsByProgramAndProviderAPIResponse[]*/ any,
        ) => {
          listSpend.value = parseDataSupplier(callbackSuccessData);
          // Disable loading
          patchGrid.value = false;
        },
        callbackError: (callbackErrorData: unknown) => {
          // Disable loading
          patchGrid.value = false;
        },
      };

      analyzeStore.getSpendsbySupplier(params);
    } catch (error) {}
  }

  function parseDataSupplier(callbackSuccessData: any): SpendLine[] {
    const parsedData: SpendLine[] = [];

    callbackSuccessData.forEach((spend: any) => {
      // Clone object
      const newSpend = ObjectUtils.cloneDeep(spend);

      newSpend.financingGroup = {
        "@id": spend.financingGroup,
        color: spend.financingColor,
        name: spend.financingName ?? "No Financing",
      };
      newSpend.harmonizationGroup = {
        "@id": spend.harmonizationGroup,
        color: spend.harmonizationColor,
        name: spend.harmonizationName ?? spend.harmonizationLevel,
      };

      newSpend.provider = {
        "@id": spend.providerUuid,
        uuid: spend.providerUuid,
        name: spend.providerName,
        domain: spend.providerDomain,
        iconUrl: spend.providerIconUrl,
        list: spend.providers,
        toString: function () {
          return this.list ?? this.name;
        },
        indexOf: function (text: string) {
          return (this.toString() ?? "").indexOf(text);
        },
        lastIndexOf: function (text: string) {
          return (this.toString() ?? "").lastIndexOf(text);
        },
      };

      newSpend.providerParent = {
        "@id": spend.providerParentUuid,
        uuid: spend.providerParentUuid,
        name: spend.providerParentName,
        domain: spend.providerParentDomain,
        iconUrl: spend.providerParentIconUrl,
        list: spend.providerParents,
        toString: function () {
          return this.list ?? this.name;
        },
        indexOf: function (text: string) {
          return (this.toString() ?? "").indexOf(text);
        },
        lastIndexOf: function (text: string) {
          return (this.toString() ?? "").lastIndexOf(text);
        },
      };

      newSpend.buyer = {
        "@id": spend.buyerUuid,
        uuid: spend.buyerUuid,
        name: spend.buyerName,
        domain: spend.buyerDomain,
        iconUrl: spend.buyerIconUrl,
        list: spend.buyers,
        toString: function () {
          return this.list ?? this.name;
        },
        indexOf: function (text: string) {
          return (this.toString() ?? "").indexOf(text);
        },
        lastIndexOf: function (text: string) {
          return (this.toString() ?? "").lastIndexOf(text);
        },
      };

      newSpend.nameProgramActive = spend.activeProgram
        ? spend.activeProgram
        : translate.t("tableStatus.notAssigned");

      newSpend.isActive = spend.activeProgram;

      newSpend.programUuid = props.programData["@id"];

      newSpend.configUuid =
        "/api/analyze/spend_program_configurations/" + spend.uuid;

      newSpend.cashDiscounts = spend.cashDiscounts
        ? spend.cashDiscounts * 100
        : null; // is cash discounts coming from API as percentage?

      newSpend.selected = false;

      newSpend.commodities = spend.commodity;

      newSpend.spend_volume = Number.parseFloat(spend.volume ?? 0);

      newSpend.modelCashFlow = spend.disabled
        ? null
        : Number.parseFloat(spend.modelCashFlow ?? 0);

      newSpend.targetOpportunity = spend.targetOpportunity ?? 0;

      newSpend.moduleType = "entity";

      const validateESG = [0, 1, 2, 3, 4, 100];

      let value = 0;

      if (validateESG.includes(Number.parseInt(spend.investVerteScore))) {
        value = Number.parseInt(spend.investVerteScore);
      } else {
        value = 404;
      }

      newSpend.investVerteScore = translate.t(
        "home.entityCard.rating.esgClassification.c" + value,
      );

      parsedData.push(newSpend);
    });

    return parsedData;
  }

  return {
    getSpends,
    listSpend,
    parseDataSupplier,
    patchGrid,
    keyGrid,
    columnsGrid,
  };
};

export default useNegotiationSpendGrid;
