<template>
<div class="row w-100" v-if="loading">
  <div class="card shadow-none w-100 mb-3 ml-3 mr-3">
    <div class="row">
      <div class="col-12 mb-4">
        <Skeleton class="skeletons-bg" :shape="'rectangle'" :style="{ width: '25%', height: '16px', borderRadius: '8px' }"></Skeleton>
      </div>
      <div class="col-6">
        <Skeleton class="skeletons-bg" :shape="'rectangle'" :style="{ width: '100%', height: '600px', borderRadius: '8px' }"> </Skeleton>
      </div>
      <div class="col-6">
        <Skeleton class="skeletons-bg" :shape="'rectangle'" :style="{ width: '100%', height: '600px', borderRadius: '8px' }">         </Skeleton>
      </div>
    </div>
  </div>
</div>
<div class="d-flex justify-content-center align-items-center" v-else-if="error" style="min-height: 300px;">
  <div class="d-flex flex-column align-items-center text-center"><span class="text-base font-semibold text-gray-700 mb-2">{{ $t('home.entityCard.marketInsights.errorTitle') }}</span>
    <button class="btn btn-primary btn-sm" @click="fetchAll">{{ $t('home.entityCard.marketInsights.retry') }}</button>
  </div>
</div>
<div class="d-flex w-100 flex-column" v-else>
  <div class="d-flex justify-content-end align-items-center mr-2 mb-2">
    <span class="d-inline-flex align-items-center text-nowrap ml-auto"><span v-if="calculatedAt" class="text-xs text-gray-500">{{ $t('home.entityCard.supplierInsights.lastCalculated') }}: {{ formatCalculatedAt(calculatedAt) }}</span><button class="btn btn-link btn-sm p-0 ml-2 lovelace-refresh-btn" type="button" :title="$t('home.entityCard.supplierInsights.refresh')" :disabled="loading" @click="forceRefreshAll"><i class="fa-solid fa-arrows-rotate text-base"></i></button></span>
  </div>
  <div class="row mb-3 mr-2">
    <div class="col-6 d-flex flex-column" v-if="exchangeRates">
      <ExchangeRatesCard :data="exchangeRates" :spend-currency="selectedCurrency" :supplier-country="entityDetails.supplierCountry" :supplier-currency="supplierCurrencyLabel" :stretch="exchangeExpanded && interestExpanded" @expanded-change="exchangeExpanded = $event" :supplierCountryFlagUrl="entityDetails.supplierCountryFlagUrl"></ExchangeRatesCard>
    </div>
    <div class="col-6 d-flex flex-column" v-if="interestRates">
      <InterestRatesCard :data="interestRates" :supplier-currency="supplierCurrencyLabel" :stretch="exchangeExpanded && interestExpanded" @expanded-change="interestExpanded = $event" :supplierCountryFlagUrl="entityDetails.supplierCountryFlagUrl"></InterestRatesCard>
    </div>
  </div>
</div>
</template>

<script lang="ts">
import { defineComponent, ref, onMounted, watch } from 'vue';
import type { PropType } from 'vue';
import {
  getMarketInsightsCurrencies,
  getLovelaceInterestRates,
  getLovelaceExchangeRates,
} from '../api';
import { getCountryCurrencies } from '@/services/app/api';
import { useAppStore } from '@/stores/app';
import type { EntityCard } from '@/types';
import { SearchableDropdown } from '@ada/design-system';
import ExchangeRatesCard from '@/modules/home/entityCard/components/marketInsights/ExchangeRatesCard.vue';
import InterestRatesCard from '@/modules/home/entityCard/components/marketInsights/InterestRatesCard.vue';
import { Skeleton } from '@progress/kendo-vue-indicators';

export default defineComponent({
  name: 'EntityCardMarketInsights',
  components: { SearchableDropdown, ExchangeRatesCard, InterestRatesCard, Skeleton },
  props: {
    companyId: {
      type: String,
      default: '',
    },
    entityDetails: {
      type: Object as PropType<EntityCard.EntityDetails>,
      default: () => ({} as EntityCard.EntityDetails),
    },
  },
  setup(props) {
    const appStore = useAppStore();
    const loading = ref(false);
    const calculatedAt = ref<string | null>(null);
    const error = ref(false);

    const currencyOptions = ref<{ value: string; label: string }[]>([]);
    const selectedCurrency = ref('');
    const supplierCurrencyLabel = ref('');
    const interestRates = ref<any>(null);
    const exchangeRates = ref<any>(null);
    const exchangeExpanded = ref(true); // NOSONAR
    const interestExpanded = ref(true); // NOSONAR

    // The country's own currency, from the platform's country reference data — never the
    // spend-transaction currency in entityDetails.currencies, which is what used to be
    // shown here (a Polish supplier read "Poland (EUR)" instead of PLN).
    // Never throws: a failed lookup leaves the label empty so the pill shows the country
    // name alone rather than breaking the whole tab.
    async function resolveSupplierCountryCurrency(): Promise<void> {
      supplierCurrencyLabel.value = '';

      try {
        const { supplierCountry, supplierCountryAlpha3Code } = props.entityDetails;
        const wanted = [supplierCountryAlpha3Code, supplierCountry]
          .filter(Boolean)
          .map((value) => String(value).toUpperCase());

        if (wanted.length === 0) return;

        await appStore.fetchCountries();

        // supplierCountry arrives as a display name ("Poland") on some payloads and as a
        // code on others, so match against every identifying field instead of assuming one.
        const match = appStore.getCountries.find(
          (country) =>
            wanted.includes((country.alpha3Code || '').toUpperCase()) ||
            wanted.includes((country.code || '').toUpperCase()) ||
            wanted.includes((country.localizedName || '').toUpperCase())
        );

        if (!match || !match['@id']) return;

        const currenciesRes = await getCountryCurrencies(match['@id']);
        const members = currenciesRes.success ? currenciesRes.data?.['hydra:member'] : null;

        if (!Array.isArray(members)) return;

        supplierCurrencyLabel.value = members
          .map((currency: { code?: string }) => currency.code)
          .filter(Boolean)
          .join(' / ');
      } catch {
        supplierCurrencyLabel.value = '';
      }
    }

    async function load(forceRefresh: boolean): Promise<void> {
      if (!props.companyId) return;

      loading.value = true;
      error.value = false;

      const { supplierCountry, currencies: entityCurrencies } = props.entityDetails;

      const currenciesRes = await getMarketInsightsCurrencies(props.companyId);

      if (!currenciesRes.success) {
        error.value = true;
        loading.value = false;
        return;
      }

      const rawCurrencies: string[] = currenciesRes.data?.currencies ?? [];
      const entityFallback = Array.isArray(entityCurrencies) ? (entityCurrencies[0] ?? '') : (entityCurrencies ?? '');
      const spendCurrency = rawCurrencies[0] ?? entityFallback;

      currencyOptions.value = rawCurrencies.map(c => ({ value: c, label: c }));
      selectedCurrency.value = spendCurrency;

      const [interestRatesRes, exchangeRatesRes] = await Promise.all([
        getLovelaceInterestRates(supplierCountry, forceRefresh),
        getLovelaceExchangeRates(supplierCountry, spendCurrency, forceRefresh),
        resolveSupplierCountryCurrency(),
      ]);

      if (!exchangeRatesRes.success) {
        error.value = true;
        loading.value = false;
        return;
      }

      interestRates.value = interestRatesRes.data;
      exchangeRates.value = exchangeRatesRes.data;
      calculatedAt.value = exchangeRatesRes.data?.calculatedAt ?? null;
      loading.value = false;
    }

    // Wrappers, not a default parameter on load(): fetchAll is used as an event/watch handler and
    // would receive the event or the new value as its first argument.
    function fetchAll(): Promise<void> {
      return load(false);
    }
    // WI#20011: when the backend calculated this answer (a cache hit keeps the original time).
    function formatCalculatedAt(value: string): string {
      return new Date(value).toLocaleString();
    }

    // WI#20011: Country Rates refresh, Exchange and Interest Rates together, skipping the cache.
    function forceRefreshAll(): Promise<void> {
      return load(true);
    }

    onMounted(fetchAll);

    watch(() => props.companyId, fetchAll);

    return {
      loading,
      error,
      currencyOptions,
      selectedCurrency,
      supplierCurrencyLabel,
      interestRates,
      exchangeRates,
      exchangeExpanded,
      interestExpanded,
      fetchAll,
      forceRefreshAll,
      calculatedAt,
      formatCalculatedAt,
    };
  },
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

.market-insights-wrapper {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 0 8px;
}

.market-insights-content {
  flex: 1;
}
</style>
