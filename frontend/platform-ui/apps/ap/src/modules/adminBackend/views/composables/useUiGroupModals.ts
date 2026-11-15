import { ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useToast } from 'vue-toastification';
import { useAdminBackendStore } from '@/stores/adminBackend';
import type { UiGroup } from '@/modules/adminBackend/types';

export interface UseUiGroupModalsOptions {
  getGroups: () => void;
}

export function useUiGroupModals(options: UseUiGroupModalsOptions) {
  const { t } = useI18n({ useScope: 'global' });
  const toast = useToast();
  const adminBackendStore = useAdminBackendStore();
  const { getGroups } = options;

  const isDeleteModalShowing = ref(false);
  const tempObjDeleteId = ref('');
  const isFilterShowing = ref(false);
  const isModalUiGroupShowing = ref(false);
  const currentUiGroupObj = ref(0);
  const uiGroupModalSelectedCompanies = ref<Array<{ uuid: string }>>([]);
  const forSpecificUiGroup = ref(false);
  const forEditViewUiGroup = ref(false);
  const isDeleting = ref(false);
 
  function showModalForDelete(uiGroup: UiGroup): void {
    isDeleteModalShowing.value = true;
    const parts = (uiGroup['@id'] ?? '').split('/');
    tempObjDeleteId.value = parts[3] ?? '';
  }

  function hideDeleteModal(): void {
    isDeleteModalShowing.value = false;
  }

  function deleteUiGroup(): void {
    isDeleteModalShowing.value = false;
    isDeleting.value = true;
    adminBackendStore.deleteSelectedUiGroup({
      uuid: tempObjDeleteId.value,
      callbackSuccess: () => {
        toast.success(t('adminBackend.uiGroupsAdmin.successDeleteUiGroup'));
        isDeleting.value = false;
        getGroups();
      },
      callbackError: () => {
        toast.error(t('adminBackend.uiGroupsAdmin.errorDeleteUiGroup'));
        isDeleting.value = false;
      },
    });
  }

  function showConfirmModal(uiGroupIndex: number, values: Array<{ uuid: string }>): void {
    isModalUiGroupShowing.value = true;
    isFilterShowing.value = false;
    currentUiGroupObj.value = uiGroupIndex;
    uiGroupModalSelectedCompanies.value = values;
  }

  function hideConfirmModal(): void {
    isModalUiGroupShowing.value = false;
  }

  function toggleFilterForEditView(): void {
    forSpecificUiGroup.value = true;
    isFilterShowing.value = true;
  }

  function toggleFilter(): void {
    forSpecificUiGroup.value = false;
    isFilterShowing.value = true;
  }

  function showFilter(getListOfCompanies: () => void): void {
    isModalUiGroupShowing.value = false;
    isFilterShowing.value = true;
    forSpecificUiGroup.value = true;
    getListOfCompanies();
  }

  function showModalForUiCompanies(
    uiGroup: UiGroup,
    listGroups: UiGroup[]
  ): void {
    currentUiGroupObj.value = listGroups.indexOf(uiGroup);
    isFilterShowing.value = true;
    forEditViewUiGroup.value = false;
    forSpecificUiGroup.value = true;
  }

  return {
    isDeleteModalShowing,
    tempObjDeleteId,
    isFilterShowing,
    isModalUiGroupShowing,
    currentUiGroupObj,
    uiGroupModalSelectedCompanies,
    forSpecificUiGroup,
    forEditViewUiGroup,
    isDeleting,
    showModalForDelete,
    hideDeleteModal,
    deleteUiGroup,
    showConfirmModal,
    hideConfirmModal,
    toggleFilterForEditView,
    toggleFilter,
    showFilter,
    showModalForUiCompanies,
  };
}
