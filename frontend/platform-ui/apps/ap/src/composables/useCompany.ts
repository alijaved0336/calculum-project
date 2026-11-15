import { ComputedRef, WritableComputedRef, computed } from "vue";
import { StringUtils, isNullOrUndefined } from "@/utils";
import { UserSession, UserSessionActiveCompany } from "@/types";
import { useUser } from "@/composables";
import { getMediaUrl } from "@/services/media/mediaActions";

/** Split a comma/newline separated domain list into its raw entries. */
const splitDomains = (value?: string[] | string | null): string[] => {
  return isNullOrUndefined(value) ? [] : String(value).split(/[\n,]+/);
};

/**
 * Company
 */
const useCompany = () => {
  const { user } = useUser();
  const companyActive: WritableComputedRef<UserSession["activeCompany"]> = computed(
    {
      get: () => {
        if (isNullOrUndefined(user.value)) {
          return null;
        }        

        return user.value.activeCompany;
      },
      set(company: UserSession["activeCompany"]) {
        
        if (isNullOrUndefined(user.value)) {
          return;
        }

        user.value = {
          ...user.value,
          activeCompany: company
        };
      }
    }
  );

  const companyActiveIri: ComputedRef<string> = computed(() => {
    // Validate
    if (isNullOrUndefined(companyActive.value)) {
      return "";
    }

    return companyActive.value["@id"];
  });

  /**
   * Get the id of the active company.
   * If the active company is null or undefined, return an empty string.
   *
   * @return {string}
   */
  const companyActiveId: ComputedRef<string> = computed(() => {
    return StringUtils.removeIRI(companyActiveIri.value);
  });


  /**
   * Get the name of the active company.
   * If the active company is null or undefined, return an empty string.
   *
   * @return {string}
   */
  const companyActiveName: ComputedRef<string> = computed(() => {
    return companyActive.value?.name ?? "";
  });

  const companyActiveSpendFileVersions: ComputedRef<UserSessionActiveCompany["spendFileVersions"]> = computed(
    () => {
      if (isNullOrUndefined(companyActive.value)) {
        return [];
      }

      if (isNullOrUndefined(companyActive.value.spendFileVersions)) {
        return [];
      }      
      return companyActive.value.spendFileVersions
    }
  );

  const companyActiveLogoPublicUrl: ComputedRef<string> = computed(() => {
    // Validate
    if (
      isNullOrUndefined(companyActive.value) ||
      isNullOrUndefined(companyActive.value.logo)
    ) {
      return "";
    }

    const url = getMediaUrl(companyActive.value.logo.publicUrl);

    // Validate
    if (isNullOrUndefined(url)) {
      return "";
    }

    return url;
  });

  const companyActiveUIGroupLogoPath: ComputedRef<string> = computed(() => {
    // Validate
    if (
      isNullOrUndefined(companyActive.value) ||
      isNullOrUndefined(companyActive.value.uiGroup)
    ) {
      return "";
    }

    // Validate
    if (isNullOrUndefined(companyActive.value.uiGroup)) {
      return "";
    }
    const url = getMediaUrl(companyActive.value.uiGroup.logoPath);

    return url;
  });



    const isNecessaryRemoveAdaReferences: ComputedRef<boolean> = computed(() => {
    // Validate
    if (
      isNullOrUndefined(companyActive.value) ||
      isNullOrUndefined(companyActive.value.uiGroup)
    ) {
      return false;
    }
    
    return companyActive.value.uiGroup.removeAdaCalculumReferences
  });

  const companyActiveTeams: ComputedRef<UserSessionActiveCompany["teams"]> = computed(
    () => {
      const result = companyActive.value?.teams ?? [];
      return result;
    }
  );

  const usevCardGroupsEnabled: ComputedRef<boolean> = computed(() => {
    // Validate
    if (
      isNullOrUndefined(companyActive.value)
    ) {
      return false;
    }

    // Validate
    if (isNullOrUndefined(companyActive.value.vCardGroupsEnabled)) {
      return false;
    }    

    return companyActive.value.vCardGroupsEnabled
  });

  /**
   * Updates the vCard groups enabled status for the active company, when user enabled or disabled in Setup/Vcard
   * 
   * @param {any} status - The new status to set for vCard groups.
   *                              If null, vCard groups will be disabled.
   */
  function updatevCardGroupsEnabled(status: any) {
    // Check if user or active company is null or undefined
    if (isNullOrUndefined(user.value) || isNullOrUndefined(user.value.activeCompany)) {
      return;
    }  
    
    // Update the active company's vCardGroupsEnabled property
    user.value.activeCompany = {
      ...user.value.activeCompany,
      vCardGroupsEnabled: status
    }
  }

  const activeCurrency: ComputedRef<string> = computed(() => {
    if (isNullOrUndefined(companyActive.value)) {
      return "";
    }

    return companyActive?.value?.currency?.code;
  });

  const activeCurrencyIri: ComputedRef<string> = computed(() => {
    if (isNullOrUndefined(companyActive.value)) {
      return "";
    }

    return companyActive?.value?.currency?.['@id']
  });

  const allowedDomains: ComputedRef<string | null> = computed(() => {
    if (isNullOrUndefined(companyActive.value)) {
      return "";
    }

    return companyActive?.value?.allowedDomains
  });

  /**
   * Allowed email domains for user invitations, merging the company list
   * (comma/newline separated string) with the UI group list (array or string).
   *
   * An empty list means "no restriction", mirroring the API
   * (AllowedDomainsHelper::isDomainAllowed): when neither the company nor its
   * UI group declares a domain, any domain is accepted.
   */
  const allowedDomainsList: ComputedRef<string[]> = computed(() => {
    if (isNullOrUndefined(companyActive.value)) {
      return [];
    }

    const groupDomains = (companyActive.value.uiGroup as { allowedDomains?: string[] | string | null })?.allowedDomains;

    const domains = [
      ...splitDomains(companyActive.value.allowedDomains),
      ...(Array.isArray(groupDomains) ? groupDomains : splitDomains(groupDomains))
    ]
      .map((domain: string) => domain.trim().toLowerCase())
      .filter((domain: string) => domain !== "");

    return [...new Set(domains)];
  });

  /**
   * Whether user invitations are restricted to a set of domains.
   */
  const hasAllowedDomainsRestriction: ComputedRef<boolean> = computed(() => {
    return allowedDomainsList.value.length > 0;
  });

  const getPotentialSupplierRequestLimit: ComputedRef<number | null> = computed(() => {
    if (isNullOrUndefined(companyActive.value)) {
      return null;
    }

    return companyActive?.value?.potentialSupplierRequestLimit ?? null
  });

   const getTenantId: ComputedRef<string> = computed(() => {
    if (isNullOrUndefined(companyActive.value)) {
      return '';
    }
    return companyActive.value.tenantId
  });

  
  return {
    activeCurrency,
    companyActive,
    companyActiveId,
    companyActiveIri,
    companyActiveLogoPublicUrl,
    companyActiveName,
    companyActiveSpendFileVersions,
    companyActiveTeams,
    companyActiveUIGroupLogoPath,
    usevCardGroupsEnabled,
    updatevCardGroupsEnabled,
    allowedDomains,
    allowedDomainsList,
    hasAllowedDomainsRestriction,
    activeCurrencyIri,
    isNecessaryRemoveAdaReferences,
    getPotentialSupplierRequestLimit,
    getTenantId
  };
};

export default useCompany;
