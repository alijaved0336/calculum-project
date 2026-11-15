<script setup lang="ts">
defineProps<{
  buyerTaxRateIsEmpty: boolean;
  buyerWaccIsEmpty: boolean;
}>();
</script>

<template>
  <div class="row">
    <div class="no-data-available">     <span class="text-base font-semibold text-gray-600">{{ $t('global.noDataAvailable') }}</span><span class="text-sm font-medium text-gray-500">{{ $t('home.entityCard.calculator.noDataAvailableDescription') }} </span>
      <div class="d-flex flex-column w-100 mt-4">
        <ul class="list-options">
          <li><span class="text-sm font-medium text-gray-500" v-if="buyerTaxRateIsEmpty">{{ $t('home.entityCard.calculator.noTaxRate') }} </span></li>
          <li> <span class="text-sm font-medium text-gray-500" v-if="buyerWaccIsEmpty">{{ $t('home.entityCard.calculator.noWacc') }}</span></li>
        </ul>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
@import "src/resources/assets/styles/variables/colors";

.no-data-available {
  display: flex;
  padding: 16px 24px;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
  flex: 1 0 0;
  align-self: stretch;
  border-radius: 8px;
  background: $color-gray-100;
}
</style>
