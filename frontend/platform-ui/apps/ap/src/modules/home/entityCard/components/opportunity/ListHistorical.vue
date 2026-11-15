<template>
<div class="list-historical">
  <CalculumGridGraphql :gridData="gridData" :gridColumns="gridColumns" :filter="filter" :sort="sort" :section="section" :total="total" :skip="0" :take="gridData.length" :defaultPageSize="gridData.length" :enabledPagination="false" :showToolbar="false" :title="''" :gridHeight="gridHeight" :sortable="true" :columnMenu="true" :hideColumnSelector="true" @dataChange="onDataChange"></CalculumGridGraphql>
</div>
</template>

<script lang="ts">
import { defineComponent, ref, computed } from 'vue'
import type { SortDescriptor } from '@progress/kendo-data-query'
import CalculumGridGraphql from '@/modules/components/grid/CalculumGridGraphql.vue'
import { columnsListHistorical } from '@/modules/home/entityCard/data/columns'
import { useUserStore } from '@/stores/user'

export interface HistoricalRecord {
  contractualPayment: number | string
  avgDaysPaid: number | string
  contractualWithDiscount: number | string
  discount: number | string
  description: string
  dateOfAgreement: string
  effectiveDate: string
  source: string
  sourceReference: string | null
  ptStatus: string
  recentlyAgreed: number
  spendVolume: number | string
  achievedCashFlow: number | string
}

export default defineComponent({
  name: 'ListHistorical',
  components: {
    CalculumGridGraphql,
  },
  props: {
    /** Data from getPaymentTermsVolumeHistory API (table array mapped to HistoricalRecord[]) */
    historicalData: { type: Array as () => HistoricalRecord[], default: () => [] },
  },
  setup(props) {
    const userStore = useUserStore()
    const hideAverageDaysPaid = computed(() => userStore.getHideAverageDaysPaid)

    const section = ref('entityCard')
    const filter = ref([])
    const sort = ref<SortDescriptor[]>([])

    const gridColumns = computed(() =>
      columnsListHistorical.map(col =>
        col.field === 'avgDaysPaid' ? { ...col, hidden: hideAverageDaysPaid.value } : col
      )
    )
    const gridData = computed(() => props.historicalData ?? [])
    const total = computed(() => gridData.value.length)
    const gridHeight = ref('400px')

    function onDataChange(newFilter?: unknown, newSort?: SortDescriptor[]): void {
      if (newFilter !== undefined) filter.value = newFilter as []
      if (newSort !== undefined) sort.value = newSort
    }

    return {
      gridColumns,
      gridData,
      filter,
      sort,
      section,
      total,
      gridHeight,
      onDataChange,
    }
  },
})
</script>

<style scoped>
.list-historical {
  width: 100%;
}

:deep(.historical-grid-header-blue) {
  background-color: #1e293b;
  color: #ffffff;
}
</style>
