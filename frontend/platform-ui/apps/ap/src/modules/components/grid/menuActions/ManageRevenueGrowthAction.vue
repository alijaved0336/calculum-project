<template>
<div class="manage-revenue-growth-container">
  <div class="header-container"><span>{{ $t('home.entityCard.details.setRevenueGrowth') }}</span></div>
  <div class="input-group-container">
    <label class="input-label">{{ $t('home.entityCard.details.revenueY') }}</label>
    <input class="form-control" type="number" min="0" :placeholder="$t('home.entityCard.details.revenueYPlaceholder')" v-model.number="revenueY"/>
  </div>
  <div class="input-group-container">
    <label class="input-label">{{ $t('home.entityCard.details.revenueYMinus1') }}</label>
    <input class="form-control" type="number" min="0" :placeholder="$t('home.entityCard.details.revenueYMinus1Placeholder')" v-model.number="revenueYMinus1"/>
  </div>
  <div class="header-container-end">
    <button class="btn btn-sm outline-secondary-btn font-md btn-clear-action mr-2" @click="clear">{{ $t("global.clear") }}</button>
    <button class="btn btn-sm btn-primary font-md" @click="submit" :disabled="!canSubmit">{{ $t('global.save') }}</button>
  </div>
</div>
</template>

<script lang="ts">
import { defineComponent, ref, computed, onMounted, PropType } from "vue";

export default defineComponent({
  name: "ManageRevenueGrowthAction",
  props: {
    initialRevenueY: {
      type: [Number, String] as PropType<number | string | null>,
      default: null,
    },
    initialRevenueYMinus1: {
      type: [Number, String] as PropType<number | string | null>,
      default: null,
    },
  },
  emits: ["call-action"],
  setup(_, { emit }) {
    const revenueY = ref<number | string>("");
    const revenueYMinus1 = ref<number | string>("");

    const isValidRevenue = (v: number | string) => {
      if (v === "") return false;
      const n = Number(v);
      return !Number.isNaN(n) && n >= 0;
    };
    const initializeValues = () => {
      revenueY.value = _.initialRevenueY ?? "";
      revenueYMinus1.value = _.initialRevenueYMinus1 ?? "";
    };
    const canSubmit = computed(
      () =>
        isValidRevenue(revenueY.value) && isValidRevenue(revenueYMinus1.value),
    );

    const submit = () => {
      if (!canSubmit.value) return;
      emit("call-action", "supplierRevenueGrowth", true, {
        paramY: Number(revenueY.value),
        paramY1: Number(revenueYMinus1.value),
        removeGroup: false,
      });
    };

    const clear = () => {
      revenueY.value = "";
      revenueYMinus1.value = "";
      emit("call-action", "supplierRevenueGrowth", true, {
        paramY: null,
        paramY1: null,
        removeGroup: true,
      });
    };
    onMounted(() => {
      initializeValues();
    });
    return { revenueY, revenueYMinus1, canSubmit, submit, clear };
  },
});
</script>

<style scoped lang="scss">
@import "src/resources/assets/styles/variables/colors";
@import "src/resources/assets/styles/variables/dimensions";
@import "src/resources/assets/styles/variables/globals";
.manage-revenue-growth-container {
  position: relative;
  min-width: 260px;
}
.header-container {
  padding: 10px 14px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.input-group-container {
  padding: 6px 14px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.input-label {
  font-size: 0.75rem;
  color: $color-gray-500;
  margin-bottom: 0;
}
.header-container-end {
  padding: 10px 14px;
  border-radius: 8px;
  display: flex;
  align-items: end;
  justify-content: end;
}
</style>
