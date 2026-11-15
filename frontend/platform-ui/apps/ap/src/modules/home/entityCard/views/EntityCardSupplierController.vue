<template>
<div class="row w-100" v-if="loadingHsCodes">
  <div class="card w-100 mb-3 ml-3 mr-3 mt-3">
    <div class="row">
      <div class="col-12 mb-4">
        <Skeleton class="skeletons-bg" :shape="'rectangle'" :style="{ width: '25%', height: '16px', borderRadius: '8px' }"></Skeleton>
      </div>
      <div class="col-6">
        <Skeleton class="skeletons-bg" :shape="'rectangle'" :style="{ width: '100%', height: '600px', borderRadius: '8px' }"> </Skeleton>
      </div>
      <div class="col-6">
        <Skeleton class="skeletons-bg" :shape="'rectangle'" :style="{ width: '100%', height: '600px', borderRadius: '8px' }"></Skeleton>
      </div>
    </div>
  </div>
</div>
<div class="d-flex justify-content-center align-items-center" v-if="loadingHsCodes && someErrorInLovelace">
  <div class="d-flex flex-column align-items-center text-center"><span class="text-base font-semibold text-gray-700 mb-2">{{ $t('home.entityCard.marketInsights.errorTitle') }}</span>
    <button class="btn btn-primary btn-sm" @click="fetchHsCodeOptions">{{ $t('home.entityCard.marketInsights.retry') }}</button>
  </div>
</div>
<div class="row mr-2 mb-2" v-if="!loadingHsCodes && !someErrorInLovelace">
  <div class="col-12">
    <div class="note-banner d-flex align-items-start ml-3"><i class="fa-solid fa-circle-info mr-2 mt-1 flex-shrink-0"></i><span class="text-sm">{{ $t('home.entityCard.supplierInsights.betaDisclaimer') }}</span></div>
  </div>
</div>
<div class="row mr-2 mb-2" v-if="!loadingHsCodes && !someErrorInLovelace && commodityNotFound && !selectedHsCode">
  <div class="col-12">
    <div class="note-banner d-flex align-items-start ml-3"><i class="fa-solid fa-triangle-exclamation mr-2 mt-1 flex-shrink-0"></i><span class="text-sm">{{ $t('home.entityCard.supplierInsights.commodityNotFoundMessage') }}</span></div>
  </div>
</div>
<div class="row px-4 mb-4" v-if="!loadingHsCodes && !someErrorInLovelace">
  <div class="col-12 d-flex align-items-center mb-2">
    <TabStrip @select="changeTab" :selected="selectedTabIndex" :tabs="tabs"></TabStrip>
  </div>
  <div class="col-4 d-flex flex-column gap-1" v-if="!loadingHsCodes && !someErrorInLovelace"><span class="text-base font-semibold text-gray-600">{{ $t('home.entityCard.supplierInsights.commodity') }}</span>
    <SearchableDropdown v-model="selectedHsCode" :items="hsCodeOptions" value-key="value" label-key="label" :search-placeholder="$t('home.components.navbar.topMenu.search')" :placeholder="loadingHsCodes ? $t('global.loading') + '...' : ''" label="" :disabled="loadingHsCodes" @update:modelValue="onHsCodeChange"></SearchableDropdown>
  </div>
  <div class="col-12 d-flex align-items-center mt-4">
    <KeepAlive>
      <component v-if="!loadingHsCodes" :is="selectetTab" :key="selectetTab + keyComponent" :companyId="companyId" :entityDetails="entityDetails" :hsCodeOptions="hsCodeOptions" :selectedHsCode="selectedHsCode" :selectedHsCodeDescription="selectedHsCodeDescription" :industryCommodityProp="industryCommodity"></component>
    </KeepAlive>
  </div>
</div>
</template>

<script lang="ts">

import { defineComponent, ref, computed, onMounted, PropType, reactive, toRefs } from 'vue';
import { TabStrip } from "@progress/kendo-vue-layout";
import EntityCardSupplierInsights from "@/modules/home/entityCard/views/EntityCardSupplierInsights.vue";
import EntityCardCategoryInsights from "@/modules/home/entityCard/views/EntityCardCategoryInsights.vue";
import EntityCardMarketInsights from "@/modules/home/entityCard/views/EntityCardMarketInsights.vue";
import { SearchableDropdown } from '@ada/design-system';
import {
  getHsCodeReferences,
  getEntityCardIndustryCommodity,
  postLovelaceCommodityHsCode,
} from '@/modules/home/entityCard/api';
import { Skeleton } from '@progress/kendo-vue-indicators';
import { NumberUtils } from '@/utils'

export default defineComponent({
    name: 'EntityCardSupplierController',
    components: {
        TabStrip,
        EntityCardSupplierInsights,
        EntityCardCategoryInsights,
        EntityCardMarketInsights,
        Skeleton,
        SearchableDropdown
    },
    props: {
        companyId: { type: String, default: '' },
        entityDetails: { type: Object as PropType<Record<string, any> | null>, default: null }
    },
    setup(props: any) {

    const tabs = ref<{ title: string; contentClassName: string }[]>([])
    const selectedTabIndex = ref(0)
    const industryCommodity = ref<{ commodity?: string; industryName?: string } | null>(null);

    const state = reactive({
        hsCodeOptions: [] as { value: string; label: string }[],
        loadingHsCodes: false,
        selectedHsCode: '',
        selectedHsCodeDescription: '',
        keyComponent: NumberUtils.getRandomInt(),
        someErrorInLovelace: false,
        commodityNotFound: false
    })

    onMounted(() => {
        setTabs()
        fetchHsCodeOptions()
    })

    async function fetchHsCodeOptions() {
      state.loadingHsCodes = true;
      state.someErrorInLovelace = false;
      state.commodityNotFound = false;
      try {
        const result = await getHsCodeReferences();
        if (result.success && result.data && Array.isArray(result.data['hydra:member'])) {
          const members = result.data['hydra:member'] as { code: string; description: string }[];
          state.hsCodeOptions = members.map((item) => ({
            value: item.code,
            label: `${item.code} - ${item.description || ''}`
          }));
        }
      } catch {
        state.someErrorInLovelace = true;
        state.loadingHsCodes = false;
        return;
      }

      initLovelaceFlow()
    }


    async function initLovelaceFlow() {
      if (!props.companyId || !props.entityDetails) {
        return;
      }

      // 1) Get commodity name from /industry-commodity
      try {
        const industryResult = await getEntityCardIndustryCommodity(props.companyId);
        if (industryResult.success && industryResult.data) {
          industryCommodity.value = industryResult.data as { commodity?: string; industryName?: string };
        }
      } catch {
        state.someErrorInLovelace = true;
        state.loadingHsCodes = false;
        return;
      }

      const commodityName = industryCommodity.value?.commodity;
      const detail = props.entityDetails || {};

      // 3) Call Lovelace commodity-hs-code to get suggested HS code
      let commodityResp: Awaited<ReturnType<typeof postLovelaceCommodityHsCode>>;
      try {
        commodityResp = await postLovelaceCommodityHsCode({
          supplierName: detail.supplierName ?? '',
          supplierCountry: detail.supplierCountryAlpha3Code ?? detail.supplierCountry ?? '',
          buyerName: detail.buyerName ?? '',
          buyerCountry: detail.buyerCountry ?? '',
          commodity: commodityName ?? ''
        });
      } catch {
        state.someErrorInLovelace = true;
        state.loadingHsCodes = false;
        return;
      }

      let resolvedHsCode: string | null = null;
      if (commodityResp.success && commodityResp.data && commodityResp.data.output) {
        const rawCode: string | null = commodityResp.data.output.code ?? null;
        resolvedHsCode = rawCode && rawCode.length > 4 && !rawCode.includes('.') ? `${rawCode.slice(0, 4)}.${rawCode.slice(4)}` : rawCode;
      }

      // No code at all (Lovelace found no confident match, e.g. a services supplier) is a
      // not-found case, not a service error: the user must still reach the dropdown to pick
      // a commodity themselves, and someErrorInLovelace hides the whole tab.
      if (!resolvedHsCode) {
        state.commodityNotFound = true;
        state.loadingHsCodes = false;
        return;
      }

      const existsInList = (state.hsCodeOptions as { value: string; label: string }[]).some(o => o.value === resolvedHsCode);

      // Selecting nothing, rather than falling back to hsCodeOptions[0], is what keeps the
      // Supplier/Category/Market Share panels from generating content for an unrelated
      // commodity: they all guard their calls on a falsy selectedHsCode.
      if (existsInList) {
        state.selectedHsCode = resolvedHsCode;
        state.commodityNotFound = false;
      } else {
        state.selectedHsCode = '';
        state.commodityNotFound = true;
      }

      state.loadingHsCodes = false;

    }

    function setTabs() {
       tabs.value = [
          {
            title:  'Supplier Insights',
            contentClassName: "classContentHide",
          },
          {
            title: 'Market Insights',
            contentClassName: "classContentHide",
          },
          {
            title: 'Category Insights',
            contentClassName: "classContentHide",
          }
      ]
    }

    function changeTab(e: { selected: number }) {
      selectedTabIndex.value = e.selected;
    }

    function onHsCodeChange(e: any) {
      state.keyComponent++
    }

    const selectetTab = computed(() => {
        switch(selectedTabIndex.value) {
            case 0: return 'EntityCardSupplierInsights';
            case 1: return 'EntityCardMarketInsights';
            case 2: return 'EntityCardCategoryInsights';
            default: return 'EntityCardSupplierInsights';
        }
    });


    return {
        ...toRefs(state),
        tabs,
        selectedTabIndex,
        changeTab,
        selectetTab,
        onHsCodeChange,
        industryCommodity,
        fetchHsCodeOptions
    }
  },


})
</script>