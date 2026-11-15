<template>
<div class="label-topbar"><span>{{ $t("global.targetEqualTo") }}</span></div>
<div class="d-flex align-items-center item-container" v-for="radioOption in radioOptions" :key="radioOption.key" @click="selectAndApply(radioOption)"><span class="font-weight-500 cursor-pointer">{{ radioOption.label }}</span></div>
<div class="d-flex flex-column form-group align-items-center item-container">
  <label for="custom-input-target">
    <input class="form-control w-100" id="custom-input-target" v-model="setTargetValueControllerCustomModel" :disabled="setTargetTypeControllerModel.value !== 'custom'" type="number" min="1" max="365" @keyup="validateTargetValue"/><span class="custom-span">{{ $t("global.setTargetOptions.days") }}</span>
  </label>
  <div class="p-2 mt-0 mb-0" v-if="hasCustomTargetErrors"><span class="error">{{ $t("global.errors.errorDays") }}</span></div>
</div>
<div class="d-flex justify-content-center justify-content-end button-container-for-target item-container" v-if="setTargetTypeControllerModel.value === 'custom'">
  <button class="btn btn-primary font-md" id="save-target-bulk-btn" :disabled="setTargetTypeControllerModelBtn" style="z-index: 1; width: fit-content;" @click="callStoreMenuAction(option,true,false,{param:setTargetTypeControllerModel.key, param1: setTargetTypeControllerModelBtnSave})">{{ $t("global.save") }}</button>
</div>
</template>

<script lang="ts">
import { PropType, defineComponent, reactive, toRefs,computed } from "vue";
import { ActionFromEditProgram } from "@/modules/components/types";
import iconTrash from "@/resources/assets/images/icons/iconTrash.vue";
import { useI18n } from "vue-i18n";

interface TargetValues {
  setTargetTypeControllerModel: { key: string; value: string };
  setTargetValueControllerCustomModel: number;
  hasCustomTargetErrors: boolean;
}
export default defineComponent({
  name: "SetTargetAction",
  components: {
    iconTrash,
  },
  props: {
    option: {
      type: String as PropType<ActionFromEditProgram>,
      required: true,
    },
  },
  emits: ["call-action"],
  setup(props, { emit }) {
    const translate = useI18n({ warnHtmlMessage: false, useScope: 'global' });
    const radioOptions = [
      {
        key: "actualPaymentTerms",
        value: "actualPaymentTerms",
        label: translate.t("global.setTargetOptions.actualPaymentTerms"),
        name: translate.t("global.setTargetOptions.actualPaymentTerms"),
      },

      {
        key: "contractualPaymentTerms",
        value: "contractualPaymentTerms",
        label: translate.t("global.setTargetOptions.contractualPaymentTerms"),
        name: "Contractual Payment Terms",
      },
      {
        key: "paymentTermsOpportunity",
        value: "paymentTermsOpportunity",
        label: translate.t("global.setTargetOptions.paymentTermsOpportunity"),
        name: "Payment Terms Opportunity",
      },
      {
        key: "custom",
        value: "custom",
        label: translate.t("global.setTargetOptions.custom"),
        name: "Custom",
      },
    ];
    const targetValues = reactive<TargetValues>({
      setTargetTypeControllerModel: {
        key: "paymentTermsOpportunity",
        value: "paymentTermsOpportunity",
      },
      setTargetValueControllerCustomModel: 1,
      hasCustomTargetErrors: false,
    });
    function validateTargetValue() {
      const value = Number(targetValues.setTargetValueControllerCustomModel);

      // Check if value is NaN or not a whole number, or out of range
      if (
        isNaN(value) ||
        !Number.isInteger(value) ||
        value < 0 ||
        value > 365
      ) {
        targetValues.hasCustomTargetErrors = true;
      } else {
        targetValues.hasCustomTargetErrors = false;
      }
    }
    function applyTargetModelValues(key: string, value: string) {
      targetValues.setTargetTypeControllerModel.key = key;
      targetValues.setTargetTypeControllerModel.value = value;
    }
    function selectAndApply(radioOption: { key: string; value: string }) {
      applyTargetModelValues(radioOption.key, radioOption.value);
      if (radioOption.key !== "custom") {
        callStoreMenuAction(props.option, true, false, {
          param: radioOption.key,
          param1: radioOption.value,
        });
      }
    }
    function resetValueForTargetBulk() {
      targetValues.hasCustomTargetErrors = false
      targetValues.setTargetValueControllerCustomModel = 0
      callStoreMenuAction(props.option,true,true,null)
    }
    const callStoreMenuAction = (
      keyId: ActionFromEditProgram,
      isEmit: boolean,
      removeGroup: boolean,
      payload: any,
    ) => {
      const newPayload={...payload,removeGroup}
      emit("call-action", keyId, isEmit, newPayload);
    };
    const setTargetTypeControllerModelBtn = computed(() => {
      const condition1 =
        targetValues.setTargetTypeControllerModel.value !== "custom";
      const condition2 =
        targetValues.setTargetTypeControllerModel.value.length === 0;
      const condition3 =
        targetValues.setTargetTypeControllerModel.key.length === 0;
      const condition4 =
        targetValues.setTargetTypeControllerModel.value === "custom";
      return condition1 && (condition2 && condition3) || condition4 && targetValues.hasCustomTargetErrors
      
    });
    const setTargetTypeControllerModelBtnSave = computed(() => {
      const condition1 =
        targetValues.setTargetTypeControllerModel.value !== "custom";
      return condition1
        ? targetValues.setTargetTypeControllerModel.value
        : targetValues.setTargetValueControllerCustomModel;
    });
    return {
      ...toRefs(targetValues),
      callStoreMenuAction,
      radioOptions,
      validateTargetValue,
      applyTargetModelValues,
      selectAndApply,
      setTargetTypeControllerModelBtnSave,
      setTargetTypeControllerModelBtn,
      resetValueForTargetBulk,
    };
  },
});
</script>

<style scoped lang="scss">
@import "src/resources/assets/styles/variables/colors";
@import "src/resources/assets/styles/variables/dimensions";
.item-container {
  padding: 10px 14px;
  border-radius: 8px;

  span {
    font-size: 14px;
  }

  &:hover {
    background: $color-gray-100;

    .check-svg {
      color: $color-primary-500;
    }
  }
}
.label-topbar {
  padding: 10px 14px;
  border-radius: 8px;
  background: transparent !important;
  color: $color-gray-700;
  font-style: normal;
  font-weight: 500;
  font-size: 12px;
  &:hover {
    background: $color-gray-100;
  }
}
.trash_icon {
  color: $color-gray-700;
  width: 18px;
  height: 18px;
  margin-left: 10px;
}
.remove_group_main {
  background: transparent !important;
  color: $color-gray-400;
  font-style: normal;
  font-weight: 500;
  font-size: 12px;
}
.custom-span {
  margin-top: 10px;
  margin-left: 10px;
}
.button-container-for-target {
  gap: 1rem;
}
span.error {
  margin-top: 5px;
  color: $color-error-500;
  font-size: 12px;
  font-style: normal;
  font-weight: 400;
}
</style>
