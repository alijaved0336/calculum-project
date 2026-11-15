<template>
<div class="user-setup__form">
  <div class="alert alert-danger" v-if="formErrorMessage.length > 0" @click="clearErrors" role="alert"><span>{{ formErrorMessage }}    </span></div>
  <form class="form form__invite-user mt-4 form__invite-user-box">
    <div class="row mb-3 pb-3 align-items-center">
      <div class="col d-flex">
        <h3 class="mb-0">{{ formTitle }}</h3>
      </div>
    </div>
    <div class="row">
      <div class="col-sm-12 col-md-12">
        <div class="row">         </div>
        <div class="form-group">
          <label for="email">
            <input class="form-control required" id="email" type="email" name="email" v-model="email" :placeholder="$t('placeholder.email')" :disabled="formType === UserFormType.EDIT_USER" @input="emailError = ''"/><span>{{ $t('global.emails') }}<sup>*</sup></span>
          </label><span class="text-muted small d-block mt-1">{{ $t('form.emailBatchHint', { max: MAX_EMAILS_PER_BATCH }) }}</span>
          <div class="alert alert-danger d-flex align-items-start gap-2 mt-2 py-2 px-3" v-if="emailError" role="alert"><i class="fa-solid fa-triangle-exclamation" style="margin-top: 3px;"></i><span>{{ emailError }}</span></div>
        </div><span v-if="hasAllowedDomainsRestriction && !userIsSuperAdmin">{{  `${$t('global.allowedDomainsIndication')}:  ${allowedDomainsList.join(', ')}  `}}</span>
      </div>
    </div>
    <div class="row">
      <div class="col-12 d-flex flex-column">
        <div class="d-flex align-items-center">
          <p class="h5 mt-4 mr-1">{{ $t('welcomeTeam.accessRoles') }}</p>
          <CalculumInfoButton class="mt-3" :infoText="$t('welcomeTeamCreateUser.infoButton')" :innerClass="true" :size="15"></CalculumInfoButton>
        </div>
        <div class="d-flex flex-column gap-4">
          <div class="d-flex"><span class="text-sm font-normal">{{ $t('global.additionalRolesEnabledSHelperText') }}</span></div>
          <div class="d-flex align-items-center gap-4">
            <KendoCheckbox class="admin-checkbox" :key="'admin'+key" :default-checked="userRoles.admin" :label="$t('global.users.adminUser')" @change="(e: any) => changedValueCheckbox('admin', e)"></KendoCheckbox>
            <KendoCheckbox class="partner-checkbox" v-if="userCouldEnablePartnerCheckbox" :key="'partner'+key" :default-checked="userRoles.partner" :label="$t('global.users.partner')" @change="(e: any) => changedValueCheckbox('partner', e)"></KendoCheckbox>
          </div>
        </div>
      </div>
    </div>
    <div class="row mb-1 pb-1 align-items-center mt-2">
      <div class="col block-footer-buttons mr-n3 gap-2">
        <button class="btn outline-secondary-btn font-md" @click="onClickFormAddUserClose"><span>{{ $t('button.cancel') }}</span></button><a class="btn btn-primary" @click="formValidator"><span class="spinner-border spinner-border-sm" v-if="loading" role="status" aria-hidden="true"></span><span id="save-user" v-else>{{ $t('global.save') }}</span></a>
      </div>
    </div>
  </form>
</div>
</template>

<script lang="ts">
import { computed, defineComponent, onMounted, reactive, toRefs, watch } from "vue";
import { fontIcons, images } from "@/resources/assets/assets";
import { Roles, UserFormType } from "@/services/user/UserTypes";
import { useI18n } from "vue-i18n";
import { UserFormModel } from "@/modules/components/types";
import { MAX_EMAILS_PER_BATCH } from "@/modules/adminBackend/views/composables/constants";

import * as Validator from "@/utils/validators";
import CalculumInfoButton from "@/modules/components/CalculumInfoButton.vue";
import KendoCheckbox from "@/modules/components/checkbox/KendoCheckbox.vue";
import { useUser, useCompany } from "@/composables";
import { StringUtils } from "@/utils";
import { useToast } from "vue-toastification";
import { useUserStore } from "@/stores/user";
import { useWelcomeStore } from "@/stores/welcome";

export default defineComponent({
  name: "CreateEditUserForm",
  components: {
    CalculumInfoButton,
    KendoCheckbox,
  },
  props: {
    companyId: { type: String, required: false, default: "" },
    formData: { type: Object, default: undefined },
    formType: { type: String, default: UserFormType.ADD_USER },
    isNewUser: { type: Boolean, required: false },
    isFromUserPanel: { type: Boolean, required: false, default: false },
    /**
     * AB#20378: the company's external-user cap is already spent. The hosting view no longer
     * disables the Add button over it, because an @calculum.ai invitation does not consume a
     * licensed seat; the cap is enforced here instead, per address.
     */
    limitReached: { type: Boolean, required: false, default: false },
  },
  emits: {
    closeForm: Boolean,
    callbackUpdateUserList: Boolean,
  },
  setup(props, { emit }) {
    const translate = useI18n({ warnHtmlMessage: false, useScope: 'global' });
    const toast = useToast();
    const userStore = useUserStore();
    const welcomeStore = useWelcomeStore();
    const companyId = props.companyId || userStore.getUserCompanyId;

    const data = reactive<UserFormModel>({
      email: "",
      emailError: "",
      formErrorMessage: "",
      formHasError: false,
      formTitle: translate.t("welcomeTeam.addUserTitle"),
      hasAdminAccess: false,
      hasStandardAccess: true,
      loading: false,
      userRoles: {
        admin: false,
        partner: false,
        data: false,
      },
      roles: {
        admin: false,
        standard: false,
      },
      rolesAdmin: true,
      showCreateTeamDialog: false,
      userHasAtLeastOneRole: false,
      userId: "",
      key: 88978,
    });

    onMounted(() => {
      setInitialValues();
    });

    const {
      userCouldEnableDataRole,
      userCouldEnablePartnerRole,
      userIsAdmin,
      userIsSuperAdmin,
    } = useUser();

    const { allowedDomainsList, hasAllowedDomainsRestriction } = useCompany();

    const userCouldEnablePartnerCheckbox = computed(() => {
      return userCouldEnablePartnerRole.value;
    });

    const userCouldEnableDataCheckbox = computed(() => {
      return (
        userCouldEnableDataRole.value &&
        data.email.split("@")[1] === "calculum.ai"
      );
    });

    // Reset the "data" role checkbox whenever the email leaves the calculum.ai domain
    // (must be a side effect — a watcher, not a computed — to satisfy
    // vue/no-side-effects-in-computed-properties).
    watch(
      () => data.email,
      (email) => {
        if (email.split("@")[1] !== "calculum.ai") {
          data.userRoles.data = false;
        }
      },
    );

    function apiPatchEditUserInfo() {
      data.loading = true;

      let userValueRoles = getSelectedRoles();
      sendUserCompanyInformation(
        props.formData?.userCompanyId,
        userValueRoles,
      );
    }

    function sendUserCompanyInformation(companyId: string, roles: any) {
      const params = {
        companyId: companyId,
        roles: roles,
        callbackSuccess: () => {
          data.loading = false;
          closeEdit();
        },
        callbackError: (e: any) => {
          data.loading = false;
          toast.error(translate.t("global.errorUserEdit"));
        },
      };
      welcomeStore.sendUserCompanyinfoForEdit(params);
    }

    function closeEdit() {
      toast.success(translate.t("global.successUserEdit"));
      onClickFormAddUserClose();
      emit("callbackUpdateUserList");
    }

    function apiPostCreateUser() {
      data.loading = true;
      const params = {
        email: StringUtils.getEmails(data.email),
        language: "en",
        roles: getSelectedRoles(),
        companyId,
        isFromUserPanel: props.isFromUserPanel,
        callbackSuccess: (response: any) => {
          data.loading = false;
          const isQueued = response?.data?.status === 'queued';
          toast.success(translate.t(isQueued ? "global.invitationAsyncSuccess" : "global.successUserCreate"));
          emit("callbackUpdateUserList");
          onClickFormAddUserClose();
        },
        callbackError: (callbackErrorData: any) => {
          if (callbackErrorData.data.detail && callbackErrorData.code === 400) {
            toast.error(callbackErrorData.data.detail);
          } else {
            toast.error(translate.t("global.errorUserCreate"));
          }

          data.formErrorMessage = getErrorMessage(callbackErrorData);
          data.formHasError = true;
          data.loading = false;
        },
      };
      userStore.postCreateMultipleUsersbyEmail(params);
    }

    function checkValuesOnEditMode(roles: any) {
      roles.forEach((item: any) => {
        if (
          item === "ADMIN" ||
          item === "COMPANY_ADMIN" ||
          item === "ROLE_COMPANY_ADMIN"
        ) {
          data.userRoles.admin = true;
        }
        if (item === "PARTNER" || item === "ROLE_PARTNER") {
          data.userRoles.partner = true;
        }

        if (item === "DATA" || item === "ROLE_DATA") {
          //data.userRoles.data = true;
          // change later to true
          data.userRoles.data = false;
        }
      });

      data.key++;
      return roles;
    }
    function clearErrors() {
      data.formHasError = false;
    }

    function formValidator() {
      data.formErrorMessage = "";
      if (data === null) {
        return;
      }

      if (props.formType && props.formType === UserFormType.EDIT_USER) {
        apiPatchEditUserInfo();
        return;
      }

      let results = validateInputs();
      if (!results) return;

      apiPostCreateUser();
    }

    function validateInputs() {
      let result = true;
      let errorString = "";
      data.emailError = "";
      const emailList = StringUtils.getEmails(data.email);

      let hasInvalidEmail = null;

      /**
       * If user is super admin no need to check email format
       * If user is not super admin need to check email format and allowed domains
       */

      if (userIsSuperAdmin.value) {
        hasInvalidEmail = emailList.some(
          (email: any) => !Validator.isValidEmail(email),
        );
        if (hasInvalidEmail || emailList.length === 0) {
          errorString += translate.t("form.emailFieldIsRequired");
          result = false;
        }
      } else {
        /**
         * If the company have allowed domains configured
         * then need to check email format and allowed domains
         * else just need to check email format
         */

        if (hasAllowedDomainsRestriction.value) {
          hasInvalidEmail = emailList.some(
            (email: any) =>
              !Validator.isValidEmailandAllowedDomains(
                email,
                allowedDomainsList.value.join(","),
              ),
          );
        } else {
          hasInvalidEmail = emailList.some(
            (email: any) => !Validator.isValidEmail(email),
          );
        }

        if (hasInvalidEmail || emailList.length === 0) {
          errorString += translate.t(
            "form.emailFieldIsRequiredAndNeedBelogToValidDomain",
          );
          result = false;
        }
      }

      /**
       * AB#20378: the seat cap applies to the invitee, not to the person inviting. The Add button
       * used to be disabled outright once the cap was reached, which locked out @calculum.ai
       * invitations too — and those do not consume a licensed seat (the API has always exempted
       * them). Super Admin keeps the escape hatch it had when the button was the gate.
       */
      if (props.limitReached && !userIsSuperAdmin.value) {
        const blockedByLimit = emailList.some(
          (email: any) => !Validator.isCalculumEmail(email),
        );
        if (blockedByLimit) {
          errorString += translate.t("home.homeManageTeam.maximumTeamLimitReached");
          result = false;
        }
      }

      if (data.hasAdminAccess === false && data.hasStandardAccess === false) {
        errorString += translate.t("form.accessRightsFieldIsRequired");
      }

      data.formErrorMessage = errorString;
      return result;
    }

    function getErrorMessage(errorData: any) {
      if (!errorData) {
        return "";
      }

      if (typeof errorData.data === "object" && errorData.data.error) {
        return errorData.data.error;
      }

      if (
        errorData.data.violations &&
        Array.isArray(errorData.data.violations)
      ) {
        let errorMessage = "";
        errorData.data.violations.forEach(function (violation: any) {
          errorMessage = data.formErrorMessage + violation.message + ". ";
        });
        return errorMessage;
      }

      return "";
    }

    function getSelectedRoles() {
      const selectedRoles = [];
      if (data.userRoles.admin) {
        selectedRoles.push(Roles.COMPANY_ADMIN);
      }
      if (data.userRoles.data) {
        selectedRoles.push(Roles.DATA);
      }

      if (data.userRoles.partner) {
        selectedRoles.push(Roles.PARTNER);
      }

      return selectedRoles;
    }

    function onClickFormAddUserClose() {
      data.email = "";
      emit("closeForm");
    }

    function setInitialValues() {
      data.formTitle =
        props.formType === UserFormType.EDIT_USER
          ? translate.t("title.editUser")
          : translate.t("welcomeTeam.addUserTitle");
      data.userId =
        props.formData && props.formData.userId ? props.formData.userId : "";
      data.email =
        props.formData && props.formData.email ? props.formData.email : "";
      data.roles =
        props.formData && props.formData.roles
          ? checkValuesOnEditMode(props.formData.roles)
          : {};
    }

    /**
     * Changed value on checkbox for admin, partner, data roles
     * @param {string} roleType - type of role
     * @param {object} checkedObj - checkbox object with value
     */
    function changedValueCheckbox(
      roleType: "admin" | "partner" | "data",
      checkedObj: any,
    ) {
      switch (roleType) {
        case "admin":
          data.userRoles.admin = checkedObj.value;
          break;
        case "partner":
          data.userRoles.partner = checkedObj.value;
          break;
        case "data":
          data.userRoles.data = checkedObj.value;
          break;
      }
    }

    return {
      ...toRefs(data),
      changedValueCheckbox,
      clearErrors,
      fontIcons,
      UserFormType,
      formValidator,
      images,
      MAX_EMAILS_PER_BATCH,
      onClickFormAddUserClose,
      userCouldEnableDataCheckbox,
      userCouldEnablePartnerCheckbox,
      userIsAdmin,
      userIsSuperAdmin,
      allowedDomainsList,
      hasAllowedDomainsRestriction,
    };
  },
});
</script>

<style lang="scss" scoped>
@import "src/resources/assets/styles/variables/colors";

#create-new-team {
  transition: all ease 0.3s;
  position: absolute;
  z-index: 10;
  border-radius: 5px;
  padding: 20px;

  button {
    height: 40px !important;
  }

  &:hover {
    box-shadow: 0 1rem 3rem rgba(0, 0, 0, 0.175) !important;
  }

  .close-create-new-team {
    color: #abafb5;
    transition: all ease 0.3s;
    width: 10px;
    margin-bottom: 10px;
    cursor: pointer;

    &:hover {
      color: #212529;
    }
  }
}

.image-style {
  width: 125px;
  max-width: 125px;
  height: 125px;
  max-height: 125px;
}

.form__invite-user-box {
  border: 1px solid #212529;
  border-radius: 5px;
  padding: 20px;
}
</style>
