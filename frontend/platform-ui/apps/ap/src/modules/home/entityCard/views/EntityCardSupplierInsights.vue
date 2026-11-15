<template>
<div class="row w-100" v-if="isCommodityLoading">
  <div class="card w-100 mb-3 ml-3 mr-3 mt-3">
    <div class="row">
      <div class="col-12 mb-4">
        <Skeleton class="skeletons-bg" :shape="'rectangle'" :style="{ width: '25%', height: '16px', borderRadius: '8px' }"></Skeleton>
      </div>
      <div class="col-6">
        <Skeleton class="skeletons-bg" :shape="'rectangle'" :style="{ width: '100%', height: '600px', borderRadius: '8px' }"> </Skeleton>
      </div>
      <div class="col-6">
        <Skeleton class="skeletons-bg" :shape="'rectangle'" :style="{ width: '100%', height: '600px', borderRadius: '8px' }">       </Skeleton>
      </div>
    </div>
  </div>
</div>
<div class="d-flex justify-content-center align-items-center" v-else-if="commodityError" style="min-height: 300px;">
  <div class="d-flex flex-column align-items-center text-center"><span class="text-base font-semibold text-gray-700 mb-2">{{ $t('home.entityCard.marketInsights.errorTitleSupplierInsights') }}</span>
    <button class="btn btn-primary btn-sm" @click="retryCommodity">{{ $t('home.entityCard.marketInsights.retry') }}</button>
  </div>
</div>
<div class="d-flex w-100 flex-column" v-else>
  <div class="row mr-2">
    <div class="col-xl-5 col-lg-6 col-md-6 mb-3 d-flex flex-column">
      <div class="card shadow-none left-panel-card flex-grow-1" :class="{ 'panel-collapsed': !leftPanelExpanded }">
        <div class="card-body left-panel-column">
          <template v-if="negotiationLoading">
            <div class="insight-error-placeholder d-flex flex-column justify-content-start py-3 px-3">
              <Skeleton class="skeletons-bg mb-2" :shape="'rectangle'" :style="{ width: '80%', height: '16px', borderRadius: '8px', margin: '0 auto' }"></Skeleton>
              <Skeleton class="skeletons-bg mb-2" :shape="'rectangle'" :style="{ width: '90%', height: '16px', borderRadius: '8px', margin: '0 auto' }"></Skeleton>
              <Skeleton class="skeletons-bg mb-2" :shape="'rectangle'" :style="{ width: '85%', height: '16px', borderRadius: '8px', margin: '0 auto' }"></Skeleton>
              <Skeleton class="skeletons-bg mb-2" :shape="'rectangle'" :style="{ width: '75%', height: '16px', borderRadius: '8px', margin: '0 auto' }"></Skeleton>
            </div>
          </template>
          <template v-else-if="negotiationError">
            <div class="insight-error-placeholder d-flex flex-column align-items-center justify-content-center text-center py-4 px-3">
              <button class="btn btn-primary btn-sm mb-3" type="button" @click="retryNegotiation"><i class="fa-solid fa-arrows-rotate text-base mr-1"></i>{{ $t('home.entityCard.supplierInsights.serviceErrorRetry') }}</button>
              <p class="small text-muted mb-0">{{ negotiationError === 'timeout' ? $t('home.entityCard.supplierInsights.serviceErrorTimeout') : $t('home.entityCard.supplierInsights.serviceErrorBusy') }}</p>
            </div>
          </template>
          <template v-else>
            <div class="insight-section">
              <div class="insight-card-title d-flex flex-row align-items-start justify-content-between"><span class="text-base font-semibold text-gray-600 mb-3">{{ $t('home.entityCard.supplierInsights.procurementInsights') }}</span><span class="d-inline-flex align-items-center text-nowrap ml-auto"><span v-if="negotiationCalculatedAt" class="text-xs text-gray-500">{{ $t('home.entityCard.supplierInsights.lastCalculated') }}: {{ formatCalculatedAt(negotiationCalculatedAt) }}</span><button class="btn btn-link btn-sm p-0 ml-2 lovelace-refresh-btn" type="button" :title="$t('home.entityCard.supplierInsights.refresh')" :disabled="negotiationLoading" @click="forceRefreshNegotiation"><i class="fa-solid fa-arrows-rotate text-base"></i></button></span></div>
              <div class="insight-card-scroll insight-card-scroll-white d-flex flex-column">
                <ul class="list-unstyled mb-0">
                  <template v-for="(item, i) in procurementInsights" :key="'proc-' + i">
                    <li class="mb-3 d-flex" v-if="leftPanelExpanded || i < 2"><span class="bullet-point mr-2">•</span><span class="text-sm text-gray-700">{{ item }}</span></li>
                  </template>
                </ul>
              </div>
            </div>
            <div class="insight-section">
              <div class="insight-card-title d-flex flex-column"><span class="text-base font-semibold text-gray-600 mb-3">{{ $t('home.entityCard.supplierInsights.negotiationArguments') }}</span></div>
              <div class="insight-card-scroll insight-card-scroll-gray d-flex flex-column">
                <ul class="list-unstyled mb-0">
                  <template v-for="(item, i) in negotiationArguments" :key="'neg-' + i">
                    <li class="mb-3 d-flex" v-if="leftPanelExpanded || i < 2"><span class="bullet-point mr-2">•</span><span class="text-sm text-gray-700">{{ item }}</span></li>
                  </template>
                </ul>
              </div>
            </div>
          </template>
        </div>
      </div>
    </div>
    <div class="col-xl-7 col-lg-6 col-md-6 mb-3 d-flex flex-column">
      <div class="card shadow-none market-share-card flex-grow-1" :class="{ 'panel-collapsed': !marketShareExpanded }">
        <div class="card-body market-share-card-body">
          <div class="d-flex flex-row align-items-start justify-content-between"><h6 class="text-base font-semibold text-gray-600 mb-3">{{ $t('home.entityCard.supplierInsights.marketShare') }} ({{ marketShareScope }})</h6><span class="d-inline-flex align-items-center text-nowrap ml-auto"><span v-if="marketShareCalculatedAt" class="text-xs text-gray-500">{{ $t('home.entityCard.supplierInsights.lastCalculated') }}: {{ formatCalculatedAt(marketShareCalculatedAt) }}</span><button class="btn btn-link btn-sm p-0 ml-2 lovelace-refresh-btn" type="button" :title="$t('home.entityCard.supplierInsights.refresh')" :disabled="marketShareLoading" @click="forceRefreshMarketShare"><i class="fa-solid fa-arrows-rotate text-base"></i></button></span></div>
          <template v-if="marketShareLoading">
            <div class="insight-error-placeholder d-flex flex-column justify-content-start text-center py-3 px-3">
              <Skeleton class="skeletons-bg mb-2" :shape="'rectangle'" :style="{ width: '70%', height: '18px', borderRadius: '8px', margin: '0 auto' }"></Skeleton>
              <Skeleton class="skeletons-bg mb-2" :shape="'rectangle'" :style="{ width: '100%', height: '160px', borderRadius: '8px' }"></Skeleton>
              <Skeleton class="skeletons-bg mb-2" :shape="'rectangle'" :style="{ width: '100%', height: '80px', borderRadius: '8px' }"></Skeleton>
            </div>
          </template>
          <template v-else-if="marketShareError">
            <div class="insight-error-placeholder d-flex flex-column align-items-center justify-content-center text-center py-4 px-3">
              <button class="btn btn-primary btn-sm mb-3" type="button" @click="retryMarketShare"><i class="fa-solid fa-arrows-rotate text-base mr-1"></i>{{ $t('home.entityCard.supplierInsights.serviceErrorRetry') }}</button>
              <p class="small text-muted mb-0">{{ marketShareError === 'timeout' ? $t('home.entityCard.supplierInsights.serviceErrorTimeout') : $t('home.entityCard.supplierInsights.serviceErrorBusy') }}</p>
            </div>
          </template>
          <template v-else>
            <div class="market-share-chart">
              <HorizontalBarChart v-if="marketSharePieCategories.length" :dataFirstSeries="marketSharePieSeries" :categoriesData="marketSharePieCategories" chartType="marketShare" :isBigNumber="true" :showMoreBtn="false" :entityName="entityDetails?.supplierName" :xAxisTitle="'Markets Share (%)'" :yAxisTitle="'Peer Group'" :decimals="2" :decimalsBignumber="2"></HorizontalBarChart>
            </div>
            <div class="table-responsive market-share-table">
              <table class="table table-sm table-bordered small">
                <thead>
                  <tr>
                    <th>{{ $t('home.entityCard.supplierInsights.company') }}</th>
                    <th class="text-center">{{ $t('home.entityCard.supplierInsights.marketShareEst') }}</th>
                    <th>{{ $t('home.entityCard.supplierInsights.country') }}</th>
                    <th class="text-center">{{ $t('home.entityCard.supplierInsights.url') }}</th>
                    <th class="text-center">{{ $t('home.entityCard.supplierInsights.companySize') }}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="row in marketShareTable" :key="row.company">
                    <td class="market-share-company-cell"><span class="market-share-company-value" :title="row.company">{{ row.company }}</span></td>
                    <td class="text-center">{{ row.marketShareEst }}</td>
                    <td><span class="flag-country-entity-card my-auto mr-1" v-if="row.flagStyle" :style="row.flagStyle" :title="row.country"></span></td>
                    <td class="text-center market-share-url-cell"><a class="market-share-url-link" :href="row.url" target="_blank" rel="noopener" :title="row.url">{{ row.url }}</a></td>
                    <td class="text-center market-share-company-size-cell"><span class="market-share-company-size-value" :title="row.companySize">{{ row.companySize }}</span></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </template>
        </div>
      </div>
    </div>
  </div>
</div>
</template>

<script lang="ts">
import { defineComponent, reactive, computed, toRefs, ref, onMounted, PropType } from 'vue';
import HorizontalBarChart from '@/modules/components/charts/kendo/HorizontalBarChart.vue';
import { Skeleton } from '@progress/kendo-vue-indicators';
import { useAppStore } from '@/stores/app';
import {
  postLovelaceNegotiationInsightsArguments,
  postLovelaceMarketShare
} from '@/modules/home/entityCard/api';

/** Detects timeout or service unavailable (503/high demand) to show generic message and retry button */
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
  name: 'EntityCardSupplierInsights',
  components: { HorizontalBarChart, Skeleton },
  props: {
    companyId: { type: String, default: '' },
    selectedHsCode: { type: String, default: '' },
    // Supplier/buyer detail (response from /detail) passed from EntityCardOverview
    entityDetails: { type: Object as PropType<Record<string, any> | null>, default: null },    
    industryCommodityProp: { type: Array as PropType<{ commodity: string; industryName: string }[]>, default: () => [] },
  },
  setup(props: any) {

      const MOCK_MARKET_OPTIONS = ['Global', 'North America', 'Europe'];

      // Flag URL base for country flags (flagcdn)
      const FLAG_BASE = 'https://flagcdn.com/w40';

    const state = reactive({
      // Left panel (API 1) – real data from Lovelace
      procurementInsights: [] as string[],
      negotiationArguments: [] as string[],
      // Center (API 2 + 3) – driven by H.S. Code (single selector in Commodity header)
      selectedHsCode: '',
      selectedMarket: 'Global',
      loadingHsCodes: false,
      marketOptions: [...MOCK_MARKET_OPTIONS],
      marketSharePieData: [] as { category: string; value: number }[],
      marketShareTable: [] as {
        company: string;
        marketShareEst: string;
        country: string;
        flagStyle: string;
        url: string;
        companySize: string;
      }[],
      // Market share scope: dynamic value from Lovelace
      marketShareScope: '-',
      // Global loading for commodity (initial H.S. code)
      isCommodityLoading: true,
      // Loading per card
      negotiationLoading: false,
      marketShareLoading: false,
      negotiationCalculatedAt: null as string | null,
      marketShareCalculatedAt: null as string | null,
      // Service errors (timeout / 503): show retry and generic message per card
      negotiationError: null as 'timeout' | 'unavailable' | null,
      marketShareError: null as 'timeout' | 'unavailable' | null,
      commodityError: false
    });

    const industryCommodity = ref<{ commodity?: string; industryName?: string } | null>(null);
    const leftPanelExpanded = ref(true);
    const marketShareExpanded = ref(true);
    const appStore = useAppStore();
    
    async function initLovelaceFlow() {      
      state.selectedHsCode = props.selectedHsCode
      industryCommodity.value = props.industryCommodityProp
      state.isCommodityLoading = false;
      state.negotiationLoading = true;
      state.marketShareLoading = true;

      await Promise.all([
        refreshNegotiationEndpoints(),
        refreshMarketShare()
      ]);
    }

    async function refreshNegotiationEndpoints(forceRefresh = false) {
      // Clear the flag on the bail-out: nothing is requested on this path, so leaving it on
      // would keep the panel stuck on its skeleton forever (no commodity selected).
      if (!props.entityDetails || !state.selectedHsCode) {
        state.negotiationLoading = false;
        return;
      }
      const detail = props.entityDetails;
      state.negotiationLoading = true;
      state.negotiationError = null;

      const negotiationResp = await postLovelaceNegotiationInsightsArguments({
        supplierName: detail.supplierName ?? '',
        supplierCountry: detail.supplierCountryAlpha3Code ?? detail.supplierCountry ?? '',
        buyerIndustry: industryCommodity.value?.industryName ?? '',
        targetPaymentTerms: detail.averageDaysToApproveInvoice ?? 0,
        commodity: state.selectedHsCode
      }, forceRefresh);

      const errType = getServiceErrorType(negotiationResp);
      if (errType) {
        state.negotiationError = errType;
        state.procurementInsights = [];
        state.negotiationArguments = [];
        state.negotiationLoading = false;
        return;
      }
      if (negotiationResp.success && negotiationResp.data && negotiationResp.data.output) {
        state.procurementInsights = negotiationResp.data.output.insights ?? [];
        state.negotiationArguments = negotiationResp.data.output.arguments ?? [];
        state.negotiationCalculatedAt = negotiationResp.data.calculatedAt ?? null;
      }
      state.negotiationLoading = false;
    }

    async function refreshMarketShare(forceRefresh = false) {
      if (!props.entityDetails || !state.selectedHsCode) {
        state.marketShareLoading = false;
        return;
      }
      const detail = props.entityDetails;
      state.marketShareLoading = true;
      state.marketShareError = null;

      const marketShareResp = await postLovelaceMarketShare({
        supplierName: detail.supplierName ?? '',
        supplierCountry: detail.supplierCountryAlpha3Code ?? detail.supplierCountry ?? '',
        buyerIndustry: industryCommodity.value?.industryName ?? '',
        buyerCountry: detail.buyerCountry ?? '',
        commodity: state.selectedHsCode
      }, forceRefresh);

      const errType = getServiceErrorType(marketShareResp);
      if (errType) {
        state.marketShareError = errType;
        state.marketShareTable = [];
        state.marketSharePieData = [];
        state.marketShareLoading = false;
        return;
      }

      if (!marketShareResp.success || !marketShareResp.data || !marketShareResp.data.output) {
        state.marketShareLoading = false;
        return;
      }

      const output = marketShareResp.data.output as {
        scope?: string;
        companies?: Array<{
          url?: string;
          logo?: string;
          name?: string;
          country?: string;
          companySize?: string;
          marketShare?: number;
        }>;
      };

      // Ensure table is sorted by market share percentage (descending)
      const companies = [...(output.companies ?? [])].sort(
        (a, b) => (typeof b.marketShare === 'number' ? b.marketShare : 0) - (typeof a.marketShare === 'number' ? a.marketShare : 0)
      );
      state.marketShareScope = output.scope || '-';
      state.marketShareCalculatedAt = marketShareResp.data.calculatedAt ?? null;

      // Map country code -> { name, flagStyle } from app country list
      const countriesList = appStore.getCountries;
      const countryMap = new Map<string, { name: string; flagStyle: string }>();
      countriesList.forEach((country: { code?: string; alpha3Code?: string; localizedName?: string }) => {
        const code = (country.code ?? '').toLowerCase();
        const alpha3 = (country.alpha3Code ?? '').toUpperCase();
        const name = country.localizedName ?? '';
        const flagStyle = code ? `background-image: url('${FLAG_BASE}/${code}.png');` : '';
        if (alpha3) countryMap.set(alpha3, { name, flagStyle });
        if (country.code) countryMap.set((country.code ?? '').toUpperCase(), { name, flagStyle });
      });

      // Table: companies only; country column = flag + name (not code)
      state.marketShareTable = companies.map((c) => {
        const code = (c.country ?? '').toString().trim().toUpperCase();
        const info = code ? countryMap.get(code) : null;
        return {
          company: c.name ?? '',
          marketShareEst: typeof c.marketShare === 'number' ? `${c.marketShare.toFixed(1)}%` : '-',
          country: info?.name ?? (c.country ?? '-'),
          flagStyle: info?.flagStyle ?? '',
          url: c.url ?? '-',
          companySize: c.companySize ?? '-'
        };
      });

      // Pie: companies + Others if needed to complete 100%
      const total = companies.reduce(
        (acc, c) => acc + (typeof c.marketShare === 'number' ? c.marketShare : 0),
        0
      );
      const rest = 100 - total;

      const pieCompanies = [...companies];
      if (rest > 0) {
        pieCompanies.push({
          name: 'Others',
          marketShare: rest
        });
      }

      state.marketSharePieData = pieCompanies.map((c) => ({
        category: c.name ?? '',
        value: typeof c.marketShare === 'number' ? c.marketShare : 0
      }));

      state.marketShareLoading = false;
    }

    onMounted(() => {
      initLovelaceFlow();
    });

    const marketSharePieSeries = computed(() => state.marketSharePieData.map(d => d.value));
    const marketSharePieCategories = computed(() => state.marketSharePieData.map(d => d.category));

    function onHsCodeChange() {
      void refreshNegotiationEndpoints();
      void refreshMarketShare();
    }
    function retryCommodity() {
      void initLovelaceFlow();
    }
    function retryNegotiation() {
      void refreshNegotiationEndpoints();
    }
    function retryMarketShare() {
      void refreshMarketShare();
    }
    // WI#20011: the Refresh buttons skip the 30-day cache for their own panel only.
    // WI#20011: when the backend calculated this answer (a cache hit keeps the original time).
    function formatCalculatedAt(value: string): string {
      return new Date(value).toLocaleString();
    }

    function forceRefreshNegotiation() {
      void refreshNegotiationEndpoints(true);
    }
    function forceRefreshMarketShare() {
      void refreshMarketShare(true);
    }

    return {
      ...toRefs(state),
      marketSharePieSeries,
      marketSharePieCategories,
      onHsCodeChange,
      retryCommodity,
      retryNegotiation,
      retryMarketShare,
      forceRefreshNegotiation,
      forceRefreshMarketShare,
      formatCalculatedAt,
      leftPanelExpanded,
      marketShareExpanded
    };
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

.commodity-header {
  flex-shrink: 0;
  width: 100%;
}

.bullet-point {
  color: #000000;
}

.insight-error-placeholder {
  min-height: 140px;
  width: 100%;
  flex: 1 1 auto;
}

.entity-card-supplier-insights {
  min-height: 400px;
}

// Cards use full visible height; chart and table share space without overlap
.market-share-card-body {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
}

.market-share-chart {
  flex: 0 0 auto;
  margin-bottom: 1rem;
}

.market-share-table {
  flex: 1 1 auto;
  min-height: 0;
  margin-top: 50px;
  overflow: auto;

  table {
    table-layout: fixed;
    width: 100%;
  }

  thead th {
    background-color: #f5f5f5;
    white-space: normal;
    vertical-align: middle;
  }
  tbody tr:nth-child(even) {
    background-color: #f5f5f5;
  }

  th:nth-child(1),
  td:nth-child(1) {
    width: 38%;
  }

  th:nth-child(2),
  td:nth-child(2) {
    width: 60px;
  }

  th:nth-child(3),
  td:nth-child(3) {
    width: 70px;
    text-align: center;
  }

  th:nth-child(4),
  td:nth-child(4) {
    width: 32%;
  }

  th:nth-child(5),
  td:nth-child(5) {
    width: 78px;
  }

  .market-share-company-cell {
    max-width: 0;
  }

  .market-share-company-value {
    display: block;
    max-width: 100%;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .market-share-url-cell {
    max-width: 0;
  }

  .market-share-url-link {
    display: inline-block;
    max-width: 100%;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .market-share-company-size-cell {
    max-width: 0;
  }

  .market-share-company-size-value {
    display: block;
    max-width: 100%;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
}
.flag-country-entity-card {
  display: inline-block;
  width: 20px;
  height: 14px;
  background-size: cover;
  background-repeat: no-repeat;
  vertical-align: middle;
}

// Left card: two sections stacked (40% each); only second section has grey background
.left-panel-card {
  border-radius: 8px;
  overflow: hidden;
}

.left-panel-column {
  display: flex;
  flex-direction: column;
  gap: 12px;
  height: 100%;
  min-height: 0;
}

.insight-section {
  flex: 0 1 auto;
  min-height: 0;
  max-height: 50%;
  display: flex;
  flex-direction: column;
}

.insight-card-title {
  flex-shrink: 0;  
  background: #fff;
  color: #374151;
}

.insight-card-scroll {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 9px;
}

.insight-card-scroll-white {
  background: #fff;
}

.insight-card-scroll-gray {
  background: #f9fafb;
  border-radius: 8px;
}

// Tariffs: flag inside country selector (SearchableDropdown slot)
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

// Tariff stats: 3+3 in columns; Landed Cost and Note on their own lines
.tariff-stats {
  font-size: 0.875rem;
  background: #f9fafb;
  border-radius: 8px;
  padding: 0.75rem 0.75rem 0.5rem;

  .tariff-stat-item {
    display: block;
    margin-bottom: 0.5rem;
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

.panel-collapsed {
  max-height: 50vh;
  min-height: 50vh;
  overflow: hidden;
}

.left-panel-card.panel-collapsed {
  .insight-card-scroll {
    overflow: hidden;
    flex: none;
  }

  .insight-section {
    max-height: none;
  }

  .left-panel-column {
    height: auto;
  }
}

.card {
  margin-bottom: 8px !important;
}

</style>
