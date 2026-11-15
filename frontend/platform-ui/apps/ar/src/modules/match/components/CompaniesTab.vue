<template>
<div class="card">
  <div class="card-body">
    <div class="d-flex gap-2 mb-3">
      <button v-for="option in roleOptions" :key="option.value ?? 'all'" class="btn btn-sm"
              :class="role === option.value ? 'btn-secondary' : 'btn-outline-secondary'"
              @click="setRole(option.value)">
        {{ option.label }}
      </button>
    </div>

    <CalculumLoadingAr v-if="loading" />

    <NoDataAvailable v-else-if="!rows.length" :title="$t('arMatch.empty')" message="" />

    <Grid
      v-else
      :data-items="sortedRows"
      :columns="columns"
      :sortable="true"
      :resizable="true"
      :sort="sort"
      :row-render="rowRender"
      @sortchange="onSortChange"
      @rowclick="onRowClick"
    >
      <template #role="{ props }">
        <td><CustomBadge :text="roleLabel(props.dataItem.role)" variant="info" /></td>
      </template>
      <template #resolution="{ props }">
        <td><BodyText variant="sm">{{ labelFor('resolution', props.dataItem.resolution) }}</BodyText></td>
      </template>
      <template #lifecycle="{ props }">
        <td><BodyText variant="sm">{{ labelFor('lifecycle', props.dataItem.lifecycle) }}</BodyText></td>
      </template>
      <template #revenue="{ props }">
        <td class="text-end">{{ formatMoney(props.dataItem.annualRevenue, currenciesStore.selectedCurrencySymbol) }}</td>
      </template>
    </Grid>
  </div>
</div>
</template>

<script setup lang="ts">
/**
 * The parsed parties of a version.
 *
 * On the Telerik/Kendo grid AP uses rather than a hand-rolled table (G-22): sorting and column
 * resizing come with it instead of being reimplemented per tab, and AR's data views behave the
 * way the rest of the platform's already do.
 *
 * Column MENUS are not enabled, here or on the other tabs. AP drives them through its own
 * ColumnMenu component; Kendo's stock menu offers filtering, and a filter applied to a set the
 * API has already paged or truncated filters the page rather than the file. It arrives with the
 * shared wrapper, not before.
 *
 * Three columns where there used to be one. UC-MOD-01 split the old `companyType`
 * discriminator into role, resolution and lifecycle, so the grid can sort and filter each axis
 * on its own — which is the visible half of the reason the axes were separated at all.
 */
import { computed, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { BodyText, CalculumLoadingAr, CustomBadge, NoDataAvailable } from '@ada/design-system'
import { Grid } from '@progress/kendo-vue-grid'
import type { GridRowClickEvent } from '@progress/kendo-vue-grid'
import { orderBy, type SortDescriptor } from '@progress/kendo-data-query'
// Central `@/api`, not the module-scoped `../api`: this tab needs `PartyRole` (for a typed role
// filter) and the UC-API-01 keyset-paginated `fetchCompanies`, neither of which the module-scoped
// client exports yet — using it here would silently cap the list at one page.
import { fetchCompanies, type ParsedCompanyRow, type PartyRole } from '@/api'
import { useLoadToken } from '@/composables/useLoadToken'
import { useArCurrenciesStore } from '@/stores/arCurrencies'
import { formatMoney } from '@/utils/moneyFormatting'
import { roleLabelKey } from '../utils/partyRole'
import * as MatchRouting from '../MatchRouting'

const props = defineProps<{ versionId: number }>()
const { t } = useI18n({ useScope: 'global' })
const currenciesStore = useArCurrenciesStore()

const loading = ref(true)
const role = ref<PartyRole | undefined>(undefined)
const rows = ref<ParsedCompanyRow[]>([])

// Two rapid `setRole` clicks fire two overlapping fetches, and network timing gives no
// guarantee the one that started first is also the one that resolves first — without this
// guard, the slower response can land after the faster one and overwrite the grid with rows
// for a role that is no longer selected.
const { start, isStale } = useLoadToken()

const roleOptions = computed(() => [
  { value: undefined, label: t('arMatch.roles.all') },
  { value: 'Counterparty' as const, label: t('arMatch.roles.counterparty') },
  { value: 'Parent' as const, label: t('arMatch.roles.parent') },
  { value: 'Self' as const, label: t('arMatch.roles.self') },
])

const roleLabel = (value: PartyRole) => t(`arMatch.roles.${roleLabelKey(value)}`, value)

const columns = computed(() => [
  { field: 'role', title: t('arMatch.table.role'), cell: 'role', width: '150px' },
  { field: 'resolution', title: t('arMatch.table.resolution'), cell: 'resolution', width: '130px' },
  { field: 'lifecycle', title: t('arMatch.table.lifecycle'), cell: 'lifecycle', width: '130px' },
  { field: 'sourceRowNumber', title: t('arMatch.table.row'), width: '90px' },
  { field: 'companyName', title: t('arMatch.table.name') },
  { field: 'country', title: t('arMatch.table.country'), width: '110px' },
  { field: 'industry', title: t('arMatch.table.industry'), width: '110px' },
  { field: 'annualRevenue', title: t('arMatch.table.revenue'), cell: 'revenue', width: '160px' },
  { field: 'internalId', title: t('arMatch.table.internalId'), width: '150px' },
])

// The parse writes parties in sheet order, which is the order someone comparing against the
// workbook expects to find them in.
const sort = ref<SortDescriptor[]>([{ field: 'sourceRowNumber', dir: 'asc' }])

// role/resolution/lifecycle render translated labels (labelFor), but the row itself only ever
// carries the raw PascalCase enum value. Sorting one of those columns has to compare the same
// translated label the cell shows, or the visible order stops matching what the header claims —
// under `es` for instance, 'Contraparte' and 'Entidad propia' would sort by 'Counterparty' and
// 'Self' instead, which reads as broken sorting rather than an odd but internally-consistent one.
const translatedAxisFields = new Set(['role', 'resolution', 'lifecycle'])

const sortedRows = computed(() => {
  const [descriptor] = sort.value
  if (!descriptor || !translatedAxisFields.has(descriptor.field)) {
    return orderBy(rows.value, sort.value)
  }

  const axis = descriptor.field as 'role' | 'resolution' | 'lifecycle'
  const direction = descriptor.dir === 'desc' ? -1 : 1
  // `role` goes through `roleLabel` rather than `labelFor`, same as the cell that renders it -
  // its key can't drift out of sync with the Customer Card's own role badge.
  const sortLabel = (row: ParsedCompanyRow) =>
    axis === 'role' ? roleLabel(row.role) : labelFor(axis, row[axis])

  return [...rows.value].sort((a, b) => direction * sortLabel(a).localeCompare(sortLabel(b)))
})

function onSortChange(event: { sort: SortDescriptor[] }): void {
  sort.value = event.sort
}

/**
 * Enum names arrive PascalCase; the translation keys are camelCase. The raw value is the
 * fallback, so a value added to the API before a translation still renders as itself rather
 * than as a missing key. The `role` axis goes through `roleLabel` instead, so its key can't
 * drift out of sync with the Customer Card's own role badge.
 */
function labelFor(axis: 'resolution' | 'lifecycle', value: string): string {
  const key = value.charAt(0).toLowerCase() + value.slice(1)
  return t(`arMatch.${axis}.${key}`, value)
}

async function load(): Promise<void> {
  const token = start()
  loading.value = true
  try {
    const result = await fetchCompanies(props.versionId, role.value)
    if (isStale(token)) {
      // A newer `load()` has started since this one; that request owns `rows` now.
      return
    }
    rows.value = result
  } finally {
    if (!isStale(token)) {
      loading.value = false
    }
  }
}

function setRole(value: PartyRole | undefined) {
  role.value = value
  void load()
}

// UC-API-02 / FE-06: the Customer Card only exists for buyers (BuyersController reads
// ParsedCompany rows via the Buyers module policy) — a parent or supplier-entity row has no card
// to open, so those rows stay inert rather than navigating somewhere that would 404.
const isBuyer = (company: ParsedCompanyRow) => company.role === 'Counterparty'

function openCard(company: ParsedCompanyRow) {
  if (isBuyer(company)) {
    MatchRouting.openCustomerCard(props.versionId, company.id)
  }
}

// row-render adds the pointer cursor only to buyer rows, matching `isBuyer` below — the same
// predicate the click handler uses, so a row only ever looks clickable when it actually is.
// Untyped like Kendo's own `rowRender` prop (`GridProps['rowRender']` is `(h: any, ..., props: any, ...) => any`):
// `props.class` isn't declared on the (marked `@hidden`) `GridRowProps` interface, but it is present at runtime.
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- matches Kendo's own untyped row-render signature.
function rowRender(h: any, trElement: any, defaultSlots: any, rowProps: any) {
  const dataItem = rowProps.dataItem as ParsedCompanyRow
  // trElement.props.class, not rowProps.class, is the base: they aren't guaranteed to carry the
  // same value (Kendo's own alternating-row/selected classes live on trElement.props), and
  // building `class: finalClass` from rowProps.class alone would silently drop them for every
  // non-buyer row, where finalClass falls straight through to rowProps.class - undefined when
  // Kendo hasn't set a per-row class hook, overriding whatever trElement.props.class actually had.
  const finalClass = isBuyer(dataItem)
    ? `${trElement.props.class ?? ''} company-row--clickable`.trim()
    : trElement.props.class
  // Spread trElement.props rather than replace it: Kendo's default row element carries the
  // click/select handlers that back @rowclick, plus its own DOM attributes. Passing only
  // { class } discarded all of that, so the buyer-row navigation this component adds could
  // silently never fire and grid row selection/styling regressed.
  return h('tr', { ...trElement.props, class: finalClass }, defaultSlots)
}

function onRowClick(event: GridRowClickEvent) {
  openCard(event.dataItem as ParsedCompanyRow)
}

onMounted(load)
// MatchView keeps this component mounted across a file/version change (v-if only tracks
// whether a version is selected at all), so without this watch, switching the selected file
// left the Companies list showing the PREVIOUS version's rows — first noticed once this
// component was actually wired into a template (FE-06); it had never run against a changing
// versionId before.
watch(() => props.versionId, load)
</script>

<style scoped>
.company-row--clickable {
  cursor: pointer;
}
</style>
