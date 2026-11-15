import { computed, ComputedRef } from 'vue';
import { isNullOrUndefined } from '@/utils';
import useUser from '@/services/user/composables/useUser';

export const useCompareCompany = () => {
  const { user } = useUser();

  const compareCompany: ComputedRef<any> = computed(() => {
    if (isNullOrUndefined(user.value?.activeCompany)) {
      return null;
    }
    return user.value.activeCompany.compareCompany;
  });

  const compareCompanyId: ComputedRef<string | null> = computed(() => {
    if (isNullOrUndefined(compareCompany.value)) {
      return null;
    }
    return compareCompany.value['@id'];
  });

  function updateCompareCompany(newCompareCompany: any) {
    if (isNullOrUndefined(user.value) || isNullOrUndefined(user.value.activeCompany)) {
      return;
    }

    const setNewCompareCompany = {        
      "@id": newCompareCompany['@id'],
      "@type": "CompareCompany",
      "name": newCompareCompany.entityName,
      "country": null,
      "domain": ""
    };

    user.value.activeCompany = {
      ...user.value.activeCompany,
      compareCompany: setNewCompareCompany
    };
  }

  function removeCompareCompany() {
    if (isNullOrUndefined(user.value) || isNullOrUndefined(user.value.activeCompany)) {
      return;
    }
    
    user.value.activeCompany = {
      ...user.value.activeCompany,
      compareCompany: null
    };
  }

  return {
    compareCompany,
    compareCompanyId,
    updateCompareCompany,
    removeCompareCompany
  };
}; 