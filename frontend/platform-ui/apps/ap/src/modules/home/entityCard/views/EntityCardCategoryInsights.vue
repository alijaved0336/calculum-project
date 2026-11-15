<template>
<div class="d-flex w-100 flex-column">
  <div class="row mr-2">
    <div class="col-8">
      <div class="card shadow-none">
        <div class="card-body">
          <div class="row"><span class="text-base font-semibold text-gray-600 mb-2 ml-3">{{ $t('global.categoryExposure') }}</span><span class="d-inline-flex align-items-center text-nowrap ml-auto"><span v-if="compositionCalculatedAt" class="text-xs text-gray-500">{{ $t('home.entityCard.supplierInsights.lastCalculated') }}: {{ formatCalculatedAt(compositionCalculatedAt) }}</span><button class="btn btn-link btn-sm p-0 ml-2 lovelace-refresh-btn" type="button" :title="$t('home.entityCard.supplierInsights.refresh')" :disabled="loadingComposition" @click="forceRefreshCategory"><i class="fa-solid fa-arrows-rotate text-base"></i></button></span></div>
          <div class="row">
            <div class="col-6 d-flex flex-column mt-3">
              <Skeleton class="skeletons-bg mb-2" v-if="loadingPricing" :shape="'rectangle'" :style="{ width: '100%', height: '160px', borderRadius: '8px' }"></Skeleton>
              <MaterialIndexTable v-if="!loadingPricing && commodityPricingData.length > 0 && !state.compositionError" :data="commodityPricingData" :showMore="showMore">         </MaterialIndexTable>
            </div>
            <div class="col-6 d-flex flex-column mt-3">
              <Skeleton class="skeletons-bg mb-2" v-if="loadingTimeSeries" :shape="'rectangle'" :style="{ width: '100%', height: '160px', borderRadius: '8px' }"></Skeleton>
              <AggregateImpactIndexChart v-if="!loadingTimeSeries && getSeries && getCategories && !state.compositionError" :dataSeries="getSeries" :dataCategories="getCategories"></AggregateImpactIndexChart>
            </div>
          </div>
          <div class="row bottom-container" v-if="loadingComposition">
            <div class="col-6 mt-3">
              <Skeleton class="skeletons-bg mb-2" :shape="'rectangle'" :style="{ width: '100%', height: '160px', borderRadius: '8px' }"></Skeleton>
            </div>
            <div class="col-6 mt-3">
              <Skeleton class="skeletons-bg mb-2" :shape="'rectangle'" :style="{ width: '100%', height: '160px', borderRadius: '8px' }"></Skeleton>
            </div>
            <div class="col-6 mt-3">
              <Skeleton class="skeletons-bg mb-2" :shape="'rectangle'" :style="{ width: '100%', height: '160px', borderRadius: '8px' }"></Skeleton>
            </div>
            <div class="col-6 mt-3">
              <Skeleton class="skeletons-bg mb-2" :shape="'rectangle'" :style="{ width: '100%', height: '160px', borderRadius: '8px' }"></Skeleton>
            </div>
          </div>
          <div class="row mt-3 bottom-container" v-if="!loadingComposition && state.compositionError">
            <div class="col-6 mt-3">
              <div class="insight-error-placeholder d-flex flex-column align-items-center justify-content-center text-center py-4 px-3">
                <button class="btn btn-primary btn-sm mb-3" type="button" @click="apiCalls"><i class="fa-solid fa-arrows-rotate text-base mr-1"></i>{{ $t('home.entityCard.supplierInsights.serviceErrorRetry') }}</button>
                <p class="small text-muted mb-0">{{ $t('home.entityCard.supplierInsights.serviceErrorTimeout')}}</p>
              </div>
            </div>
          </div>
          <div class="row mt-3 bottom-container" v-if="!loadingComposition && !state.compositionError">
            <div :class="showMore ? 'col-6 mt-3' : 'col-12 mt-3'">
              <AiSummaryInsightsCard v-if="categoryCompositionsResponse && getAiSummary" :data="getAiSummary"></AiSummaryInsightsCard>
            </div>
            <div class="col-6 mt-3" v-if="showMore">
              <StrategicRecommendationsCard v-if="categoryCompositionsResponse" :data="getStrategicRecommendationsCard"></StrategicRecommendationsCard>
            </div>
            <div class="col-6 mt-3" v-if="showMore">
              <RiskAssessmentCard v-if="categoryCompositionsResponse" :data="getRiskAssessmentCard"></RiskAssessmentCard>
            </div>
            <div class="col-6 mt-3" v-if="showMore">
              <PushbackArgumentsCard v-if="categoryCompositionsResponse" :data="getPushbackArgumentsCard"></PushbackArgumentsCard>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div class="col-4">
      <div class="card shadow-none">
        <div class="card-body">
          <div class="d-flex flex-row align-items-start justify-content-between"><h6 class="text-base font-semibold text-gray-600 mb-3">{{ $t('home.entityCard.supplierInsights.tariffs') }}</h6><span class="d-inline-flex align-items-center text-nowrap ml-auto"><span v-if="tariffsCalculatedAt" class="text-xs text-gray-500">{{ $t('home.entityCard.supplierInsights.lastCalculated') }}: {{ formatCalculatedAt(tariffsCalculatedAt) }}</span><button class="btn btn-link btn-sm p-0 ml-2 lovelace-refresh-btn" type="button" :title="$t('home.entityCard.supplierInsights.refresh')" :disabled="state.tariffsLoading || state.isInitializing" @click="forceRefreshTariffs"><i class="fa-solid fa-arrows-rotate text-base"></i></button></span></div>
          <template v-if="state.isInitializing">
            <div class="insight-error-placeholder d-flex flex-column justify-content-start py-3 px-3">
              <Skeleton class="skeletons-bg mb-2" :shape="'rectangle'" :style="{ width: '100%', height: '40px', borderRadius: '8px' }"></Skeleton>
              <Skeleton class="skeletons-bg mb-2" :shape="'rectangle'" :style="{ width: '100%', height: '160px', borderRadius: '8px' }"></Skeleton>
              <Skeleton class="skeletons-bg mb-2" :shape="'rectangle'" :style="{ width: '100%', height: '80px', borderRadius: '8px' }"></Skeleton>
            </div>
          </template>
          <template v-else-if="state.tariffsLoading">
            <div class="insight-error-placeholder d-flex flex-column justify-content-start text-center py-3 px-3">
              <Skeleton class="skeletons-bg mb-2" :shape="'rectangle'" :style="{ width: '60%', height: '18px', borderRadius: '8px', margin: '0 auto' }"></Skeleton>
              <Skeleton class="skeletons-bg mb-2" :shape="'rectangle'" :style="{ width: '100%', height: '40px', borderRadius: '8px' }"></Skeleton>
              <Skeleton class="skeletons-bg mb-2" :shape="'rectangle'" :style="{ width: '100%', height: '160px', borderRadius: '8px' }"></Skeleton>
              <Skeleton class="skeletons-bg mb-2" :shape="'rectangle'" :style="{ width: '100%', height: '80px', borderRadius: '8px' }"></Skeleton>
            </div>
          </template>
          <template v-else-if="state.tariffsError">
            <div class="insight-error-placeholder d-flex flex-column align-items-center justify-content-center text-center py-4 px-3">
              <button class="btn btn-primary btn-sm mb-3" type="button" @click="apiCalls"><i class="fa-solid fa-arrows-rotate text-base mr-1"></i>{{ $t('home.entityCard.supplierInsights.serviceErrorRetry') }}</button>
              <p class="small text-muted mb-0">{{ state.tariffsError === 'timeout' ? $t('home.entityCard.supplierInsights.serviceErrorTimeout') : $t('home.entityCard.supplierInsights.serviceErrorBusy') }}</p>
            </div>
          </template>
          <template v-else>
            <div>
              <div class="row tariff-country-row mb-3">
                <div class="col-6">
                  <label class="small text-gray-600 d-block">{{ $t('home.entityCard.supplierInsights.selectBuyerCountry') }}</label>
                  <SearchableDropdown class="tariff-country-dropdown mt-1" v-model="state.selectedBuyerCountry" @update:modelValue="onBuyerCountryChange" :items="countryOptions" value-key="value" label-key="label" :search-placeholder="$t('home.components.navbar.topMenu.search')" placeholder="" label="">
                    <template #selected="{ selectedLabel, selectedItem }"><span class="flag-country-entity-card tariff-flag-inside" v-if="selectedItem?.flagStyle" :style="selectedItem.flagStyle"></span><span :title="selectedLabel">{{ selectedLabel || '' }}</span></template>
                  </SearchableDropdown>
                </div>
                <div class="col-6">
                  <label class="small text-gray-600 d-block">{{ $t('home.entityCard.supplierInsights.selectSupplierCountry') }}</label>
                  <SearchableDropdown class="tariff-country-dropdown mt-1" v-model="state.selectedSupplierCountry" @update:modelValue="onSupplierCountryChange" :items="countryOptions" value-key="value" label-key="label" :search-placeholder="$t('home.components.navbar.topMenu.search')" placeholder="" label="">
                    <template #selected="{ selectedLabel, selectedItem }"><span class="flag-country-entity-card tariff-flag-inside" v-if="selectedItem?.flagStyle" :style="selectedItem.flagStyle"></span><span :title="selectedLabel">{{ selectedLabel || '' }}</span></template>
                  </SearchableDropdown>
                </div>
              </div>
              <div class="mb-3 d-flex gap-2 w-100">
                <div class="d-flex flex-column gap-2 flex-grow-1 min-w-0">
                  <label class="small text-gray-600 d-block mb-0">{{ $t('home.entityCard.supplierInsights.basedOnSpendVolume') }}</label>
                  <div class="d-flex align-items-center gap-2">
                    <template v-if="!isEditingSpendVolume"><span class="spend-volume-display font-semibold">{{ spendVolumeFormatted }}</span><span class="spend-volume-edit-icon cursor-pointer" @click="startEditSpendVolume" title="Edit"><i class="fa-solid fa-pencil text-sm text-gray-500"></i></span></template>
                    <template v-else>
                      <input class="form-control form-control-sm spend-volume-input" type="text" ref="spendVolumeInputRef" v-model="spendVolumeEditValue" @blur="commitSpendVolumeEdit" @keydown.enter="commitSpendVolumeEdit"/>
                    </template>
                  </div>
                </div>
              </div>
              <div class="tariff-stats-no-bg mb-3">
                <div class="row">
                  <div class="col-6">
                    <div class="tariff-stat-item"><span class="font-bold text-sm">{{ $t('home.entityCard.supplierInsights.currentTotalTariff')}}:
                        <CalculumTooltipIcon :infoText="tariffTooltips.currentTotalTariff"></CalculumTooltipIcon></span><span class="font-bold text-2xl ml-2">{{ formattedCurrentTotalTariff }}                    </span></div>
                    <div class="tariff-stat-item"><strong>{{ $t('home.entityCard.supplierInsights.effectiveDate') }}:
                        <CalculumTooltipIcon :infoText="tariffTooltips.effectiveDate"></CalculumTooltipIcon></strong><span class="ml-2">{{ formattedEffectiveDate }}</span></div>
                    <div class="tariff-stat-item"><strong>{{ $t('home.entityCard.supplierInsights.previousTotalTariff') }}:</strong>
                      <CalculumTooltipIcon :infoText="tariffTooltips.previousTotalTariff"></CalculumTooltipIcon><span class="ml-2">{{ formattedPreviousTotalTariff }}</span>
                    </div>
                  </div>
                  <div class="col-6">
                    <div class="tariff-stat-item"><strong class="mr-2">{{ $t('home.entityCard.supplierInsights.taxBurdenCalculation') }}:</strong> {{ formattedGetChange }}%</div>
                  </div>
                </div>
              </div>
              <div class="tariff-stats mb-3">
                <div class="row">
                  <div class="col-6">
                    <div class="tariff-stat-item"><span class="font-bold text-sm">{{ $t('home.entityCard.supplierInsights.totalTariffCosts') }}:
                        <CalculumTooltipIcon :infoText="tariffTooltips.totalTariffCosts"></CalculumTooltipIcon></span><span class="font-bold text-2xl ml-2">{{ formattedTotalTariffCosts }}</span></div>
                  </div>
                  <div class="col-6">
                    <div class="tariff-stat-item"><strong class="mr-2">{{ $t('home.entityCard.supplierInsights.taxBurdenCalculation') }}:                    </strong> {{ changeTarif }}                    </div>
                  </div>
                </div>
              </div>
              <div class="tariff-stats-no-bg">
                <div class="tariff-note mt-2 pt-2"><strong>{{ $t('home.entityCard.supplierInsights.tariffsNote') }}:</strong> {{ state.tariffsData.tariffsNote }}</div>
              </div>
              <div v-if="state.tariffsStrategy.length">
                <h6 class="tariff-strategy-title text-base font-semibold text-gray-600 mb-3">{{ $t('home.entityCard.supplierInsights.tariffsStrategy') }}</h6>
                <div class="tariff-strategy-list">
                  <ul class="list-unstyled mb-0">
                    <li class="mb-2 d-flex" v-for="(item, i) in state.tariffsStrategy" :key="'ts-' + i"><span class="bullet-point mr-2">•</span><span class="text-sm text-gray-700">{{ item }}</span></li>
                  </ul>
                </div>
              </div>
            </div>
          </template>
        </div>
      </div>
    </div>
  </div>
</div>
</template>

<script lang="ts">
import { defineComponent, reactive, computed, ref, shallowRef, nextTick, onMounted, PropType, type Ref } from 'vue';
import CalculumTooltipIcon from '@/modules/components/CalculumTooltipIcon.vue';
import { Skeleton } from '@progress/kendo-vue-indicators';
import CommodityPriceIndexBanner from '@/modules/home/entityCard/components/CommodityPriceIndexBanner.vue';
import ProductCompositionChart from '@/modules/home/entityCard/components/ProductCompositionChart.vue';
import AggregateImpactIndexChart from '@/modules/home/entityCard/components/AggregateImpactIndexChart.vue';
import RiskAssessmentCard from '@/modules/home/entityCard/components/RiskAssessmentCard.vue';
import AiSummaryInsightsCard from '@/modules/home/entityCard/components/AiSummaryInsightsCard.vue';
import StrategicRecommendationsCard from '@/modules/home/entityCard/components/StrategicRecommendationsCard.vue';
import PushbackArgumentsCard from '@/modules/home/entityCard/components/PushbackArgumentsCard.vue';
import MaterialIndexTable from '@/modules/home/entityCard/components/MaterialIndexTable.vue';
import { useAppStore } from '@/stores/app';
import { StringUtils } from '@/utils';
import {
  postLovelaceTariffs,
  getSpendsBySupplierWihtoutProgram,
  getSupplierSpendInK,
  postLovelaceCategoryCompositions
} from '@/modules/home/entityCard/api';
import type { CategoryCompositionsResponse, CommodityPricingOutput } from '@/modules/home/entityCard/types';
import { SearchableDropdown } from '@ada/design-system'

const FLAG_BASE = 'https://flagcdn.com/w40';

const tariffTooltips = {
  currentTotalTariff: 'The new, lower tax rate applied to the goods being imported as of the effective date.',
  previousTotalTariff: 'The original tax rate that was in place before the recent change.',
  totalTariffCosts: 'The actual dollar amount you are now paying in taxes under the new rate.',
  totalDutySavings: 'The amount of money saved due to the rate cut (the difference between what you would have paid before vs. what you pay now).',
  effectiveDate: 'The specific calendar date when the tax reduction officially began.',
  landedCostReduction: 'This is the estimated "bottom line" impact. Even though the tax rate dropped by a larger percentage, your total bill (which includes the product price and shipping) decreases less than that.'
};

function getServiceErrorType(result: { success: boolean; code?: number; data?: any }): 'timeout' | 'unavailable' | null {
  const code = result.code ?? result.data?.status;
  const err = result.data?.error ?? result.data?.message?.error ?? result.data?.message ?? result.data?.details?.error ?? '';
  const str = typeof err === 'string' ? err : JSON.stringify(err ?? '');
  if (result.success) return null;
  if (code === 400 || /timeout|Idle timeout/i.test(str)) return 'timeout';
  if (code === 503 || /503|UNAVAILABLE|high demand|temporarily/i.test(str)) return 'unavailable';
  return null;
}

export default defineComponent({
  name: 'EntityCardCategoryInsights',
  components: { CalculumTooltipIcon, Skeleton, CommodityPriceIndexBanner, ProductCompositionChart, AggregateImpactIndexChart, RiskAssessmentCard, AiSummaryInsightsCard, StrategicRecommendationsCard, PushbackArgumentsCard, MaterialIndexTable, SearchableDropdown },
  props: {
    companyId: { type: String, default: '' },
    entityDetails: { type: Object as PropType<Record<string, any> | null>, default: null },
    hsCodeOptions: { type: Array as PropType<{ value: string; label: string }[]>, default: () => [] },
    selectedHsCode: { type: String, default: '' },
    selectedHsCodeDescription: { type: String, default: '' }
  },
  emits: ['update:selectedHsCode'],
  setup(props, { emit }) {
    const appStore = useAppStore();


    const loadingComposition = ref(true)
    const compositionCalculatedAt = ref<string | null>(null)
    const tariffsCalculatedAt = ref<string | null>(null)
    const loadingPricing = ref(true)
    const loadingTimeSeries = ref(true)

    const showMore = ref(true)
    function toggleShowMore() { showMore.value = !showMore.value; }


    const analysisHsCode = ref(props.selectedHsCode);
    const analysisCommodity = ref(props.selectedHsCodeDescription);

    const categoryCompositionsResponse = shallowRef<CategoryCompositionsResponse | null>(null)
    const commodityPricingData: Ref<CommodityPricingOutput[]> = ref([])
    
    const state = reactive({
      selectedBuyerCountry: '',
      selectedSupplierCountry: '',
      spendVolume: 0,
      tariffsData: {
        currentTotalTariff: '-', totalTariffCosts: '-', effectiveDate: '-',
        previousTotalTariff: '-', totalDutySavings: '-', taxBurdenCalculation: '-',
        landedCostReduction: '-', tariffsNote: '-'
      },
      tariffsStrategy: [] as string[],
      tariffsLoading: false,
      tariffsError: null as 'timeout' | 'unavailable' | null,
      isInitializing: true,
      compositionError: false
    });

    const spendVolumeInputRef = ref<HTMLInputElement | null>(null);
    const isEditingSpendVolume = ref(false);
    const spendVolumeEditValue = ref('');

    const spendVolumeFormatted = computed(() => {
      const num = Number(state.spendVolume);
      if (!Number.isFinite(num) || num < 0) return '0';
      return Math.round(num).toLocaleString(undefined, { maximumFractionDigits: 2, minimumFractionDigits: 2 });
    });

    const countryOptions = computed(() => {
      const list = appStore.getCountries;
      if (!list || !list.length) return [];
      return list.map((country: { code?: string; alpha3Code?: string; localizedName?: string }) => {
        const code = (country.code ?? '').toLowerCase();
        const alpha3 = (country.alpha3Code ?? country.code ?? '').toUpperCase();
        return {
          value: alpha3,
          label: country.localizedName ?? alpha3,
          flagStyle: code ? `background-image: url('${FLAG_BASE}/${code}.png');` : ''
        };
      });
    });

    function resolveCountryValue(code: string): string {
      const list = appStore.getCountries;
      if (!code || !list.length) return '';
      const c = code.toUpperCase();
      const found = list.find(
        (country: { code?: string; alpha3Code?: string }) =>
          (country.alpha3Code || '').toUpperCase() === c || (country.code || '').toUpperCase() === c
      );
      return found ? (found.alpha3Code || found.code || '') : '';
    }

    
    async function getCategoryCompositions(forceRefresh = false) {

      state.compositionError = false

      // Bail out before raising the loading flags: nothing is requested on this path, so
      // switching them on would leave the three panels stuck on their skeletons forever.
      if (
        !analysisHsCode.value ||
        !state.selectedSupplierCountry ||
        !state.selectedBuyerCountry ||
        state.spendVolume <= 0
      ) {
        loadingComposition.value = false
        loadingPricing.value = false
        loadingTimeSeries.value = false
        return;
      }

      loadingComposition.value = true
      loadingPricing.value = true
      loadingTimeSeries.value = true

      const categoryRespons = await postLovelaceCategoryCompositions({
        hsCode: analysisHsCode.value
      }, forceRefresh).then(res => {
        if (!res.data.success) {
          loadingComposition.value = false
          loadingPricing.value = false
          loadingTimeSeries.value = false
          state.compositionError = true
          return null
        }
        categoryCompositionsResponse.value = res.data.output
        compositionCalculatedAt.value = res.data.calculatedAt ?? null
        loadingComposition.value = false
        loadingPricing.value = false
        loadingTimeSeries.value = false
        return res
      }).catch(() => {
        state.compositionError = true
        loadingComposition.value = false
        loadingPricing.value = false
        loadingTimeSeries.value = false
        return null
      }).finally(() => {
        loadingComposition.value = false
        loadingPricing.value = false
        loadingTimeSeries.value = false
      })

      if (!categoryRespons) return

      const costModel = categoryCompositionsResponse.value?.costModel
      const allItems = [
        ...(costModel?.direct ?? []),
        ...(costModel?.indirect ?? [])
      ]

      
      commodityPricingData.value = allItems
        .filter(item => item.pricingData)
        .map(item => ({
          ...(item.pricingData as CommodityPricingOutput),
          estimatedCostPercent: item.estimatedCostPercent
        }))
      loadingPricing.value = false
      loadingTimeSeries.value = false
    }

    //- Computed vars to get information fot the isolated componentes

    //- Data for chart
    const getSeries = computed(() => {
      if (categoryCompositionsResponse.value === null) {
        return null
      }
      return categoryCompositionsResponse.value.seriesData
    })

    const getCategories = computed(() => {
      if (categoryCompositionsResponse.value === null) {
        return null
      }
      return categoryCompositionsResponse.value.categoriesData
    })


    //- IA summary
    const getAiSummary = computed(() => {
      if (categoryCompositionsResponse.value === null) {
        return null
      }
      return categoryCompositionsResponse.value.aiSummary
    })
    
    //- RiskAssessmentCard

    const getRiskAssessmentCard = computed(() => {
      if (categoryCompositionsResponse.value === null) {
        return null
      }
      return categoryCompositionsResponse.value.riskProfile
    })

    //- PushbackArgumentsCard
    const getPushbackArgumentsCard = computed(() => {
      if (categoryCompositionsResponse.value === null) {
        return null
      }
      return categoryCompositionsResponse.value.negotiationStrategy.pushbacks
    })

    //- StrategicRecommendationsCard
    const getStrategicRecommendationsCard = computed(() => {
      if (categoryCompositionsResponse.value === null) {
        return null
      }
      return categoryCompositionsResponse.value.negotiationStrategy.recommendations
    })

    //ProductCompositionChart

    const getProductCompositionChart = computed(() => {
      if (categoryCompositionsResponse.value === null) {
        return null
      }
      return categoryCompositionsResponse.value.costModel
    })

    // WI#20011: when the backend calculated this answer (a cache hit keeps the original time).
    function formatCalculatedAt(value: string): string {
      return new Date(value).toLocaleString();
    }

    async function refreshTariffs(forceRefresh = false) {
      if (
        !analysisHsCode.value ||
        !state.selectedSupplierCountry ||
        !state.selectedBuyerCountry ||
        state.spendVolume <= 0
      ) return;
      state.tariffsLoading = true;
      state.tariffsError = null;

      const tariffsResp = await postLovelaceTariffs({
        commodity: analysisHsCode.value,
        spendVolume: String(state.spendVolume),
        supplierCountry: state.selectedSupplierCountry,
        buyerCountry: state.selectedBuyerCountry
      }, forceRefresh);

      const errType = getServiceErrorType(tariffsResp);
      if (errType) {
        state.tariffsError = errType;
        state.tariffsLoading = false;
        return;
      }

      if (!tariffsResp.success || !tariffsResp.data || !tariffsResp.data.output) {
        state.tariffsLoading = false;
        return;
      }

      tariffsCalculatedAt.value = tariffsResp.data.calculatedAt ?? null;
      const output = tariffsResp.data.output as {
        notes?: string; strategy?: string[]; tarifCost?: number; dutySavings?: number;
        currentTarif?: string; effectiveDate?: string; previousTarif?: string; landedCostReduction?: string;
      };

      state.tariffsData = {
        currentTotalTariff: output.currentTarif ?? state.tariffsData.currentTotalTariff,
        totalTariffCosts: '$' + StringUtils.formatBigNumbers(output.tarifCost ?? 0),
        effectiveDate: output.effectiveDate ?? state.tariffsData.effectiveDate,
        previousTotalTariff: output.previousTarif ?? state.tariffsData.previousTotalTariff,
        totalDutySavings: '$' + StringUtils.formatBigNumbers(output.dutySavings ?? 0),
        taxBurdenCalculation: state.tariffsData.taxBurdenCalculation,
        landedCostReduction: output.landedCostReduction ?? state.tariffsData.landedCostReduction,
        tariffsNote: output.notes ?? state.tariffsData.tariffsNote
      };

      const rawStrategy = output.strategy && Array.isArray(output.strategy) ? output.strategy : [];
      state.tariffsStrategy = rawStrategy.filter(
        (item: string | null | undefined) =>
          item != null && String(item).trim() !== '' && String(item).toLowerCase() !== 'null'
      );
      state.tariffsLoading = false;
    }

    const getChange = computed(() => {
        const current = parseFloat(state.tariffsData.currentTotalTariff)
        const previous = parseFloat(state.tariffsData.previousTotalTariff)
        if (isNaN(current) || isNaN(previous)) return 0
        return current - previous
    })

    const formattedGetChange = computed(() => getChange.value.toFixed(2))

    const formattedCurrentTotalTariff = computed(() => {
        const num = parseFloat(state.tariffsData.currentTotalTariff)
        if (isNaN(num)) return state.tariffsData.currentTotalTariff
        return num.toFixed(2) + '%'
    })

    const formattedPreviousTotalTariff = computed(() => {
        const num = parseFloat(state.tariffsData.previousTotalTariff)
        if (isNaN(num)) return state.tariffsData.previousTotalTariff
        return num.toFixed(2) + '%'
    })

    const formattedTotalTariffCosts = computed(() => {
        const raw = state.tariffsData.totalTariffCosts
        const num = parseFloat(raw.replace(/[^0-9.-]/g, ''))
        if (isNaN(num)) return raw
        return '$' + num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    })


    const formattedEffectiveDate = computed(() => {
        const raw = state.tariffsData.effectiveDate
        if (!raw) return ''
        const date = new Date(raw + 'T00:00:00')
        if (isNaN(date.getTime())) return raw
        return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/ /g, ' ')
    })

    const changeTarif = computed(() => {
        const spend = isEditingSpendVolume.value
            ? parseFloat(spendVolumeEditValue.value)
            : Number(state.spendVolume)
        if (isNaN(spend) || spend === 0 || getChange.value === 0) return '0.00'
        const result = parseFloat((getChange.value * spend).toFixed(2))
        return result.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    })


    
    function onBuyerCountryChange() {
      void refreshTariffs();
    }

    function onSupplierCountryChange() {
      void refreshTariffs();
    }

    function startEditSpendVolume() {
      spendVolumeEditValue.value = String(state.spendVolume);
      isEditingSpendVolume.value = true;
      nextTick(() => spendVolumeInputRef.value?.focus());
    }

    function commitSpendVolumeEdit() {
      const parsed = Number.parseInt((spendVolumeEditValue.value ?? '').replaceAll(',', '') || '0', 10);
      if (!Number.isNaN(parsed) && parsed >= 0) {
        state.spendVolume = parsed;
      }
      isEditingSpendVolume.value = false;
    }

    onMounted(async () => {
      state.isInitializing = true;
      await appStore.fetchCountries();

      // Fetch spend volume and buyer country from spends API
      const [spendsResp, spendInKResp] = await Promise.all([
        getSpendsBySupplierWihtoutProgram(props.companyId),
        getSupplierSpendInK(props.companyId)
      ]);

      let mainBuyerCountryCode = '';
      if (spendsResp.success && Array.isArray(spendsResp.data)) {
        const spends = spendsResp.data as any[];
        let best: any | null = null;
        let maxVolume = -Infinity;
        spends.forEach((s) => {
          const rawVolume = Number(s.spend_volume ?? s.volume ?? 0);
          if (!Number.isFinite(rawVolume)) return;
          if (rawVolume > maxVolume) { maxVolume = rawVolume; best = s; }
        });
        if (best) mainBuyerCountryCode = best.buyerCountryCode ?? '';
      }

      if (spendInKResp.success && spendInKResp.data) {
        const realValue = Number(spendInKResp.data.realValue ?? 0);
        if (Number.isFinite(realValue) && realValue > 0) {
          state.spendVolume = Math.round(realValue);
        }
      }

      // Resolve default countries
      if (props.entityDetails) {
        const detail = props.entityDetails;
        const supplierCode = (detail.supplierCountryAlpha3Code || detail.supplierCountry || '').toString().trim().toUpperCase();
        state.selectedSupplierCountry = resolveCountryValue(supplierCode) || supplierCode;
        state.selectedBuyerCountry =
          resolveCountryValue(mainBuyerCountryCode) ||
          resolveCountryValue((detail.buyerCountry || '').toString().trim().toUpperCase());
      }

      state.isInitializing = false;
      if (props.selectedHsCode) {
        apiCalls()
      }
    });

    function apiCalls() {
      void refreshTariffs();
      void getCategoryCompositions()
    }

    // WI#20011: independent of each other and of apiCalls(); each skips the cache for its own panel.
    // Category Insights covers the whole composition/pricing/time-series block.
    function forceRefreshTariffs() {
      void refreshTariffs(true);
    }
    function forceRefreshCategory() {
      void getCategoryCompositions(true);
    }
    
    return {
      analysisHsCode,
      analysisCommodity,
      state,
      tariffTooltips,
      countryOptions,
      spendVolumeFormatted,
      spendVolumeInputRef,
      isEditingSpendVolume,
      spendVolumeEditValue,      
      onBuyerCountryChange,
      onSupplierCountryChange,
      startEditSpendVolume,
      commitSpendVolumeEdit,      
      apiCalls,
      forceRefreshTariffs,
      forceRefreshCategory,
      compositionCalculatedAt,
      tariffsCalculatedAt,
      formatCalculatedAt,
      getRiskAssessmentCard,
      categoryCompositionsResponse,
      getPushbackArgumentsCard,
      getStrategicRecommendationsCard,
      getProductCompositionChart,
      commodityPricingData,      
      loadingComposition,
      loadingPricing,
      loadingTimeSeries,
      showMore,
      toggleShowMore,
      getAiSummary,
      getSeries,
      getCategories,
      getChange,
      formattedGetChange,
      formattedCurrentTotalTariff,
      formattedPreviousTotalTariff,
      formattedTotalTariffCosts,
      changeTarif,
      formattedEffectiveDate
    }
  }
});
</script>

<style lang="scss" scoped>
// WI#20011: explicit color instead of relying on .btn-link's inherited/theme color, which was
// rendering invisible. Gray by default, the app's own active-red ($link-color-active) on hover.
.lovelace-refresh-btn {
  color: #667085;

  &:hover:not(:disabled) {
    color: #c11a36;
  }

  &:disabled {
    opacity: 0.5;
  }
}

.gas-card {
  display: flex;
  align-items: flex-end;
  gap: 16px;
  background: #ffffff;
  border-radius: 12px;
  box-shadow: 0 1px 6px rgba(0, 0, 0, 0.06);
  padding: 16px 20px;
  border: 1px solid #f1f5f9;
}

.gas-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  flex: 1;
  min-width: 0;
}

.gas-label {
  font-size: 0.58rem;
  font-weight: 700;
  letter-spacing: 0.09em;
  text-transform: uppercase;
  color: #94a3b8;
}

.run-analysis-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  background: #0d1526;
  color: #ffffff;
  border: none;
  border-radius: 8px;
  padding: 8px 20px;
  font-size: 0.82rem;
  font-weight: 700;
  white-space: nowrap;
  cursor: pointer;
  height: 38px;
  transition: background 0.15s;
  flex-shrink: 0;

  &:hover { background: #1e2d4a; }

  i { font-size: 0.75rem; }
}

.commodity-header {
  flex-shrink: 0;
  width: 100%;
}

.insight-error-placeholder {
  min-height: 140px;
  width: 100%;
  flex: 1 1 auto;
}

.flag-country-entity-card {
  display: inline-block;
  width: 20px;
  height: 14px;
  background-size: cover;
  background-repeat: no-repeat;
  vertical-align: middle;
}

.bullet-point {
  color: #000000;
}

.tariff-country-dropdown .flag-country-entity-card.tariff-flag-inside {
  flex-shrink: 0;
  width: 24px;
  height: 18px;
  background-size: cover;
  background-repeat: no-repeat;
  border-radius: 2px;
}

.spend-volume-display {
  color: #111827;
}
.spend-volume-edit-icon:hover {
  opacity: 0.8;
}
.spend-volume-input {
  max-width: 180px;
}

.tariff-refresh-btn {
  flex-shrink: 0;
}

.tariff-stats {
  font-size: 0.875rem;
  background: #f9fafb;
  border-radius: 8px;
  padding: 0.75rem 0.75rem 0.5rem;

  .tariff-stat-item {
    display: flex;
    margin-bottom: 1rem;
    height: 30px;
    align-items: center;
  }
  .tariff-landed-cost,
  .tariff-note {
    display: block;
    margin-bottom: 0.5rem;
  }
  .tariff-note {
    white-space: pre-line;
  }
}


.tariff-stats-no-bg {
  font-size: 0.875rem;  
  border-radius: 8px;  
  padding: 0.75rem 0rem 0.75rem 0rem;

  .tariff-stat-item {
    display: flex;
    margin-bottom: 1rem;
    height: 30px;
    align-items: center;
  }
  .tariff-landed-cost,
  .tariff-note {
    display: block;
    margin-bottom: 0.5rem;
  }
  .tariff-note {
    white-space: pre-line;
  }
}

.tariff-strategy-title {
  margin-top: 1.25rem;
}

.tariff-strategy-list {
  background: #f9fafb;
  border-radius: 8px;
  padding: 0.75rem 0.75rem 0.5rem;
}

.bottom-container {
  background-color: #f2f4f7;
  padding: 16px;
  border-radius: 8px;
}




</style>
