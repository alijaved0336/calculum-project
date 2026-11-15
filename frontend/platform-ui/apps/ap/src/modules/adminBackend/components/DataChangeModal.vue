<template>
<CalculumModal :size="'lg'" :showClose="true" :title="modalTitle" @close="handleClose">
  <template v-slot:modalContent>
    <div class="edit-modal-content">
      <div class="modal-header-section">
        <div class="icon-wrapper">
          <svg class="edit-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
          </svg>
        </div>
        <div class="header-content">
          <h3 class="modal-subtitle">{{ modalTitle }}</h3>
          <p class="message-text">{{ modalDescription }}</p>
        </div>
      </div>
      <div class="form-section">
        <div class="form-group">
          <label class="form-label" for="selected-category">{{$t('global.metric')}}</label>
          <select class="custom-select" v-model="selectedCategory" id="selected-category" name="selected-category" :disabled="currentObj.status === 'solved'">
            <option disabled="disabled" selected="selected" hidden="hidden" value="">{{$t('global.pleaseSelectOne')}}</option>
            <option v-for="(item, index) in listCategories" :key="index" :value="item">{{ item }}</option>
          </select>
        </div>
        <DataChangeTwoSelect v-if="!loading && selectedCategory === 'Country Credit Rating' || selectedCategory === 'Company Credit Rating'" :form-data="formData" @admin-user-input-changed="adminUserInputChanged"></DataChangeTwoSelect>
        <DataChangeTwoInputTxt v-else-if="selectedCategory === 'Funding Cost' || selectedCategory === 'Peer Group Average'" :form-data="formData" @admin-user-input-changed="adminUserInputChanged"></DataChangeTwoInputTxt>
        <div class="form-group" v-if="isPending && selectedCategory && changeType">
          <div class="form-label-wrapper">
            <label class="form-label">{{ $t('adminBackend.dataChange.markAsSolved.resolutionLabel') || 'Resolution Message' }}</label><span class="optional-badge">{{ $t('global.optional') || 'Optional' }}</span>
          </div>
          <textarea class="form-textarea" v-model="resolutionMessage" :placeholder="$t('adminBackend.dataChange.markAsSolved.resolutionPlaceholder') || 'Enter the resolution message (optional)...'" rows="4" maxlength="1000"></textarea>
          <div class="char-count">{{ resolutionMessage.length }} / 1000</div>
        </div>
      </div>
    </div>
  </template>
  <template v-slot:modalButtons>
    <div class="modal-actions-wrapper">
      <button class="modal-btn-action modal-btn-secondary" @click="handleClose" :title="$t('button.cancel') || 'Cancel'"><span>{{$t('button.cancel')}}</span></button>
      <button class="modal-btn-action modal-btn-primary" @click="saveUpdatedData" :title="buttonText || 'Save'">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M5 13l4 4L19 7"></path>
        </svg><span>{{ buttonText }}</span>
      </button>
    </div>
  </template>
</CalculumModal>
</template>

<script lang="ts">
import {
  defineComponent,
  toRefs,
  reactive,
  watchEffect,
  onMounted,
  computed,
  ref
} from "vue";
import { fontIcons } from "@/resources/assets/assets";
import { useI18n } from "vue-i18n";
import { useAdminBackendStore } from '@/stores/adminBackend';
import * as Iso36166 from '@/utils/ISO3166-1';
import DataChangeTwoInputTxt from "./DataChangeTwoInputTxt.vue";
import DataChangeTwoSelect from "./DataChangeTwoSelect.vue";
import { useToast } from "vue-toastification";
import CalculumModal from '@/modules/components/CalculumModal.vue'
import { StringUtils } from "@/utils";

export default defineComponent({
  name: "DataChangeModal",
  components: {
    DataChangeTwoSelect,
    DataChangeTwoInputTxt,
    CalculumModal
  },
  props: {
    currentObj: { type: Object, required: true }
  },
  emits: ["close", 'update-grid-obj'],
  setup(props, { emit }) {
    const adminBackendStore = useAdminBackendStore();
    const translate = useI18n({ warnHtmlMessage: false, useScope: 'global' });
    const toast = useToast();

    interface DataChangeModal {
      listCategories: string[],
      listOfRatings: string[],
      selectedCategory: string,
      formData: any,
      loading: boolean,
      adminUserInput: any,
      changeType: string,
      listOfEntities: Array<any>,
      listOfCountries: Array<any>
    }

    const data = reactive<DataChangeModal>({
      listCategories: getListCategories(),
      // ? - Replace with values from API
      listOfRatings: ['AAA', 'AA+', 'AA', 'AA-', 'A+', 'A', 'A-', 'BBB+', 'BBB', 'BBB-', 'BB+', 'BB', 'BB-', 'B+', 'B', 'B-', 'CCC+', 'CCC', 'CCC-', 'CC', 'C', 'D'],
      selectedCategory: "",
      formData: {},
      loading: true,
      adminUserInput: {},
      changeType: "",
      listOfEntities: [],
      listOfCountries: []
    });

    const resolutionMessage = ref('');

    // Computed properties for dynamic title and description
    const isPending = computed(() => props.currentObj.status === 'pending');
    
    const modalTitle = computed(() => {
      return isPending.value 
        ? translate.t('adminBackend.dataChange.approving.title') || 'Approving Data Change Request'
        : translate.t('global.editDataChangeRequest');
    });

    const modalDescription = computed(() => {
      return isPending.value
        ? translate.t('adminBackend.dataChange.approving.description') || 'Select the change type and values to approve this data change request. You can optionally provide a resolution message that will be sent to the user.'
        : translate.t('adminBackend.dataChange.edit.description') || 'Edit the data change request values and approve the changes.';
    });

    const buttonText = computed(() => {
      return isPending.value
        ? translate.t('adminBackend.dataChange.approving.confirm') || 'Approve & Change'
        : translate.t('button.save');
    });

    /**
     * Get available data changes
     *
     * @returns {Array<any>}
     */
    function getListCategories(): Array<any> {
      // ? - We should assign IDs to categories and use them
      // to identify the selected category instead of the name

      return [
        // translate.t('global.address'),
        // translate.t('global.buyerLeverage'),
        // translate.t('global.buyingEntity'),
        // translate.t('global.buyingEntity'),
        // translate.t('global.commidities'),
        translate.t("global.companyCreditRating"),
        // translate.t('global.companySize'),
        translate.t("global.countryCreditRating"),
        // translate.t('global.dataOfLastTermNegotiation'),
        // translate.t('global.ethnicMinoriyOwnedBusiness'),
        // translate.t("global.fundingCost"),
        // translate.t('global.hsCode'),
        // translate.t('global.isic'),
        // translate.t('global.naics'),
        // translate.t('global.parentLeverage'),
        // translate.t('global.peerGroupAverage'),
        // translate.t('global.phoneNumber'),
        // translate.t('global.procurementTeam'),
        // translate.t('global.relationshipSince'),
        // translate.t('global.supplierLeverage'),
        // translate.t('global.taxId'),
        // translate.t('global.url'),
        // translate.t('global.url'),
        // translate.t('global.womenOwnedBusiness'),
        // translate.t('global.yearFounded'),
      ];
    }

    /**
     * Entity
     */

    /**
     * Get list of suppliers with id, name and type
     */
    function getListOfEntities() {
      const params = {
        spendFileVersion:  StringUtils.removeIRI(props.currentObj.spendFileVersion['@id']),

        callbackSuccess: (callbackSuccessData: any) => {
          data.listOfEntities = callbackSuccessData.map((item: any) => {
            return {
              id: item.uuid,
              text: item.name + ' (' + item.companyType + ')'
            }
          }).sort((a: any, b: any) => a.text.localeCompare(b.text))
        },

        callbackError: () => {
          if (import.meta.env.DEV) console.error('** Error, cannot get suppliers')

          data.listOfEntities = []
        }
      }

      if (!StringUtils.isNullUndefinedOrEmpty(props.currentObj.spendFileVersion)) {
        adminBackendStore.getSuppliersForDataChange(params)
      }
    }

    /**
     * Country
     */

    /**
     * get list of countries
     * 
     * {code: 'AF', name: 'Afghanistan'}
     */
    // ? - REMOVE Iso36166 and use API instead
    function getListOfCountries() {
      data.listOfCountries = Iso36166.getListOfCountries().map((item) => {
        return {
          id: item.code,
          text: item.name
        }
      }).sort((a: any, b: any) => a.text.localeCompare(b.text))
    }

    /**
     * Save updated data to DB
     */
    function saveUpdatedData() {
      /**
       * Set params
       */
      const changeRequestId = props.currentObj.id
      const changeType = data.changeType
      const status = 'solved'
      let entity = ''
      let values: any = {}

      /**
       * Country Credit Rating
       */
      if (data.changeType === "COUNTRY_CREDIT_RATING") {
        // Get country code and credit rating from admin user input
        // ? - Use values from dictionary for keys
        values.country = data.adminUserInput["Country"] as string
        values.creditRating = data.adminUserInput["Credit Rating"] as string
      }

      /** 
       * Company Credit Rating
       */
      else if (data.changeType === "COMPANY_CREDIT_RATING") {
        // Get credit rating from admin user input
        // ? - Use values from dictionary for keys
        values.creditRating = data.adminUserInput["Credit Rating"] as string

        entity = data.adminUserInput["Company"] as string
      }

      /**
       * Funding Cost
       */
      // ? - Fix name
      else if (data.changeType === "FUNDING_COST"
        || data.changeType === "FUNDING_COSTS") {
        // Get funding cost from admin user input
        // Transform funding cost from percentage to decimal
        values.fundingCost = (parseFloat(data.adminUserInput["Amount"]) / 100).toString()

        entity = data.adminUserInput["Company"] as string
      }

      /**
       * Peer Group Average
       */
      else if (data.changeType === "PEER_GROUP_AVERAGE"
        || data.changeType === "PEER_GROUP_AVG") {
        // Get peer group average from admin user input
        values.peerGroupAverage = data.adminUserInput["Days"]

        entity = data.adminUserInput["Company"] as string
      }

      // Values array length
      const valuesLength = Object.keys(values).length

      /**
       * Validate params
       */
      if (
        !valuesLength
        || !changeRequestId
        || !changeType
        || !status
      ) {
        if (import.meta.env.DEV) console.error("** ERROR Some param has an invalid value:",
          valuesLength, changeRequestId, changeType, status);

        // Notify user
        toast.error(translate.t('home.entityCard.reqDataChanges.reqWasNotSaved'));

        return
      }

      // Validate entity for change type Company Credit Rating
      if (data.changeType !== 'COUNTRY_CREDIT_RATING' && !entity) {
        toast.error(translate.t('home.entityCard.reqDataChanges.entityNotSelected'));

        return
      }

      const params = {
        changeRequestId,
        changeType,
        values,
        status,
        entity,
        resolutionMessage: isPending.value ? resolutionMessage.value : undefined,
        callbackSuccess: (response: any) => {
          toast.success(translate.t('home.entityCard.reqDataChanges.reqWasSaved'));

          // Update data in table
          emit('update-grid-obj', props.currentObj, data.changeType, response.status, response.values)
        },
        callbackError: () => {
          toast.error(translate.t('home.entityCard.reqDataChanges.reqWasNotSaved'));
        }
      }

      adminBackendStore.updateDataChangeValues(params)
    };

    /**
     * 
     */

    // Get list of entities
    getListOfEntities()

    // Get list of countries
    getListOfCountries()

    /**
     * onMounted
     */
    onMounted(() => {
      // ? - Use this instead of hard coded values
      // Get credit rating values
      // getCreditRatingValues()
      // If req was solved, set selected category
      switch (props.currentObj.changeType) {
        case "COUNTRY_CREDIT_RATING":
          data.selectedCategory = "Country Credit Rating";
          break;

        case "COMPANY_CREDIT_RATING":
          data.selectedCategory = "Company Credit Rating";
          break;

        case "FUNDING_COSTS":
          data.selectedCategory = "Funding Cost";
          break;

        case "PEER_GROUP_AVG":
          data.selectedCategory = "Peer Group Average";
          break;

        default:
          break;
      }
    })

    /**
     * Watchers
     */

    /**
     * Watch selected category
     */
    watchEffect(() => {
      // Enable loading
      data.loading = true;
      

      if (data.selectedCategory === "Country Credit Rating"
        || data.selectedCategory === "COUNTRY_CREDIT_RATING") {
        // Set change type
        data.changeType = "COUNTRY_CREDIT_RATING";

        // Clean form data
        data.formData = {};

        // Set form data
        data.formData = {
          status: props.currentObj.status,
          listValuesA: data.listOfCountries,
          listValuesB: data.listOfRatings,
          initialValueA: props.currentObj.values ? props.currentObj.values.countryCode : null,
          initialValueB: props.currentObj.values ? props.currentObj.values.creditRating : null,
          selectedPropertyA: "Country",
          selectedPropertyB: "Credit Rating"
        };
      }
      else if (data.selectedCategory === "Company Credit Rating"
        || data.selectedCategory === "COMPANY_CREDIT_RATING") {
        // Set change type
        data.changeType = "COMPANY_CREDIT_RATING";

        // Clean form data
        data.formData = {};

        // Set form data
        data.formData = {
          status: props.currentObj.status,
          listValuesA: data.listOfEntities,
          listValuesB: data.listOfRatings,
          initialValueA: props.currentObj.entity ? props.currentObj.entity.id : null,
          initialValueB: props.currentObj.values ? props.currentObj.values.creditRating : null,
          selectedPropertyA: "Company",
          selectedPropertyB: "Credit Rating"
        };
      }
      else if (data.selectedCategory === "Funding Cost"
        || data.selectedCategory === "FUNDING_COSTS") {
        // Set change type
        data.changeType = "FUNDING_COST";

        // Set form data
        data.formData = {
          status: props.currentObj.status,
          inputPropertyB: "Amount",
          inputValueBRange: { min: 0, max: 100 },
          listValuesA: data.listOfEntities,
          initialValueA: props.currentObj.entity ? props.currentObj.entity?.id : null,
          inputValueB: props.currentObj.values?.fundingCost ? props.currentObj.values.fundingCost * 100 : 0,
          selectedPropertyA: "Company"  // ? - Translate
        }
      }
      else if (data.selectedCategory === 'Peer Group Average'
        || data.selectedCategory === 'PEER_GROUP_AVG') {
        // Set change type
        data.changeType = "PEER_GROUP_AVERAGE";

        // Set form data
        data.formData = {
          status: props.currentObj.status,
          inputPropertyB: "Days",
          inputValueBRange: { min: 0, max: 360 },
          listValuesA: data.listOfEntities,
          initialValueA: props.currentObj.entity.id ?? data.listOfEntities[0].id,
          inputValueB: props.currentObj.values?.peerGroupAverageStrategy ?? 0,
          selectedPropertyA: "Company"
        }
      }
      else if (import.meta.env.DEV) console.info("** ERROR data.selectedCategory", data.selectedCategory);

      // Disable loading
      data.loading = false;
    });

    /**
     * On selected value changed
     */
    function adminUserInputChanged(newAdminUserInput: any) {
      data.adminUserInput = { ...newAdminUserInput }
    }

    const handleClose = () => {
      emit('close')
    }

    return {
      ...toRefs(data),
      fontIcons,
      saveUpdatedData,
      adminUserInputChanged,
      handleClose,
      resolutionMessage,
      isPending,
      modalTitle,
      modalDescription,
      buttonText
    };
  }
});
</script>

<style lang="scss" scoped>
// Color Variables
$color-primary: #ff2c4f;
$color-info: #3b82f6;
$color-info-light: #dbeafe;
$color-info-dark: #2563eb;
$color-text-primary: #1d2939;
$color-text-secondary: #667085;
$color-border: #eaecf0;
$color-info-border: #93c5fd;

// Override inner-modal padding for this modal
:deep(.inner-modal) {
  padding-top: 0 !important;
  padding-bottom: 0 !important;
}

.edit-modal-content {
  padding: 0;
  font-size: 1rem;

  .modal-header-section {
    display: flex;
    gap: 0.875rem;
    margin-bottom: 1rem;
    padding: 0.75rem;
    background: linear-gradient(135deg, $color-info-light 0%, lighten($color-info-light, 3%) 100%);
    border-radius: 12px;
    border-left: 4px solid $color-info;
    animation: slideIn 0.3s ease-out;
    
    .icon-wrapper {
      flex-shrink: 0;
      width: 40px;
      height: 40px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: white;
      border-radius: 10px;
      box-shadow: 0 2px 8px rgba(59, 130, 246, 0.15);
      
      .edit-icon {
        width: 22px;
        height: 22px;
        color: $color-info;
        stroke-width: 2.5;
        animation: pulse 2s ease-in-out infinite;
      }
    }
    
    .header-content {
      flex: 1;
      
      .modal-subtitle {
        font-weight: 700;
        color: $color-text-primary;
        margin: 0 0 0.25rem 0;
        line-height: 1.3;
      }
      
      .message-text {
        color: $color-text-secondary;
        margin: 0;
        line-height: 1.5;
      }
    }
  }
  
  .form-section {
    padding: 0;
    
    .form-group {
      margin-bottom: 1.5rem;
      
      .form-label {
        display: block;
        font-weight: 600;
        color: $color-text-primary;
        margin-bottom: 0.5rem;
      }
      
      .custom-select {
        width: 100%;
        padding: 0.75rem;
        border: 2px solid $color-border;
        border-radius: 8px;
        font-family: inherit;
        background: white;
        color: $color-text-primary;
        transition: all 0.2s ease;
        cursor: pointer;
        
        &:focus {
          outline: none;
          border-color: $color-info;
          box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.1), 0 2px 4px rgba(0, 0, 0, 0.1);
        }
        
        &:disabled {
          background: #f3f4f6;
          cursor: not-allowed;
          opacity: 0.6;
        }
      }
      
      .form-label-wrapper {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 0.5rem;
        
        .form-label {
          font-weight: 600;
          color: $color-text-primary;
          margin: 0;
        }
        
        .optional-badge {
          font-weight: 500;
          color: $color-text-secondary;
          background: #f3f4f6;
          padding: 0.25rem 0.5rem;
          border-radius: 4px;
        }
      }
      
      .form-textarea {
        width: 100%;
        padding: 0.75rem;
        border: 2px solid $color-border;
        border-radius: 8px;
        font-family: inherit;
        background: white;
        color: $color-text-primary;
        transition: all 0.2s ease;
        resize: vertical;
        min-height: 100px;
        
        &:focus {
          outline: none;
          border-color: $color-info;
          box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.1), 0 2px 4px rgba(0, 0, 0, 0.1);
        }
        
        &::placeholder {
          color: #9ca3af;
        }
      }
      
      .char-count {
        color: $color-text-secondary;
        text-align: right;
        margin-top: 0.25rem;
      }
    }
  }
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.8;
    transform: scale(1.05);
  }
}

.modal-actions-wrapper {
  display: flex;
  gap: 0.75rem;
  align-items: center;
  justify-content: flex-end;
  flex-wrap: wrap;
  padding-top: 0.5rem;
  margin-top: 0.5rem;
  width: 100%;
  margin-left: 0;
  margin-right: 0;
}

.modal-btn-action {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background: white;
  border: 1px solid $color-border;
  border-radius: 6px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  color: $color-text-primary;
  white-space: nowrap;
  
  svg {
    width: 18px;
    height: 18px;
    flex-shrink: 0;
    stroke-width: 2.5;
  }
  
  &:hover:not(:disabled) {
    border-color: $color-primary;
    background: lighten($color-primary, 45%);
    color: $color-primary;
    transform: translateY(-1px);
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  
  &.modal-btn-primary {
    &:hover:not(:disabled) {
      border-color: $color-info;
      background: lighten($color-info, 40%);
      color: $color-info;
    }
  }
  
  &.modal-btn-secondary {
    &:hover:not(:disabled) {
      border-color: $color-primary;
      background: lighten($color-primary, 45%);
      color: $color-primary;
    }
  }
}
</style>
