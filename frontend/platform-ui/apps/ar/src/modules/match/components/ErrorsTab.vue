<template>
<div class="card">
  <div class="card-body">
    <div class="d-flex gap-2 mb-3">
      <button v-for="option in severityOptions" :key="option.value ?? 'all'" class="btn btn-sm"
              :class="severity === option.value ? 'btn-secondary' : 'btn-outline-secondary'"
              @click="setSeverity(option.value)">
        {{ option.label }}
      </button>
    </div>

    <CalculumLoadingAr v-if="loading" />

    <NoDataAvailable v-else-if="!rows.length" :title="$t('arMatch.emptyErrors')" message="" />

    <Grid
      v-else
      :data-items="sortedRows"
      :columns="columns"
      :sortable="true"
      :resizable="true"
      :sort="sort"
      @sortchange="onSortChange"
    >
      <!-- Row 0 is the per-group summary row carrying the real total when storage was capped. -->
      <template #rowNumber="{ props }">
        <td>{{ props.dataItem.rowNumber || '—' }}</td>
      </template>
      <template #code="{ props }">
        <td><code>{{ props.dataItem.errorCode }}</code></td>
      </template>
      <template #severity="{ props }">
        <td><SeverityBadge :severity="props.dataItem.severity" /></td>
      </template>
    </Grid>
  </div>
</div>
</template>

<script setup lang="ts">
/**
 * The parse errors of a version, on the same Kendo grid as the rest of the tabs (G-22).
 *
 * The severity buttons stay a server-side filter rather than becoming a grid filter: the API
 * caps how many errors it stores per group, so filtering client-side would silently be
 * filtering a truncated set.
 */
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { CalculumLoadingAr, NoDataAvailable } from '@ada/design-system'
import { Grid } from '@progress/kendo-vue-grid'
import { orderBy, type SortDescriptor } from '@progress/kendo-data-query'
import { fetchErrors, type ParseErrorRow } from '../api'
import SeverityBadge from './SeverityBadge.vue'

const props = defineProps<{ versionId: number }>()
const { t } = useI18n({ useScope: 'global' })

const loading = ref(true)
const severity = ref<string | undefined>(undefined)
const rows = ref<ParseErrorRow[]>([])

const severityOptions = computed(() => [
  { value: undefined, label: t('arMatch.severity.all') },
  { value: 'blocking', label: t('arMatch.severity.blocking') },
  { value: 'warning', label: t('arMatch.severity.warning') },
])

const columns = computed(() => [
  { field: 'sheet', title: t('arMatch.table.sheet'), width: '160px' },
  { field: 'rowNumber', title: t('arMatch.table.row'), cell: 'rowNumber', width: '90px' },
  { field: 'columnRef', title: t('arMatch.table.column'), width: '100px' },
  { field: 'errorCode', title: t('arMatch.table.code'), cell: 'code', width: '220px' },
  { field: 'severity', title: t('arMatch.table.severity'), cell: 'severity', width: '130px' },
  { field: 'message', title: t('arMatch.table.message') },
])

/**
 * Severity ordered by how much it blocks, not by its name.
 *
 * 'blocking' before 'warning' was alphabetical and worked by luck. Any severity the API adds
 * lands wherever its first letter falls, so 'critical' would sort between them and 'info' would
 * outrank 'warning', quietly breaking the one thing this default is for. An unknown value sorts
 * last rather than first: it is better to bury a severity nobody has ranked than to put it above
 * the blocking errors someone opened this tab to see.
 */
const severityRank: Record<string, number> = { blocking: 0, critical: 1, error: 2, warning: 3, info: 4 }
const rankOf = (value: string | null): number => severityRank[value?.toLowerCase() ?? ''] ?? 99

const sort = ref<SortDescriptor[]>([{ field: 'severity', dir: 'asc' }])
const sortedRows = computed(() => {
  // Ranked whichever direction severity is sorted, so 'desc' is the reverse of 'asc' rather than
  // falling through to alphabetical order (which does not reflect how much a severity blocks).
  // Any other column the user clicks gets its own order, unranked.
  const severitySort = sort.value.length === 1 && sort.value[0].field === 'severity'
    ? sort.value[0]
    : null

  if (!severitySort) {
    return orderBy(rows.value, sort.value)
  }

  const direction = severitySort.dir === 'desc' ? -1 : 1
  return [...rows.value].sort((a, b) => direction * (rankOf(a.severity) - rankOf(b.severity)))
})

function onSortChange(event: { sort: SortDescriptor[] }): void {
  sort.value = event.sort
}

async function load(): Promise<void> {
  loading.value = true
  try {
    rows.value = await fetchErrors(props.versionId, severity.value)
  } finally {
    loading.value = false
  }
}

function setSeverity(value: string | undefined): void {
  severity.value = value
  void load()
}

onMounted(load)
</script>
