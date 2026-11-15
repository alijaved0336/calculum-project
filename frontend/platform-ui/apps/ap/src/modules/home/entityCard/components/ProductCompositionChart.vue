<template>
<div class="pcc-card">
  <div class="pcc-header"><span class="text-base font-semibold text-gray-600 mb-2">Product Composition</span>
    <div class="pcc-total"><span class="pcc-total-label">TOTAL ALLOCATION</span><span class="pcc-total-value" :class="totalClass">{{ totalAllocation.toFixed(1) }}%</span></div>
  </div>
  <div class="pcc-chart-wrapper">
    <Chart :key="chartKey" :style="{ width: '100%', height: '100%' }">
      <ChartArea :margin="{ top: 8, bottom: 0 }" :background="'transparent'"></ChartArea>
      <ChartSeries>
        <ChartSeriesItem :type="'donut'" :data-items="chartData" :color-field="'color'" :field="'value'" :category-field="'name'" :hole-size="100" :labels="{ visible: false }" :overlay="{ gradient: 'none' }"></ChartSeriesItem>
      </ChartSeries>
      <ChartLegend :visible="false"></ChartLegend>
      <ChartTooltip :visible="true" :render="tooltipRender"></ChartTooltip>
    </Chart>
  </div>
  <div class="pcc-list">
    <div class="pcc-item" v-for="(item, i) in items" :key="item.id">
      <div class="pcc-item-left"><span class="pcc-dot" :style="{ background: item.color }"></span>
        <div class="pcc-item-info">
          <input class="pcc-item-name-input" type="text" :value="item.name" @input="onNameChange(i, $event)"/><span class="pcc-item-code">{{ item.code }}</span>
        </div>
      </div>
      <div class="pcc-item-controls">
        <button class="pcc-step-btn" @click="step(i, -STEP)" :disabled="item.value <= 0"><i class="fa-solid fa-chevron-down"></i></button>
        <input class="pcc-value-input" type="number" min="0" :value="item.value" @change="onInputChange(i, $event)"/>
        <button class="pcc-step-btn" @click="step(i, STEP)"><i class="fa-solid fa-chevron-up"></i></button>
      </div>
    </div>
  </div>
  <button class="pcc-add-btn" type="button" @click="addItem">+ ADD SPECIFIC MATERIAL</button>
</div>
</template>

<script lang="ts">
import { defineComponent, ref, computed, watch, h, PropType } from 'vue';
import {
  Chart,
  ChartArea,
  ChartSeries,
  ChartSeriesItem,
  ChartLegend,
  ChartTooltip
} from '@progress/kendo-vue-charts';
import type { CostModel } from '@/modules/home/entityCard/types';

const STEP = 1;

const PALETTE = ['#1a2744', '#2e4a7a', '#4f6fa0', '#7a9cc0', '#b5c8dc', '#d4e3f0', '#8ab4cc', '#3d5e8c'];

interface CompositionItem {
  id: number;
  name: string;
  code: string;
  value: number;
  color: string;
}

export default defineComponent({
  name: 'ProductCompositionChart',
  components: { Chart, ChartArea, ChartSeries, ChartSeriesItem, ChartLegend, ChartTooltip },
  props: {
    data: { type: Object as PropType<CostModel>, default: null }
  },
  setup(props) {
    let nextId = 1;

    const items = ref<CompositionItem[]>([]);
    const chartKey = ref(0);

    const propItems = computed<CompositionItem[]>(() => {
      if (!props.data) return [];
      const all = [
        ...(props.data.direct ?? []),
        ...(props.data.indirect ?? [])
      ];
      let id = 1;
      return all.map((item, index) => ({
        id: id++,
        name: item.item,
        code: item.bls.seriesId,
        value: item.estimatedCostPercent,
        color: PALETTE[index % PALETTE.length]
      }));
    });

    watch(propItems, (newItems) => {
      items.value = newItems.map(i => ({ ...i }));
      nextId = newItems.length + 1;
      chartKey.value++;
    }, { immediate: true });

    const totalAllocation = computed(() =>
      items.value.reduce((sum, item) => sum + item.value, 0)
    );

    const totalClass = computed(() => {
      const t = totalAllocation.value;
      if (t === 100) return 'complete';
      if (t > 100) return 'over';
      return '';
    });

    const chartData = computed(() =>
      items.value.filter(i => i.value > 0).map(i => ({
        name: i.name,
        value: i.value,
        color: i.color
      }))
    );

    function step(index: number, delta: number) {
      const item = items.value[index];
      const next = Math.max(0, item.value + delta);
      items.value[index] = { ...item, value: next };
      chartKey.value++;
    }

    function onNameChange(index: number, event: Event) {
      items.value[index] = { ...items.value[index], name: (event.target as HTMLInputElement).value };
    }

    function onInputChange(index: number, event: Event) {
      const raw = Number((event.target as HTMLInputElement).value);
      const next = Number.isFinite(raw) ? Math.max(0, Math.round(raw)) : 0;
      items.value[index] = { ...items.value[index], value: next };
      chartKey.value++;
    }

    function addItem() {
      const colorIndex = (items.value.length) % PALETTE.length;
      items.value.push({
        id: nextId++,
        name: 'New Material',
        code: '',
        value: 0,
        color: PALETTE[colorIndex]
      });
    }

    function tooltipRender(props: any) {
      const val = props.point?.value;
      const cat = props.point?.category;
      if (val == null) return h('span', '');
      const pct = totalAllocation.value > 0
        ? ((val / totalAllocation.value) * 100).toFixed(1)
        : '0.0';
      return h('span', `${cat}: ${val} (${pct}%)`);
    }

    return { items, chartKey, chartData, totalAllocation, totalClass, step, onNameChange, onInputChange, addItem, tooltipRender, STEP };
  }
});
</script>

<style lang="scss" scoped>
.pcc-card {
  background: #ffffff;
  border-radius: 12px;
  box-shadow: 0 1px 8px rgba(0, 0, 0, 0.08);
  padding: 20px 20px 12px;
  width: 100%;
}

.pcc-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 4px;
}

.pcc-total {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 2px;
}

.pcc-total-label {
  font-size: 0.6rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  color: #4e9fba;
  text-transform: uppercase;
}

.pcc-total-value {
  font-size: 1.4rem;
  font-weight: 700;
  color: #1f2937;

  &.over     { color: #ef4444; }
  &.complete { color: #1f2937; }
}

.pcc-chart-wrapper {
  margin: 0 auto;
  width: 100%;
  aspect-ratio: 1;
  overflow: hidden;

  :deep(.k-chart) {
    width: 100% !important;
    height: 100% !important;
  }
}

.pcc-list {
  margin-top: 8px;
  display: flex;
  flex-direction: column;
}

.pcc-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 0;
  border-bottom: 1px solid #f1f5f9;

  &:last-child { border-bottom: none; }
}

.pcc-item-left {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
  flex: 1;
}

.pcc-dot {
  flex-shrink: 0;
  width: 10px;
  height: 10px;
  border-radius: 50%;
}

.pcc-item-info {
  display: flex;
  flex-direction: column;
  width: 100%;
}

.pcc-item-name-input {
  font-size: 0.8rem;
  font-weight: 600;
  color: #1f2937;
  width: 100%;
  border: 1px solid transparent;
  border-radius: 4px;
  padding: 1px 4px;
  background: transparent;
  outline: none;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  transition: border-color 0.15s;

  &:hover  { border-color: #e2e8f0; }
  &:focus  { border-color: #4e9fba; background: #f8fafc; }
}

.pcc-item-code {
  font-size: 0.68rem;
  color: #94a3b8;
  margin-top: 1px;
}

.pcc-item-controls {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
  margin-left: 12px;
}

.pcc-step-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border: 1px solid #e2e8f0;
  border-radius: 4px;
  background: transparent;
  cursor: pointer;
  color: #64748b;
  font-size: 0.6rem;
  padding: 0;
  transition: background 0.15s;

  &:hover:not(:disabled) { background: #f1f5f9; }
  &:disabled { opacity: 0.35; cursor: not-allowed; }
}

.pcc-value-input {
  width: 48px;
  text-align: center;
  font-size: 0.85rem;
  font-weight: 600;
  color: #1f2937;
  border: 1px solid #e2e8f0;
  border-radius: 4px;
  padding: 2px 4px;
  background: transparent;
  outline: none;

  &:focus { border-color: #4e9fba; }

  &::-webkit-inner-spin-button,
  &::-webkit-outer-spin-button { display: none; }

  -moz-appearance: textfield;
  appearance: textfield;
}

.pcc-add-btn {
  width: 100%;
  margin-top: 12px;
  padding: 9px 0;
  border: 1.5px dashed #cbd5e1;
  border-radius: 8px;
  background: transparent;
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.06em;
  color: #64748b;
  cursor: pointer;
  transition: border-color 0.15s, color 0.15s;

  &:hover {
    border-color: #4e9fba;
    color: #4e9fba;
  }
}
</style>
