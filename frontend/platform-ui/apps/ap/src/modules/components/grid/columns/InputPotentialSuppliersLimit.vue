<template>
  <td class="text-center">
    <span v-if="!featureEnabled">-</span>
    <div v-else class="ps-limit-cell gap-2">
      <div class="limit-input-wrapper">
        <input
          v-model.number="limitValue"
          type="number"
          min="0"
          class="form-control limit-input"          
          @change="onLimitChanged"
        />
        <span class="limit-label">max</span>
      </div>
      <span class="usage-badge" :class="badgeClass">
        <svg class="usage-icon" viewBox="0 0 16 16" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
          <g v-if="status === 'success'">
            <path d="M7 14s-1 0-1-1 1-4 5-4 5 3 5 4-1 1-1 1zm4-6a3 3 0 1 0 0-6 3 3 0 0 0 0 6m-5.784 6A2.24 2.24 0 0 1 5 13c0-1.355.68-2.75 1.936-3.72A6.3 6.3 0 0 0 5 9c-4 0-5 3-5 4s1 1 1 1zM4.5 8a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5"/>
          </g>
          <g v-else-if="status === 'warning'">
            <path d="M7.938 2.016A.13.13 0 0 1 8.002 2a.13.13 0 0 1 .063.016.15.15 0 0 1 .054.057l6.857 11.667c.036.06.035.124.002.183a.2.2 0 0 1-.054.06.1.1 0 0 1-.066.017H1.146a.1.1 0 0 1-.066-.017.2.2 0 0 1-.054-.06.18.18 0 0 1 .002-.183L7.884 2.073a.15.15 0 0 1 .054-.057m1.044-.45a1.13 1.13 0 0 0-1.96 0L.165 13.233c-.457.778.091 1.767.98 1.767h13.713c.889 0 1.438-.99.98-1.767zM7.002 12a1 1 0 1 1 2 0 1 1 0 0 1-2 0M7.1 5.995a.905.905 0 1 1 1.8 0l-.35 3.507a.552.552 0 0 1-1.1 0z"/>
          </g>
          <g v-else>
            <path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0M5.354 4.646a.5.5 0 1 0-.708.708L7.293 8l-2.647 2.646a.5.5 0 0 0 .708.708L8 8.707l2.646 2.647a.5.5 0 0 0 .708-.708L8.707 8l2.647-2.646a.5.5 0 0 0-.708-.708L8 7.293z"/>
          </g>
        </svg>
        {{ count }} of {{ limit ?? 0 }} used
      </span>
    </div>
  </td>
</template>

<script lang="ts">
import { computed, defineComponent, ref, watch } from "vue";

export default defineComponent({
  name: "InputPotentialSuppliersLimit",
  props: {
    dataItem: { type: Object, required: true },
    featureEnabled: { type: Boolean, required: true }
  },
  emits: ["limit-changed"],
  setup(props, { emit }) {
    const limitValue = ref<number | null>(props.dataItem.potentialSupplierRequestLimit ?? null);

    watch(
      () => props.dataItem.potentialSupplierRequestLimit,
      (newVal) => { limitValue.value = newVal ?? null; }
    );

    function onLimitChanged() {
      emit("limit-changed", props.dataItem, limitValue.value);
    }

    const limit = computed<number | null>(() => limitValue.value);
    const count = computed<number>(() => props.dataItem.potentialSupplierCount  ?? 0);

    const usagePct = computed(() => {
      if (!limit.value || limit.value === 0) return 0;
      return (count.value / limit.value) * 100;
    });

    const status = computed<"success" | "warning" | "error">(() => {
      if (usagePct.value >= 100) return "error";
      if (usagePct.value >= 70) return "warning";
      return "success";
    });

    const badgeClass = computed(() => `usage-badge--${status.value}`);

    return { limitValue, onLimitChanged, limit, count, status, badgeClass };
  }
});
</script>

<style lang="scss" scoped>
@import "src/resources/assets/styles/variables/_colors.scss";

.ps-limit-cell {
  display: flex;  
  align-items: center;  
}

.limit-input-wrapper {
  display: flex;
  align-items: center;
  gap: 6px;
}

.limit-input {  
  width: 100px;
  height: 32px;
  padding: 4px 8px;
  font-size: 0.875rem;
  text-align: left;

  &::-webkit-inner-spin-button,
  &::-webkit-outer-spin-button {
    opacity: 1;
  }
}

.limit-label {
  font-size: 0.8rem;
  color: #667085;
  white-space: nowrap;
}

.usage-badge {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 3px 10px;
  border-radius: 12px;
  font-size: 0.78rem;
  font-weight: 500;
  white-space: nowrap;

  &--success {
    background-color: $color-success-50;
    color: $color-success-700;
  }

  &--warning {
    background-color: $color-warning-50;
    color: $color-warning-700;
  }

  &--error {
    background-color: $color-error-50;
    color: $color-error-700;
  }
}

.usage-icon {
  width: 14px;
  height: 14px;
  flex-shrink: 0;
}
</style>
