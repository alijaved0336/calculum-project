<template>
<div class="card mb-3">
  <div class="card-body">
    <h6 class="mb-3">{{ t('arMatch.errorGroups') }}</h6>

    <NoDataAvailable v-if="!groups.length" :title="t('arMatch.emptyErrors')" message="" />

    <Grid
      v-else
      :data-items="sortedGroups"
      :columns="columns"
      :sortable="true"
      :resizable="true"
      :sort="sort"
      @sortchange="onSortChange"
    >
      <template #severity="{ props }">
        <td><SeverityBadge :severity="props.dataItem.severity" /></td>
      </template>
    </Grid>
  </div>
</div>
</template>

<script setup lang="ts">
/**
 * UC-VAL-03 basic flow step 2: the error groups with their counts, same shape the notification
 * email reports (`ParseErrorGroupDto`). Purely presentational - the version detail response
 * already carries `errorGroups`, so this renders the list its caller fetched rather than
 * fetching its own copy.
 *
 * Deliberately no click-to-filter into the row-level grid below it: every row a group summarises
 * is already visible there (sheet, row number, column, code, severity), sortable and filterable
 * by severity on its own terms, so a group's rows are found by matching those same columns rather
 * than by adding a second, narrower filtering mechanism the row grid does not otherwise have.
 */
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { NoDataAvailable } from '@ada/design-system'
import { Grid } from '@progress/kendo-vue-grid'
import { orderBy, type SortDescriptor } from '@progress/kendo-data-query'
import type { ParseErrorGroup } from '../api'
import SeverityBadge from './SeverityBadge.vue'

const props = defineProps<{ groups: ParseErrorGroup[] }>()
const { t } = useI18n({ useScope: 'global' })

const columns = computed(() => [
  { field: 'sheet', title: t('arMatch.table.sheet'), width: '160px' },
  { field: 'columnRef', title: t('arMatch.table.column'), width: '110px' },
  { field: 'errorCode', title: t('arMatch.table.code'), width: '220px' },
  { field: 'severity', title: t('arMatch.table.severity'), cell: 'severity', width: '130px' },
  { field: 'storedRows', title: t('arMatch.table.rows'), width: '110px' },
])

// The API already orders by count descending (the shape the notification email reports); kept
// as the default sort here rather than left to whatever order the grid happens to render first.
const sort = ref<SortDescriptor[]>([{ field: 'storedRows', dir: 'desc' }])
const sortedGroups = computed(() => orderBy(props.groups, sort.value))

function onSortChange(event: { sort: SortDescriptor[] }): void {
  sort.value = event.sort
}
</script>
