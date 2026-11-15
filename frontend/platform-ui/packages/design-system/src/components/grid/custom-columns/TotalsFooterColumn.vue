<template>
    <SkeletonRectangle v-if="loadingData" size="sm" />
    <div v-if="!loadingData && showValueByField !== null" class="footer-totals" :class="defineClassAligment">
      <span>{{ $t('global.totalColumnLabels.'+effectiveBehavior.replace(/\./g, "")) }}: </span>
      <span>{{ showValueByField }}</span>
    </div>
</template>

<script lang='ts'>
import { defineComponent, computed, type PropType } from 'vue'
import { getNestedValue } from '@progress/kendo-vue-grid'
import { getNumberWithDecimals } from '../../../utils'
import SkeletonRectangle from '../../skeletons/SkeletonRectangle.vue'
import type { TotalsFooterAnalyzeStore } from './types'

export default defineComponent({
  name: 'TotalsFooterColumn',
  components: {
    SkeletonRectangle
  },
  props: {
    field: { type: String, required: true },
    dataSet: { type: Object, required: true },
    loadingData: { type: Boolean, required: true, default: true },
    behavior: { type: String, required: true, default: 'sum' },
    // Host app's analyze store (AP: useAnalyzeStore(), AR: its own equivalent) - passed in
    // rather than imported directly so this component doesn't depend on a specific app's Pinia store.
    analyzeStore: { type: Object as PropType<TotalsFooterAnalyzeStore>, required: true },
    // Per-user number-formatting locale (e.g. from the host app's user store). Defaults
    // to "en-US" for hosts with no such preference.
    locale: { type: String, required: false, default: "en-US" }
  },
  setup( props ){

    // A `days` custom data point aggregates as weighted avg (ceil), not sum. The column footerCell
    // template feeds behavior='sum', so override it here by type. Keeps label and bucket lookup aligned.
    const effectiveBehavior = computed(() => {
      if (props.field.startsWith('customDataPoint')) {
        const type = props.analyzeStore.customDataPointTypes[props.field] ?? 'number'
        if (type === 'days') return 'avg.weighted.ceil'
      }
      return props.behavior
    })

    const showValueByField = computed(() => {

      if (props.dataSet == null || props.dataSet.length <= 0) {
        return null
      }

      const getData = props.dataSet[effectiveBehavior.value]
      const getValue = getNestedValue(props.field, getData)

      if (getValue) {

        if (props.field.startsWith('customDataPoint')) {
          const type = props.analyzeStore.customDataPointTypes[props.field] ?? 'number'
          return type === 'days'
            ? getNumberWithDecimals(getValue, 0, props.locale)
            : getNumberWithDecimals(getValue, 1, props.locale)
        }

        switch (props.field) {
          case 'volume':
          case 'capturedCashDiscount':
          case 'capturedCashDiscounts':
          case 'vCardCashFlowGainFull':
          case 'vCardCashFlowEpFull':
          case 'vCardRebateFull':
          case 'vCardRebateEpFull':
          case 'vCardTotalEconomicProfitFull':
          case 'modelCashFlow':
          case 'targetCashFlow':
          case 'cashFlowContribution':
          case 'agreedCashFlow':
          case 'outstanding':
          case 'vCardRebate':
          case 'forecastValue':
          case 'forecastVolume':
            //- Money format
            return getValue ? getNumberWithDecimals(getValue, 1, props.locale) : '-'
          case 'spendCounts':
          case 'supplierCounts':
          case 'isSME':
          case 'isVCardApplied':
          case 'entityEthnicMinorityOwnedBusiness':
          case 'entityWomanOwnedBusiness':
          case 'entityVeteranOwnedBusiness':
            return getValue ? getNumberWithDecimals(getValue, 0, props.locale) : '-'
          default:
            //- Normal number format
            return getValue
        }
      }

      return null

    })

    const defineClassAligment = computed(() => {
      return 'text-right'
    })


    return {
      showValueByField,
      defineClassAligment,
      effectiveBehavior
    }

  }

})

</script>

<style scoped>

.footer-totals {
  width: 100%;
  display: block;
  white-space: nowrap;
}

</style>
