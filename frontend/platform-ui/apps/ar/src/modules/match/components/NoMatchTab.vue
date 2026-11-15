<template>
<div class="card">
  <div class="card-body">
    <CalculumLoadingAr v-if="loading" />

    <NoDataAvailable v-else-if="!rows.length" :title="$t('arMatch.emptyNoMatch')" message="" />

    <Grid
      v-else
      :data-items="sortedRows"
      :columns="columns"
      :sortable="true"
      :resizable="true"
      :sort="sort"
      @sortchange="onSortChange"
    >
      <template #reason="{ props }">
        <td>
          <CustomBadge
            :text="$t(`arMatch.noMatchReason.${props.dataItem.reason}`, props.dataItem.reason)"
            variant="warning"
          />
        </td>
      </template>
    </Grid>
  </div>
</div>
</template>

<script setup lang="ts">
/**
 * The rows the parse could not attach to a buyer. On the same Kendo grid as the rest of the
 * tabs (G-22): sorting by reason is how someone triaging a file groups the causes, and a plain
 * table gave them no way to do it.
 */
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { CalculumLoadingAr, CustomBadge, NoDataAvailable } from '@ada/design-system'
import { Grid } from '@progress/kendo-vue-grid'
import { orderBy, type SortDescriptor } from '@progress/kendo-data-query'
import { fetchNoMatches, type NoMatchRow } from '../api'

const props = defineProps<{ versionId: number }>()
const { t } = useI18n({ useScope: 'global' })

const loading = ref(true)
const rows = ref<NoMatchRow[]>([])

const columns = computed(() => [
  { field: 'sourceRowNumber', title: t('arMatch.table.row'), width: '110px' },
  { field: 'rawName', title: t('arMatch.table.rawName') },
  { field: 'reason', title: t('arMatch.table.reason'), cell: 'reason', width: '280px' },
])

// File order by default: the point of this tab is to find the row in the workbook.
const sort = ref<SortDescriptor[]>([{ field: 'sourceRowNumber', dir: 'asc' }])
const sortedRows = computed(() => orderBy(rows.value, sort.value))

function onSortChange(event: { sort: SortDescriptor[] }): void {
  sort.value = event.sort
}

onMounted(async () => {
  try {
    rows.value = await fetchNoMatches(props.versionId)
  } finally {
    loading.value = false
  }
})
</script>
