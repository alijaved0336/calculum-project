<template>
<div class="mit-card">
  <div class="mit-table">
    <div class="mit-thead"><span class="mit-th mit-col-material text-xs font-semibold text-gray-600">Category Composition (H.S. code)</span><span class="mit-th mit-col-alloc text-xs font-semibold text-gray-600">Alloc %</span><span class="mit-th mit-col-sparkline text-xs font-semibold text-gray-600">Trend</span><span class="mit-th mit-col-mom text-xs font-semibold text-gray-600">MOM</span><span class="mit-th mit-col-yoy text-xs font-semibold text-gray-600">YOY</span></div>
    <div class="mit-tbody">
      <div class="mit-row" v-for="item in displayedItems" :key="item.id">
        <div class="mit-col-material"><span class="mit-name">{{ item.name }}</span><span class="mit-code">{{ item.code }}</span></div>
        <div class="mit-col-alloc"><span class="mit-alloc-val">{{ item.alloc.toFixed(2) }}%</span></div>
        <div class="mit-col-sparkline cover-trend">
          <Tooltip :open-delay="50" :anchor-element="'target'" :position="'top'">
            <iconChartVolatile v-if="item.trendDirection === 'volatile'" :color="'#15b79e'" :title="item.trendDirection"></iconChartVolatile>
          </Tooltip>
          <Tooltip :open-delay="50" :anchor-element="'target'" :position="'top'">
            <iconChartStable v-if="item.trendDirection === 'stable'" :color="'#15b79e'" :title="item.trendDirection"></iconChartStable>
          </Tooltip>
          <Tooltip :open-delay="50" :anchor-element="'target'" :position="'top'">
            <IconChartForecast v-if="item.trendDirection === 'up' || item.trendDirection === 'rising'" :color="'#15b79e'" :title="item.trendDirection"></IconChartForecast>
          </Tooltip>
          <Tooltip :open-delay="50" :anchor-element="'target'" :position="'top'">
            <IconChartForecastDown v-if="item.trendDirection === 'down' || item.trendDirection === 'falling'" :color="'#ff2c4f'" :title="item.trendDirection"></IconChartForecastDown>
          </Tooltip>
        </div>
        <div class="mit-col-mom"><span :class="item.mom < 0 ? 'mit-val--down' : 'mit-val--up'">{{ formatPct(item.mom) }}</span></div>
        <div class="mit-col-yoy"><span :class="item.yoy < 0 ? 'mit-val--down' : 'mit-val--up'">{{ formatPct(item.yoy) }}</span></div>
      </div>
    </div>
  </div>
  <MaterialIndexDetailModal v-if="selectedItem" :item="selectedItem" @close="selectedItem = null"></MaterialIndexDetailModal>
</div>
</template>

<script lang="ts">
import { defineComponent, ref, computed, PropType } from 'vue';
import MaterialIndexDetailModal from './MaterialIndexDetailModal.vue';
import type { CommodityPricingOutput } from '@/modules/home/entityCard/types';
import { Tooltip } from '@progress/kendo-vue-tooltip';
import IconChartForecast from '@ada/design-system/assets/icons/iconChartForecast.vue';
import IconChartForecastDown from '@ada/design-system/assets/icons/iconChartForecastDown.vue';
import iconChartStable from '@/resources/assets/images/icons/iconChartStable.vue';
import iconChartVolatile from '@/resources/assets/images/icons/iconChartVolatile.vue';

export interface MaterialItem {
  id: number;
  name: string;
  code: string;
  alloc: number;
  sparkline: number[];
  trendDirection: string;
  mom: number;
  yoy: number;
  ppiHistory: number[];
  ppiMonths: string[];
  commentary: string; 
}


export default defineComponent({
  name: 'MaterialIndexTable',
  components: { MaterialIndexDetailModal, Tooltip, IconChartForecast, IconChartForecastDown, iconChartStable, iconChartVolatile },
  props: {
    data: { type: Array as PropType<CommodityPricingOutput[]>, default: () => [] },
    showMore: { type: Boolean, default: false}
  },
  setup(props) {
    const selectedItem = ref<MaterialItem | null>(null);

    const items = computed<MaterialItem[]>(() =>
      props.data.map((d, i) => ({
        id: i + 1,
        name: d.name,
        code: d.seriesId,
        alloc: d.estimatedCostPercent,
        sparkline: d.ppiPrice ? [d.ppiPrice] : [],
        trendDirection: d.trendDirection.toLowerCase(),
        mom: d.momChange,
        yoy: d.yoyChange,
        ppiHistory: d.ppiPrice ? [d.ppiPrice] : [],
        ppiMonths: d.latestPeriod ? [d.latestPeriod] : [],
        commentary: d.analysis.forwardOutlook        
      }))
    );

    const computedShowAllitems = computed(() => props.showMore);

    const displayedItems = computed(() =>
      computedShowAllitems.value ? items.value : items.value.slice(0, 5)
    );

    function openModal(item: MaterialItem) {
      selectedItem.value = item;
    }

    function formatPct(val: number): string {
      return (val > 0 ? '+' : '') + val.toFixed(2) + '%';
    }

    return { items, displayedItems, selectedItem, openModal, formatPct, computedShowAllitems };
  }
});
</script>

<style lang="scss" scoped>

@import '@/resources/assets/styles/variables/_colors.scss';

.cover-trend {
  background: $color-gray-100;
  padding: 5px;
  height: 40px;
  border-radius: 8px;
}

.mit-card {
  background: #ffffff;  
  overflow: hidden;
  width: 100%;
}

.mit-table {
  width: 100%;
  display: flex;
  flex-direction: column;
  border: 3px solid #f8f9fa;
}

.mit-thead,
.mit-row {
  display: flex;
  align-items: center;
}

.mit-thead {  
  padding: 10px 20px;
  gap: 0;
  background-color: #f8f9fa ;
}

.mit-th {  
  text-transform: uppercase;  
}

.mit-row {
  padding: 14px 20px;
  border-bottom: 1px solid #f1f5f9;  
  transition: background 0.15s;

  &:last-child { border-bottom: none; }  
}

// Column widths
.mit-col-material { flex: 1 1 0; min-width: 0; }
.mit-col-alloc    { width: 80px; flex-shrink: 0; text-align: center; }
.mit-col-sparkline{ width: 120px; flex-shrink: 0; text-align: center;}
.mit-col-mom      { width: 70px; flex-shrink: 0; text-align: center; }
.mit-col-yoy      { width: 70px; flex-shrink: 0; text-align: center; }

.mit-name {
  display: block;
  font-size: 0.75rem;
  font-weight: 600;
  color: #1e293b;
}

.mit-code {
  display: block;
  font-size: 0.75rem;
  color: #94a3b8;
  margin-top: 2px;
}

.mit-alloc-val {
  font-size: 0.75rem;
  font-weight: 600;
  color: #1e293b;
}

.mit-sparkline-svg {
  width: 100px;
  height: 50px;
  display: block;
  background: #f2f4f7;
  border-radius: 4px;
}

.mit-val--up   { font-size: 0.75rem; font-weight: 600; color: #ef4444; }
.mit-val--down { font-size: 0.75rem; font-weight: 600; color: #22c55e; }
</style>
