import { ComputedRef, WritableComputedRef, computed } from "vue";
import { StringUtils, hasAdminPrivileges, hasCreditRatingFeature, hasDataUserRole, hasEmailNegotiationsFeature, hasManageModuleRole, hasNineBoxesFinancingFeature, hasPartnerUserRole, hasPaymentTermsVsPriceFeature, hasPilotFeature, hasSMEFeature, hasSalesUserRole, hasScfStrategyFeature, hasSuperAdminRole, hasValuePropositionFeature, hasVirtualCardFeature, isNullOrUndefined, hasLeverageDistributionFeature, hasEntityCardNewsletterFeature, hasKeepHistoricalDataFeature, hasSupplierStandardFeature, hasSupplierInsightsFeature, hasForecastVolumeFeature, hasPeerGroupStandardFeature, hasPotentialSupplierFeature, hasAiBotNegotiation, hasDownloadPdfEntityFeature, hasSupportBotFeature } from "@/utils";
import { UserSession } from "@/types";
import { useUserStore } from "@/stores/user";

  function pilotStatus(targetDateStr:string) {
    const targetDate: Date = new Date(targetDateStr);
    const currentDate: Date = new Date();
  
    // Calculate the difference in milliseconds
  const diffInMs: number = targetDate.getTime() - currentDate.getTime();

  // Convert milliseconds to days
  const diffInDays: number = Math.ceil(diffInMs / (1000 * 60 * 60 * 24));
  
    if (diffInDays > 0) {
      return `${diffInDays} ${diffInDays === 1 ? 'day' : 'days'} left in Pilot`;
    } else {
      return "Pilot Expired: Upgrade for Full Access";
    }
  }

/**
 * User Session Composable
 */
const useUser = () => {
  const userStore = useUserStore(); 

  const user: WritableComputedRef<UserSession | null> = computed({
    get: () => userStore.getUser,
    set(user: UserSession | null) {
      if (user) {
        userStore.setActualUser(user);
      } else {
        // Handle null case by setting actualUser to null directly
        userStore.$patch({ actualUser: null });
      }
    }
  });

  /**
   * Get the id of the current logged in user .
   */
  const userId: ComputedRef<string> = computed(() => {
    if (import.meta.env.DEV) {
      console.warn(
        "** DEPRECATED ** useUser / userId. Use useUserIri instead."
      );
    }

    if (isNullOrUndefined(user.value)) {
      return "";
    }

    return StringUtils.removeIRI(user.value["@id"]);
  });

  /**
   * Get the full IRI for the user resource.
   * e.g. /api/users/1
   */
  const userIri: ComputedRef<string> = computed(() => {
    if (isNullOrUndefined(user.value)) {
      return "";
    }

    return user.value["@id"];
  });

  const userSessionActiveCompany: ComputedRef<
    UserSession["activeCompany"] | null
  > = computed(() => {
    if (isNullOrUndefined(user.value)) {
      return null;
    }

    return user.value.activeCompany;
  });

  const userSessionAvailableCompanies: ComputedRef<UserSession["availableCompanies"]> = computed(
    () => {
      if (isNullOrUndefined(user.value)) {
        return [];
      }

      return user.value.availableCompanies;
    }
  );

  /**
   * Get the user roles for the session.
   *
   * @type {ComputedRef<UserSession["roles"]>}
   */
  const userSessionRoles: ComputedRef<UserSession["roles"]> = computed(() => {
    return user.value?.roles ?? [];
  });

  const userActiveSpendFileVersionId: ComputedRef<string | null> = computed(
    () => {
      if (isNullOrUndefined(user.value)) {
        return "";
      }
      return user.value.activeSpendFileVersion
        ? user.value.activeSpendFileVersion["@id"]
        : null;
    }
  );

  /**
   * Holds if user is admin.
   * ROLE_ADMIN = Super admin
   * ROLE_COMPANY_ADMIN = Admin company
   * or isSuperAdmin is true
   * @type {ComputedRef<boolean>}
   */
  const userIsAdmin: ComputedRef<boolean> = computed(
    () =>
      hasAdminPrivileges(userSessionRoles.value) ||
      (user.value?.isSuperAdmin ?? false)
  );

  /**
   * Checks if user is under pilot company, if user is not a super admin, disable the edit program button/option
   * default case is false
   * @returns {boolean}
   */
  const restrictEditProgram = () => {
    if (isPilotAccount()) {
      if (isNullOrUndefined(user.value)) {
        return false;
      }
      return (
        !user.value.isSuperAdmin 
      );
    } else {
      return false
    }
  };

  /**
   * Holds if user is super admin.
   * Check the role (ROLE_ADMIN) and isSuperAdmin is true
   *
   * @type {ComputedRef<boolean>}
   */
  const userIsSuperAdmin: ComputedRef<boolean> = computed(
    () => hasSuperAdminRole(userSessionRoles.value) || (user.value?.isSuperAdmin ?? false)
  );

  const userIsCalculumUser: ComputedRef<boolean> = computed(() => {
    if (isNullOrUndefined(user.value)) {
      return false;
    }

    return user.value.email.toLowerCase().endsWith("@calculum.ai");
  });



  const userAllowedToCatalog: ComputedRef<boolean> = computed(() => {
    if (isNullOrUndefined(user.value)) {
      return false;
    }

    if (import.meta.env.DEV) {
      return true
    }

    let availableUsers = ['oliver@calculum.ai', 'carlos@calculum.ai', 'joel@calculum.ai', 'sergio@calculum.ai', 'amir@calculum.ai', 'daniela@calculum.ai', 'afsar@calculum.ai', 'eric@calculum.ai']

    return availableUsers.includes(user.value.email.toLowerCase());
  });


  const useFeatureScfStrategy = () => {
    if (isNullOrUndefined(user.value)) {
      return false;
    }
    return hasScfStrategyFeature(userSessionRoles.value);
  };

  const useAiBotNegotiation = computed(() => {
    return hasAiBotNegotiation(userSessionRoles.value);
  });

  const useFeatureSupportBot = computed(() => {
    return hasSupportBotFeature(userSessionRoles.value);
  });

  const isPilotAccount = () => {
    if (isNullOrUndefined(user.value)) {
      return false;
    }
    return hasPilotFeature(userSessionRoles.value);
  };



  const getPilotTimeExpire = () => {
    if (isNullOrUndefined(user.value)) {
      return null
    }

    if (isPilotAccount()) {
      let dateLimit = user.value.activeCompany?.pilotTimeExpire ?? null 
       if (dateLimit) { 
        let limit = pilotStatus(dateLimit)
        return limit
      }
    }
    return null
  }

  //-This is to validate if the SFC (before called 9 box financing) feature is enabled for the company
  const useFeature9BoxesFinancing: ComputedRef<boolean> = computed(() => {
    if (isNullOrUndefined(user.value)) {
      return false;
    }    
    return hasNineBoxesFinancingFeature(userSessionRoles.value);
  });

  const useFeatureEmailNegotiations: ComputedRef<boolean> = computed(() => {
    if (isNullOrUndefined(user.value)) {
      return false;
    }
    return hasEmailNegotiationsFeature(userSessionRoles.value);
  })

  const useModuleManage : ComputedRef<boolean> = computed(() => {
    if (isNullOrUndefined(user.value)) {
      return false;
    }
    return hasManageModuleRole(userSessionRoles.value);
  })

  const userPartnerRoleEnabled : ComputedRef<boolean> = computed(() => {
    if (isNullOrUndefined(user.value)) {
      return false;
    }
    return hasPartnerUserRole(userSessionRoles.value);
  })

  const userSalesRoleEnabled : ComputedRef<boolean> = computed(() => {
    if (isNullOrUndefined(user.value)) {
      return false;
    }
    return hasSalesUserRole(userSessionRoles.value);
  })


  const userDataRoleEnabled : ComputedRef<boolean> = computed(() => {
    if (isNullOrUndefined(user.value)) {
      return false;
    }
    return hasDataUserRole(userSessionRoles.value);
  })

  /**
   * the feature which is enabled in the Admin Console Features section
   * Admin -> Company
   */
  const useFeatureVirtualCard : ComputedRef<boolean> = computed(() => {
    if (isNullOrUndefined(user.value)) {
      return false;
    }
    return hasVirtualCardFeature(userSessionRoles.value);
  })


/**
 * Feature 10 FEATURE_PAYMENT_TERMS_VS_PRICE
 * 
 */

  const useFeaturePaymentTermsvsPrice : ComputedRef<boolean> = computed(() => {
    if (isNullOrUndefined(user.value)) {
      return false;
    }
    return hasPaymentTermsVsPriceFeature(userSessionRoles.value);
  })

  /**
   * 
   *  Partner checkbox only will appear if the actual user is super admin or a Partner.
   */
  const userCouldEnablePartnerRole: ComputedRef<boolean> = computed(() => {
    if (isNullOrUndefined(user.value)) {
      return false;
    }
    return user.value.isSuperAdmin || hasPartnerUserRole(userSessionRoles.value) || hasSalesUserRole(userSessionRoles.value);;
  })

  /**
   * only super admin could enable the data role checkbox
   */
  const userCouldEnableDataRole: ComputedRef<boolean> = computed(() => {
    if (isNullOrUndefined(user.value)) {
      return false;
    }
    return user.value.isSuperAdmin 
  })


  /**
   * user has the featureSME enabled
   */
  const useFeatureSME : ComputedRef<boolean> = computed(() => {
    if (isNullOrUndefined(user.value)) {
      return false;
    }
    return hasSMEFeature(userSessionRoles.value);
  })


  /**
   * user has the featureCreditScore enabled
   */
  const useFeatureCreditRating : ComputedRef<boolean> = computed(() => {
    if (isNullOrUndefined(user.value)) {
      return false;
    }
    return hasCreditRatingFeature(userSessionRoles.value);
  })

  const useFeatureValueProposition : ComputedRef<boolean> = computed(() => {
    if (isNullOrUndefined(user.value)) {
      return false;
    }
    return hasValuePropositionFeature(userSessionRoles.value);
  })

  const useFeatureLeverageDistribution : ComputedRef<boolean> = computed(() => {
    if (isNullOrUndefined(user.value)) {
      return false;
    }
    return hasLeverageDistributionFeature(userSessionRoles.value);
  })

  const useFeatureEntityCardNewsletter : ComputedRef<boolean> = computed(() => {
    if (isNullOrUndefined(user.value)) {
      return false;
    }
    return hasEntityCardNewsletterFeature(userSessionRoles.value);
  })

  const useFeatureSupplierStandard : ComputedRef<boolean> = computed(() => {
    if (isNullOrUndefined(user.value)) {
      return false;
    }    
    return hasSupplierStandardFeature(userSessionRoles.value);
  })

  const useFeatureSupplierInsights = computed(() => {    
    return hasSupplierInsightsFeature(userSessionRoles.value);
  });

  const useFeatureDownloadPdfEntity = computed(() => {
    return hasDownloadPdfEntityFeature(userSessionRoles.value);
  });

  const usePotentialSupplierFeature = computed(() => {    
    return hasPotentialSupplierFeature(userSessionRoles.value);
  });
  
  const useFeatureForecastVolume = computed(() => {      
      return hasForecastVolumeFeature(userSessionRoles.value);
    });

  const useFeaturePeerGroupStandard : ComputedRef<boolean> = computed(() => {
    if (isNullOrUndefined(user.value)) {
      return false;
    }
    return hasPeerGroupStandardFeature(userSessionRoles.value);
  })
  /**
   * Whether the FEATURE_KEEP_HISTORICAL_DATA feature is active for the current user.
   */
  const useFeatureKeepHistoricalData: ComputedRef<boolean> = computed(() => {
    if (isNullOrUndefined(user.value)) {
      return false;
    }
    return hasKeepHistoricalDataFeature(userSessionRoles.value);
  });

  const getIsAdaWelcomeVideo = computed(() => {
    if (isNullOrUndefined(user.value)) {
      return false;
    }

    return user.value.isAdaWelcomeVideo
  })


  const getExternalFinancing = computed(() => {
    if (isNullOrUndefined(user.value)) {
      return false;
    }

    return user.value.activeProgramExternalFinancingEnabled      
  })


  const hideAverageDaysPaid = computed(() => userStore.getHideAverageDaysPaid)


  function updateIsAdaWelcomeVideo(status: boolean) {
    if (isNullOrUndefined(user.value)) {
      return null;
    }

    user.value = {
      ...user.value,
      isAdaWelcomeVideo: status
    }
  }

  function updateExternalFinancing(status: boolean) {
    if (isNullOrUndefined(user.value)) {
      return null;
    }

    user.value = {
      ...user.value,
      activeProgramExternalFinancingEnabled: status
    }
  }

  return {
    getPilotTimeExpire,
    isPilotAccount,
    restrictEditProgram,
    useFeature9BoxesFinancing,
    useFeatureCreditRating,
    useFeatureEmailNegotiations,
    useFeaturePaymentTermsvsPrice,
    useFeatureScfStrategy,
    useFeatureSME,
    useFeatureVirtualCard,
    useModuleManage,    
    user,
    userActiveSpendFileVersionId,
    userCouldEnableDataRole,
    userCouldEnablePartnerRole,
    userDataRoleEnabled,
    userId,
    userIri,
    userIsAdmin,
    userIsCalculumUser,
    userIsSuperAdmin,
    userPartnerRoleEnabled,
    userSessionActiveCompany,
    userSessionAvailableCompanies,
    userSessionRoles,
    userAllowedToCatalog,
    userSalesRoleEnabled,
    useFeatureValueProposition,
    useFeatureLeverageDistribution,
    useFeatureEntityCardNewsletter,
    useFeatureSupplierStandard,
    useFeaturePeerGroupStandard,
    useFeatureKeepHistoricalData,
    useFeatureSupplierInsights,
    useFeatureDownloadPdfEntity,
    useFeatureForecastVolume,
    getIsAdaWelcomeVideo,
    updateIsAdaWelcomeVideo,
    usePotentialSupplierFeature,
    hideAverageDaysPaid,
    getExternalFinancing,
    updateExternalFinancing,
    useAiBotNegotiation,
    useFeatureSupportBot
  };
};

export default useUser;
