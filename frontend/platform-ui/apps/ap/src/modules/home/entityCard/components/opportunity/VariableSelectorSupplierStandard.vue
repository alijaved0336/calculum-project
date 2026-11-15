<template>
<CalculumLoading v-if="state.saving_data" :modal="true"> </CalculumLoading>
<div class="variable-selector">
  <div class="row d-flex align-items-baseline mt-1">
    <div class="col-2"><span class="text-base font-semibold text-gray-700 mb-3 cursor-pointer" @click="showExtraContent = !showExtraContent">{{  $t('global.distributionCharts.configuration') }}
        <CalculumTooltipIcon v-if="configWasCustomized" :infoText="$t('global.theConfigurationWasCustomized')"></CalculumTooltipIcon></span>
      <CalculumChevronDown class="mr-2 unused-strategy-svg cursor-pointer" v-if="!showExtraContent" @click="showExtraContent = !showExtraContent"></CalculumChevronDown>
      <CalculumChevronUp class="mr-2 unused-strategy-svg cursor-pointer" v-if="showExtraContent" @click="showExtraContent = !showExtraContent"></CalculumChevronUp>
    </div>
  </div>
  <div class="d-flex flex-column" v-if="showExtraContent">
    <div class="row mb-3">
      <div class="col-xl-4 col-lg-4 col-md-12">
        <label class="d-block text-sm font-medium text-gray-700 mb-1">{{ $t('global.adjustments') }}</label>
        <div class="d-flex gap-2 flex-wrap">
          <button class="supplier-settings-pill" type="button" :class="{ 'supplier-settings-pill--selected': state.dsoAdjustmentEnabled }" @click="toggle('dsoAdjustmentEnabled')">DSO</button>
        </div>
        <label class="d-block text-sm font-medium text-gray-700 mb-2 mt-2">{{ $t('global.selectScope') }}</label>
        <div class="d-flex gap-2 flex-wrap">
          <button class="supplier-settings-pill" :class="{ 'supplier-settings-pill--selected': state.includeParentTerms }" @click="state.includeParentTerms = !state.includeParentTerms">{{ $t('home.entityCard.infoCards.includeParentTerms') }}</button>
        </div>
        <div class="d-flex gap-2 flex-wrap">
          <button class="supplier-settings-pill" :class="{ 'supplier-settings-pill--selected': state.includeSisterTerms }" @click="state.includeSisterTerms = !state.includeSisterTerms">{{ $t('home.entityCard.infoCards.sisterCompanyInclusion') }}</button>
        </div>
        <div class="d-flex flex-column gap-2 boder-inputs" v-if="state.includeSisterTerms">
          <div class="d-flex flex-column">
            <KRadioButton :name="'sisterCompanyInclusion'" :value="'include'" :checked="state.sisterCompanyInclusion === 'include'" :label="$t('home.entityCard.infoCards.alwaysIncludeSisterCompanies')" @change="handleSisterValues">                       </KRadioButton>
            <KRadioButton :name="'sisterCompanyInclusion'" :value="'only_if_no_match'" :checked="state.sisterCompanyInclusion === 'only_if_no_match'" :label="$t('home.entityCard.infoCards.onlyIfNotEnoughOccurrences')" @change="handleSisterValues"></KRadioButton>
            <KRadioButton :name="'sisterCompanyInclusion'" :value="'exclude'" :checked="state.sisterCompanyInclusion === 'exclude'" :label="$t('home.entityCard.infoCards.neverIncludeSisterCompanies')" @change="handleSisterValues"></KRadioButton>
          </div>
        </div>
        <label class="d-block text-sm font-medium text-gray-700 mb-2 mt-2">{{ $t('home.entityCard.infoCards.valuetouseinstrategy') }}</label>
        <div class="d-flex gap-2 flex-wrap">
          <button class="supplier-settings-pill" v-for="opt in VALUE_TO_USE_OPTIONS" :key="opt.value" :class="{ 'supplier-settings-pill--selected': state.calculationMethod === opt.value }" @click="!allowEdit ? null : state.calculationMethod = opt.value">{{ opt.label }}</button>
        </div>
      </div>
      <div class="col-xl-8 col-lg-8 col-md-12">
        <label class="d-block text-sm font-medium text-gray-700 mb-1">{{ $t('home.entityCard.infoCards.similarVariableSelector') }}</label>
        <div class="row mb-3">
          <div class="col-12 col-md-4 supplier-settings-card-section"><span class="supplier-settings-card-section-label d-block text-xs font-semibold text-gray-500 mb-2">Transaction</span>
            <div class="d-flex gap-2 flex-wrap">
              <button class="supplier-settings-pill" type="button" :class="{ 'supplier-settings-pill--selected': state.commodity }" @click="toggle('commodity')">Commodity</button>
              <button class="supplier-settings-pill" type="button" :class="{ 'supplier-settings-pill--selected': state.buyer_leverage }" @click="toggle('buyer_leverage')">Buyer Leverage</button>
            </div>
          </div>
          <div class="col-12 col-md-8 supplier-settings-card-section"><span class="supplier-settings-card-section-label d-block text-xs font-semibold text-gray-500 mb-2">Buyer</span>
            <div class="d-flex gap-2 flex-wrap">
              <button class="supplier-settings-pill" type="button" :class="{ 'supplier-settings-pill--selected': state.buyer_country }" @click="toggle('buyer_country')">Country</button>
              <button class="supplier-settings-pill" type="button" :class="{ 'supplier-settings-pill--selected': state.buyer_region }" @click="toggle('buyer_region')">Region</button>
              <button class="supplier-settings-pill" type="button" :class="{ 'supplier-settings-pill--selected': state.buyer_industry }" @click="toggle('buyer_industry')">Industry</button>
              <button class="supplier-settings-pill" type="button" :class="{ 'supplier-settings-pill--selected': state.buyer_credit_rating }" @click="toggle('buyer_credit_rating')">Credit Rating</button>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div class="d-flex gap-2 mt-3 justify-content-end" v-if="hasChanges">
      <button class="btn outline-secondary-btn font-md" type="button" :disabled="state.saving_data || previewing" @click="reset"><span>{{ $t('button.cancel') }}</span></button>
      <button class="btn btn-primary font-md" type="button" :disabled="state.saving_data || previewing" @click="save"><span>{{ $t('button.save') }}</span></button>
    </div>
  </div>
  <div class="d-flex flex-column mb-1" v-if="previewing" :style="'align-items: center;'"><span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span></div>
  <div class="d-flex flex-column mb-1" v-if="!previewing"><span class="text-base font-semibold text-gray-600 mb-0" v-if="!haveSomeTermsDefault && !previewRequested">{{ $t('home.entityCard.infoCards.noDataToShow') }}</span><span class="text-base font-semibold text-gray-600 mb-0" v-if="!haveSomeTermsPreview && previewRequested && !previewing">{{ $t('home.entityCard.infoCards.noDataToShow') }}</span><span class="text-base font-semibold text-gray-600 mb-0" v-if="haveSomeTermsPreview && previewRequested && previewing">{{ $t('home.entityCard.infoCards.previewvalueofterms') }}</span></div>
  <div class="d-flex flex-column align-items-center gap-2 mb-1" v-if="haveSomeTermsPreview" :class="{ 'bg-blur': previewing }">
    <EntityTermsChartLine v-if="strategyTerms !== null" :bar-size="setBarSize(strategyTerms)" :color="'#2e90fa'" :set-color="PaymentTermsStrategiesUtils.getColorByStrategyKeyDetailsSection('supplierStandard2Strategy')" :title="dsoAnnotationApplies ? $t('home.entityCard.strategies.supplierStandard2Strategy') + ' ' + $t('home.entityCard.strategies.dsoAdjustmentAnnotation') : $t('home.entityCard.strategies.supplierStandard2Strategy')" :tooltip-text="$t('home.entityCard.strategies.supplierStandard2StrategyTooltip')" :used-strategy="true" :value="strategyTerms"></EntityTermsChartLine>
    <div class="row d-flex w-100" v-if="detailsComputed !== null" :style="'padding-left: 56px;'" :class="strategyTerms ? '' : 'mt-2'">
      <Tooltip :open-delay="100" :anchor-element="'target'" position="auto"></Tooltip>
      <template v-for="(detail, detailKey) in detailsComputed" :key="detailKey">
        <div class="info-button mr-4 mb-2 bg-gray-500" v-if="calculationMethodComputed === detailKey" :title="$te('global.' + detailKey + 'Tooltip') ? $t('global.' + detailKey + 'Tooltip'): ''">
          <IconCheckCircleFill2 class="w-3 h-3 text-white-0"></IconCheckCircleFill2><span class="text-sm font-normal text-white-0">{{ $t("home.entityCard.strategies.extra.details." + detailKey) }}</span><span class="text-sm font-bold text-white-0 text-capitalize">{{ detail ?? $t("global.notAvailable") }}</span>
        </div>
        <div class="info-button mr-4 mb-2" v-else :title="$te('global.' + detailKey + 'Tooltip') ? $t('global.' + detailKey + 'Tooltip') : ''"><span class="text-sm font-normal text-gray-500">{{ $t("home.entityCard.strategies.extra.details." + detailKey) }}</span><span class="text-sm font-bold text-gray-600 text-capitalize">{{ detail ?? $t("global.notAvailable") }}</span></div>
      </template>
    </div>
  </div>
  <div class="d-flex flex-column gap-2" :class="{ 'bg-blur': previewing }">
    <!-- Stays mounted (not v-if-removed) when there's no data, so the section doesn't collapse; the no-data message is already shown above -->
    <template v-if="existsSomeTerms">
      <VerticalBarChart :chart-title="''" :x-axis-title="$t('home.entityCard.infoCards.occurences')" :y-axis-title="$t('global.paymentTermsD')" :data-first-series="termsByMetricSeries" :categories-data="termsByMetricCategories" :is-big-number="false" :chart-type="''" :section="'paymentTermsDaysinStrategies'" :width-chart="'100%'" :maximum-fraction-digits="0" :minimum-fraction-digits="0" :buyer-leverage-distribution="buyerLeverageDistribution"></VerticalBarChart>
      <div class="d-flex gap-2 mb-1 w-100">
        <div class="row d-flex align-items-baseline mt-1 w-100">
          <div class="col-2">
            <label class="text-base font-semibold text-gray-600 mb-0">{{ $t('global.distributionCharts.distributionChartTitle')  }}</label>
          </div>
          <div class="col-4">
            <SearchableDropdown :model-value="state.distributionChartSelected" :items="DISTRIBUTION_CHART_OPTIONS" value-key="value" label-key="label" :placeholder="$t('global.distributionCharts.selectChart')" :showSearch="false" @update:model-value="(v) => state.distributionChartSelected = v"></SearchableDropdown>
          </div>
        </div>
      </div>
      <VerticalBarChart :chart-title="''" :x-axis-title="$t('home.entityCard.infoCards.occurences')" :y-axis-title="yAxisTitleComnputed" :data-first-series="buyerLeverageSeries" :categories-data="buyerLeverageCategories" :is-big-number="false" :chart-type="''" :section="'leverageDistributionChartSection'" :width-chart="'100%'" :maximum-fraction-digits="0" :minimum-fraction-digits="0" :buyer-leverage-distribution="buyerLeverageDistribution"></VerticalBarChart>
    </template>
  </div>
</div>
</template>

<script lang="ts">
import { defineComponent, reactive, ref, watch, computed } from 'vue'
import CalculumChevronDown from "@/modules/components/CalculumChevronDown.vue";
import CalculumChevronUp from "@/modules/components/CalculumChevronUp.vue";
import { VALUE_TO_USE_OPTIONS, DISTRIBUTION_CHART_OPTIONS, CalculationMethod, ScopesForSupplierStandard, DistributionCharts } from '@/modules/home/types'
import {
  RadioButtonChangeEvent,
  RadioButton as KRadioButton
} from "@progress/kendo-vue-inputs";
import { useToast } from 'vue-toastification';
import { CalculumLoading, SearchableDropdown } from '@ada/design-system'
import VerticalBarChart from '@/modules/components/charts/kendo/VerticalBarChart.vue'
import { previewSupplierStandard2Waterfall, saveSupplierStandard2Waterfall } from '@/modules/home/entityCard/api'
import { useI18n } from "vue-i18n";
import { PaymentTermsStrategiesUtils, StringUtils } from "@/utils"
import EntityTermsChartLine from "./EntityTermsChartLine.vue";
import { Tooltip } from "@progress/kendo-vue-tooltip";
import IconCheckCircleFill2 from "@/resources/assets/images/icons/IconCheckCircleFill2.vue";
import CalculumTooltipIcon from "@/modules/components/CalculumTooltipIcon.vue";

export interface SS2StrategyExtra {
  key: string
  terms: number | null
  calculationMethod: string | null
  details: Record<string, number | null> | null
  dsoAdjustmentApplied?: boolean | null
  dsoFallbackApplied?: boolean | null
}

export interface VariableSelectorCharts {
  buyerLeverage: [string, number][]
  termsByMetric: Record<CalculationMethod, [string, number][]>
  distributionCharts: Record<DistributionCharts, [string, number][]>
}

export type VariableSelectorCriterion =
  | 'includeParentTerms'
  | 'includeSisterTerms' 
  | 'sisterCompanyInclusion'
  | 'dsoAdjustmentEnabled'
  | 'calculationMethod'
  | 'commodity'
  | 'buyer_leverage'
  | 'buyer_country'
  | 'buyer_region'
  | 'buyer_industry'
  | 'buyer_credit_rating';

export type VariableSelectorToggleKey =
  | 'includeParentTerms'
  | 'includeSisterTerms'
  | 'dsoAdjustmentEnabled'
  | 'commodity'
  | 'buyer_leverage'
  | 'buyer_country'
  | 'buyer_region'
  | 'buyer_industry'
  | 'buyer_credit_rating';

export interface VariableSelectorState {
  includeParentTerms: boolean
  includeSisterTerms: boolean
  sisterCompanyInclusion: ScopesForSupplierStandard
  dsoAdjustmentEnabled: boolean  
  calculationMethod: CalculationMethod  
  commodity: boolean
  buyer_leverage: boolean
  buyer_country: boolean
  buyer_region: boolean
  buyer_industry: boolean
  buyer_credit_rating: boolean,
  saving_data: boolean,
  distributionChartSelected: DistributionCharts
  
}

const DEFAULT_STATE: VariableSelectorState = {
  includeParentTerms: false,
  includeSisterTerms: false,
  sisterCompanyInclusion: 'exclude',  
  dsoAdjustmentEnabled: false,
  calculationMethod: '3q',
  commodity: false,
  buyer_leverage: false,
  buyer_country: false,
  buyer_region: false,
  buyer_industry: false,
  buyer_credit_rating: false,
  saving_data: false,
  distributionChartSelected: 'buyerLeverage'
}

export default defineComponent({
  name: 'VariableSelectorSupplierStandard',
  components: {
    CalculumChevronDown,
    CalculumChevronUp,
    KRadioButton,
    CalculumLoading,
    VerticalBarChart,
    SearchableDropdown,
    EntityTermsChartLine,
    Tooltip,
    IconCheckCircleFill2,
    CalculumTooltipIcon
  },
  props: {
    modelValue: {
      type: Object as () => VariableSelectorState,
      default: () => ({ ...DEFAULT_STATE }),
    },
    allowEditVariables: {
      type: Boolean,
      default: false
    },
    configId: { type: String, required: true },
    levelType: { type: String, required: true },
    entityUuid: { type: String, default: null },
    buyerLeverageDistribution: { type: String, required: false, default: null },
    charts: {
      type: Object as () => VariableSelectorCharts,
      default: null,
    },
    configWasCustomized: { type: Boolean, default: false},
    terms: { type: Number, default: null}
  },
  emits: ['update:modelValue', 'save', 'preview-result'],
  setup(props, { emit }) {
    const state = reactive<VariableSelectorState>({
      ...DEFAULT_STATE,
      ...props.modelValue,
      saving_data: false,
    })

    const showExtraContent = ref(false)
    const previewing = ref(false)
    const abortController = ref<AbortController | null>(null)
    const initialSnapshot = ref<VariableSelectorState>({ ...state })
    const localCharts = ref<VariableSelectorCharts | null>(null)
    const toast = useToast()
    const { t } = useI18n({ warnHtmlMessage: false, useScope: 'global' });
    const dataExtra = ref<SS2StrategyExtra | null>(null)
    const MAX_DAYS = 180;
    const previewRequested = ref(false)

    const hasChanges = computed(() => {
      const keys: (keyof VariableSelectorState)[] = [
        'includeParentTerms',
        'includeSisterTerms',
        'sisterCompanyInclusion',
        'dsoAdjustmentEnabled',
        'calculationMethod',
        'commodity',
        'buyer_leverage',
        'buyer_country',
        'buyer_region',
        'buyer_industry',
        'buyer_credit_rating'
      ]
      return keys.some((key) => state[key] !== initialSnapshot.value[key])
    })

    const onlyMetricWasChanged = computed(() => {
      const otherKeys: (keyof VariableSelectorState)[] = [
        'includeParentTerms',
        'includeSisterTerms',
        'sisterCompanyInclusion',
        'dsoAdjustmentEnabled',
        'commodity',
        'buyer_leverage',
        'buyer_country',
        'buyer_region',
        'buyer_industry',
        'buyer_credit_rating'
      ]
      return (
        state.calculationMethod !== initialSnapshot.value.calculationMethod &&
        otherKeys.every((key) => state[key] === initialSnapshot.value[key])
      )
    })

    watch(
      () => props.modelValue,
      (newVal) => {
        if (newVal && typeof newVal === 'object') {
          const { saving_data: _sd, ...incoming } = newVal
          Object.assign(state, incoming)
          initialSnapshot.value = { ...incoming, saving_data: false }
        }
      },
      { deep: true }
    )

    function toggle(key: VariableSelectorToggleKey) {

      if (!allowEdit.value) {
        return
      }

      state[key] = !state[key]
      const { saving_data: _sd, ...toggleState } = state
      emit('update:modelValue', toggleState)
    }

    function reset() {
      abortController.value?.abort()
      abortController.value = null
      previewing.value = false
      const { saving_data: _sd, ...snapshot } = initialSnapshot.value
      Object.assign(state, snapshot)
      localCharts.value = null
      dataExtra.value = null
      previewRequested.value = false
      emit('update:modelValue', snapshot)
    }

    function buildConfiguration() {
      return {
        enabled: true,
        calculationMethod: state.calculationMethod,
        includeParentTerms: state.includeParentTerms,
        includeSisterTerms: state.includeSisterTerms,
        sisterCompanyInclusion: state.sisterCompanyInclusion,
        dsoAdjustmentEnabled: state.dsoAdjustmentEnabled,
        combinationGroup: {
          priorityOrder: 1,
          commodity: state.commodity,
          buyer_leverage: state.buyer_leverage,
          buyer_country: state.buyer_country,
          buyer_region: state.buyer_region,
          buyer_industry: state.buyer_industry,
          buyer_credit_rating: state.buyer_credit_rating          
        },
      }
    }

    async function calculate() {
      if (!props.entityUuid) return

      abortController.value?.abort()
      const controller = new AbortController()
      abortController.value = controller

      previewing.value = true
      previewRequested.value = true
      try {
        const response = await previewSupplierStandard2Waterfall(
          props.entityUuid,
          buildConfiguration(),
          controller.signal
        )
        if (response.success) {
          localCharts.value = response.data?.charts ?? null
          dataExtra.value  = response.data.extra.supplierStandard2Strategy ?? null
          emit('preview-result', response.data)
        } else {
          toast.error(t('home.entityCard.infoCards.previewfailed'))
        }
      } catch {
        // aborted — previous request cancelled by a newer one, silently ignore
      } finally {
        if (abortController.value === controller) {
          previewing.value = false
        }
      }
    }

    const strategyTerms = computed(() => {
      if (dataExtra.value == null) {
        return null
      }
      return dataExtra.value.terms
    })


    const calculationMethodComputed = computed(() => {
      if (dataExtra.value == null) {
        return null
      }
      return dataExtra.value.calculationMethod
    })

    const DSO_FALLBACK_ZEROED_DETAIL_KEYS = ['average', 'third_quartile', 'max', 'min']

    const detailsComputed = computed(() => {
      if (dataExtra.value == null) return null
      const details = dataExtra.value.details
      if (details == null) return null
      const source = dataExtra.value.dsoFallbackApplied
        ? Object.fromEntries(
            Object.entries(details).map(([key, val]) => [
              key,
              DSO_FALLBACK_ZEROED_DETAIL_KEYS.includes(key) ? 0 : val
            ])
          )
        : details
      return Object.fromEntries(
        Object.entries(source).sort(([, a], [, b]) => {
          if (a == null && b == null) return 0
          if (a == null) return 1
          if (b == null) return -1
          return a - b
        })
      )
    })

    const dsoAnnotationApplies = computed(() => {
      return Boolean(dataExtra.value?.dsoAdjustmentApplied || dataExtra.value?.dsoFallbackApplied)
    })


    const allowEdit = computed(() => {    
      return props.allowEditVariables
    })


    const configSnapshot = computed(() => ({
      commodity:            state.commodity,
      buyer_leverage:       state.buyer_leverage,
      buyer_country:        state.buyer_country,
      buyer_region:         state.buyer_region,
      buyer_industry:       state.buyer_industry,
      buyer_credit_rating:  state.buyer_credit_rating,
      calculationMethod:    state.calculationMethod,
      includeParentTerms:   state.includeParentTerms,
      includeSisterTerms:   state.includeSisterTerms,
      sisterCompanyInclusion: state.sisterCompanyInclusion,
      dsoAdjustmentEnabled: state.dsoAdjustmentEnabled,
    }))

    watch(configSnapshot, () => {
      if (!hasChanges.value) {
        reset()
        return
      }
      
      calculate()
    }, { deep: true })

    async function save() {
      if (!props.entityUuid) return
      state.saving_data = true
      try {
        const response = await saveSupplierStandard2Waterfall(
          props.entityUuid,
          buildConfiguration(),
          onlyMetricWasChanged.value
        )
        if (response.success) {
          const saved = { ...state }
          initialSnapshot.value = saved
          previewRequested.value = false
          emit('save', response.data)
          emit('update:modelValue', saved)
          toast.success(t('global.distributionCharts.configurationSavedSuccessfully'))
        } else {
          toast.error(t('global.distributionCharts.errorSavingConfiguration'))
        }
      } finally {
        state.saving_data = false
      }
    }
    
    const activeCharts = computed(() => {      
      return previewRequested.value ? localCharts.value : props.charts
    })    

    const buyerLeverageData = computed<[string, number][]>(() =>
      activeCharts.value?.distributionCharts?.[state.distributionChartSelected] ?? []
    )

    const termsByMetricData = computed<[string, number][]>(() =>
      activeCharts.value?.termsByMetric?.[state.calculationMethod] ?? []
    )

    const yAxisTitleComnputed = computed (() => {
      return t('global.distributionCharts.'+state.distributionChartSelected)
    })

    //- Variable if the terms !== null in the default configuration
    const haveSomeTermsDefault = computed(() => {
      return !StringUtils.isNullUndefinedOrEmpty(props.terms)
    })

    //- Variable if the terms !== null in the preview api
    const haveSomeTermsPreview = computed(() => {
      return !StringUtils.isNullUndefinedOrEmpty(strategyTerms.value)
    })


    const existsSomeTerms =  computed(() => {
      if (previewRequested.value) {
        return haveSomeTermsPreview.value
      }
      return  haveSomeTermsDefault.value
    })

    const termsByMetricSeries = computed(() => termsByMetricData.value.map((item) => item[1]))
    const termsByMetricCategories = computed(() => termsByMetricData.value.map((item) => item[0]))
    const buyerLeverageSeries = computed(() => buyerLeverageData.value.map((item) => item[1]))
    const buyerLeverageCategories = computed(() => buyerLeverageData.value.map((item) => item[0]))


     function handleSisterValues(
      e: RadioButtonChangeEvent,
    ) {

      const value = e.value;
      // Validate
      if (value !== "include" && value !== "only_if_no_match" && value !== "exclude") {
        return;
      }

      state.sisterCompanyInclusion = value;
    }
    

    function setBarSize(size: number) {
      const newSize = (size * 100) / MAX_DAYS;
      return newSize > 100 ? 100 : newSize;
    }
    


    return {
      state,
      hasChanges,
      onlyMetricWasChanged,
      previewing,
      toggle,
      reset,
      calculate,
      save,
      showExtraContent,
      VALUE_TO_USE_OPTIONS,
      DISTRIBUTION_CHART_OPTIONS,
      termsByMetricData,
      termsByMetricSeries,
      termsByMetricCategories,
      handleSisterValues,
      buyerLeverageData,
      buyerLeverageSeries,
      buyerLeverageCategories,
      yAxisTitleComnputed,
      strategyTerms,
      setBarSize,
      PaymentTermsStrategiesUtils,
      calculationMethodComputed,
      detailsComputed,
      dsoAnnotationApplies,
      dataExtra,
      haveSomeTermsDefault,
      haveSomeTermsPreview,
      existsSomeTerms,
      previewRequested,
      localCharts,
      allowEdit
    }
  },
})
</script>
<style scoped lang="scss">
@import "src/resources/assets/styles/variables/colors";


.boder-inputs {
  margin-left: 20px;
  padding-left: 10px;
  border-left: 4px solid #eaecf0;
}

/* KRadioButton custom colors */
:deep(.k-radio) {
  border-color: #6b7280;
  background-color: #6b7280;
  width: 18px;
  height: 18px;
  flex-shrink: 0;
}

:deep(.k-radio:checked) {
  border-color: #38bdf8;
  background-color: #38bdf8;
  box-shadow: inset 0 0 0 4px #ffffff;
  background-image: none !important;
}

:deep(.k-radio:focus),
:deep(.k-radio:focus-visible) {
  outline: none;
  box-shadow: inset 0 0 0 4px #ffffff, 0 0 0 2px rgba(56, 189, 248, 0.4);
}

:deep(.k-radio-label) {
  font-size: 0.875rem;
  color: #374151;
}

.info-button {
  display: flex;
  padding: 2px 6px;
  align-items: center;
  gap: 10px;
  border-radius: 4px;
  background: $color-gray-100;
  height: fit-content;
}

</style>
