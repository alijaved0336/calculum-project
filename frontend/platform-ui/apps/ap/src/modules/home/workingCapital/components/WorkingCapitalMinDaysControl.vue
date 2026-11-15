<template>
  <div class="d-flex align-items-center wc-min-days">
    <span class="wc-min-days__label">{{ $t('home.workingCapital.minDaysControl.label') }}</span>
    <div class="wc-min-days__stepper">
      <button
        class="wc-min-days__btn"
        type="button"
        :disabled="modelValue <= 1"
        @click="$emit('decrement')"
      >−</button>
      <span class="wc-min-days__value">{{ modelValue }}</span>
      <button
        class="wc-min-days__btn"
        type="button"
        @click="$emit('increment')"
      >+</button>
    </div>
    <span class="wc-min-days__label">{{ $t('home.workingCapital.minDaysControl.unit') }}</span>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'

export default defineComponent({
  name: 'WorkingCapitalMinDaysControl',
  props: {
    modelValue: { type: Number, required: true },
  },
  emits: ['update:modelValue', 'increment', 'decrement'],
})
</script>

<style scoped lang="scss">
.wc-min-days {
  gap: 0.5rem;

  &__label {
    font-size: 0.8125rem;
    color: #344054;
    white-space: nowrap;
  }

  &__stepper {
    display: flex;
    align-items: center;
    border: 1px solid #d0d5dd;
    border-radius: 6px;
    overflow: hidden;
  }

  &__btn {
    width: 28px;
    height: 28px;
    border: none;
    background: #fff;
    font-size: 1rem;
    line-height: 1;
    color: #344054;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;

    &:disabled {
      color: #d0d5dd;
      cursor: not-allowed;
    }

    &:not(:disabled):hover {
      background: #f9fafb;
    }
  }

  &__value {
    min-width: 2rem;
    text-align: center;
    font-size: 0.875rem;
    font-weight: 500;
    color: #101828;
    border-left: 1px solid #d0d5dd;
    border-right: 1px solid #d0d5dd;
    padding: 0 0.375rem;
    line-height: 28px;
  }
}
</style>
