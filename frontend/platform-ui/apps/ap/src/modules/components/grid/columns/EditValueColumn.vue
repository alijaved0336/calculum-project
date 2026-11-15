<template>
  <td :class="{ 'bg-blur': loadingData }">
    <input
      :id="`my-input-${behavior}-${dataItem.year}`"
      ref="inputRef"
      v-model="userInputValuePresentation"
      type="text"
      class="form-control change-values"
      @focus="showRawValue"
      @blur="handleBlur"
      @keyup.enter="handleBlurOrEnter"
      @input="debouncedHandleInput"
      @mouseenter="focusAtEnd"
      @mouseleave="inputRef?.blur()"
    />
  </td>
</template>

<script lang="ts">
import { defineComponent, ref, watch, nextTick } from "vue";
import { useFinancingDataCompaniesStore } from "@/stores/financingDataCompanies";
import { StringUtils } from "@/utils";
import { useToast } from "vue-toastification";
import { useI18n } from "vue-i18n";
import { useUser } from "@/composables";
import * as formatData from '@/utils/FormatData'

const FORMATTED_BEHAVIORS = new Set(["inventory", "tradeReceivable", "tradePayable", "totalRevenue", "costOfGoods"]);

const TIME_METRIC_RANGE = {
  min: 0,
  max: 365,
  integerOnly: true,
  invalidMessageKey: "home.homeFinancialData.notifications.error.invalidValue0To365",
  nanShowsError: true,
};

const LARGE_POSITIVE_RANGE = {
  min: 0,
  max: 1000000000000,
  invalidMessageKey: "home.homeFinancialData.notifications.error.invalidValue0ToTril",
  nanShowsError: false,
};

const BEHAVIOR_RANGE_CONFIG: Record<string, { min: number; max: number; integerOnly?: boolean; invalidMessageKey: string; nanShowsError: boolean }> = {
  c2c: TIME_METRIC_RANGE,
  dpo: TIME_METRIC_RANGE,
  dio: TIME_METRIC_RANGE,
  dso: TIME_METRIC_RANGE,
  costOfGoods: {
    min: -1000000000000,
    max: 0,
    invalidMessageKey: "home.homeFinancialData.notifications.error.invalidValue0ToTrilNegative",
    nanShowsError: false,
  },
  inventory: LARGE_POSITIVE_RANGE,
  tradeReceivable: LARGE_POSITIVE_RANGE,
  tradePayable: LARGE_POSITIVE_RANGE,
  totalRevenue: LARGE_POSITIVE_RANGE,
};

function parseLocaleNumber(str: string): number {
  const { decimalSymbol, groupingSymbol } = formatData.getFormattingInfoForGoogleChart();
  const cleaned = str
    .replace(new RegExp('\\' + groupingSymbol, 'g'), '')
    .replace(decimalSymbol, '.');
  return parseFloat(cleaned);
}

export default defineComponent({
  name: "EditValueColumn",
  props: {
    dataItem: { type: Object, required: true },
    behavior: { type: String, required: true }
  },
  emits: ["value-changed"],
  setup(props, { emit }) {
    const financingDataCompaniesStore = useFinancingDataCompaniesStore();
    const translate = useI18n({ warnHtmlMessage: false, useScope: 'global' });
    const { userSessionActiveCompany } = useUser();
    const toggleEditMode = ref(false);
    const hasErrors = ref(false);
    const inputRef = ref<HTMLInputElement | null>(null);
    const loadingData = ref(false);
    const toast = useToast();

    function getRawValue(): number | null {
      switch (props.behavior) {
        case "year":            return props.dataItem.year ?? null;
        case "dpo":             return props.dataItem.DPOValue ?? null;
        case "dio":             return props.dataItem.DIOValue ?? null;
        case "dso":             return props.dataItem.DSOValue ?? null;
        case "c2c":             return props.dataItem.C2CValue ?? null;
        case "inventory":       return props.dataItem.INVValue ?? null;
        case "tradeReceivable": return props.dataItem.TRADE_RECEIVABLEValue ?? null;
        case "tradePayable":    return props.dataItem.TRADE_PAYABLEValue ?? null;
        case "totalRevenue":    return props.dataItem.TOTAL_REVENUEValue ?? null;
        case "costOfGoods":     return props.dataItem.COST_OF_GOODValue ?? null;
        default:                return null;
      }
    }

    function formatForDisplay(val: number | null): string {
      if (val == null) return '';
      return FORMATTED_BEHAVIORS.has(props.behavior)
        ? formatData.getNumberWithDecimals(val, 1)
        : String(val);
    }

    const userInputValue = ref<number | null>(getRawValue());
    const userInputValuePresentation = ref<string>(formatForDisplay(getRawValue()));
    const initialInputValue = ref<number | null>(getRawValue());

    watch(
      () => props.dataItem,
      () => {
        userInputValue.value = getRawValue();
      },
      { deep: true }
    );

    watch(userInputValue, (newVal) => {
      const isInputFocused = inputRef.value === document.activeElement;
      userInputValuePresentation.value = newVal != null
        ? isInputFocused
          ? String(newVal)
          : formatForDisplay(newVal)
        : '';
    });

    let inputDebounceTimer: ReturnType<typeof setTimeout> | null = null;

    function debouncedHandleInput() {
      if (inputDebounceTimer) clearTimeout(inputDebounceTimer);
      inputDebounceTimer = setTimeout(() => {
        handleBlurOrEnter();
      }, 600);
    }

    function handleBlurOrEnter() {
      if (inputDebounceTimer) {
        clearTimeout(inputDebounceTimer);
        inputDebounceTimer = null;
      }

      if (userInputValuePresentation.value === "") {
        userInputValue.value = null;
      } else {
        userInputValue.value = parseLocaleNumber(userInputValuePresentation.value);
      }

      if (userInputValue.value !== initialInputValue.value) {
        checkValue();
      }
    }

    function handleBlur() {
      handleBlurOrEnter();
      userInputValuePresentation.value = formatForDisplay(userInputValue.value);
    }

    function showRawValue() {
      userInputValuePresentation.value = userInputValue.value != null ? String(userInputValue.value) : '';
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

    function validateNumericRange(value: number, config: typeof BEHAVIOR_RANGE_CONFIG[string]): 'valid' | 'invalid' | 'abort' {
      if (Number.isNaN(value)) {
        userInputValue.value = initialInputValue.value;
        if (config.nanShowsError) {
          hasErrors.value = true;
          toast.error(translate.t("home.homeFinancialData.notifications.error.InvalidValue"));
        }
        return 'abort';
      }

      const outOfRange = value < config.min || value > config.max || (config.integerOnly && !Number.isInteger(value));
      if (outOfRange) {
        userInputValue.value = initialInputValue.value;
        hasErrors.value = true;
        toast.error(translate.t(config.invalidMessageKey));
        return 'invalid';
      }

      return 'valid';
    }

    function checkValue() {
      if (userInputValue.value === null) {
        updateValues();
        return;
      }

      const config = BEHAVIOR_RANGE_CONFIG[props.behavior];
      const result = config ? validateNumericRange(userInputValue.value, config) : 'valid';

      if (result === 'valid' && userInputValue.value !== initialInputValue.value) {
        updateValues();
      }
    }

    function updateValues() {
      loadingData.value = true;
      const params = {
        companyUuid: StringUtils.removeIRI(
          userSessionActiveCompany.value?.["@id"]
        ),
        valueObj: {
          value: userInputValue.value,
          behavior: props.behavior,
          year: props.dataItem.year
        },
        callbackSuccess: () => {
          emit("value-changed", {
            id: props.dataItem.id,
            behavior: props.behavior,
            newValue: userInputValue.value,
            year: props.dataItem.year
          });
          loadingData.value = false;
          initialInputValue.value = userInputValue.value ?? null;
          userInputValuePresentation.value = formatForDisplay(userInputValue.value);
        },
        callbackError: () => {
          toast.error(translate.t(
            "home.homeFinancialData.notifications.error.updatedValueError"
          ));
          loadingData.value = false;
          userInputValue.value = initialInputValue.value;
        }
      };

      financingDataCompaniesStore.updateValues(params);
    }

    return {
      checkValue,
      hasErrors,
      handleBlurOrEnter,
      handleBlur,
      showRawValue,
      focusAtEnd,
      debouncedHandleInput,
      toggleEditMode,
      userInputValue,
      inputRef,
      loadingData,
      userInputValuePresentation,
    };
  }
});
</script>

<style scoped>
input.form-control.change-values {
  border: none;
  background-color: transparent;
}

input.form-control.change-values:hover {
  border: 1px solid black;
  padding: 5px 10px;
  background-color: white;
}

input.form-control.change-values:focus {
  border: 1px solid black;
  padding: 5px 10px;
  background-color: white;
}
</style>
