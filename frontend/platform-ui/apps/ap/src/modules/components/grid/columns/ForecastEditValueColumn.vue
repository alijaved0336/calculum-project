<template>
  <td :class="{ 'bg-blur': loadingData }" class="fore-cast-edit">
    <input
      :id="`my-input-${dataItem.uuid}`"
      ref="inputRef"
      v-model="userInputValuePresentation"
      type="text"
      class="form-control change-values"
      @focus="showRawValue"
      @blur="handleBlur"
      @keyup.enter="handleBlurOrEnter"      
      @mouseenter="focusAtEnd"
      @mouseleave="inputRef?.blur()"
      @input="debouncedHandleInput"
    />
  </td>
</template>

<script lang="ts">
import { defineComponent, ref, watch, computed, nextTick } from "vue";
import * as formatData from '@/utils/FormatData'

export default defineComponent({
  name: "ForecastEditValueColumn",
  props: {
    dataItem: { type: Object, required: true }
  },
  emits: ["value-changed"],
  setup(props, { emit }) {
    
    const toggleEditMode = ref(false);
    const hasErrors = ref(false);
    

    const inputRef = ref<HTMLInputElement | null>(null);
    const loadingData = ref(false);

    const getNumericValue = computed(() => {
      const val = props.dataItem.forecastValue;
      return val !== null ? Number(val) : null;
    });

    function getValueBasedOnBehavior() {
      return formatData.getNumberWithDecimals(props.dataItem.forecastValue, 1);
    }

    const toOneDecimal = (val: number | null): number | null =>
      val != null ? Math.round(val * 10) / 10 : null;

    const userInputValue = ref<number | null>(toOneDecimal(getNumericValue.value ?? null));
    const userInputValuePresentation = ref<string>(getValueBasedOnBehavior() ?? '');

    const initialInputValue = computed(() => {
      return getNumericValue.value ?? null;
    });

    watch(
      () => props.dataItem,
      () => {
        userInputValue.value = toOneDecimal(getNumericValue.value);
      },
      { deep: true }
    );

    watch(userInputValue, (newVal) => {
      // AB#20354: while the cell has focus, leave exactly what the user typed.
      // Reformatting here was injecting grouping separators mid-typing.
      if (inputRef.value === document.activeElement) return;
      userInputValuePresentation.value = newVal != null
        ? formatData.getNumberWithDecimals(newVal, 1)
        : '';
    });

    let inputDebounceTimer: ReturnType<typeof setTimeout> | null = null;

    function debouncedHandleInput() {
      if (inputDebounceTimer) clearTimeout(inputDebounceTimer);
      inputDebounceTimer = setTimeout(() => {
        handleBlurOrEnter();
      }, 600);
    }

    function parseLocaleNumber(str: string): number {
      const { decimalSymbol, groupingSymbol } = formatData.getFormattingInfoForGoogleChart();
      const cleaned = str
        .replace(new RegExp('\\' + groupingSymbol, 'g'), '')
        .replace(decimalSymbol, '.');
      return parseFloat(cleaned);
    }

    function handleBlurOrEnter() {
      if (inputDebounceTimer) {
        clearTimeout(inputDebounceTimer);
        inputDebounceTimer = null;
      }

      if (userInputValuePresentation.value === "") {
        userInputValue.value = null
      } else {
        userInputValue.value = toOneDecimal(parseLocaleNumber(userInputValuePresentation.value));
      }

      if (userInputValue.value !== initialInputValue.value) {
        checkValue();
      }
    }

    function handleBlur() {
      handleBlurOrEnter();
      userInputValuePresentation.value = userInputValue.value != null
        ? formatData.getNumberWithDecimals(userInputValue.value, 1)
        : '';
    }

    function checkValue() {
      if (userInputValue.value !== null) {
        updateValues();
        return;
      }

      let valueIsValid = true;

      if (valueIsValid) {
        if (userInputValue.value !== initialInputValue.value) {
          updateValues();
        }
      }
    }

    function updateValues() {
      emit("value-changed", {
        uuid: props.dataItem.uuid,        
        forecastValue: userInputValue.value
      });
    }

    function showRawValue() {
      userInputValuePresentation.value = userInputValue.value != null ? userInputValue.value.toFixed(1) : '';
    }

    function focusAtEnd() {
      const el = inputRef.value;
      if (!el) return;
      showRawValue();
      el.focus();
      nextTick(() => {
        if (!inputRef.value) return;
        const len = inputRef.value.value.length;
        inputRef.value.setSelectionRange(len, len);
      });
    }

    function changeformatValue() {

      if (userInputValuePresentation.value === "") {
        if (initialInputValue.value === null) {
          userInputValuePresentation.value = ""
          return
        }
        userInputValuePresentation.value = formatData.getNumberWithDecimals( initialInputValue.value, 1)
        return
      }

      userInputValue.value = Math.round(parseLocaleNumber(userInputValuePresentation.value) * 10) / 10;
      userInputValuePresentation.value = formatData.getNumberWithDecimals(userInputValue.value, 1)
    }

    return {
      checkValue,
      hasErrors,
      handleBlurOrEnter,
      toggleEditMode,
      userInputValue,
      inputRef,
      loadingData,
      userInputValuePresentation,
      changeformatValue,
      focusAtEnd,
      showRawValue,
      handleBlur,
      debouncedHandleInput
    };
  }
});
</script>

<style scoped>
input.form-control.change-values {
  border: none;
  border-bottom: 2px dashed #9c0bfe ;
  background-color: transparent;
  cursor: text;
  text-align: right;
  transition: border-color 0.2s;
}

input.form-control.change-values:hover {
  border: none;
  border-bottom: 2px solid #4a90d9;
  padding: 5px 10px;
  background-color: white;
}

input.form-control.change-values:focus {
  border: none;
  border-bottom: 2px solid #4a90d9;
  padding: 5px 10px;
  background-color: white;
  outline: none;
}

.fore-cast-edit {
  background: #d9d2e9;
}

</style>
