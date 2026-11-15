import { ComputedRef, reactive, Ref, ref, unref } from "vue";
import { useEntityCardStore } from "@/stores/entityCard";
import { useAppStore } from "@/stores/app";
import { useUser } from "@/composables";
import useSpendFile from "@/composables/useSpendFile";
import {
  ENTITY_SPENDFILE_LEVEL_TYPE,
  isNullOrUndefined,
  StringUtils,
} from "@/utils";
import { buildCalculatedCashFlowSource } from "@/utils/EntityCardUtils";
import * as graphqlUtils from "@/utils/graphqlUtils";
import type {
  NegotiationLoadingFlags,
  NegotiationNineBoxSlice,
  NegotiationSpendDetailsSlice,
  NegotiationSpendVolumeSlice,
  NegotiationVCardInfoSlice,
} from "@/modules/home/entityCard/components/opportunity/negotiation-view-types";

export interface UseNegotiationCashFlowProps {
  companyId: string;
  companyType: string;
  programUuid: string;
  programTarget: string;
  potentialTheme: boolean;
  entityDetails?: Record<string, any>;
  retrieveAllSpends: any;
}

export type NegotiationCashFlowOwnedLoading = Pick<
  NegotiationLoadingFlags,
  | "isLoadingEntityDetails"
  | "isLoadingVcardInfo"
  | "potentialCashFlow"
  | "spendVolume"
>;

export interface UseNegotiationCashFlowOptions {
  props: Readonly<UseNegotiationCashFlowProps>;
  selectedSpendId: ComputedRef<string>;
  spendUUID: Ref<string> | ComputedRef<string>;
  levelType: Ref<string> | ComputedRef<string>;
  nineBoxes: NegotiationNineBoxSlice | Ref<NegotiationNineBoxSlice>;
}

const useNegotiationCashFlowLoaders = (
  options: UseNegotiationCashFlowOptions,
) => {
  const { props, selectedSpendId, spendUUID, levelType, nineBoxes } = options;

  const entityCardStore = useEntityCardStore();
  const { user } = useUser();
  const { spendFileVersionActiveId } = useSpendFile();

  const vCardInfo = reactive<NegotiationVCardInfoSlice>({
    economicProfit: null,
    hasVCard: null,
    potentialSavings: null,
    vCardRebate: null,
    vCardRebateFull: null,
    equivalentDiscount: null,
  });
  const spend = reactive<NegotiationSpendVolumeSlice>({
    maxValue: 0,
    description: "",
    color: "#2E9D58",
    realValue: 0,
    currency: "",
    forecastVolume: null,
  });
  const spendDetails = reactive<NegotiationSpendDetailsSlice>({
    buyer: props.entityDetails?.buyerName ?? null,
    country: props.entityDetails?.buyerCountries ?? null,
    currency: props.entityDetails?.currencies ?? null,
    ultimateParentCompanyName:
      props.entityDetails?.ultimateParentCompanyName ?? null,
  });
  const potentialCashFlow = reactive({
    realValue: 0,
  });
  const agreedCashFlow = ref<number | null>(null);
  const showExistsAgreedValue = ref<string | null>(null);
  const paymentTermsDescriptions = ref<Array<any> | null>(null);
  const loading = reactive<NegotiationCashFlowOwnedLoading>({
    isLoadingEntityDetails: false,
    isLoadingVcardInfo: true,
    potentialCashFlow: true,
    spendVolume: true,
  });

  function getNineBoxes(): NegotiationNineBoxSlice {
    return unref(nineBoxes);
  }

  /**
   * returns vcard value from the api call,
   * coming from EntityPaymentTermsStrategies component
   *
   */
  function getVcardValue(hasVCardValue: boolean) {
    vCardInfo.hasVCard = hasVCardValue;
  }

  /** Tabs calls this before spend-program-config fetch so CF-owned loading/vCard reset stays here. */
  function beginCashFlowLoad(): void {
    loading.potentialCashFlow = true;
    loading.isLoadingVcardInfo = true;
    vCardInfo.equivalentDiscount = null;
  }

  function failVCardInfoLoad(): void {
    loading.isLoadingVcardInfo = false;
  }

  /**
   * Get potential cash flow from the API
   *
   * @returns {void}
   */
  // Read the calculated cash-flow numbers (headline + agreed) for the current selection straight
  // from the program_calculated_data GraphQL resources — the single source of truth, returned
  // already exchange-rate-converted via the currencyRate arg. Replaces the per-level REST
  // cash-flow calls for these two values and removes the paged-grid dependency for the Agreed box.
  async function fetchCalculatedCashFlow(level: string): Promise<void> {
    try {
      if (StringUtils.isNullUndefinedOrEmpty(props.programUuid)) return;
      if (StringUtils.isNullUndefinedOrEmpty(spendFileVersionActiveId.value))
        return;

      const source = buildCalculatedCashFlowSource(
        level,
        {
          spendUuid: unref(spendUUID),
          entityUuid: props.companyId,
        },
        props.potentialTheme,
      );
      if (source === null) return;

      loading.potentialCashFlow = true;
      const currencyRate = useAppStore().getCurrencyAmount;
      const queryString = `
          {
            ${source.alias}: ${source.collectionQuery}(
              targetProgramUuid: "${props.programUuid}",
              targetSpendFileVersionUuid: "${spendFileVersionActiveId.value}",
              currencyRate: ${currencyRate},
              fullDisabled: false,
              ${source.entityTypeFilter}
              ${source.rowFilter},
              first: 1
            ) {
              edges { node { modelCashFlow approachBuyerSavings agreedCashFlow } }
            }
          }
        `;

      const response = await graphqlUtils.getCollectionData(queryString);
      const node =
        graphqlUtils.safelyExtractNodes(response, source.alias)[0] ?? null;

      // Headline "Cash Flow". Spend level always uses the model cash flow (mirrors the old spend
      // endpoint); supplier/parent uses buyer savings for dynamic-discount programs, model cash
      // flow otherwise (mirrors calculatePotentialSavingsOrCashFlow's program-type branch).
      let realValue: number | null = null;
      if (node) {
        realValue =
          level !== "spend" && props.programTarget === "dynamicDiscount"
            ? node.approachBuyerSavings
            : node.modelCashFlow;
      }
      potentialCashFlow.realValue = realValue ?? 0;

      // Agreed cash flow (drives the Agreed box); null when the spend/entity has no agreed value.
      const agreed = node?.agreedCashFlow;
      agreedCashFlow.value = StringUtils.isNullUndefinedOrEmpty(agreed)
        ? null
        : agreed;
      showExistsAgreedValue.value = StringUtils.isNullUndefinedOrEmpty(
        agreedCashFlow.value,
      )
        ? null
        : StringUtils.formatBigNumbers(agreedCashFlow.value);

      loading.potentialCashFlow = false;
    } catch (error) {
      loading.potentialCashFlow = false;
    }
  }

  /**
   * Calls for SPEND LINE
   *
   * @returns {void}
   */
  function retrieveSpendInk(): void {
    try {
      // Validate
      if (StringUtils.isNullUndefinedOrEmpty(props.companyId)) {
        throw new Error("props.companyId is null, undefined or empty");
      }
      if (StringUtils.isNullUndefinedOrEmpty(selectedSpendId.value)) {
        throw new Error(
          "entityCardNegotiationSpendsSelectedId.value is null, undefined or empty",
        );
      }
      if (StringUtils.isNullUndefinedOrEmpty(props.programUuid)) {
        throw new Error("props.programUuid is null, undefined or empty");
      }

      // Enable loading
      loading.isLoadingVcardInfo = true;
      loading.spendVolume = true;
      vCardInfo.equivalentDiscount = null;

      const params = {
        companyId: props.companyId,
        spendId: selectedSpendId.value,
        programId: props.programUuid,
        callbackSuccess: (callbackSuccessData: any) => {
          if (callbackSuccessData.spend !== null) {
            spend.color = callbackSuccessData.spend.color;
            spend.description = callbackSuccessData.spend.description;
            spend.maxValue = callbackSuccessData.spend.maxValue;
            spend.realValue = callbackSuccessData.spend.realValue;
            spend.currency = callbackSuccessData.spend.currency;
            loading.spendVolume = false;
            spend.forecastVolume = callbackSuccessData.spend.forecastVolume;
          }

          // vcard related , single spend
          vCardInfo.economicProfit = callbackSuccessData.economicProfit ?? null;
          vCardInfo.vCardRebateFull =
            callbackSuccessData.vCardRebateFull ?? null;

          vCardInfo.equivalentDiscount =
            callbackSuccessData.spend?.equivalentDiscount ?? null;

          loading.isLoadingVcardInfo = false;

          paymentTermsDescriptions.value =
            callbackSuccessData.paymentTermsDescriptions;
        },
        callbackError: (callbackErrorData: unknown) => {
          // Disable loading
          loading.spendVolume = false;
          loading.isLoadingVcardInfo = false;
        },
      };

      entityCardStore.getSpendInK(params);
    } catch (error) {
      loading.spendVolume = false;
    }
  }

  /**
   * Get spend file, supplier, parent or spend details from API
   *
   * @returns {void}
   */
  function getEntityDetails(flagLoading: boolean = true): void {
    loading.isLoadingEntityDetails = flagLoading;
    try {
      let id = "";

      if (unref(levelType) === ENTITY_SPENDFILE_LEVEL_TYPE.SPEND_LINE) {
        id = selectedSpendId.value;
      } else {
        id = props.companyId;
      }

      // Validate
      if (isNullOrUndefined(user.value)) {
        throw new Error("User is null");
      }

      if (StringUtils.isNullUndefinedOrEmpty(id)) {
        throw new Error("ID is null, undefined or empty");
      }

      const params = {
        id,
        type: unref(levelType),
        callbackSuccess: (callbackSuccessData: any) => {
          spendDetails.buyer = callbackSuccessData.buyers;
          spendDetails.country = callbackSuccessData.buyerCountries;
          spendDetails.currency = callbackSuccessData.currencies;
          spendDetails.ultimateParentCompanyName =
            callbackSuccessData.ultimateParentNames;

          // Disable loading
          loading.isLoadingEntityDetails = false;
        },
        callbackError: (callbackErrorData: unknown) => {
          // Disable loading
          loading.isLoadingEntityDetails = false;
        },
      };

      // Enable loading

      entityCardStore.getEntityOrSpendFileDetails(params);
    } catch (error) {
      //
    }
  }

  /**
   * Calls for SUPPLIER OR PARENT
   */
  function retrieveSavings() {
    loading.potentialCashFlow = true;
    const nineBoxState = getNineBoxes();
    const params = {
      companyId: props.companyId,
      programId: props.programUuid,
      level: unref(levelType),
      callbackSuccess: (callbackSuccessData: any) => {
        nineBoxState.supplierNParentBox = callbackSuccessData.box
          ? callbackSuccessData.box.toString()
          : "";
        nineBoxState.boxesSelected = [nineBoxState.supplierNParentBox];

        nineBoxState.supplierNParentBoxFinancing =
          callbackSuccessData.financial_box
            ? callbackSuccessData.financial_box.toString()
            : "";

        nineBoxState.supplierNParentBoxSCF = callbackSuccessData.scfBox
          ? callbackSuccessData.scfBox.toString()
          : "";
        nineBoxState.boxesSelectedFinancing = [
          nineBoxState.supplierNParentBoxFinancing,
        ];
        nineBoxState.boxesSelectedSCF = [nineBoxState.supplierNParentBoxSCF];

        // vcard related multiple spends. economicProfit + rebate stay on REST for exact parity;
        // realValue + agreedCashFlow now come from GraphQL (fetchCalculatedCashFlow). The dead
        // gauge/buyerLeverage/expected fields were removed.
        vCardInfo.economicProfit = callbackSuccessData.economicProfit ?? null;
        vCardInfo.vCardRebateFull = callbackSuccessData.vCardRebateFull ?? null;

        vCardInfo.equivalentDiscount =
          callbackSuccessData.equivalentDiscount ?? null;

        loading.isLoadingVcardInfo = false;

        paymentTermsDescriptions.value =
          callbackSuccessData.paymentTermsDescriptions;

        loading.potentialCashFlow = false;
      },
      callbackError: (callbackErrorData: unknown) => {
        loading.potentialCashFlow = false;
      },
    };
    entityCardStore.getPotentialSavingsbyCompanyProgram(params);
  }

  /**
   * Get supplier spend in K
   *
   * @returns {void}
   */
  function retrieveSupplierSpendInK(): void {
    // Enable loading
    loading.spendVolume = true;

    const params = {
      companyId: props.companyId,
      callbackSuccess: (callbackSuccessData: any) => {
        spend.realValue = callbackSuccessData.realValue;
        spend.forecastVolume = callbackSuccessData.forecastVolume;
        spend.currency = callbackSuccessData.maxValue;
        spend.color = callbackSuccessData.color;
        spend.description = callbackSuccessData.description;
        loading.spendVolume = false;
      },
      callbackError: () => {
        loading.spendVolume = false;
      },
    };

    entityCardStore.getSupplierSpendInK(params);
  }

  return {
    vCardInfo,
    spend,
    spendDetails,
    potentialCashFlow,
    agreedCashFlow,
    showExistsAgreedValue,
    paymentTermsDescriptions,
    loading,
    fetchCalculatedCashFlow,
    retrieveSpendInk,
    retrieveSupplierSpendInK,
    retrieveSavings,
    getEntityDetails,
    getVcardValue,
    beginCashFlowLoad,
    failVCardInfoLoad,
  };
};

export default useNegotiationCashFlowLoaders;
