<template>
  <div class="py-4 px-6">
    <slot name="header"></slot>

    <div class="row mb-10 mt-2">
      <div class="col-12">
        <RangeSlider
          :class="'default-range-slider'"
          @change="sliderChanged"
          :default-value="minMaxValues"
          :max="maxValue"
          :min="minValue"
          :value="minMaxSelectedValues"
          class="range-slider"
        >
          <!-- In the future we can do the formatting outside the component -->
          <SliderLabel
            v-for="(item, index) in items"
            :position="item.key"
            :key="index"
          >
            {{ item.value }}
          </SliderLabel>
        </RangeSlider>
      </div>
    </div>

    <!-- Min and Max Values -->
    <div class="row mt-2">
      <div class="col-12 d-flex justify-content-between">
        <!-- Numeric TextBox for Min Value -->
        <div class="d-flex align-items-baseline">
          <span class="mr-2 text-gray-600 text-sm font-semibold"
            >{{ $t("global.minValue") }}
          </span>

          <NumericTextBox
            @change="setNumericTextBoxMinValue"
            :format="'n0'"
            :max="maxValue"
            :min="minValue"
            :style="{ width: '140px' }"
            :value="minMaxSelectedValues.start"
          >
          </NumericTextBox>
        </div>

        <!-- Numeric TextBox for Max Value -->
        <div class="d-flex align-items-baseline ml-2">
          <span class="mr-2 text-gray-600 text-sm font-semibold">{{
            $t("global.maxValue")
          }}</span>

          <NumericTextBox
            @change="setNumericTextBoxMaxValue"
            :format="'n0'"
            :max="maxValue"
            :min="minValue"
            :style="{ width: '140px' }"
            :value="minMaxSelectedValues.end"
          >
          </NumericTextBox>
        </div>
      </div>
    </div>

    <slot name="footer"></slot>
  </div>
</template>

<script lang="ts">
import { computed, defineComponent, reactive, ref, toRefs, watch } from 'vue';

// Types
import type { PropType } from 'vue'
import type { KeyValue } from '@/types'

import { RangeSlider, SliderLabel, NumericTextBox, RangeSliderChangeEvent, NumericTextBoxChangeEvent } from '@progress/kendo-vue-inputs'
import { NumberUtils } from '@/utils';

export default defineComponent({
  name: 'RangeSliderKendo',
  components: {
    NumericTextBox,
    RangeSlider,
    SliderLabel,
  },
  props: {
    items: {
      type: Object as PropType<KeyValue<number, string>[]>,
      required: false,
      default: () => { }
    },
    minValue: {
      type: Number,
      default: -1
    },
    minValueSelected: {
      type: Number,
      default: -1
    },
    maxValue: {
      type: Number,
      default: -1
    },
    maxValueSelected: {
      type: Number,
      default: -1
    }
  },
  emits: [
    'min-max-selected-values-changed',
    'include-exclude-null'
  ],
  setup(props, { emit }) {
    const data = reactive({
      excludeNull: false,
    });

    const minMaxValues = computed(() => {
      return {
        start: props.minValue,
        end: props.maxValue
      }
    })

    const minMaxSelectedValues = ref({
      start: NumberUtils.toInteger(props.minValueSelected),
      end: NumberUtils.toInteger(props.maxValueSelected)
    })

    watch(minMaxSelectedValues, () => {
      emit('min-max-selected-values-changed', minMaxSelectedValues.value)
    })

    /**
     * Changes the values for the range slider
     *
     * @param event {min: number, max: number, step: number, value: {start: number, end: number}}
     * @returns {void}
     */
    function sliderChanged(event: RangeSliderChangeEvent): void {
      let start = NumberUtils.toInteger(event.value.start);
      let end = NumberUtils.toInteger(event.value.end);

      minMaxSelectedValues.value = {
        start,
        end
      };
    }

    // *** Numeric Text Box ***

    /**
     * Sets the min value for the input number box and the range min slider
     *
     * @param e
     * @returns {void}
     */
    function setNumericTextBoxMinValue(e: NumericTextBoxChangeEvent): void {
      const newValue = e.value;

      // Validate
      if (newValue === null) {
        return;
      }

      minMaxSelectedValues.value = {
        start: NumberUtils.toInteger(newValue),
        end: NumberUtils.toInteger(minMaxSelectedValues.value.end)
      };
    }

    /**
     * Sets the max value for the input number box and the range max slider
     *
     * @param e
     * @returns {void}
     */
    function setNumericTextBoxMaxValue(e: NumericTextBoxChangeEvent): void {
      const newValue = e.value;

      // Validate
      if (newValue === null) {
        return;
      }

      minMaxSelectedValues.value = {
        start: NumberUtils.toInteger(minMaxSelectedValues.value.start),
        end: NumberUtils.toInteger(newValue)
      }
    }

    // *** END Numeric Text Box ***

    return {
      ...toRefs(data),
      setNumericTextBoxMaxValue,
      setNumericTextBoxMinValue,
      minMaxValues,
      minMaxSelectedValues,
      sliderChanged,
    };
  },
})
</script>

<style lang="scss" scoped>
@import "src/resources/assets/styles/variables/colors";

.range-slider {
  width: 100%;

  .k-label {
    color: $color-gray-600 !important;
    font-weight: 400 !important;
    font-size: 12px !important;
  }
}
</style>
