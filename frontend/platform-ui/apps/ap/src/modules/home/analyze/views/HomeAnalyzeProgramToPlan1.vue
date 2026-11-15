<template>
<CalculumLayout :containerClass="'wizard-plan'" :containerId="'program-header-menu'">
  <template v-slot:slotContent>
    <CalculumLoading v-if="loading" block="block"></CalculumLoading>
    <div class="row" :class="{'bg-blur': loading}">
      <div class="col">
        <div class="card">
          <div class="card-body py-5">
            <div class="row container-form mb-3">
              <div class="col-xl-6"><span class="text-gray-600 text-base font-semibold">{{ $t('home.plan.programToPlan1.enterPlan') }}</span>
                <div class="row mt-3 d-flex">
                  <div class="col-12">
                    <div class="form-group">
                      <label for="period2">
                        <input class="form-control" id="period2" type="text" name="planTitle" :placeholder="$t('home.plan.programToPlan1.planTitlePlaceHolder')" v-model="planTitle"/><span>{{ $t('home.plan.programToPlan1.planTitle') }}</span>
                      </label>
                    </div>
                    <div class="d-flex flex-column"><span class="text-error-500 text-sm font-normal" v-if="formValidation.nameLength">{{ $t('form.maxCharsPlanName') }}</span><span class="text-error-500 text-sm font-normal" v-if="formValidation.name">{{ $t('form.fieldRequired') }}</span></div>
                  </div>
                </div>
              </div>
              <div class="col-xl-6" v-if="myPrograms.length > 1"><span class="text-gray-600 text-base font-semibold">{{ $t('home.plan.programToPlan1.selectProgram') }}</span>
                <div class="row mt-1 d-flex">
                  <div class="col-12">
                    <Dropdown class="mt-2 mb-2" :data-list="dataListPrograms" @selected-item="handleSelectProgram" :currentOptionSelected="currentProgramSelected" id="selectProgramForPlan" :label="$t('home.plan.programToPlan1.underlyingProgram')" :disabled="planId.length > 0"></Dropdown>
                    <div class="d-flex flex-column"><span class="text-error-500 text-sm font-normal" v-if="formValidation.program">{{ $t('form.fieldRequired') }}                    </span></div>
                  </div>
                </div>
              </div>
            </div>            
            <div class="row container-form">
              <div class="col-12"><span class="text-gray-600 text-base font-semibold">{{ $t('home.plan.programToPlan1.indicateTime') }}</span></div>
            </div>
            <div class="row container-form">
              <div class="col-12 col-sm-12 col-md-12 col-lg-6 col-xl-6">
                <div class="row mt-3 d-flex">
                  <div class="col-12">
                    <div class="form-group">
                      <label for="startDate">
                        <input class="form-control" id="startDate" type="date" name="startDate" v-model="startDate" :min="minStartDate" @click="isCalendarVisible = true" @blur="isCalendarVisible = false" @change="normalizeDates(true)"/><span>{{ $t('home.plan.programToPlan1.starDate') }}</span>
                        <div class="my-date-picker" v-if="isCalendarVisible"><span>ok</span></div>
                      </label>
                    </div>
                    <div class="d-flex flex-column"><span class="text-error-500 text-sm font-normal" v-if="formValidation.startDate">{{ $t('form.fieldRequired') }}                    </span></div>
                  </div>
                </div>
              </div>
              <div class="col-12 col-sm-12 col-md-12 col-lg-6 col-xl-6">
                <div class="row mt-3 d-flex">
                  <div class="col-12">
                    <div class="form-group">
                      <label for="endDate">
                        <input class="form-control" id="endDate" type="date" name="endDate" v-model="endDate" :min="startDate" @change="normalizeDates(false)"/><span>{{ $t('home.plan.programToPlan1.endDate') }}</span>
                      </label>
                    </div>
                    <div class="d-flex flex-column"><span class="text-error-500 text-sm font-normal" v-if="formValidation.endDate">{{ $t('form.fieldRequired') }}                    </span></div>
                  </div>
                </div>
              </div>
            </div>
            <div class="row container-form">
              <div class="col-12 col-sm-12 col-md-12 col-lg-6 col-xl-6">
                <div class="row mt-3 d-flex">
                  <div class="col-12">
                    <Dropdown :data-list="dataListPeriods" @selected-item="(option) => changeSelectPeriod(option.key)" :label="$t('home.plan.programToPlan1.calendarPeriod')" :currentOptionSelected="currentPeriodSelected" id="selectPeriodForPlan"></Dropdown>
                  </div>
                </div>
              </div>
              <div class="col-12 col-sm-12 col-md-12 col-lg-6 col-xl-6">
                <div class="row mt-3 d-flex">
                  <div class="col-12">
                    <div class="form-group">
                      <label for="period">
                        <input class="form-control" id="period" type="text" name="period" placeholder="Enter the period in days" disabled="disabled" v-model="differenceBetweenDateInDays"/><span>{{ $t('home.plan.programToPlan1.period') }}</span>
                      </label>
                    </div>
                    <div class="d-flex flex-column"><span class="text-error-500 text-sm font-normal" v-if="formValidation.period">{{ $t('home.plan.programToPlan1.warnings.periodDay') }}                      </span></div>
                  </div>
                </div>
              </div>
            </div>
            <div class="row container-form mt-3">
              <div class="row row-100">
                <div class="col-12 col-sm-12 col-md-12 col-lg-3 col-xl-2 mb-2 d-flex justify-content-end gap-2">
                  <button class="btn outline-secondary-btn" type="button" @click="Routing.home.plan.openHomePlanAllPlans()">{{ $t('button.cancel') }}</button>
                  <button class="btn btn-primary" type="submit" :disabled="loading" @click="formValidator()">{{ $t('button.save') }}</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </template>
</CalculumLayout>
</template>

<script lang="ts">
import * as Routing from "@/services/router/Routing";
import {
  computed,
  reactive,
  toRefs,
  defineComponent,
  ref,
  onMounted,
  watch,
} from "vue";
import { DatePicker } from "@progress/kendo-vue-dateinputs";
import { isNullOrUndefined, removeIRI, ArrayUtils } from "@/utils";
import { useI18n } from "vue-i18n";
import { useSpendFile } from "@/composables";

import { usePlanStore } from '@/stores/plan'
import * as formatData from "@/utils/FormatData";
import * as Validator from "@/utils/validators";
import { CalculumLayout, CalculumLoading } from '@ada/design-system'

import Dropdown from "@/modules/components/dropdown/Dropdown.vue";
import DateUtils from "@/utils/DateUtils";
import { useToast } from "vue-toastification";
import PlanTimeline from "@/modules/home/plan/components/PlanTimeline.vue";
import { useRouter } from 'vue-router';
import { useAnalyzeStore } from "@/stores/analyze";

export default defineComponent({
  name: "HomeAnalyzeProgramToPlan1",
  components: {

    CalculumLoading,
    PlanTimeline,
    DatePicker,
    CalculumLayout,
    Dropdown,
  },
  props: {
    planId: { type: String, required: false, default: "" },
    programId: { type: String, required: false, default: "" },
    programTarget: { type: String, required: false, default: "" },
  },
  setup(props) {

    const analyzeStore = useAnalyzeStore();
    const planStore = usePlanStore();
    const router = useRouter();
    const toast = useToast();

    const {
      spendFileVersionActiveId,
      spendFileVersionActive,
    } = useSpendFile();

    const translate = useI18n({ warnHtmlMessage: false, useScope: 'global' });

    document.title = translate.t("home.plan.programToPlan1.title");

    const amountInput = ref();

    let setGlobalFilter = "";

    interface HomeAnalyzeProgramToPlan1 {
      dayValueController: number,
      loading: boolean;
      typeOfPrograms: string;
      myPrograms: Array<any>;
      allPrograms: Array<any>;
      spendFiles: Array<any>;
      selectedSpendFile: string | null;
      spendFilesVersions: Array<any>;
      loadingSpendFilesVersions: boolean;
      searchByAuthor: string;
      showOnlyTheMarked: boolean;
      selectProgram: string;
      planTitle: string;
      target: string;
      amountType: boolean;
      amountTypeString: string;
      amount: any;
      amountMax: number;
      startDate: any;
      endDate: any;
      formHasError: boolean;
      formErrorMessage: string;
      dimensionType: string;
      multiDimensionSize: {
        size: number;
        four: boolean;
        nine: boolean;
        twelve: boolean;
      };
      marked: boolean;
      minStartDate: string;
      selectPeriod: string | number;
      calendarPeriods: Array<any>;
      formValidation: {
        name: boolean;
        nameLength: boolean;
        program: boolean;
        target: boolean;
        startDate: boolean;
        endDate: boolean;
        period: boolean;
        targetValidation: boolean;
      };
      enableEditTarget: boolean;
      amountConversion: any;
      isCalendarVisible: boolean;
    }

    const homeAnalyzeProgramToPlan1 = reactive<HomeAnalyzeProgramToPlan1>({
      dayValueController: 0,
      loading: false,
      typeOfPrograms: "myPrograms",
      myPrograms: [], // Holds the list of programs
      allPrograms: [],
      spendFiles: [],
      selectedSpendFile: null,
      spendFilesVersions: [],
      loadingSpendFilesVersions: false,
      searchByAuthor: "",
      showOnlyTheMarked: false,
      selectProgram: "",
      planTitle: "",
      target: "costReduction",
      amountType: true,
      amountTypeString: "max",
      amount: 0,
      amountMax: 0,
      startDate: DateUtils.formatYYYYMMDD(new Date()),
      endDate: DateUtils.formatYYYYMMDD(DateUtils.addDays(new Date(), 1)),
      formHasError: false,
      formErrorMessage: "",
      dimensionType: "dimension_type_single",
      multiDimensionSize: {
        size: 12,
        four: false,
        nine: false,
        twelve: true,
      },
      marked: false,
      minStartDate: new Date().toISOString().split("T")[0],
      selectPeriod: 0,
      calendarPeriods: [
        { title: translate.t("home.plan.programToPlan1.oneWeek"), value: 7 },
        { title: translate.t("home.plan.programToPlan1.twoWeeks"), value: 14 },
        {
          title: translate.t("home.plan.programToPlan1.threeWeeks"),
          value: 21,
        },
        { title: translate.t("home.plan.programToPlan1.oneMonth"), value: 30 },
        { title: translate.t("home.plan.programToPlan1.twoMonths"), value: 60 },
        {
          title: translate.t("home.plan.programToPlan1.oneQuarter"),
          value: 90,
        },
        {
          title: translate.t("home.plan.programToPlan1.threeQuarters"),
          value: 270,
        },
        {
          title: translate.t("home.plan.programToPlan1.halfeYear"),
          value: 182,
        },
        { title: translate.t("home.plan.programToPlan1.oneYear"), value: 365 },
      ],
      formValidation: {
        name: false,
        nameLength: false,
        program: false,
        target: false,
        startDate: false,
        endDate: false,
        period: false,
        targetValidation: false,
      },
      enableEditTarget: false,
      amountConversion: 0,
      isCalendarVisible: false,
    });

    function changeValor() {
      if (Number(homeAnalyzeProgramToPlan1.amountConversion)) {
        homeAnalyzeProgramToPlan1.formValidation.target = false;
        if (
          Number(homeAnalyzeProgramToPlan1.amountConversion) >
          homeAnalyzeProgramToPlan1.amountMax
        ) {
          homeAnalyzeProgramToPlan1.formValidation.targetValidation = true;
          homeAnalyzeProgramToPlan1.amountConversion =
            formatData.getNumberWithDecimals(
              homeAnalyzeProgramToPlan1.amount,
              1,
            );
        } else {
          homeAnalyzeProgramToPlan1.formValidation.targetValidation = false;
          homeAnalyzeProgramToPlan1.amount =
            homeAnalyzeProgramToPlan1.amountConversion;
          homeAnalyzeProgramToPlan1.amountConversion =
            formatData.getNumberWithDecimals(
              homeAnalyzeProgramToPlan1.amount,
              1,
            );
        }
      } else {
        homeAnalyzeProgramToPlan1.formValidation.target = true;
      }
    }

    function clearErrors() {
      homeAnalyzeProgramToPlan1.formHasError = false;
    }

    /**
     * Creates a new plan
     */
    function createPlan() {
      // Validate
      if (isNullOrUndefined(spendFileVersionActive.value)) {
        if (import.meta.env.DEV)
          console.error(
            "** (createPlan) spendFileVersionActive is null or undefined.",
          );

        return;
      }

      // Enable loading
      homeAnalyzeProgramToPlan1.loading = true;

      const params = {
        program: homeAnalyzeProgramToPlan1.selectProgram,
        title: homeAnalyzeProgramToPlan1.planTitle,
        target: homeAnalyzeProgramToPlan1.target,
        amountType: homeAnalyzeProgramToPlan1.amountTypeString,
        amount: formatData.changeToUSD(homeAnalyzeProgramToPlan1.amount),
        startDate: homeAnalyzeProgramToPlan1.startDate,
        endDate: homeAnalyzeProgramToPlan1.endDate,
        marked: false,
        //period: homeAnalyzeProgramToPlan1.selectPeriod,
        period: Math.max(differenceBetweenDateInDays.value, 1),
        automateMultiDimensionPhases:
          homeAnalyzeProgramToPlan1.multiDimensionSize.size,
        dimensionType: homeAnalyzeProgramToPlan1.dimensionType,
        callbackSuccess: (callbackSuccessData: any) => {
            
          homeAnalyzeProgramToPlan1.loading = false;
          toast.success(translate.t("home.plan.planCreated"))          
          router.push({
            name: Routing.home.plan.homeHomePlanV2,
            query: {
              planId: removeIRI(callbackSuccessData["@id"]),
            }
          });            
        },
        callbackError: (callbackSuccessData: any) => {
          toast.error("ERROR creating plan")
          homeAnalyzeProgramToPlan1.formErrorMessage = callbackSuccessData.data[
            "hydra:description"
          ].replace("name: ", "");
          homeAnalyzeProgramToPlan1.formHasError = true;
          homeAnalyzeProgramToPlan1.loading = false;
          toast.error(homeAnalyzeProgramToPlan1.formErrorMessage);
        },
      };
      planStore.postPlan(params);
    }

    /**
     * Updates form validation state based on current form values
     */
    function updateFormValidation() {
      homeAnalyzeProgramToPlan1.formValidation.name = !Validator.isValidString(homeAnalyzeProgramToPlan1.planTitle);
      homeAnalyzeProgramToPlan1.formValidation.nameLength = Validator.isValidString(homeAnalyzeProgramToPlan1.planTitle) 
        ? !Validator.isValidLength(homeAnalyzeProgramToPlan1.planTitle)
        : false;
      homeAnalyzeProgramToPlan1.formValidation.program = !Validator.isValidString(homeAnalyzeProgramToPlan1.selectProgram);
      homeAnalyzeProgramToPlan1.formValidation.startDate = 
        homeAnalyzeProgramToPlan1.startDate === null ||
        !Validator.isValidString(homeAnalyzeProgramToPlan1.startDate);
      homeAnalyzeProgramToPlan1.formValidation.endDate = 
        homeAnalyzeProgramToPlan1.endDate === null ||
        !Validator.isValidString(homeAnalyzeProgramToPlan1.endDate);
      homeAnalyzeProgramToPlan1.formValidation.period = 
        homeAnalyzeProgramToPlan1.dimensionType === "dimension_type_single" &&
        differenceBetweenDateInDays.value <= 2;
      homeAnalyzeProgramToPlan1.formValidation.target = 
        homeAnalyzeProgramToPlan1.amount > homeAnalyzeProgramToPlan1.amountMax;
    }

    function formValidator() {
      updateFormValidation();
      if (!messageError.value || homeAnalyzeProgramToPlan1.loading) {
        homeAnalyzeProgramToPlan1.formHasError = true;
        toast.error(translate.t("form.reviewfields"));
        return;
      }
      if (props.planId.length === 0) {
        createPlan();
      } else {
        patchPlan();
      }
    }

    /**
     * Retrieves programs from the API
     */
    function getMyPrograms() {
      homeAnalyzeProgramToPlan1.loading = true;
      const params = {
        scope: "all",
        marked: homeAnalyzeProgramToPlan1.showOnlyTheMarked,
        firstName: homeAnalyzeProgramToPlan1.searchByAuthor,
        lastName: homeAnalyzeProgramToPlan1.searchByAuthor,
        spendFileVersion: spendFileVersionActiveId.value,
        callbackSuccess: (response: any) => {
          homeAnalyzeProgramToPlan1.myPrograms = response;

          // If there is only one program select it
          if (homeAnalyzeProgramToPlan1.myPrograms.length === 1) {
            homeAnalyzeProgramToPlan1.selectProgram =
              homeAnalyzeProgramToPlan1.myPrograms[0]["@id"];
          }

          // If there is at a least one plan, get the plan data
          if (props.planId.length > 0) {
            getPlanData();
          }

          // There is no plan
          // Disable the loading
          homeAnalyzeProgramToPlan1.loading = false;
        },
        callbackError: () => {
          // Disable loading
          homeAnalyzeProgramToPlan1.loading = false;
        },
      };

      analyzeStore.fetchAllPrograms(params);
    }

    function getPlanData() {
      const params = {
        planId: "/api/plans/" + props.planId,
        callbackSuccess: (callbackSuccessData: any) => {
          homeAnalyzeProgramToPlan1.selectProgram =
            callbackSuccessData.program["@id"];
          homeAnalyzeProgramToPlan1.amountType =
            callbackSuccessData.amountType === "max";
          homeAnalyzeProgramToPlan1.amountTypeString = "max";
          // we need convert currency here because is a get request, we don't send the currency rate
          homeAnalyzeProgramToPlan1.amount = formatData.changeToCurrency(
            parseFloat(callbackSuccessData.amount),
          );
          homeAnalyzeProgramToPlan1.amountConversion =
            formatData.getNumberWithDecimals(
              homeAnalyzeProgramToPlan1.amount,
              1,
            );
            // we need convert currency here because is a get request, we don't send the currency rate
          homeAnalyzeProgramToPlan1.amountMax = formatData.changeToCurrency(
            callbackSuccessData.amount,
          );
          homeAnalyzeProgramToPlan1.startDate =
            callbackSuccessData.startDate.substr(0, 10);
          homeAnalyzeProgramToPlan1.endDate =
            callbackSuccessData.endDate.substr(0, 10);
          homeAnalyzeProgramToPlan1.planTitle = callbackSuccessData.title;
          homeAnalyzeProgramToPlan1.dimensionType =
            callbackSuccessData.dimensionType;
          homeAnalyzeProgramToPlan1.marked = callbackSuccessData.marked;
          homeAnalyzeProgramToPlan1.selectPeriod = callbackSuccessData.period;
          homeAnalyzeProgramToPlan1.loading = false;
        },
        callbackError: () => {
          // Disable loading
          homeAnalyzeProgramToPlan1.loading = false;
        },
      };
      planStore.getPlan(params);
    }

    function getProgramPotentialCashFlow() {
      homeAnalyzeProgramToPlan1.loading = true;

      const params = {
        programId: homeAnalyzeProgramToPlan1.selectProgram,
        globalFilter: setGlobalFilter,
        targetSpendFileVersionUuid: spendFileVersionActiveId.value,
        fullDisabled: false,
        callbackSuccess: (response: any) => {
          if (props.programId) {
            homeAnalyzeProgramToPlan1.amount = formatData.changeToCurrency(
              response.potentialCashFlow,
            );
            homeAnalyzeProgramToPlan1.amountConversion =
              formatData.getNumberWithDecimals(
                homeAnalyzeProgramToPlan1.amount,
                1,
              );
              // we need convert currency here because is a get request, we don't send the currency rate
            homeAnalyzeProgramToPlan1.amountMax = formatData.changeToCurrency(
              response.potentialCashFlow,
            );
            homeAnalyzeProgramToPlan1.loading = false;
          } else {
            const cfToFixed = response.potentialCashFlow != null 
              ? Number(response.potentialCashFlow.toFixed(2))
              : 0;
            // we need convert currency here because is a get request, we don't send the currency rate
            homeAnalyzeProgramToPlan1.amount =
              formatData.changeToCurrency(cfToFixed);
            homeAnalyzeProgramToPlan1.amountConversion =
              formatData.getNumberWithDecimals(
                homeAnalyzeProgramToPlan1.amount,
                1,
              );
            // we need convert currency here because is a get request, we don't send the currency rate
            homeAnalyzeProgramToPlan1.amountMax =
              formatData.changeToCurrency(cfToFixed);
            homeAnalyzeProgramToPlan1.loading = false;
          }
        },
        callbackError: () => {
          // Disable loading
          homeAnalyzeProgramToPlan1.loading = false;
        },
      };
      analyzeStore.getProgramPotentialsPost(params);
    }

    function normalizeDates(isChangedStartDate = false) {
  if (isChangedStartDate && homeAnalyzeProgramToPlan1.selectPeriod) {
    homeAnalyzeProgramToPlan1.endDate = DateUtils.formatYYYYMMDD(DateUtils.addDays(homeAnalyzeProgramToPlan1.startDate, Number(homeAnalyzeProgramToPlan1.selectPeriod)));
  } else {
    homeAnalyzeProgramToPlan1.selectPeriod = 0;
    homeAnalyzeProgramToPlan1.dayValueController = 0;
  }

  if (
    homeAnalyzeProgramToPlan1.startDate !== null &&
    homeAnalyzeProgramToPlan1.endDate !== null
  ) {
    if (DateUtils.isAfter(homeAnalyzeProgramToPlan1.startDate, homeAnalyzeProgramToPlan1.endDate)) {
      homeAnalyzeProgramToPlan1.endDate = homeAnalyzeProgramToPlan1.startDate;
    }

    // Calculate the difference in days between startDate and endDate
    const diffInDays = DateUtils.diffInDays(homeAnalyzeProgramToPlan1.startDate, homeAnalyzeProgramToPlan1.endDate);

    // Check if the date difference matches a predefined period from dateHelper
    const matchedPeriod = dateHelper(diffInDays);

    if (matchedPeriod.key !== 0) {
      // If a valid period is found, update dayValueController
      homeAnalyzeProgramToPlan1.dayValueController = matchedPeriod.key;
    } else {
      // If no match is found, set to manual
      homeAnalyzeProgramToPlan1.dayValueController = 0;
    }
  }
}


    function patchPlan() {
      homeAnalyzeProgramToPlan1.loading = true;
      const params = {
        planId: "/api/plans/" + props.planId,
        marked: homeAnalyzeProgramToPlan1.marked,
        target: homeAnalyzeProgramToPlan1.target,
        title: homeAnalyzeProgramToPlan1.planTitle,
        amountType: homeAnalyzeProgramToPlan1.amountTypeString,
        amount: formatData.changeToUSD(homeAnalyzeProgramToPlan1.amount),
        startDate: homeAnalyzeProgramToPlan1.startDate,
        endDate: homeAnalyzeProgramToPlan1.endDate,
        dimensionType: homeAnalyzeProgramToPlan1.dimensionType,
        //period: homeAnalyzeProgramToPlan1.selectPeriod,
        period: differenceBetweenDateInDays.value.toString(),
        callbackSuccess: () => {
          toast.success(translate.t("global.successUpdatingPlan"))
          router.push({ 
            name: Routing.home.plan.homeHomePlanV2,          
            query: {
              planId: removeIRI(props.planId),
            }
          });
          
          homeAnalyzeProgramToPlan1.loading = false;
        },
        callbackError: () => {
          // Disable loading
          toast.error("ERROR updating plan")
          homeAnalyzeProgramToPlan1.loading = false;
        },
      };
      planStore.patchPlan(params);
    }

    function selectDimensionSize(size: number) {
      homeAnalyzeProgramToPlan1.multiDimensionSize.size = size;
      if (size === 4) {
        homeAnalyzeProgramToPlan1.multiDimensionSize.four = true;
        homeAnalyzeProgramToPlan1.multiDimensionSize.nine = false;
        homeAnalyzeProgramToPlan1.multiDimensionSize.twelve = false;
      } else if (size === 9) {
        homeAnalyzeProgramToPlan1.multiDimensionSize.four = false;
        homeAnalyzeProgramToPlan1.multiDimensionSize.nine = true;
        homeAnalyzeProgramToPlan1.multiDimensionSize.twelve = false;
      } else if (size === 12) {
        homeAnalyzeProgramToPlan1.multiDimensionSize.four = false;
        homeAnalyzeProgramToPlan1.multiDimensionSize.nine = false;
        homeAnalyzeProgramToPlan1.multiDimensionSize.twelve = true;
      }
    }


    function changeSelectPeriod(days: number) {
      homeAnalyzeProgramToPlan1.dayValueController = days
      if (homeAnalyzeProgramToPlan1.startDate && days !== 0) {
        homeAnalyzeProgramToPlan1.endDate = DateUtils.formatYYYYMMDD(DateUtils.addDays(homeAnalyzeProgramToPlan1.startDate, days));
      }
    }

    function focusAmountInput() {
      amountInput.value && amountInput.value.focus();
    }

    // *** Setup ***
    getMyPrograms();

    // *** On Mounted ***
    onMounted(() => {
      homeAnalyzeProgramToPlan1.enableEditTarget = !!props.planId;

      if (props.programId) {
        homeAnalyzeProgramToPlan1.selectProgram = props.programId;
        getProgramPotentialCashFlow();
      }
    });

    // *** Computed ***
    const messageError = computed(() => {
      const validations = [
        !Validator.isValidString(homeAnalyzeProgramToPlan1.planTitle) ||
          !Validator.isValidLength(homeAnalyzeProgramToPlan1.planTitle),
        !Validator.isValidString(homeAnalyzeProgramToPlan1.selectProgram),
        homeAnalyzeProgramToPlan1.startDate === null ||
          !Validator.isValidString(homeAnalyzeProgramToPlan1.startDate),
        homeAnalyzeProgramToPlan1.endDate === null ||
          !Validator.isValidString(homeAnalyzeProgramToPlan1.endDate),
        homeAnalyzeProgramToPlan1.dimensionType === "dimension_type_single" &&
          differenceBetweenDateInDays.value <= 2,
        homeAnalyzeProgramToPlan1.amount > homeAnalyzeProgramToPlan1.amountMax,
      ];

      return !validations.some((isInvalid) => isInvalid);
    });

    const differenceBetweenDateInDays = computed(() => {
      if (
        homeAnalyzeProgramToPlan1.startDate !== null &&
        homeAnalyzeProgramToPlan1.endDate !== null
      ) {
        return DateUtils.diffInDays(homeAnalyzeProgramToPlan1.startDate, homeAnalyzeProgramToPlan1.endDate);
      } else {
        return 0;
      }
    });
    // *** END Computed ***

    // *** Watchers ***
    watch(
      () => homeAnalyzeProgramToPlan1.selectProgram,
      () => {
        getProgramPotentialCashFlow();
      },
    );
    // *** END Watchers ***

    const notRecalculatingAndNotPending = computed(() => {
      return homeAnalyzeProgramToPlan1.myPrograms.filter((program: any) => {
        return (
          program.recalculationInProgress === false &&
          program.pendingRecalculation === false
        );
      });
    });

    const dataListPrograms = computed(() => {
      return ArrayUtils.createKeyPairs(notRecalculatingAndNotPending.value, "@id", "name");
    });

    const currentProgramSelected = computed(() => {
      return homeAnalyzeProgramToPlan1.selectProgram;
    });

  
    function dateHelper(val: any) {
        switch (val) {
          case 7:
            return { key: 7, value: translate.t("home.plan.programToPlan1.oneWeek") }
          case 14:
            return { key: 14, value: translate.t("home.plan.programToPlan1.twoWeeks") }
          case 21:
            return { key: 21, value: translate.t("home.plan.programToPlan1.threeWeeks") }
          case 30:
            return { key: 30, value: translate.t("home.plan.programToPlan1.oneMonth") }
          case 60:
            return { key: 60, value: translate.t("home.plan.programToPlan1.twoMonths") }
          case 90:
            return { key: 90, value: translate.t("home.plan.programToPlan1.threeMonths") }
          case 182:
              return { key: 182, value: translate.t("home.plan.programToPlan1.halfeYear") }
          case 270:
              return { key: 270, value: translate.t("home.plan.programToPlan1.threeQuarters") }
          case 365:
              return { key: 365, value: translate.t("home.plan.programToPlan1.oneYear") }
          default:
              return { key: 0, value: translate.t("global.manual") }    
        }
    }

    const currentPeriodSelected = computed(() => {
      let currentPeriod = dateHelper(homeAnalyzeProgramToPlan1.dayValueController);
      return currentPeriod?.key ?? "Manual";
    });

    const dataListPeriods = computed(() => {
      // Define the manual entry
      let manualEntry = {
        key: 0,
        value: translate.t("global.manual"),
      };

      // Map calendar periods to the desired format
      let periods = homeAnalyzeProgramToPlan1.calendarPeriods.map(
        (period: any) => ({
          key: period.value,
          value: period.title,
        }),
      );

      // Add the manual entry to the start of the periods array
      return [manualEntry, ...periods];
    });

    function handleSelectProgram(program: { key: string; value: string }) {
      homeAnalyzeProgramToPlan1.selectProgram = program.key;
    }

    function handleSelectedPeriod(period: { key: string; value: number }) {
      homeAnalyzeProgramToPlan1.selectPeriod = period.key;
      changeSelectPeriod(period.value);
    }

    return {
      ...toRefs(homeAnalyzeProgramToPlan1),
      changeSelectPeriod,
      changeValor,
      clearErrors,
      createPlan,
      currentPeriodSelected,
      currentProgramSelected,
      dataListPeriods,
      dataListPrograms,
      differenceBetweenDateInDays,
      focusAmountInput,
      formatData,
      formValidator,
      getMyPrograms,
      getProgramPotentialCashFlow,
      handleSelectedPeriod,
      handleSelectProgram,
      messageError,
      normalizeDates,
      notRecalculatingAndNotPending,
      Routing,
      selectDimensionSize,
    };
  },
});
</script>

<style lang="scss" scoped>
@import "src/resources/assets/styles/variables/colors";

.card {
  padding: 0;
  margin-bottom: 16px;
  width: 100%;
}

.card-body {
  padding: 24px 24px 16px;
}

.row.container-form {
  width: 80%;
  margin: 0px auto;
}

.buttons-footer {
  display: flex;
  flex-direction: row;
  justify-content: flex-end;
  align-items: flex-start;
  padding: 0px;
  gap: 32px;
  width: 100%;
  height: 36px;
  flex: none;
  order: 1;
  flex-grow: 0;
}

.phase-cube-4 {
  width: 10px;
  height: 10px;
  border-radius: 4px;
  margin: 2px;
  background: $color-black;
}

.custom-form-group {
  .disabled-label {
    background-color: #e9ecef;
  }

  label {
    border: 1px solid #2c3645;
    border-radius: 0.25rem;
    padding: 0 0.75rem;
    position: static;
  }

  input {
    border: none;
    padding: 1.25rem 0 0.375rem;
    margin-left: auto;
    width: 2px;
    z-index: 10;
    color: #fff;
    caret-color: #000;
  }

  p {
    left: 0;
    right: 0;
    position: absolute;
    padding: 1.25rem 1rem 0.75rem;
    height: 4rem;
    text-align: right;
    overflow: hidden;
    width: 100%;
    display: flex;
    align-items: flex-end;
    justify-content: flex-end;
  }
}

/** Reset some classes in form groups */

.form-group {
  margin-bottom: 0 !important;
}

input::-webkit-datetime-edit-day-field:focus,
input::-webkit-datetime-edit-month-field:focus,
input::-webkit-datetime-edit-year-field:focus {
  background-color: $button-bg-primary;
  color: white;
  outline: none;
}

input::-webkit-calendar-picker-indicator {
  background-image: url("@/resources/assets/images/icons/calendar.svg") !important;
}

/* Styles for the calendar popup */
.my-date-picker {
  position: absolute;
  background-color: #ffffff;
  /* Replace with your desired background color */
  /* Other styles */
}

/* Styles for the selected day */
.my-date-picker td.is-selected {
  background-color: #ff0000;
  /* Replace with your desired background color */
  /* Other styles */
}

.k-calendar .k-calendar-td.k-selected {
  background-color: red;
}
</style>
