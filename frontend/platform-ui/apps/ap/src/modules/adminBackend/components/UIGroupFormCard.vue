<template>
<div class="row">
  <div class="col-lg-12 col-xl-12 p-5">
    <div class="h3 title">{{ mode === 'edit' ? $t('adminBackend.uiGroupsAdmin.editGroup') : $t('adminBackend.uiGroupsAdmin.createNewGroup') }}</div>
    <div class="h6 title">{{ $t('adminBackend.uiGroupsAdmin.groupName') }}<sup>*</sup></div>
    <div class="form-group w-100">
      <label for="program-name">
        <input class="custom_input form-control" :class="{ 'red_input': form.nameIsEmpty.value }" :value="form.groupNameInput.value ?? ''" @input="form.groupNameInput.value = ($event.target as HTMLInputElement).value" type="text" name="group-name" :placeholder="$t('adminBackend.uiGroupsAdmin.createNewGroupPlaceholder')"/>
      </label>
    </div>
    <div class="row mt-4">
      <div class="col-md-4">
        <div class="d-flex">
          <div class="personilze-div">
            <div class="h5 font-weight-bold">{{ $t('adminBackend.uiGroupsAdmin.personalizedSettings') }}</div>
            <div class="circle_default" v-if="form.showLogo.value === null">
              <h6 class="firstLetter">{{ companyNameFirstLetter }}</h6>
            </div>
            <div class="circle_default" v-else><img class="cirlce_img" :src="form.showLogo.value"/></div>
          </div>
          <div class="d-flex flex-column">
            <div class="upload-image-div">
              <input id="company-logo" type="file" accept=".jpg,.png" style="display: none" name="company-logo" @change="form.onChangeLogo($event)"/>
              <button class="new-group mt-3" type="button" @click="form.onClickModifyLogo()">{{ $t('adminBackend.uiGroupsAdmin.uploadImage') }}</button><span class="mt-3 d-block" v-if="!form.selectedImage.value">{{ $t('adminBackend.uiGroupsAdmin.noImageSelected') }}</span><span class="mt-3 d-block">{{ $t('adminBackend.uiGroupsAdmin.selectFileType') }}</span><span class="mt-1 d-block">{{ $t('adminBackend.uiGroupsAdmin.maxSizeFileUpload', { size: form.maxFileSizeMb }) }}</span><span class="mt-1 d-block red_text" v-if="form.fileSizeTooBig.value">{{ $t('adminBackend.uiGroupsAdmin.fileSizeTooBig') }}</span>
            </div>
            <div class="d-flex">
              <div class="form-checkout">
                <label>
                  <input type="checkbox" :checked="form.removeAdaCalculumReferences.value" @change="form.removeAdaCalculumReferences.value = ($event.target as HTMLInputElement).checked"/><span class="custom"></span><span class="ml-2" @click="form.removeAdaCalculumReferences.value = !form.removeAdaCalculumReferences.value">{{ $t('adminBackend.uiGroupsAdmin.removeAdaCalculumReferences') }}</span>
                </label>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div class="col-md-1">
        <div class="d-flex flex-column justify-content-center">
          <div class="h5 font-weight-bold pl-5">{{ $t('adminBackend.uiGroupsAdmin.theme') }}       </div>
          <div class="square select-color">
            <input class="custom_color_picker" type="color" :value="form.colors.primary ?? '#C11A36'" @input="form.setColor(($event.target as HTMLInputElement).value)"/>
          </div><span class="mr-1">{{ $t('adminBackend.uiGroupsAdmin.primaryColor') }}</span>
        </div>
      </div>
      <div class="col-md-2">
        <div class="h5 font-weight-bold">{{ $t('adminBackend.uiGroupsAdmin.maxNumberOfUsers') }}
          <div class="form-group p-0 mt-3" style="width: 100%;">
            <label for="user-limit">
              <input class="form-control required" id="limit-user" :value="form.limitUser.value ?? ''" type="number" name="limit-user" :min="form.minUsersAllowed" :max="form.maxUsersAllowed" @input="onLimitInput($event)"/><span class="d-block">{{ $t('adminBackend.createCompanyAdmin.form.limitUserInput') }}</span>
            </label>
          </div>
        </div>
      </div>
      <div class="col-md-3">
        <div class="h5 font-weight-bold">{{ $t('adminBackend.createCompanyAdmin.form.allowedDomains') }}
          <div class="form-group p-0 mt-3" style="width: 100%;">
            <label for="allowed-domains">
              <input class="form-control required" id="allowed-domains" type="text" :value="form.allowedDomains.value ?? ''" @input="form.allowedDomains.value = ($event.target as HTMLInputElement).value" name="allowedDomains" :placeholder="$t('adminBackend.createCompanyAdmin.form.allowedDomainsDescription')"/><span class="d-block">{{ $t('adminBackend.createCompanyAdmin.form.allowedDomains') }}     </span>
            </label>
          </div>
        </div>
      </div>
      <div class="col-md-2">
        <div class="d-flex flex-column justify-content-center">
          <button class="custom-dropdown edit-btn font-lg" id="add-companies" @click="$emit('add-companies')">+ {{ $t('adminBackend.uiGroupsAdmin.addCompanies') }}  </button>
          <ol class="companies-list mt-3" v-if="displayCompanyNames.length > 0">
            <li v-for="(name, index) in displayCompanyNames" :key="index">{{ name }}</li>
          </ol>
        </div>
      </div>
    </div>
  </div>
</div>
<div class="row mt-4">
  <div class="col-12">
    <div class="d-flex align-items-center justify-content-between"><a class="btn_custom" @click="$emit('cancel')"><span>{{ $t('button.cancel') }}</span></a>
      <button class="btn-primary btn-nxt" type="button" @click="emitSubmit" :disabled="isSavingUiGroup"><span v-if="!isSavingUiGroup">{{ mode === 'edit' ? $t('button.update') : $t('button.save') }}</span><span class="spinner-border spinner-border-sm" v-if="isSavingUiGroup" role="status" aria-hidden="true"></span></button>
    </div>
  </div>
</div>
</template>

<script lang="ts">
import { defineComponent, watch, onMounted, computed } from "vue";
import { useI18n } from "vue-i18n";
import { useToast } from "vue-toastification";
import type {
  UiGroupFormMode,
  UiGroupFormPayload,
  UiGroup,
} from "@/modules/adminBackend/types";
import { useAdminBackendStore } from "@/stores/adminBackend";
import { storeToRefs } from "pinia";
import { useUiGroupForm } from "../views/composables/useUiGroupForm";
import { isNameEmpty } from "../views/composables/validationHelpers";



function convertToArray(raw: string | string[] | undefined): string[] {
      if (Array.isArray(raw)) return raw as string[];
      if (typeof raw === "string")
        return raw
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);
      return [];
    }

export default defineComponent({
  name: "UIGroupFormCard",
  props: {
    mode: {
      type: String as () => UiGroupFormMode,
      required: true,
    },
    companyNameFirstLetter: { type: String, default: "" },
    initialGroup: { type: Object as () => UiGroup | null, default: null },
    initialLogoUrl: { type: String, default: "" },
    isSavingUiGroup: { type: Boolean, default: false },
  },
  emits: ["submit", "cancel", "add-companies"],
  setup(props, { emit, expose }) {
    const { t } = useI18n({ useScope: "global" });
    const toast = useToast();
    const adminBackendStore = useAdminBackendStore();
    const { uiGroupFormSelectedCompanyNames } = storeToRefs(adminBackendStore);
    const form = useUiGroupForm();

    function buildPayload(): UiGroupFormPayload {
      return {
        groupName: form.groupNameInput.value,
        primaryColor: form.colors.primary,
        limitUser: form.limitUser.value,
        allowedDomains: form.allowedDomains.value,
        checkingDomains: form.checkingDomains.value,
        file: form.file.value,
        nameIsEmpty: form.nameIsEmpty.value,
        fileSizeTooBig: form.fileSizeTooBig.value,
        removeAdaCalculumReferences: form.removeAdaCalculumReferences.value,
      };
    }

    function emitSubmit() {
      if (form.checkDomains()) {
        toast.error(t("adminBackend.uiGroupsAdmin.errorAllowedDomains"));
        return;
      }
      form.nameIsEmpty.value = isNameEmpty(form.groupNameInput.value);
      emit("submit", buildPayload());
    }

    function onLimitInput(event: Event) {
      const target = event.target as HTMLInputElement;
      const value = Number(target.value);
      form.limitUser.value = value;
      form.checkInputError(target.value);
    }

    function syncFormFromProps() {
      if (props.mode === "edit" && props.initialGroup) {
        form.fillFromUiGroup(props.initialGroup);
      }
      if (props.initialLogoUrl) {
        form.imageUrl.value = props.initialLogoUrl;
        form.selectedImage.value =
          typeof props.initialLogoUrl === "string" &&
          props.initialLogoUrl.length > 0;
      }
    }

    watch(
      () => [props.mode, props.initialGroup, props.initialLogoUrl] as const,
      () => syncFormFromProps(),
      { immediate: false },
    );


    const displayCompanyNames = computed(() => {
      const fromStore = uiGroupFormSelectedCompanyNames.value;
      if (fromStore?.length) return fromStore;
      return convertToArray(props.initialGroup?.companyNames) ?? [];
    });

    onMounted(() => {
      syncFormFromProps();
      if (props.mode === "create") {
        adminBackendStore.setUiGroupFormSelectedCompanyNames([]);
      } else if (props.mode === "edit" && props.initialGroup) {
        const initial = convertToArray(props.initialGroup.companyNames) ?? [];
        if (initial.length) adminBackendStore.setUiGroupFormSelectedCompanyNames(initial);
      }
    });

    expose({
      getFormPayload: () => buildPayload(),
    });

    return {
      form,
      emitSubmit,
      onLimitInput,
      displayCompanyNames,
    };
  },
});
</script>

<style lang="scss" scoped>
@import "src/resources/assets/styles/variables/_colors.scss";

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

.red_text {
  color: $primary700;
}

.text_pointer {
  cursor: pointer;
}

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
.personilze-div {
  margin-right: 40px;
}
.upload-image-div {
  margin-top: 50px;
}

.companies-list {
  max-height: 200px;
  overflow-y: auto;
}
</style>
