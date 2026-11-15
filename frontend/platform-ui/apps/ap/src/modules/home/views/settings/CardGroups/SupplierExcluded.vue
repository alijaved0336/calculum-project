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
<div class="row"> </div>
<div class="row mb-3 bg-color-light-gray top-bar">
  <div class="col-xl-2 col-md-2 col-sm-2"><span class="top-bar-title ml-2">{{ $t('global.reasonForExclusionGroup') }}</span></div>
  <div class="col-xl-2 col-md-2 col-sm-2 d-flex flex-column"><span class="top-bar-title ml-2">{{ $t('adminBackend.uiGroupsAdmin.groupName') }}</span></div>
  <div class="col-xl-6 col-md-6 col-sm-6 d-flex flex-column"><span class="top-bar-title ml-2">{{ $t('home.entityCard.companyDetails.general.description') }}</span></div>
  <div class="col-xl-1 col-md-1 col-sm-1 d-flex align-items-center"><span class="pl-1 top-bar-title">{{ '' }}    </span></div>
</div>
<div class="row group-row row-100 d-flex flex-column" v-for="(group, index) in cardGroupsComputed" :class="{ 'custom_row_hover': isMouseHoveringOverDragIcon }" :draggable="disabledButtonSpendFileInrecalculation ? false : isMouseHoveringOverDragIcon" @dragstart="startDrag($event, group)" @drop="onDrop($event, index)" @dragenter.prevent @dragover.prevent>
  <div class="row col-12 d-flex align-items-top">
    <div class="col-xl-2 col-md-2 col-sm-2">
      <div class="row d-flex align-items-center">
        <div class="col-1">
          <iconDragDrop class="icon_drag_drop mr-2" @mouseover="hoveringOverIcon" @mouseleave="notHoveringOverIcon"></iconDragDrop>
        </div>
        <div class="col">
          <button class="buttons_groups_analyze" :style="'background: ' + group.color + '; color: ' + formatData.colorText(group.color) + ';'" draggable="true">{{ group.name }}</button>
        </div>
      </div>
    </div>
    <div class="col-xl-2 col-md-2 col-sm-2 d-flex flex-column">
      <input class="form-control group-name" :class="group.errorsName ? 'input-red-border' : ''" type="text" required="required" :maxlength="buyerStandardNameMaxLength" v-model="group.groupName" @input="normalizeNames()" :placeholder="`REX${index + 1}`" :disabled="disabledButtonSpendFileInrecalculation"/><span class="error text-left errors-name" v-if="group.errorsName">{{ group.errorsName }}</span>
    </div>
    <div class="col-xl-6 col-md-6 col-sm-6 d-flex flex-column">
      <input class="form-control group-name input-left" :class="group.errorGroupDescription ? 'input-red-border' : ''" type="text" required="required" v-model="group.groupDescription" @input="normalizeNames()" :disabled="disabledButtonSpendFileInrecalculation"/><span class="error text-left errors-name" v-if="group.errorGroupDescription">{{ group.errorGroupDescription }}</span>
    </div>
    <div class="col-xl-1 col-md-1 col-sm-1 d-flex align-items-center options-cols">
      <div class="d-flex align-items-center justify-content-between">
        <div class="d-flex align-items-center justify-content-around max-h-10 mr-2">
          <div class="d-flex align-items-center no-wrap cursor-pointer">
            <div class="open-options cursor-pointer" @click="disabledButtonSpendFileInrecalculation ? null : addFilterCondition(group)">
              <ChooseColumns></ChooseColumns>
            </div>
          </div>
        </div>
        <div class="d-flex align-items-center max-h-10 open-options cursor-pointer">
          <iconTrash class="icons cursor-pointer icon-trash" @click="disabledButtonSpendFileInrecalculation ? null : deleteGroupConfirm(group)"></iconTrash>
        </div>
      </div>
    </div>
  </div>
  <div class="row d-flex align-items-center justify-content-end">
    <div class="col-12 mt-1 mb-1" v-if="group.groupRules && group.groupRules.length > 0">
      <div class="d-flex flex-row-reverse align-items-center mt-3">
        <div class="d-flex align-items-center general-container-condition" v-for="(ruleObj, indexRule) in group['groupRules']" :key="index">
          <div class="d-flex align-items-center level-category-container" :class="BadgeRelated.computeLevelClass(ruleObj)"><span>{{ BadgeRelated.computeLevel(ruleObj) }}</span></div>
          <BadgeContainer :ruleObj="ruleObj" :index="indexRule" :group="group" @edit-item="(itemObj: any) => editGroupCondition(itemObj, group, index, indexRule)" @remove-item="(itemObj: any, index: any) => removeCategoryItem(itemObj, index, group)"></BadgeContainer>
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
<div class="row my-4" v-if="showErrorRules">
  <div class="col-12">
    <div class="error-bar"> <span>{{ $t('home.homeCompanySettings.warnings.general') }}  </span></div>
  </div>
</div>
<div class="row mt-2 w-100 mb-3">
  <div class="col-12 d-flex container-buttons">
    <button class="btn outline-secondary-btn font-md" v-if="!parsingGroups && !loadingData" @click="cancelChanges" style="z-index: 1; width: fit-content" :disabled="disabledButtonSpendFileInrecalculation"><span class="spinner-border spinner-border-sm mr-2" v-if="isSavingGroups" role="status" aria-hidden="true"></span><span v-if="!hasErrors || !isSavingGroups">{{ $t('global.cancel') }}</span></button>
    <button class="btn btn-primary font-md" v-if="!parsingGroups && !loadingData" @click="saveGroups" :disabled="hasErrors || disabledSaveButton || disabledButtonSpendFileInrecalculation" style="z-index: 1; width: fit-content"><span class="spinner-border spinner-border-sm mr-2" v-if="isSavingGroups" role="status" aria-hidden="true"></span><span v-if="!hasErrors || !isSavingGroups">{{ $t('global.save') }}</span></button>
  </div>
</div>
</template>

<script lang="ts">

import {
  computed,
  defineComponent,
  onUnmounted,
  reactive,
  ref,
  toRefs,
  watch,
} from "vue";

import { ObjectUtils, NumberUtils } from "@/utils";
import { onBeforeRouteLeave } from "vue-router";
import { Tooltip } from "@progress/kendo-vue-tooltip";
import { useSpendFile } from "@/composables";
import { useI18n } from "vue-i18n";
import { useHomeStore } from '@/stores/home';
import { useAnalyzeStore } from '@/stores/analyze';
import * as BadgeRelated from "@/utils/BadgeRelated";
import * as colorsGroups from "@/utils/ColorsGroups";
import * as formatData from "@/utils/FormatData";
import * as Routing from "@/services/router/Routing";
import BadgeContainer from "@/modules/components/badge/BadgeContainer.vue";
import CalculumAnalyzeFilter from "@/modules/components/filter/CalculumAnalyzeFilter.vue";
import { CalculumLoading } from '@ada/design-system'
import CalculumModal from "@/modules/components/CalculumModal.vue";
import CalculumTooltipIcon from "@/modules/components/CalculumTooltipIcon.vue";
import iconClose from "@/resources/assets/images/icons/iconClose.vue";
import iconDragDrop from "@/resources/assets/images/icons/iconDragDrop.vue";
import iconPencil from "@/resources/assets/images/icons/iconPencil.vue";
import iconPlusCircle from "@/resources/assets/images/icons/iconPlusCircle.vue";
import iconTrash from "@/resources/assets/images/icons/iconTrash.vue";
import router from "@/services/router";
import useSMEFeature from "@/composables/useSMEFeature";
import ChooseColumns from '@ada/design-system/assets/icons/iconCustomize.vue'
import { useToast } from "vue-toastification";
// Types
import { ExcludedSuppliersInterface } from "./interface";


export default defineComponent({
  name: "SupplierExcluded",
  components: {
    BadgeContainer,
    CalculumAnalyzeFilter,
    CalculumLoading,
    CalculumModal,
    CalculumTooltipIcon,
    iconClose,
    iconDragDrop,
    iconPencil,
    iconPlusCircle,
    iconTrash,
    Tooltip,
    ChooseColumns
  },
  props: {
    otherTab: { type: String, default: null },
    showAlert: { type: Boolean },
    spendFileInrecalculation: { type: Boolean, default: false }
  },
  emits: [
    "cancel-n-continue",
    "discard-n-continue",
    "save-n-continue",
    "send-changes",
  ],
  setup(props, { emit }) {
    const homeStore = useHomeStore();
    const analyzeStore = useAnalyzeStore();
    const translate = useI18n({ warnHtmlMessage: false, useScope: 'global' });
    const toast = useToast();
    const disabledSaveButton = ref(true);

    const { featureSMEEnabled } = useSMEFeature();
    const { spendFileVersionActiveIri, spendFileVersionActiveId } = useSpendFile()

    const data = reactive<ExcludedSuppliersInterface>({
      availableFilters: [],
      cardGroupIndex: 0,
      cardGroups: [],
      cardGroupsInitial: [],
      cardGroupsDeleted: [],
      currentSelectedObjForDeletingObj: {
        color: "",
        groupRules: [],
      },
      currentSelectedObjForDeletingIndex: 0,
      currentSelectedCardGroup: {
        color: "",
        groupRules: [],
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

    function normalizeSpendVolumeRule(rule: any): void {
      if (rule.field !== "SPEND_VOLUME") return;
      if (rule.level === null || rule.level.length === 0) return;
      const level = rule.level.toLowerCase();
      if (level === "spend") rule.level = "spend";
      if (level === "provider") rule.level = "supplier";
      if (level === "parent") rule.level = "parent";
    }

    function normalizeSmeRule(rule: any): void {
      if (rule.field !== "SME") return;
      if (rule.filterOne) {
        if (rule.filterOne.operator === "isEqualTo") {
          rule.multi = ["true"];
          rule.values = ["SME"];
        } else {
          rule.multi = ["false"];
          rule.values = ["Non-SME"];
        }
      }
      rule.filterOne = null;
    }

    function normalizeGroupRule(rule: any): void {
      normalizeSpendVolumeRule(rule);
      normalizeSmeRule(rule);
    }

    function buildParsedCardGroup(config: any, index: number): any {
      const newConfig = Object.assign({}, config);
      newConfig.color = getColor();
      newConfig.groupRules = config.groupRules ?? [];
      newConfig.index = index;
      newConfig.groupRules.forEach(normalizeGroupRule);
      return newConfig;
    }

    function parseCardGroups(myData: any) {
      const parsedData: Array<any> = myData.map((config: any, index: number) =>
        buildParsedCardGroup(config, index)
      );

      data.cardGroups = ObjectUtils.cloneDeep(parsedData);
      data.cardGroupsInitial = ObjectUtils.cloneDeep(parsedData);
      data.loadingBuyerStandardGroups = false;
      setToFalse();
      normalizeNames()
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
        spendfileUUID: spendFileVersionActiveIri.value,
        callbackSuccess: (callbackSuccessData: any) => {
          //- To reset values
          data.cardGroups = []
          data.cardGroupsInitial = ObjectUtils.cloneDeep(data.cardGroups);


          data.loadingBuyerStandardGroups = false;
          data.parsingGroups = false;
          data.loadingPatch = false;

          //- to assign
          data.cardGroups = callbackSuccessData
          parseCardGroups(data.cardGroups);
          disabledSaveButton.value = true
          data.hasErrors = true

        },
        callbackError: () => {
          data.loadingBuyerStandardGroups = false;
          data.parsingGroups = false;
          data.loadingPatch = false;
        },
      };
      homeStore.getInfoExcludedGroups(props);
    }



    /**
     * save added buyer standard groups
     */
    function saveCardGroups() {
      data.cardGroups.forEach((group: any) => {
        group.priority = Number(group.index + 1);
      });

      const params = {
        spendfileUUID: spendFileVersionActiveIri.value,
        groupsDeleted: data.cardGroupsDeleted,
        groups: data.cardGroups,
        callbackSuccess: () => {

          data.loadingPatch = false;
          data.isSavingGroups = false;
          emit("send-changes", false);
          retrieveGroups();
          disabledSaveButton.value = true
          data.hasErrors = true
          data.cardGroupsDeleted = []

          toast.success(translate.t(
            "adminBackend.adminClusters.noty.success.successfullySaved"
          ));


        },
        callbackError: () => {
          data.loadingPatch = false;

          data.isSavingGroups = false;

          emit("send-changes", false);

          retrieveGroups();
        },
      };

      homeStore.postInfoExcludedGroups(params);
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
      emit("send-changes", !data.changingInputField);
      data.selectedDefaultColor = 0;
      data.cardGroups.forEach(function (group: any, index: any) {


        const validValues = [
          `REX${index + 1}`,
          group.groupName ? group.groupName : null,
        ].filter(
          (value) => value !== null && value !== undefined && value !== "",
        );

        group.name = validValues.join(", ");
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
      emit("send-changes", !data.changingInputField);

      // Iterate through all card groups and validate each
      data.cardGroups.forEach((group: any) => {

        if (
          group.groupName === undefined ||
          group.groupName.trim() === "" ||
          group.groupName === null
        ) {
          group.errorsName = translate.t(
            "home.homeCompanySettings.invalidInput.name",
          );
          data.hasErrors = true;
        } else {
          delete group.errorsName;
        }

        if (
          group.groupDescription === undefined ||
          group.groupDescription.trim() === "" ||
          group.groupDescription === null
        ) {
          group.errorGroupDescription = translate.t(
            "home.homeCompanySettings.invalidInput.description",
          );
          data.hasErrors = true;
        } else {
          delete group.errorGroupDescription;
        }


      });

      // Check if all groups have rules
      const allHaveRules = data.cardGroups.every(
        (group: any) => group.groupRules.length > 0,
      );

      if (allHaveRules) {
        data.showErrorRules = false;
        disabledSaveButton.value = false
      } else {
        data.hasErrors = true;
        data.showErrorRules = true;
        disabledSaveButton.value = true
      }
    }

    /**
     * removes filter category from group
     */
    function removeCategoryItem(item: any, index: any, group: any) {
      if (disabledButtonSpendFileInrecalculation.value) {
        return;
      }

      data.cardGroups.forEach(function (item: any) {
        if (item === group) {
          group.groupRules.splice(index, 1);
        }
      });
      normalizeNames();
    }

    /**
     * save groups
     */
    function saveGroups() {
      data.parsingGroups = true;
      saveCardGroups();
    }

    /**
     * adds a new buyer group
     */
    function addGroup() {
      const newGroupIndex = data.cardGroups.length;
      data.cardGroups.push({
        name: "REX" + (newGroupIndex + 1),
        groupName: "",
        groupDescription: "",
        color: getColor(),
        groupRules: [],
        index: newGroupIndex,
        priority: Number(newGroupIndex + 1),
      });
      data.changingInputField = true;
      data.hasErrors = true;
      emit("send-changes", !data.changingInputField);
    }


    function defaultConditions() {


      return [
        {
          field: "VCARD_ACCEPTANCE_TYPE",
          filterOne: null,
          filterTwo: null,
          condition: null,
          multi: [],
          level: null,
          top: null,
          values: [],
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
      data.currentSelectedCardGroup.groupRules.push({
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

      if (disabledButtonSpendFileInrecalculation.value) {
        return;
      }

      data.editSelectedCardGroup = currentGroupObj;
      data.cardGroupIndex = index;
      data.groupCardSelectIndex = buyerGroupIndex;
      data.isEditMode = true;
      data.showFilter = !data.showFilter;
    }

    /**
     * save the updated filter condition for a specific group and close the filter
     */
    function updateFilter(myObj: any) {
      data.cardGroups[data.cardGroupIndex].groupRules[
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
        spendFileVersionUUID: spendFileVersionActiveId.value,
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

          if (featureSMEEnabled.value) {
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


    function cancelChanges() {

      data.showConfirmModal = false;
      data.cardGroups = ObjectUtils.cloneDeep(data.cardGroupsInitial);
      normalizeNames()
      disabledSaveButton.value = true


      emit("send-changes", false);
    }

    function hideModalNSave() {
      data.showModal = false;
      saveGroups();
    }



    function continueNDisabledVcard() {
      data.showConfirmModal = false;
      data.parsingGroups = true;
      saveCardGroups();
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

    // watch(
    //   () => disabledSaveButton.value,
    //   () => {
    //     if (!disabledSaveButton.value) {
    //       data.somethingIsChanged = false;
    //     } else {
    //       data.somethingIsChanged = true;
    //     }
    //   },
    //   { deep: true },
    // );

    const disabledButtonSpendFileInrecalculation = computed(() => {
        return props.spendFileInrecalculation
    })


    /** END WATCH SECTION */

    return {
      ...toRefs(data),
      addFilterCondition,
      addGroup,
      BadgeRelated,
      cancelAction,
      cancelChanges,
      capitalizeFirstLetter,
      cardGroupsComputed,
      closeFilter,
      continueNDisabledVcard,
      deleteGroup,
      deleteGroupConfirm,
      disabledSaveButton,
      discardChanges,
      editGroupCondition,
      formatData,
      getFilterData,
      hideModalNSave,
      hoveringOverIcon,
      loadingData,
      normalizeNames,
      notHoveringOverIcon,
      onDrop,
      removeCategoryItem,
      router,
      Routing,
      saveFilterSelection,
      saveGroups,
      saveCardGroups,
      screenWidth,
      smeFeatureEnabled,
      startDrag,
      updateFilter,
      setCheckGroup,
      disabledButtonSpendFileInrecalculation
    };
  },
});
</script>

<style lang="scss" scoped>
@use "src/resources/assets/styles/variables/colors" as *;

.card {
  &:hover {
    box-shadow: 0 1px 5px $shadow;
  }
}

.max-h-10 {
  max-height: 40px;
}

.bg-color-light-gray {
  background: $color-gray-100;
}

button.add_rule {
  border-radius: 8px;
  outline: none;
  border: none;
  width: 116px;
  height: 48px;
  font-size: 1vh;
  font-weight: 500;
  background: $basewhite;

  &:hover {
    color: $gray500;
    background-color: $gray-modern-500;
  }

  .active {
    background: $gray-modern-500;
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
  border: 1px solid $color-gray-200;
  background: $color-gray-50;
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