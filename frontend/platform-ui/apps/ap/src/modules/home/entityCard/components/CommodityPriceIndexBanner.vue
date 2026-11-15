<template>
<div class="commodity-price-banner">
  <div class="banner-left"><span class="banner-label">ANALYSIS TARGET</span>
    <div class="banner-title"><span class="banner-name">{{ getName }}</span><span class="banner-code">&nbsp;|&nbsp;{{ getHsCode }}</span></div><span class="banner-subtitle">COMPOSITE PROCUREMENT INDEX ANALYSIS</span>
  </div>
  <div class="banner-metrics">
    <div class="banner-metric"><span class="metric-label">MONTH OVER MONTH</span>
      <div class="metric-value" :class="data.monthOverMonth.direction === 'up' ? 'metric-up' : 'metric-down'">
        <IconChartForecast v-if="data.monthOverMonth.direction === 'up'" :color="'#ef4444'"></IconChartForecast>
        <IconChartForecastDown v-else :color="'#ff2c4f'"></IconChartForecastDown><span>{{ data.monthOverMonth.value }}</span>
      </div>
    </div>
    <div class="banner-metric"><span class="metric-label">YEAR OVER YEAR</span>
      <div class="metric-value" :class="data.yearOverYear.direction === 'up' ? 'metric-up' : 'metric-down'">
        <IconChartForecast v-if="data.yearOverYear.direction === 'up'" :color="'#ef4444'"></IconChartForecast>
        <IconChartForecastDown v-else :color="'#ff2c4f'"></IconChartForecastDown><span>{{ data.yearOverYear.value }}</span>
      </div><span class="metric-sublabel">WEIGHTED GLOBAL AVG</span>
    </div>
  </div>
</div>
</template>

<script lang="ts">
import { defineComponent, computed } from 'vue';
import IconChartForecast from '@ada/design-system/assets/icons/iconChartForecast.vue';
import IconChartForecastDown from '@ada/design-system/assets/icons/iconChartForecastDown.vue';

const DUMMY_DATA = {
  commodityName: 'Commercial Live Swine Production',
  commodityCode: '0103',
  monthOverMonth: { direction: 'up' as 'up' | 'down', value: '0.69%' },
  yearOverYear: { direction: 'down' as 'up' | 'down', value: '1.64%' }
};

export default defineComponent({
  name: 'CommodityPriceIndexBanner',
  components: { IconChartForecast, IconChartForecastDown },
  props: {
    productName: {type: String, default: ''},
    hsCodeName: {type: String, default: ''}
  },
  setup(props) {

    const getName = computed(() => {
      return props.productName
    })

    const getHsCode = computed(() => {
      return props.hsCodeName
    })


    return { data: DUMMY_DATA, getName, getHsCode };
  }
});
</script>

<style lang="scss" scoped>
.commodity-price-banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #0d1526;
  border-radius: 12px;
  padding: 18px 28px;
  width: 100%;
  gap: 16px;
}

.banner-left {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.banner-label {
  font-size: 0.65rem;
  font-weight: 600;
  letter-spacing: 0.08em;
  color: #4e9fba;
  text-transform: uppercase;
}

.banner-title {
  display: flex;
  align-items: baseline;
  gap: 0;
  flex-wrap: wrap;
}

.banner-name {
  font-size: 1.1rem;
  font-weight: 700;
  color: #ffffff;
}

.banner-code {
  font-size: 1rem;
  font-weight: 400;
  color: #7a8fa6;
}

.banner-subtitle {
  font-size: 0.6rem;
  font-weight: 600;
  letter-spacing: 0.08em;
  color: #4e9fba;
  text-transform: uppercase;
}

.banner-metrics {
  display: flex;
  gap: 40px;
  flex-shrink: 0;
}

.banner-metric {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
}

.metric-label {
  font-size: 0.6rem;
  font-weight: 600;
  letter-spacing: 0.08em;
  color: #7a8fa6;
  text-transform: uppercase;
}

.metric-value {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 1.4rem;
  font-weight: 700;

  &.metric-up span { color: #ef4444; }
  &.metric-down span { color: #22c55e; }
}

.metric-sublabel {
  font-size: 0.6rem;
  font-weight: 500;
  letter-spacing: 0.06em;
  color: #7a8fa6;
  text-transform: uppercase;
}
</style>
