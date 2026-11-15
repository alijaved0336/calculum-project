<template>
<table class="table table-borderless">
  <thead>
    <tr>
      <th class="text-center" scope="col"> </th>
      <th class="text-center" scope="col">Current</th>
      <th class="text-center" scope="col">Target</th>
      <th class="text-center with-scf-bg" scope="col">With SCF</th>
    </tr>
  </thead>
  <tbody>
    <tr v-for="(item, index) in data" :key="item.name">
      <th scope="row"> <span class="font-semibold text-gray-700 text-xl">{{ $t('global.supplierImpactTable.' + item.name) }}</span></th>
      <td class="text-center"><span class="font-semibold text-gray-700 text-xl">{{ setFormatByType(item.name, item.current) }}</span></td>
      <td class="text-center"><span class="font-semibold text-gray-700 text-xl">{{ setFormatByType(item.name, item.target) }}</span></td>
      <td class="text-center with-bg-gray-50" :class="(index === data.length - 1 ? ' with-scf-bg-border' : '')"><span class="font-semibold text-gray-700 text-xl">{{ setFormatByType(item.name, item.withScf) }}</span></td>
    </tr>
  </tbody>
</table>
</template>

<script lang="ts">
import { defineComponent, type PropType } from 'vue';
import {  
  StringUtils
} from "@/utils";

import type { SupplierImpactTable } from '@/modules/home/entityCard/types';

const NUMERIC_FORMATTERS: Record<string, (value: number) => string> = {
  supplierReceivables: StringUtils.formatBigNumbers,
  cashFlowImpact: StringUtils.formatBigNumbers,
  financingCost: StringUtils.formatPercentage,
  costImpact: StringUtils.formatBigNumbers,
  economicProfit: StringUtils.formatBigNumbers,
}

function setFormatByType(type: String, value: string | number) {
  const formatter = NUMERIC_FORMATTERS[type as string]

  if (type !== 'paymentTerm' && !formatter) {
    return value
  }

  if (StringUtils.isNullUndefinedOrEmpty(value)) {
    return '-'
  }

  return formatter ? formatter(value as number) : value
}

export default defineComponent({
  name: 'SupplierImpactTable',
  props: {
    data: {
      type: Array as PropType<SupplierImpactTable['data']>,
      required: true
    }
  },
  setup(props: any) {
    return {
      StringUtils,
      setFormatByType
    }
  }
})
</script>

<style scoped lang="scss">

@import "src/resources/assets/styles/variables/_colors";

.with-scf-bg {
  background-color: #2244DD;
  color: $color-white;
  border-radius: 8px 8px 0px 0px;
}


.with-bg-gray-50 {
  background-color: $color-gray-50;
  color: $color-gray-700;
}

.with-scf-bg-border {
  border-radius: 0px 0px 8px 8px;
}

</style>