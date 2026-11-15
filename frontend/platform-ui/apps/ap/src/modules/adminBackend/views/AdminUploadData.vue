<template>
<div class="page-content-overflow2">
  <CalculumModal v-if="isShowResetStatusConfirmationModal" :size="'md'" :showClose="true" :title="$t('adminBackend.adminUploadData.resetStatus.confirmationTitle')" @close="() => { isShowResetStatusConfirmationModal = false; pendingResetStatusFiles = [] }">
    <template v-slot:modalContent>
      <div class="d-flex flex-column">
        <div class="alert alert-warning d-flex align-items-start" role="alert"><i class="fa-solid fa-triangle-exclamation mr-2 mt-1"></i>
          <div>
            <p class="mb-2 font-weight-bold">{{ $t('adminBackend.adminUploadData.resetStatus.warningTitle') }}</p>
            <p class="mb-0">{{ $t('adminBackend.adminUploadData.resetStatus.warningMessage') }}</p>
          </div>
        </div>
        <p class="mt-3">{{ $t('adminBackend.adminUploadData.resetStatus.confirmationMessage') }}</p>
      </div>
    </template>
    <template v-slot:modalButtons>
      <button class="btn outline-secondary-btn font-md" @click="() => { isShowResetStatusConfirmationModal = false; pendingResetStatusFiles = [] }" style="z-index: 1; width: fit-content">{{ $t('global.cancel') }}</button>
      <button class="btn btn-primary font-md" v-if="!isProcessingResetStatus" :disabled="isProcessingResetStatus" style="z-index: 1; width: fit-content;" @click="confirmResetStatus">{{ $t('global.confirm') }}</button>
      <button class="btn btn-primary font-md" v-else style="z-index: 1; width: fit-content;"><span class="spinner-border spinner-border-sm"></span></button>
    </template>
  </CalculumModal>
  <CalculumModal v-if="isShowLevelOfAccessStatusChangeModalShowing" :size="'md'" :showClose="true" :title="$t('adminBackend.adminUploadData.spendFileStatus.statusChangeTitle')" @close="() => isShowLevelOfAccessStatusChangeModalShowing = false">
    <template v-slot:modalContent>
      <div class="d-flex flex-column">
        <p>{{ $t('adminBackend.adminUploadData.spendFileStatus.statusChangeText') }} {{ currentStatusIsPublic ? $t('adminBackend.adminUploadData.spendFileStatus.private') : $t('adminBackend.adminUploadData.spendFileStatus.public') }} ?</p>
      </div>
    </template>
    <template v-slot:modalButtons>
      <button class="btn outline-secondary-btn font-md" @click="() => isShowLevelOfAccessStatusChangeModalShowing = false" style="z-index: 1; width: fit-content">{{ $t('global.cancel') }}</button>
      <button class="btn btn-primary font-md" v-if="!clickedOnChangeSpendFileStatusButton" :disabled="clickedOnChangeSpendFileStatusButton" style="z-index: 1; width: fit-content;" @click="changeSpendFileVisibility">{{ $t('global.confirm') }}</button>
      <button class="btn btn-primary font-md" v-else style="z-index: 1; width: fit-content;"><span class="spinner-border spinner-border-sm"></span></button>
    </template>
  </CalculumModal>
  <CalculumModal v-if="showingConfirmModal" :size="'md'" :showClose="true" :title="'Synchronize data confirmation'" @close="cancelUploadFile()">
    <template v-slot:modalContent>
      <div class="d-flex flex-column">
        <p v-html="`Are you sure to continue and synchronize the data from the spend file: <strong>${getSpendFileObj?.spendFileName ?? '-'} (Ver. ${getSpendFileObj?.version ?? '-'})</strong>?`"></p>
      </div>
    </template>
    <template v-slot:modalButtons>
      <button class="btn outline-secondary-btn font-md" @click="cancelUploadFile()" style="z-index: 1; width: fit-content">{{ $t('global.cancel') }}</button>
      <button class="btn btn-primary font-md" style="z-index: 1; width: fit-content;" @click="newSpendFile()">{{ $t('global.confirm') }}</button>
    </template>
  </CalculumModal>
  <CalculumModal v-if="isShowLevelOfAccessModalShowing" :size="showMatchingFields ? 'lg-70' : 'lg'" :showClose="true" :title="$t('adminBackend.adminUploadData.spendFileStatus.title')" @close="() => isShowLevelOfAccessModalShowing = false">
    <template v-slot:modalContent>
      <div class="d-flex flex-column">
        <p>{{ $t('adminBackend.adminUploadData.spendFileStatus.bodytitle') }}</p>
        <div class="d-flex flex-column mt-2 mb-2">
          <div class="d-flex align-items-center">
            <input class="radio-btn mr-2 cursor-pointer" id="private-spend-file" v-model="limitAccessForSpendFile" type="radio" name="access" value="private"/>
            <div class="d-flex align-items-center"><span class="font-weight-600 mr-1">{{ $t('adminBackend.adminUploadData.spendFileStatus.private') }}:</span><span>{{  $t('adminBackend.adminUploadData.spendFileStatus.privateTextSection') }}</span></div>
          </div>
          <div class="d-flex align-items-center mt-2">
            <input class="radio-btn mr-2 cursor-pointer" id="public-spend-file" v-model="limitAccessForSpendFile" type="radio" name="access" value="public"/>
            <div class="d-flex align-items-center mt-2"><span class="font-weight-600 mr-1">{{ $t('adminBackend.adminUploadData.spendFileStatus.public') }}:</span><span>{{  $t('adminBackend.adminUploadData.spendFileStatus.publicTextSection') }}  </span></div>
          </div>
          <div class="d-flex align-items-center mt-2 mb-2">           <span v-html="$t('adminBackend.adminUploadData.spendFileStatus.noteText')"></span></div>
          <div class="d-flex flex-column mt-2 mb-2" v-if="spendFilesVersionsGridData && spendFilesVersionsGridData.length > 0">
            <div class="d-flex align-items-center"><span class="font-semibold">{{ $t('global.syncronize') }}</span></div>
          </div>
          <div class="d-flex" v-if="spendFilesVersionsGridData && spendFilesVersionsGridData.length > 0" :style=" { 'margin-bottom': !showMatchingFields ? '80px' : '0px' } ">
            <div class="row w-100">
              <div class="col-12">
                <div class="form-group">
                  <label for="spendfileToSyncronizeField">
                    <select class="custom-select test-select" id="spendfileToSyncronizeField" v-model="spendfileToSyncronize" name="spendfileToSyncronize" @change="setSyncronyzeValues">
                      <option :value="null">{{ 'Select a Spend File' }}</option>
                      <option v-for="spendfiles in spendFilesVersionsGridData" :value="spendfiles.uuid">{{ `${spendfiles.spendFileName} (Ver. ${spendfiles.version})`   }}</option>
                    </select><span>{{ $t('global.chooseSourceSpendFile') }}<sup>*</sup></span>
                  </label>
                </div>
              </div>
              <div class="col-4" v-if="spendfileToSyncronize">
                <template v-if="currentCompanyHaveKeepHistoricalDataEnabled">
                  <div class="d-flex flex-column mb-2"><span class="font-medium">{{ $t('global.whatToSynchronize') }}</span></div>
                  <div class="d-flex">
                    <KendoCheckbox class="admin-checkbox" :key="keyReactive" :default-checked="syncronizeKeepHistoricalData" @change="(e: any) => setCheckGroup(e, 'syncronizeKeepHistoricalData')">                   </KendoCheckbox><span class="ml-2">{{ $t('global.syncronizeKeepHistoricalData') }}</span>
                  </div>
                </template>
                <div class="d-flex flex-column my-2"><span class="font-semibold">{{ $t('global.defaultEntities') }}</span></div>
                <div class="d-flex">
                  <KendoCheckbox class="admin-checkbox" :key="keyReactive" :default-checked="syncronizeSupplierNotes" @change="(e: any) => setCheckGroup(e, 'syncronizeSupplierNotes')">                   </KendoCheckbox><span class="ml-2">{{ $t('global.syncronizeSupplierNotes') }}</span>
                </div>
                <div class="d-flex">
                  <KendoCheckbox class="admin-checkbox" :key="keyReactive" :default-checked="syncronizeSupplierStandard" @change="(e: any) => setCheckGroup(e, 'syncronizeSupplierStandard')">                   </KendoCheckbox><span class="ml-2">{{ $t('global.syncronizeSupplierStandard') }}</span>
                </div>
                <div class="d-flex">
                  <KendoCheckbox class="admin-checkbox" :key="keyReactive" :default-checked="syncronizeChangeRequests" @change="(e: any) => setCheckGroup(e, 'syncronizeChangeRequests')"></KendoCheckbox><span class="ml-2">{{ $t('global.syncronizeChangeRequests') }}</span>
                </div>
                <div class="d-flex flex-column my-2"><span class="font-semibold">{{ $t('global.spendLines') }}</span></div>
                <div class="d-flex">
                  <KendoCheckbox class="admin-checkbox" :key="keyReactive" :default-checked="syncronizeTargets" @change="(e: any) => setCheckGroup(e, 'syncronizeTargets')"></KendoCheckbox>
                  <div class="d-flex flex-column"><span class="ml-2">{{ $t('global.syncronizeTargets') }}</span></div>
                  <div class="d-flex ml-2" v-if="syncronizeTargets" :style="'position: relative;'"><span class="ml-2 text-sm font-medium text-gray-700 cursor-pointer" @click="showMoreSettingForTarget = !showMoreSettingForTarget">{{  AGG_MODALITY_OPTIONS.find(option => option.value === selectedOptionForTarget)?.label }}
                      <CalculumChevronDown v-if="!showMoreSettingForTarget"></CalculumChevronDown>
                      <CalculumChevronUp v-if="showMoreSettingForTarget"></CalculumChevronUp></span>
                    <div class="calculum-popup" :class="showMoreSettingForTarget ? 'show' : 'hide'">
                      <div class="d-flex flex-column popup-settings" :class="showMoreSettingForTarget + '-popup-settings'">
                        <div class="d-flex flex-column mb-2"><span class="font-medium">{{ 'Select Modality' }}</span></div>
                        <div class="d-flex disabled-button">
                          <label class="rounded-checkbox">
                            <input class="styled-checkbox" v-model="selectedOptionForTarget" @change="setOptionsForTarget('Best-Volume')" type="radio" value="Best-Volume"/><span class="checkmark-disabled" :class="{'disabled-radio no-hover': selectedOptionForTarget !== 'Best-Volume'}">&nbsp;    </span>
                          </label><span class="cursor-pointer ml-2 text-sm font-normal text-gray-900" @click="setOptionsForTarget('Best-Volume')">{{ 'Largest Spend Volume' }}</span>
                        </div>
                        <div class="d-flex disabled-button">
                          <label class="rounded-checkbox">
                            <input class="styled-checkbox" v-model="selectedOptionForTarget" @change="setOptionsForTarget('Weighted-Avg')" type="radio" value="Weighted-Avg"/><span class="checkmark-disabled" :class="{'disabled-radio no-hover': selectedOptionForTarget !== 'Weighted-Avg'}">&nbsp;    </span>
                          </label><span class="cursor-pointer ml-2 text-sm font-normal text-gray-900" @click="setOptionsForTarget('Weighted-Avg')">{{ 'Weighted Avg' }}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div class="d-flex">
                  <KendoCheckbox class="admin-checkbox" :key="keyReactive" :default-checked="syncronizeAgreements" @change="(e: any) => setCheckGroup(e, 'syncronizeAgreements')">                   </KendoCheckbox><span class="ml-2">{{ $t('global.syncronizeAgreements') }}</span>
                </div>
                <div class="d-flex">
                  <KendoCheckbox class="admin-checkbox" :key="keyReactive" :default-checked="syncronizePeerGroupStandard" @change="(e: any) => setCheckGroup(e, 'syncronizePeerGroupStandard')">                   </KendoCheckbox><span class="ml-2">{{ $t('global.syncronizePeerGroupStandard') }}</span>
                </div>
                <div class="d-flex flex-column my-2"><span class="font-semibold">{{ $t('global.negotiationWorkflow') }}</span></div>
                <div class="d-flex">
                  <KendoCheckbox class="admin-checkbox" :key="keyReactive" :default-checked="syncronizeNegotiationStatus" @change="(e: any) => setCheckGroup(e, 'syncronizeNegotiationStatus')"></KendoCheckbox><span class="ml-2">{{ $t('global.syncronizeNegotiationStatus') }}</span>
                </div>
                <div class="d-flex">
                  <KendoCheckbox class="admin-checkbox" :key="keyReactive" :default-checked="syncronizePlanPhase" @change="(e: any) => setCheckGroup(e, 'syncronizePlanPhase')"></KendoCheckbox><span class="ml-2">{{ $t('global.syncronizePlanPhase') }}</span>
                </div>
              </div>
              <div class="col-8" v-if="showExcludedFields && spendfileToSyncronize">
                <div class="d-flex flex-column mb-2">
                  <button class="btn outline-secondary-btn font-md" @click="showMatchingFields = !showMatchingFields" style="z-index: 1; width: fit-content">{{  showMatchingFields ? 'Hide Matching Fields' : 'Edit Matching Fields' }}</button>
                </div>
                <div class="d-flex flex-column mt-4 mb-2" v-if="showMatchingFields">
                  <div class="d-flex flex-column mb-2">
                    <div class="d-flex align-items-center mb-2"><span class="font-semibold">{{ $te('adminBackend.adminUploadData.matchingFields') || 'Matching Fields' }}</span></div>
                    <div class="row">
                      <div class="col-6 mb-1">
                        <KendoCheckbox class="admin-checkbox" :key="`check-all-${keyReactive}`" :default-checked="allMatchingFieldsChecked" @change="(e: any) => toggleAllMatchingFields(e.value)"></KendoCheckbox><span class="ml-2">{{ $t('global.globalFilters.checkAll') }}</span>
                      </div>
                      <div class="col-6">
                        <div class="d-flex align-items-center mb-2" v-if="getCustomFieldsBySpendfile.length > 0"><span class="font-medium">{{'Custom Fields' }}</span></div>
                      </div>
                    </div>
                    <div class="row">
                      <div class="col-6" v-for="(column, columnIndex) in matchingFieldsColumns" :key="`column-${columnIndex}`">
                        <div class="d-flex flex-column" v-for="fieldObj in column" :key="fieldObj.field" style="min-width: 200px; margin-bottom: 0.5rem;">
                          <div class="d-flex align-items-center">
                            <KendoCheckbox class="admin-checkbox" :key="`matching-${fieldObj.field}-${keyReactive}`" :default-checked="matchingFieldsSelected[fieldObj.field] !== undefined ? matchingFieldsSelected[fieldObj.field] : fieldObj.checked" :disabled="fieldObj.field === 'provider' || fieldObj.field === 'buyer'" @change="(e: any) => setMatchingField(fieldObj.field, e.value)"></KendoCheckbox><span class="ml-2">{{ columnIndex === 1 ? fieldObj.field : $t(`global.matchingFields.${fieldObj.field}`)}}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>
    <template v-slot:modalButtons>
      <button class="btn outline-secondary-btn font-md" @click="cancelUploadFile" style="z-index: 1; width: fit-content">{{ $t('button.cancel') }}</button>
      <button class="btn btn-primary font-md" @click="uploadSpendFileRelated()" style="z-index: 1; width: fit-content;">{{ $t('global.ok') }}    </button>
    </template>
  </CalculumModal>
  <CalculumUploadedModal v-if="showModalForUploadedFile" @close="showModalForUploadedFile = false" :forEMISFileText="forEMISFileModal"></CalculumUploadedModal>
  <CalculumDeleteModal v-if="showConfirmDeleteModal" @deleteSpendFile="deleteSpendFile" @hide="hideDeleteModal" :forDeleteSpendFile="deleteSpendFileValue"></CalculumDeleteModal>
  <section class="page-content-top"></section>
  <section class="page-content">
    <div class="col-12" :class="{'bg-blur': loadingData}">
      <CalculumLoading v-if="loadingData" :modal="true"></CalculumLoading>
      <div class="row mb-4">
        <div class="col-4">
          <SearchableDropdown v-model="companySelectedId" :items="companiesDropdownItems" :placeholder="$t('company.selectCompany')"></SearchableDropdown>
        </div>
      </div>
      <div class="row">
        <div class="col-12">
          <div class="card" style="min-height: auto; height: auto">
            <div class="card-body">
              <div class="d-flex justify-content-between">
                <h5 class="m-0 d-flex gap-2 align-items-center"><span>{{ $t('adminBackend.adminUploadData.spendFile') }}</span>
                  <ButtonIconStandard :ignorePopOver="true" @click="spendFilesVersionsGridDataRefresh(false)">
                    <IconSync class="w-5"></IconSync>
                  </ButtonIconStandard>
                </h5>
                <input class="d-none" id="fileInputSpend" @change="addSpendFiles" @click="inputResetNewSpendFile" type="file" ref="fileInputSpend"/>
                <button class="btn btn-primary font-md px-8 w-unset" id="upload-spend-file" v-if="uploadFileIsBtnIsVisible" @click="isShowLevelOfAccessModalShowing = true">{{ $t('adminBackend.adminUploadData.uploadFile') }}</button>
              </div>
              <div class="row">
                <div class="col-12 mt-2">
                  <CalculumGrid @actions-menu-on-action-clicked="spendFilesVersionsGridOnActionMenuOptionClicked" @button-action-clicked="spendFilesVersionsGridOnActionClicked" @buttonDenominatorMatchClick="onDenominatorMatch" @clean-file="cleanFile" @deleteFile="spendFilesVersionsGridOnDelete" @downloadFile="onDownloadFile" @reload-spendfiles="spendFilesVersionsByCompanyAPIReadAll" @selectRow="spendFilesVersionsGridOnSelectRow" @selectAllRow="spendFilesVersionsGridOnSelectAllRow" @download-adjustments="downloadAdjustments" @upload-adjustments="uploadAdjustments" @update-level-of-access="onUpdateLevelOfAccess" @update-row-data-notes="updateRowDataNotes" :allowExportExcel="false" :buttonText="$t('button.recalculate')" :childrenColumns="false" :columnsLocalName="'AdminUploadSpendFiles'" :defaultPageSize="5" :pagingSizeCustomArray="[5,10,25,50,100,150,175]" :gridColumns="defaultSpendFilesGridColumns" :gridData="spendFilesVersionsGridData" :hideColumnSelector="true" :selectable="true" :showToolbar="false" :key="keyGrid"></CalculumGrid>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div class="row">
        <div class="col-12">
          <div class="card" style="min-height: auto; height: auto">
            <div class="card-body">
              <div class="d-flex justify-content-between align-items-center mb-2">
                <h5 class="m-0">{{ $t('adminBackend.adminUploadData.spendFileFormat') }}</h5>
                <button class="btn btn-primary font-md px-8 w-unset" @click="notImplemented()">{{ $t('adminBackend.adminUploadData.uploadFile') }}</button>
              </div>
              <hr/>
              <div class="d-flex justify-content-between align-items-center mt-2">
                <h5 class="m-0">{{ $t('adminBackend.adminUploadData.spendFileExample') }}</h5>
                <button class="btn btn-primary font-md px-8 w-unset" @click="notImplemented()">{{ $t('adminBackend.adminUploadData.uploadFile') }}</button>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div class="row">
        <div class="col-12">
          <div class="card" style="min-height: auto; height: auto">
            <div class="card-body">
              <div class="d-flex justify-content-between align-items-center mb-2">
                <h5 class="m-0">{{ $t('adminBackend.adminUploadData.emisFile') }}</h5>
                <input id="fileInputEMIS" type="file" style="display: none" @change="addEMISFiles" @click="inputResetNewEMISFile" ref="fileInputEMIS"/>
                <button class="btn btn-primary font-md px-8 w-unset" @click="newEMISFile()">{{ $t('adminBackend.adminUploadData.uploadFile') }}</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</div>
</template>

<script lang="ts">
import { ComputedRef, Ref, computed, reactive, ref, toRefs, watch, onMounted } from "vue";
import KendoCheckbox from "@/modules/components/checkbox/KendoCheckbox.vue";

import {
  ArrayUtils,
  DateUtils,
  isNullOrUndefined,
  NumberUtils,
  StringUtils,
} from "@/utils";

// Types
import { SpendFile } from "@/types";

// Icons
import IconSync from "@/resources/assets/images/icons/IconSync.vue";
import {
  defaultSpendFilesGridColumns,
  defaultEMISFilesGridColumns,
} from "../data/columns";
import { images } from "@/resources/assets/assets";
import { saveAs } from "@progress/kendo-file-saver";
import { useI18n } from "vue-i18n";
import * as cacheGrid from "@/utils/dataGridClear";
import { useSpendFilesStore } from '@/stores/spendFiles';
import AnalyzeProgramTimeline from "@/modules/home/analyze/components/AnalyzeProgramTimeline.vue";
import ButtonIconStandard from "@/modules/components/ButtonIconStandard.vue";
import CalculumDeleteModal from "@/modules/components/CalculumDeleteModal.vue";
import CalculumGrid from "@/modules/components/grid/CalculumGrid.vue";
import { CalculumLoading, SearchableDropdown } from '@ada/design-system'
import CalculumModal from "@/modules/components/CalculumModal.vue";

import CalculumUploadedModal from "@/modules/components/CalculumUploadedModal.vue";
import { useToast } from "vue-toastification";
import useUser from "@/services/user/composables/useUser";
import { AdminUploadData } from "../types";
import { shouldShowErrorToasts } from "@/utils/axios";
import { useAdminBackendStore } from '@/stores/adminBackend'
import { matchingFieldsData, type MatchingField, vCardFields } from "../data/matchingFields";
import CalculumChevronDown from "@/modules/components/CalculumChevronDown.vue";
import CalculumChevronUp from "@/modules/components/CalculumChevronUp.vue";

function getGridEMISColumns() {
  let resetcolumns = [];
  const gridCache = JSON.parse(
    localStorage.getItem("AdminUploadEMISFiles") ?? "[]",
  );

  if (
    gridCache.length &&
    JSON.stringify(defaultEMISFilesGridColumns) !==
      JSON.stringify(gridCache)
  ) {
    resetcolumns = cacheGrid.clearCache(
      defaultEMISFilesGridColumns,
      gridCache,
    );
    localStorage.setItem(
      "AdminUploadEMISFiles",
      JSON.stringify(resetcolumns),
    );
  } else {
    resetcolumns = defaultEMISFilesGridColumns;
  }
  return resetcolumns;
}

function getNameForFileTitle(bahavior: string): string {
  switch (bahavior) {
    case "peerGroupAndSupplierStandardAdjustments":
      return "Peer Group & Supplier Standard Adjustments";
    case "smeAdjustments":
      return "SME Adjustments";
    default:
      return "Data";
  }
}

export default {
  name: "AdminUploadData",
  components: {
    AnalyzeProgramTimeline,
    ButtonIconStandard,
    CalculumDeleteModal,
    CalculumGrid,
    CalculumLoading,
    CalculumModal,
    KendoCheckbox,
    CalculumUploadedModal,
    IconSync,
    CalculumChevronDown,
    CalculumChevronUp,
    SearchableDropdown,
  },
  setup() {
    const translate = useI18n({ warnHtmlMessage: false, useScope: 'global' });
    const { user } = useUser();
    const spendFilesStore = useSpendFilesStore();
    const adminBackendStore = useAdminBackendStore();
    const toast = useToast();
    const fileInputSpend = ref();
    const fileInputEMIS = ref();
    const showMoreSettingForTarget = ref(false);
    const selectedOptionForTarget = ref('Best-Volume');

    // Page title
    document.title = translate.t("adminBackend.adminUploadData.title");

    const adminUploadData = reactive<AdminUploadData>({
      clickedOnChangeSpendFileStatusButton: false,
      companySelectedId: "all",
      currentDataObject: {},
      currentStatusIsPublic: false,
      deleteSpendFileValue: false,
      emisFileErrorMessage: "",
      emisFiles: [],
      emisToDelete: "",
      files: [],
      filesEMIS: [],
      forEMISFileModal: false,
      gridEMISColumns: getGridEMISColumns(),
      isShowLevelOfAccessModalShowing: false,
      isShowLevelOfAccessStatusChangeModalShowing: false,
      limitAccessForSpendFile: "private",
      loadingData: false,
      selectedFileIdForDelete: "",
      selectFileEmis: "",
      showConfirmDeleteModal: false,
      showModalForUploadedFile: false,
      spendFileErrorMessage: "",
      spendFiles: [],
      versionToDelete: "",
      syncronizeSupplierNotes: false,
      syncronizeKeepHistoricalData: false,
      keyReactive: NumberUtils.getRandomInt(),
      spendfileToSyncronize: null,
      showingConfirmModal: false,
      syncronizeTargets: false,
      syncronizeAgreements: false,
      syncronizeSupplierStandard: false,
      syncronizePeerGroupStandard: false,
      syncronizePlanPhase: false,
      syncronizeNegotiationStatus: false,
      syncronizeChangeRequests: false,
      keyGrid: NumberUtils.getRandomInt(),
      showMatchingFields: false
    });

    
    // Matching fields from matchingFieldsData
    const matchingFieldsSelected = reactive<Record<string, boolean>>({});
    const syncSpendFileCustomDataPoints = ref<string[]>([]);
    
    // Combinar campos base con vCardFields si la compañía tiene vCard habilitado
    const allAvailableMatchingFields = computed(() => {
      const baseFields = matchingFieldsData.matchingFields || [];

      const customFields = getCustomFieldsBySpendfile.value || [];
      const allFields = [...baseFields];

      if (currentCompanyHaveVcardEnabled.value) {
        allFields.push(...vCardFields);
      } 

      if (customFields.length > 0) {
        customFields.forEach((fieldName: string) => {
          allFields.push({
            field: fieldName,
            checked: false
          });
        });
      }

      return allFields;
    });
    
    // Dividir los campos en columnas según si vCard está habilitado
    const matchingFieldsColumns = computed(() => {
      const fields = allAvailableMatchingFields.value;
      const columns: MatchingField[][] = [];
      
      if (currentCompanyHaveVcardEnabled.value) {
        // Si vCard está habilitado, primera columna con 18 campos
        const firstColumnSize = 18;
        columns.push(fields.slice(0, firstColumnSize));
        // Segunda columna con el resto
        if (fields.length > firstColumnSize) {
          columns.push(fields.slice(firstColumnSize));
        }
      } else {
        // Si vCard no está habilitado, primera columna con 7 campos
        const firstColumnSize = 8;
        columns.push(fields.slice(0, firstColumnSize));
        // Segunda columna con el resto
        if (fields.length > firstColumnSize) {
          columns.push(fields.slice(firstColumnSize));
        }
      }
      
      return columns;
    });
    
    // Computed para verificar si todos los campos marcables están marcados
    const allMatchingFieldsChecked = computed(() => {
      const fields = allAvailableMatchingFields.value;
      const markableFields = fields.filter(
        (fieldObj) => fieldObj.field !== 'provider' && fieldObj.field !== 'buyer'
      );
      
      if (markableFields.length === 0) return false;
      
      return markableFields.every((fieldObj) => {
        const isChecked = matchingFieldsSelected[fieldObj.field] === undefined
          ? fieldObj.checked
          : matchingFieldsSelected[fieldObj.field];
        return isChecked === true;
      });
    });


     // *** Upload File - Global ***
     const getSpendFileObj = computed(() => {
      return spendFilesVersionsGridData.value.find((spendFile: any) => spendFile.uuid === adminUploadData.spendfileToSyncronize)
    })

    const getCustomFieldsBySpendfile = computed(() => {
      const fields = syncSpendFileCustomDataPoints.value;
      // Filtrar campos que NO contengan "Custom Column"
      return fields.filter((field: string) => !field.includes('Custom Column'));
    })

    // WI#16774: backend expects canonical slugs (customDataPoint1..customDataPoint20)
    // in matchingFields, not the user-visible Excel column labels. Build a positional
    // map from the SOURCE array (indexes intact) so each label resolves to its slot.
    // Source is fetched via getSpendFileVersion when spendfileToSyncronize is selected,
    // because the list endpoint does not include nameCustomDataPoints.
    const customDataPointLabelToSlugMap = computed((): Record<string, string> => {
      const labels: string[] = syncSpendFileCustomDataPoints.value;
      const map: Record<string, string> = {};
      labels.forEach((label, index) => {
        if (typeof label === 'string' && label !== '' && !label.startsWith('Custom Column ')) {
          map[label] = `customDataPoint${index + 1}`;
        }
      });
      return map;
    })

    const getActiveCompanyObj = computed(() => {
      return companiesFormatted.value.find((company: any) => company['@id'] === adminUploadData.companySelectedId)
    })

    const currentCompanyHaveVcardEnabled = computed(() => {
      return getActiveCompanyObj.value?.roles?.includes('FEATURE_VIRTUAL_CARD') || false
    })

    const currentCompanyHaveKeepHistoricalDataEnabled = computed(() => {
      return getActiveCompanyObj.value?.roles?.includes('FEATURE_KEEP_HISTORICAL_DATA') || false
    })
    
    // Inicializar matching fields con sus valores checked por defecto
    if (matchingFieldsData.matchingFields && Array.isArray(matchingFieldsData.matchingFields)) {
      matchingFieldsData.matchingFields.forEach((fieldObj: MatchingField) => {
        matchingFieldsSelected[fieldObj.field] = fieldObj.checked;
      });
    }

    // Backend aggregation modality constants
    const AGG_MODALITY_OPTIONS = [
      { value: 'Average', label: 'Average' },
      { value: 'Maximun', label: 'Maximun' },
      { value: 'Minimun', label: 'Minimun' },
      { value: 'Count', label: 'Count' },
      { value: 'Median', label: 'Median' },
      { value: 'Weighted-Avg', label: 'Weighted Avg' },
      { value: 'Best-Volume', label: 'Largest Spend Volume' }
    ];


    watch(() => adminUploadData.spendfileToSyncronize, (uuid) => {
      syncSpendFileCustomDataPoints.value = [];
      if (!uuid) return;
      spendFilesStore.getSpendFileVersion({
        fileVersionID: `/api/spend_file_versions/${uuid}`,
        callbackSuccess: (data: any) => {
          syncSpendFileCustomDataPoints.value = data?.nameCustomDataPoints ?? [];
        },
      });
    });

    onMounted(() => {
      spendFilesVersionsAPIReadAll()
    })

    const uploadFileIsBtnIsVisible = computed(() => {
      // No company selected
      if (
        StringUtils.isNullUndefinedOrEmpty(adminUploadData.companySelectedId)
      ) {
        return false;
      }

      // All Companies selected
      if (adminUploadData.companySelectedId === "all") {
        return false;
      }

      return true;
    });

    // *** END Upload File - Global ***

    function showDeleteModal(event: any, selectedFileType: string) {
      adminUploadData.selectedFileIdForDelete = event["@id"];

      adminUploadData.deleteSpendFileValue = selectedFileType === "spend";

      adminUploadData.showConfirmDeleteModal = true;
    }

    function hideDeleteModal() {
      adminUploadData.showConfirmDeleteModal = false;

      adminUploadData.deleteSpendFileValue = false;
    }
    function changeSpendFileStatus() {
      adminUploadData.clickedOnChangeSpendFileStatusButton = true;
      adminUploadData.loadingData = true;
      adminUploadData.spendFileErrorMessage = "";
      const params = {
        companyUUID: StringUtils.removeIRI(adminUploadData.companySelectedId),
        spendFileVersion: adminUploadData.currentDataObject.iri,
        isPublic: !adminUploadData.currentDataObject.isPublic
        ,
        forStatusChange: true,
        callbackSuccess: () => {
          // Disable loading
          adminUploadData.loadingData = false;
          adminUploadData.forEMISFileModal = false;
          adminUploadData.isShowLevelOfAccessStatusChangeModalShowing = false;
          adminUploadData.clickedOnChangeSpendFileStatusButton = false;
          // commit the new state for isPublic
          let myDataItemObjectForSpendFileLevelChange = {
            iri: adminUploadData.currentDataObject.iri,
            version: adminUploadData.currentDataObject.version,
            isPublic: !adminUploadData.currentDataObject.isPublic,
          };
          adminBackendStore.setCurrentSpendFileIsPublic(myDataItemObjectForSpendFileLevelChange);
          spendFilesVersionsGridDataRefresh();
        },
        callbackError: (callbackErrorData: any) => {
          toast.error(translate.t("global.modal.uploadFile.error"));

          if (callbackErrorData !== null && callbackErrorData !== undefined) {
            if (
              Object.hasOwn(callbackErrorData, "hydra:description")
            ) {
              adminUploadData.spendFileErrorMessage =
                callbackErrorData["hydra:description"];
            } else if (
              Object.hasOwn(callbackErrorData, "data") &&
              Object.hasOwn(callbackErrorData.data, "error")
            ) {
              adminUploadData.spendFileErrorMessage =
                callbackErrorData.data.error;
            } else if (shouldShowErrorToasts()) {
              adminUploadData.spendFileErrorMessage =
                translate.t("error.server400");
            }
          } else if (shouldShowErrorToasts()) {
            adminUploadData.spendFileErrorMessage =
              translate.t("error.server400");
          }

          adminUploadData.isShowLevelOfAccessStatusChangeModalShowing = true;
          adminUploadData.clickedOnChangeSpendFileStatusButton = false;
          // Disable loading
          adminUploadData.loadingData = false;
        },
      };
      spendFilesStore.postSpendFileVisibility(params);
    }

    function changeSpendFileVisibility() {
      adminUploadData.clickedOnChangeSpendFileStatusButton = true;
      adminUploadData.loadingData = true;
      adminUploadData.spendFileErrorMessage = "";
      const params = {
        spendFileVersion: adminUploadData.currentDataObject.iri,
        isPublic: !adminUploadData.currentDataObject.isPublic,
        callbackSuccess: () => {
          // Disable loading
          adminUploadData.loadingData = false;
          adminUploadData.clickedOnChangeSpendFileStatusButton = false;
          adminUploadData.isShowLevelOfAccessStatusChangeModalShowing = false;
          // commit the new state for isPublic
          let myDataItemObjectForSpendFileLevelChange = {
            iri: adminUploadData.currentDataObject.iri,
            version: adminUploadData.currentDataObject.version,
            isPublic: !adminUploadData.currentDataObject.isPublic,
          };
          adminBackendStore.setCurrentSpendFileIsPublic(myDataItemObjectForSpendFileLevelChange);
          spendFilesVersionsGridDataRefresh();
        },
        callbackError: (callbackErrorData: any) => {
          toast.error(translate.t("error.errorUpdatingSpendFile"));
          adminUploadData.clickedOnChangeSpendFileStatusButton = false;
          adminUploadData.clickedOnChangeSpendFileStatusButton = false;
          adminUploadData.isShowLevelOfAccessStatusChangeModalShowing = false;
          // Disable loading
          adminUploadData.loadingData = false;
        },
      };
      spendFilesStore.postSpendFileVisibility(params);
    }

    function onUpdateLevelOfAccess(
      behavior: string,
      isPublic: boolean,
      dataItem: any,
    ) {
      adminUploadData.currentStatusIsPublic = isPublic;
      adminUploadData.currentDataObject = dataItem;
      adminUploadData.isShowLevelOfAccessStatusChangeModalShowing = true;
    }

    function cleanFile(id: any, fileType: "spend" | "emis") {
      const params = {
        id: id,
        fileType,
        callbackSuccess: () => {
          const toast = useToast();
          toast.success(translate.t('global.noty.success.clean.file'));

          spendFilesVersionsGridDataRefresh();
        },
        callbackError: (callbackErrorData: unknown) => {
          if (import.meta.env.DEV) console.error("** Error in cleanFile:", callbackErrorData);
          toast.error(translate.t('global.noty.error.clean.file'));
        },
      };

      adminBackendStore.cleanSelectedFile(params);
    }

    function onDownloadEMISFile(file: any) {
      adminUploadData.loadingData = true;

      const params = {
        mediaID: file.media["@id"],
        callbackSuccess: (response: any) => {
          const url = globalThis.URL.createObjectURL(new Blob([response]));

          const link = document.createElement("a");

          link.href = url;

          link.setAttribute("download", `${file.media.originalFileName}`);

          document.body.appendChild(link);

          link.click();

          adminUploadData.loadingData = false;
        },
        callbackError: (callbackErrorData: unknown) => {
          if (import.meta.env.DEV)
            console.error("** Error in onDownloadEMISFile:", callbackErrorData);

          adminUploadData.loadingData = false;
        },
      };

      spendFilesStore.getMediaFileVersion(params);
    }

    function onDownloadFile(file: any) {
      adminUploadData.loadingData = true;
      const params = {
        mediaID: file.media["@id"],
        callbackSuccess: (response: any) => {
          const url = globalThis.URL.createObjectURL(new Blob([response]));
          const link = document.createElement("a");
          link.href = url;
          link.setAttribute("download", `${file.media.originalFileName}`);
          document.body.appendChild(link);
          link.click();
          adminUploadData.loadingData = false;
        },
        callbackError: () => {
          adminUploadData.loadingData = false;
        },
      };
      spendFilesStore.getMediaFileVersion(params);
    }

    function onDeleteEMISFile(event: any) {
      const fileDOM = document.getElementById("deleteEMISFileResponseButton");
      if (fileDOM !== null) {
        adminUploadData.emisToDelete = event["@id"];
        fileDOM.click();
      }
    }

    function onDeleteSpendFile(event: any) {
      const fileDOM = document.getElementById("deleteSpendFileResponseButton");
      if (fileDOM !== null) {
        adminUploadData.versionToDelete = event["@id"];
        fileDOM.click();
      }
    }

    /**
     * Deletes the spend file and performs necessary clean-up actions.
     */
    function deleteSpendFile() {
      try {
        adminUploadData.showConfirmDeleteModal = false;

        adminUploadData.deleteSpendFileValue = false;

        if (adminUploadData.versionToDelete === null) {
          throw new Error("Spend file version not selected");
        }

        // Enable loading
        adminUploadData.loadingData = true;

        const params = {
          versionID: adminUploadData.selectedFileIdForDelete,
          callbackSuccess: () => {
            toast.success(translate.t('global.noty.success.delete.file'));

            spendFilesVersionsGridDataRefresh();
          },
          callbackError: (callbackErrorData: unknown) => {
            if (import.meta.env.DEV)
              console.error("** (deleteSpendFile) Error:", callbackErrorData);
            toast.error(translate.t('global.noty.error.delete.file'));
            

            // Disable loading
            adminUploadData.loadingData = false;
          },
        };
        spendFilesStore.deleteSpendFileVersion(params);
      } catch (error) {
        //
        if (import.meta.env.DEV) console.error("** (deleteSpendFile)", error);
      }
    }

    // *** Companies ***

    const companies: ComputedRef<any[]> = computed(
      () => adminBackendStore.getCompanies,
    );

    const companiesFormatted: ComputedRef<any[]> = computed(() => {
      // Ensure companies.value is an array before processing
      if (!Array.isArray(companies.value)) {
        return [];
      }
      
      // Capitalize company names
      const companiesCapitalized = companies.value.map((company: any) => {
        return {
          ...company,
          name: StringUtils.capitalizeFirstCharacter(company.name),
        };
      });

      return ArrayUtils.sortAscBy(companiesCapitalized, ["name"]);
    });

    const companiesDropdownItems = computed(() => {
      const allOption = { value: 'all', label: translate.t('company.allCompanies') };
      const companyOptions = companiesFormatted.value.map((company: any) => ({
        value: company['@id'],
        label: company.name,
      }));
      return [allOption, ...companyOptions];
    });


    const someSyncronizeValues = computed(() => {
      return adminUploadData.syncronizeSupplierNotes || adminUploadData.syncronizeTargets || adminUploadData.syncronizeAgreements || adminUploadData.syncronizeSupplierStandard || adminUploadData.syncronizePeerGroupStandard || adminUploadData.syncronizeKeepHistoricalData || adminUploadData.syncronizePlanPhase || adminUploadData.syncronizeNegotiationStatus || adminUploadData.syncronizeChangeRequests
    })

    const showExcludedFields = computed(() => {
      return adminUploadData.syncronizeTargets || adminUploadData.syncronizeAgreements || adminUploadData.syncronizePeerGroupStandard || adminUploadData.syncronizePlanPhase || adminUploadData.syncronizeNegotiationStatus || adminUploadData.syncronizeChangeRequests
    })


    function uploadSpendFileRelated() {
      adminUploadData.isShowLevelOfAccessModalShowing = false;

      if ( !StringUtils.isNullUndefinedOrEmpty( adminUploadData.spendfileToSyncronize) && someSyncronizeValues.value ) {
        adminUploadData.showingConfirmModal = true
        return
      }

      adminUploadData.spendfileToSyncronize = null
      adminUploadData.syncronizeSupplierNotes = false
      adminUploadData.syncronizeKeepHistoricalData = false
      adminUploadData.syncronizeTargets = false
      adminUploadData.syncronizeAgreements = false
      adminUploadData.syncronizeSupplierStandard = false
      adminUploadData.syncronizePeerGroupStandard = false
      adminUploadData.syncronizePlanPhase = false
      adminUploadData.syncronizeNegotiationStatus = false
      adminUploadData.syncronizeChangeRequests = false
      newSpendFile();
    }

    /**
     * Get companies from the API.
     * Route: GET - /api/companies
     *
     * @return {void}
     */
    function getCompanies(): void {
      // Check if companies already exist
      if (Array.isArray(companies.value) && companies.value.length > 0) {
        return;
      }

      // Enable loading
      adminUploadData.loadingData = true;

      const params = {
        callbackSuccess: (callbackSuccessData: any) => {
          adminUploadData.loadingData = false;
        },
        callbackError: (callbackErrorData: unknown) => {
          adminUploadData.loadingData = false;
          if (import.meta.env.DEV)
            console.error("** (getCompanies) callbackErrorData:", callbackErrorData);
        },
      };

      adminBackendStore.fetchCompanies(params);
    }

    // Select first company by default
    watch(companies, () => {
      adminUploadData.companySelectedId = "all";
    });

    // *** END Companies ***

    // *** Spend Files Versions ***

    const spendFilesVersionsRecalculateTrackingNumber = ref(
      NumberUtils.getRandomInt(),
    );

    const spendFilesVersionsByCompany: Ref<SpendFile.SpendFileVersionByCompany[]> = ref([])

    function updateRowDataNotes(uuidRow: any, text: string) {
      const row = spendFilesVersionsByCompany.value.find(
        (row) => row.uuid === uuidRow,
      );
      if (row) {
        row.spendFileVersionNotes = text;
      }
    }

    const spendFilesVersionsGridData: ComputedRef<
      SpendFile.SpendFileVersionByCompanyGridDataItem[]
    > = computed(() => {
      try {
        const versions = spendFilesVersionsByCompany.value || [];
        
        if (Array.isArray(versions)) {
          versions.sort((a, b) => {
            return new Date(b.created).getTime() - new Date(a.created).getTime();
          });
        }

        let filteredFiles: any[] = [];
        if (Array.isArray(versions)) {
          // Filter out private spend files for users without @calculum.ai email
          filteredFiles = versions.filter(
            (file) => {
              const isPrivate = !file.isPublic;

              const isCalculumUser =
                user.value && /@calculum\.ai$/.test(user.value.email);

              // If the file is private and the user is not from calculum.ai, exclude it
              if (isPrivate && !isCalculumUser) {
                return false;
              }

              return true;
            },
          );
        }

        return filteredFiles.map((file) => {
          let recalculationDate = file.recalculationDate;

          if (!isNullOrUndefined(recalculationDate)) {
            recalculationDate =
              DateUtils.getDateFromDateSpaceTimeFormat(recalculationDate);
          }

          return {
            ...file,
            company: adminUploadData.companySelectedId,
            created: DateUtils.getDateFromDateSpaceTimeFormat(file.created),
            pendingRecalculateReasons:
              file.pendingRecalculateReasons === ""
                ? null
                : file.pendingRecalculateReasons,
            recalculationDate,
            selected: false,
            statusRecalculation: file?.pendingRecalculation
              ? translate.t("spendFileStatus.outdated")
              : "",
            isPublic: file.isPublic,
            spendFileVersionNotes: file.spendFileVersionNotes ? file.spendFileVersionNotes : "",
          };
        });
      } catch (error) {
        if (import.meta.env.DEV) console.error("** (spendFilesVersionsByCompany)", error);

        return [];
      }
    });

    /**
     * Call spend file versions API again to get the latest data.
     *
     * @return {void}
     * @throws {Error}
     */
    function spendFilesVersionsGridDataRefresh(refreshGrid: boolean = true): void {
      // Default: Get spend files versions for the selected company
      if (adminUploadData.companySelectedId !== "all") {
        spendFilesVersionsByCompanyAPIReadAll(refreshGrid);

        return;
      }      
      // Get all spend files versions from all companies
      spendFilesVersionsAPIReadAll(refreshGrid);
    }

    watch(
      [
        companies,
        () => adminUploadData.companySelectedId,
        spendFilesVersionsRecalculateTrackingNumber,
      ],
      () => {
        spendFilesVersionsGridDataRefresh();
      },
    );

    function spendFilesVersionsGridOnDelete(
      event: any,
      selectedFileType: string,
    ) {
      try {
        adminUploadData.selectedFileIdForDelete = event.iri;

        adminUploadData.deleteSpendFileValue = selectedFileType === "spend";

        // Validate
        if (
          StringUtils.isNullUndefinedOrEmpty(
            adminUploadData.selectedFileIdForDelete,
          )
        ) {
          throw new Error(
            "** adminUploadData.selectedFileIdForDelete is null, undefined or empty",
          );
        }

        if (!adminUploadData.deleteSpendFileValue) {
          throw new Error(
            "** adminUploadData.deleteSpendFileValue is false",
          );
        }

        // Show modal
        adminUploadData.showConfirmDeleteModal = true;
      } catch (error) {
        //
        if (import.meta.env.DEV) console.error("** (spendFilesVersionsGridOnDelete)", error);
      }
    }

    /**
     * Get file versions from the API.
     * Route: GET - /api/companies/{id}/spend_files_versions
     *
     * @return {void}
     */
    function spendFilesVersionsByCompanyAPIReadAll(refreshGrid: boolean = true): void {
      try {
        // Validate
        if (
          StringUtils.isNullUndefinedOrEmpty(adminUploadData.companySelectedId)
        ) {
          throw new Error(
            "** adminUploadData.companySelectedId is null, undefined or empty",
          );
        }

        if (adminUploadData.companySelectedId === "all") {
          throw new Error("** adminUploadData.companySelectedId is 'all'");
        }

        // Enable loading
        adminUploadData.loadingData = true;

        const companyId = StringUtils.removeIRI(
          adminUploadData.companySelectedId,
        );

        const params = {
          companyId,
          callbackSuccess: (callbackSuccessData: any) => {
            spendFilesVersionsByCompany.value = callbackSuccessData
            // Disable loading
            adminUploadData.loadingData = false;
            if (refreshGrid) {
              adminUploadData.keyGrid++;
            }
          },
                  callbackError: () => {
          if (import.meta.env.DEV)
            console.error(
              "** (spendFilesVersionsByCompanyAPIReadAll) callbackErrorData:",
            );

          // Disable loading
          adminUploadData.loadingData = false;
          if (refreshGrid) {
            adminUploadData.keyGrid++;
          }
        },
        };

        spendFilesStore.spendFilesVersionsByCompanyAPIReadAll(params);
      } catch (error) {
        if (import.meta.env.DEV)
          console.error("** (spendFilesVersionsByCompanyAPIReadAll)", error);
      }
    }

    /**
     * Get file versions from the API.
     * Route: GET - /api/companies/spend_files_versions
     *
     * @return {void}
     */
    function spendFilesVersionsAPIReadAll(refreshGrid: boolean = true): void {
      // Enable loading
      adminUploadData.loadingData = true;

      const params = {
        callbackSuccess: (callbackSuccessData: any) => {
          spendFilesVersionsByCompany.value = callbackSuccessData
          // Disable loading
          adminUploadData.loadingData = false;          
          if (refreshGrid) {
            adminUploadData.keyGrid++;
          }
        },
        callbackError: () => {
          if (import.meta.env.DEV)
            console.error(
              "** (spendFilesVersionsAPIReadAll) callbackErrorData:",
            );

          // Disable loading
          adminUploadData.loadingData = false;
          if (refreshGrid) {
            adminUploadData.keyGrid++;
          }
        },
      };

      spendFilesStore.spendFilesVersionsAPIReadAll(params);
    }

    function toggleModalForUploadedFile() {
      adminUploadData.showModalForUploadedFile =
        !adminUploadData.showModalForUploadedFile;
    }

  
    /**
     * Upload a spend file to the API.
     *
     * @param {any} event - the event parameter
     * @return {void}
     */
    function addSpendFiles(event: any): void {

      const customLabelToSlug = customDataPointLabelToSlugMap.value;
      const selectedMatchingFields: string[] = [];
      allAvailableMatchingFields.value.forEach((fieldObj: MatchingField) => {
        if (matchingFieldsSelected[fieldObj.field]) {
          selectedMatchingFields.push(customLabelToSlug[fieldObj.field] ?? fieldObj.field);
        }
      });
      
      
      const syncDataToSend = {
        matchingFields: showExcludedFields.value && adminUploadData.spendfileToSyncronize ? selectedMatchingFields : null,
        global:{
          keepHistoricalData: adminUploadData.syncronizeKeepHistoricalData,
        },
        suppliers: {
          suppliersNotes: adminUploadData.syncronizeSupplierNotes,
          suppliersStandard: adminUploadData.syncronizeSupplierStandard,
        },
        spends: {
          newTerms: adminUploadData.syncronizeTargets,
          targetTerms: adminUploadData.syncronizeAgreements,
          targetTermsModality: adminUploadData.syncronizeAgreements ? selectedOptionForTarget.value : null,
          customizedPeerGroup: adminUploadData.syncronizePeerGroupStandard,
        },
        negotiation: {
          planPhase: adminUploadData.syncronizePlanPhase,
          negotiationStatus: adminUploadData.syncronizeNegotiationStatus,
          changeRequests: adminUploadData.syncronizeChangeRequests,
        }
      };

      // Enable loading
      adminUploadData.loadingData = true;
      adminUploadData.spendFileErrorMessage = "";
      const params = {
        file: event.target.files[0],
        companyUUID: StringUtils.removeIRI(adminUploadData.companySelectedId),
        isPublic: adminUploadData.limitAccessForSpendFile !== "private",        
        spendfileUUID: adminUploadData.spendfileToSyncronize,
        syncData: adminUploadData.spendfileToSyncronize ? syncDataToSend : null,
        callbackSuccess: () => {
          // Disable loading
          adminUploadData.loadingData = false;

          adminUploadData.forEMISFileModal = false;

          toggleModalForUploadedFile();

          spendFilesVersionsGridDataRefresh();

          //-reset data for upload spend file
          adminUploadData.syncronizeSupplierNotes = false;
          adminUploadData.syncronizeKeepHistoricalData = false;
          adminUploadData.syncronizeTargets = false;
          adminUploadData.syncronizeAgreements = false;
          adminUploadData.syncronizeSupplierStandard = false;
          adminUploadData.syncronizePeerGroupStandard = false;
          adminUploadData.syncronizePlanPhase = false;
          adminUploadData.syncronizeNegotiationStatus = false;
          adminUploadData.syncronizeChangeRequests = false;
          adminUploadData.spendfileToSyncronize = null;
          // Reinicializar todos los checkboxes con sus valores checked por defecto
          if (matchingFieldsData.matchingFields && Array.isArray(matchingFieldsData.matchingFields)) {
            matchingFieldsData.matchingFields.forEach((fieldObj: MatchingField) => {
              matchingFieldsSelected[fieldObj.field] = fieldObj.checked;
            });
          }

          if (currentCompanyHaveVcardEnabled.value) {
            vCardFields.forEach((fieldObj: any) => {
              matchingFieldsSelected[fieldObj.field] = fieldObj.checked;
            });
          }

        },
        callbackError: (callbackErrorData: any) => {
          toast.error(translate.t("global.noty.error.upload.file"));
          adminUploadData.syncronizeSupplierNotes = false;
          adminUploadData.syncronizeKeepHistoricalData = false;
          adminUploadData.syncronizeTargets = false;
          adminUploadData.syncronizeAgreements = false;
          adminUploadData.syncronizeSupplierStandard = false;
          adminUploadData.syncronizePeerGroupStandard = false;
          adminUploadData.syncronizePlanPhase = false;
          adminUploadData.syncronizeNegotiationStatus = false;
          adminUploadData.syncronizeChangeRequests = false;
          adminUploadData.spendfileToSyncronize = null;

          if (callbackErrorData !== null && callbackErrorData !== undefined) {
            if (
              Object.hasOwn(callbackErrorData, "hydra:description")
            ) {
              adminUploadData.spendFileErrorMessage =
                callbackErrorData["hydra:description"];
            } else if (
              Object.hasOwn(callbackErrorData, "data") &&
              Object.hasOwn(callbackErrorData.data, "error")
            ) {
              adminUploadData.spendFileErrorMessage =
                callbackErrorData.data.error;
            } else if (shouldShowErrorToasts()) {
              adminUploadData.spendFileErrorMessage =
                translate.t("error.server400");
            }
          } else if (shouldShowErrorToasts()) {
            adminUploadData.spendFileErrorMessage =
              translate.t("error.server400");
          }

          // Disable loading
          adminUploadData.loadingData = false;
        },
      };
      spendFilesStore.postSpendFile(params);
    }

    // *** Spend files versions - Actions ***

    // Reset Status Confirmation Modal
    const isShowResetStatusConfirmationModal = ref(false)
    const isProcessingResetStatus = ref(false)
    const pendingResetStatusFiles: Ref<string[]> = ref([])

    function spendFilesVersionsGridOnActionClicked({
      action,
      dataItem,
    }: {
      action: "recalculate" | "reset-status";
      dataItem: SpendFile.SpendFileVersionByCompany;
    }) {
      if (action === "recalculate") {
        spendFilesVersionsAPIUpdateMultipleRecalculate([dataItem.uuid]);

        return;
      }

      if (action === "reset-status") {
        // Show confirmation modal before executing reset
        pendingResetStatusFiles.value = [dataItem.uuid];
        isShowResetStatusConfirmationModal.value = true;

        return;
      }

      if (import.meta.env.DEV)
        console.log(
          "** NOT IMPLEMENTED spendFilesVersionsGridOnActionClicked / action",
          action,
        );
    }

    function confirmResetStatus() {
      isProcessingResetStatus.value = true;
      spendFilesVersionsAPIResetStatus(pendingResetStatusFiles.value);
    }

    const spendFilesVersionsGridDataSelectedItems: Ref<
      SpendFile.SpendFileVersionByCompanyGridDataItem[]
    > = ref([]);

    function spendFilesVersionsGridOnSelectAllRow(
      dataItems: SpendFile.SpendFileVersionByCompanyGridDataItem[],
      checked: boolean,
    ) {
      if (checked) {
        spendFilesVersionsGridDataSelectedItems.value = dataItems;

        return;
      }

      spendFilesVersionsGridDataSelectedItems.value = [];
    }

    function spendFilesVersionsGridOnSelectRow(dataItems: any) {
      spendFilesVersionsGridDataSelectedItems.value = dataItems;
    }
    function spendFilesVersionsGridOnActionMenuOptionClicked(
      action: "recalculate" | "reset-status",
    ) {
      if (action === "recalculate") {
        const filesIds = spendFilesVersionsGridDataSelectedItems.value.map(
          (spendFileVersion: SpendFile.SpendFileVersionByCompany) => {
            return spendFileVersion.uuid;
          },
        );

        spendFilesVersionsAPIUpdateMultipleRecalculate(filesIds);

        return;
      }

      if (action === "reset-status") {
        const filesIds = spendFilesVersionsGridDataSelectedItems.value.map(
          (spendFileVersion: SpendFile.SpendFileVersionByCompany) => {
            return spendFileVersion.uuid;
          },
        );

        // Show confirmation modal before executing reset
        pendingResetStatusFiles.value = filesIds;
        isShowResetStatusConfirmationModal.value = true;

        return;
      }

      if (import.meta.env.DEV)
        console.log(
          "** NOT IMPLEMENTED spendFilesVersionsGridOnActionMenuOptionClicked / action",
          action,
        );
    }

    function spendFilesVersionsAPIUpdateMultipleRecalculate(
      filesIds: string[],
    ) {
      try {
        // Validate
        if (ArrayUtils.isEmpty(filesIds)) {
          toast.warning(translate.t("global.noty.error.pleaseSelectAtLeastOneFile"));

          throw new Error("'filesIds' is empty.");
        }

        const params = {
          filesIDs: filesIds,
          callbackSuccess: (callbackSuccessData: any) => {
            if ("error" in callbackSuccessData) {
              throw new Error(
                `API call failed. Message: ${callbackSuccessData.error}`,
              );
            }

            const { result, subject, summary } = callbackSuccessData;

            // API call failed
            if (result === "failed") {
              throw new Error(`API call failed. Message: ${subject}`);
            }

            // API call succeeded

            // No changes
            if (summary.changedCount === 0) {
              toast.warning(translate.t("global.noty.noChangesWereApplied"));
            }
            // All changes were applied
            else {
              toast.success(translate.t("adminBackend.adminUploadData.scheduleRecalculateSpendFile"));

              spendFilesVersionsRecalculateTrackingNumber.value =
                NumberUtils.getRandomInt();
            }

            // Disable loading
            adminUploadData.loadingData = false;
          },
          callbackError: (callbackErrorData: unknown) => {
            if (import.meta.env.DEV)
              console.error(
                "** (spendFilesVersionsAPIUpdateMultipleRecalculate) Error:",
                callbackErrorData,
              );

            toast.error(translate.t("global.noty.error.tryAgainLater"));

            // Disable loading
            adminUploadData.loadingData = false;
          },
        };

        // Enable loading
        adminUploadData.loadingData = true;

        spendFilesStore.recalculateFileVersion(params);
      } catch (error) {
        //
        if (import.meta.env.DEV)
          console.error(
            "** (spendFilesVersionsAPIUpdateMultipleRecalculate)",
            error,
          );
        toast.error(translate.t("global.noty.error.tryAgainLater"));
      }
    }

    function spendFilesVersionsAPIResetStatus(
      filesIds: string[],
    ) {
      try {
        // Validate
        if (ArrayUtils.isEmpty(filesIds)) {
          toast.warning(translate.t("global.noty.error.pleaseSelectAtLeastOneFile"));

          throw new Error("'filesIds' is empty.");
        }

        const params = {
          filesIDs: filesIds,
          callbackSuccess: (callbackSuccessData: any) => {
            if ("error" in callbackSuccessData) {
              throw new Error(
                `API call failed. Message: ${callbackSuccessData.error}`,
              );
            }

            const { result, subject, summary } = callbackSuccessData;

            // API call failed
            if (result === "failed") {
              throw new Error(`API call failed. Message: ${subject}`);
            }

            // API call succeeded

            // No changes
            if (summary.changedCount === 0) {
              toast.warning(translate.t("global.noty.noChangesWereApplied"));
            }
            // All changes were applied
            else {
              toast.success(translate.t("adminBackend.adminUploadData.scheduleResetSpendFileStatus"));

              spendFilesVersionsRecalculateTrackingNumber.value =
                NumberUtils.getRandomInt();
            }

            // Close modal and reset state
            isShowResetStatusConfirmationModal.value = false;
            isProcessingResetStatus.value = false;
            pendingResetStatusFiles.value = [];

            // Disable loading
            adminUploadData.loadingData = false;
          },
          callbackError: (callbackErrorData: unknown) => {
            if (import.meta.env.DEV)
              console.error(
                "** (spendFilesVersionsAPIResetStatus) Error:",
                callbackErrorData,
              );

            toast.error(translate.t("global.noty.error.tryAgainLater"));

            // Close modal and reset state
            isShowResetStatusConfirmationModal.value = false;
            isProcessingResetStatus.value = false;
            pendingResetStatusFiles.value = [];

            // Disable loading
            adminUploadData.loadingData = false;
          },
        };

        // Enable loading
        adminUploadData.loadingData = true;

        spendFilesStore.resetFileVersionStatus(params);
      } catch (error) {
        //
        if (import.meta.env.DEV)
          console.error(
            "** (spendFilesVersionsAPIResetStatus)",
            error,
          );
        toast.error(translate.t("global.noty.error.tryAgainLater"));
      }
    }

    // *** END Spend files versions - Actions ***

    // *** END Spend Files Versions ***

    function notImplemented() {
      toast.error(translate.t("global.noty.error.notImplemented"));
    }

    function inputResetNewSpendFile() {
      if (fileInputSpend.value !== null) {
        fileInputSpend.value.value = "";
      }
    }

    function inputResetNewEMISFile() {
      if (fileInputEMIS.value !== null) {
        fileInputEMIS.value.value = "";
      }
    }

    function newSpendFile() {

      adminUploadData.showingConfirmModal = false

      if (fileInputSpend.value !== null) {
        fileInputSpend.value.click();
      }
    }

    function newEMISFile() {

      if (fileInputEMIS.value !== null) {
        fileInputEMIS.value.click();
      }
    }
    function onDenominatorMatch(fileVersion: any) {
      // Enable loading
      adminUploadData.loadingData = true;

      const params = {
        fileID: fileVersion.uuid,
        callbackSuccess: () => {
          // Disable loading
          adminUploadData.loadingData = false;
          toast.success(translate.t("adminBackend.adminUploadData.scheduleDenominatorScoreFile"));

          spendFilesVersionsGridDataRefresh();
        },
        callbackError: () => {
          // Disable loading
          adminUploadData.loadingData = false;
        },
      };

      spendFilesStore.recalculateDenominatorMatchFileVersion(params);
    }

    /**
     * Upload EMIS files to the API.
     *
     * @param {any} event
     * @return {void}
     */
    function addEMISFiles(event: any): void {
      // Disable loading
      adminUploadData.loadingData = true;

      adminUploadData.spendFileErrorMessage = "";

      const params = {
        newFile: event.target.files[0],
        companyUUID: StringUtils.removeIRI(adminUploadData.companySelectedId),
        callbackSuccess: () => {
          // Disable loading
          adminUploadData.loadingData = false;

          adminUploadData.forEMISFileModal = true;

          toggleModalForUploadedFile();
        },
        callbackError: (callbackErrorData: any) => {
          toast.error(translate.t("global.noty.error.upload.file"));

          if (callbackErrorData !== null && callbackErrorData !== undefined) {
            if (
              Object.hasOwn(callbackErrorData, "hydra:description")
            ) {
              adminUploadData.emisFileErrorMessage =
                callbackErrorData["hydra:description"];
            } else if (
              Object.hasOwn(callbackErrorData, "data") &&
              Object.hasOwn(callbackErrorData.data, "error")
            ) {
              adminUploadData.emisFileErrorMessage =
                callbackErrorData.data.error;
            } else if (shouldShowErrorToasts()) {
              adminUploadData.emisFileErrorMessage =
                translate.t("error.server400");
            }
          } else if (shouldShowErrorToasts()) {
            adminUploadData.emisFileErrorMessage =
              translate.t("error.server400");
          }

          // Disable loading
          adminUploadData.loadingData = false;
        },
      };

      spendFilesStore.postEMISFile(params);
    }

    const convertToCsv = (data: any, title: string, obj: any) => {
      const headers = Object.keys(data[0]);
      const csvData = [];

      // Add the headers row
      csvData.push(headers.join(","));

      // Add the data rows
      data.forEach((row: any) => {
        const rowData: any = [];
        headers.forEach((header) => {
          rowData.push(row[header]);
        });
        csvData.push(rowData.join(","));
      });

      return csvData.join("\n");
    };

    /**
     * Download the Excel File
     */
    function downloadAdjustments(obj: any, behavior: string) {
      adminUploadData.loadingData = true;
      const titleForCsv = getNameForFileTitle(behavior);
      const params = {
        spendFileId: obj.uuid,
        behavior: behavior,
        callbackSuccess: (response: any) => {
          adminUploadData.loadingData = false;
          // Convert ArrayBuffer to human-readable text (assuming it's UTF-8 encoded)
          const decoder = new TextDecoder("utf-8");
          const decodedText = decoder.decode(response);
          const jsonData = JSON.parse(decodedText);
          const csvData = convertToCsv(jsonData, titleForCsv, obj);
          saveAs(
            new Blob([csvData], { type: "text/csv" }),
            obj.spendFileName.split(".xlsx")[0] + "-" + behavior + "Version" + obj.version + ".csv",
          );
        },
        callbackError: () => {
          adminUploadData.loadingData = false;
        },
      };
      spendFilesStore.downloadAdjustmentsFile(params);
    }

    /**
     * PeerGroupAndSupplierStandardAdjustments
     * Upload the Excel File
     */
    function uploadAdjustments(obj: any, fileName: any, behavior: string) {
      adminUploadData.loadingData = true;
      const params = {
        newFile: fileName,
        id: StringUtils.removeIRI(obj.iri),
        behavior: behavior,
        callbackSuccess: () => {
          adminUploadData.loadingData = false;
          toggleModalForUploadedFile();
        },
        callbackError: () => {
          toast.error(translate.t("global.noty.error.upload.file"));
          adminUploadData.loadingData = false;
        },
      };
      spendFilesStore.uploadAdjustmentsFile(params);
    }

    // *** END EMIS ***

    // *** Setup ***

    getCompanies();

    // *** END Setup ***

    function setCheckGroup(e: any, field: string) {  

      switch (field) {
        case "syncronizeSupplierNotes":
          adminUploadData.syncronizeSupplierNotes = e.value
          break
        case "syncronizeKeepHistoricalData":
          adminUploadData.syncronizeKeepHistoricalData = e.value
          break
        case "syncronizeTargets":
          adminUploadData.syncronizeTargets = e.value
          break 
        case "syncronizeAgreements":
          adminUploadData.syncronizeAgreements = e.value
          break
        case "syncronizeSupplierStandard":
          adminUploadData.syncronizeSupplierStandard = e.value
          break
        case "syncronizePeerGroupStandard":
          adminUploadData.syncronizePeerGroupStandard = e.value
          break
        case "syncronizePlanPhase":
          adminUploadData.syncronizePlanPhase = e.value
          break
        case "syncronizeNegotiationStatus":
          adminUploadData.syncronizeNegotiationStatus = e.value
          break
        case "syncronizeChangeRequests":
          adminUploadData.syncronizeChangeRequests = e.value
          break
        default:
          break
      }

      adminUploadData.keyReactive++
    }

    function cancelUploadFile() {      
      adminUploadData.showMatchingFields = false;
      adminUploadData.isShowLevelOfAccessModalShowing = false
      adminUploadData.syncronizeSupplierNotes = false
      adminUploadData.syncronizeKeepHistoricalData = false
      adminUploadData.syncronizeTargets = false
      adminUploadData.syncronizeAgreements = false
      adminUploadData.syncronizeSupplierStandard = false
      adminUploadData.syncronizePeerGroupStandard = false
      adminUploadData.syncronizePlanPhase = false
      adminUploadData.syncronizeNegotiationStatus = false
      adminUploadData.syncronizeChangeRequests = false
      adminUploadData.spendfileToSyncronize = null
      adminUploadData.showingConfirmModal = false      
      // Reinicializar todos los checkboxes con sus valores checked por defecto
      if (matchingFieldsData.matchingFields && Array.isArray(matchingFieldsData.matchingFields)) {
        matchingFieldsData.matchingFields.forEach((fieldObj: MatchingField) => {
          matchingFieldsSelected[fieldObj.field] = fieldObj.checked;
        });
      }

      if (currentCompanyHaveVcardEnabled.value) {
        vCardFields.forEach((fieldObj: any) => {
          matchingFieldsSelected[fieldObj.field] = fieldObj.checked;
        });
      }

      adminUploadData.keyReactive++
    }

    function setSyncronyzeValues() {
      // Resetear matchingFieldsSelected cuando cambia el spendfile
      if (matchingFieldsData.matchingFields && Array.isArray(matchingFieldsData.matchingFields)) {
        matchingFieldsData.matchingFields.forEach((fieldObj: MatchingField) => {
          matchingFieldsSelected[fieldObj.field] = fieldObj.checked;
        });
      }

      if (currentCompanyHaveVcardEnabled.value) {
        vCardFields.forEach((fieldObj: any) => {
          matchingFieldsSelected[fieldObj.field] = fieldObj.checked;
        });
      }
      
      if (StringUtils.isNullUndefinedOrEmpty(adminUploadData.spendfileToSyncronize)) {
        adminUploadData.syncronizeSupplierNotes = false
        adminUploadData.syncronizeKeepHistoricalData = false
        adminUploadData.syncronizeTargets = false
        adminUploadData.syncronizeAgreements = false
        adminUploadData.syncronizeSupplierStandard = false
        adminUploadData.syncronizePeerGroupStandard = false
        adminUploadData.syncronizePlanPhase = false
        adminUploadData.syncronizeNegotiationStatus = false
        adminUploadData.syncronizeChangeRequests = false
      } else {
        const syncHistoricalData = currentCompanyHaveKeepHistoricalDataEnabled.value
        adminUploadData.syncronizeSupplierNotes = true
        adminUploadData.syncronizeKeepHistoricalData = syncHistoricalData
        adminUploadData.syncronizeTargets = false
        adminUploadData.syncronizeAgreements = false
        adminUploadData.syncronizeSupplierStandard = false
        adminUploadData.syncronizePeerGroupStandard = false
        adminUploadData.syncronizePlanPhase = false
        adminUploadData.syncronizeNegotiationStatus = false
        adminUploadData.syncronizeChangeRequests = false
      }
      adminUploadData.showMatchingFields = false
      adminUploadData.keyReactive++
    }

    function setMatchingField(field: string, value: boolean) {
      matchingFieldsSelected[field] = value;
      adminUploadData.keyReactive++;
    }
    
    function toggleAllMatchingFields(checked: boolean) {
      const fields = allAvailableMatchingFields.value;
      const markableFields = fields.filter(
        (fieldObj) => fieldObj.field !== 'provider' && fieldObj.field !== 'buyer'
      );
      
      markableFields.forEach((fieldObj) => {
        matchingFieldsSelected[fieldObj.field] = checked;
      });
      
      adminUploadData.keyReactive++;
    }

    function setOptionsForTarget(value: string) {
      selectedOptionForTarget.value = value;
      showMoreSettingForTarget.value = false;
    }


    return {
      ...toRefs(adminUploadData),
      addEMISFiles,
      addSpendFiles,
      changeSpendFileStatus,
      cleanFile,
      companiesDropdownItems,
      companiesFormatted,
      convertToCsv,
      defaultSpendFilesGridColumns,
      deleteSpendFile,
      downloadAdjustments,
      fileInputEMIS,
      fileInputSpend,      
      hideDeleteModal,
      images,
      inputResetNewEMISFile,
      inputResetNewSpendFile,
      newEMISFile,
      newSpendFile,
      notImplemented,
      onDeleteEMISFile,
      onDeleteSpendFile,
      onDenominatorMatch,
      onDownloadEMISFile,
      onDownloadFile,
      onUpdateLevelOfAccess,
      showDeleteModal,
      spendFilesVersionsGridData,
      spendFilesVersionsGridDataRefresh,
      spendFilesVersionsGridOnActionClicked,
      spendFilesVersionsGridOnActionMenuOptionClicked,
      spendFilesVersionsGridOnDelete,
      spendFilesVersionsGridOnSelectAllRow,
      spendFilesVersionsGridOnSelectRow,
      toggleModalForUploadedFile,
      uploadAdjustments,
      uploadFileIsBtnIsVisible,
      uploadSpendFileRelated,
      changeSpendFileVisibility,
      updateRowDataNotes,
      setCheckGroup,
      cancelUploadFile,
      setSyncronyzeValues,
      getSpendFileObj,
      getActiveCompanyObj,
      showExcludedFields,
      matchingFieldsSelected,
      setMatchingField,
      allAvailableMatchingFields,
      matchingFieldsColumns,
      allMatchingFieldsChecked,
      toggleAllMatchingFields,
      AGG_MODALITY_OPTIONS,      
      showMoreSettingForTarget,
      setOptionsForTarget,
      selectedOptionForTarget,
      currentCompanyHaveVcardEnabled,
      currentCompanyHaveKeepHistoricalDataEnabled,
      getCustomFieldsBySpendfile,
      isShowResetStatusConfirmationModal,
      isProcessingResetStatus,
      pendingResetStatusFiles,
      confirmResetStatus
    };
  },
};
</script>

<style scoped>
.d-flex.flex-column.popup-settings {
    gap: .5rem;
    width: 200px;
}

.disabled-button {
  justify-content: start;
  gap: 1.5rem;
}

</style>