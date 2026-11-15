<template>
<div class="line-percent" :style="'width:' + widthContainer">
  <div class="chart-line__title" :style="`--fill: ${colorResult}; --percent: ${sizeResult}%;`"></div>
</div>
</template>
  
<script lang="ts">
import { defineComponent, ref, onMounted } from 'vue'
import * as colorsGroups from '@/utils/ColorsGroups'

export default defineComponent({
  name: 'HomeBarLevel',
  components: {},
  props: {
    sizeResult: { type: Number, default: 0 },
    widthContainer: { type: String, required: false, default: '100%' },
    colorDefault: { type: String, required: false, default: '' },
  },
  setup(props) {
    const colorResult = ref('');
    
    onMounted(() => {
      if (props.colorDefault === '') {
        if (props.sizeResult <= 20) {
          colorResult.value = colorsGroups.veryLow
        }
        if (props.sizeResult >= 21 && props.sizeResult <= 40) {
          colorResult.value = colorsGroups.low
        }
        if (props.sizeResult >= 41 && props.sizeResult <= 60) {
          colorResult.value = colorsGroups.medium
        }
        if (props.sizeResult >= 61 && props.sizeResult <= 80) {
          colorResult.value = colorsGroups.high
        }
        if (props.sizeResult >= 81) {
          colorResult.value = colorsGroups.veryHigh
        }
      } else {
        colorResult.value = props.colorDefault
      }
    })

    return { colorResult }
  }
})
</script>
  
<style scoped lang="scss">
@import "src/resources/assets/styles/variables/colors";

.line-percent {
  position: relative;
  width: 100%;
  height: 12px;
  border-radius: 6px;
  background: $color-gray-200;
}

.chart-line__title {
  position: relative;
  border-radius: 6px;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 89;
  width: var(--percent);
  background: var(--fill);
}
</style>