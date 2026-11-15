<template>
<div class="progress-chart">
  <div class="progress-chart__lines">
    <div class="progress-chart__line-wrp" v-if="value1 >= 0" :style="setBackgroundColor(colorBase)">
      <div class="progress-chart__line" :style="setLineStyles(colorValue1, value1)">
        <div class="progress-chart__line-value"><span>{{ value1 === null || value1 === undefined ? "N/A" : value1}}</span></div>
      </div>
    </div>
    <div class="progress-chart__line-wrp" v-if="value2 >= 0" :style="setBackgroundColor(colorBase)">
      <div class="progress-chart__line" :style="setLineStyles(colorValue2, value2)">
        <div class="progress-chart__line-value"><span>{{ value2 === null || value2 === undefined ? "N/A" : value2}}</span></div>
      </div>
    </div>
    <div class="progress-chart__line-wrp" v-if="value3 >= 0 && showItem3" :style="setBackgroundColor(colorBase)">
      <div class="progress-chart__line" :style="setLineStyles(colorValue3, value3)" v-if="showItem3">
        <div class="progress-chart__line-value"><span v-if="showItem3">{{ value3 === null || value3 === undefined ? "N/A" : value3}}</span></div>
      </div>
    </div>
  </div>
  <div class="progress-chart__labels" v-if="showdots">
    <div class="progress-chart__label" v-if="value1 >= 0">
      <div class="progress-chart__label-circle" :style="setBackgroundColor(colorValue1)"></div><span>{{ textValue1 ?? $t('components.calculumProgressChart.contractual') }}</span>
    </div>
    <div class="progress-chart__label" v-if="value2 >= 0">
      <div class="progress-chart__label-circle" :style="setBackgroundColor(colorValue2)"></div><span>{{ textValue2 ?? $t('components.calculumProgressChart.current') }}</span>
    </div>
    <div class="progress-chart__label" v-if="value3 >= 0 && showItem3">
      <div class="progress-chart__label-circle" :style="setBackgroundColor(colorValue3)"></div><span>{{ textValue3 ?? $t('global.opportunity') }}</span>
    </div>
  </div>
  <div class="progress-chart__labels" v-if="showdotsPartial">
    <div class="progress-chart__label">
      <div class="progress-chart__label-circle" :style="setBackgroundColor(colorValue1)"></div><span>{{ textValue1 ?? $t('components.calculumProgressChart.contractual') }}</span>
    </div>
    <div class="progress-chart__label">
      <div class="progress-chart__label-circle" :style="setBackgroundColor(colorValue2)"></div><span>{{ textValue2 ?? $t('components.calculumProgressChart.current') }}</span>
    </div>
    <div class="progress-chart__label" v-if="showItem3">
      <div class="progress-chart__label-circle" :style="setBackgroundColor(colorValue3)"></div><span>{{ textValue3 ?? $t('global.opportunity') }}</span>
    </div>
  </div>
</div>
</template>
<script lang="ts">
export default {
  name: 'CalculumThreeProgressChart',
  props: {
    colorBase: { type: String, required: true, default: 'hsl(220, 7%, 92%)' },
    colorValue1: { type: String, required: true, default: 'hsl(143, 55%, 40%)' },
    colorValue2: { type: String, required: true, default: 'hsl(350, 100%, 59%)' },
    colorValue3: { type: String, required: true, default: 'hsl(143, 55%, 40%)' },
    value1: { type: Number, required: true, default: 0 },
    value2: { type: Number, required: true, default: 0 },
    value3: { type: Number, required: true, default: 0 },
    maxValue: { type: Number, required: true, default: 150 },
    showdots: { type: Boolean, required: false, default: true },
    showdotsPartial: { type: Boolean, required: false, default: false },
    textValue1: { type: String, required: false },
    textValue2: { type: String, required: false },
    textValue3: { type: String, required: false },
    showItem3: { type: Boolean, required: false, default: true }
  },
  setup(props: any) {
    function setBackgroundColor(color: string) {
      return `background-color: ${color};`
    }
    function setLineStyles(color: string, value: number) {
      const textColor = `color: ${color};`
      const width = `width: max(2rem, calc(${value / props.maxValue * 100}% - 2rem));`
      return [setBackgroundColor(color), textColor, width].join(' ')
    }

    return {
      setLineStyles,
      setBackgroundColor
    }
  }
}
</script>

<style scoped lang="scss">
.progress-chart {
  width: 100%;
  display: grid;
  grid-template-columns: 100%;
}

.progress-chart__lines {
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 1.5rem 0;
  gap: 1rem;
}

.progress-chart__line-wrp {
  position: relative;
  width: 100%;
  height: 3rem;
  border-radius: 2rem;
  align-self: center;
}

.progress-chart__line {
  position: absolute;
  z-index: 1;
  top: 0;
  left: 0;
  height: 100%;
  width: 2rem;
  border-radius: 2rem 0 0 2rem;

  &-value {
    position: absolute;
    top: 0;
    right: 0;
    height: 100%;
    color: inherit;
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: hsl(0, 0%, 100%);
    aspect-ratio: 1 / 1;
    transform: translateX(50%);
    border: solid 0.25rem;
    border-radius: 50%;

    span {
      color: hsl(0, 0%, 0%);
      font-size: 1.2rem;
    }
  }
}

.progress-chart__labels {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem 1rem;
}

.progress-chart__label {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 0.25rem;

  &-circle {
    flex-shrink: 0;
    width: 1.25rem;
    height: 1.25rem;
    border-radius: 50%;
  }

  span {
    color: #667085;
    font-size: .875rem;
    font-weight: 500;
  }
}
</style>
