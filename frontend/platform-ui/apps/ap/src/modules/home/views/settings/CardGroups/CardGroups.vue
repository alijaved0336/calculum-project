<template>
<CalculumModal v-if="showModal" @close="cancelAction" :size="'lg'" :showClose="true" :title="$t('home.homePreference.confirm')">
  <template v-slot:modalContent>
    <p>{{ $t('home.homePreference.unsavedChanges') }}</p>
  </template>
  <template v-slot:modalButtons>
    <button class="btn outline-secondary-btn font-md" style="z-index: 1; width: fit-content" @click="cancelAction">           <span>{{ $t('global.cancel') }}</span></button>
    <button class="btn outline-secondary-btn font-md" style="z-index: 1; width: fit-content" @click="discardChanges">           <span>{{ $t('global.discard') }}    </span></button>
    <button class="btn btn-primary font-md" style="z-index: 1; width: fit-content" @click="hideModalNSave"><span>{{ $t('global.save') }}</span></button>
  </template>
</CalculumModal>
<CalculumModal :size="'lg'" :showClose="true" :title="$t('home.homeCompanySettings.deleteConfirmTitle')" @close="showDeleteConfirmation = !showDeleteConfirmation" v-if="showDeleteConfirmation">
  <template v-slot:modalContent>
    <p class="modal_msg">{{ $t('home.homeCompanySettings.deleteConfirmText') }}</p>
  </template>
  <template v-slot:modalButtons>
    <button class="btn outline-secondary-btn font-md" @click="showDeleteConfirmation = !showDeleteConfirmation" style="z-index: 1; width: fit-content"> <span>{{ $t('global.cancel') }}</span></button>
    <button class="btn btn-primary font-md delete-group" @click="deleteGroup" style="z-index: 1; width: fit-content;"> <span>{{ $t('global.delete') }}  </span></button>
  </template>
</CalculumModal>
<CalculumModal :size="'lg'" :showClose="true" :title="$t('home.homeCompanySettings.cardGroups.disablevCardTitle')" @close="showConfirmModal = !showConfirmModal" v-if="showConfirmModal">
  <template v-slot:modalContent>
    <p class="modal_msg">{{ $t('home.homeCompanySettings.cardGroups.disablevCardBody') }}</p>
  </template>
  <template v-slot:modalButtons>
    <button class="btn outline-secondary-btn font-md" @click="cancelChanges" style="z-index: 1; width: fit-content"> <span>{{ $t('global.cancel') }}</span></button>
    <button class="btn btn-primary font-md" @click="continueNDisabledVcard" style="z-index: 1; width: fit-content;"> <span>{{ $t('global.continue') }}  </span></button>
  </template>
</CalculumModal>
<CalculumAnalyzeFilter v-if="showFilter" @close="closeFilter" @saveChosenConditionFilter="saveFilterSelection" @updateChosenConditionFilter="updateFilter" :availableFilters="availableFilters" :editFilterObj="editSelectedCardGroup" :filter-title="'Condition Settings'" :isEditMode="isEditMode">     </CalculumAnalyzeFilter>
<CalculumLoading v-if="parsingGroups || isLoadingFilters || loadingPatch" :modal="true"></CalculumLoading>
<div class="row">
  <div class="col">
    <div class="card auto-height" style="height: auto;">
      <div class="card-body">
        <div class="d-flex flex-column mb-6">
          <div class="row w-100">
            <div :class="screenWidth ? 'col-5 d-flex flex-column' : 'col-3 d-flex flex-column'">
              <div class="row w-100 mb-3">
                <div class="col-8"><span class="text-gray-600 text-base font-semibold mb-4">{{ $t('home.homeCompanySettings.cardGroups.applyVCard') }}
                    <CalculumTooltipIcon :infoText="$t('home.homeCompanySettings.cardGroups.tooltips.applyVCardTooltip')" :advancedTooltipClass="false"></CalculumTooltipIcon></span></div>
                <div class="col-4 d-flex acceptance-right-section">
                  <label class="switch ml-2" id="vCardsGroupsEnabled">
                    <input @change="toggleVCardGroups" type="checkbox" v-model="vCardsGroupsEnabled" :disabled="disabledButtonSpendFileInrecalculation"/><span class="slider round" :class="{'slider-disabled': disabledButtonSpendFileInrecalculation}"></span>
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div class="d-flex flex-column" v-if="vCardsGroupsEnabled">
          <div class="row w-100 mb-6">
            <div class="col-12 d-flex flex-column"><span class="text-gray-600 text-base font-semibold mb-4">{{ $t('home.homeCompanySettings.cardGroups.minimumProbabilityofSuccess') }} (%)
                <CalculumTooltipIcon :infoText="$t('home.homeCompanySettings.cardGroups.minimumProbabilityofSuccessTooltip')" :advancedTooltipClass="false"></CalculumTooltipIcon></span>
              <p>{{ $t('home.homeCompanySettings.cardGroups.minimumProbabilityofSuccessDesc') }}</p>
            </div>
            <div :class="screenWidth ? 'col-5 d-flex flex-column' : 'col-3 d-flex flex-column'">
              <div class="row mb-3 w-100">
                <div class="col-4 d-flex flex-column acceptance-right-section"><span class="text-xs font-medium text-gray-500 input-right">{{ '' }}</span>
                  <input class="form-control group-name input-right" :class="probabilityOfSuccessError ? 'input-red-border' : ''" type="text" v-model="probabilityOfSuccessPresentation" :disabled="disabledButtonSpendFileInrecalculation" @click="($event.target as HTMLInputElement)?.select()" @blur="convertFloat(probabilityOfSuccessPresentation, 'probabilityOfSuccess')"/><span class="error text-left errors-days" v-if="probabilityOfSuccessError">{{ probabilityOfSuccessError }}</span>
                </div>
              </div>
            </div>
            <div class="col-12"></div>
            <div v-if="showAceptanceTypes" :class="screenWidth ? 'col-5 d-flex flex-column' : 'col-3 d-flex flex-column'">
              <div class="row w-100 mb-3">
                <div class="col-12"><span class="text-gray-600 text-base font-semibold">{{ $t('home.homeCompanySettings.cardGroups.acceptanceTitle') }}</span>
                  <Dropdown class="mt-3" :id="'vcard-provider-dropdown'" :currentOptionSelected="vCardProviderSelected" :dataList="dropdownOptions" :label="$t('home.homeCompanySettings.cardGroups.chooseSource')" :disabled="disabledButtonSpendFileInrecalculation" @selected-item="selectVCardProvider"></Dropdown>
                </div>
              </div>
              <div class="row mb-4 w-100 mt-2">
                <div class="col-8 d-flex align-items-center"><span class="text-xs font-medium text-gray-500">{{ $t('home.homeCompanySettings.cardGroups.acceptanceTitle') }} </span>
                  <CalculumTooltipIcon :infoText="$t('global.vCardTooltips.acceptanceType')" :advancedTooltipClass="false"> </CalculumTooltipIcon>
                </div>
                <div class="col-4 d-flex acceptance-right-section"><span class="text-xs font-medium text-gray-500">{{ $t('home.homeCompanySettings.cardGroups.enrollment') }}                 </span></div>
              </div>
              <div class="row mb-3 w-100" v-for="(types) in vCardProvider?.acceptanceTypes" :key="types.id">
                <div class="col-8 center-labels"><span class="text-gray-600 text-sm font-semibold">{{ types.description }}                    </span></div>
                <div class="col-4 d-flex flex-column acceptance-right-section">
                  <input class="form-control group-name input-right" :class="types.error ? 'input-red-border' : ''" :id="'enrollment-' + types.acceptanceType" type="text" v-model="types.enrollmentPresentation" :disabled="disabledButtonSpendFileInrecalculation" @click="($event.target as HTMLInputElement)?.select()" @blur="convertFloat(types.enrollmentPresentation, types.acceptanceType)"/><span class="error text-left errors-days" v-if="types.error">{{ types.error }}</span>
                </div>
              </div>
              <div class="row mb-3 w-100">
                <div class="col-8 center-labels"></div>
                <div class="col-4 d-flex flex-column acceptance-right-section">
                  <button class="btn outline-secondary-btn font-md" style="z-index: 1;" :disabled="disabledButtonSpendFileInrecalculation" @click="resetEnrollment()"><span>{{ $t('button.reset') }}</span></button>
                </div>
              </div>
              <div class="row mb-3 w-100 bg-color-light-gray top-bar">
                <div class="col-8 center-labels"><span class="text-gray-600 text-sm font-semibold">{{ $t('home.homeCompanySettings.cardGroups.types.defaultEnrollment') }}
                    <CalculumTooltipIcon :infoText="$t('home.homeCompanySettings.cardGroups.tooltips.defaultEnrollmenTooltip')" :advancedTooltipClass="false"></CalculumTooltipIcon></span></div>
                <div class="col-4 d-flex flex-column acceptance-right-section">
                  <input class="form-control group-name input-right" :class="classDefaultEnrollmentError" type="text" v-model="defaultEnrollmentPresentation" :disabled="disabledButtonSpendFileInrecalculation" @click="($event.target as HTMLInputElement)?.select()" @blur="convertFloat(defaultEnrollmentPresentation, 'defaultEnrollment')"/><span class="error text-left errors-days" v-if="defaultEnrollmentError">{{ defaultEnrollmentError }}</span>
                </div>
              </div>
            </div>
          </div>
          <div class="row w-100">
            <div class="col d-flex flex-column" v-if="!parsingGroups && !isLoadingFilters"><span class="text-gray-600 text-base font-semibold mb-4"> {{ $t('home.homeCompanySettings.cardGroups.cardGroupsTitle') }}
                <CalculumTooltipIcon :infoText="$t('home.homeCompanySettings.cardGroups.tooltips.cardGroupsTitleTooltip')" :advancedTooltipClass="false"></CalculumTooltipIcon></span>
              <p class="text-base mb-4">{{ $t('home.homeCompanySettings.vCarddGroupText') }} </p>
              <div class="row mb-3 bg-color-light-gray top-bar">
                <div class="col-xl-2 col-md-2 col-sm-2">
                  <div class="row">
                    <div class="col-1"></div>
                    <div class="col"><span class="top-bar-title ml-2">{{ $t('home.homeCompanySettings.cardGroups.group') }}</span></div>
                  </div>
                </div>
                <div class="col-xl-2 col-md-2 col-sm-2 d-flex flex-column"><span class="top-bar-title">{{ $t('home.homeCompanySettings.cardGroups.name') }}</span></div>
                <div class="col-xl-1 col-md-1 col-sm-1 d-flex flex-column"><span class="top-bar-title">{{ $t('home.homeCompanySettings.cardGroups.avgTermReduction') }}
                    <CalculumTooltipIcon :infoText="$t('global.vCardTooltips.averageTermReduction')" :advancedTooltipClass="false"></CalculumTooltipIcon></span></div>
                <div class="col-xl-1 col-md-1 d-flex flex-column"><span class="top-bar-title">{{ $t('home.homeCompanySettings.cardGroups.supplierCardCost') }}
                    <CalculumTooltipIcon :infoText="$t('global.vCardTooltips.supplierCardCost')" :advancedTooltipClass="false"></CalculumTooltipIcon></span></div>
                <div class="col-xl-1 col-md-1 col-sm-1 d-flex flex-column"><span class="top-bar-title">{{ $t('home.homeCompanySettings.cardGroups.statementCycle') }}
                    <CalculumTooltipIcon :infoText="$t('global.vCardTooltips.statementCycleDays')" :advancedTooltipClass="false"></CalculumTooltipIcon></span></div>
                <div class="col-xl-1 col-md-1 col-sm-1 d-flex flex-column"><span class="top-bar-title">{{ $t('home.homeCompanySettings.cardGroups.gracePeriod') }}
                    <CalculumTooltipIcon :infoText="$t('global.vCardTooltips.gracePeriod')" :advancedTooltipClass="false"></CalculumTooltipIcon></span></div>
                <div class="col-xl-1 col-md-1 col-sm-1 d-flex flex-column"><span class="top-bar-title">{{ $t('home.homeCompanySettings.cardGroups.cumulutave') }}
                    <CalculumTooltipIcon :infoText="$t('global.vCardTooltips.cumulativeFloat')" :advancedTooltipClass="false"></CalculumTooltipIcon></span></div>
                <div class="col-xl-1 col-md-1 col-sm-1 d-flex flex-column"><span class="top-bar-title">{{ $t('home.homeCompanySettings.cardGroups.rebate') }}
                    <CalculumTooltipIcon :infoText="$t('global.vCardTooltips.rebateCardGroups')" :advancedTooltipClass="false"></CalculumTooltipIcon></span></div>
                <div class="col-xl-1 col-md-1 col-sm-1 d-flex flex-column"><span class="top-bar-title">{{ $t('home.homeCompanySettings.cardGroups.vCardRequiresCardInfrastructure') }}                    </span></div>
                <div class="col-xl-1 col-md-1 col-sm-1 d-flex align-items-center"><span class="pl-1 top-bar-title">{{ '' }}</span></div>
              </div>
              <div class="row group-row row-100" v-for="(group, index) in cardGroupsComputed" :class="{ 'custom_row_hover': isMouseHoveringOverDragIcon }" :draggable="isMouseHoveringOverDragIcon" @dragstart="startDrag($event, group)" @drop="onDrop($event, index)" @dragenter.prevent @dragover.prevent>
                <div class="row col-12 d-flex align-items-top">
                  <div class="col-xl-2 col-md-2 col-sm-2">
                    <div class="row d-flex align-items-center">
                      <div class="col-1">
                        <iconDragDrop class="icon_drag_drop mr-2" @mouseover="hoveringOverIcon" @mouseleave="notHoveringOverIcon"></iconDragDrop>
                      </div>
                      <div class="col">
                        <button class="buttons_groups_analyze" :style="'background: ' + group.color + '; color: ' + formatData.colorText(group.color) + ';'" draggable="true">{{ group.vCardName }}</button>
                      </div>
                    </div>
                  </div>
                  <div class="col-xl-2 col-md-2 col-sm-2 d-flex flex-column">
                    <input class="form-control group-name" :class="group.errorsName ? 'input-red-border' : ''" type="text" required="required" :maxlength="buyerStandardNameMaxLength" v-model="group.vCardGroupName" :disabled="disabledButtonSpendFileInrecalculation" @input="normalizeNames()" @click="($event.target as HTMLInputElement)?.select()" :placeholder="`Card Group ${index + 1}`"/><span class="error text-left errors-name" v-if="group.errorsName">{{ group.errorsName }}</span>
                  </div>
                  <div class="col-xl-1 col-md-1 col-sm-1 d-flex flex-column">
                    <input class="form-control group-name input-right" :class="group.errorvCardAvgTermReduction ? 'input-red-border' : ''" type="number" min="0" max="365" required="required" v-model="group.vCardGroupAvgTermReduction" :disabled="disabledButtonSpendFileInrecalculation" @input="normalizeNames()" @click="($event.target as HTMLInputElement)?.select()"/><span class="error text-left errors-name" v-if="group.errorvCardGroupAvgTermReduction">{{ group.errorvCardGroupAvgTermReduction }}</span>
                  </div>
                  <div class="col-xl-1 col-md-1 col-sm-1 d-flex flex-column">
                    <input class="form-control group-name input-right" :class="group.errorvCardsupplierCardCost ? 'input-red-border' : ''" type="number" min="-100" max="100" required="required" v-model="group.vCardGroupSupplierCardCost" :disabled="disabledButtonSpendFileInrecalculation" @input="normalizeNames()"/><span class="error text-left errors-name" v-if="group.errorvCardsupplierCardCost">{{ group.errorvCardsupplierCardCost }}</span>
                  </div>
                  <div class="col-xl-1 col-md-1 col-sm-1 d-flex flex-column">
                    <input class="form-control group-days input-right" :class="group.errorvCardGroupStatementCycle ? 'input-red-border' : ''" type="number" min="1" max="360" required="required" v-model="group.vCardGroupStatementCycle" :disabled="disabledButtonSpendFileInrecalculation" @click="($event.target as HTMLInputElement)?.select()" @input="normalizeNames()"/><span class="error text-left errors-days" v-if="group.errorvCardGroupStatementCycle">{{ group.errorvCardGroupStatementCycle }}</span>
                  </div>
                  <div class="col-xl-1 col-md-1 col-sm-1 d-flex flex-column">
                    <input class="form-control group-days input-right" :class="group.errorvCardGroupGracePeriod ? 'input-red-border' : ''" type="number" min="1" max="360" required="required" v-model="group.vCardGroupGracePeriod" :disabled="disabledButtonSpendFileInrecalculation" @click="($event.target as HTMLInputElement)?.select()" @input="normalizeNames()"/><span class="error text-left errors-days" v-if="group.errorvCardGroupGracePeriod">{{ group.errorvCardGroupGracePeriod }}</span>
                  </div>
                  <div class="col-xl-1 col-md-1 col-sm-1 d-flex flex-column">
                    <input class="form-control group-days input-right" disabled="true" type="number" min="1" max="360" required="required" v-model="group.vCardGroupCumulative" :disabled="disabledButtonSpendFileInrecalculation" @click="($event.target as HTMLInputElement)?.select()" @input="normalizeNames()"/><span class="error text-left errors-days" v-if="group.errorvCardGroupCumulative">{{ group.errorvCardGroupCumulative }}</span>
                  </div>
                  <div class="col-xl-1 col-md-1 col-sm-1 d-flex flex-column">
                    <input class="form-control group-days input-right" :class="group.errorvCardGroupRebate ? 'input-red-border' : ''" type="number" min="-100" max="100" required="required" v-model="group.vCardGroupRebate" :disabled="disabledButtonSpendFileInrecalculation" @click="($event.target as HTMLInputElement)?.select()" @input="normalizeNames()"/><span class="error text-left errors-days" v-if="group.errorvCardGroupRebate">{{ group.errorvCardGroupRebate }}</span>
                  </div>
                  <div class="col-xl-1 col-md-1 col-sm-1 d-flex flex-column checkbox-container">
                    <KendoCheckbox class="admin-checkbox" :key="keyReactive" :default-checked="group.vCardRequiresCardInfrastructure" @change="(e: any) => setCheckGroup(e, group)" :disabled="disabledButtonSpendFileInrecalculation">                   </KendoCheckbox>
                  </div>
                  <div class="col-xl-1 col-md-1 col-sm-1 d-flex align-items-center options-cols">
                    <div class="d-flex align-items-center justify-content-between">
                      <div class="d-flex align-items-center justify-content-around max-h-10 mr-2">
                        <div class="d-flex align-items-center no-wrap cursor-pointer">
                          <div class="open-options cursor-pointer" @click="disabledButtonSpendFileInrecalculation ? null : addFilterCondition(group)" :class="{'no-hover': disabledButtonSpendFileInrecalculation}">
                            <ChooseColumns></ChooseColumns>
                          </div>
                        </div>
                      </div>
                      <div class="d-flex align-items-center max-h-10 open-options cursor-pointer">
                        <iconTrash class="icons cursor-pointer icon-trash" @click="disabledButtonSpendFileInrecalculation ? null : deleteGroupConfirm(group)" :class="{'no-hover': disabledButtonSpendFileInrecalculation}"></iconTrash>
                      </div>
                    </div>
                  </div>
                </div>
                <div class="row d-flex align-items-center justify-content-end">
                  <div class="col-12 mt-1 mb-1" v-if="group.vCardGroupRules && group.vCardGroupRules.length > 0">
                    <div class="d-flex flex-row-reverse align-items-center mt-3">
                      <div class="d-flex align-items-center general-container-condition" v-for="(ruleObj, indexRule) in group['vCardGroupRules']" :key="index">
                        <div class="d-flex align-items-center level-category-container" :class="BadgeRelated.computeLevelClass(ruleObj)"><span>{{ BadgeRelated.computeLevel(ruleObj) }}</span></div>
                        <BadgeContainer :ruleObj="ruleObj" :index="indexRule" :group="group" @edit-item="(itemObj: any) => handleEditGroupCondition(itemObj, group, index, indexRule)" @remove-item="(itemObj: any, index: any) => handleRemoveCategoryItem(itemObj, index, group)"></BadgeContainer>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div class="row mb-6 mt-8">
                <div class="col-12">
                  <button class="btn outline-secondary-btn font-md" style="z-index: 1; width: fit-content" @click="addGroup" :disabled="disabledButtonSpendFileInrecalculation">           <span>+ {{ $t('home.homeCompanySettings.addGroup') }}</span></button>
                </div>
              </div>
            </div>
          </div>
          <div class="row my-4" v-if="showErrorRules">
            <div class="col-12">
              <div class="error-bar"> <span>{{ $t('home.homeCompanySettings.warnings.general') }}  </span></div>
            </div>
          </div>
          <div class="row mt-2 w-100">
            <div class="col-12 d-flex container-buttons">
              <button class="btn outline-secondary-btn font-md" v-if="!parsingGroups && !loadingData" @click="cancelChanges" style="z-index: 1; width: fit-content" :disabled="disabledButtonSpendFileInrecalculation"><span class="spinner-border spinner-border-sm mr-2" v-if="isSavingGroups" role="status" aria-hidden="true"></span><span v-if="!hasErrors || !isSavingGroups">{{ $t('global.cancel') }}</span></button>
              <button class="btn btn-primary font-md" v-if="!parsingGroups && !loadingData" @click="saveGroups" :disabled="hasErrors || disabledSaveButton || disabledButtonSpendFileInrecalculation" style="z-index: 1; width: fit-content"><span class="spinner-border spinner-border-sm mr-2" v-if="isSavingGroups" role="status" aria-hidden="true"></span><span v-if="!hasErrors || !isSavingGroups">{{ $t('global.save') }}</span></button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>
</template>

<script lang="ts">
// Types
import { VcardInfo } from "@/modules/home/types";
import { HomeCardGroupsSettings } from "./interface";

import {
  computed,
  defineComponent,
  onUnmounted,
  reactive,
  ref,
  toRefs,
  watch,
} from "vue";

import { ArrayUtils, ObjectUtils } from "@/utils";
import { onBeforeRouteLeave } from "vue-router";
import { Tooltip } from "@progress/kendo-vue-tooltip";
import { useCompany } from "@/composables";
import { useI18n } from "vue-i18n";
import { useAnalyzeStore } from '@/stores/analyze';
import { useHomeStore } from '@/stores/home';
import * as BadgeRelated from "@/utils/BadgeRelated";
import * as colorsGroups from "@/utils/ColorsGroups";
import * as formatData from "@/utils/FormatData";
import * as Routing from "@/services/router/Routing";
import AcceptanceTypesDropdowm from "@/modules/home/components/AcceptanceTypesDropdowm.vue";
import AdminMenuCompany from "@/modules/adminBackend/components/AdminMenuCompany.vue";
import BadgeContainer from "@/modules/components/badge/BadgeContainer.vue";
import CalculumAnalyzeFilter from "@/modules/components/filter/CalculumAnalyzeFilter.vue";
import { CalculumLoading } from '@ada/design-system'
import CalculumModal from "@/modules/components/CalculumModal.vue";
import CalculumTooltipIcon from "@/modules/components/CalculumTooltipIcon.vue";
import Dropdown from "@/modules/components/dropdown/Dropdown.vue";
import iconClose from "@/resources/assets/images/icons/iconClose.vue";
import iconDragDrop from "@/resources/assets/images/icons/iconDragDrop.vue";
import iconPencil from "@/resources/assets/images/icons/iconPencil.vue";
import iconPlusCircle from "@/resources/assets/images/icons/iconPlusCircle.vue";
import iconTrash from "@/resources/assets/images/icons/iconTrash.vue";
import PopupComponent from "@/modules/components/popup/PopupComponent.vue";
import router from "@/services/router";
import useSMEFeature from "@/composables/useSMEFeature";
import KendoCheckbox from "@/modules/components/checkbox/KendoCheckbox.vue";
import ChooseColumns from '@ada/design-system/assets/icons/iconCustomize.vue'
import { NumberUtils } from "@/utils";
import { useToast } from "vue-toastification";

export default defineComponent({
  name: "VCardGroupsView",
  components: {
    AcceptanceTypesDropdowm,
    AdminMenuCompany,
    BadgeContainer,
    CalculumAnalyzeFilter,
    CalculumLoading,
    CalculumModal,
    CalculumTooltipIcon,
    Dropdown,
    iconClose,
    iconDragDrop,
    iconPencil,
    iconPlusCircle,
    iconTrash,
    PopupComponent,
    Tooltip,
    KendoCheckbox,
    ChooseColumns
  },
  props: {
    otherTab: { type: String, default: null },
    showAlert: { type: Boolean },
    spendFileInrecalculation: { type: Boolean, required: false, default: false }  
  },
  emits: [
    "cancel-n-continue",
    "discard-n-continue",
    "save-n-continue",
    "send-changes",
  ],
  setup(props, { emit }) {
    const analyzeStore = useAnalyzeStore();
    const homeStore = useHomeStore();
    const translate = useI18n({ warnHtmlMessage: false, useScope: 'global' });
    const toast = useToast();
    const disabledSaveButton = ref(true);

    const { companyActiveId, updatevCardGroupsEnabled } = useCompany();
    const { featureSMEEnabled } = useSMEFeature();

    const data = reactive<HomeCardGroupsSettings>({
      availableFilters: [],
      cardGroupIndex: 0,
      vCardGroupsInfo: null,
      cardGroups: [],
      cardGroupsInitial: [],
      vCardProvider: null,
      vCardProviderInitial: null,
      cardGroupsDeleted: [],
      currentSelectedObjForDeletingObj: {
        color: "",
        vCardGroupRules: [],
      },
      currentSelectedObjForDeletingIndex: 0,
      currentSelectedCardGroup: {
        color: "",
        vCardGroupRules: [],
      },
      changingInputField: true,
      dragDropGroupIndex: 0,
      dragToSpecificIndex: 0,
      editSelectedCardGroup: {
        condition: "",
        field: "",
        multi: null,
        filterOne: null,
        filterTwo: null,
      },
      financingGroupsRules: [],
      buyerStandardNameMaxLength: 15,
      groupCardSelectIndex: 0,
      hasErrors: false,
      isEditMode: false,
      isGroupItemCurrentlyDragged: false,
      isMouseHoveringOverDragIcon: false,
      loadingBuyerStandardGroups: true,
      parsingGroups: true,
      selectedDefaultColor: 0,
      showFilter: false,
      showConfirmModal: false,
      showDeleteConfirmation: false,
      isSavingGroups: false,
      hasPaymentTermsError: false,
      hasBuyerStandardNameError: false,
      isLoadingFilters: true,
      showModal: props.showAlert,
      saveNContinue: null,
      loadingPatch: false,
      showMoreSettings: false,
      currentGroupIndex: 0,
      dropdownOptions: [],
      vCardProviderSelected: "",
      vCardsGroupsEnabled: false,
      vCardsGroupsEnabledInitial: false,
      defaultEnrollment: null,
      defaultEnrollmentInitial: null,
      defaultEnrollmentPresentation: null,

      probabilityOfSuccess: null,
      probabilityOfSuccessError: null,
      probabilityOfSuccessInitial: null,
      probabilityOfSuccessPresentation: null,

      allowTermsExtension: false,
      allowTermsExtensionInitial: false,
      defaultEnrollmentError: null,
      somethingIsChanged: true,
      showErrorRules: false,
      haveAcceptanceTypes: false,
      keyReactive: NumberUtils.getRandomInt(),
      showAceptanceTypes: false
    });
    function menuPopup(groupIndex: any) {
      return function (e: any) {
        const customMenuId = `custom-menu-options-${groupIndex}`;
        const myId = `myId-${groupIndex}`;

        if (
          e.target.closest(`#${myId}`) ||
          e.target.closest(`#${customMenuId}`)
        ) {
          return;
        }

        if (e.target.closest(`#${customMenuId}`) !== null) {
          data.showMoreSettings = true;
        }

        if (e.target.closest(`#${customMenuId}`) === null) {
          data.showMoreSettings = false;
        }
      };
    }

    const vCardProviderChanged = ref(true);
    const cardGroupsInitialChanged = ref(true);
    const defaultEnrollmentChanged = ref(true);
    const probabilityOfSuccessChanged = ref(true);
    const allowTermsExtensionChanged = ref(true);

    onUnmounted(() => {
      data.cardGroups.forEach((group) => {
        const groupIndex = group.index;
        const menuPopupHandler = menuPopup(groupIndex);
        document.body.removeEventListener("click", menuPopupHandler);
      });
    });

    const loadingData = computed(() => {
      return data.loadingBuyerStandardGroups && data.isLoadingFilters;
    });

    const disabledButtonSpendFileInrecalculation = computed(() => {
      return props.spendFileInrecalculation
    })

    function getGroups() {
      getFilterData();

      retrieveGroups();

      data.cardGroups.forEach((group) => {
        const groupIndex = group.index;
        const menuPopupHandler = menuPopup(groupIndex);
        document.body.addEventListener("click", menuPopupHandler);
      });
    }

    getGroups();
    /**
     * parse saved groups
     */

    function parseCardGroups(myData: any) {
      const parsedData: Array<any> = [];
      myData.forEach(function (config: any, index: number) {
        const newConfig = Object.assign({}, config);

        newConfig.vCardGroupAvgTermReduction = config.vCardGroupAvgTermReduction !== null
          ? Number(config.vCardGroupAvgTermReduction)
          : 0;
        newConfig.vCardGroupSupplierCardCost = config.vCardGroupSupplierCardCost !== null
          ? parseFloat((config.vCardGroupSupplierCardCost * 100).toFixed(2))
          : 2.5;
        newConfig.vCardGroupRebate = parseFloat(
          (config.vCardGroupRebate * 100).toFixed(2),
        );
        newConfig.color = getColor();
        newConfig.vCardGroupRules = config.vCardGroupRules ?? [];
        newConfig.index = index;
        newConfig.vCardGroupRules.forEach((rule: any) => {
          if (rule.field === "SPEND_VOLUME") {
            if (rule.level !== null && rule.level.length > 0) {
              if (rule.level.toLowerCase() === "spend") {
                rule.level = "spend";
              }
              if (rule.level.toLowerCase() === "provider") {
                rule.level = "supplier";
              }
              if (rule.level.toLowerCase() === "parent") {
                rule.level = "parent";
              }
            }
          }
          if (rule.field === "SME") {
            if (rule.filterOne) {
              if (rule.filterOne.operator === "isEqualTo") {
                rule.multi = ["true"];
                rule.values = ["SME"];
              } else if (rule.filterOne.operator === "isNotEqualTo") {
                rule.multi = ["false"];
                rule.values = ["Non-SME"];
              } else {
                rule.multi = ["false"];
                rule.values = ["Non-SME"];
              }
            }
            rule.filterOne = null;
          }
        });
        parsedData.push(newConfig);
      });

      data.cardGroups = ObjectUtils.cloneDeep(parsedData);
      data.cardGroupsInitial = ObjectUtils.cloneDeep(parsedData);
      data.loadingBuyerStandardGroups = false;
      setToFalse();
    }

    function setToFalse() {
      data.parsingGroups = false;
    }

    /**
     * retrieve saved group
     */
    function retrieveGroups() {
      data.parsingGroups = true;
      data.loadingBuyerStandardGroups = true;
      //Reset selected Default Color for set the group color
      data.selectedDefaultColor = 0;
      const props = {
        company: companyActiveId.value,
        callbackSuccess: (callbackSuccessData: VcardInfo) => {
          vCardProviderChanged.value = true;
          cardGroupsInitialChanged.value = true;
          defaultEnrollmentChanged.value = true;
          allowTermsExtensionChanged.value = true;

          data.loadingBuyerStandardGroups = false;
          data.parsingGroups = false;
          data.loadingPatch = false;

          data.vCardGroupsInfo = callbackSuccessData;

          data.vCardGroupsInfo.vCardMinimumProbabilityOfSuccess = callbackSuccessData.vCardMinimumProbabilityOfSuccess ?? 0

          if (data.vCardGroupsInfo) {
            /** Otions for dropdown */
            data.dropdownOptions = [];
            data.vCardGroupsInfo.vCardProviders.forEach((provider: any) => {
              data.dropdownOptions.push({
                key: provider.vCardProvider,
                value: capitalizeFirstLetter(provider.vCardProvider),
              });
            });

            /** Apply V-card, comes from global object */
            data.vCardsGroupsEnabled = ObjectUtils.cloneDeep(
              data.vCardGroupsInfo.vCardGroupsEnabled,
            );

            data.vCardsGroupsEnabledInitial = ObjectUtils.cloneDeep(
              data.vCardGroupsInfo.vCardGroupsEnabled,
            );

            /** enrollment, comes from global object */
            data.defaultEnrollment =
              data.vCardGroupsInfo.vCardDefaultEnrollment * 100;
            data.defaultEnrollmentInitial =
              data.vCardGroupsInfo.vCardDefaultEnrollment * 100;
            data.defaultEnrollmentPresentation = parseFloat(
              (data.vCardGroupsInfo.vCardDefaultEnrollment * 100).toString(),
            ).toFixed(2);

            //** probabilityOfSuccess, comes from global object */

            data.probabilityOfSuccess =
              data.vCardGroupsInfo.vCardMinimumProbabilityOfSuccess * 100;
            data.probabilityOfSuccessInitial =
              data.vCardGroupsInfo.vCardMinimumProbabilityOfSuccess * 100;
            data.probabilityOfSuccessPresentation = parseFloat(
              (data.vCardGroupsInfo.vCardMinimumProbabilityOfSuccess * 100).toString(),
            ).toFixed(2);



            /** allowTermsExtension, comes from global object */
            data.allowTermsExtension =
              data.vCardGroupsInfo.vCardAllowsTermsExtension;
            data.allowTermsExtensionInitial =
              data.vCardGroupsInfo.vCardAllowsTermsExtension;

            /** For Groups */
            parseCardGroups(data.vCardGroupsInfo.groups);
            homeStore.setVCardGroups(data?.cardGroups ?? []);

            /**
             * 1. find the selected provider
             *
             * 2. Set the selected provider
             * data.vCardProvider: contains all the object including the accpetance types and the acceptance template by provider
             *
             */

            const providerSelected = ObjectUtils.cloneDeep(
              data.vCardGroupsInfo.vCardProviders.find(
                (x: any) => x.selected === true,
              ),
            );

            setDatabyProvider(providerSelected, true);
          }
        },
        callbackError: () => {
          data.loadingBuyerStandardGroups = false;
          data.parsingGroups = false;
          data.loadingPatch = false;
          toast.error(translate.t('global.errorRetrievingData'));
        },
      };
      homeStore.getInfoVcard(props);
    }

    function selectVCardProvider(provider: any) {
      if (data.vCardGroupsInfo) {
        const providerSelected = ObjectUtils.cloneDeep(
          data.vCardGroupsInfo.vCardProviders.find(
            (x: any) => x.vCardProvider === provider,
          ),
        );
        setDatabyProvider(providerSelected);
      }
    }

    function setDatabyProvider(
      providerSelected: any,
      setInitial: boolean = false,
    ) {
      /**
       * 2. Set the selected provider
       * data.vCardProvider: contains all the object including the accpetance types and the acceptance template by provider
       */

      //* If acceptanceTypes is an empty array the values will be the acceptanceTypesTemplates
      if (ArrayUtils.isEmpty(providerSelected.acceptanceTypes)) {
        providerSelected.acceptanceTypes = ObjectUtils.cloneDeep(
          providerSelected.acceptanceTypesTemplates,
        );

        providerSelected?.acceptanceTypes.forEach((group: any) => {
          delete group.id;
        });
      }

      //* add enrollmentPresentation for the input */
      providerSelected.acceptanceTypes.forEach((group: any) => {
        group.enrollment = group.enrollment * 100;

        group.enrollmentPresentation = parseFloat(group.enrollment).toFixed(2);

        group.description = group.description.replace("Type", "Level");
      });

      providerSelected.acceptanceTypes.reverse();

      data.vCardProvider = ObjectUtils.cloneDeep(providerSelected);

      data.vCardProviderSelected = ObjectUtils.cloneDeep(
        data.vCardProvider?.vCardProvider,
      );

      // Only if the user get in in the tab
      if (setInitial) {
        data.vCardProviderInitial = ObjectUtils.cloneDeep(providerSelected);
      }
    }

    /**
     * save added buyer standard groups
     */
    function saveVCardGroups() {
      //* converts numbers to decimals
      data.vCardProvider?.acceptanceTypes.forEach((group: any) => {
        group.enrollment = group.enrollment / 100;
      });

      data.cardGroups.forEach((group: any) => {
        group.vCardGroupAvgTermReduction = Number(
          group.vCardGroupAvgTermReduction,
        );
        group.vCardGroupRebate = group.vCardGroupRebate / 100;
        group.vCardGroupSupplierCardCost =
          group.vCardGroupSupplierCardCost / 100;
        group.priority = Number(group.index + 1);
      });

      const params = {
        company: companyActiveId.value,
        vCardGroupsEnabled: data.vCardsGroupsEnabled,
        vCardProvider: data.vCardProvider?.vCardProvider,
        acceptanceTypes: data.vCardsGroupsEnabled
          ? data.vCardProvider?.acceptanceTypes
          : [],
        groupsDeleted: data.vCardsGroupsEnabled ? data.cardGroupsDeleted : [],
        groups: data.vCardsGroupsEnabled ? data.cardGroups : [],
        vCardDefaultEnrollment: data.defaultEnrollment
          ? data.defaultEnrollment / 100
          : 0,
        vCardAllowsTermsExtension: data.allowTermsExtension,
        vCardMinimumProbabilityOfSuccess: data.probabilityOfSuccess ? data.probabilityOfSuccess / 100 : 0,
        callbackSuccess: () => {
          updatevCardGroupsEnabled(data.vCardsGroupsEnabled);

          data.loadingPatch = false;

          data.isSavingGroups = false;

          emit("send-changes", false);

          retrieveGroups();

          disabledSaveButton.value = true
          data.hasErrors = true

          toast.success(translate.t('global.successfullySaved'));

          homeStore.setVCardGroups(
            data.vCardsGroupsEnabled ? data.cardGroups : [],
          );
        },
        callbackError: () => {
          data.loadingPatch = false;

          data.isSavingGroups = false;

          emit("send-changes", false);

          retrieveGroups();
          toast.error(translate.t('global.errorSavingData'));
        },
      };

      homeStore.saveVCardsValues(params);
    }



    function setCheckGroup(e: any, group: any) {
      group.vCardRequiresCardInfrastructure = e.value
      normalizeNames()
    }


    /**
     * updated the name of the group , when user updated the input or deletes the group
     *
     * @param field
     * @param indexGroup
     */
    function normalizeNames() {
      data.changingInputField = true;      
      data.selectedDefaultColor = 0;
      data.cardGroups.forEach(function (group: any, index: any) {
        group.vCardGroupCumulative =
          Number(group.vCardGroupGracePeriod) +
          Number(Number(Number(group.vCardGroupStatementCycle) / 2).toFixed(0));

        const validValues = [
          `C${index + 1}`,
          !isNaN(group.vCardGroupCumulative)
            ? `${group.vCardGroupCumulative}D`
            : null,
          !isNaN(group.vCardGroupRebate) ? `${group.vCardGroupRebate}%` : null,
          group.vCardGroupName ? group.vCardGroupName : null,
        ].filter(
          (value) => value !== null && value !== undefined && value !== "",
        );

        group.vCardName = validValues.join(", ");
        group.color = getColor();
      });
      data.keyReactive++
      // Validate input
      validateInput();
    }

    function validateInput() {
      // Reset error tracking before starting validation
      data.hasErrors = false;
      data.changingInputField = true;      

      // Iterate through all card groups and validate each
      data.cardGroups.forEach((group: any) => {
        // Validate vCardGroupName
        if (
          group.vCardGroupName === undefined ||
          group.vCardGroupName.trim() === "" ||
          group.vCardGroupName === null
        ) {
          group.errorsName = translate.t(
            "home.homeCompanySettings.invalidInput.name",
          );
          data.hasErrors = true;
        } else {
          delete group.errorsName;
        }

        // Validate vCardGroupAvgTermReduction
        if (
          group.vCardGroupAvgTermReduction === undefined ||
          group.vCardGroupAvgTermReduction === null ||
          group.vCardGroupAvgTermReduction < 0 ||
          group.vCardGroupAvgTermReduction > 365
        ) {
          group.errorvCardGroupAvgTermReduction = translate.t(
            "home.homeCompanySettings.invalidInput.days",
          );
          data.hasErrors = true;
        } else {
          delete group.errorvCardGroupAvgTermReduction;
        }

        // Validate vCardGroupSupplierCardCost
        if (
          group.vCardGroupSupplierCardCost === undefined ||
          group.vCardGroupSupplierCardCost === null ||
          group.vCardGroupSupplierCardCost > 100 ||
          group.vCardGroupSupplierCardCost < -100 ||
          typeof (group.vCardGroupSupplierCardCost) !== "number"
        ) {
          group.errorvCardsupplierCardCost = translate.t(
            "home.homeCompanySettings.invalidInput.allowNegativeValues",
          );
          data.hasErrors = true;
        } else {
          delete group.errorvCardsupplierCardCost;
        }

        // Validate vCardGroupStatementCycle
        if (
          group.vCardGroupStatementCycle === null ||
          !Number.isInteger(Number(group.vCardGroupStatementCycle)) ||
          group.vCardGroupStatementCycle <= 0 ||
          group.vCardGroupStatementCycle > 365 ||
          typeof (group.vCardGroupStatementCycle) !== "number"
        ) {
          group.errorvCardGroupStatementCycle = translate.t(
            "home.homeCompanySettings.invalidInput.days",
          );
          data.hasErrors = true;
        } else {
          group.vCardGroupStatementCycle = Number(
            group.vCardGroupStatementCycle,
          );
          delete group.errorvCardGroupStatementCycle;
        }

        // Validate vCardGroupGracePeriod
        if (
          group.vCardGroupGracePeriod === null ||
          !Number.isInteger(Number(group.vCardGroupGracePeriod)) ||
          group.vCardGroupGracePeriod <= 0 ||
          group.vCardGroupGracePeriod > 365 ||
          typeof (group.vCardGroupGracePeriod) !== "number"
        ) {
          group.errorvCardGroupGracePeriod = translate.t(
            "home.homeCompanySettings.invalidInput.days",
          );
          data.hasErrors = true;
        } else {
          group.vCardGroupGracePeriod = Number(group.vCardGroupGracePeriod);
          delete group.errorvCardGroupGracePeriod;
        }

        // Validate vCardGroupRebate
        if (
          group.vCardGroupRebate === undefined ||
          group.vCardGroupRebate === null ||
          Number(group.vCardGroupRebate) > 100 ||
          Number(group.vCardGroupRebate) < -100 ||
          typeof (group.vCardGroupRebate) !== "number"
        ) {
          group.errorvCardGroupRebate = translate.t(
            "home.homeCompanySettings.invalidInput.allowNegativeValues",
          );
          data.hasErrors = true;
        } else {
          delete group.errorvCardGroupRebate;
        }
      });

      
    }

    /**
     * removes filter category from group
     */
    function removeCategoryItem(item: any, index: any, group: any) {
      data.cardGroups.forEach(function (item: any) {
        if (item === group) {
          group.vCardGroupRules.splice(index, 1);
        }
      });
      normalizeNames();
    }

    /**
     * save groups
     */
    function saveGroups() {
      data.parsingGroups = true;
      saveVCardGroups();
    }

    /**
     * adds a new buyer group
     */
    function addGroup() {
      const newGroupIndex = data.cardGroups.length;
      data.cardGroups.push({
        vCardName: "C" + (newGroupIndex + 1),
        color: getColor(),
        vCardGroupSupplierCardCost: 2.5,
        vCardGroupAvgTermReduction: 0,
        vCardGroupRules: defaultConditions(),
        index: newGroupIndex,
        priority: Number(newGroupIndex + 1),
        vCardRequiresCardInfrastructure: false
      });
      data.changingInputField = true;
      data.hasErrors = true;
      emit("send-changes", !data.changingInputField);
    }


    function defaultConditions() {

      let extractedValues = []
      if (data.vCardProvider?.acceptanceTypes && data.vCardProvider?.acceptanceTypes.length > 0) {
        extractedValues = data.vCardProvider?.acceptanceTypes.map((item: any) => item.description)
      } else {
        return []
      }

      return [
        {
          field: "VCARD_ACCEPTANCE_TYPE",
          filterOne: null,
          filterTwo: null,
          condition: null,
          multi: extractedValues && extractedValues.length > 0 ? extractedValues : [],
          level: null,
          top: null,
          values: extractedValues && extractedValues.length > 0 ? extractedValues : [],
        },
      ];
    }

    /**delete group after confrim */
    function deleteGroup() {
      data.showDeleteConfirmation = false;
      data.cardGroups.splice(data.currentSelectedObjForDeletingIndex, 1);
      if (data.cardGroups.length <= 0) {
        data.selectedDefaultColor = 0;
      }
      normalizeNames();
      data.cardGroupsDeleted.push(data.currentSelectedObjForDeletingObj);
    }

    /**
     * delete group
     */
    function deleteGroupConfirm(group: any) {
      data.currentSelectedObjForDeletingObj = group;

      const index = data.cardGroups.indexOf(group);
      data.currentSelectedObjForDeletingIndex = index;
      //add a small delay
      setTimeout(() => {
        data.showDeleteConfirmation = true;
      }, 700);
    }

    /**
     * get bg color of added group
     */
    function getColor() {
      if (data.selectedDefaultColor < 3) {
        data.selectedDefaultColor++;
      } else {
        data.selectedDefaultColor = 0;
      }

      if (data.selectedDefaultColor === 1) {
        return colorsGroups.firstGroup;
      }
      if (data.selectedDefaultColor === 2) {
        return colorsGroups.secondGroup;
      }
      if (data.selectedDefaultColor === 3) {
        return colorsGroups.thirdGroup;
      }
      if (data.selectedDefaultColor === 0) {
        return colorsGroups.fourthGroup;
      }
    }

    /**
     * manages the toggle of filterm and edit mode
     */

    function closeFilter(isEditMode: boolean) {
      if (isEditMode === true) {
        data.isEditMode = false;
      }
      data.showFilter = false;
    }

    /**
     * shows the available filter conditions and saves it, pushes the new filter
     * conditions to a selected group
     */
    function addFilterCondition(group: any) {
      data.currentSelectedCardGroup = group;
      data.showFilter = !data.showFilter;
    }

    /**
     * saves the selected filter category to a speficic buyer group
     */
    function saveFilterSelection(mySavedObj: any) {
      data.currentSelectedCardGroup.vCardGroupRules.push({
        ...mySavedObj,
      });
      data.financingGroupsRules.push(data.currentSelectedCardGroup);
      data.showFilter = !data.showFilter;
      normalizeNames();
    }

    /***
     * edit the filter for the specific buyer group and show the filter (edit mode)
     */
    function editGroupCondition(
      currentGroupObj: any,
      group: any,
      index: number,
      buyerGroupIndex: number,
    ) {
      data.editSelectedCardGroup = currentGroupObj;
      data.cardGroupIndex = index;
      data.groupCardSelectIndex = buyerGroupIndex;
      data.isEditMode = true;
      data.showFilter = !data.showFilter;
    }

    /**
     * wrapper function to handle edit group condition with disabled check
     */
    function handleEditGroupCondition(itemObj: any, group: any, index: number, indexRule: number) {
      if (disabledButtonSpendFileInrecalculation.value) {
        return;
      }
      editGroupCondition(itemObj, group, index, indexRule);
    }

    /**
     * wrapper function to handle remove category item with disabled check
     */
    function handleRemoveCategoryItem(itemObj: any, index: any, group: any) {
      if (disabledButtonSpendFileInrecalculation.value) {
        return;
      }
      removeCategoryItem(itemObj, index, group);
    }

    /**
     * save the updated filter condition for a specific group and close the filter
     */
    function updateFilter(myObj: any) {
      data.cardGroups[data.cardGroupIndex].vCardGroupRules[
        data.groupCardSelectIndex
      ] = myObj;
      data.showFilter = false;
      data.isEditMode = false;
      normalizeNames();
    }

    /**
     * to get possible filters for each buyer standard group
     */
    function getFilterData() {
      const params = {
        spendFileVersionUUID: null,
        callbackSuccess: (callbackSuccessData: any) => {
          const customFieldPattern = ObjectUtils.customFiledPatterns();
          // go for each key, and get the array value if not empty
          // check if key is null then dont include it in the array
          Object.values(callbackSuccessData).forEach((element: any) => {
            if (element.values && element.values.length > 0) {
              if (element.title === "VCARD_ACCEPTANCE_TYPE") {
                data.haveAcceptanceTypes = true;
              }

              // Filter out key-value pairs where the key is null or undefined
              const filteredValues = element.values.filter(
                (keyPair: { key: string | number; value: string | number }) =>
                  keyPair.key !== null && keyPair.key !== undefined,
              );

              // Update the element with filtered values
              element.values = filteredValues;
            }
          });

          if (smeFeatureEnabled.value) {
            callbackSuccessData["SME"] = {
              values: [
                {
                  key: "true",
                  value: "SME",
                },
                {
                  key: "false",
                  value: "Non-SME",
                },
              ],
              type: "text",
              operators: [],
              top: [],
              levels: ["suppliers"],
            };
          } else {
            //remove it from the array
            ObjectUtils.removeKey(callbackSuccessData, "SME");
          }

          data.availableFilters = callbackSuccessData;
          Object.keys(callbackSuccessData).forEach(function (category: any) {
            if (category === "ACTIVE_PROGRAM") {
              ObjectUtils.removeKey(data.availableFilters, category);
            }
            if (customFieldPattern.test(category)) {
              if (
                callbackSuccessData[category].values &&
                callbackSuccessData[category].values.length === 0
              ) {
                ObjectUtils.removeKey(data.availableFilters, category);
              }
            }
          });
          data.isLoadingFilters = false;
        },
        callbackError: () => {
          data.isLoadingFilters = false;
          toast.error(translate.t('global.errorRetrievingData'));
        },
      };
      analyzeStore.getRuleFiltersPossibilities(params);
    }

    onBeforeRouteLeave((to) => {
      if (!data.changingInputField) {
        data.saveNContinue = to;
        data.showModal = true;
        return false;
      } else {
        return true;
      }
    });

    function discardChanges() {
      data.changingInputField = true;
      if (props.otherTab !== "") {
        emit("discard-n-continue");
      } else {
        router.push(data.saveNContinue.fullPath);
      }
    }

    function cancelAction() {
      data.showModal = false;
      emit("cancel-n-continue");
    }

    /**
     * returns the array of buyer standard groups
     */
    const cardGroupsComputed = computed(() => {
      return data.cardGroups;
    });

    /** checks if user has featureSME enabled */
    const smeFeatureEnabled = computed(() => {
      return featureSMEEnabled.value;
    });

    interface PercentageUpdate {
      value: number | null;
      presentation: string;
      error: string | null;
    }

    /** Validates a percentage input (0-100); on failure keeps the fallback presentation formatted from currentValue. */
    function computePercentageUpdate(value: any, currentValue: any): PercentageUpdate {
      const isInvalid = isNaN(value) || value === null || Number(value) < 0 || Number(value) > 100;
      if (isInvalid) {
        return {
          value: null,
          presentation: parseFloat(currentValue ? currentValue.toString() : "0").toFixed(2),
          error: translate.t("home.homeCompanySettings.invalidInput.percentage"),
        };
      }
      const numericValue = Number(value);
      return {
        value: numericValue,
        presentation: parseFloat(numericValue.toString()).toFixed(2),
        error: null,
      };
    }

    function applyDefaultEnrollmentUpdate(value: any) {
      const result = computePercentageUpdate(value, data.defaultEnrollment);
      if (result.value !== null) data.defaultEnrollment = result.value;
      data.defaultEnrollmentPresentation = result.presentation;
      data.defaultEnrollmentError = result.error;
      defaultEnrollmentChanged.value = data.defaultEnrollmentInitial === data.defaultEnrollment;
    }

    function applyProbabilityOfSuccessUpdate(value: any) {
      const result = computePercentageUpdate(value, data.probabilityOfSuccess);
      if (result.value !== null) data.probabilityOfSuccess = result.value;
      data.probabilityOfSuccessPresentation = result.presentation;
      data.probabilityOfSuccessError = result.error;
      probabilityOfSuccessChanged.value = data.probabilityOfSuccessInitial === data.probabilityOfSuccess;
    }

    function applyAcceptanceTypeEnrollmentUpdate(group: any, value: any) {
      const result = computePercentageUpdate(value, group.enrollment);
      if (result.value !== null) group.enrollment = result.value;
      group.enrollmentPresentation = result.presentation;
      if (result.error) {
        group.error = result.error;
      } else {
        delete group.error;
      }
    }

    function convertFloat(value: any, type: string) {
      if (type === "defaultEnrollment") {
        applyDefaultEnrollmentUpdate(value);
      }

      if (type === "probabilityOfSuccess") {
        applyProbabilityOfSuccessUpdate(value);
      }

      data.vCardProvider?.acceptanceTypes.forEach((group: any) => {
        if (group.acceptanceType === type) {
          applyAcceptanceTypeEnrollmentUpdate(group, value);
        }
      });
    }

    function cancelChanges() {
      data.vCardsGroupsEnabled = ObjectUtils.cloneDeep(
        data.vCardsGroupsEnabledInitial,
      );
      data.showConfirmModal = false;
      data.vCardProvider = ObjectUtils.cloneDeep(data.vCardProviderInitial);
      data.cardGroups = ObjectUtils.cloneDeep(data.cardGroupsInitial);
      data.allowTermsExtension = ObjectUtils.cloneDeep(
        data.allowTermsExtensionInitial,
      );
      data.defaultEnrollment = data.defaultEnrollmentInitial;
      data.defaultEnrollmentPresentation = parseFloat(
        (data.defaultEnrollmentInitial ?? 0 * 100).toString(),
      ).toFixed(2);

      data.probabilityOfSuccess = data.probabilityOfSuccessInitial;
      data.probabilityOfSuccessPresentation = parseFloat(
        (data.probabilityOfSuccessInitial ?? 0 * 100).toString(),
      ).toFixed(2);

      emit("send-changes", false);
    }

    function hideModalNSave() {
      data.showModal = false;
      saveGroups();
    }

    function setAllowTermsExtension() {
      if (data.allowTermsExtension !== data.allowTermsExtensionInitial) {
        allowTermsExtensionChanged.value = false;
      } else {
        allowTermsExtensionChanged.value = true;
      }
    }

    function resetEnrollment() {
      data.vCardProvider?.acceptanceTypes.forEach((group: any) => {
        const enrollmentValue =
          data.vCardProvider?.acceptanceTypesTemplates.find(
            (item: any) => item.acceptanceType === group.acceptanceType,
          )?.enrollment;
        group.enrollment = enrollmentValue ? enrollmentValue * 100 : 0;
        group.enrollmentPresentation = parseFloat(group.enrollment).toFixed(2);
      });
    }

    function toggleVCardGroups() {

      if (
        data.vCardsGroupsEnabled !== data.vCardsGroupsEnabledInitial
      ) {

        disabledSaveButton.value = false

        if (!data.vCardsGroupsEnabled) {
          data.showConfirmModal = true;
        }


      }
    }

    function continueNDisabledVcard() {
      data.showConfirmModal = false;
      data.parsingGroups = true;
      saveVCardGroups();
    }

    const screenWidth = ref(false);
    function setClassBasedOnWidth() {
      const screenW = window.innerWidth;

      if (screenW <= 1600) {
        screenWidth.value = true;
      } else {
        screenWidth.value = false;
      }
    }

    window.onload = setClassBasedOnWidth;

    window.onresize = setClassBasedOnWidth;

    function capitalizeFirstLetter(provider: string) {
      return provider.charAt(0).toUpperCase() + provider.slice(1);
    }

    /** Drag and drop fns */

    function startDrag(event: any, group: any) {
      data.isGroupItemCurrentlyDragged = true;
      event.dataTransfer.dropEffect = "move";
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("groupbuyerStandardName", group.name);
      data.dragDropGroupIndex = data.cardGroups.indexOf(group);
    }

    function onDrop(event: any, index: any) {
      data.isGroupItemCurrentlyDragged = false;
      data.dragToSpecificIndex = index;
      moveInArray(
        data.cardGroups,
        data.dragDropGroupIndex,
        data.dragToSpecificIndex,
      );

      // Update group.index values after array manipulation
      data.cardGroups.forEach((group, i) => {
        group.index = i;
      });
    }

    const moveInArray = function (arr: any, from: any, to: any) {
      const item = arr.splice(from, 1);
      arr.splice(to, 0, item[0]);
      normalizeNames();
    };

    function notHoveringOverIcon() {
      data.isMouseHoveringOverDragIcon = false;
    }

    function hoveringOverIcon() {
      data.isMouseHoveringOverDragIcon = true;
    }

    /******* WATCH SECTION **************/

    watch(
      () => props.showAlert,
      (newValue) => {
        data.showModal = newValue;
      },
      { immediate: true },
    );

    watch(
      () => disabledSaveButton.value,
      () => {
        if (!disabledSaveButton.value) {
          data.somethingIsChanged = false;
        } else {
          data.somethingIsChanged = true;
        }
      },
      { deep: true },
    );

    /** Watch to validate if any enrollment has change */
    watch(
      () => data.vCardProvider?.acceptanceTypes,
      () => {
        if (
          JSON.stringify(data.vCardProvider) !==
          JSON.stringify(data.vCardProviderInitial)
        ) {
          vCardProviderChanged.value = false;
          emit("send-changes", true);
        } else {
          vCardProviderChanged.value = true;
          emit("send-changes", false);
        }
      },
      { deep: true },
    );

    //** Watch to validate if group has change */
    watch(
      () => data.cardGroups,
      () => {
        if (
          JSON.stringify(data.cardGroups) !==
          JSON.stringify(data.cardGroupsInitial)
        ) {
          cardGroupsInitialChanged.value = false;          
          emit("send-changes", true);
        } else {
          cardGroupsInitialChanged.value = true;
          emit("send-changes", false);
        }
      },
      { deep: true },
    );

    watch(
      () => vCardProviderChanged.value,
      (newValue) => {
        if (
          !newValue ||
          !cardGroupsInitialChanged.value ||
          !defaultEnrollmentChanged.value ||
          !probabilityOfSuccessChanged.value ||
          !allowTermsExtensionChanged.value

        ) {
          disabledSaveButton.value = false;
          emit("send-changes", true);
        } else {
          disabledSaveButton.value = true;
          emit("send-changes", false);
        }
      },
    );

    watch(
      () => cardGroupsInitialChanged.value,
      (newValue) => {
        if (
          !vCardProviderChanged.value ||
          !newValue ||
          !defaultEnrollmentChanged.value ||
          !probabilityOfSuccessChanged.value ||
          !allowTermsExtensionChanged.value

        ) {
          disabledSaveButton.value = false;
          emit("send-changes", true);
        } else {
          disabledSaveButton.value = true;
          emit("send-changes", false);
        }
      },
    );

    watch(
      () => defaultEnrollmentChanged.value,
      (newValue) => {
        if (
          !vCardProviderChanged.value ||
          !cardGroupsInitialChanged.value ||
          !newValue ||
          !probabilityOfSuccessChanged.value ||
          !allowTermsExtensionChanged.value

        ) {
          emit("send-changes", true);
          disabledSaveButton.value = false;
        } else {
          emit("send-changes", false);
          disabledSaveButton.value = true;
        }
      },
    );

    watch(
      () => allowTermsExtensionChanged.value,
      (newValue) => {
        if (
          !vCardProviderChanged.value ||
          !cardGroupsInitialChanged.value ||
          !defaultEnrollmentChanged.value ||
          !probabilityOfSuccessChanged.value ||
          !newValue
        ) {
          emit("send-changes", true);
          disabledSaveButton.value = false;
        } else {
          emit("send-changes", false);
          disabledSaveButton.value = true;
        }
      },
    );

    watch(
      () => probabilityOfSuccessChanged.value,
      (newValue) => {
        if (
          !vCardProviderChanged.value ||
          !cardGroupsInitialChanged.value ||
          !defaultEnrollmentChanged.value ||
          !allowTermsExtensionChanged.value ||
          !newValue
        ) {
          emit("send-changes", true);
          disabledSaveButton.value = false;
        } else {
          emit("send-changes", false);
          disabledSaveButton.value = true;
        }
      },
    );

    /** END WATCH SECTION */
      const classDefaultEnrollmentError=computed(() => {
        return data.defaultEnrollmentError ? 'input-red-border' : '';
      });
    return {
      ...toRefs(data),
      addFilterCondition,
      addGroup,
      allowTermsExtensionChanged,
      BadgeRelated,
      cancelAction,
      cancelChanges,
      capitalizeFirstLetter,
      cardGroupsComputed,
      cardGroupsInitialChanged,
      closeFilter,
      continueNDisabledVcard,
      convertFloat,
      defaultEnrollmentChanged,
      deleteGroup,
      deleteGroupConfirm,
      disabledSaveButton,
      discardChanges,
      editGroupCondition,
      handleEditGroupCondition,
      handleRemoveCategoryItem,
      formatData,
      getFilterData,
      hideModalNSave,
      hoveringOverIcon,
      loadingData,
      normalizeNames,
      notHoveringOverIcon,
      onDrop,
      removeCategoryItem,
      resetEnrollment,
      router,
      Routing,
      saveFilterSelection,
      saveGroups,
      saveVCardGroups,
      screenWidth,
      selectVCardProvider,
      setAllowTermsExtension,
      smeFeatureEnabled,
      startDrag,
      toggleVCardGroups,
      updateFilter,
      vCardProviderChanged,
      setCheckGroup,
      classDefaultEnrollmentError,
      disabledButtonSpendFileInrecalculation
    };
  },
});
</script>

<style lang="scss" scoped>
@use "src/resources/assets/styles/variables/colors" as *;
@use "sass:map";

.card {
  &:hover {
    box-shadow: 0 1px 5px map.get($colors, "shadow");
  }
}

.max-h-10 {
  max-height: 40px;
}

.bg-color-light-gray {
  background: map.get($colors, "gray-100");
}

button.add_rule {
  border-radius: 8px;
  outline: none;
  border: none;
  width: 116px;
  height: 48px;
  font-size: 1vh;
  font-weight: 500;
  background: map.get($colors, "basewhite");

  &:hover {
    color: map.get($colors, "gray500");
    background-color: map.get($colors, "gray-modern-500");
  }

  .active {
    background: map.get($colors, "gray-modern-500");
  }
}

.icons {
  width: 20px;
  height: 20px;
}


.summary {
  color: var(--gray-600, #475467);
  font-family: "Inter var", sans-serif;
  font-size: 14px;
  font-style: normal;
  font-weight: 400;
}

.top-bar-title {
  font-size: 14px;
  font-style: normal;
  font-weight: 600;
}

@media screen and (max-width: 1440px) {
  .top-bar-title {
    font-size: 10px;
  }
}

.top-bar {
  padding: 10px 10px;
  border-radius: 0.5rem;
  border: 1px solid map.get($colors, "gray-200");
  background: map.get($colors, "gray-50");
  align-items: center;
}

.show-more-container {
  width: 200px;
}

.gap {
  gap: 2.5rem;
}

.no-wrap {
  white-space: nowrap;
}

.group-row {
  margin-bottom: 1em !important;
}

.acceptance-right-section {
  justify-content: end;
}

.input-right {
  text-align: end;
}

.center-labels {
  display: flex;
  align-items: center;
}


.checkbox-container {
  align-content: center;
  justify-content: center;
  flex-wrap: wrap;
}

.options-cols {
  justify-content: end;
}
</style>

