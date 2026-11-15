import { ref } from 'vue';
import { useAdminBackendStore } from '@/stores/adminBackend';
import DateUtils from '@/utils/DateUtils';
import type { UiGroup } from '@/modules/adminBackend/types';
import { adminManageUIGroupColumns } from '@/modules/adminBackend/data/columns';

const DEFAULT_LIMIT_USER = 3;

function getCompanyNames(companies: Array<{ name: string }> | undefined): string {
  if (!companies?.length) return '';
  return companies.map((c) => c.name).join(', ');
}


export function useUiGroupsList(getUserLanguage: () => string) {
  const adminBackendStore = useAdminBackendStore();
  const listGroups = ref<UiGroup[]>([]);
  const loading = ref(false);
  const checkedGroups = ref(false);
  const sumKeyForList = ref(0);

  function formatDate(date: string): string {
    const language = getUserLanguage();
    return DateUtils.formatDate(date, language, {
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
    });
  }

  

  function parseData(defaultLimitUser: number = DEFAULT_LIMIT_USER): void {
    const parsed: UiGroup[] = [];
    sumKeyForList.value += listGroups.value.length;
    listGroups.value.forEach((uiGroup: any) => {
      uiGroup.name = uiGroup.name + '';
      uiGroup.companiesCount = Array.isArray(uiGroup.companies) ? uiGroup.companies.length : 0;
      uiGroup.companyNames = getCompanyNames(uiGroup.companies);
      uiGroup.created = formatDate(uiGroup.created);
      uiGroup.maxNumberOfUsers = uiGroup.maxNumberOfUsers ?? defaultLimitUser;
      uiGroup.allowedDomains = Array.isArray(uiGroup.allowedDomains)
        ? (uiGroup.allowedDomains as string[]).join(', ')
        : (uiGroup.allowedDomains ?? '');
      parsed.push(uiGroup);
    });
    listGroups.value = parsed;
  }

  function getGroups(): void {
    loading.value = true;
    adminBackendStore.getUiGroups({
      filters: [],
      callbackSuccess: (data: any) => {
        loading.value = false;
        listGroups.value = data?.['hydra:member'] ?? [];
        checkedGroups.value = true;
        parseData();
      },
      callbackError: () => {
        loading.value = false;
        checkedGroups.value = true;
      },
    });
  }

  return {
    listGroups,
    loading,
    checkedGroups,
    sumKeyForList,
    columns: adminManageUIGroupColumns,
    getGroups,
    parseData,
    formatDate,
    getCompanyNames,
  };
}
