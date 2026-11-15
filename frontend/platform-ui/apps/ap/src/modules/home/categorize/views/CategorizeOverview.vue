<!-- 
  Analyze section / Overview tab
 -->
<template>
<div class="row">
  <div class="col-xl-3 col-lg-3 card-entity-card__overview-wrp" :class="{ 'bg-blur': loading }">
    <div class="card card-entity-card__overview">
      <div class="card-body">
        <div class="row">
          <div class="col-12 col-lg-12">
            <h5 class="mb-1 font-bold text-base">{{ $t('global.paymentTerms') + ' (days)' }}
              <CalculumTooltipIcon :infoText="$t('home.categorize.tooltip.avgPaymentTerms')"></CalculumTooltipIcon>
            </h5>
          </div>
        </div>
        <BarsWrapper class="mb-2" :mainValue="typeof contractualValueComputed === 'number' ? contractualValueComputed : (typeof actualValueComputed === 'number' ? actualValueComputed : undefined)" :extraValue="typeof actualValueComputed === 'number' ? actualValueComputed : undefined" :contractualValue="contractualValueComputed ?? undefined" :title="$t('global.contractual')" :tooltipText="$t('global.contractualPaymentTermsTooltip')" :type="'contractual'" :showSkeleton="loading"></BarsWrapper>
        <div class="row">
          <div class="col-12">
            <div class="d-flex align-items-baseline">
              <h5 class="mb-0 font-bold text-base">{{ $t('global.buyerLeverageMateriality') }}
                <CalculumTooltipIcon :infoText="buyerLeverageText" :advancedTooltipClass="true" :uniqueIdentifier="'analyze-butyer-leverage'" :keyPopOver="'analyzeBuyerLeverage'"></CalculumTooltipIcon>
              </h5>
            </div>
          </div>
        </div>
        <div class="row">
          <div class="col-12 col-lg-12">
            <div class="row mx-0">
              <p class="mb-1 text-lg font-semibold" :style="`color: ${levelColorByLevel}`">{{ panels.buyerLeverage.label }}</p>
              <LevelDashesChart :level="buyerLeverageLevelComputed" :level-color="levelColorByLevel(buyerLeverageLevelComputed)" :total-levels="3"></LevelDashesChart>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
  <div class="col-xl-3 col-lg-3">
    <BigNumberThreeCols :big-number-title="$t('home.analyze.analyzeProgramOverview.spendVolume')" :big-number-value="panels.spend.realValue ? StringUtils.formatBigNumbers(panels.spend.realValue) : '0'" :is-loading="loading" :number-center-title="$t('home.categorize.other.averageSpends')" :number-center-value="panels.summary.avgSpendVolume ? StringUtils.formatBigNumbers(panels.summary.avgSpendVolume) : '0'" :title="$t('home.categorize.other.spend')" :tooltip-text="$t('home.categorize.tooltip.spend')"></BigNumberThreeCols>
  </div>
  <div class="col-xl-3 col-lg-3">
    <BigNumberThreeCols :big-number-title="$t('global.buyingEntityS')" :big-number-value="getNumberWithDecimals(panels.summary.buyers, 0) ?? 0" :is-loading="loading" :number-center-title="$t('global.suppliers')" :number-center-value="getNumberWithDecimals(panels.summary.suppliers, 0) ?? 0" :number-left-title="$t('global.ultimateParents')" :number-left-value="getNumberWithDecimals(panels.summary.parents, 0) ?? 0" :number-right-title="$t('global.spendLines')" :number-right-value="getNumberWithDecimals(panels.summary.spends, 0) ?? 0" :title="$t('global.entities')"></BigNumberThreeCols>
  </div>
  <div class="col-xl-3 col-lg-3 card-entity-card__overview-wrp">
    <div class="card">
      <div class="card-body" :class="{ 'bg-blur': isLoadingSpendFileDetails }">
        <div class="row">
          <div class="col-12 d-flex justify-content-between">
            <h5 class="mb-2 text-base font-bold">{{ $t('global.details') }}</h5>
          </div>
        </div>
        <div class="row">
          <div class="col-12 col-lg-12">
            <p class="mb-0 text-xs text-gray-400">{{ $t('global.buyingEntityS') }}</p>
          </div>
          <div class="col-12 col-lg-12">
            <p class="font-semibold text-gray-700 text-sm details-card__section__value">{{ formattedBuyersNamesComputed }}</p>
          </div>
        </div>
        <div class="row">
          <div class="col-12 col-lg-12">
            <div class="row">
              <div class="col-12">
                <p class="mb-0 text-xs text-gray-400">{{ $t('global.countrys') }}</p>
              </div>
              <div class="col-12 col-lg-12">
                <p class="font-semibold text-gray-700 text-sm details-card__section__value">{{ formattedCountriesComputed }}</p>
              </div>
            </div>
          </div>
        </div>
        <div class="row">
          <div class="col-12 col-lg-12">
            <div class="row">
              <div class="col-12">
                <p class="mb-0 text-xs text-gray-400">{{ $t('global.currencyS') }}</p>
              </div>
              <div class="col-12 col-lg-12">
                <p class="font-semibold text-gray-700 text-sm details-card__section__value">{{ formattedCurrenciesComputed }}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>
<div class="row">
  <div class="col">
    <MetricsComponent :section="'analyze'" :key="keyMetricsComponent"></MetricsComponent>
  </div>
</div>
</template>

<script lang="ts">
import {
  ComputedRef,
  computed,
  defineComponent,
  reactive,
  toRefs,
  watch
} from 'vue'

import { getNumberWithDecimals } from '@/utils/FormatData'
import { useI18n } from 'vue-i18n'
import { useGlobalFiltersStore } from '@/stores/globalFilters'
import { useEntityCardStore } from '@/stores/entityCard'
import { useCategorizeStore } from '@/stores/categorize'
import * as colorsGroups from '@/utils/ColorsGroups';
import * as formatData from '@/utils/FormatData'
import * as Routing from '@/services/router/Routing'
import BigNumberThreeCols from '@/modules/components/cards/BigNumberThreeCols.vue'
import CalculumBigNumber from '@/modules/components/charts/CalculumBigNumber.vue'
import { CalculumFullScreen } from '@ada/design-system'
import { CalculumLoading } from '@ada/design-system'
import CalculumThreeProgressChart from '@/modules/components/charts/CalculumThreeProgressChart.vue'
import CalculumTooltipIcon from '@/modules/components/CalculumTooltipIcon.vue'
import { LevelDashesChart } from '@ada/design-system'
import MetricsComponent from '@/modules/components/metrics/MetricsComponents.vue'
import optionsForCharts from '../data/optionsForCharts'
import useProgram from '@/modules/home/analyze/composables/useProgram';
import * as clickOutsideRelated from '@/utils/clickOutsideRelated'
import BarsWrapper from '@/modules/components/BarsWrapper.vue'
// Utils
import {
  ENTITY_SPENDFILE_LEVEL_TYPE,
  formatDetailsItems,
  getBarSize,
  MAX_TERMS_DAYS_CHARTS,
  StringUtils,
  NumberUtils
} from '@/utils';

// Types
import { Panels, SelectedCharts, SpendFileDetails, OverviewInfoPanels } from '../types';
import { FiltersApplied, FiltersAPIParam } from '@/types';
import useUser from "@/services/user/composables/useUser";
import useSpendFile from "@/composables/useSpendFile";
import useFeatureCreditRating from "@/composables/useCreditRatingFeature";
import { useAppStore } from '@/stores/app';

export default defineComponent({
  name: 'CategorizeOverview',
  components: {
    BigNumberThreeCols,
    CalculumBigNumber,
    CalculumFullScreen,
    CalculumLoading,
    CalculumThreeProgressChart,
    CalculumTooltipIcon,
    BarsWrapper,    
    LevelDashesChart,
    MetricsComponent,
  },
  setup() {
    // Composables
    const globalFiltersStore = useGlobalFiltersStore()
    const entityCardStore = useEntityCardStore()
    const categorizeStore = useCategorizeStore()
    const translate = useI18n({ warnHtmlMessage: false, useScope: 'global' })
    const appStore = useAppStore();

    /*** Computed ***/
    const {
      user
    } = useUser();

    const {
      spendFileVersionActiveId
    } = useSpendFile()

    const filtersApplied: ComputedRef<FiltersApplied> = computed(() => globalFiltersStore.getFiltersApplied)

    const filtersAppliedFormattedREST: ComputedRef<string | null> = computed(() => {
      return formatData.convertFiltersToREST(filtersApplied.value)
    })

    const currencyRate: ComputedRef<number> = computed(() => appStore.getCurrencyAmount);

    // Buyers Names
    const formattedBuyersNamesComputed = computed(() => {
      if (data.spendFileDetails?.buyers) {
        return formatDetailsItems({ items: data.spendFileDetails.buyers, maxItems: 3 })
      }
      return 'N/A'
    })

    // Countries
    const formattedCountriesComputed = computed(() => {
      if (data.spendFileDetails?.countries) {
        return formatDetailsItems({ items: data.spendFileDetails.countries, maxItems: 3 })
      }
      return 'N/A'
    })

    // Currencies
    const formattedCurrenciesComputed = computed(() => {
      if (data.spendFileDetails?.currencies) {
        return formatDetailsItems({ items: data.spendFileDetails.currencies, maxItems: 3 })
      }
      return 'N/A'
    })

    // Get the color of the level based on the level number
    const buyerLeverageLevelComputed = computed(() => {
      return levelByGradeLevelText(data.panels.buyerLeverage.label)
    })

    const { featureCreditRatingEnabled } = useFeatureCreditRating();

    const availableOptionsForCharts = computed(() => {
      if (featureCreditRatingEnabled.value) {
        return data.optionsForCharts;
      }
      return data.optionsForCharts.filter((o: any) => !o.value.includes('CreditScore'));
    })

    const optionsForChartsTopLeft = computed(() => {
      return availableOptionsForCharts.value
        .filter((option: any) => (
          option.value !== data.optionTitleTopRight
          && option.value !== data.optionTitleBottomRight
          && option.value !== data.optionTitleBottomLeft
        )
        )
    })

    const optionsForChartsTopRight = computed(() => {
      return availableOptionsForCharts.value
        .filter((option: any) => (
          option.value !== data.optionTitleTopLeft
          && option.value !== data.optionTitleBottomRight
          && option.value !== data.optionTitleBottomLeft
        )
        )
    })

    const optionsForChartsBottomLeft = computed(() => {
      return availableOptionsForCharts.value
        .filter((option: any) => (
          option.value !== data.optionTitleTopRight
          && option.value !== data.optionTitleBottomRight
          && option.value !== data.optionTitleTopLeft
        )
        )
    })

    const optionsForChartsBottomRight = computed(() => {
      return availableOptionsForCharts.value
        .filter((option: any) => (
          option.value !== data.optionTitleTopRight
          && option.value !== data.optionTitleTopLeft
          && option.value !== data.optionTitleBottomLeft
        )
        )
    })

    /*** END Computed ***/

    interface CategorizeOverview {
      averageSpendsText: string,
      buyerEntitiesText: string,
      buyerLeverageText: string,
      chartKey: number,
      currentAdvancedTootlip: string,
      isLoadingSpendFileDetails: boolean,
      loading: boolean,
      numberOfSpendsText: string,
      numberOfSuppliersText: string,
      numberOfUltimateParentsText: string,
      optionsForCharts: Array<any>,
      optionTitleBottomLeft: string,
      optionTitleBottomRight: string,
      optionTitleTopLeft: string,
      optionTitleTopRight: string,
      outstandingText: string,
      panels: Panels,
      selectedCharts: SelectedCharts,
      showChartFullScreen: boolean,
      spendFileDetails: SpendFileDetails | null,
      spendFileId: string | null,
      keyMetricsComponent: number
    }

    const data = reactive<CategorizeOverview>({
      loading: false,
      isLoadingSpendFileDetails: false,
      optionsForCharts,
      showChartFullScreen: false,
      currentAdvancedTootlip: '',
      chartKey: new Date().getUTCMilliseconds(),
      selectedCharts: {  // ? - Make null
        fullScreen: '',
        topLeft: '',
        topRight: '',
        bottomLeft: '',
        bottomRight: ''
      },
      optionTitleTopRight: '',
      optionTitleTopLeft: '',
      optionTitleBottomRight: '',
      optionTitleBottomLeft: '',
      panels: {
        buyerLeverage: {
          color: '#2E9D58',
          value: 0,
          label: '',
          valueToDisplay: null
        },
        spend: {
          realValue: 0
        },
        outstanding: {
          realValue: 0
        },
        summary: {
          avgSpendVolume: 0,
          parents: 0,
          suppliers: 0,
          spends: 0,
          buyers: 0
        },
        paymentTerm: {
          contractualPaymentTerms: null,
          currentPaymentTerms: null,
          maxValue: 0
        }
      },
      buyerLeverageText: translate.t('home.categorize.tooltip.buyerLeverage'),
      outstandingText: translate.t('home.categorize.tooltip.outstanding'),
      numberOfSuppliersText: translate.t('home.categorize.tooltip.numberOfSuppliers'),
      numberOfUltimateParentsText: translate.t('home.categorize.tooltip.numberOfUltimateParents'),
      numberOfSpendsText: translate.t('home.categorize.tooltip.numberOfSpendLinesTooltip'),
      averageSpendsText: translate.t('home.categorize.tooltip.averageSpends'),
      buyerEntitiesText: translate.t('home.categorize.tooltip.buyerEntities'),
      spendFileDetails: null,
      spendFileId: spendFileVersionActiveId.value,
      keyMetricsComponent: NumberUtils.getRandomInt()
    })

    /**
     * Exit fullscreen mode for selected chart
     */
    function closeFullScreen() {
      data.showChartFullScreen = false
      data.selectedCharts.fullScreen = ''
    }

    function showChartInFullScreen(chartId: string) {
      data.selectedCharts.fullScreen = ''
      if (chartId === 'topLeft') {
        data.selectedCharts.fullScreen = data.selectedCharts.topLeft
      } else if (chartId === 'topRight') {
        data.selectedCharts.fullScreen = data.selectedCharts.topRight
      } else if (chartId === 'bottomLeft') {
        data.selectedCharts.fullScreen = data.selectedCharts.bottomLeft
      } else if (chartId === 'bottomRight') {
        data.selectedCharts.fullScreen = data.selectedCharts.bottomRight
      }

      data.showChartFullScreen = true
      data.chartKey = new Date().getUTCMilliseconds()
    }

    /**
     * Get the color of the level based on the level number
     * 
     * ? - Move to global utils file
     */
    function levelColorByLevel(level: number) {
      switch (level) {
        // Level 1 of 3
        case 1:
          return colorsGroups.low
        case 2:
          return colorsGroups.medium
        case 3:
          return colorsGroups.high
        default:
          return colorsGroups.noLevel
      }
    }

    /**
     * Get level given grade level text
     */
    function levelByGradeLevelText(gradeLevelText: string): number {
      switch (gradeLevelText) {
        case 'Low':
          return 1
        case 'Medium':
          return 2
        case 'High':
          return 3
        default:
          return 0
      }
    }

    /**
     * API Calls
     */

    const { programSelectedId } = useProgram();

    const filtersAPIParam: ComputedRef<FiltersAPIParam> = computed(() => {
      return {
        globalFilter: filtersAppliedFormattedREST.value,
        currencyRate: currencyRate.value,
        targetSpendFileVersionUuid: spendFileVersionActiveId.value,
        targetProgramUuid: programSelectedId.value ?? user.value?.activeProgramDefaultId
      }
    })

    /**
     * Get Overview Panels Info from API
     */
    function getOverviewPanelsInfo() {
      // Disable loading
      data.loading = true

      const params: {
        filters: FiltersAPIParam,
        callbackSuccess: (response: OverviewInfoPanels) => void
        callbackError: (error: any) => void
      } = {
        filters: filtersAPIParam.value,
        callbackSuccess: (response: OverviewInfoPanels) => {
          // Avg Payment Terms
          data.panels.paymentTerm.currentPaymentTerms = response.paymentTerm.currentPaymentTerms ? Math.round(response.paymentTerm.currentPaymentTerms) : null
          data.panels.paymentTerm.contractualPaymentTerms = response.paymentTerm.currentPaymentTerms ? Math.round(response.paymentTerm.contractualPaymentTerms) : null
          data.panels.paymentTerm.maxValue = Math.round(response.paymentTerm.maxValue)

          // Buyer Leverage
          // ? - Rename label to description
          data.panels.buyerLeverage.label = response.buyerLeverage.description

          // Spend
          data.panels.spend.realValue = response.spendM.realValue

          // Outstanding
          data.panels.outstanding.realValue = response.outstanding.realValue

          // Summary
          data.panels.summary.avgSpendVolume = response.summary.avgSpendVolume
          data.panels.summary.parents = response.summary.numOfUltimateParent
          data.panels.summary.suppliers = response.summary.numOfSuppliers
          data.panels.summary.spends = response.summary.numOfSpends
          data.panels.summary.buyers = response.summary.numOfBuyers

          data.chartKey = new Date().getUTCMilliseconds()

          // Disable loading
          data.loading = false
        },
        callbackError: (response: any) => {
          // Disable loading
          data.loading = false
        }
      }
      categorizeStore.getOverviewInfoPanels(params)
    }

    /**
     * Get spend file details from API
     */
    function getSpendFileDetails() {
      // Enable loading
      data.isLoadingSpendFileDetails = true

      const params: {
        id: string | null, // ? - Warn: can this be null?
        type: string,
        filters: FiltersAPIParam,
        callbackSuccess: (response: SpendFileDetails) => void,
        callbackError: (response: any) => void
      } = {
        id: data.spendFileId,
        type: ENTITY_SPENDFILE_LEVEL_TYPE.SPEND_FILE,
        filters: filtersAPIParam.value,
        callbackSuccess: (response: SpendFileDetails) => {
          data.spendFileDetails = response

          // Disable loading
          data.isLoadingSpendFileDetails = false
        },
        callbackError: (response: any) => {


          // Disable loading
          data.isLoadingSpendFileDetails = false
        }
      }
      entityCardStore.getEntityOrSpendFileDetails(params)
    }

    // *** Setup ***

    getOverviewPanelsInfo()

    getSpendFileDetails()

    // *** END Setup ***

    // *** Watchers ***

    window.onresize = () => {
      data.chartKey = new Date().getUTCMilliseconds()
    }

    watch(filtersApplied, () => {
      data.keyMetricsComponent++
      getOverviewPanelsInfo()
      getSpendFileDetails()
    })

    // *** END Watchers ***





    const getDifferenceBetweenActualAndContractual = computed(() => {
      return NumberUtils.differenceBetweenTwoNumbers(Number(data.panels.paymentTerm.contractualPaymentTerms), Number(data.panels.paymentTerm.currentPaymentTerms ?? 0))

    })

    const contractualAndCurrentValues = computed(() => {
      return [Number(actualValueComputed.value ?? 0), Number(contractualValueComputed.value ?? 0)]
    })

    const actualValueComputed = computed(() => {
      return data.panels.paymentTerm.currentPaymentTerms ? Number(data.panels.paymentTerm.currentPaymentTerms) : null
    })

    const contractualValueComputed = computed(() => {
      return data.panels.paymentTerm.contractualPaymentTerms ? Number(data.panels.paymentTerm.contractualPaymentTerms) : null
    })

    return {
      ...toRefs(data),
      actualValueComputed,
      buyerLeverageLevelComputed,
      clickOutsideRelated,
      closeFullScreen,
      contractualAndCurrentValues,
      contractualValueComputed,
      formatData,
      formattedBuyersNamesComputed,
      formattedCountriesComputed,
      formattedCurrenciesComputed,
      getBarSize,
      getDifferenceBetweenActualAndContractual,
      getNumberWithDecimals,
      levelByGradeLevelText,
      levelColorByLevel,
      MAX_TERMS_DAYS_CHARTS,
      optionsForChartsBottomLeft,
      optionsForChartsBottomRight,
      optionsForChartsTopLeft,
      optionsForChartsTopRight,
      Routing,
      showChartInFullScreen,
      StringUtils,
    }
  }
})
</script>
<style lang="scss" scoped>
// ? - Remove when global styles are in place
.card {
  padding: 0;
  margin-bottom: 16px;
  min-height: 240px; // Same as program / overview

  .card-body {
    padding: 24px;
  }
}

/*** Set the height of all cards at the top to the same value ***/
.row>[class*="col-"]:has(> .card) {
  display: flex;
}

.row>[class*="col-"]:has(> .card)>.card {
  width: 100%;
}

/*** ***/


// Truncate long values
.details-card__section__value {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.negative-margin {
  margin-top: -5px;
}

// END Truncate long values</style>