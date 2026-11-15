<template>
<div class="big-number">
  <div class="big-number__value">{{ valueToDisplay }}</div>
  <div class="big-number__label" v-if="color && description">
    <div class="big-number__label-circle" :style="'background-color:' + color + ';'"></div><span class="big-number__label-description font-semibold text-sm text-gray-500">{{ description }}</span><span class="font-semibold text-sm text-gray-500" v-if="procentOfTotalDescription"><span class="font-medium text-sm text-gray-500" v-if="!isRange">{{ procentOfValue }}</span><span class="font-medium text-sm text-gray-500" v-else>{{ procentOfTotalDescription }}</span></span>
  </div>
</div>
</template>

<script lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

export default {
  name: 'CalculumBigNumber',
  props: {
    color: { type: String, required: false, default: '' },
    description: { type: String, required: false, default: '' },
    procentOfTotalDescription: { type: String, required: false, default: '' },
    realValue: { type: Number, required: true, default: 0 },
    maxValue: { type: Number, required: true, default: 0 },
    lang: { type: String, required: false, default: 'en-US' },
    isRange: { type: Boolean, required: false, default: false}
  },
  setup(props: any) {
    const translate = useI18n({ warnHtmlMessage: false, useScope: 'global' })

    const format = computed(() => {
      return Math.abs(props.realValue) > 1.0e+21
        ? { divider: 1.0e+21, char: 's' } 
        : Math.abs(props.realValue) > 1.0e+18
          ? { divider: 1.0e+18, char: 'i' }
          : Math.abs(props.realValue) > 1.0e+15
            ? { divider: 1.0e+15, char: 'q' }
            : Math.abs(props.realValue) > 1.0e+12
              ? { divider: 1.0e+12, char: 't' }
              : Math.abs(props.realValue) > 1.0e+9
                ? { divider: 1.0e+9, char: 'b' }
                : Math.abs(props.realValue) > 1.0e+6
                  ? { divider: 1.0e+6, char: 'm' }
                  : Math.abs(props.realValue) > 1.0e+3
                    ? { divider: 1.0e+3, char: 'k' }
                    : { divider: 1, char: '' }
    })

    const valueToDisplay = computed(() => {
      return (props.realValue / format.value.divider).toLocaleString(props.lang, { maximumFractionDigits: 1, minimumFractionDigits: 1 }) + format.value.char
    })

    const procentOfValue = computed(() => {
      return props.maxValue === 0
        ? 0 + translate.t(`${props.procentOfTotalDescription}`)
        : (props.realValue * 100 / props.maxValue) < 0.01
            ? '< ' + 0.01 + translate.t(`${props.procentOfTotalDescription}`)
            : (props.realValue * 100 / props.maxValue).toLocaleString(props.lang, { maximumFractionDigits: 2 }) + translate.t(`${props.procentOfTotalDescription}`)
    })

    return {
      procentOfValue,
      valueToDisplay
    }
  }
}
</script>

<style scoped lang="scss">
.big-number {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
}
.big-number__value {
  color: #344054;
  flex-grow: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 5vw;
  letter-spacing: -0.05em;
}
.big-number__label {
  display: flex;
  flex-wrap: nowrap;
  align-items: flex-start;
  gap: 0.5rem;

  &-circle {
    flex-shrink: 0;
    width: 1.25rem;
    aspect-ratio: 1 / 1;
    border-radius: 50%;
  }

  &-description {
    white-space: nowrap;
    font-weight: 600 !important;
  }
}

</style>
