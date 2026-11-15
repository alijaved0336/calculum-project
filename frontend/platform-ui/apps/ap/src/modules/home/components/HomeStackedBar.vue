<template>
<div class="d-flex-flex-column">
  <Tooltip class="ellipsis_tooltip" :openDelay="100" :anchorElement="'target'" :position="'bottom'">
    <div class="d-flex mb-3" :class="heigthClass">
      <div v-for="(info, index) in infoData" :data-toggle="'tooltip'" :title="formatData.getNumberWithDecimals(info.value,0)" :data-placement="'top'" :key="index" :class="setClass(info.percentage,info.key)" :style="{ width: setPercentage(info.percentage)  + '%' }"></div>
    </div>
  </Tooltip>
  <div class="d-flex mt-4 gap-2">
    <div class="d-flex mr-1 dots-container" v-for="(info, index) in infoData" :key="index">
      <div class="dot mr-1" :class="`${info.key}-class`"></div><span class="text-sm font-medium text-gray-500 mr-1">{{ target === 'rebate' && info.key === 'remaining' ?  $t(`home.manageModule.remainingRebate`) : $t(`home.manageModule.${info.key}`) }} </span><span class="text-sm font-semibold text-gray-700">{{ showPercentage ? `${info.percentage}%` : StringUtils.formatBigNumbers(info.value) }}</span>
    </div>
  </div>
</div>
</template>

<script lang="ts">
import { defineComponent, computed, PropType } from 'vue';
import { Tooltip } from '@progress/kendo-vue-tooltip';
import * as formatData from '@/utils/FormatData';
import { StringUtils } from '@/utils';

interface StackedBarInfo {
  key: string;
  value: number;
  percentage: number;
}

export default defineComponent({
  name: 'HomeStackedBar',
  
  components: { 
    Tooltip 
  },
  
  props: {
    infos: {
      type: Array as PropType<StackedBarInfo[]>,
      required: true,
      default: () => []
    },
    heigthClass: {
      type: String,
      required: false,
      default: 'min-h-14'
    },
    showPercentage: {
      type: Boolean,
      required: false,
      default: false
    },
    target: {
      type: String,
      required: false,
      default: ''
    }
  },

  setup(props) {
    const infoData = computed(() => {
      const data = props.infos.slice();
      const index = data.findIndex((item: StackedBarInfo) => item.percentage < 0);
      if (index >= 0) {
        const elemento = data.splice(index, 1)[0];
        data.unshift(elemento);
      }
      return data;
    });

    function setPercentage(percentage: number): number {
      return percentage < 0 ? Math.abs(percentage) : percentage;
    }

    function setClass(percentage: number, statusclass: string): string {
      return percentage < 0 ? `negative-percentage ${statusclass}-class` : `${statusclass}-class`;
    }

    return {
      infoData,
      setPercentage,
      setClass,
      formatData,
      StringUtils
    };
  }
});
</script>

<style scoped>
.d-flex > div.negative-percentage {
  position: relative; 
}

.d-flex > div.negative-percentage::after {
  content: ''; 
  position: absolute;
  top: 0px;
  left: 100%;
  width: 2px;
  height: 120%;
  background-color: black; 
}

.d-flex > div.negative-percentage::before {
  content: '0';
  position: absolute;
  bottom: -25px;
  left: 100.5%;
  transform: translateX(-50%);
  color: #98a2b3 !important;
  font-size: 12px;
}
</style>