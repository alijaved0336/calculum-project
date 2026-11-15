import { ComputedRef, computed, WritableComputedRef, watch } from "vue";
import { isNullOrUndefined, StringUtils } from "@/utils";
import { NewsConfig, UserSession, typeOfOpportunityVisibility, typeOfSupplierStrategyVisibility } from "@/types";
import { useUser } from "@/composables";
import { useToast } from "vue-toastification";
import { useUserStore } from "@/stores/user";
import { formatISODateToUS } from "@/utils/FormatData";

/**
 * Spend File composable.
 * It provides access to the active spend file version and its properties.
 */
const useSpendFile = () => {
  const { user } = useUser();
  const userStore = useUserStore();
  const toast = useToast();

  const spendFileVersionActive: WritableComputedRef<UserSession["activeSpendFileVersion"]> = computed(
    {
      get: () => {
        if (isNullOrUndefined(user.value)) {
          return null;
        }

        return user.value.activeSpendFileVersion;
      },
      set(spendfile: UserSession["activeSpendFileVersion"]) {
        if (isNullOrUndefined(user.value)) {
          return;
        }


        if (import.meta.env.DEV) console.log("** spendfile",spendfile)

        user.value = {
          ...user.value,
          activeSpendFileVersion: spendfile
        };
      }
    }
  );

  const spendFileVersionActiveIri: ComputedRef<string> = computed(() => {
    // Validate
    if (isNullOrUndefined(spendFileVersionActive.value)) {
      return "";
    }

    return spendFileVersionActive.value["@id"];
  });

  const spendFileVersionActiveId: ComputedRef<string> = computed(() => {
    // Validate
    if (isNullOrUndefined(spendFileVersionActive.value)) {
      return "";
    }

    return StringUtils.removeIRI(spendFileVersionActiveIri.value);
  });

  /**
   * Show notification when the active spend file version id changes
   */
  watch(spendFileVersionActive, () => {
    const showNoty = userStore.getShowSpendNoty
    if (showNoty) {
      return 
    }
    if (isNullOrUndefined(spendFileVersionActive.value)) {
      return;
    }
    if (StringUtils.isNullUndefinedOrEmpty(spendFileVersionActiveId.value)) {
      return;
    }
    toast.success(`Spend file ${spendFileVersionActive.value.name} version ${spendFileVersionActive.value.version} is now active.`);
    userStore.setShowSpendNoty(true)
  });

  const spendFileVersionActiveHasPendingRecalculation = computed(() => {
    if (isNullOrUndefined(spendFileVersionActive.value)) {
      return false;
    }

    return spendFileVersionActive.value.pendingRecalculation;
  });

  const spendFileVersionIsPrivate = computed(() => {
    if (isNullOrUndefined(spendFileVersionActive.value)) {
      return false;
    }
    
    return spendFileVersionActive.value.isPublic === false;
  })

  const spendFileVersionActiveName = computed(() => {
    // Validate that user and activeSpendFileVersion are not null
    if (
      isNullOrUndefined(user.value) ||
      isNullOrUndefined(user.value.activeSpendFileVersion)
    ) {
      return "";
    }

    return user.value.activeSpendFileVersion.name;
  });

  const spendFileVersionActiveVersionNumber = computed(() => {
    // Validate
    if (isNullOrUndefined(spendFileVersionActive.value)) {
      return null;
    }

    return spendFileVersionActive.value.version;
  });

  const spendFileVersionPlansAmount = computed(() => {
    // Validate
    if (isNullOrUndefined(spendFileVersionActive.value)) {
      return null;
    }

    return spendFileVersionActive.value.plansAmount;
  });

  /**
   * Custom data points names for the active spend file
   * example:
   * ["Revenue", "Costs", "Profit"]
   *
   * @type {ComputedRef<string[]>}
   * @memberof useSpendFile
   */
  const spendFileVersionActiveNameCustomDataPoints: ComputedRef<string[]> = computed(
    () => spendFileVersionActive.value?.nameCustomDataPoints ?? []
  );

  /**
   * Whether each custom data point slot carries any spend data, same slot order as
   * spendFileVersionActiveNameCustomDataPoints (index 0 => Custom Data Point 1).
   *
   * Bug#18966: needed together with the titles to decide what to show. An untitled slot arrives
   * titled "Custom Column N", so the title alone cannot tell "untitled but filled" (must be shown)
   * from "untitled and empty" (must be dropped).
   *
   * @type {ComputedRef<boolean[]>}
   * @memberof useSpendFile
   */
  const spendFileVersionActiveCustomDataPointsHasData: ComputedRef<boolean[]> = computed(
    () => spendFileVersionActive.value?.customDataPointsHasData ?? []
  );


  const showOpportunityExpectedOpportunity = computed(() => {
    // Validate
    if (isNullOrUndefined(spendFileVersionActive.value)) {
      return null;
    }

    if (isNullOrUndefined(spendFileVersionActive.value.showOpportunityExpectedOpportunity)) {
      return 'OPPORTUNITY_AND_EXPECTED';
    }
    return spendFileVersionActive.value.showOpportunityExpectedOpportunity;
  });


  const getStrategiesVisibility = computed(() => {
    // Validate
    if (isNullOrUndefined(spendFileVersionActive.value)) {
      return null;
    }

    if (isNullOrUndefined(spendFileVersionActive.value.strategiesVisibility)) {
      return 'ALL';
    }
    return spendFileVersionActive.value.strategiesVisibility;
  });

  const spendFileVersionActiveInitialDateAndEndDate = computed(() => {
    if (isNullOrUndefined(spendFileVersionActive.value) || 
        isNullOrUndefined(spendFileVersionActive.value.initialDate) || 
        isNullOrUndefined(spendFileVersionActive.value.finalDate)) {
      return null;
    }
    return `${formatISODateToUS(spendFileVersionActive.value.initialDate)} - ${formatISODateToUS(spendFileVersionActive.value.finalDate)}`;
  });

  function updateOpportunityVisibility(status: typeOfOpportunityVisibility) {
    // Check if user or active activeSpendFileVersion is null or undefined
    if (isNullOrUndefined(user.value) || isNullOrUndefined(user.value.activeSpendFileVersion)) {
      return null;
    }

    // user.value = {
    //   ...user.value,
    //   activeSpendFileVersion: {
    //     ...user.value.activeSpendFileVersion,
    //     opportunityVisibility: status
    //   }
    // }

    user.value.activeSpendFileVersion = {
      ...user.value.activeSpendFileVersion,
      showOpportunityExpectedOpportunity: status      
    }
  }

  function updateStrategiesVisibility(status: typeOfSupplierStrategyVisibility) {
    // Check if user or active activeSpendFileVersion is null or undefined
    if (isNullOrUndefined(user.value) || isNullOrUndefined(user.value.activeSpendFileVersion)) {
      return null;
    }

    user.value.activeSpendFileVersion = {
      ...user.value.activeSpendFileVersion,
      strategiesVisibility: status      
    }
  }

  const getNewsConfig = computed(() => {
    if (isNullOrUndefined(user.value) || isNullOrUndefined(user.value.activeSpendFileVersion) || isNullOrUndefined(user.value.activeSpendFileVersion.newsConfig)) {
      return null;
    }
    return user.value.activeSpendFileVersion.newsConfig;
  });

  function updateNewsConfig(newsConfig: NewsConfig) {
    if (isNullOrUndefined(user.value) || isNullOrUndefined(user.value.activeSpendFileVersion)) {
      return null;
    }
    user.value.activeSpendFileVersion = {
      ...user.value.activeSpendFileVersion,
      newsConfig: newsConfig
    }
  }


  return {
    spendFileVersionActive,
    spendFileVersionActiveHasPendingRecalculation,
    spendFileVersionActiveId,
    spendFileVersionActiveIri,
    spendFileVersionActiveName,
    spendFileVersionActiveNameCustomDataPoints,
    spendFileVersionActiveCustomDataPointsHasData,
    spendFileVersionActiveVersionNumber,
    spendFileVersionIsPrivate,
    spendFileVersionPlansAmount,
    showOpportunityExpectedOpportunity,
    updateOpportunityVisibility,
    getStrategiesVisibility,
    updateStrategiesVisibility,
    spendFileVersionActiveInitialDateAndEndDate,
    getNewsConfig,
    updateNewsConfig
  };
};

export default useSpendFile;
