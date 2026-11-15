<template>
<div class="progress-chart">
  <div class="progress-chart__lines">
    <div class="progress-chart__line-wrp" v-if="currentValue >= 0" :style="setBackgroundColor(colorBase)">
      <div class="progress-chart__line" :style="setLineStyles(colorResult, currentValue)">
        <div class="progress-chart__line-value"><span>{{ paintNAValue && currentValue === null ? 'N/A' : currentValue }} {{ title }}</span></div>
      </div>
    </div>
  </div>
</div>
</template>

<script lang="ts">
export default {
  name: 'CalculumProgressChart',
  props: {
    colorBase: { type: String, required: false, default: 'hsl(220, 7%, 92%)' },
    colorResult: { type: String, required: false, default: 'hsl(350, 100%, 59%)' },
    currentValue: { type: Number, required: true, default: 0 },
    maxValue: { type: Number, required: false, default: 100 },
    title: { type: String, required: false, default: '' },
    paintNAValue: { type: Boolean, required: false, default: false }
  },
  setup (props: any) {
    function setBackgroundColor (color: string) {
      return `background-color: ${color};`
    }
    function setLineStyles (color: string, value: number) {
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
  height: 100%;
  display: grid;
  grid-template-columns: 100%;
  grid-auto-rows: 1fr auto;
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
  height: 4rem;
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
      font-size: 1.5rem;
      line-height: 100%;
      text-align: center;
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
    color: hsl(0, 0%, 0%);
    font-size: 1rem;
  }
}
</style>
