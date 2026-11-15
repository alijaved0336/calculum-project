<template>
<CalculumLoading v-if="loadingPatch" :modal="true"> </CalculumLoading>
<CalculumModal v-if="showModal" @close="cancelAction" :size="'lg'" :showClose="true" :title="$t('home.homePreference.confirm')">
  <template v-slot:modalContent>
    <p>{{ $t('home.homePreference.unsavedChanges') }}</p>
  </template>
  <template v-slot:modalButtons>
    <button class="btn outline-secondary-btn font-md" style="z-index: 1; width: fit-content" @click="cancelAction">           <span>{{ $t('global.cancel') }}</span></button>
    <button class="btn outline-secondary-btn font-md" style="z-index: 1; width: fit-content" @click="discardChanges">           <span>{{ $t('global.discard') }}    </span></button>
    <button class="btn btn-primary font-md" style="z-index: 1; width: fit-content" @click="showModal = false, showConfirmModal = true"><span>{{ $t('global.save') }}</span></button>
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
<CalculumModal :size="'lg'" :showClose="true" :title="$t('home.homeCompanySettings.confirmBuyerGroupsTitle')" @close="showConfirmModal = !showConfirmModal" v-if="showConfirmModal">
  <template v-slot:modalContent>
    <p class="modal_msg">{{ $t('home.homeCompanySettings.confirmBuyerGroupsText') }}</p>
  </template>
  <template v-slot:modalButtons>
    <button class="btn outline-secondary-btn font-md" @click="showConfirmModal = !showConfirmModal" style="z-index: 1; width: fit-content"> <span>{{ $t('global.cancel') }}</span></button>
    <button class="btn btn-primary font-md" @click="saveBuyerStandardGroups" style="z-index: 1; width: fit-content;"> <span>{{ $t('global.continue') }}  </span></button>
  </template>
</CalculumModal>
<div style="margin-top: 60px;" v-if="router.currentRoute.value.name === Routing.admin.adminCompanyInfo"></div>
<CalculumAnalyzeFilter v-if="showFilter" @close="closeFilter" @saveChosenConditionFilter="saveFilterSelection" @updateChosenConditionFilter="updateFilter" :availableFilters="availableFilters" :editFilterObj="editSelectedBuyerStandardGroup" :filter-title="'Condition Settings'" :isEditMode="isEditMode">     </CalculumAnalyzeFilter>
<CalculumLoading v-if="parsingGroups || isLoadingFilters" :modal="true"></CalculumLoading>
<div class="row" v-else>
  <div class="col">
    <div class="card auto-height" style="height: auto;">
      <div class="card-body">
        <div class="row custom_height">
          <div class="col d-flex flex-column" v-if="!parsingGroups && !isLoadingFilters"><span class="text-gray-600 text-base font-semibold mb-4"> {{ $t('home.homeCompanySettings.buyerStandardGroup') }}
              <CalculumTooltipIcon :advancedTooltipClass="true" :uniqueIdentifier="'popover-setup-buyergroup'" :keyPopOver="'setupBuyerGroup'"></CalculumTooltipIcon></span>
            <p class="text-base mb-4">{{ $t('home.homeCompanySettings.buyerStandardGroupText') }}</p>
            <div class="row align-items-center justify-content-around mb-3 bg-color-light-gray top-bar">
              <div class="col-4 d-flex align-items-center justify-content-center"> <span class="top-bar-title">{{ $t('home.homeCompanySettings.buyerStandardGroup') }}</span></div>
              <div class="col-2"> <span class="top-bar-title">{{ $t('home.homeCompanySettings.groupName') }}</span></div>
              <div class="col-2" id="terms-without-cash-discount"> <span class="pl-1 top-bar-title">{{ $t('global.paymentTermsD') }}   </span></div>
              <div class="col-1"> </div>
              <div class="col-1"></div>
              <div class="col-1"></div>
            </div>
            <div class="row mb-5 group-row d-flex align-items-center" v-for="(group, BuyerStandardGroupIndex) in buyerStandardGroupsComputed" :class="{ 'custom_row_hover': isMouseHoveringOverDragIcon }" :draggable="isMouseHoveringOverDragIcon" @dragstart="startDrag($event, group)" @drop="onDrop($event, BuyerStandardGroupIndex)" @dragenter.prevent @dragover.prevent>
              <div class="col-4 d-flex align-items-center">
                <div class="col-1">
                  <iconDragDrop class="icon_drag_drop mr-2" @mouseover="hoveringOverIcon" @mouseleave="notHoveringOverIcon"></iconDragDrop>
                </div>
                <div class="col">
                  <button class="buttons_groups_analyze" :style="'background: ' + group.color + '; color: ' + formatData.colorText(group.color) + ';'" draggable="true">{{ group.name }}</button>
                </div>
              </div>
              <div class="col-2 d-flex flex-column">
                <input class="form-control group-name" :class="group.errorsName ? 'input-red-border' : ''" type="text" required="required" :maxlength="buyerStandardNameMaxLength" v-model="group.buyerStandardName" :placeholder="`Group Name ${BuyerStandardGroupIndex}`" :disabled="disabledButtonSpendFileInrecalculation" @input="normalizeNames('buyerStandardName', BuyerStandardGroupIndex)"/><span class="error text-left errors-name" v-if="group.errorsName">{{ group.errorsName }}</span>
              </div>
              <div class="col-2 d-flex flex-column">
                <input class="form-control group-days" :class="group.errorsDays ? 'input-red-border' : ''" type="number" min="1" max="360" required="required" v-model="group.paymentTerms" :disabled="disabledButtonSpendFileInrecalculation" @input="normalizeNames('paymentTerms', BuyerStandardGroupIndex)"/><span class="error text-left errors-days" v-if="group.errorsDays">{{ group.errorsDays }}</span>
              </div>
              <div class="col d-flex align-items-center">
                <div class="d-flex align-items-center justify-content-between gap">
                  <div class="d-flex flex-column justify-content-center">
                    <div class="div" :id="`custom-menu-options-${group.index}`">
                      <PopupComponent :groupIndex="group.index" :levels="buyerStandardBehaviorLevels" :title="$t('global.behavior')" @change-behavior-level="changeBehaviorLevel" :levelSelected="group.buyerStandardGroupBehavior"></PopupComponent>
                    </div>
                    <div class="d-flex align-items-center no-wrap"><span class="text-sm font-medium text-gray-500">{{ $t('global.behavior') }} :</span><span class="ml-2 text-sm font-medium text-gray-700">{{ getTranslatedValue(group.buyerStandardGroupBehavior) }}</span></div>
                  </div>
                  <div class="d-flex align-items-center justify-content-around max-h-10">
                    <div class="d-flex align-items-center no-wrap mr-2">
                      <div class="open-options cursor-pointer button add_rule" @click="disabledButtonSpendFileInrecalculation ? null : addFilterCondition(group)" :class="{'no-hover': disabledButtonSpendFileInrecalculation}">
                        <ChooseColumns></ChooseColumns>
                      </div>
                    </div>
                    <div class="d-flex align-items-center max-h-10 open-options cursor-pointer">
                      <iconTrash class="icons cursor-pointer icon-trash" @click="disabledButtonSpendFileInrecalculation ? null : deleteGroupConfirm(group)" :class="{'no-hover': disabledButtonSpendFileInrecalculation}"></iconTrash>
                    </div>
                  </div>
                </div>
              </div>
              <div class="col-12 mt-1 mb-1" v-if="group.buyerStandardRules && group.buyerStandardRules.length > 0">
                <div class="d-flex flex-row-reverse align-items-center mt-3">
                  <div class="d-flex align-items-center general-container-condition" v-for="(ruleObj, index) in group['buyerStandardRules']" :key="index">
                    <div class="d-flex align-items-center level-category-container" :class="BadgeRelated.computeLevelClass(ruleObj)"><span>{{ BadgeRelated.computeLevel(ruleObj) }}</span></div>
                    <BadgeContainer :class="{'no-hover': disabledButtonSpendFileInrecalculation}" :ruleObj="ruleObj" :index="index" @edit-item="(itemObj: any) => editGroupCondition(itemObj, group, index, BuyerStandardGroupIndex)" @remove-item="(itemObj: any, index: any) => removeCategoryItem(itemObj, index, group)"></BadgeContainer>
                  </div>
                </div>
              </div>
            </div>
            <div class="row mt-2 w-100">
              <div class="col-12 d-flex">
                <button class="btn outline-secondary-btn font-md" style="z-index: 1; width: fit-content" @click="addGroup" :disabled="disabledButtonSpendFileInrecalculation">           <span>+ {{ $t('home.homeCompanySettings.addGroup') }}  </span></button>
              </div>
            </div>
          </div>
        </div>
        <div class="row my-4" v-if="hasErrors">
          <div class="col-12">
            <div class="error-bar"> <span>{{ $t('home.homeCompanySettings.warnings.general') }}    </span></div>
          </div>
        </div>
        <div class="row mt-2">
          <div class="col-12 d-flex container-buttons">
            <button class="btn btn-primary font-md" v-if="!parsingGroups && !loadingData" @click="saveGroups" :disabled="hasErrors || changingInputField || isSavingGroups || disabledButtonSpendFileInrecalculation" style="z-index: 1; width: fit-content"><span class="spinner-border spinner-border-sm mr-2" v-if="isSavingGroups" role="status" aria-hidden="true"></span><span v-if="!hasErrors || !isSavingGroups">{{ $t('global.save') }}</span></button>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>
</template>

<script lang="ts">
import {
  defineComponent,
  reactive,
  toRefs,
  computed,
  onMounted,
  watch,
  onUnmounted
} from "vue";
import { Tooltip } from "@progress/kendo-vue-tooltip";
import { useI18n } from "vue-i18n";
import { useHomeStore } from '@/stores/home';

import * as BadgeRelated from "@/utils/BadgeRelated";
import * as colorsGroups from "@/utils/ColorsGroups";
import * as formatData from "@/utils/FormatData";
import * as Routing from "@/services/router/Routing";
import AdminMenuCompany from "@/modules/adminBackend/components/AdminMenuCompany.vue";
import CalculumAnalyzeFilter from "@/modules/components/filter/CalculumAnalyzeFilter.vue";
import { CalculumLoading } from '@ada/design-system'
import CalculumModal from "@/modules/components/CalculumModal.vue";
import iconClose from "@/resources/assets/images/icons/iconClose.vue";
import iconDragDrop from "@/resources/assets/images/icons/iconDragDrop.vue";
import iconPencil from "@/resources/assets/images/icons/iconPencil.vue";
import iconPlusCircle from "@/resources/assets/images/icons/iconPlusCircle.vue";
import iconTrash from "@/resources/assets/images/icons/iconTrash.vue";
import { ObjectUtils, removeIRI } from "@/utils";
import { HomeBuyerStandardSettings } from "../../types";
import { onBeforeRouteLeave } from "vue-router";
import router from "@/services/router";
import CalculumTooltipIcon from "@/modules/components/CalculumTooltipIcon.vue";
import PopupComponent from "@/modules/components/popup/PopupComponent.vue";
import { useCompany, useUser } from "@/composables";
import BadgeContainer from "@/modules/components/badge/BadgeContainer.vue";
import useSMEFeature from "@/composables/useSMEFeature";
import { useAnalyzeStore } from '@/stores/analyze';
import ChooseColumns from '@ada/design-system/assets/icons/iconCustomize.vue'
import { useToast } from "vue-toastification";

export default defineComponent({
  name: "BuyerStandard",
  components: {
    AdminMenuCompany,
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
    PopupComponent,
    Tooltip,
    ChooseColumns
  },
  props: {
    showAlert: { type: Boolean },
    otherTab: { type: String, default: null },
    spendFileInrecalculation: { type: Boolean, default: false }
  },
  emits: [
    "send-changes",
    "save-n-continue",
    "discard-n-continue",
    "cancel-n-continue"
  ],
  setup(props, { emit }) {
    const homeStore = useHomeStore();
    const analyzeStore = useAnalyzeStore();
    const translate = useI18n({ warnHtmlMessage: false, useScope: 'global' });
    const toast = useToast();

    const { featureSMEEnabled } = useSMEFeature();
    const { useFeatureVirtualCard } = useUser();
    const { companyActiveId } = useCompany();

    const data = reactive<HomeBuyerStandardSettings>({
      availableFilters: [],
      buyerStandardGroupIndex: 0,
      buyerStandardGroups: [],
      buyerStandardGroupsDeleted: [],
      currentSelectedObjForDeletingObj: {
        color: "",
        paymentTerms: 0,
        buyerStandardName: "",
        name: "",
        buyerStandardRules: []
      },
      currentSelectedObjForDeletingIndex: 0,
      currentSelectedBuyerStandardGroup: {
        color: "",
        paymentTerms: 0,
        buyerStandardName: "",
        name: "",
        buyerStandardRules: []
      },
      changingInputField: true,
      dragDropGroupIndex: 0,
      dragToSpecificIndex: 0,
      editSelectedBuyerStandardGroup: {
        condition: "",
        field: "",
        multi: null,
        filterOne: null,
        filterTwo: null
      },
      financingGroupsRules: [],
      buyerStandardNameMaxLength: 15,
      groupBuyerStandardIndex: 0,
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
      currentGroupIndex: 0
    });


    /** checks if user has featureSME enabled */
    const smeFeatureEnabled = computed(() => {
      return featureSMEEnabled.value
    })

    const disabledButtonSpendFileInrecalculation = computed(() => {
      return props.spendFileInrecalculation
    })

    /**
     * levels for the PopupComponent
     */
    const buyerStandardBehaviorLevels = computed(() => {
      return [
        { key: "low limit", value: translate.t("global.limits.lowLimit") },
        { key: "high limit", value: translate.t("global.limits.highLimit") },
        {
          key: "only reference",
          value: translate.t("global.limits.onlyReference")
        },
        { key: "exact number", value: translate.t("global.limits.exactNumber") }
      ];
    });

    function getTranslatedValue(limitLevel: string): string {
      let found = buyerStandardBehaviorLevels.value.find(
        level => level.key === limitLevel
      );
      if (found) {
        return found.value;
      } else {
        return limitLevel;
      }
    }

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

    onMounted(() => {
      getGroups();
    });

    onUnmounted(() => {
      data.buyerStandardGroups.forEach(group => {
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
      data.buyerStandardGroups.forEach(group => {
        const groupIndex = group.index;
        const menuPopupHandler = menuPopup(groupIndex);
        document.body.addEventListener("click", menuPopupHandler);
      });
    }

    /**
     * parse saved groups
     */

    function parseBuyerStandardGroups(myData: any) {
      data.parsingGroups = true;
      const parsedData: Array<any> = [];
      myData.forEach(function (config: any, index: number) {
        const newConfig = Object.assign({}, config);
        newConfig["@id"] = removeIRI(config["@id"]);
        newConfig.name = config.name ?? "";
        newConfig.buyerStandardName = config.buyerStandardName ?? "";
        newConfig.paymentTerms = config.paymentTerms ?? 0;
        newConfig.buyerStandardGroupBehavior =
          config.buyerStandardGroupBehavior ?? "low limit";
        newConfig.color = getColor();
        newConfig.buyerStandardRules = config.buyerStandardRules ?? [];
        newConfig.index = index;

        // Helper functions to reduce cognitive complexity
        const normalizeSpendVolumeLevel = (rule: any): void => {
          if (rule.field === "SPEND_VOLUME" && rule.level !== null && rule.level.length > 0) {
            const level = rule.level.toLowerCase();
            if (level === "spend") {
              rule.level = "spend";
            } else if (level === "provider") {
              rule.level = "supplier";
            } else if (level === "parent") {
              rule.level = "parent";
            }
          }
        };

        const processSMERule = (rule: any): void => {
          if (rule.field === "SME" && rule.filterOne) {
            if (rule.filterOne.operator === "isEqualTo") {
              rule.multi = ["true"];
              rule.values = ["SME"];
            } else {
              rule.multi = ["false"];
              rule.values = ["Non-SME"];
            }
            rule.filterOne = null;
          }
        };

        newConfig.buyerStandardRules.forEach((rule: any) => {
          normalizeSpendVolumeLevel(rule);
          processSMERule(rule);
        });

        parsedData.push(newConfig);
      });

      data.buyerStandardGroups = parsedData;

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
      data.loadingBuyerStandardGroups = true;
      //Reset selected Default Color for set the group color
      data.selectedDefaultColor = 0;
      const props = {
        companyUUID: companyActiveId.value,
        callbackSuccess: (callbackSuccessData: any) => {          
          //Assign values from response
          data.buyerStandardGroups = callbackSuccessData;
          /** sort the array bu the priority value */
          data.buyerStandardGroups.sort(
            (a: any, b: any) => a?.priority - b?.priority
          );

          //buyerStandardRules
          parseBuyerStandardGroups(data.buyerStandardGroups);
        },
        callbackError: () => {
          data.loadingBuyerStandardGroups = false;
          data.parsingGroups = false;
          toast.error(translate.t('global.errorLoadingSettings'));
        }
      };
      homeStore.getBuyerStandardGroups(props);
    }

    /**
     * save added buyer standard groups
     */
    function saveBuyerStandardGroups() {
      data.isSavingGroups = true;

      data.showConfirmModal = false;
      data.loadingPatch = true;
      const params = {
        companyUUID: companyActiveId.value,
        groups: data.buyerStandardGroups,
        deletedGroups: data.buyerStandardGroupsDeleted,
        callbackSuccess: () => {
          data.loadingPatch = false;
          toast.success(translate.t('global.setupBuyerStandarSuccessMsg'));

          data.isSavingGroups = false;
          data.buyerStandardGroupsDeleted = [];
          data.changingInputField = true;
          emit("send-changes", false);
          data.buyerStandardGroups.forEach(group => {
            const groupIndex = group.index;
            const menuPopupHandler = menuPopup(groupIndex);
            document.body.addEventListener("click", menuPopupHandler);
          });

          if (data.saveNContinue !== null) {
            router.push(data.saveNContinue.fullPath);
          }

          if (props.otherTab !== "") {
            emit("save-n-continue");
          }
        },
        callbackError: () => {
          data.loadingPatch = false;
          emit("send-changes", false);
          toast.error(translate.t("home.homeCompanySettings.warnings.savedGroups"));

          data.isSavingGroups = false;
        }
      };
      homeStore.saveBuyerStandardGroups(params);
    }

    /**
     * updated the name of the group , when user updated the input or deletes the group
     *
     * @param field
     * @param indexGroup
     */
    function normalizeNames(field: string | null, indexGroup: number | null) {
      data.changingInputField = true;
      emit("send-changes", !data.changingInputField);
      data.selectedDefaultColor = 0;
      data.buyerStandardGroups.forEach(function (group, index) {
        const name = group.buyerStandardName ? group.buyerStandardName : "";
        const paymentTerms = group.paymentTerms ? group.paymentTerms : 0;
        if (field === "paymentTerms" && index === indexGroup) {
          if (
            group.paymentTerms === null ||
            group.paymentTerms === undefined ||
            group.paymentTerms === 0
          ) {
            group.name = "BSG" + (index + 1) + ", 0D" + ", " + name;
          } else {
            group.name =
              "BSG" + (index + 1) + ", " + group.paymentTerms + "D," + name;
          }
        }
        if (field === "buyerStandardName" && index === indexGroup) {
          if (
            group.buyerStandardName === null ||
            group.buyerStandardName === undefined ||
            group.buyerStandardName === ""
          ) {
            group.name = "BSG" + (index + 1) + +`, ${paymentTerms}D, ` + name;
          } else {
            group.name = "BSG" + (index + 1) + `, ${paymentTerms}D, ` + name;
          }
        } else {
          let daysVal = group.paymentTerms ? group.paymentTerms : 0;
          group.name = "BSG" + (index + 1) + `, ${daysVal}D, ` + name;
        }

        group.color = getColor();
      });

      // Validate input
      validateInput();
    }

    function validateInput() {
      data.hasErrors = true;
      data.changingInputField = true;
      emit("send-changes", !data.changingInputField);

      data.buyerStandardGroups.forEach((group: any) => {
        /**if paymentTerms is not a number or buyerStandardName is null */

        if (
          group.paymentTerms === null ||
          !isNaN(group.paymentTerms) ||
          !Number.isInteger(Number(group.paymentTerms)) ||
          Number(group.paymentTerms) < 0 ||
          Number(group.paymentTerms) > 365
        ) {
          group.errorsDays = translate.t(
            "home.homeCompanySettings.invalidInput.days0to365"
          );
          data.hasErrors = true;
        }

        /**if name is null or empty */
        if (
          group.buyerStandardName === undefined ||
          group.buyerStandardName.trim() === "" ||
          group.buyerStandardName === null ||
          group.buyerStandardName === ""
        ) {
          group.errorsName = translate.t(
            "home.homeCompanySettings.invalidInput.name"
          );
          data.hasErrors = true;
        }

        if (
          group.buyerStandardName !== null &&
          group.buyerStandardName.length >= 1
        ) {
          delete group.errorsName;
        }

        if (Number.isInteger(Number(group.paymentTerms))) {
          if (
            Number(group.paymentTerms) >= 0 &&
            Number(group.paymentTerms) <= 365
          ) {
            delete group.errorsDays;
          }
        }

        /**if name is not null and has at least one character and paymentTerms are equal or greated than 0 and less than 365 */
        if (
          group.buyerStandardName.trim().length >= 1 &&
          Number.isInteger(Number(group.paymentTerms)) &&
          Number(group.paymentTerms) >= 0 &&
          Number(group.paymentTerms) < 365
        ) {
          delete group.errorsDays;
          delete group.errorsName;
          data.hasErrors = false;
          data.changingInputField = false;
          emit("send-changes", !data.changingInputField);
        }
      });
      data.hasErrors = data.buyerStandardGroups.some(group => {
        return group.errorsName || group.errorsDays;
      });
    }

    /**
     * removes filter category from group
     */
    function removeCategoryItem(item: any, index: any, group: any) {

      if (disabledButtonSpendFileInrecalculation.value) {
        return;
      }

      data.buyerStandardGroups.forEach(function (item: any) {
        if (item === group) {
          group.buyerStandardRules.splice(index, 1);
        }
      });
    }

    /**
     * searches group name, if founds the group name
     * the count stops, otherwise ++
     */
    function searchGroupName(tempGroupValue: number) {
      const tempGroupName = "BSG" + tempGroupValue;
      let result = true;
      data.buyerStandardGroups.forEach(function (groupData) {
        if (groupData.name.substr(0, tempGroupName.length) === tempGroupName) {
          result = false;
        }
      });
      return result;
    }

    /**
     * validate fields for name and paymentTerms input
     * if no errors, show the confirm modal
     *
     * if errors, each group has a new property
     * added errorsName and erorrsDays
     */
    function validateFields() {
      //data.hasErrors = true
      data.buyerStandardGroups.forEach(group => {
        /**if paymentTerms is not a number or buyerStandardName is null */

        /**checks if paymentTerms converted to Number is less or equals to zero or greater  or equal to 365 */
        if (
          group.paymentTerms === null ||
          !isNaN(group.paymentTerms) ||
          !Number.isInteger(Number(group.paymentTerms)) ||
          Number(group.paymentTerms) < 0 ||
          Number(group.paymentTerms) > 365
        ) {
          group.errorsDays = translate.t(
            "home.homeCompanySettings.invalidInput.days0to365"
          );
          data.hasErrors = true;
        }

        /**if name is null or empty */
        if (
          group.buyerStandardName === undefined ||
          group.buyerStandardName.trim() === "" ||
          group.buyerStandardName === null ||
          group.buyerStandardName === ""
        ) {
          group.errorsName = translate.t(
            "home.homeCompanySettings.invalidInput.name"
          );
          data.hasErrors = true;
        }

        if (
          group.buyerStandardName !== null &&
          group.buyerStandardName.length >= 1
        ) {
          delete group.errorsName;
        }

        if (
          Number.isInteger(Number(group.paymentTerms)) &&
          Number(group.paymentTerms) >= 0 &&
          Number(group.paymentTerms) <= 365
        ) {
          delete group.errorsDays;
        }

        /**if name is not null and has at least one character and paymentTerms are equal or greated than 1 and less than 365 */
        if (
          group.buyerStandardName !== null &&
          group.buyerStandardName.length >= 1 &&
          Number.isInteger(Number(group.paymentTerms)) &&
          Number(group.paymentTerms) >= 0 &&
          Number(group.paymentTerms) <= 365
        ) {
          delete group.errorsDays;
          delete group.errorsName;
          data.hasErrors = false;
        }
      });
    }

    /**
     * save buyer standard groups
     */
    function saveGroups() {
      if (
        data.buyerStandardGroupsDeleted.length > 0 &&
        data.buyerStandardGroups.length === 0
      ) {
        saveBuyerStandardGroups();
      }

      if (data.buyerStandardGroups.length > 0) {
        validateFields();
        if (!data.hasErrors) {
          saveBuyerStandardGroups();
        }
      }
    }

    /**
     * adds a new buyer group
     */
    function addGroup() {
      let tempGroupValue = data.buyerStandardGroups.length + 1;
      while (!searchGroupName(tempGroupValue)) {
        tempGroupValue++;
      }
      const newGroupIndex = data.buyerStandardGroups.length;
      data.buyerStandardGroups.push({
        name: "BSG" + tempGroupValue + ", 0D",
        buyerStandardName: "Group" + tempGroupValue,
        paymentTerms: null,
        color: getColor(),
        buyerStandardRules: [],
        index: newGroupIndex,
        buyerStandardGroupBehavior: "low limit"
      });
      data.changingInputField = true;
      emit("send-changes", !data.changingInputField);
    }

    /**
     * drag event for buyer standard group
     */
    function startDrag(event: any, group: any) {
      data.isGroupItemCurrentlyDragged = true;
      event.dataTransfer.dropEffect = "move";
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("groupbuyerStandardName", group.name);
      data.dragDropGroupIndex = data.buyerStandardGroups.indexOf(group);
    }

    function notHoveringOverIcon() {
      data.isMouseHoveringOverDragIcon = false;
    }

    function hoveringOverIcon() {
      data.isMouseHoveringOverDragIcon = true;
    }

    function onDrop(event: any, index: any) {
      data.isGroupItemCurrentlyDragged = false;
      data.dragToSpecificIndex = index;
      moveInArray(
        data.buyerStandardGroups,
        data.dragDropGroupIndex,
        data.dragToSpecificIndex
      );

      // Update group.index values after array manipulation
      data.buyerStandardGroups.forEach((group, i) => {
        group.index = i;
      });
    }

    const moveInArray = function (arr: any, from: any, to: any) {
      const item = arr.splice(from, 1);
      arr.splice(to, 0, item[0]);
      normalizeNames(null, null);
    };

    /**delete group after confrim */
    function deleteGroup() {
      data.showDeleteConfirmation = false;
      data.buyerStandardGroups.splice(
        data.currentSelectedObjForDeletingIndex,
        1
      );
      normalizeNames(null, null);
      data.buyerStandardGroupsDeleted.push(
        data.currentSelectedObjForDeletingObj
      );
    }

    /**
     * delete group
     */
    function deleteGroupConfirm(group: any) {
      data.currentSelectedObjForDeletingObj = group;

      const index = data.buyerStandardGroups.indexOf(group);
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
      data.currentSelectedBuyerStandardGroup = group;
      data.showFilter = !data.showFilter;
    }

    /**
     * saves the selected filter category to a speficic buyer group
     */
    function saveFilterSelection(mySavedObj: any) {
      data.currentSelectedBuyerStandardGroup.buyerStandardRules.push({
        ...mySavedObj
      });
      data.financingGroupsRules.push(data.currentSelectedBuyerStandardGroup);
      data.showFilter = !data.showFilter;
    }

    /***
     * edit the filter for the specific buyer group and show the filter (edit mode)
     */
    function editGroupCondition(
      currentGroupObj: any,
      group: any,
      index: number,
      buyerGroupIndex: number
    ) {


      if (disabledButtonSpendFileInrecalculation.value) {
        return;
      }

      data.editSelectedBuyerStandardGroup = currentGroupObj;
      data.buyerStandardGroupIndex = buyerGroupIndex;
      data.groupBuyerStandardIndex = index;
      data.isEditMode = true;
      data.showFilter = !data.showFilter;
    }

    /**
     * save the updated filter condition for a specific group and close the filter
     */
    function updateFilter(myObj: any) {
      data.buyerStandardGroups[data.buyerStandardGroupIndex].buyerStandardRules[
        data.groupBuyerStandardIndex
      ] = myObj;
      data.showFilter = false;
      data.isEditMode = false;
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
              // Filter out key-value pairs where the key is null or undefined
              const filteredValues = element.values.filter(
                (keyPair: { key: string | number; value: string | number }) =>
                  keyPair.key !== null && keyPair.key !== undefined
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
                  value: "SME"
                },
                {
                  key: "false",
                  value: "Non-SME"
                }
              ],
              type: "text",
              operators: [],
              top: [],
              levels: ["suppliers"]
            };
          } else {
            //remove it from the array
            ObjectUtils.removeKey(callbackSuccessData, "SME");
          }



          data.availableFilters = callbackSuccessData;
          Object.keys(callbackSuccessData).forEach(function (category: any) {
            if (!useFeatureVirtualCard.value) {
              // remove VCARD_ACCEPTANCE_TYPE
              ObjectUtils.removeKey(data.availableFilters, "VCARD_ACCEPTANCE_TYPE")
            }
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
        }
      };
      analyzeStore.getRuleFiltersPossibilities(params);
    }

    onBeforeRouteLeave(to => {
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

    watch(
      () => props.showAlert,
      newValue => {
        data.showModal = newValue;
      }
    );

    /**
     * watch for each group, the groups.buyerStandardGroupBehavior
     * if there is a change, then the save button is enabled
     */
    watch(
      () => data.buyerStandardGroups,
      (newVal, oldVal) => {
        // Nested watch for changes in buyerStandardRules array of each group
        newVal.forEach((group, index) => {
          watch(
            () => group.buyerStandardGroupBehavior,
            (newRules, oldRules) => {
              //if all groups are valid, enable the save button
              if (data.buyerStandardGroups.length > 0) {
                validateFields();
                if (!data.hasErrors) {
                  data.changingInputField = false;
                }
              }
            },
            { deep: true }
          );
        });
      },
      { deep: true }
    );

    /**
     * watch for changes in buyerStandardRules array of each group
     */
    watch(
      () => data.buyerStandardGroups,
      (newVal, oldVal) => {
        // Nested watch for changes in buyerStandardRules array of each group
        newVal.forEach((group, index) => {
          watch(
            () => group.buyerStandardRules,
            (newRules, oldRules) => {
              //if all groups are valid, enable the save button
              if (data.buyerStandardGroups.length > 0) {
                validateFields();
                if (!data.hasErrors) {
                  data.changingInputField = false;
                }
              }
            },
            { deep: true }
          );
        });
      },
      { deep: true }
    );

    function cancelAction() {
      data.showModal = false;
      emit("cancel-n-continue");
    }

    /**
     * change the behavior level of a buyer standard group
     */
    function changeBehaviorLevel(grpIndex: number, level: string) {
      if (disabledButtonSpendFileInrecalculation.value) return;
      data.buyerStandardGroups[grpIndex].buyerStandardGroupBehavior = level;
    }

    const deletedBuyerStandardGroupsComputed = computed(() => {
      return data.buyerStandardGroupsDeleted;
    });

    watch(
      () => data.buyerStandardGroupsDeleted.length,
      newValue => {
        if (
          data.buyerStandardGroupsDeleted.length > 0 &&
          buyerStandardGroupsComputed.value.length === 0
        ) {
          //enable the save btn
          data.changingInputField = false;
        }
      }
    );

    /**
     * returns the array of buyer standard groups
     */
    const buyerStandardGroupsComputed = computed(() => {
      return data.buyerStandardGroups;
    });

    return {
      ...toRefs(data),
      addFilterCondition,
      addGroup,
      BadgeRelated,
      buyerStandardBehaviorLevels,
      buyerStandardGroupsComputed,
      cancelAction,
      changeBehaviorLevel,
      closeFilter,
      deletedBuyerStandardGroupsComputed,
      deleteGroup,
      deleteGroupConfirm,
      discardChanges,
      editGroupCondition,
      formatData,
      getFilterData,
      getTranslatedValue,
      hoveringOverIcon,
      loadingData,
      normalizeNames,
      notHoveringOverIcon,
      onDrop,
      removeCategoryItem,
      retrieveGroups,
      router,
      Routing,
      saveBuyerStandardGroups,
      saveFilterSelection,
      saveGroups,
      smeFeatureEnabled,
      startDrag,
      updateFilter,
      validateInput,
      disabledButtonSpendFileInrecalculation
    };
  }
});
</script>

<style lang="scss" scoped>
@use "src/resources/assets/styles/variables/colors" as *;
@use "sass:map";

input.group-days {
  text-align: right;
}

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

span.error {
  margin-top: 5px;
  color: map.get($colors, "error-500");
  font-size: 12px;
  font-style: normal;
  font-weight: 400;
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

.top-bar {
  min-height: 44px;
  padding: 24px 12px;
  border-radius: 0.5rem;
  border: 1px solid var(--gray-200, #eaecf0);
  background: var(--gray-50, #f9fafb);
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
  margin-bottom: 1em;
}
</style>
