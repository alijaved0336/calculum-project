<template>
<CalculumModal :showClose="true" title="" size="lg-70" @close="$emit('close')">
  <template #modalContent>
    <div class="mid-wrapper">
      <div class="mid-panels">
        <div class="mid-panel">
          <div class="mid-panel-header"><span class="mid-panel-label">PRIMARY SERIES: BLS PPI</span>
            <div class="mid-panel-badges"><span class="mid-badge mid-badge--dark">HISTORICAL</span><span class="mid-badge mid-badge--green">VERIFIED</span></div>
          </div>
          <div class="mid-chart-wrapper">
            <Chart :style="{ width: '100%', height: '100%' }">
              <ChartArea :height="220" :margin="{ top: 12, right: 8, bottom: 0, left: 0 }" :background="'transparent'"></ChartArea>
              <ChartSeries>
                <ChartSeriesItem :type="'line'" :data-items="item.ppiHistory" :line="{ style: 'smooth', width: 2 }" :color="'#1e2d4a'" :markers="{ visible: false }"></ChartSeriesItem>
              </ChartSeries>
              <ChartCategoryAxis>
                <ChartCategoryAxisItem :categories="item.ppiMonths" :labels="{ font: '9px Inter', color: '#94a3b8', rotation: 0 }" :major-grid-lines="{ visible: false }" :line="{ visible: false }"></ChartCategoryAxisItem>
              </ChartCategoryAxis>
              <ChartValueAxis>
                <ChartValueAxisItem :labels="{ font: '9px Inter', color: '#94a3b8' }" :major-grid-lines="{ color: '#f1f5f9' }" :line="{ visible: false }"></ChartValueAxisItem>
              </ChartValueAxis>
              <ChartLegend :visible="false"></ChartLegend>
            </Chart>
          </div>
        </div>
        <div class="mid-panel">
          <div class="mid-panel-header"><span class="mid-panel-label">VERIFICATION SERIES: ST. LOUIS FRED</span>
            <button class="mid-sync-btn" type="button">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path>
                <path d="M3 3v5h5"></path>
                <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"></path>
                <path d="M16 16h5v5"></path>
              </svg>SYNC WITH FRED
            </button>
          </div>
          <div class="mid-placeholder">
            <svg class="mid-placeholder-icon" xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83z"></path>
              <path d="M2 12a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 12"></path>
              <path d="M2 17a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 17"></path>
            </svg>
            <p class="mid-placeholder-text">SYNCHRONIZE WITH FEDERAL RESERVE DATA TO CROSS-VERIFY BLS PRICING VOLATILITY AND PARITY.</p>
          </div>
        </div>
      </div>
      <div class="mid-commentary">
        <div class="mid-commentary-left">
          <h6 class="mid-commentary-title">Market Divergence Commentary</h6>
          <p class="mid-commentary-text">{{ item.commentary }}</p>
        </div>
        <div class="mid-divider"></div>
        <div class="mid-commentary-right">
          <div class="mid-metric"><span class="mid-metric-label">36M VOLATILITY</span><span class="mid-metric-value">{{ item.volatility }}</span></div>
          <div class="mid-metric"><span class="mid-metric-label">MARKET BIAS</span><span class="mid-metric-value" :class="`mid-bias--${item.marketBias.toLowerCase()}`">{{ item.marketBias }}</span></div>
        </div>
      </div>
    </div>
  </template>
</CalculumModal>
</template>

<script lang="ts">
import { defineComponent, PropType } from 'vue';
import CalculumModal from '@/modules/components/CalculumModal.vue';
import {
  Chart,
  ChartArea,
  ChartSeries,
  ChartSeriesItem,
  ChartCategoryAxis,
  ChartCategoryAxisItem,
  ChartValueAxis,
  ChartValueAxisItem,
  ChartLegend
} from '@progress/kendo-vue-charts';
import type { MaterialItem } from './MaterialIndexTable.vue';

export default defineComponent({
  name: 'MaterialIndexDetailModal',
  components: {
    CalculumModal,
    Chart, ChartArea, ChartSeries, ChartSeriesItem,
    ChartCategoryAxis, ChartCategoryAxisItem,
    ChartValueAxis, ChartValueAxisItem,
    ChartLegend
  },
  props: {
    item: { type: Object as PropType<MaterialItem>, required: true }
  },
  emits: ['close']
});
</script>

<style lang="scss" scoped>
.mid-wrapper {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

// Top panels
.mid-panels {
  display: flex;
  gap: 16px;
}

.mid-panel {
  flex: 1;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  overflow: hidden;
  min-width: 0;
}

.mid-panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  border-bottom: 1px solid #f1f5f9;
}

.mid-panel-label {
  font-size: 0.6rem;
  font-weight: 700;
  letter-spacing: 0.09em;
  text-transform: uppercase;
  color: #64748b;
}

.mid-panel-badges {
  display: flex;
  gap: 6px;
}

.mid-badge {
  font-size: 0.58rem;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 20px;
  text-transform: uppercase;
  letter-spacing: 0.05em;

  &--dark  { background: #1e2d4a; color: #ffffff; }
  &--green { background: #22c55e; color: #ffffff; }
}

.mid-sync-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  background: #1e2d4a;
  color: #ffffff;
  border: none;
  border-radius: 6px;
  padding: 5px 10px;
  font-size: 0.62rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  cursor: pointer;
  transition: background 0.15s;

  &:hover { background: #2e3f5e; }
}

.mid-chart-wrapper {
  padding: 8px 4px 0;

  :deep(.k-chart) { overflow: visible; }
}

.mid-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 24px;
  min-height: 200px;
  gap: 16px;
  color: #cbd5e1;
}

.mid-placeholder-icon {
  color: #cbd5e1;
  opacity: 0.7;
}

.mid-placeholder-text {
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: #94a3b8;
  text-align: center;
  line-height: 1.6;
  max-width: 260px;
  margin: 0;
}

// Bottom commentary
.mid-commentary {
  background: #0d1526;
  border-radius: 10px;
  padding: 20px 24px;
  display: flex;
  align-items: center;
  gap: 24px;
}

.mid-commentary-left {
  flex: 1;
  min-width: 0;
}

.mid-commentary-title {
  font-size: 0.95rem;
  font-weight: 700;
  color: #ffffff;
  margin: 0 0 8px;
}

.mid-commentary-text {
  font-size: 0.78rem;
  font-style: italic;
  color: #94a3b8;
  line-height: 1.6;
  margin: 0;
}

.mid-divider {
  width: 1px;
  align-self: stretch;
  background: rgba(255, 255, 255, 0.1);
  flex-shrink: 0;
}

.mid-commentary-right {
  display: flex;
  flex-direction: column;
  gap: 16px;
  flex-shrink: 0;
  min-width: 140px;
}

.mid-metric {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.mid-metric-label {
  font-size: 0.58rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: #64748b;
}

.mid-metric-value {
  font-size: 1.4rem;
  font-weight: 800;
  color: #ffffff;
  letter-spacing: 0.02em;

  &.mid-bias--bearish { color: #ef4444; }
  &.mid-bias--bullish { color: #22c55e; }
  &.mid-bias--neutral { color: #94a3b8; }
}
</style>
