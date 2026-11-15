<template>
<div class="manage-dso-container">
  <div class="header-container"><span>{{ $t('home.entityCard.details.setDso') }}</span></div>
  <div class="header-container">
    <input class="form-control" type="number" min="0" step="1" max="365" :placeholder="$t('home.entityCard.details.dsoPlaceholder')" v-model.number="dsoValue" @keyup.enter="submit"/>
  </div>
  <div class="error-container" v-if="validationError"><span class="error-text">{{ validationError }}</span></div>
  <div class="header-container-end">
    <button class="btn btn-sm outline-secondary-btn font-md btn-clear-action mr-2" @click="clear">{{ $t("global.clear") }}</button>
    <button class="btn btn-sm btn-primary font-md" @click="submit" :disabled="!canSubmit">{{ $t('global.save') }}</button>
  </div>
</div>
</template>

<script lang="ts">
import { PropType, defineComponent, ref, computed, onMounted } from "vue";
import { ActionFromEditProgram } from "@/modules/components/types";

export default defineComponent({
  name: "ManageDSOAction",
  props: {
    option: {
      type: String as PropType<ActionFromEditProgram>,
      required: true,
    },
    initialDso: {
      type: Number as PropType<number | null>,
      default: null,
    },
  },
  emits: ["call-action"],
  setup(props, { emit }) {
    const dsoValue = ref<number | string>("");

    onMounted(() => {
      dsoValue.value = props.initialDso ?? "";
    });

    const validationError = computed(() => {
      if (dsoValue.value === "") return null;
      const n = Number(dsoValue.value);
      if (Number.isNaN(n)) return null;
      if (n < 0) return "Value must be 0 or greater";
      if (n > 365) return "Value must be 365 or less";
      return null;
    });

    const canSubmit = computed(() => {
      if (dsoValue.value === "") return false;
      const n = Number(dsoValue.value);
      return !Number.isNaN(n) && n >= 0 && n <= 365 && Number.isInteger(n);
    });

    const submit = () => {
      if (!canSubmit.value) return;
      emit("call-action", props.option, true, { param: Number(dsoValue.value), removeGroup: false });
    };

    const clear = () => {
      dsoValue.value = "";
      emit("call-action", props.option, true, { param: null, removeGroup: true });
    };

    return { dsoValue, canSubmit, validationError, submit, clear };
  },
});
</script>

<style scoped lang="scss">
@import "src/resources/assets/styles/variables/colors";
@import "src/resources/assets/styles/variables/dimensions";
@import "src/resources/assets/styles/variables/globals";
.manage-dso-container {
  position: relative;
  min-width: 240px;
}
.header-container {
  padding: 10px 14px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.error-container {
  padding: 0 14px 4px;
  .error-text {
    color: $color-error-500;
    font-size: 12px;
  }
}
.header-container-end {
  padding: 10px 14px;
  border-radius: 8px;
  display: flex;
  align-items: end;
  justify-content: end;
}
</style>
