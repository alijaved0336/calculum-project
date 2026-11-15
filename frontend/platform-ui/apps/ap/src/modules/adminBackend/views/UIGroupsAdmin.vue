<template>
<div class="page-content-overflow2">
  <section class="page-content-top">
    <h3>Groups</h3>
  </section>
  <section class="page-content">
    <div class="col-12">
      <CalculumUiGroupModal :isUiCompanyModalShowing="isModalUiGroupShowing" :uiGroup="currentGroupForModal || {}" :uiGroupModalSelectedCompanies="uiGroupModalSelectedCompanies" @save-companies="handleModalSaveCompanies" @hide="hideConfirmModal"></CalculumUiGroupModal>
      <CalculumAnalyzeFilter v-if="isFilterShowing" :currentUiGroupObj="currentGroupForModal" :forSpecificUiGroup="forSpecificUiGroup" :forEditViewUiGroup="isForEditViewUiGroup ? currentGroupForModal : undefined" isForUIGroupsFilter="isForUIGroupsFilter" filterTitle="Companies" :availableFilters="[]" :isEditMode="false" :listOfCompanies="listOfCompanies" @saveAndCloseFilter="handleSaveAndCloseFilter" @close="handleCloseFilter" @updateGridUiGroup="handleShowConfirmModal"></CalculumAnalyzeFilter>
      <CalculumConfirmModal :isDeleteModalShowing="isDeleteModalShowing" isForUiGroup="isForUiGroup" @edit="handleShowFilter" @delete="deleteUiGroup" @hide="hideDeleteModal"></CalculumConfirmModal>
      <div class="container-fluid" v-if="showCard === 'edit' || showCard === 'create'">
        <div class="card">
          <UIGroupFormCard ref="formCardRef" :key="'edit-' + currentUiGroupObj" :mode="showCard === 'edit' ? 'edit' : 'create'" :companyNameFirstLetter="(companyNameFirstLetter as unknown as string) ?? ''" :initialGroup="editInitialGroup" :initialLogoUrl="companyActiveUIGroupLogoPath ?? ''" :isSavingUiGroup="isSavingUiGroup" @submit="onFormSubmit" @cancel="goBackToUiGroups" @add-companies="toggleFilterForEditView"></UIGroupFormCard>
        </div>
      </div>
      <div class="container-fluid" v-if="showCard === 'list'">
        <div class="card">
          <UIGroupsListView :listGroups="listGroups" :loading="loading" :checkedGroups="checkedGroups" :columns="columns" :sumKeyForList="sumKeyForList" @create-new="createNewUiGroup" @edit="editUiGroup" @edit-companies="handleShowModalForUiCompanies" @delete="showModalForDelete" @show-error="showErrorMessageNoty"></UIGroupsListView>
        </div>
      </div>
      <div class="container-fluid mt-3" v-if="showLoadingBlock">
        <div class="card">
          <div class="col-lg-12 col-xl-12 p-5">
            <div class="h3 title">{{ $t('adminBackend.uiGroupsAdmin.title') }}</div>
            <CalculumLoading block="block"></CalculumLoading>
          </div>
        </div>
      </div>
    </div>
  </section>
</div>
</template>

<script lang="ts">
import { defineComponent, ref, computed, onMounted, nextTick } from "vue";
import { useI18n } from "vue-i18n";
import { useToast } from "vue-toastification";
import { useAdminBackendStore } from "@/stores/adminBackend";
import useCompany from "@/composables/useCompany";
import useUser from "@/services/user/composables/useUser";
import { CalculumLoading } from '@ada/design-system'
import CalculumConfirmModal from "@/modules/components/CalculumConfirmModal.vue";
import CalculumAnalyzeFilter from "@/modules/components/filter/CalculumAnalyzeFilter.vue";
import CalculumUiGroupModal from "@/modules/components/CalculumUiGroupModal.vue";
import UIGroupFormCard from "@/modules/adminBackend/components/UIGroupFormCard.vue";
import UIGroupsListView from "@/modules/adminBackend/components/UIGroupsListView.vue";
import { useUiGroupsList } from "./composables/useUiGroupsList";
import { useUiGroupCompaniesFilter } from "./composables/useUiGroupCompaniesFilter";
import { useUiGroupModals } from "./composables/useUiGroupModals";
import {
  mapCompaniesFromIri,
  mapCompaniesFromUuid,
} from "./composables/validationHelpers";
import { StringUtils } from "@/utils";
import { MAX_FILE_SIZE_MB } from "./composables/constants";
import type { UiGroup, UiGroupFormPayload } from "@/modules/adminBackend/types";

/** Exposed API from UIGroupFormCard (getFormPayload via expose()) */
interface UIGroupFormCardRef {
  getFormPayload?: () => UiGroupFormPayload;
}
function buildPayloadFromUiGroup(uiGroup: any): UiGroupFormPayload {
  let allowedDomainsStr = "";
  if (typeof uiGroup.allowedDomains === "string") {
    allowedDomainsStr = uiGroup.allowedDomains;
  } else if (Array.isArray(uiGroup.allowedDomains)) {
    allowedDomainsStr = (uiGroup.allowedDomains as string[]).join(", ");
  }
  return {
    groupName: uiGroup.name ?? "",
    primaryColor: uiGroup.primaryColor ?? "#C11A36",
    limitUser: uiGroup.maxNumberOfUsers ?? 3,
    allowedDomains: allowedDomainsStr,
    checkingDomains: StringUtils.getDomains(allowedDomainsStr),
    file: null,
    nameIsEmpty: false,
    fileSizeTooBig: false,
    removeAdaCalculumReferences: uiGroup.removeAdaCalculumReferences ?? false,
  };
}
export default defineComponent({
  name: "UIGroupsAdmin",
  components: {
    CalculumLoading,
    CalculumConfirmModal,
    CalculumAnalyzeFilter,
    CalculumUiGroupModal,
    UIGroupFormCard,
    UIGroupsListView,
  },
  setup() {
    const { t } = useI18n({ useScope: "global" });
    const toast = useToast();
    const adminBackendStore = useAdminBackendStore();
    const { companyActive, companyActiveUIGroupLogoPath } = useCompany();
    const { user } = useUser();

    const companyNameFirstLetter = computed(() =>
      companyActive.value ? companyActive.value.name.charAt(0) : "",
    );

    // View state
    const isViewGroupsShowing = ref(true);
    const isCreatingGroupViewShowing = ref(false);
    const isUploadingCustomLogo = ref(false);
    const companyIdForImageUpload = ref("");
    const isSavingUiGroup = ref(false);
    const formCardRef = ref<UIGroupFormCardRef | null>(null);
    const pendingLogoFile = ref<File | null>(null);

    // List
    const listComposable = useUiGroupsList(() => user.value?.language ?? "en");
    const {
      listGroups,
      loading,
      checkedGroups,
      sumKeyForList,
      columns,
      getGroups,
    } = listComposable;

    // Companies filter
    const companies = useUiGroupCompaniesFilter();
    const {
      listOfCompanies,
      filterWasActivated,
      selectedCompanies,
      getListOfCompaniesForFilter,
      saveAndCloseFilter,
      closeFilter,
      resetSelection,
    } = companies;

    // Modals (depends on getGroups)
    const modals = useUiGroupModals({ getGroups });
    const {
      isDeleteModalShowing,
      isFilterShowing,
      isModalUiGroupShowing,
      currentUiGroupObj,
      uiGroupModalSelectedCompanies,
      forSpecificUiGroup,
      forEditViewUiGroup: isForEditViewUiGroup,
      isDeleting,
      showModalForDelete,
      hideDeleteModal,
      deleteUiGroup,
      showConfirmModal: modalsShowConfirmModal,
      hideConfirmModal,
      toggleFilterForEditView,
      showFilter: modalsShowFilter,
      showModalForUiCompanies: modalsShowModalForUiCompanies,
    } = modals;

    const currentGroupForModal = computed((): Record<string, any> => {
      const list = listGroups.value;
      const idx = currentUiGroupObj.value;
      const group = list[idx];
      return group ?? {};
    });

    const showCard = computed(() => {
      const create =
        !isViewGroupsShowing.value && isCreatingGroupViewShowing.value;
      const edit = !isViewGroupsShowing.value && isForEditViewUiGroup.value;
      const list =
        isViewGroupsShowing.value &&
        !isCreatingGroupViewShowing.value &&
        !isDeleting.value &&
        !isUploadingCustomLogo.value;
      if (create) return "create";
      if (edit) return "edit";
      if (list) return "list";
      return undefined;
    });

    const editInitialGroup = computed((): UiGroup | null =>
      showCard.value === "edit"
        ? (currentGroupForModal.value as UiGroup)
        : null,
    );

    const showLoadingBlock = computed(
      () =>
        isViewGroupsShowing.value &&
        !isCreatingGroupViewShowing.value &&
        (isDeleting.value || isUploadingCustomLogo.value),
    );

    function handleModalSaveCompanies(
      uiGroup: any,
      selectedValues: Array<{ uuid: string; name?: string }>,
    ) {
      if (showCard.value === "list") {
        const payload =
          formCardRef.value?.getFormPayload?.() ??
          buildPayloadFromUiGroup(uiGroup);
        handleUpdateGridUiGroup(uiGroup, selectedValues, payload);
        return;
      }
      applyModalSelectionToForm(selectedValues);
      hideConfirmModal();
    }

    function applyModalSelectionToForm(
      selectedValues: Array<{ uuid: string; name?: string }>,
    ) {
      const selectedUuids = new Set(selectedValues.map((v) => v.uuid));
      listOfCompanies.value = listOfCompanies.value.map((company) => ({
        ...company,
        selected: selectedUuids.has(company.uuid),
      }));
      selectedCompanies.value = selectedValues.map((v) => ({ uuid: v.uuid }));
      filterWasActivated.value = true;
      const names = selectedValues
        .map((v) => v.name)
        .filter(Boolean) as string[];
      adminBackendStore.setUiGroupFormSelectedCompanyNames(names);
    }

    function handleShowConfirmModal(
      uiGroup: UiGroup | any,
      values: Array<{ uuid: string }>,
    ) {
      const idx = listGroups.value.indexOf(uiGroup);
      modalsShowConfirmModal(idx, values);
    }

    function handleSaveAndCloseFilter(
      savedValues: Array<{ name: string; uuid: string; selected: boolean }>,
    ) {
      saveAndCloseFilter(savedValues);
      isFilterShowing.value = false;
      isForEditViewUiGroup.value = false;
      forSpecificUiGroup.value = false;
    }

    function handleCloseFilter() {
      closeFilter();
      isFilterShowing.value = false;
    }

    function handleShowFilter() {
      modalsShowFilter(getListOfCompaniesForFilter);
    }

    function handleShowModalForUiCompanies(uiGroup: UiGroup | any) {
      modalsShowModalForUiCompanies(uiGroup, listGroups.value);
      getListOfCompaniesForFilter();
    }

    function handleUpdateGridUiGroup(
      uiGroup: any,
      selectedValues: Array<{ uuid: string }>,
      payload?: UiGroupFormPayload,
    ) {
      const formData = payload ?? formCardRef.value?.getFormPayload?.();
      if (!formData) {
        toast.error(t("adminBackend.uiGroupsAdmin.errorUpdatedUiGroup"));
        return;
      }
      const isEditMode = isForEditViewUiGroup.value;
      isModalUiGroupShowing.value = false;
      isFilterShowing.value = false;

      const vals = selectedValues.map((item) => "/api/companies/" + item.uuid);
      const maxNumberOfUsers = isEditMode
        ? formData.limitUser
        : (uiGroup.maxNumberOfUsers ?? formData.limitUser);
      const idParts = (uiGroup["@id"] ?? "").split("/");
      const uuid = idParts[3] ?? "";
      companyIdForImageUpload.value = uuid;
      pendingLogoFile.value = formData.file;

      adminBackendStore.updateGridUiGroup({
        uuid,
        name: isEditMode ? formData.groupName : uiGroup.name,
        primaryColor: formData.primaryColor,
        companies: vals,
        maxNumberOfUsers,
        allowedDomains: formData.checkingDomains,
        removeAdaCalculumReferences: formData.removeAdaCalculumReferences,
        
        callbackSuccess: async () => {
          toast.success(t("adminBackend.uiGroupsAdmin.successUpdatedUiGroup"));
          const wasEditMode = isForEditViewUiGroup.value;
          isViewGroupsShowing.value = true;
          isCreatingGroupViewShowing.value = false;
          isForEditViewUiGroup.value = false;
          forSpecificUiGroup.value = false;
          isSavingUiGroup.value = false;

          if (wasEditMode) {
            const hasFileToUpload = !!pendingLogoFile.value;
            resetSelection();
            await nextTick();
            if (hasFileToUpload) {
              await uploadCompanyLogo(pendingLogoFile.value);
            } else {
              getListOfCompaniesForFilter();
              getGroups();
            }
            pendingLogoFile.value = null;
          } else {
            getGroups();
            getListOfCompaniesForFilter();
          }
        },
        callbackError: (error: any) => {
          showError(error);
          isSavingUiGroup.value = false;
          isForEditViewUiGroup.value = false;
          isViewGroupsShowing.value = true;
        },
      });
    }
    async function showError(error: any) {
      let message = t("adminBackend.uiGroupsAdmin.errorUpdatedUiGroup");
      if (error?.data && Object.hasOwn(error.data, "hydra:description")) {
        const desc = error.data["hydra:description"];
        if (typeof desc === "string" && desc.length > 0) {
          message = desc;
        }
      }
      toast.error(message);
    }
    async function editUiGroup(uiGroup: any) {
      isForEditViewUiGroup.value = true;
      forSpecificUiGroup.value = true;
      currentUiGroupObj.value = listGroups.value.indexOf(uiGroup);
      await nextTick();
      isViewGroupsShowing.value = false;
      getListOfCompaniesForFilter();
    }

    function goBackToUiGroups() {
      resetSelection();
      isViewGroupsShowing.value = true;
      isCreatingGroupViewShowing.value = false;
      isForEditViewUiGroup.value = false;
    }

    function createNewUiGroup() {
      isViewGroupsShowing.value = false;
      isCreatingGroupViewShowing.value = true;
    }

    function showErrorMessageNoty() {
      toast.error(t("adminBackend.uiGroupsAdmin.permissionRequired"));
    }

    function onFormSubmit(payload: UiGroupFormPayload) {
      isSavingUiGroup.value = true;
      validateName(payload);
    }

    function validateName(payload: UiGroupFormPayload) {
      if (isForEditViewUiGroup.value) {
        if (payload.nameIsEmpty && filterWasActivated.value) {
          isSavingUiGroup.value = false;
          toast.error(t("adminBackend.uiGroupsAdmin.errorUiGroupNameTooShort"));
          return;
        }
        const currentGroup = listGroups.value[currentUiGroupObj.value];
        if (!currentGroup) {
          isSavingUiGroup.value = false;
          return;
        }
        if (filterWasActivated.value) {
          selectedCompanies.value = mapCompaniesFromUuid(
            selectedCompanies.value,
          );
        } else {
          selectedCompanies.value = mapCompaniesFromIri(currentGroup.companies);
        }
        if (payload.fileSizeTooBig) {
          isSavingUiGroup.value = false;
          toast.error(t("adminBackend.uiGroupsAdmin.maxSizeFileUpload", { size: MAX_FILE_SIZE_MB }));
          return;
        }
        if (!payload.nameIsEmpty) {
          handleUpdateGridUiGroup(
            currentGroup,
            selectedCompanies.value,
            payload,
          );
          return;
        }
        checkIfNameExists(payload);
        return;
      }

      if (payload.nameIsEmpty) {
        isSavingUiGroup.value = false;
        toast.error(t("adminBackend.uiGroupsAdmin.errorUiGroupNameTooShort"));
        return;
      }
      checkIfNameExists(payload);
    }

    function checkIfNameExists(payload: UiGroupFormPayload) {
      loading.value = true;
      adminBackendStore.checkNameForUiGroup({
        name: payload.groupName,
        callbackSuccess: (data: any) => {
          loading.value = false;
          isSavingUiGroup.value = false;
          if (data?.["hydra:totalItems"] > 0) {
            toast.error(
              t("adminBackend.uiGroupsAdmin.errorUiGroupNameAlreadyExists"),
            );
            return;
          }
          if (isForEditViewUiGroup.value) {
            const currentGroup = listGroups.value[currentUiGroupObj.value];
            if (!currentGroup) return;
            if (!filterWasActivated.value) {
              selectedCompanies.value = mapCompaniesFromIri(
                currentGroup.companies,
              );
            }
            if (payload.fileSizeTooBig) {
              toast.error(t("adminBackend.uiGroupsAdmin.maxSizeFileUpload", { size: MAX_FILE_SIZE_MB }));
              return;
            }
            handleUpdateGridUiGroup(
              currentGroup,
              selectedCompanies.value,
              payload,
            );
          } else {
            if (payload.fileSizeTooBig) {
              toast.error(t("adminBackend.uiGroupsAdmin.maxSizeFileUpload", { size: MAX_FILE_SIZE_MB }));
              return;
            }
            saveCreatedUiGroup(payload);
          }
        },
        callbackError: () => {
          toast.error(
            t("adminBackend.uiGroupsAdmin.errorUiGroupNameAlreadyExists"),
          );
          isSavingUiGroup.value = false;
        },
      });
    }

    function saveCreatedUiGroup(payload: UiGroupFormPayload) {
      const vals = selectedCompanies.value.map(
        (item) => "/api/companies/" + item.uuid,
      );
      isSavingUiGroup.value = true;
      pendingLogoFile.value = payload.file;

      adminBackendStore.saveCreatedUiGroup({
        name: payload.groupName,
        primaryColor: payload.primaryColor,
        companies: vals,
        maxNumberOfUsers: payload.limitUser,
        allowedDomains: payload.checkingDomains,
        removeAdaCalculumReferences: payload.removeAdaCalculumReferences,
        callbackSuccess: async (data: any) => {
          const idParts = (data?.["@id"] ?? "").split("/");
          companyIdForImageUpload.value = idParts[3] ?? "";
          toast.success(t("adminBackend.uiGroupsAdmin.successCreatedUIGroup"));
          isCreatingGroupViewShowing.value = false;
          isViewGroupsShowing.value = true;
          isSavingUiGroup.value = false;
          const hasFileToUpload = !!pendingLogoFile.value;
          if (hasFileToUpload) {
            try {
              await uploadCompanyLogo(pendingLogoFile.value);
            } finally {
              resetSelection();
              pendingLogoFile.value = null;
            }
          } else {
            getGroups();
            resetSelection();
            pendingLogoFile.value = null;
          }
        },
        callbackError: (error: any) => {
          showError(error);
          isSavingUiGroup.value = false;
          isViewGroupsShowing.value = true;
          isCreatingGroupViewShowing.value = false;
        },
      });
    }

    async function uploadCompanyLogo(file: File | null): Promise<void> {
      if (!file) return;
      isUploadingCustomLogo.value = true;
      return new Promise((resolve, reject) => {
        adminBackendStore.uploadUiGroupLogo({
          companyID: companyIdForImageUpload.value,
          file,
          callbackSuccess: () => {
            toast.success(t("adminBackend.uiGroupsAdmin.successSavedImage"));
            getGroups();
            isUploadingCustomLogo.value = false;
            resolve();
          },
          callbackError: () => {
            isUploadingCustomLogo.value = false;
            toast.error(t("adminBackend.uiGroupsAdmin.errorSavedImage"));
            getGroups();
            reject();
          },
        });
      });
    }

    onMounted(() => {
      document.title = t("adminBackend.uiGroupsAdmin.title");
      getGroups();
      getListOfCompaniesForFilter();
    });

    return {
      companyNameFirstLetter,
      companyActiveUIGroupLogoPath,
      isViewGroupsShowing,
      isCreatingGroupViewShowing,
      isUploadingCustomLogo,
      isSavingUiGroup,
      formCardRef,
      listGroups,
      loading,
      checkedGroups,
      sumKeyForList,
      columns,
      listOfCompanies,
      isDeleteModalShowing,
      isFilterShowing,
      isModalUiGroupShowing,
      currentUiGroupObj,
      uiGroupModalSelectedCompanies,
      forSpecificUiGroup,
      isForEditViewUiGroup,
      isDeleting,
      currentGroupForModal,
      editInitialGroup,
      showCard,
      showLoadingBlock,
      handleModalSaveCompanies,
      handleShowConfirmModal,
      handleSaveAndCloseFilter,
      handleCloseFilter,
      handleShowFilter,
      handleShowModalForUiCompanies,
      showModalForDelete,
      hideDeleteModal,
      deleteUiGroup,
      hideConfirmModal,
      toggleFilterForEditView,
      editUiGroup,
      goBackToUiGroups,
      createNewUiGroup,
      showErrorMessageNoty,
      onFormSubmit,
    };
  },
});
</script>

<style lang="scss" scoped>
@import "src/resources/assets/styles/variables/_colors.scss";

.page-content-overflow2 {
  flex: 1;
  display: flex;
  flex-direction: column;
}

section.page-content {
  flex: 1;
}

.custom_input {
  height: 50px;
  max-height: 50px;
  border-radius: 8px;
}

.circle_default {
  width: 200px;
  height: 200px;
  border-radius: 50%;
  background: $color-gray-300;
  display: flex;
  align-items: center;
  justify-content: center;

  h6.firstLetter {
    font-size: 8em;
    font-weight: 500;
  }
}

.cirlce_img {
  object-fit: contain;
  width: 100%;
  height: 100%;
  border-radius: 50%;
  background: $color-gray-300;
  display: flex;
  align-items: center;
  justify-content: center;
}

.custom_margin_right {
  margin-right: 5em;
}

.container_grid {
  width: 100%;
}

.icons {
  width: 20px;
  height: 20px;
}

.icon_warning {
  color: $color-warning-700;
  width: 16px;
  height: 16px;
}

.warning_container {
  background: $color-warning-50;
  padding: 20px 27px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.4s ease-in;
}

.warning_text {
  color: $color-warning-700;
}

.new-group {
  background: $color-primary-600;
  border-radius: 8px;
  padding: 8px 14px;
  color: $basewhite;
  font-weight: 500;
  border: 1px solid $color-primary-600;
  transition: box-shadow 0.4s ease-in;
  box-shadow: 0px 1px 2px #1018280d;

  &:hover {
    box-shadow: 0px 0px 0px 4px #ffdfe4;
  }
}

.no_search_icon {
  width: 63px;
  height: 63px;
  color: $color-gray-300;
}

.no_search_title {
  font-size: 2em;
  font-weight: 600;
}

.no_search_message {
  font-size: 18px;
}

.red_text {
  color: $primary700;
}

.text_pointer {
  cursor: pointer;
}

.page-content-overflow2 {
  .square {
    width: 100px;
    height: 100px;
    border-radius: 5px;
    display: flex;
    align-items: center;
    justify-content: center;

    &:hover {
      cursor: pointer;
    }

    .custom_color_picker {
      width: 75px;
      height: 75px;
      outline: transparent;
      border: none;
      transition: box-shadow 0.4s ease-in;
      box-shadow: 0px 1px 2px $color-gray-300;
    }
  }
}
</style>
