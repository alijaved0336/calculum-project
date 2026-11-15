<template>
  <CalculumModal
    :size="'xl'"
    @close="$emit('close')"
  >
    <template #modalContent>
      <CalculumLoading
        v-if="isLoadingSpendNewTerms || loadingApi"
        :block="true"
      >
      </CalculumLoading>
      <div class="row mb-5">
        <div
          class="col-6 d-flex align-items-center justify-content-between mb-1"
        >
          <div class="d-flex align-items-center">
            <a
              class="btn btn-clean font-md text-capitalize custom-padding-btn rounded-tbr-none"
              :class="isViewActive(VIEWS.ADD_RESULTS)"
              :disabled="
                isLoadingProgramData && !belongtoProgram && !programUuid
              "
              @click="setCurrentView(VIEWS.ADD_RESULTS)"
              >{{ $t("home.entityCard.results.addResults") }}</a
            ><a
              class="btn btn-clean font-md text-capitalize custom-padding-btn rounded-tbl-none"
              :class="[isViewActive(VIEWS.FEEDBACK_ANALYSIS)]"
              :disabled="
                isLoadingProgramData && !belongtoProgram && !programUuid
              "
              @click="setCurrentView(VIEWS.FEEDBACK_ANALYSIS)"
              >{{ $t("home.entityCard.results.feedback") }}</a
            >
          </div>
        </div>
        <div class="col-6 d-flex">
          <h5
            class="ml-auto my-auto mb-0 text-2xl font-semibold text-capitalize text-gray-600"
          >
            {{ $t("global.agreedPaymentTerms") }}
          </h5>
        </div>
      </div>
      <div v-show="currentViewIndex === VIEWS.ADD_RESULTS">
        <div class="row mb-3">
          <div
            v-if="tabs.length > 1"
            class="col-12 tabstrip-container-up"
          >
            <div class="tabstrip-container">
              <TabStrip
                id="kendo-k-tabstrip-items-entitycard-results"
                :selected="selectedTabIndex"
                :tabs="tabs"
                @select="onSelect"
              >
                <template
                  #[programTabSlot]="{ props }: { props: { title: string } }"
                  ><span class="inProgram results-tabs">{{
                    props.title
                  }}</span></template
                >
                <template
                  #[noBelongProgramTabSlot]="{
                    props,
                  }: {
                    props: { title: string };
                  }"
                  ><span class="outProgram results-tabs">{{
                    props.title
                  }}</span></template
                >
              </TabStrip>
            </div>
          </div>
        </div>
        <div
          v-if="
            selectedTabIndex === 0 &&
            (mixedFields.length > 0 || showEditedPrompt)
          "
          class="row"
        >
          <div class="col-12 mb-2">
            <div
              v-if="mixedFields.length > 0"
              class="py-2 px-2.5 text-sm text-gray-700 bg-gray-50 border border-gray-300 rounded mb-2"
            >
              {{
                $t("home.entityCard.results.mixedValuesNotice", {
                  fields: mixedFieldLabels,
                })
              }}
            </div>
            <div
              v-if="showEditedPrompt"
              class="py-2 px-2.5 text-sm text-gray-700 bg-gray-50 border border-gray-300 rounded d-flex align-items-center justify-content-between gap-2"
            >
              <span>{{
                $t("home.entityCard.results.editedFieldsPrompt")
              }}</span>
              <span class="d-flex gap-2">
                <button
                  class="btn btn-clean font-md text-capitalize"
                  @click="keepEditedValues"
                >
                  {{ $t("home.entityCard.results.keepMyValues") }}
                </button>
                <button
                  class="btn btn-primary font-md text-capitalize"
                  @click="loadSelectionValues"
                >
                  {{ $t("home.entityCard.results.loadSelectionValues") }}
                </button>
              </span>
            </div>
          </div>
        </div>
        <div class="row">
          <div class="col-12 mb-2">
            <div
              class="py-2 text-sm text-gray-500 bg-gray-50 border border-gray-200 rounded"
              :class="'px-2.5'"
            >
              <div
                v-if="loadingDefaults"
                class="d-flex align-items-center gap-2 mb-1 text-sm text-gray-500"
              >
                <span class="spinner-border spinner-border-sm"></span>
              </div>
              <div
                class="row"
                :class="
                  isLoadingSpendNewTerms ||
                  isLoadingProgramData ||
                  loadingDefaults
                    ? 'bg-blur'
                    : ''
                "
              >
                <div class="col-3">
                  <div class="form-group">
                    <label>
                      <input
                        v-model="spendNewTerms.termsWithoutCashDiscount"
                        class="form-control required"
                        type="number"
                        min="0"
                        @change="markTouched('termsWithoutCashDiscount')"
                      /><span>{{
                        $t("home.entityCard.results.withoutCashDiscount")
                      }}</span>
                    </label>
                  </div>
                </div>
                <div class="col-3">
                  <div class="form-group">
                    <label>
                      <input
                        v-model="spendNewTerms.agreedDateOfChange"
                        class="form-control required"
                        :min="minStartDate"
                        type="date"
                        @change="markTouched('agreedDateOfChange')"
                      /><span>{{
                        $t("home.entityCard.results.dateOfAgreement")
                      }}</span>
                    </label>
                  </div>
                </div>
                <div class="col-3">
                  <div class="form-group">
                    <label>
                      <input
                        v-model="spendNewTerms.effectiveDate"
                        class="form-control required"
                        :min="minStartDate"
                        type="date"
                        @change="markTouched('effectiveDate')"
                      /><span>{{
                        $t("home.entityCard.results.effectiveDate")
                      }}</span>
                    </label>
                  </div>
                </div>
                <div class="col-3">
                  <div class="form-group">
                    <label>
                      <input
                        v-model="spendNewTerms.nextReviewDate"
                        class="form-control required"
                        :min="minStartDate"
                        type="date"
                        @change="markTouched('nextReviewDate')"
                      /><span>{{
                        $t("home.entityCard.results.newDateOfReview")
                      }}</span>
                    </label>
                  </div>
                </div>
                <div class="col-12 my-4">
                  <div
                    class="d-flex justify-content-between align-items-baseline"
                  >
                    <span
                      class="ml-2 text-sm font-medium text-gray-700"
                      data-testid="more-options-action"
                      @click="moreOptionsToggle"
                      >{{ $t("global.agreedMoreOptions") }}
                      <CalculumChevronDown
                        v-if="!moreOption"
                      ></CalculumChevronDown>
                      <CalculumChevronUp v-if="moreOption"></CalculumChevronUp
                    ></span>
                    <div class="d-flex gap-4 align-items-center">
                      <div
                        v-if="scfEnabledFeature"
                        class="row mr-2"
                      >
                        <span
                          class="ml-3 mr-6 text-xl text-capitalize font-bold"
                          >{{ $t("global.scfAccepted") }}</span
                        >
                        <label class="switch ms-3">
                          <input
                            v-model="spendNewTerms.scfAccepted"
                            type="checkbox"
                            :checked="spendNewTerms.scfAccepted"
                            @change="markTouched('scfAccepted')"
                          /><span class="slider round"></span>
                        </label>
                      </div>
                      <div
                        v-if="vCardEnabledFeature"
                        class="row mr-2"
                      >
                        <IconBadgeManageRebate
                          width="26"
                          height="23"
                        ></IconBadgeManageRebate
                        ><span
                          class="ml-3 mr-6 text-xl text-capitalize font-bold"
                          >{{ $t("global.vcardAccepted") }}</span
                        >
                        <label class="switch ms-3">
                          <input
                            v-model="spendNewTerms.vcardAccepted"
                            type="checkbox"
                            :checked="spendNewTerms.vcardAccepted"
                            @change="markTouched('vcardAccepted')"
                          /><span class="slider round"></span>
                        </label>
                      </div>
                    </div>
                  </div>
                  <div
                    v-if="moreOption"
                    class="row my-4"
                  >
                    <div class="col-4">
                      <div class="form-group">
                        <label>
                          <input
                            v-model="spendNewTerms.termsWithCashDiscount"
                            class="form-control"
                            type="number"
                            min="0"
                            @change="markTouched('termsWithCashDiscount')"
                          /><span>{{
                            $t("home.entityCard.results.withCashDiscount")
                          }}</span>
                        </label>
                      </div>
                    </div>
                    <div class="col-4">
                      <div class="form-group">
                        <label>
                          <input
                            v-model="spendNewTerms.cashDiscount"
                            class="form-control"
                            type="number"
                            min="0"
                            max="100"
                            @change="markTouched('cashDiscount')"
                          /><span>{{
                            $t("home.entityCard.results.cashDiscount")
                          }}</span>
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div
            v-if="inputInvalidWarningMessages.length > 0"
            class="col-12 mt-2"
          >
            <ErrorBox :messages="inputInvalidWarningMessages"></ErrorBox>
          </div>
        </div>
        <div
          v-if="selectedTabIndex === 0"
          class="row mb-5"
        >
          <div class="col-12">
            <ListNegotiation
              :selected-program-id="programUuid"
              :entity-uuid="companyId"
              :company-type="companyType"
              :is-selectable="true"
              :has-financing="programData.externalFinancingEnabled"
              :has-harmonization="programData.termsHarmonizationEnabled"
              :selected-tab-index="selectedTabIndex"
              :all-spends-tab="allSpendsTab"
              :in-recalculation="inRecalculation"
              :patch-grid="loading.patchGrid"
              :show-options="false"
              @select-all-row="selectAllRow"
              @select-row="selectRow"
              @send-filters="getFiltersAppliedSpends"
            ></ListNegotiation>
          </div>
        </div>
      </div>
      <div v-show="currentViewIndex === VIEWS.FEEDBACK_ANALYSIS">
        <div class="row mb-10">
          <div class="col-12">
            <p>{{ $t("home.entityCard.results.ratingQuestion") }}</p>
          </div>
          <div class="col-12 d-flex justify-content-center gap-2">
            <Star
              v-for="index in 5"
              :key="index"
              :variant="getVariantGivenIndexAndRating(index)"
              :classes="[
                'h-8 fill-current cursor-pointer animate__animated animate__fadeIn animate__faster',
                getVariantGivenIndexAndRating(index) === ICON_VARIANTS.solid
                  ? 'text-primary-500'
                  : '',
              ]"
              @click="setFeedbackRating(index)"
            ></Star>
          </div>
        </div>
        <div class="row mb-10">
          <div class="col-12">
            <p>{{ $t("home.entityCard.results.factorsQuestion") }}</p>
          </div>
          <div class="col-12">
            <div class="d-flex flex-wrap">
              <span
                v-for="item in spendNewTerms.feedback.allLabels"
                :key="item"
                class="specific-feedback"
                :class="
                  newFeedbackLabels.length > 0 &&
                  newFeedbackLabels.includes(item)
                    ? 'specific-feedback-active'
                    : ''
                "
                @click="setFeedbackLabels(item)"
                >{{ item }}</span
              >
            </div>
          </div>
          <div class="col-12 d-flex flex-column">
            <span class="mr-4 text-base text-capitalize font-bold">{{
              $t("global.additionalFeedback")
            }}</span>
            <textarea
              v-model="newAdditionalFeedback"
              class="notes-textarea show-scroll notes-comments"
              type="text"
            ></textarea>
          </div>
        </div>
      </div>
    </template>
    <template #modalButtons>
      <button
        class="btn outline-secondary-btn font-md text-capitalize"
        style="z-index: 1; width: fit-content"
        @click="closeModal"
      >
        {{ $t("global.cancel") }}
      </button>
      <button
        class="btn outline-secondary-btn font-md text-capitalize"
        :disabled="clearButtonLogicComputed"
        style="z-index: 1; width: fit-content"
        @click="clearAgreedTermsWithSelectedSpends"
      >
        {{ $t("global.clear") }}
      </button>
      <button
        v-if="currentViewIndex === VIEWS.ADD_RESULTS"
        class="btn btn-primary font-md text-capitalize btn-add-results-view"
        :disabled="
          isLoadingProgramData ||
          isLoadingSpendNewTerms ||
          clearButtonLogicComputed
        "
        style="z-index: 1; width: fit-content"
        @click="validateSpendNewTerms"
      >
        {{ $t("global.save") }}
      </button>
      <button
        v-if="currentViewIndex === VIEWS.FEEDBACK_ANALYSIS"
        class="btn btn-primary font-md text-capitalize btn-feedback-view"
        :disabled="isLoadingProgramData"
        style="z-index: 1; width: fit-content"
        @click="patchSpendLineFeedback"
      >
        {{ $t("global.save") }}
      </button>
    </template>
  </CalculumModal>
</template>

<script lang="ts">
import {
  computed,
  defineComponent,
  onMounted,
  reactive,
  ref,
  toRefs,
  watch,
  type PropType,
} from "vue";

import { ModalResults } from "@/modules/home/entityCard/types";
import { getAgreedTermsDefaults } from "../../api";
import { StringUtils } from "@/utils";
import { TabStrip } from "@progress/kendo-vue-layout";
import { useI18n } from "vue-i18n";
import { useEntityCardStore } from "@/stores/entityCard";
import * as cacheGrid from "@/utils/dataGridClear";
import { convertFiltersToREST, getISODate } from "@/utils/FormatData";
import * as Validator from "@/utils/validators";
import { CalculumLoading } from "@ada/design-system";
import CalculumModal from "@/modules/components/CalculumModal.vue";
import ErrorBox from "@/modules/components/forms/ErrorBox.vue";
import { useToast } from "vue-toastification";
import Star from "@/resources/assets/images/icons/Star.vue";
import ListNegotiation from "../../components/ListNegotiation.vue";
import IconBadgeManageRebate from "@/resources/assets/images/icons/IconBadgeManageRebate.vue";
import CalculumChevronDown from "@/modules/components/CalculumChevronDown.vue";
import CalculumChevronUp from "@/modules/components/CalculumChevronUp.vue";
import { useAppStore } from "@/stores/app";

// Types
import type { SpendLine } from "@/types";
import type { SpendNewTerms } from "../../types";
import { columnsNegotiationTab } from "../../data/columns";
import { useUser } from "@/composables";
import useCompany from "@/composables/useCompany";

const MAX_AGREED_TERMS_DAYS = 999;
const programTabSlot = "program";
const noBelongProgramTabSlot = "noBelongProgram";

function valueOrNullIfNegative(num: number): number | null {
  if (num == null || num < 0) return null;
  return num;
}

function toDateOnly(s: string | null | undefined): string | null {
  if (!s) return null;
  return s.substring(0, 10);
}

export default defineComponent({
  name: "ModalResults",
  components: {
    CalculumLoading,
    CalculumModal,
    ErrorBox,
    Star,
    TabStrip,
    ListNegotiation,
    IconBadgeManageRebate,
    CalculumChevronUp,
    CalculumChevronDown,
  },
  props: {
    companyId: { type: String, required: true },
    companyType: { type: String, required: false, default: "" },
    feedbackLabels: { type: Array, required: true },
    feedbackRating: { type: Number, required: true },
    programData: { type: Object, required: true },
    programUuid: { type: String, required: true },
    retrieveAllSpends: { type: Object, required: true },
    selectedIndex: { type: Number, required: true },
    selectedSpendUuid: { type: String, required: false, default: "" },
    spends: { type: Array, required: true },
    tabsData: { type: Array, required: false, default: () => [] },
    selectedTabIndex: { type: Number, required: true, default: 0 },
    inRecalculation: { type: Boolean, required: true, default: false },
    patchGrid: { type: Boolean, required: true, default: false },
    additionalFeedback: { type: String, required: false, default: "" },
    vcardTerms: { type: Number, required: true, default: 0 },
    opportunityTerms: { type: Number, required: true, default: 0 },
    loadingApi: { type: Boolean, required: true, default: false },
    scfAccepted: {
      type: Boolean as unknown as PropType<boolean | null>,
      required: false,
      default: null,
    },
    onSCF: {
      type: Boolean as unknown as PropType<boolean | null>,
      required: false,
      default: null,
    },
  },
  emits: [
    "btn-clear-clicked",
    "change-data",
    "close",
    "update-feedback-labels",
    "update-feedback-rating",
  ],
  setup(props, { emit }) {
    const entityCardStore = useEntityCardStore();
    const translate = useI18n({ warnHtmlMessage: false, useScope: "global" });
    const toast = useToast();
    const { isPilotAccount, useFeatureVirtualCard, useFeature9BoxesFinancing } =
      useUser();
    const { usevCardGroupsEnabled } = useCompany();
    const appStore = useAppStore();

    const VIEWS = {
      ADD_RESULTS: 0,
      FEEDBACK_ANALYSIS: 1,
    } as const;

    const ICON_VARIANTS = {
      regular: "regular",
      solid: "solid",
    } as const;

    const data = reactive<ModalResults>({
      tabs: [],
      selectedTabIndex: props.selectedIndex,
      tabsData: [],
      selectedProgramUri: props.programUuid,
      spendConfigurationUuid: "",
      spendUUID: "",
      belongtoProgram: false,
      loading: {
        patchGrid: false,
      },
      isLoadingSpendNewTerms: false,
      isLoadingProgramData: false,
      spendNewTerms: {
        active: false, // Spend Line has results
        id: null,
        termsWithoutCashDiscount: null,
        termsWithCashDiscount: null,
        cashDiscount: null,
        agreedDateOfChange: "",
        effectiveDate: "",
        nextReviewDate: "",
        agreedDateOfChangeBox: "",
        dateOfLastTermNegotiation: "",
        effectiveDateBox: null,
        nextReviewDateBox: null,
        harmonization: null,
        financing: null,
        isFirstTry: true,
        programProposedTerms: null,
        termsWithCashDiscountChart: null,
        termsWithoutCashDiscountChart: 0,
        cashDiscountChart: null,
        potentialCashflow: null,
        potentialSavings: null,
        negotiatedVsProposed: null,
        feedback: {
          id: null,
          allLabels: [],
        },
        vcardAccepted: false,
        scfAccepted: false,
      },
      currentStartDate: new Date().toISOString().split("T")[0],
      minStartDate: new Date(
        new Date().setFullYear(new Date().getFullYear() - 1),
      )
        .toISOString()
        .split("T")[0],
      listSpend: props.spends,
      columnsGrid: getGridColumns(),
      selectedItems: [],
      retrieveAllSpends: 0,
      allSpendsTab: false,
      keyGrid: new Date().getUTCMilliseconds(),
      currentViewIndex: VIEWS.ADD_RESULTS,
      inputInvalidWarningMessages: [],
      newFeedbackRating: 0,
      newFeedbackLabels: [],
      newAdditionalFeedback: props.additionalFeedback ?? "",
      allChecked: false,
      filterForPatch: null,
    });

    /**
     *
     */
    function setTabs() {
      const forRows = props.companyType === "parent" ? 1 : data.tabsData.length;
      // Helper function to determine tab title render type
      const getTabTitleRender = (tabData: any) => {
        if (!tabData?.uuid) return "noBelongProgram";
        return tabData.disabled ? "noBelongProgram" : "program";
      };
      // Create tabs
      data.tabs = Array.from({ length: forRows }, (_, i) => ({
        title: data.tabsData[i]?.alias ?? `Spend ${i + 1}`,
        hasResults: data.tabsData[i]?.hasResults ?? false,
        contentClassName: "classContentHide",
        titleRender: getTabTitleRender(data.tabsData[i]),
      }));
      if (data.tabsData.length > 0) {
        const currentTab = data.tabsData[data.selectedTabIndex];
        // Update spend line information
        if (!data.allSpendsTab || data.selectedTabIndex > 0) {
          data.retrieveAllSpends = props.retrieveAllSpends.findIndex(
            (x: any) => x.spendUUID === currentTab?.spendUUID,
          );
          // Update local variables if spend lines exist
          const currentSpend = props.retrieveAllSpends[data.retrieveAllSpends];
          if (currentSpend) {
            data.spendNewTerms.dateOfLastTermNegotiation =
              currentSpend.dateOfLastTermNegotiation
                ? getISODate(currentSpend.dateOfLastTermNegotiation.date)
                : "-";
          }
        }

        // Update configuration and program data
        Object.assign(data, {
          spendConfigurationUuid: currentTab?.uuid ?? "",
          belongtoProgram: currentTab?.uuid ? !currentTab.disabled : false,
          spendUUID: currentTab?.spendUUID ?? "",
        });

        // Handle results
        if (currentTab?.hasResults) {
          refreshSpendUiRelative(currentTab.hasResults);
        } else {
          avoidCallTerms();
        }
      }
    }

    /**
     * Handles the event when an item is selected.
     *
     * @param {any} e - The event object.
     */

    function updateSelectedSpendDate(): void {
      if (data.allSpendsTab && data.selectedTabIndex > 0) {
        data.retrieveAllSpends = props.retrieveAllSpends.findIndex(
          (x: any) =>
            x.spendUUID === data.tabsData[data.selectedTabIndex].spendUUID,
        );

        const spendLine = props.retrieveAllSpends[data.retrieveAllSpends];

        if (spendLine) {
          data.spendNewTerms.dateOfLastTermNegotiation =
            spendLine.dateOfLastTermNegotiation
              ? getISODate(spendLine.dateOfLastTermNegotiation.date)
              : "-";
        }

        return;
      }

      data.spendNewTerms.dateOfLastTermNegotiation = "";
      avoidCallTerms();
    }

    function onSelect(e: { selected: number }) {
      // Update selected tab index
      data.selectedTabIndex = e.selected;
      data.spendNewTerms.vcardAccepted = false;
      data.spendNewTerms.scfAccepted = false;
      data.allChecked = false;

      updateSelectedSpendDate();

      const selectedTab = data.tabsData[data.selectedTabIndex];
      if (selectedTab) {
        data.retrieveAllSpends = props.retrieveAllSpends.findIndex(
          (x: any) => x.spendUUID === selectedTab.spendUUID,
        );
        data.spendConfigurationUuid = selectedTab.uuid;
        data.spendUUID = selectedTab.spendUUID;
        data.belongtoProgram = selectedTab.uuid ? !selectedTab.disabled : false;
        const currentSpend = props.retrieveAllSpends[data.retrieveAllSpends];
        if (currentSpend) {
          data.spendNewTerms.dateOfLastTermNegotiation =
            currentSpend.dateOfLastTermNegotiation
              ? getISODate(currentSpend.dateOfLastTermNegotiation.date)
              : "-";
        }
        // If selected spend line has results
        if (selectedTab.hasResults) {
          refreshSpendUiRelative(selectedTab.hasResults);
        } else {
          // Reset form values
          avoidCallTerms();
        }
      }
    }

    function refreshSpendUiRelative(hasResults: string) {
      if (data.spendUUID && data.selectedProgramUri) {
        retrieveSpendNewTerms(hasResults);
        getLastPlan();
      }
    }

    /**
     * Reset the form and set the default values
     */
    function avoidCallTerms() {
      data.spendNewTerms.active = false;
      data.spendNewTerms.agreedDateOfChange = "";
      data.spendNewTerms.agreedDateOfChangeBox = "";
      data.spendNewTerms.effectiveDate = "";
      data.spendNewTerms.effectiveDateBox = null;
      data.spendNewTerms.financing = "";
      data.spendNewTerms.id = null;
      data.spendNewTerms.negotiatedVsProposed = null;
      data.spendNewTerms.nextReviewDate = "";
      data.spendNewTerms.nextReviewDateBox = null;
      data.spendNewTerms.potentialCashflow = null;
      data.spendNewTerms.potentialSavings = null;
      data.spendNewTerms.programProposedTerms =
        props.retrieveAllSpends.length > 0 && data.retrieveAllSpends >= 0
          ? props.retrieveAllSpends[data.retrieveAllSpends]?.model_payment_terms
          : "";
      data.spendNewTerms.termsWithCashDiscount = null;
      data.spendNewTerms.termsWithCashDiscountChart = 0;
      data.spendNewTerms.termsWithoutCashDiscount = null;
      data.spendNewTerms.termsWithoutCashDiscountChart = 0;
      data.spendNewTerms.vcardAccepted = false;
      data.spendNewTerms.scfAccepted = false;
      data.newFeedbackRating = 0;
      data.newFeedbackLabels = [];
      data.newAdditionalFeedback = "";
      fillSuggested();
    }

    /**
     * Set the main view of the modal
     *
     * @param index {number}
     */
    function setCurrentView(index: number = VIEWS.ADD_RESULTS) {
      data.currentViewIndex = index;
    }

    /**
     * Get list of columns titles in Spends tab
     *
     * @returns {GridColumnProps[]} - List of columns
     */
    function getGridColumns(): any[] {
      let resetColumns = [];

      const gridCache = entityCardStore.getResultsGridColumns;

      /**
       * If "gridCache" is not empty and different from default grid columns array
       */
      if (
        gridCache &&
        gridCache.length &&
        JSON.stringify(columnsNegotiationTab) !== JSON.stringify(gridCache)
      ) {
        // Update cached data
        resetColumns = cacheGrid.clearCache(columnsNegotiationTab, gridCache);
      } else {
        // Use cached data
        resetColumns = columnsNegotiationTab;
      }

      if (isPilotAccount()) {
        const parentName = resetColumns.findIndex(
          (x: any) => x.field === "parentName",
        );
        if (parentName > -1) {
          resetColumns[parentName].cell = "restrictModalEntitySpend";
        }
      }

      entityCardStore.setResultsGridColumns(resetColumns);

      return resetColumns;
    }

    /**
     * Results - Feedback
     */

    /**
     * Updates the specific feedback value in the data object.
     *
     * @param {string} item - The item to be updated.
     * @return {void} This function does not return a value.
     */
    function setFeedbackLabels(item: string) {
      // Check if item is selected
      if (data.newFeedbackLabels.includes(item)) {
        // Selected. Remove it from the array
        const indexOfItem = data.newFeedbackLabels.indexOf(item);
        data.newFeedbackLabels.splice(indexOfItem, 1);
      } else {
        // Not selected. Add it to the array
        data.newFeedbackLabels = [...data.newFeedbackLabels, item];
      }
    }

    /**
     * Set rating feedback value 0 (no rating) to 5
     *
     * @param newValue {number}
     */
    function setFeedbackRating(newValue: number) {
      // If new value is the same as the current one, set to null
      if (data.newFeedbackRating === newValue) {
        data.newFeedbackRating = 0;
      } else {
        data.newFeedbackRating = newValue;
      }
    }

    /**
     * Patch Spend New Terms Feedback
     */
    function patchSpendLineFeedback() {
      // Enable loading
      data.isLoadingSpendNewTerms = true;

      // First tab - All Spends
      if (data.allSpendsTab && data.selectedTabIndex === 0) {
        // Validate if there are selected items
        if (data.selectedItems && data.selectedItems.length === 0) {
          toast.error(translate.t("home.entityCard.warnings.noSelected"));

          // Disable loading
          data.isLoadingSpendNewTerms = false;

          return;
        } else {
          const spendsTerms = [];

          for (const row of data.selectedItems) {
            data.spendNewTerms.id = row.negotiationId;

            // Only update feedback rating, labels...
            const spendTerm = {
              feedbackRating: data.newFeedbackRating,
              labels: data.newFeedbackLabels,
              programId: data.selectedProgramUri,
              spendId: data.listSpend.find((x: any) => x.spendUUID === row.uuid)
                ?.spendUUID,
              spendNewTermsId: data.listSpend.find(
                (x: any) => x.spendUUID === row.uuid,
              )?.negotiationId,
              additionalFeedback: data.newAdditionalFeedback,
            };
            spendsTerms.push(spendTerm);
          }

          const params = {
            spendsTerms: spendsTerms,
            callbackSuccess: (callbackSuccessData: SpendNewTerms) => {
              // Disable loading
              data.isLoadingSpendNewTerms = false;
              toast.success("The feedback has been updated successfully");

              // If User is in Add Results view, change to Feedback Analysis view
              if (data.currentViewIndex === VIEWS.ADD_RESULTS) {
                setCurrentView(VIEWS.FEEDBACK_ANALYSIS);
              }
              // User is in Feedback Analysis view
              else {
                // Update feedback rating in parent component
                //emit('update-feedback-rating', callbackSuccessData.feedbackRating)

                // Update feedback labels in parent component
                if (callbackSuccessData) {
                  emit("update-feedback-labels", callbackSuccessData.labels);
                }

                emit("change-data");

                // Close modal
                emit("close");
              }
            },
            callbackError: () => {
              toast.error(translate.t("home.entityCard.warnings.noUpdated"));

              data.isLoadingSpendNewTerms = false;
            },
          };
          entityCardStore.allSpendNewTerms(params);
        }
      }

      if (data.selectedTabIndex === 0 && data.selectedItems?.length > 0) {
        return;
      }

      const spendsTerms = [];
      const spendTerm = {
        feedbackRating: data.newFeedbackRating,
        labels: data.newFeedbackLabels,
        programId: data.selectedProgramUri,
        spendId: data.spendUUID,
        spendNewTermsId: data.spendNewTerms.id,
        additionalFeedback: data.newAdditionalFeedback,
      };
      spendsTerms.push(spendTerm);
      const params = {
        spendsTerms: spendsTerms,

        callbackSuccess: (callbackSuccessData: any) => {
          toast.success("The feedback has been updated successfully");
          // Disable loading
          data.isLoadingSpendNewTerms = false;

          // If User is in Add Results view, change to Feedback Analysis view
          if (data.currentViewIndex === VIEWS.ADD_RESULTS) {
            setCurrentView(VIEWS.FEEDBACK_ANALYSIS);
          }
          // User is in Feedback Analysis view
          else {
            // Update feedback rating in parent component
            //emit('update-feedback-rating', callbackSuccessData.feedbackRating)
            emit("change-data");

            // Update feedback labels in parent component
            if (callbackSuccessData) {
              emit("update-feedback-labels", callbackSuccessData.labels);
            }

            // Close modal
            emit("close");
          }
        },
        callbackError: () => {
          toast.error(translate.t("home.entityCard.warnings.noUpdated"));

          // Disable loading
          data.isLoadingSpendNewTerms = false;
        },
      };

      entityCardStore.allSpendNewTerms(params);
    }

    function getAllTabdata(callbackSuccessData: any) {
      return {
        alias: translate.t("global.allSpendLines"),
        uuid: callbackSuccessData[0].uuid,
        disabled: false,
        spendUUID: callbackSuccessData[0].spendUUID,
        cashDiscounts: null,
        spend_volume: null,
        team: null,
        model_payment_terms: null,
        hasResults: null,
        hasDynamicHarmonization: null,
        approach: null,
        cashDiscountEnabled: null,
      };
    }

    function addRequiredDateErrors() {
      if (!data.spendNewTerms.agreedDateOfChange) {
        data.inputInvalidWarningMessages.push(
          translate.t("home.entityCard.warnings.dateOfAgreement"),
        );
      }
      if (!data.spendNewTerms.effectiveDate) {
        data.inputInvalidWarningMessages.push(
          translate.t("home.entityCard.warnings.effectiveDate"),
        );
      }
      if (!data.spendNewTerms.nextReviewDate) {
        data.inputInvalidWarningMessages.push(
          translate.t("home.entityCard.warnings.nextReviewDate"),
        );
      }
    }

    function addTermsWithoutCashDiscountErrors(value: number) {
      if (!Validator.isValidNumberGreaterEqualThanZero(value)) {
        data.inputInvalidWarningMessages.push(
          translate.t("home.entityCard.warnings.cashDiscountLessThanZero"),
        );
      }
      if (value > MAX_AGREED_TERMS_DAYS) {
        data.inputInvalidWarningMessages.push(
          translate.t("home.entityCard.warnings.cashDiscountGreaterThanMax", {
            max: MAX_AGREED_TERMS_DAYS,
          }),
        );
      }
    }

    function addTermsWithCashDiscountErrors(termsWithStr: string) {
      if (!termsWithStr) return;
      const num = Number.parseInt(termsWithStr);
      if (num > MAX_AGREED_TERMS_DAYS) {
        data.inputInvalidWarningMessages.push(
          translate.t(
            "home.entityCard.warnings.termsWithCashDiscountGreaterThanMax",
            { max: MAX_AGREED_TERMS_DAYS },
          ),
        );
      }
      if (num < 0) {
        data.inputInvalidWarningMessages.push(
          translate.t(
            "home.entityCard.warnings.termsWithCashDiscountLessThanZero",
          ),
        );
      }
    }

    function addCashDiscountPercentErrors(cashDiscountStr: string) {
      if (!cashDiscountStr) return;
      const num = Number.parseInt(cashDiscountStr);
      if (num > 100) {
        data.inputInvalidWarningMessages.push(
          translate.t(
            "home.entityCard.warnings.cashDiscountPercentGreaterThanMax",
          ),
        );
      }
      if (num < 0) {
        data.inputInvalidWarningMessages.push(
          translate.t(
            "home.entityCard.warnings.cashDiscountPercentLessThanZero",
          ),
        );
      }
    }

    /**
     * Validate user input for spend new terms and call patch or post
     */
    function validateSpendNewTerms() {
      if (
        data.selectedItems &&
        data.selectedItems.length === 0 &&
        data.selectedTabIndex === 0
      ) {
        toast.error(translate.t("home.entityCard.warnings.noSelected"));
        return;
      }

      const termsWithCashDiscount =
        data.spendNewTerms.termsWithCashDiscount?.toString() || "";
      const termsWithoutCashDiscount =
        data.spendNewTerms.termsWithoutCashDiscount?.toString() || "";
      const cashDiscount = data.spendNewTerms.cashDiscount?.toString() || "";

      data.spendNewTerms.isFirstTry = false;
      data.inputInvalidWarningMessages = [];

      addRequiredDateErrors();
      addTermsWithoutCashDiscountErrors(
        Number.parseInt(termsWithoutCashDiscount),
      );
      addTermsWithCashDiscountErrors(termsWithCashDiscount);
      addCashDiscountPercentErrors(cashDiscount);

      if (data.inputInvalidWarningMessages.length) {
        return;
      }
      saveAndEditAgreedTerms();
    }

    /**
     * both save and edit agreed terms
     * ids is an array of uuid(s) which are being currently modified
     * when the data selectedItems is not empty, it will be an array of uuid(s)
     * when the data selectedItems is empty, it will be an array of spendUUID(s)
     */
    function saveAndEditAgreedTerms() {
      data.isLoadingSpendNewTerms = true;

      let ids: string[] = [];

      if (data.selectedItems.length > 0) {
        data.selectedItems.forEach((item: any) => {
          // item.uuid is the configUuid from the GraphQL response
          ids.push(item.uuid);
        });
      } else {
        // When no items are selected, use the current tab's spendUUID
        const currentTab: any = props.tabsData[data.selectedTabIndex];
        if (currentTab && currentTab.spendUUID) {
          ids = [currentTab.spendUUID];
        }
      }

      const myTermsObj = {
        // WI#18553: an empty optional "With Cash Discount" field must be saved as null, not 0, and
        // the cash discount is stored as a fraction (base-1): convert the typed percent with ÷100,
        // mirroring the `× 100` applied on load. String(x) !== "" is type-safe (the field is typed
        // number|null) while still treating an empty input as blank and preserving an explicit 0.
        cashDiscount:
          data.spendNewTerms.cashDiscount != null &&
          String(data.spendNewTerms.cashDiscount) !== ""
            ? Number(data.spendNewTerms.cashDiscount) / 100
            : null,
        termsWithCashDiscount:
          data.spendNewTerms.termsWithCashDiscount != null &&
          String(data.spendNewTerms.termsWithCashDiscount) !== ""
            ? Number(data.spendNewTerms.termsWithCashDiscount)
            : null,
        termsWithoutCashDiscount: data.spendNewTerms.termsWithoutCashDiscount
          ? Number(data.spendNewTerms.termsWithoutCashDiscount)
          : 0,
        nextReviewDate: data.spendNewTerms.nextReviewDate,
        agreedDateOfChange: data.spendNewTerms.agreedDateOfChange,
        effectiveDate: data.spendNewTerms.effectiveDate,
        feedbackRating: data.newFeedbackRating,
        labels: data.newFeedbackLabels,
        vcardAccepted: data.spendNewTerms.vcardAccepted,
        scfAccepted: data.spendNewTerms.scfAccepted,
        additionalFeedback: data.newAdditionalFeedback,
      };

      let currencyRate: number = appStore.getCurrencyAmount;
      let filters = {
        telerikFilter: convertFiltersToREST(data.filterForPatch),
        targetProgramUuid: StringUtils.removeIRI(props.programUuid),
        currencyRate,
      };

      const params = {
        spendsUuid: data.allChecked ? [] : ids,
        spendsTerms: myTermsObj,
        all: data.allChecked,
        entity: props.companyId,
        filters,
        callbackSuccess: (callbackSuccessData: SpendNewTerms) => {
          // Disable loading
          data.isLoadingSpendNewTerms = false;
          // Update feedback labels in parent component
          if (callbackSuccessData) {
            emit("update-feedback-labels", callbackSuccessData.labels);
          }

          toast.success(translate.t("home.entityCard.success.saved"));
          emit("change-data");
          // Close modal
          emit("close");
        },
        callbackError: (callbackErrorData: unknown) => {
          if (import.meta.env.DEV)
            console.error(
              "** Error in saveAndEditAgreedTerms:",
              callbackErrorData,
            );

          toast.error(translate.t("home.entityCard.warnings.noUpdated"));

          // Disable loading
          data.isLoadingSpendNewTerms = false;
        },
      };
      entityCardStore.saveAndEditAgrreedTerms(params);
    }

    function selectAllRow(rowData: any, items: any, checked: boolean) {
      data.allChecked = checked;
      data.selectedItems = items ? rowData : [];
      scheduleSelectionDefaults();
    }

    /**
     * Get the data from the selected rows in the grid
     *
     * @param {any} rowData - The data of the selected rows
     */
    function selectRow(rowData: SpendLine[]) {
      data.allChecked = false;
      data.selectedItems = rowData;
      scheduleSelectionDefaults();
    }

    /**
     * API
     */

    function applySpendNewTermsFromApi(api: any) {
      data.spendNewTerms.active = true;
      const termsWith = valueOrNullIfNegative(api.termsWithCashDiscount);
      const termsWithout = valueOrNullIfNegative(api.termsWithoutCashDiscount);
      const cashDiscountPct =
        api.cashDiscount != null && api.cashDiscount >= 0
          ? api.cashDiscount * 100
          : null;

      data.spendNewTerms.id = api["@id"];
      data.spendNewTerms.termsWithCashDiscount = api.termsWithCashDiscount
        ? termsWith
        : null;
      data.spendNewTerms.termsWithoutCashDiscount = api.termsWithoutCashDiscount
        ? termsWithout
        : null;
      data.spendNewTerms.termsWithCashDiscountChart =
        (api.termsWithCashDiscount ? termsWith : null) ?? 0;
      data.spendNewTerms.termsWithoutCashDiscountChart =
        (api.termsWithoutCashDiscount ? termsWithout : null) ?? 0;
      data.spendNewTerms.cashDiscount = api.cashDiscount
        ? cashDiscountPct
        : null;
      data.spendNewTerms.cashDiscountChart = api.cashDiscount;
      data.spendNewTerms.agreedDateOfChange =
        toDateOnly(api.agreedDateOfChange) ?? "";
      data.spendNewTerms.effectiveDate =
        toDateOnly(api.effectiveDate) ??
        data.spendNewTerms.agreedDateOfChange ??
        "";
      data.spendNewTerms.nextReviewDate = toDateOnly(api.nextReviewDate) ?? "";
      data.spendNewTerms.agreedDateOfChangeBox =
        toDateOnly(api.agreedDateOfChange) ?? "";
      data.spendNewTerms.effectiveDateBox = toDateOnly(api.effectiveDate) ?? "";
      data.spendNewTerms.nextReviewDateBox =
        toDateOnly(api.nextReviewDate) ?? "";
      data.spendNewTerms.potentialCashflow = StringUtils.formatBigCurrency(
        api.negotiatedPotentialCashFlow,
      );
      data.spendNewTerms.potentialSavings = api.negotiatedPotentialSaving
        ? StringUtils.formatBigCurrency(api.negotiatedPotentialSaving)
        : null;
      const currentSpend =
        data.retrieveAllSpends >= 0
          ? props.retrieveAllSpends[data.retrieveAllSpends]
          : undefined;
      data.spendNewTerms.negotiatedVsProposed =
        currentSpend && api.termsWithoutCashDiscount != null
          ? Number.parseFloat(api.termsWithoutCashDiscount) -
            Number.parseFloat(currentSpend.model_payment_terms)
          : null;
      data.spendNewTerms.financing = api.financingGroup
        ? api.financingGroup.name
        : "-";
      data.spendNewTerms.programProposedTerms = api.programProposedTerms;
      data.spendNewTerms.dateOfLastTermNegotiation = getISODate(
        api.spend.updated,
      );
      data.spendNewTerms.vcardAccepted = api.vcardAccepted;
      data.spendNewTerms.scfAccepted = api.scfAccepted ?? false;
      data.newFeedbackRating = api.feedbackRating;
      data.newFeedbackLabels = api.labels;
      data.newAdditionalFeedback = api.additionalFeedback;
    }

    /**
     * Get the saved spend new terms from the API
     */
    function retrieveSpendNewTerms(hasResults: string) {
      data.isLoadingSpendNewTerms = true;
      const params = {
        resultId: hasResults,
        callbackSuccess: (callbackSuccessData: any) => {
          applySpendNewTermsFromApi(callbackSuccessData);
          data.isLoadingSpendNewTerms = false;
        },
        callbackError: () => {
          toast.error(translate.t("home.entityCard.warnings.noUpdated"));
          data.isLoadingSpendNewTerms = false;
        },
      };
      entityCardStore.getSpendNewTerms(params);
    }

    function getLastPlan() {
      // Enable loading
      data.isLoadingSpendNewTerms = true;

      const params = {
        spendUUID: data.spendUUID,
        programUUID: StringUtils.removeIRI(data.selectedProgramUri),
        callbackSuccess: (response: any) => {
          // Disable loading
          data.isLoadingSpendNewTerms = false;
        },
        callbackError: () => {
          toast.error(translate.t("home.entityCard.warnings.noUpdated"));

          // Disable loading
          data.isLoadingSpendNewTerms = false;
        },
      };
      entityCardStore.getLastPlan(params);
    }

    /**
     * Get all spend lines data
     */
    function selectedSpendVolume(tab: any): number {
      return (
        props.retrieveAllSpends.find((s: any) => s.spendUUID === tab.spendUUID)
          ?.spend_volume ?? 0
      );
    }

    // Order the modal's spend tabs by volume DESC so they match the entity card order; the
    // "All Spend Lines" tab (index 0) stays first.
    function orderTabsDataByVolume() {
      if (data.tabsData.length <= 1) return;
      const [allSpendsTab, ...spendTabs] = data.tabsData;
      data.tabsData = [
        allSpendsTab,
        ...spendTabs.sort(
          (a: any, b: any) => selectedSpendVolume(b) - selectedSpendVolume(a),
        ),
      ];
    }

    // Select the tab of the spend being edited by its UUID (not by position), so it works even
    // if the entity card and the modal ever order tabs differently. Skips index 0: the
    // "All Spend Lines" tab reuses the first spend's spendUUID.
    function selectTabBySelectedSpend() {
      if (!props.selectedSpendUuid) return;
      const matchIndex = data.tabsData.findIndex(
        (tab: any, i: number) =>
          i > 0 && tab.spendUUID === props.selectedSpendUuid,
      );
      if (matchIndex >= 0) data.selectedTabIndex = matchIndex;
    }

    function postSpendsBySupplierAndButProgram() {
      // Enable loading
      data.isLoadingProgramData = true;

      const params = {
        companyId: props.companyId,
        programId: data.selectedProgramUri,
        callbackSuccess: (callbackSuccessData: any) => {
          if (callbackSuccessData.length > 0) {
            data.tabsData = callbackSuccessData;

            if (
              callbackSuccessData.length > 1 ||
              props.companyType === "parent"
            ) {
              data.allSpendsTab = true;

              data.tabsData = [
                getAllTabdata(callbackSuccessData),
                ...data.tabsData,
              ];
            }

            if (callbackSuccessData.length > 3) {
              data.keyGrid++;
            }

            // Order spend tabs by volume DESC (matching the entity card) and select the tab of
            // the spend being edited by its UUID, so selection does not depend on tab order.
            orderTabsDataByVolume();
            selectTabBySelectedSpend();

            // Clamp selectedTabIndex to valid range after building tabsData
            if (data.selectedTabIndex >= data.tabsData.length) {
              data.selectedTabIndex =
                data.tabsData.length > 1 ? data.tabsData.length - 1 : 0;
            }

            // Populate tabs data
            setTabs();
          }

          // Disable loading
          data.isLoadingProgramData = false;
        },
        callbackError: () => {
          toast.error(translate.t("home.entityCard.warnings.noUpdated"));

          // Disable loading
          data.isLoadingProgramData = false;
        },
      };

      entityCardStore.postSpendsBySupplierAndButProgram(params);
    }

    /**
     * Classes
     */

    function isViewActive(viewIndex: number) {
      return data.currentViewIndex === viewIndex ? "active" : "";
    }

    function getVariantGivenIndexAndRating(index: number): string {
      // If rating is 0 or null, return default
      if (!data.newFeedbackRating) return ICON_VARIANTS.regular;

      // Return solid variant if icon position is less or equal than rating
      return index <= data.newFeedbackRating
        ? ICON_VARIANTS.solid
        : ICON_VARIANTS.regular;
    }

    /**
     * Clear button
     * if selectedTabIndex is zero and there is a grid list,
     * it sends an array of selected spend uuids
     *
     * otherwise, is just sends a single spend uuid
     */
    function clearAgreedTermsWithSelectedSpends() {
      if (
        data.selectedItems &&
        data.selectedItems.length === 0 &&
        data.selectedTabIndex === 0
      ) {
        toast.error(translate.t("home.entityCard.warnings.noSelected"));
        return;
      }

      let currencyRate: number = appStore.getCurrencyAmount;
      let filters = {
        telerikFilter: convertFiltersToREST(data.filterForPatch),
        targetProgramUuid: StringUtils.removeIRI(props.programUuid),
        currencyRate,
      };

      if (data.selectedTabIndex === 0 && data.selectedItems?.length > 0) {
        let ids: string[] = [];
        data.selectedItems.forEach((item: any) => {
          ids.push(item.uuid);
        });
        emit("btn-clear-clicked", ids, filters, data.allChecked);
      } else {
        const currentTab = data.tabsData[data.selectedTabIndex];
        if (currentTab?.spendUUID) {
          emit(
            "btn-clear-clicked",
            [currentTab.spendUUID],
            filters,
            data.allChecked,
          );
        }
      }
    }

    /**
     * The clear button is disabled if
     * 1) On the first tab , and there is a grid list (e.g. Supplier / Parent Level) and none of the rows are selected
     * 2) Checks  selected tab index is > 0 and if that spend has hasResults property set to null
     * true -> disabled
     * false -> enabled
     */
    const clearButtonLogicComputed = computed(() => {
      if (data.selectedTabIndex === 0) {
        // Supplier
        if (Object.keys(data.selectedItems).length === 0) {
          return true;
        }
        return false;
      } else if (data.selectedTabIndex > 0) {
        return false;
      } else {
        return false;
      }
    });

    /**
     * On Mounted
     */
    onMounted(() => {
      data.spendNewTerms.feedback.allLabels = [
        "Strategic Relationship",
        "Market Share",
        "Strategic Products",
        "Pricing Impact",
        "Liquidity Constraints",
        "Country Standard",
        "Industry Standard",
        "Peer-Group Standard",
        "Financing Costs",
        "Cost of Debt",
        "Access to Financing",
        "Sustainability Impact",
        "ESG",
        "Price Implication",
        "Supplier Reliability",
        "Reputation",
        "Segmentation Error",
        "Access Financing",
      ];

      postSpendsBySupplierAndButProgram();
    });

    /**
     * Watchers
     */

    watch(
      () => data.columnsGrid,
      () => {
        localStorage.setItem(
          "EntityCardColumnsResults",
          JSON.stringify(data.columnsGrid),
        );
      },
      { deep: true },
    );

    watch(
      () => props.selectedIndex,
      (newValue) => {
        data.selectedTabIndex =
          data.tabsData.length > 0
            ? Math.min(newValue, data.tabsData.length - 1)
            : 0;
        const selectedTab = {
          selected: data.selectedTabIndex,
        };
        onSelect(selectedTab);
      },
    );

    watch(
      () => props.additionalFeedback,
      (value, oldValue) => {
        if (data.newAdditionalFeedback === (oldValue ?? "")) {
          data.newAdditionalFeedback = value ?? "";
        }
      },
    );

    function closeModal() {
      emit("close");
    }

    function fillSuggested() {
      const date = new Date();
      // Setting 9 month default from today
      date.setDate(date.getDate() + 270);
      data.spendNewTerms.termsWithoutCashDiscount =
        props.vcardTerms > 0 ? props.vcardTerms : props.opportunityTerms;
      data.spendNewTerms.agreedDateOfChange = data.currentStartDate;
      data.spendNewTerms.effectiveDate = data.currentStartDate;
      data.spendNewTerms.nextReviewDate = date.toISOString().split("T")[0];
      // Set SCF Accepted default based on scfAccepted prop
      const bothTrue = props.onSCF === true && props.scfAccepted === true;
      const onScfFalseScfTrue =
        props.onSCF === false && props.scfAccepted === true;
      const onScfTrueScfNull =
        props.onSCF === true && props.scfAccepted === null;
      const onScfFalseScfNull =
        props.onSCF === false && props.scfAccepted === null;
      const onScfTrueScfFalse =
        props.onSCF === true && props.scfAccepted === false;
      switch (true) {
        case bothTrue:
        case onScfFalseScfTrue:
        case onScfTrueScfNull:
          data.spendNewTerms.scfAccepted = true;
          break;
        case onScfTrueScfFalse:
        case onScfFalseScfNull:
        default:
          data.spendNewTerms.scfAccepted = false;
          break;
      }
    }
    const vCardEnabledFeature = computed(() => {
      return useFeatureVirtualCard.value && usevCardGroupsEnabled.value;
    });

    const scfEnabledFeature = computed(() => {
      return useFeature9BoxesFinancing.value;
    });

    const moreOption = ref(false);
    const moreOptionsToggle = () => (moreOption.value = !moreOption.value);
    const addErrorMessage = (message: string) => {
      if (!data.inputInvalidWarningMessages.includes(message)) {
        data.inputInvalidWarningMessages.push(message);
      }
    };

    const removeErrorMessage = (message: string) => {
      data.inputInvalidWarningMessages =
        data.inputInvalidWarningMessages.filter((item) => item !== message);
    };
    // Watch for changes in agreed date and next review date
    watch(
      [
        () => data.spendNewTerms.agreedDateOfChange,
        () => data.spendNewTerms.nextReviewDate,
      ],
      ([newAgreedDateOfChange, newNextReviewDate]) => {
        if (!newAgreedDateOfChange || !newNextReviewDate) return;
        const validateDates = () => {
          const messageCompare = `${translate.t("home.entityCard.results.agreedDateGreatherThanNextReviewValidationError")}`;
          const messageBeforeAyear = translate.t(
            "home.entityCard.results.agreedDateLessThanAyearValidationError",
          );
          // Validate review date is after agreed date
          if (new Date(newNextReviewDate) < new Date(newAgreedDateOfChange)) {
            addErrorMessage(messageCompare);
          } else {
            removeErrorMessage(messageCompare);
          }
          // Validate agreed date is not before min start sate
          if (new Date(newAgreedDateOfChange) < new Date(data.minStartDate)) {
            addErrorMessage(messageBeforeAyear);
          } else {
            removeErrorMessage(messageBeforeAyear);
          }
        };
        validateDates();
      },
    );

    function getFiltersAppliedSpends(filters: any) {
      data.filterForPatch = filters;
      scheduleSelectionDefaults();
    }

    // --- WI#18553: selection-aware pre-fill of the Agreed Payment Terms fields ----------------
    const SELECTION_FIELDS = [
      "termsWithoutCashDiscount",
      "termsWithCashDiscount",
      "cashDiscount",
      "agreedDateOfChange",
      "nextReviewDate",
      "effectiveDate",
      "vcardAccepted",
      "scfAccepted",
    ];
    const SELECTION_DATE_FIELDS = [
      "agreedDateOfChange",
      "nextReviewDate",
      "effectiveDate",
    ];
    const SELECTION_TOGGLE_FIELDS = ["vcardAccepted", "scfAccepted"];
    const FIELD_LABEL_KEYS: Record<string, string> = {
      termsWithoutCashDiscount: "home.entityCard.results.withoutCashDiscount",
      termsWithCashDiscount: "home.entityCard.results.withCashDiscount",
      cashDiscount: "home.entityCard.results.cashDiscount",
      agreedDateOfChange: "home.entityCard.results.dateOfAgreement",
      effectiveDate: "home.entityCard.results.effectiveDate",
      nextReviewDate: "home.entityCard.results.newDateOfReview",
      scfAccepted: "global.scfAccepted",
      vcardAccepted: "global.vcardAccepted",
    };

    const touchedFields = ref<string[]>([]);
    const mixedFields = ref<string[]>([]);
    const pendingDefaults = ref<Record<
      string,
      { value: any; mixed: boolean }
    > | null>(null);
    const showEditedPrompt = ref(false);
    const loadingDefaults = ref(false);
    let selectionDefaultsTimer: ReturnType<typeof setTimeout> | null = null;
    let lastSelectionSignature = "";

    const mixedFieldLabels = computed(() =>
      mixedFields.value
        .map((f) => translate.t(FIELD_LABEL_KEYS[f] ?? f))
        .join(", "),
    );

    function markTouched(field: string) {
      if (!touchedFields.value.includes(field)) touchedFields.value.push(field);
    }

    function setSelectionFieldBlank(field: string) {
      const terms = data.spendNewTerms as Record<string, any>;
      if (SELECTION_DATE_FIELDS.includes(field)) terms[field] = "";
      else if (SELECTION_TOGGLE_FIELDS.includes(field)) terms[field] = false;
      else terms[field] = null;
    }

    /**
     * Apply the server-computed per-field defaults to the form. Starts from the suggested baseline
     * (so "fresh" fields keep today's behaviour), then per field: mixed -> blank, uniform -> value.
     * When keepTouched, fields the user already edited are preserved.
     */
    function applySelectionDefaultsToForm(
      defaults: Record<string, { value: any; mixed: boolean }>,
      keepTouched: boolean,
    ) {
      const terms = data.spendNewTerms as Record<string, any>;
      const preserved: Record<string, any> = {};
      if (keepTouched) {
        touchedFields.value.forEach((f) => {
          preserved[f] = terms[f];
        });
      }

      // Fresh baseline (mirrors opening the modal on a spend with no prior results).
      fillSuggested();
      data.spendNewTerms.termsWithCashDiscount = null;
      data.spendNewTerms.cashDiscount = null;
      data.spendNewTerms.vcardAccepted = false;

      const mixed: string[] = [];
      SELECTION_FIELDS.forEach((field) => {
        const d = defaults[field];
        if (!d) return;
        if (d.mixed) {
          setSelectionFieldBlank(field);
          mixed.push(field);
        } else if (d.value !== null && d.value !== undefined) {
          // cashDiscount comes back as a base-1 fraction; the input shows a percent.
          terms[field] =
            field === "cashDiscount" ? Number(d.value) * 100 : d.value;
        }
        // fresh (value null, not mixed) -> keep the suggested baseline set above.
      });

      if (keepTouched) {
        Object.keys(preserved).forEach((f) => {
          terms[f] = preserved[f];
        });
        mixedFields.value = mixed.filter(
          (f) => !touchedFields.value.includes(f),
        );
      } else {
        mixedFields.value = mixed;
        touchedFields.value = [];
      }
    }

    /** Fetch the defaults for the current selection and apply them (or prompt if fields edited). */
    async function applySelectionDefaults() {
      // Only the all-spends tab drives selection pre-fill; single-spend tabs load their own record.
      if (data.selectedTabIndex !== 0) return;

      const ids: string[] = [];
      if (data.selectedItems.length > 0) {
        data.selectedItems.forEach((item: any) => ids.push(item.uuid));
      }

      // Skip redundant fetches (grid paging re-selects rows without changing the logical selection).
      const signature = data.allChecked
        ? `all|${JSON.stringify(data.filterForPatch)}`
        : `ids|${[...ids].sort().join(",")}`;
      if (signature === lastSelectionSignature) return;
      lastSelectionSignature = signature;

      const filters = {
        telerikFilter: convertFiltersToREST(data.filterForPatch),
        targetProgramUuid: StringUtils.removeIRI(props.programUuid),
        currencyRate: appStore.getCurrencyAmount,
      };

      loadingDefaults.value = true;
      let res;
      try {
        res = await getAgreedTermsDefaults(
          data.allChecked ? [] : ids,
          data.allChecked,
          props.companyId,
          filters,
        );
      } finally {
        loadingDefaults.value = false;
      }
      if (!res?.success || !res.data) return;
      const defaults = res.data as Record<
        string,
        { value: any; mixed: boolean }
      >;

      if (touchedFields.value.length > 0) {
        pendingDefaults.value = defaults;
        showEditedPrompt.value = true;
      } else {
        applySelectionDefaultsToForm(defaults, false);
      }
    }

    function scheduleSelectionDefaults() {
      if (selectionDefaultsTimer) clearTimeout(selectionDefaultsTimer);
      selectionDefaultsTimer = setTimeout(() => {
        applySelectionDefaults();
      }, 300);
    }

    function keepEditedValues() {
      if (pendingDefaults.value)
        applySelectionDefaultsToForm(pendingDefaults.value, true);
      pendingDefaults.value = null;
      showEditedPrompt.value = false;
    }

    function loadSelectionValues() {
      if (pendingDefaults.value)
        applySelectionDefaultsToForm(pendingDefaults.value, false);
      pendingDefaults.value = null;
      showEditedPrompt.value = false;
    }
    return {
      ...toRefs(data),
      clearAgreedTermsWithSelectedSpends,
      clearButtonLogicComputed,
      closeModal,
      getVariantGivenIndexAndRating,
      ICON_VARIANTS,
      isViewActive,
      onSelect,
      patchSpendLineFeedback,
      saveAndEditAgreedTerms,
      selectAllRow,
      selectRow,
      markTouched,
      mixedFields,
      mixedFieldLabels,
      showEditedPrompt,
      loadingDefaults,
      keepEditedValues,
      loadSelectionValues,
      setCurrentView,
      setFeedbackLabels,
      setFeedbackRating,
      validateSpendNewTerms,
      VIEWS,
      vCardEnabledFeature,
      scfEnabledFeature,
      moreOption,
      moreOptionsToggle,
      getFiltersAppliedSpends,
      programTabSlot,
      noBelongProgramTabSlot,
    };
  },
});
</script>

<style lang="scss" scoped>
@import "src/resources/assets/styles/variables/colors";
@import "src/resources/assets/styles/variables/dimensions";
@import "src/resources/assets/styles/variables/globals";

.tabstrip-container-up {
  display: flex;
  align-items: center;
  justify-content: space-between !important;
}
.tabstrip-container {
  overflow-x: auto;
  overflow-y: hidden;
  white-space: nowrap !important;
  flex-wrap: nowrap !important;

  &::-webkit-scrollbar {
    height: 0.6rem;
  }

  &::-webkit-scrollbar-thumb {
    border-radius: 10px;
    background-color: $scrollbar-thumb !important;

    &:hover {
      cursor: pointer;
    }
  }
}
:deep(
    #kendo-k-tabstrip-items-entitycard-results
      > .k-tabstrip-items-wrapper
      > .k-tabstrip-items
  ) {
  flex-wrap: nowrap !important;
}
/*** Resets ***/

label,
.form-group {
  margin-bottom: 0;
}

/*** END Resets ***/

/*** Customizations ***/

.btn-outlined {
  padding: 0 30px;
}

.card {
  padding: 0px 15px !important;
}

/*** END Customizations ***/

.card-entity-card__overview {
  min-height: auto;
  height: 300px;

  h6 {
    text-transform: capitalize;
    color: $color-gray-500;
    margin-bottom: 0;
  }

  .card-entity-card__overview-bottom-legend {
    position: absolute;
    bottom: 0;
    left: 0;
    padding: 10px;
    display: flex;
    justify-content: flex-start;
    align-items: center;
    z-index: 15;

    svg {
      fill: $color-green;
      margin-right: 10px;
    }

    .card-entity-card__overview-bottom-legend-title-subtitle {
      span:nth-child(1) {
        color: $color-black;
        margin-right: 5px;
      }

      span:nth-child(2) {
        color: $color-gray-500;
      }
    }
  }

  .card__legend {
    display: flex;
    align-items: center;
    gap: 0.5rem;

    &-circle {
      flex-shrink: 0;
      width: 1.25rem;
      height: 1.25rem;
      border-radius: 50%;
    }
  }

  .card-entity-card__overview-donut-label {
    margin-left: -35px;
    z-index: 97;
    position: absolute;
    width: 100%;
    height: 200px;
    display: flex;
    justify-content: center;
    align-items: center;
  }

  .card-entity-card__overview-center-legend {
    background: #2e9d58;
    color: white;
    position: absolute;
    width: 50px;
    height: 50px;
    display: flex;
    justify-content: flex-end;
    align-items: flex-end;
    border-bottom-right-radius: 4px;
    border-top-left-radius: 40px;
    bottom: 0;
    right: 0;
    z-index: 20;

    h4 {
      margin: 0 5px 5px 0;
      color: white;
    }
  }
}

.specific-feedback {
  margin: 5px;
  border-radius: 25px;
  height: 30px;
  font-size: 0.8em;
  width: auto;
  padding: 10px 15px;
  background: $color-gray-light;
  border: 1px solid $color-gray-500;
  color: $color-gray-500;
  display: flex;
  justify-content: center;
  align-items: center;
  cursor: pointer;
  transition: all ease 0.3s;

  &-active {
    background: $color-red;
    border: 1px solid $color-red;
    color: white;

    &:hover {
      color: white !important;
    }
  }
}

.btn-harmonization-financing-group {
  font-size: 0.8em;
  width: fit-content;
  padding: 0 10px;
  border-radius: 25px;
  height: 30px;
  color: white;
  display: flex;
  justify-content: center;
  align-items: center;
  margin: 5px;

  &:hover {
    color: white !important;
  }
}

.card-body-disabled {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  padding: 20px;
  border-radius: 4px;
  background: rgba(0, 0, 0, 0.8);
  color: white;
  z-index: 97;
  display: flex;
  justify-content: center;
  align-items: center;
  text-align: center;
}

.bold-letter-results {
  font-weight: bolder;
  font-size: 1rem;
}

.dates-box {
  background-color: $color-gray-light;
  padding: 10px 0px;
  border-radius: 5px;

  .dates-text {
    font-weight: bolder;
    font-size: 1rem;
    word-spacing: 1px;
  }
}

.round-box {
  padding: 1px;
  border: 1px solid $color-gray-500;
  border-radius: 15px;
}

.round-box-results {
  padding: 10px 5px;
  border: 1px solid $color-gray-500;
  border-radius: 5px;
}

.icons-plans {
  justify-content: center !important;
}

.col-6.text-right {
  text-align: right;
}

span.bold-letter-results.mt-4 {
  margin-top: 2rem !important;
}

span.bold-letter-results.mt-3 {
  margin-top: 2.5rem !important;
}

.d-flex.flex-column.w-100.align-items-center.round-box {
  text-align: center;
}

.col-3.d-flex.flex-column.align-items-center {
  text-align: center;
}

.tab-disabled {
  pointer-events: none;
  opacity: 0.5;
}
</style>
