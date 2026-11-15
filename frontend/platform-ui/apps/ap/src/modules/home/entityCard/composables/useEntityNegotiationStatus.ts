import { computed, ComputedRef, reactive, ref, Ref, unref, watch } from "vue";
import type { NegotiationStatusPill } from "@/modules/home/entityCard/types";
import type { NegotiationNineBoxSlice } from "@/modules/home/entityCard/components/opportunity/negotiation-view-types";
import { EntityCard, NegotiationStatus, SpendLine } from "@/types";
import {
  ArrayUtils,
  ENTITY_SPENDFILE_LEVEL_TYPE,
  isNull,
  isNullOrUndefined,
  isUndefined,
  NumberUtils,
  StringUtils,
} from "@/utils";
import { useNegotiationStatusStore } from "@/stores/negotiationStatus";
import useNegotiationStatus from "@/modules/negotiationStatus/composables/useNegotiationStatus";
import { useToast } from "vue-toastification";

export interface UseEntityNegotiationStatusProps {
  companyId: string;
  companyType: string;
  entityDetails: any;
}

export interface UseEntityNegotiationStatusOptions {
  props: Readonly<UseEntityNegotiationStatusProps>;
  selectedTabIndex: Ref<number>;
  spendFileVersionIdActive: ComputedRef<string>;
  tabsData: Ref<EntityCard.TabsData[]>;
  listSpend: Ref<SpendLine[]>;
  levelType: Ref<string>;
  loadingApi: Ref<boolean>;
  /** Parent-owned shared ref; plan writes belong-to-plan, status reads it live inside statusPill. */
  validateBelongToAplan: Ref<boolean> | ComputedRef<boolean>;
}

const useEntityNegotiationStatus = (
  options: UseEntityNegotiationStatusOptions,
) => {
  const {
    props,
    selectedTabIndex,
    spendFileVersionIdActive,
    tabsData,
    listSpend,
    levelType,
    loadingApi,
  } = options;

  const negotiationStatusStore = useNegotiationStatusStore();
  const toast = useToast();
  const {
    negotiationStatusGetStatusTranslated,
    negotiationStatusGetPillColorClasses,
  } = useNegotiationStatus();

  const negotiationStatusIsLoading = ref(false);
  const dataSpends = ref<Array<any>>([]);
  const showExistsTarget = ref(false);
  const showExistsTargetValue = ref<string | null>(null);
  const pillLabelNumberBadgeKey = ref(new Date().getUTCMilliseconds());

  const nineBoxes = reactive<NegotiationNineBoxSlice>({
    boxesSelected: [],
    boxesSelectedFinancing: [],
    boxesSelectedSCF: [],
    supplierNParentBox: "",
    supplierNParentBoxFinancing: "",
    supplierNParentBoxSCF: "",
  });

  const entityCardNegotiationSpendsSelectedId: ComputedRef<string> = computed(
    () => {
      try {
        if (ArrayUtils.isEmpty(tabsData.value)) {
          throw new Error("tabsData is empty");
        }

        if (isNullOrUndefined(selectedTabIndex.value)) {
          throw new Error("selectedTabIndex is undefined");
        }

        if (selectedTabIndex.value === 0) {
          throw new Error("supplier tab selected");
        }

        if (isNullOrUndefined(tabsData.value[selectedTabIndex.value])) {
          throw new Error("tabsDataTabSelected is undefined");
        }
        return tabsData.value[selectedTabIndex.value].spendUUID;
      } catch (error) {
        return "";
      }
    },
  );

  const entityCardNegotiationSpendsSpendSelected: ComputedRef<SpendLine | null> =
    computed(() => {
      try {
        // Validate
        if (ArrayUtils.isEmpty(listSpend.value)) {
          throw new Error("listSpend is empty");
        }

        if (StringUtils.isEmpty(entityCardNegotiationSpendsSelectedId.value)) {
          throw new Error("entityCardNegotiationSpendsSelectedId is empty");
        }

        const spend = listSpend.value.find(
          (s: SpendLine) =>
            s.spendUUID === entityCardNegotiationSpendsSelectedId.value,
        );

        if (isUndefined(spend)) {
          throw new Error("Spend not found");
        }

        return spend;
      } catch (error) {
        return null;
      }
    });

  const negotiationStatusFormatted = computed(() => {
    try {
      if (isNullOrUndefined(props.entityDetails)) {
        throw new Error("props.entityDetails is null or undefined");
      }

      // Supplier / Parent level
      if (isNull(entityCardNegotiationSpendsSpendSelected.value)) {
        return negotiationStatusGetStatusTranslated(
          props.entityDetails.negotiationStatus,
        );
      }

      // Spend level
      return negotiationStatusGetStatusTranslated(
        entityCardNegotiationSpendsSpendSelected.value.negotiationStatus,
      );
    } catch (error) {
      return undefined;
    }
  });

  const negotiationStatus = computed(() => {
    try {
      if (isNullOrUndefined(props.entityDetails)) {
        throw new Error("props.entityDetails is null or undefined");
      }

      // Supplier / Parent level
      if (isNull(entityCardNegotiationSpendsSpendSelected.value)) {
        return props.entityDetails.negotiationStatus;
      }

      // Spend level
      return entityCardNegotiationSpendsSpendSelected.value.negotiationStatus;
    } catch (error) {
      return undefined;
    }
  });

  const negotiationStatusPillColorClasses = computed(() => {
    try {
      if (isNullOrUndefined(props.entityDetails)) {
        throw new Error("props.entityDetails is null or undefined");
      }

      // Supplier / Parent level
      if (isNull(entityCardNegotiationSpendsSpendSelected.value)) {
        return negotiationStatusGetPillColorClasses(
          props.entityDetails.negotiationStatus,
        );
      }

      // Spend level
      return negotiationStatusGetPillColorClasses(
        entityCardNegotiationSpendsSpendSelected.value.negotiationStatus,
      );
    } catch (error) {
      return "";
    }
  });

  const negotiationStatusCodes = computed(() => {
    if (isNullOrUndefined(props.entityDetails)) {
      return "";
    }

    return props.entityDetails.negotiationStatusCodes;
  });

  //- To show the "agreed" option for spend level in the dropdown to change status
  const showAgreedOptionInSpendLevel = computed(() => {
    if (
      entityCardNegotiationSpendsSpendSelected.value &&
      selectedTabIndex.value !== 0
    ) {
      if (
        StringUtils.isNullUndefinedOrEmpty(
          entityCardNegotiationSpendsSpendSelected.value
            .newTermsWithoutCashDiscount,
        )
      ) {
        return false;
      }

      if (
        !StringUtils.isNullUndefinedOrEmpty(
          entityCardNegotiationSpendsSpendSelected.value.actualPaymentTerms,
        ) ||
        !StringUtils.isNullUndefinedOrEmpty(
          entityCardNegotiationSpendsSpendSelected.value
            .contractualPaymentTermsWithoutCashDiscounts,
        )
      ) {
        return true;
      }

      return false;
    } else {
      return false;
    }
  });

  const statusPill = computed<NegotiationStatusPill>(() => ({
    negotiationStatusPillColorClasses: negotiationStatusPillColorClasses.value,
    negotiationStatusFormatted: negotiationStatusFormatted.value,
    negotiationStatusCodes: negotiationStatusCodes.value,
    pillLabelNumberBadgeKey: pillLabelNumberBadgeKey.value,
    validateBelongToAplan: unref(options.validateBelongToAplan),
    negotiationStatus: negotiationStatus.value,
    showAgreedOptionInSpendLevel: showAgreedOptionInSpendLevel.value,
    entityCardNegotiationSpendsSpendSelected:
      entityCardNegotiationSpendsSpendSelected.value,
  }));

  watch(entityCardNegotiationSpendsSpendSelected, () => {
    validateDataSpends();
  });

  function validateDataSpends() {
    try {
      // Validate
      if (isNull(entityCardNegotiationSpendsSpendSelected.value)) {
        //We set the here the nineBoxes.supplierNParentBox from the high level to the boxes
        nineBoxes.boxesSelected = [nineBoxes.supplierNParentBox];
        nineBoxes.boxesSelectedFinancing = [
          nineBoxes.supplierNParentBoxFinancing,
        ];
        nineBoxes.boxesSelectedSCF = [nineBoxes.supplierNParentBoxSCF];
        showExistsTargetValue.value = null;
        throw new Error("entityCardNegotiationSpendsSpendSelected is null");
      }
      const spendSelected = entityCardNegotiationSpendsSpendSelected.value;

      nineBoxes.boxesSelected = spendSelected.box ? [spendSelected.box] : [];

      if (levelType.value !== "parent") {
        nineBoxes.boxesSelectedFinancing = spendSelected.financial_box
          ? [spendSelected.financial_box]
          : [];

        nineBoxes.boxesSelectedSCF = spendSelected.scfBox
          ? [spendSelected.scfBox]
          : [];
      }

      const searchSpendData = dataSpends.value.find(
        (spend: any) => spend.configUuid === spendSelected.uuid,
      );
      if (searchSpendData) {
        showExistsTargetValue.value =
          searchSpendData.targetCashFlow === null
            ? null
            : StringUtils.formatBigNumbers(searchSpendData.targetCashFlow);
        // agreedCashFlow / showExistsAgreedValue is owned by fetchCalculatedCashFlow (GraphQL),
        // not the paged grid — so it is no longer read from dataSpends here.
      } else {
        showExistsTargetValue.value = null;
      }
    } catch (error) {}
  }

  function setSshowExistsTarget(exists: boolean) {
    showExistsTarget.value = exists;
  }

  /**
   * Handle the negotiation status when the contact is toggled.
   * It uses a checkbox to toggle the status.
   *
   * @param {Event} e
   * @return {void}
   */
  function negotiationStatusIsContactedOnToggle(
    status: NegotiationStatus,
  ): void {
    loadingApi.value = true;

    // Toggle the negotiation status
    const newNegotiationStatus = status;

    negotiationStatusAPIUpdate({
      negotiationStatus: newNegotiationStatus,
      spendId:
        props.companyType === ENTITY_SPENDFILE_LEVEL_TYPE.PARENT
          ? props.companyId
          : entityCardNegotiationSpendsSelectedId.value,
      level:
        props.companyType === ENTITY_SPENDFILE_LEVEL_TYPE.PARENT
          ? "parent"
          : "spend",
    });
  }

  function negotiationStatusIsContactedOnToggleParentSupplierLevel(
    status: NegotiationStatus,
  ): void {
    loadingApi.value = true;
    // Toggle the negotiation status
    const newNegotiationStatus = status;

    negotiationStatusAPIUpdate({
      negotiationStatus: newNegotiationStatus,
      spendId: props.companyId,
      level:
        props.companyType === ENTITY_SPENDFILE_LEVEL_TYPE.SUPPLIER
          ? "supplier"
          : "parent",
    });
  }

  /**
   * Update the negotiation status of a spend using the API.
   * Route: POST - /api/entity-card/negotiation-status/update
   *
   * @param {Object} params - The parameters for the function.
   *   - {NegotiationStatus} status
   *   - {string} spendId
   *   - {targetSpendFileVersionUuid} targetSpendFileVersionUuid
   */
  function negotiationStatusAPIUpdate({
    negotiationStatus,
    spendId,
    level,
  }: {
    negotiationStatus: NegotiationStatus;
    spendId: string;
    level: string;
  }): void {
    try {
      // Validate
      if (StringUtils.isNullUndefinedOrEmpty(negotiationStatus)) {
        loadingApi.value = false;
        throw new Error("negotiationStatus is null, undefined or empty");
      }

      if (StringUtils.isNullUndefinedOrEmpty(spendId)) {
        loadingApi.value = false;
        throw new Error("spendId is null, undefined or empty");
      }

      if (StringUtils.isEmpty(spendFileVersionIdActive.value)) {
        loadingApi.value = false;
        throw new Error("spendFileVersionIdActive is empty");
      }

      if (
        isNullOrUndefined(entityCardNegotiationSpendsSpendSelected.value) &&
        level === "spend"
      ) {
        loadingApi.value = false;
        throw new Error(
          "entityCardNegotiationSpendsSpendSelected is null or undefined",
        );
      }

      // Enable loading
      negotiationStatusIsLoading.value = true;

      loadingApi.value = true;

      const params = {
        spendsIds: [spendId],
        negotiationStatus,
        spendFileVersionUuid: StringUtils.removeIRI(
          spendFileVersionIdActive.value,
        ),
        level,
        callbackSuccess: (callbackSuccessData: {
          result: "success" | "failed" | "warning";
          subject: string;
          summary: {
            changesCount: number;
            changedCount: number;
            suppliersCount: number;
          };
        }) => {
          const { result, subject, summary } = callbackSuccessData;
          // API call failed
          // if (result === "failed") {
          //   loadingApi.value = false;
          //   throw new Error(`API call failed. Message: ${subject}`);
          // }
          if (result === "failed") {
            loadingApi.value = false;
            negotiationStatusIsLoading.value = false;
            toast.error(subject || "Failed to apply changes.");
            return;
          }

          // No changes
          if (summary.changedCount === 0) {
            toast.warning("No changes were applied.");
          }
          // All changes were applied
          else {
            toast.success("Your changes have been applied successfully.");

            negotiationStatusStore.setTrackingNumber(
              NumberUtils.getRandomInt(),
            );
            pillLabelNumberBadgeKey.value++;
          }
          loadingApi.value = false;

          // Disable loading
          negotiationStatusIsLoading.value = false;
        },
        callbackError: (callbackErrorData: unknown) => {
          // Disable loading
          loadingApi.value = false;
          negotiationStatusIsLoading.value = false;
        },
      };

      negotiationStatusStore.negotiationStatusAPIUpdate(params);
    } catch (error) {}
  }

  return {
    entityCardNegotiationSpendsSelectedId,
    entityCardNegotiationSpendsSpendSelected,
    validateDataSpends,
    negotiationStatus,
    negotiationStatusFormatted,
    negotiationStatusPillColorClasses,
    negotiationStatusCodes,
    showAgreedOptionInSpendLevel,
    negotiationStatusIsLoading,
    negotiationStatusIsContactedOnToggle,
    negotiationStatusIsContactedOnToggleParentSupplierLevel,
    negotiationStatusAPIUpdate,
    statusPill,
    nineBoxes,
    pillLabelNumberBadgeKey,
    dataSpends,
    showExistsTarget,
    showExistsTargetValue,
    setSshowExistsTarget,
  };
};

export default useEntityNegotiationStatus;
