import { computed, ComputedRef, ref, Ref } from "vue";
import { EntityCard } from "@/types";
import { NumberUtils, StringUtils } from "@/utils";
import { useAnalyzeStore } from "@/stores/analyze";
import { useNegotiationStatusStore } from "@/stores/negotiationStatus";
import useGroupsbyProgram from "@/composables/useGroupsbyProgram";
import { useToast } from "vue-toastification";
import type {
  NegotiationHarmonizationSlice,
  NegotiationPostByGroup,
} from "@/modules/home/entityCard/components/opportunity/negotiation-view-types";

export interface UseNegotiationHarmonizationProps {
  programUuid: string;
}

export interface UseNegotiationHarmonizationOptions {
  props: Readonly<UseNegotiationHarmonizationProps>;
  spendConfigurationUuid: Ref<string> | ComputedRef<string>;
}

export type NegotiationHarmonizationOwned = {
  [K in keyof NegotiationHarmonizationSlice]: Ref<
    NegotiationHarmonizationSlice[K]
  >;
} & {
  loadingApi: Ref<boolean>;
  postByGroup: NegotiationPostByGroup;
  closeHarmonizationModal: () => void;
  userApprovedHarmonization: () => void;
  sendGroups: (idGroup: any, type: string, level: string) => void;
  retrieveHarmonizationGroupsArray: () => void;
  retrieveFinancingGroupsArray: () => void;
  patchData: (getParams: any) => void;
  setDataGroups: (
    idGroup: EntityCard.FinancingGroupAPIResponse | null,
    type: string,
    level: string | null,
  ) => void;
};

const useNegotiationHarmonization = (
  options: UseNegotiationHarmonizationOptions,
): NegotiationHarmonizationOwned => {
  const { props, spendConfigurationUuid } = options;

  const analyzeStore = useAnalyzeStore();
  const negotiationStatusStore = useNegotiationStatusStore();
  const toast = useToast();
  const {
    findHarmonizationByProgram,
    storeHarmonizationByProgram,
    findFinancingByProgram,
    storeFinancingByProgram,
  } = useGroupsbyProgram();

  const displayModelForHarmonization = ref(false);
  const selectedHarmonizationLevelText = ref("");
  const userApprovedHarmonizationOrFinance = ref("");
  const loadingApi = ref(false);

  const selectedProgramUuid = computed(() => props.programUuid);

  const postByGroup: NegotiationPostByGroup = (
    getParams,
    type,
    items,
    level = "",
  ) => {
    loadingApi.value = true;
    const params = {
      program: getParams.program,
      changed: getParams.changed,
      uuids: items,
      level: level || null,
      callbackSuccess: () => {
        loadingApi.value = false;

        //- This type(s) don't change the status for the program
        if (type === "moveSpendToPhases" || type === "removeSpendToPhases") {
          negotiationStatusStore.setTrackingNumber(NumberUtils.getRandomInt());
        }
      },
      callbackError: () => {
        loadingApi.value = false;
        toast.error("ERROR updating data");
      },
    };
    analyzeStore.postProgramSpendConfigurationbyGroups(params);
  };

  function closeHarmonizationModal() {
    displayModelForHarmonization.value = !displayModelForHarmonization.value;
  }

  function userApprovedHarmonization() {
    displayModelForHarmonization.value = false;
    if (userApprovedHarmonizationOrFinance.value === "harmonization") {
      setDataGroups(
        null,
        "harmonizationGroup",
        selectedHarmonizationLevelText.value,
      );
    }
    if (userApprovedHarmonizationOrFinance.value === "financing") {
      setDataGroups(
        null,
        "financingGroup",
        selectedHarmonizationLevelText.value,
      );
    }
  }

  function setDataGroups(
    idGroup: EntityCard.FinancingGroupAPIResponse | null,
    type: string,
    level: string | null,
  ) {
    let value;
    let uuidGroup;
    if (idGroup !== null) {
      uuidGroup = StringUtils.removeIRI(idGroup["@id"]);
      value = uuidGroup;
    } else {
      value = level;
    }
    const idProgram = selectedProgramUuid.value;
    const changed = {
      key: type,
      value,
    };
    const uuids = [spendConfigurationUuid.value];
    const params = {
      program: idProgram,
      changed,
      uuids,
      value: value,
    };
    patchData(params);
  }

  function patchData(getParams: any) {
    const params = {
      program: getParams.program,
      changed: getParams.changed,
      uuids: getParams.uuids,
      value: selectedHarmonizationLevelText.value,
      callbackSuccess: () => {},
      callbackError: () => {},
    };
    analyzeStore.postProgramSpendConfigurationbyGroups(params);
  }

  /**
   * Get the list financing groups from the API
   *
   * @returns {void}
   */
  function retrieveFinancingGroupsArray(): void {
    // Validate
    if (StringUtils.isNullUndefinedOrEmpty(selectedProgramUuid.value)) {
      return;
    } else {
      const hasFinancings = findFinancingByProgram(selectedProgramUuid.value);
      if (hasFinancings) {
        analyzeStore.setFinancing(hasFinancings);
        return;
      }
    }

    const params = {
      programId: selectedProgramUuid.value,
      callbackSuccess: (callbackSuccessData: any) => {
        // Define the interface for the callback data
        analyzeStore.setFinancing(callbackSuccessData);
        if (selectedProgramUuid.value)
          storeFinancingByProgram(
            selectedProgramUuid.value,
            callbackSuccessData,
          );
      },
      callbackError: () => {},
    };

    analyzeStore.getFinancingGroups(params);
  }

  /**
   * Get the list harmonization groups from the API
   *
   * @returns {void}
   */
  function retrieveHarmonizationGroupsArray(): void {
    if (StringUtils.isNullUndefinedOrEmpty(selectedProgramUuid.value)) {
      return;
    } else {
      const hasHarmonizations = findHarmonizationByProgram(
        selectedProgramUuid.value,
      );
      if (hasHarmonizations) {
        analyzeStore.setGroups(hasHarmonizations);
        return;
      }
    }

    const params = {
      programId: selectedProgramUuid.value,
      callbackSuccess: (callbackSuccessData: any) => {
        analyzeStore.setGroups(callbackSuccessData);
        if (selectedProgramUuid.value)
          storeHarmonizationByProgram(
            selectedProgramUuid.value,
            callbackSuccessData,
          );
      },
      callbackError: () => {},
    };

    analyzeStore.getProgramTermGroups(params);
  }

  function sendGroups(idGroup: any, type: string, level: string) {
    if (type === "harmonizationGroup") {
      userApprovedHarmonizationOrFinance.value = "harmonization";
      selectedHarmonizationLevelText.value = level;

      if (level === "supplier" || level === "parent") {
        displayModelForHarmonization.value = true;
      } else {
        setDataGroups(null, type, level);
      }
    }

    if (type === "financingGroup") {
      setDataGroups(idGroup, type, level);
    }
  }

  return {
    displayModelForHarmonization,
    selectedHarmonizationLevelText,
    userApprovedHarmonizationOrFinance,
    loadingApi,
    postByGroup,
    closeHarmonizationModal,
    userApprovedHarmonization,
    sendGroups,
    retrieveHarmonizationGroupsArray,
    retrieveFinancingGroupsArray,
    patchData,
    setDataGroups,
  };
};

export default useNegotiationHarmonization;
