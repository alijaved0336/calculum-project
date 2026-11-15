import { ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useToast } from 'vue-toastification';
import { useAdminBackendStore } from '@/stores/adminBackend';
import type { CompanyForFilter } from '@/modules/adminBackend/types';

export function useUiGroupCompaniesFilter() {
  const { t } = useI18n({ useScope: 'global' });
  const toast = useToast();
  const adminBackendStore = useAdminBackendStore();

  const listOfCompanies = ref<CompanyForFilter[]>([]);
  const loadingListOfCompaniesForFilter = ref(false);
  const filterWasActivated = ref(false);
  const selectedCompanies = ref<Array<{ uuid: string }>>([]);

  function getListOfCompaniesForFilter(): void {
    loadingListOfCompaniesForFilter.value = true;
    adminBackendStore.getListOfCompaniesForFilter({
      callbackSuccess: (callbackData: Array<{ name: string; uuid: string }>) => {
        listOfCompanies.value = callbackData
          .map((company) => ({
            name: company.name,
            uuid: company.uuid,
            selected: false,
          }))
          .sort((a, b) => a.name.localeCompare(b.name));
        loadingListOfCompaniesForFilter.value = false;
      },
      callbackError: () => {
        toast.error(t('adminBackend.uiGroupsAdmin.cannotGetCompaniesList'));
        loadingListOfCompaniesForFilter.value = false;
      },
    });
  }

  function saveAndCloseFilter(savedValues: CompanyForFilter[]): void {
    filterWasActivated.value = true;
    selectedCompanies.value = savedValues.filter((c) => c.selected).map((c) => ({ uuid: c.uuid }));
    listOfCompanies.value = listOfCompanies.value.map((company) => {
      const saved = savedValues.find((item) => item.uuid === company.uuid);
      return saved ? { ...company, selected: saved.selected } : company;
    });
    const names = listOfCompanies.value.filter((c) => c.selected).map((c) => c.name);
    adminBackendStore.setUiGroupFormSelectedCompanyNames(names);
  }

  function closeFilter(): void {
    listOfCompanies.value.forEach((item) => {
      item.selected = false;
    });
  }

  function resetSelection(): void {
    listOfCompanies.value.forEach((item) => {
      item.selected = false;
    });
    selectedCompanies.value = [];
    filterWasActivated.value = false;
  }

  return {
    listOfCompanies,
    loadingListOfCompaniesForFilter,
    filterWasActivated,
    selectedCompanies,
    getListOfCompaniesForFilter,
    saveAndCloseFilter,
    closeFilter,
    resetSelection,
  };
}
