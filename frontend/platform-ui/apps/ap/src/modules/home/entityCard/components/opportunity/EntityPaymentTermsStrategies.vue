<template>
<StrategiesSkeleton v-if="!isLoadingComputed">loading</StrategiesSkeleton>
<div class="d-flex container-terms position-relative" v-else>
  <div class="charts-side d-flex flex-column" id="termsbars">
    <div class="payment-terms-header"><span class="text-base font-semibold">{{ $t('global.paymentTerms') + ' (days)' }}
        <CalculumTooltipIcon :infoText="$t('global.averageTooltip')" :advancedTooltipClass="true" :uniqueIdentifier="'program-payment-terms'" :keyPopOver="'programPaymentTerms'"></CalculumTooltipIcon></span>
      <div class="scf-badge rounded-sm border cursor-pointer" v-if="useFeatureKeepHistoricalData">
        <div class="d-flex align-items-center justify-content-center cursor-pointer" @click="toggleShowPTHistory"><span class="h-6 font-bold mr-4">{{ $t(hideShowPTHistory ? 'global.hidePTHistory':'global.showPTHistory') }}</span>
          <IconChartLine :color="showColor"></IconChartLine>
        </div>
      </div>
      <div class="scf-badge rounded-xl border-0 text-gray-400 bg-gray-100" v-if="showBadgeSCF.onSCF"><span class="h-6 font-medium">{{ $t('global.currentlyOnSCF') }}</span></div>
      <div class="scf-badge rounded-xl border-0 text-gray-400 bg-gray-100" v-if="showBadgeSCF.scfAccepted"><span class="h-6 font-medium">{{ $t('global.scfAccepted') }}      </span></div>
      <div class="scf-badge rounded-xl border-0 text-gray-400 bg-gray-100" v-if="showBadgeSCF.scfRemoved"><span class="h-6 font-medium">{{ $t('global.scfRemoved') }}</span></div>
    </div>
    <EntityTermsChartLine v-for="(paymentTerm) in paymentTermsComputed" @changeLine="changeLine" @add-results-shortcut="$emit('add-results-shortcut')" @btn-shortcut-clicked="$emit('chart-line-btn-shortcut-clicked', paymentTerm.key)" :active="strategyChecked === paymentTerm.key" :barSize="setBarSize(paymentTerm.terms ?? 0)" :chartName="paymentTerm.key" :paymentCycleFloat="paymentTerm?.paymentCycleFloat ?? 0" :barColor="PaymentTermsStrategiesUtils.getColorByStrategyKey(paymentTerm.key, { strategies, paymentTerms })" :title="getTitle(paymentTerm)" :subtitle="getSubTitle(paymentTerm)" :tooltipText="$t('home.entityCard.strategies.' + paymentTerm.key + 'Tooltip')" :usedStrategy="true" :value="paymentTerm.terms" :btnShortcutLabel="getBtnShortcutLabel(paymentTerm.key)" :hasTargetBeenApplied="hasTargetTermsAppliedComputed" :hasAgreedBeenApplied="agreedtermsAppliedComputed" :isCapped="paymentTerm.isCapped" :strategyKey="paymentTerm.key" :programIsRecalculating="programIsRecalculating" :terms="paymentTerms" :paymentTermsDescriptions="paymentTermsDescriptions"></EntityTermsChartLine><span class="text-base font-semibold mt-1" v-if="!isFullExcluded">{{ $t('global.paymentTermsStrategies') }}
      <CalculumTooltipIcon :infoText="$t('global.paymentTermsStrategiesTooltip')" :advancedTooltipClass="true" :uniqueIdentifier="'entity-payment-terms-strategies'" :keyPopOver="'entityPaymentTermsStrategies'"></CalculumTooltipIcon></span>
    <EntityTermsChartLine v-if="!isFullExcluded" v-for="strategy in usedStrategies" @changeLine="changeLine" :active="strategyChecked === strategy.key" :barColor="strategy.color" :barSize="setBarSize(strategy.terms)" :chartName="strategy.key" :title="$t('home.entityCard.strategies.' + strategy.key)" :subtitle="getStrategySubTitle(strategy)" :tooltipText="$t('home.entityCard.strategies.' + strategy.key + 'Tooltip')" :usedStrategy="true" :value="strategy.terms" :data="strategy"></EntityTermsChartLine>
    <div class="row row-100" v-if="!isFullExcluded">
      <div class="col-12 d-flex align-items-center justify-content-center">
        <CustomChartLegend :legendItems="legendItemsArray"></CustomChartLegend>
      </div>
    </div>
    <div class="row d-flex align-items-baseline justify-content-between mt-1 unused-div" v-if="!isFullExcluded">
      <div class="col-12"><span class="text-base font-semibold cursor-pointer" @click="showUnused = !showUnused, fnTermsHeight()">{{ $t('global.unusedStrategies') }}</span>
        <CalculumTooltipIcon :infoText="$t('global.unusedStrategiesTooltip')" :advancedTooltipClass="true" :uniqueIdentifier="'entity-unused-strategies'" :keyPopOver="'entityUnusedStrategies'"></CalculumTooltipIcon>
        <CalculumChevronDown class="mr-2 unused-strategy-svg cursor-pointer" v-if="!showUnused" @click="showUnused = !showUnused, fnTermsHeight()"></CalculumChevronDown>
        <CalculumChevronUp class="mr-2 unused-strategy-svg cursor-pointer" v-if="showUnused" @click="showUnused = !showUnused, fnTermsHeight()"></CalculumChevronUp>
      </div>
    </div>
    <div class="row" :class="showUnused ? 'show-unused' : 'hide-unused'" v-if="!isFullExcluded">
      <EntityTermsChartLine v-for="strategy in unusedStrategies" @changeLine="changeLine" :active="strategyChecked === strategy.key" :barColor="PaymentTermsStrategiesUtils.getColorByStrategyKey(strategy.key, { strategies, paymentTerms })" :barSize="setBarSize(strategy.terms)" :chartName="strategy.key" :disabled="strategy.isAllowed" :title="$t('home.entityCard.strategies.' + strategy.key)" :subtitle="getStrategySubTitle(strategy)" :tooltipText="$t('home.entityCard.strategies.' + strategy.key + 'Tooltip')" :usedStrategy="false" :value="strategy.terms" :strategyKey="strategy.key" :programIsRecalculating="programIsRecalculating"></EntityTermsChartLine>
    </div>
    <div class="row row-100">
      <div class="col-12">
        <div class="axis-x-days ml-10 mr-1 pt-2 d-flex justify-content-between"><span class="text-gray-400" v-for="daysNumber in [0, 20, 40, 60, 80, 100, 120, 140, 160, 180]" :key="daysNumber">{{ daysNumber }}</span></div>
      </div>
    </div>
    <div class="row row-100">
      <div class="col-12 d-flex justify-content-center"><span class="text-gray-400">{{ $t('global.days') }}</span></div>
    </div>
  </div>
  <div class="info-side show-scroll" :style="`--height: ${getTermsHeight};`">
    <div class="row d-flex align-items-baseline justify-content-between mb-3">
      <div class="col-10 d-flex cursor-pointer" v-if="!hideShowPTHistory">
        <CalculumChevronLeft class="mr-3" v-if="strategyChecked !== 'snapshot'" @click="strategyChecked = 'snapshot'" data-testid="back-button"></CalculumChevronLeft><span class="text-base font-semibold text-gray-700 cursor-pointer" :id="strategyChecked">{{ isPotentialEntity && strategyChecked === 'currentTerms' ? $t('home.entityCard.strategies.estimatedTerms') : titleOfStrategies }}
          <CalculumTooltipIcon :infoText="strategyCheckedTooltip" :advancedTooltipClass="validateTooltipSettings(strategyChecked)" :uniqueIdentifier="'entity-strategies-bars-right-side-' + strategyChecked" :keyPopOver="strategyChecked" :key="keyTooltip"></CalculumTooltipIcon></span>
      </div>
      <div class="col-10 d-flex cursor-pointer" v-if="hideShowPTHistory">       <span class="text-base font-semibold text-gray-700 cursor-pointer" id="payment-terms-history">{{ $t('global.paymentTermsHistory') }}         </span></div>
      <div class="col-2 cursor-pointer d-flex disabled-button" v-if="showDisabledButton && allowDisableStrategy && !programIsRecalculating && !spendFileInrecalculation">
        <label class="rounded-checkbox">
          <input class="styled-checkbox" type="checkbox" @change="changeData" v-model="strategyStatus"/><span class="checkmark-disabled" :class="{ 'disabled-radio': !strategyStatus }">&nbsp;        </span>
        </label><span class="text-sm text-gray-600 text-check" v-if="strategyStatus" @click="clickChangeData">{{ $t('global.enabled') }}</span><span class="text-sm text-gray-400 text-check" v-else @click="clickChangeData">{{ $t('global.disabled') }}</span>
      </div>
      <!-- Close button (X)-->
      <div class="col-2 text-right cursor-pointer" @click="strategyChecked = 'snapshot'" :class="{ 'hide-close': showDisabledButton && allowDisableStrategy, 'hide-snapshot-close': strategyChecked === 'snapshot' }">
        <CalculumClose class="mt-2" @click="strategyChecked = 'snapshot'" data-testid="close-button"></CalculumClose>
      </div>
    </div>
    <StrategiesComponent v-if="adaBot && !hideShowPTHistory" @show-results="$emit('show-results')" @update-feedback="$emit('update-feedback')" @changeLine="changeLine" @changeTab="changeTab" @changeGroups="sendGroups" @save="handleStrategyConfigSave" :adabot="adaBot[strategyChecked]" :data="getDataForStrategyComputed || {}" :key="keyCharts" :hide-controls="hideControls" :buyerLeverageDistributionString="buyerLeverageDistribution" :allowEditVariables="allowEditVariablesComputed" :entityUuid="companyId" :configId="configId" :levelType="levelType"></StrategiesComponent>
    <div class="d-flex flex-column gap-10" v-if="hideShowPTHistory">
      <div class="chart-combo-container">
        <BarLineChart :chartData="chartVolumeHistoryData"></BarLineChart>
      </div>
      <div class="list-historical-container">
        <ListHistorical :historical-data="historicalTableData"></ListHistorical>
      </div>
    </div>
    <div class="row" v-if="strategyChecked === 'agreedNewTerms' && (feedbackRating || feedbackLabels?.length > 0)">
      <div class="col-12">
        <div class="card min-h-auto">
          <div class="card-body">
            <div class="row mb-2">
              <div class="col-12">
                <div class="d-flex align-items-center justify-content-center"><span class="mr-4 text-4xl font-semibold">{{ feedbackRating + ".0" }}</span>
                  <Star class="mx-1" v-for="index in feedbackRating" :key="index" :variant="'solid'" :classes="['h-5 fill-current animate__animated animate__fadeIn animate__faster']"></Star>
                </div>
              </div>
            </div>
            <div class="row mb-4">
              <div class="col-12 d-flex justify-content-center"><span>{{ $t('home.entityCard.results.overallResults') }}</span></div>
            </div>
            <div class="row">
              <div class="col-12">
                <div class="d-flex flex-wrap justify-content-center"><span class="specific-feedback specific-feedback-active animate__animated animate__fadeIn animate__faster" v-for="item in feedbackLabels">{{ item }}</span></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div><span>{{ fnTermsHeight() }}</span>
  </div>
</div>
</template>

<script lang="ts">
import {
  reactive,
  toRefs,
  computed,
  onMounted,
  defineComponent,
  watch,
} from "vue";

// Types
import type {
  PaymentTermsOpportunityAPIResponse,
  PaymentTermsOpportunityStrategiesAPIResponse,
  PaymentTermsOpportunityTermsAPIResponse,
  PaymentTermsVolumeHistoryAPIResponse,
  PaymentTermsVolumeHistoryRawAPIResponse,
  PaymentTermsVolumeHistoryTableRow,
} from "@/modules/home/entityCard/types";
import type { HistoricalRecord } from "./ListHistorical.vue";
import type { PaymentTermKey } from "@/types";

// Utils
import {
  isNullOrUndefined,
  ObjectUtils,
  PaymentTermsStrategiesUtils,
  StringUtils,
  ColorsUtils,
} from "@/utils";

import { useI18n } from "vue-i18n";
import { useEntityCardStore } from "@/stores/entityCard";
import * as colorsGroups from "@/utils/ColorsGroups";
import * as Routing from "@/services/router/Routing";
import CalculumChevronDown from "@/modules/components/CalculumChevronDown.vue";
import CalculumChevronLeft from "@/modules/components/CalculumChevronLeft.vue";
import CalculumChevronUp from "@/modules/components/CalculumChevronUp.vue";
import CalculumClose from "@/modules/components/CalculumClose.vue";
import CalculumTooltipIcon from "@/modules/components/CalculumTooltipIcon.vue";
import EntityTermsChartLine from "./EntityTermsChartLine.vue";
import { useToast } from "vue-toastification";
import Star from "@/resources/assets/images/icons/Star.vue";
import StrategiesComponent from "./StrategiesComponent.vue";
import StrategiesSkeleton from "@/modules/home/components/skeletons/StrategiesSkeleton.vue";
import { useSpendFile,useUser } from "@/composables";
import { useSubscribeStore } from "@/stores/subscribe";
import { CustomChartLegend } from "@ada/design-system";
import IconChartLine from "@/modules/home/entityCard/components/icons/IconChartLine.vue";
import BarLineChart from "./BarLineChart.vue";
import ListHistorical from "./ListHistorical.vue";
import { useUserStore } from "@/stores/user";

export default defineComponent({
  name: "EntityPaymentTermsStrategies",
  components: {
    CalculumChevronDown,
    CalculumChevronLeft,
    CalculumChevronUp,
    CalculumClose,
    CalculumTooltipIcon,
    EntityTermsChartLine,
    CustomChartLegend,
    Star,
    StrategiesComponent,
    StrategiesSkeleton,
    IconChartLine,
    BarLineChart,
    ListHistorical,
  },
  props: {
    companyId: { type: String, required: false, default: null },
    configId: { type: String, required: true },
    onSCF: { type: Boolean, required: false, default: null },
    scfAccepted: { type: Boolean, required: false, default: null },
    feedbackLabels: { type: Array, default: () => null },
    feedbackRating: { type: Number, default: 0 },
    levelType: { type: String, required: false, default: null },
    levelTypeForStrategies: { type: String, required: false, default: null },
    selectedProgramUri: { type: String, required: false, default: null },
    paymentTermsTargetTrackingNumber: { type: Number, default: 0 },
    programIsRecalculating: { type: Boolean, default: false },
    hideControls: { type: Boolean, default: false },
    buyerLeverageDistribution: { type: String, required: false, default: null },
    paymentTermsDescriptions: { type: String, default: () => "" },
  },
  emits: [
    "show-strategies",
    "show-results",
    "update-feedback",
    "reload-apis",
    "add-results-shortcut",
    "chart-line-btn-shortcut-clicked",
    "payment-terms-target-changed",
    "change-groups",
    "set-exists-target",
    "set-exists-agreed",
    "set-exists-opportunity",
    "changeTab",
    "get-vcard-value",
    "get-vcard-terms",
    "get-opportunity-terms",
  ],
  setup(props, { emit }) {
    const entityCardStore = useEntityCardStore();
    const userStore = useUserStore();
    const translate = useI18n({ warnHtmlMessage: false, useScope: 'global' });
    const toast = useToast();

    const { spendFileVersionActiveIri } = useSpendFile();
    const subscribeStore = useSubscribeStore();
    const {  useFeatureKeepHistoricalData } = useUser()
    const MAX_DAYS = 180; // Max number of days in the x-axis

    interface Data {
      adaBot: any; // Set as optional
      contractualTerms: number | null;
      currentTerms: number | null;
      getTermsHeight: string;
      isLoadingAdabot: boolean;
      isLoadingTerms: boolean;
      keyCharts: number;
      keyTooltip: number;
      loadingChangeStatus: boolean;
      paymentTerms: PaymentTermsOpportunityTermsAPIResponse[];
      showUnused: boolean;
      strategies: PaymentTermsOpportunityStrategiesAPIResponse[];
      strategyChecked: string;
      strategyStatus: boolean;
      unusedStrategies: Array<any>;
      usedStrategies: Array<any>;
      isFullExcluded: boolean;
      spendFileInrecalculation: boolean;
      hideShowPTHistory: boolean;
      chartVolumeHistoryData: PaymentTermsVolumeHistoryAPIResponse | null;
      historicalTableData: HistoricalRecord[];
    }

    const PLACEHOLDER_MISSING = "-";

    function toDisplayValue<T>(v: T | null | undefined): string | number {
      if (v === null || v === undefined || v === "") return PLACEHOLDER_MISSING;
      if (typeof v === "number" && Number.isNaN(v)) return PLACEHOLDER_MISSING;
      return v as string | number;
    }

    function mapTableRowToHistoricalRecord(row: PaymentTermsVolumeHistoryTableRow): HistoricalRecord {
      return {
        contractualPayment: toDisplayValue(row.contractualPaymentTerm),
        avgDaysPaid: toDisplayValue(row.averageDaysPaid),
        contractualWithDiscount: toDisplayValue(row.contractualWithDiscount),
        discount: PLACEHOLDER_MISSING,
        description: row.description != null && row.description !== "" ? row.description : PLACEHOLDER_MISSING,
        dateOfAgreement: row.dateOfAgreement != null && row.dateOfAgreement !== "" ? row.dateOfAgreement : PLACEHOLDER_MISSING,
        effectiveDate: row.effectiveDate != null && row.effectiveDate !== "" ? row.effectiveDate : PLACEHOLDER_MISSING,
        source: row.source ?? String(toDisplayValue(row.spendFileSource)),
        sourceReference: row.sourceReference ?? null,
        ptStatus: String(toDisplayValue(row.status)),
        recentlyAgreed: 0,
        spendVolume: typeof row.spendVolume === "number" && !Number.isNaN(row.spendVolume) ? row.spendVolume : PLACEHOLDER_MISSING,
        achievedCashFlow: typeof row.achievedCashFlow === "number" && !Number.isNaN(row.achievedCashFlow) ? row.achievedCashFlow : PLACEHOLDER_MISSING,
      };
    }

    function buildChartPayloadFromRawResponse(raw: PaymentTermsVolumeHistoryRawAPIResponse): PaymentTermsVolumeHistoryAPIResponse {
      return {
        categories: raw.categories ?? [],
        dateLabels: raw.dateLabels,
        series: raw.series,
        meta: raw.meta,
      };
    }

    const data = reactive<Data>({
      adaBot: null,
      contractualTerms: null,
      currentTerms: null,
      getTermsHeight: "auto",
      isLoadingAdabot: true,
      isLoadingTerms: true,
      keyCharts: new Date().getUTCMilliseconds(), // Random number
      keyTooltip: new Date().getUTCMilliseconds(),
      loadingChangeStatus: false,
      paymentTerms: [],
      showUnused: false,
      strategies: [],
      strategyChecked: "snapshot",
      strategyStatus: false,
      unusedStrategies: [],
      usedStrategies: [],
      isFullExcluded: false,
      spendFileInrecalculation: false,
      hideShowPTHistory: false,
      chartVolumeHistoryData: null,
      historicalTableData: [],
    });

    /**
     * Toggles the visibility of the payment terms history
     *
     * @returns {void}
     */
    function toggleShowPTHistory(): void {
      data.hideShowPTHistory = !data.hideShowPTHistory;
    }

    /**
     * Calculates the height of the payment terms section
     *
     * @returns {void}
     */
    function fnTermsHeight(): void {
      setTimeout(() => {
        const dots = document.getElementById("termsbars");
        if (dots) {
          let heights = dots.clientHeight;
          data.getTermsHeight = heights + "px";
        } else {
          data.getTermsHeight = "auto";
        }
      }, 500);
    }

    function getTitle(data: any): string {
      let title = translate.t("home.entityCard.strategies." + data.key);
      return title;
    }

    function getSubTitle(data: any): string {
      let title = "";

      if (
        data.key === "contractualTerms" &&
        data.infoCards.length >= 2 &&
        data.infoCards[1]?.value &&
        data?.infoCards[2]?.value
      ) {
        title =
          title +
          `(discount ${data.infoCards[1].value} days ${data.infoCards[2].value?.toFixed(2)}%)`;
      }

      return title;
    }

    /**
     * Supplier Standard 2.0 only: "(DSO Adjusted)" / "(DSO Based)" annotation shown next to the
     * strategy bar in the breakdown chart (usedStrategies / unusedStrategies).
     */
    function getStrategySubTitle(strategy: any): string {
      if (strategy.key !== "supplierStandard2Strategy") {
        return "";
      }
      return PaymentTermsStrategiesUtils.getSupplierStandard2DsoAnnotation(
        strategy.extra?.supplierStandard2Strategy?.details,
      );
    }

    const titleOfStrategies = computed(() => {
      return translate.t("home.entityCard.strategies." + data.strategyChecked);
    });

    /**
     * Loads payment terms volume history for the BarLineChart.
     * Route: GET api/entity-card/entity/{uuid}/payment-terms-volume-history
     */
    function getPaymentTermsVolumeHistory(): void {
      if(!useFeatureKeepHistoricalData.value) {
        return;
      }
      if (isNullOrUndefined(props.companyId) || props.companyId === "") {
        return;
      }
      const params = {
        entityUuid: props.companyId,
        callbackSuccess: (callbackSuccessData: PaymentTermsVolumeHistoryRawAPIResponse) => {
          data.chartVolumeHistoryData = buildChartPayloadFromRawResponse(callbackSuccessData);
          const rows = callbackSuccessData.table ?? [];
          data.historicalTableData = rows.map(mapTableRowToHistoricalRecord);
        },
        callbackError: (callbackErrorData: any) => {
          if (import.meta.env.DEV) {
            console.error("** Error loading payment terms volume history", callbackErrorData);
          }
          data.chartVolumeHistoryData = null;
          data.historicalTableData = [];
        },
      };
      entityCardStore.getPaymentTermsVolumeHistory(params);
    }

    /**
     * Retrieves the payment terms opportunity.
     * Route: GET api/entity-card/spend-program-configuration/{id}/chart/payment-terms-opportunity/{level}
     *
     * @returns {void}
     */
    function getPaymentTermsOpportunity(): void {
      // Enable loading
      data.isLoadingTerms = true;
      emit("set-exists-target", false);
      emit("set-exists-agreed", false);
      emit("set-exists-opportunity", false);

      const params = {
        configId: props.configId,
        companyType: props.levelType,

        callbackSuccess: (
          callbackSuccessData: PaymentTermsOpportunityAPIResponse,
        ) => {
          data.paymentTerms = callbackSuccessData.terms ?? [];

          let haveVcard = callbackSuccessData.isVcardApplied ?? false;
          emit("get-vcard-value", haveVcard);

          data.contractualTerms = data.paymentTerms.find((item: any) => item.key === "contractualTerms")?.terms ?? null;

          data.currentTerms = data.paymentTerms.find((item: any) => item.key === "currentTerms")?.terms ?? null;

          data.strategies = callbackSuccessData.strategies;

          data.usedStrategies = [];

          data.unusedStrategies = [];

          data.isFullExcluded = callbackSuccessData.isFullExcluded;

          const targetTerms = data.paymentTerms.find(
            (item: any) => item.key === "targetTerms",
          );
          if (targetTerms) {
            emit("set-exists-target", true, targetTerms.terms);
          }

          const proposedTerms = data.paymentTerms.find(
            (item: any) => item.key === "proposedTerms",
          );
          if (proposedTerms) {
            emit("set-exists-opportunity", true, proposedTerms.terms);
          }

          const agreedTerms = data.paymentTerms.find(
            (item: any) => item.key === "agreedNewTerms",
          );
          if (agreedTerms && agreedTerms.terms) {
            emit("set-exists-agreed", true, agreedTerms.terms);
          }

          const vcardTerms = data.strategies.find(
            (item: any) => item.key === "vCard",
          );
          if (vcardTerms && vcardTerms.terms) {
            emit("get-vcard-terms", vcardTerms.terms);
          } else {
            emit("get-vcard-terms", null);
          }
          const opportunityTerms = data.paymentTerms.find(
            (item: any) => item.key === "proposedTerms",
          );
          if (opportunityTerms && opportunityTerms.terms) {
            emit("get-opportunity-terms", opportunityTerms.terms);
          } else {
            emit("get-opportunity-terms", null);
          }
          parseStrategies();
          changeLine(data.strategyChecked);
          // Disable loading
          data.isLoadingTerms = false;
        },
        callbackError: (callbackErrorData: any) => {
          // Log Error
          if (import.meta.env.DEV)
            console.error("** Error in get Payment Terms", callbackErrorData);

          // Disable loading
          data.isLoadingTerms = false;
        },
      };

      entityCardStore.getPaymentTermsOpportunity(params);
    }

    // Refetch payment terms opportunity data when the payment terms target tracking number changes
    watch(
      () => props.paymentTermsTargetTrackingNumber,
      () => {
        getPaymentTermsOpportunity();
      },
    );

    // Send updated target payment terms
    watch(
      () => data.paymentTerms,
      () => {
        const paymentTerms = data.paymentTerms.find(
          (item: any) => item.key === "proposedTerms",
        );

        const paymentTermsTarget =
          paymentTerms?.extra?.targetTerms?.terms ?? null;

        emit("payment-terms-target-changed", paymentTermsTarget);
      },
    );

    function assignStrategyColor(strategy: any, newStrategy: any): void {
      if (isNullOrUndefined(strategy.terms)) return;
      if (!strategy.isApplicable || !strategy.isAllowed) return;

      if (
        strategy.key === "buyerStandardStrategy" ||
        strategy.key === "regulatoryTermsStrategy"
      ) {
        newStrategy.color = PaymentTermsStrategiesUtils.getColorByStrategyKey(strategy.key, {
          strategies: data.strategies,
          paymentTerms: data.paymentTerms,
        });
        return;
      }

      newStrategy.color = PaymentTermsStrategiesUtils.getColorByStrategyKey(strategy.key);
    }

    /**
     * Parses the payment strategies for the entity
     *
     * @returns {void}
     */
    function parseStrategies(): void {
      data.strategies.forEach((strategy) => {
        const newStrategy = ObjectUtils.cloneDeep(strategy);
        newStrategy.color ??= PaymentTermsStrategiesUtils.STRATEGY_COLOR_DEFAULT;

        if (strategy.key === "payOnTermsStrategy" && strategy.isAllowed === false) {
          data.unusedStrategies.push(newStrategy);
          return;
        }

        if (
          (!strategy.isVisible || strategy.terms === null) &&
          (strategy.key !== "harmonization" || strategy.terms === null)
        ) {
          data.unusedStrategies.push(newStrategy);
        } else {
          data.usedStrategies.push(newStrategy);
          assignStrategyColor(strategy, newStrategy);
        }
      });
    }

    // *** Legend ***

    const termsStrategiesTermsLegendItems = computed(() => {
      // Get list of colors from used strategies
      let colors: string[] = data.usedStrategies.map((i) =>
        !isNullOrUndefined(i.color) ? i.color.toUpperCase() : "",
      );

      // Remove empty items
      colors = colors.filter((i) => i !== "");

      // Remove duplicates
      colors = [...new Set(colors)];

      const legend: { text: string; color: string }[] = [];

      // Source - Spend File (internal)
      const isSourceSpendFileShowing = colors.some(
        (color) => color === colorsGroups.defaultColor,
      );

      if (isSourceSpendFileShowing) {
        legend.push({
          text: `${userStore.getCompany?.name ?? "Your Company's"} Data`,
          color: colorsGroups.defaultColor,
        });
      }

      // Source - Ada (external)
      const isSourceAdaShowing = colors.some(
        (color) => color === colorsGroups.supplierStandard,
      );

      if (isSourceAdaShowing) {
        legend.push({
          text: translate.t("global.externalSourceAda"),
          color: colorsGroups.supplierStandard,
        });
      }

      // No impact
      const isNoImpactShowing = colors.some(
        (color) => color === colorsGroups.negativeColorForStrategies,
      );

      if (isNoImpactShowing) {
        legend.push({
          text: "No Impact",
          color: colorsGroups.negativeColorForStrategies,
        });
      }

      // Limiting Effect
      const isLimitingEffectShowing = colors.some(
        (color) =>
          color === PaymentTermsStrategiesUtils.STRATEGY_COLOR_LIMITING_EFFECT,
      );

      if (isLimitingEffectShowing) {
        legend.push({
          text: "Limiting Effect",
          color: PaymentTermsStrategiesUtils.STRATEGY_COLOR_LIMITING_EFFECT,
        });
      }

      return legend;
    });

    const legendItemsArray = computed(() => {
      return termsStrategiesTermsLegendItems.value;
    });

    // *** END Legend ***

    // *** Payment terms / Payment Terms Strategies ***

    function getBtnShortcutLabel(key: PaymentTermKey): string {
      // Validate
      if (StringUtils.isNullUndefinedOrEmpty(key)) {
        return "";
      }

      let label = "";

      switch (key) {
        case "proposedTerms":
          // Default label
          label = translate.t(
            "home.entityCard.strategies." + key + "BtnShortcutLabelAdd",
          );

          // Check if there's a target payment term. If so, use 'Edit'
          data.paymentTerms.forEach((paymentTerm) => {
            if (paymentTerm.key !== "proposedTerms") return;

            // Found. Check if there's a target payment term. If so, use 'Edit'
            if (
              !isNullOrUndefined(paymentTerm.extra) &&
              !isNullOrUndefined(paymentTerm.extra.targetTerms) &&
              !isNullOrUndefined(paymentTerm.extra.targetTerms.terms)
            ) {
              label = translate.t(
                "home.entityCard.strategies." +
                  paymentTerm.key +
                  "BtnShortcutLabelEdit",
              );
            }
          });

          break;

        case "agreedNewTerms":
          label = translate.t(
            "home.entityCard.strategies." + key + "BtnShortcutLabel",
          );
          break;

        default:
          break;
      }

      // Validate - Missing translation
      if (
        label.includes("home.entityCard.strategies." + key + "BtnShortcutLabel")
      ) {
        return "";
      }

      return label;
    }

    // *** END Payment terms / Payment Terms Strategies ***

    // *** Adabot ***

    /**
     * Retrieve AdaBot texts from API
     */
    function getAdaBotAll() {
      // Enable loading
      data.isLoadingAdabot = true;

      data.adaBot = null;
      const params = {
        configId: props.configId,
        companyId: props.companyId,
        programId: props.selectedProgramUri,
        cTarget: null,
        level: props.levelType,
        // callbackSuccess: (callbackSuccessData: AdaBot) => {
        callbackSuccess: (callbackSuccessData: any) => {
          data.adaBot = callbackSuccessData;

          // Disable loading
          data.isLoadingAdabot = false;
        },
        callbackError: (callbackErrorData: any) => {
          // Disable loading
          data.isLoadingAdabot = false;

          // Log Error
          if (import.meta.env.DEV) console.error("** Error in get AdaBot", callbackErrorData);
        },
      };
      entityCardStore.getAdaBotAll(params);
    }

    /**
     * Change the tab
     */

    function changeTab(tabName: string) {
      emit("changeTab", tabName);
    }

    /**
     * Change active bar chart
     *
     * @param {string} strategy - The name of the strategy.
     */
    function changeLine(strategy: string) {
      const indexGroup = data.strategies.find((x: any) => x.key === strategy);

      if (indexGroup) {
        data.strategyStatus = indexGroup.isAllowed ?? false;
      }
      data.strategyChecked = strategy;
      data.hideShowPTHistory = false;
      data.keyTooltip++;
      data.keyCharts++;
    }

    // Get tooltip text for the selected strategy
    const strategyCheckedTooltip = computed(() => {
      // Dont show tooltip
      if (
        StringUtils.isEmpty(data.strategyChecked) ||
        data.strategyChecked === "snapshot"
      ) {
        return "";
      }

      // Show tooltip
      return translate.t(
        "home.entityCard.strategies." + data.strategyChecked + "Tooltip",
      );
    });

    /**
     * Set bar size
     */
    function setBarSize(size: number) {
      const newSize = (size * 100) / MAX_DAYS;
      return newSize > 100 ? 100 : newSize;
    }

    /**
     * Computed
     */

    /**
     * Determines if the some chartlines will show depending on the entity type
     */
    const isPotentialEntity = computed(() => {
      return (
        entityCardStore.getEntityType === "potential-supplier" ||
        entityCardStore.getEntityType === "potential-parent"
      );
    });

    /**
     * for filtering the payment terms without
     * contractual terms, agreedNewTerms, and proposedTerms if entity is potential
     */
    const paymentTermsComputed = computed(() => {
      /**
       * if target is not applied, you do not see the target bar chart, you will only see the opportunity bar chart ( with add target button)
       * if the target is applied, you will see both the opportunity bar chart and the target bar chart, the target bar chart will inlcude the edit target button
       */
      const potentialText =
        entityCardStore.getEntityType === "potential-supplier" ||
        entityCardStore.getEntityType === "potential-parent";

      return potentialText
        ? data.paymentTerms.filter((item: any) => item.key !== "agreedNewTerms")
        : data.paymentTerms;
    });
    /**
     * Checks if the agreed new terms are applied
     */
    const agreedtermsAppliedComputed = computed(() => {
      return data.paymentTerms.some(
        (obj: any) => obj.key === "agreedNewTerms" && obj.terms !== null,
      );
    });

    /**
     * Checks if the target terms are applied
     */
    const hasTargetTermsAppliedComputed = computed(() => {
      let result = data.paymentTerms.some(
        (obj: any) => obj.key === "targetTerms" && obj.terms !== null,
      );
      return result;
    });

    const isLoadingComputed = computed<boolean>(() => {
      if (!data.isLoadingTerms && !data.isLoadingAdabot) {
        emit("show-strategies");
        return true;
      } else {
        return false;
      }
    });

    const allowDisableStrategy = computed<boolean>(() => {
      switch (data.strategyChecked) {
        // Terms
        case "snapshot":
        case "contractualTerms":
        case "currentTerms":
        case "proposedTerms":
        case "agreedNewTerms":
        case "payOnTermsStrategy":
          //case 'regulatoryTermsStrategy':
          return false;
        case "vCard":
          return false;
        default:
          return true;
      }
    });

    /**
     * Get data for a payment term or payment term strategy when the user clicks on it
     */
    const getDataForStrategyComputed = computed(() => {
      switch (data.strategyChecked) {
        // Terms
        case "contractualTerms":
        case "currentTerms":
        case "proposedTerms":
        case "agreedNewTerms":
          return (
            data.paymentTerms.find(({ key }) => key === data.strategyChecked) ??
            null
          );
        // Terms strategies
        default:
          return (
            data.strategies.find(({ key }) => key === data.strategyChecked) ??
            null
          );
      }
    });

    const showDisabledButton = computed(() => {
      if (
        props.levelTypeForStrategies === "supplier" &&
        data.strategyChecked !== "snapshot"
      ) {
        return true;
      } else {
        return false;
      }
    });

    /**
     * On mounted
     */
    onMounted(() => {
      mainCalls();
      data.spendFileInrecalculation = !subscribeStore.getAllowActionsInModules;
      getPaymentTermsVolumeHistory();
    });

    watch(
      () => subscribeStore.getAllowActionsInModules,
      (newValue) => {
        data.spendFileInrecalculation = !newValue;
      },
    );

    function mainCalls() {
      getPaymentTermsOpportunity();
      getAdaBotAll();
    }

    function clickChangeData() {
      data.strategyStatus = !data.strategyStatus;
      changeData();
    }

    /**
     * Change the data and update the strategy status.
     *
     * @param {type} paramName - description of parameter
     * @return {type} description of return value
     */
    function changeData() {
      // Enable loading
      data.loadingChangeStatus = true;

      const params = {
        strategy: data.strategyChecked,
        companyId: props.companyId,
        programId: props.selectedProgramUri,
        spendUUID: spendFileVersionActiveIri.value,
        status: data.strategyStatus,
        callbackSuccess: (callbackSuccessData: any) => {
          // Disable loading
          data.loadingChangeStatus = false;

          toast.success(translate.t("global.sucessStartegyChange"));

          if (callbackSuccessData.inProcess) {
            Routing.home.entityCard.openEntityCard();
          } else {
            emit("reload-apis");
            //mainCalls()
          }
        },
        callbackError: (callbackErrorData: any) => {
          toast.error(translate.t("global.errorLoadingPaymentTerms"));

          // Disable loading
          data.loadingChangeStatus = false;

          mainCalls();

          // Log Error
          if (import.meta.env.DEV)
            console.error(
              "** Error in change data strategy",
              callbackErrorData,
            );
        },
      };
      entityCardStore.postStatusStrategybyEntity(params);
    }

    function validateTooltipSettings(strategyKey: string) {
      const arrayData = [
        "agreedNewTerms",
        "buyerStandardStrategy",
        "cashDiscountConversionStrategy",
        "financingStrategy",
        "industryRegionStandardStrategy",
        "payOnTermsStrategy",
        "peerGroupAvgStrategy",
        "proposedTerms",
        "regulatoryTermsStrategy",
        "parentSupplierMaxStrategy",
        "supplierStandardStrategy",
        "vCard",
      ];
      if (arrayData.includes(strategyKey)) {
        return true;
      }
      return false;
    }

    const allowEditVariablesComputed = computed(() => {
      if (props.levelTypeForStrategies === "supplier") {
        return true;
      } else {
        return false;
      }
    });

    function sendGroups(idGroup: string, type: string, level: string) {
      emit("change-groups", idGroup, type, level);
    }

    function mergeStrategyConfig(strategyKey: string, callbackSuccessData: any) {
      if (!callbackSuccessData || !strategyKey) {
        return;
      }

      const strategy = data.strategies.find((item: any) => item.key === strategyKey) as any;
      if (!strategy) {
        return;
      }

      const configKey = getConfigKeybystrategy(strategyKey)

      // SS2 save endpoint nests the config inside storedUiSetup[configKey];
      // the legacy UI-setup endpoint puts it directly on the root.
      const configData = configKey
        ? (callbackSuccessData?.storedUiSetup?.[configKey]
            ?? callbackSuccessData?.[configKey]
            ?? callbackSuccessData)
        : callbackSuccessData;

      if (!configData || typeof configData !== "object") {
        return;
      }

      // configData.combinationGroups[0] holds the toggle booleans;
      // scope/metric fields live at the configData top level.
      const savedGroup = Array.isArray(configData.combinationGroups) ? configData.combinationGroups[0] : null

      const mergedGroup = {
        ...(strategy.combinationGroups?.[0] ?? {}),
        //- Common fields
        commodity:            savedGroup?.commodity            ?? strategy.combinationGroups?.[0]?.commodity,
        buyer_leverage:       savedGroup?.buyer_leverage       ?? strategy.combinationGroups?.[0]?.buyer_leverage,
        buyer_country:        savedGroup?.buyer_country        ?? strategy.combinationGroups?.[0]?.buyer_country,
        buyer_region:         savedGroup?.buyer_region         ?? strategy.combinationGroups?.[0]?.buyer_region,
        buyer_industry:       savedGroup?.buyer_industry       ?? strategy.combinationGroups?.[0]?.buyer_industry,
        buyer_credit_rating:  savedGroup?.buyer_credit_rating  ?? strategy.combinationGroups?.[0]?.buyer_credit_rating,
        priorityOrder:        savedGroup?.priorityOrder        ?? strategy.combinationGroups?.[0]?.priorityOrder,        

        // top-level scope + metric fields
        calculationMethod:      configData.calculationMethod,        
        minOccurencies:         configData.minOccurrences,
        
        //- sp2
        supplier_country:     savedGroup?.supplier_country     ?? strategy.combinationGroups?.[0]?.supplier_country,
        supplier_region:      savedGroup?.supplier_region      ?? strategy.combinationGroups?.[0]?.supplier_region,
        supplier_industry:    savedGroup?.supplier_industry    ?? strategy.combinationGroups?.[0]?.supplier_industry,
        supplier_credit_rating: savedGroup?.supplier_credit_rating ?? strategy.combinationGroups?.[0]?.supplier_credit_rating,
        
        //- ss2
        includeParentTerms:     configData.includeParentTerms ?? null,
        sisterCompanyInclusion: configData.sisterCompanyInclusion ?? null,
        includeSisterTerms:     configData.includeSisterTerms ?? null,
        dsoAdjustmentEnabled:   configData.dsoAdjustmentEnabled ?? null,

      }

      if (!Array.isArray(strategy.combinationGroups)) {
        strategy.combinationGroups = [mergedGroup];
      } else if (strategy.combinationGroups.length === 0) {
        strategy.combinationGroups.push(mergedGroup);
      } else {
        strategy.combinationGroups[0] = mergedGroup;
      }

      // charts lives at configData.charts; also update the top-level buyerLeverage the strategy carries
      const charts = configKey ? callbackSuccessData?.storedUiSetup?.[configKey]?.charts : null
      if (charts) {
        strategy.charts = charts
      }

      const extra = configKey ? callbackSuccessData?.storedUiSetup?.[configKey]?.extra : null
      if (extra) {
        strategy.extra = extra
      }

      // terms (selectedPaymentTermsDays) from the preview result
      if (callbackSuccessData.preview?.selectedPaymentTermsDays != null) {
        strategy.terms = callbackSuccessData.preview.selectedPaymentTermsDays
      }

      // infoCards — legacy UI-setup endpoint only
      if (callbackSuccessData.infoCards && Array.isArray(callbackSuccessData.infoCards)) {
        strategy.infoCards = callbackSuccessData.infoCards;
      }
    }

    function getConfigKeybystrategy(strategyKey: any) {

      switch(strategyKey) {
        case 'supplierStandard2Strategy':
          return 'supplier_standard_2_0'

        case 'peerGroupStandard2Strategy':
          return 'peer_group_standard_2_0'
          
        default:
          return null
      }


    }

    function handleStrategyConfigSave(payload: {
      strategyKey: string;
      callbackSuccessData: any;
    }) {
      mergeStrategyConfig(payload.strategyKey, payload.callbackSuccessData);
    }

    const showBadgeSCF = computed(() => {
      const bothTrue = props.onSCF === true && props.scfAccepted === true;
      const onScfFalseScfTrue =
        props.onSCF === false && props.scfAccepted === true;
      const onScfTrueScfNull =
        props.onSCF === true && props.scfAccepted === null;
      const onScfFalseScfNull =
        props.onSCF === false && props.scfAccepted === null;
      const onScfTrueScfFalse =
        props.onSCF === true && props.scfAccepted === false;
      let result = {
        onSCF: false,
        scfAccepted: false,
        scfRemoved: false,
      };
      switch (true) {
        case onScfTrueScfNull:
        case bothTrue:
          result.onSCF = true;
          result.scfAccepted = false;
          result.scfRemoved = false;
          break;
        case onScfFalseScfTrue:
          result.scfAccepted = true;
          result.scfRemoved = false;
          result.onSCF = false;
          break;
        case onScfTrueScfFalse:
          result.scfAccepted = false;
          result.scfRemoved = true;
          result.onSCF = true;
          break;
        case onScfFalseScfNull:
        default:
          result.scfAccepted = false;
          result.scfRemoved = false;
          result.onSCF = false;
      }
      return result;
    });
    const showColor = ColorsUtils.teal[500]
            
     
    return {
      ...toRefs(data),
      agreedtermsAppliedComputed,
      allowDisableStrategy,
      changeData,
      changeLine,
      clickChangeData,
      fnTermsHeight,
      getBtnShortcutLabel,
      getDataForStrategyComputed,
      getTitle,
      getSubTitle,
      getStrategySubTitle,
      hasTargetTermsAppliedComputed,
      isLoadingComputed,
      isPotentialEntity,
      legendItemsArray,
      paymentTermsComputed,
      PaymentTermsStrategiesUtils,
      sendGroups,
      setBarSize,
      showDisabledButton,
      strategyCheckedTooltip,
      termsStrategiesTermsLegendItems,
      titleOfStrategies,
      validateTooltipSettings,
      changeTab,
      handleStrategyConfigSave,
      showBadgeSCF,
      allowEditVariablesComputed,
      showColor,
      toggleShowPTHistory,
      useFeatureKeepHistoricalData
    };
  },
});
</script>

<style lang="scss" scoped>
@import "src/resources/assets/styles/variables/colors";

.container-terms {
  width: 100%;
  flex: 1 0 0%;
  align-items: flex-start;
  align-self: stretch;
  border-radius: 0.5rem;
  border: 1px solid $color-gray-200;
  background: #fff;
  box-shadow:
    0px 1px 2px 0px rgba(16, 24, 40, 0.06),
    0px 1px 3px 0px rgba(16, 24, 40, 0.1);

  .charts-side {
    width: 50%;
    height: auto;
    background-color: #ffffff;
    padding: 24px 0px 24px 24px;
    align-items: flex-start;
    gap: 4px;
    border-top-left-radius: 8px;
    border-bottom-left-radius: 8px;
  }

  .info-side {
    width: 50%;
    max-height: var(--height);
    background-color: $color-gray-50;
    padding: 24px;
    flex-direction: column;
    align-items: flex-end;
    gap: 16px;
    flex: 1 0 0;
    align-self: stretch;
    overflow: auto;
    border-top-right-radius: 8px;
    border-bottom-right-radius: 8px;
  }
}

.specific-feedback {
  margin: 5px;
  border-radius: 25px;
  height: 30px;
  font-size: 0.8em;
  width: auto;
  padding: 10px 15px;
  background: #f9fafb;
  border: 1px solid #667085;
  color: #667085;
  display: flex;
  justify-content: center;
  align-items: center;
}

.specific-feedback-active {
  background: #ff2c4f;
  border: 1px solid #ff2c4f;
  color: white;
}

// Use animate.css instead
@keyframes fadeInDown {
  from {
    opacity: 0;
    transform: translate3d(0, -100%, 0);
  }

  to {
    opacity: 1;
    transform: translate3d(0, 0, 0);
  }
}

.show-unused {
  display: contents;
  animation-name: fadeInDown;
  animation-duration: 0.3s;
}

.hide-unused {
  display: none;
  animation-name: fadeInDown;
  animation-duration: 0.3s;
}

.axis-x-days {
  // Display vertical line on top of each value in the x-axis
  span::before {
    background-color: $color-gray-400;
    content: "";
    height: 16px;
    left: 40%;
    /* Position the line in the middle of the number */
    position: relative;
    top: -10px;
    width: 1px;
    display: block;
  }
}

.unused-div {
  display: flex;
  border: 1px solid #fff;

  &:hover {
    background: $color-gray-100;
    border-radius: 9px;
    border: 1px solid $color-gray-300;
  }
}

.payment-terms-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.5rem;
  width: 98%;
}

.scf-badge {
  display: inline-flex;
  align-items: center;
  padding: 4px 12px;
  margin-left: auto;

  span {
    white-space: nowrap;
  }
}

// Responsive adjustments
@media (max-width: 768px) {
  .payment-terms-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .scf-badge {
    margin-left: 0;
    margin-top: 0.5rem;
  }
}

.hide-close {
  display: none;
}

.hide-snapshot-close {
  display: none !important;
}
</style>
