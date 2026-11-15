<template>
  <div
    class="wc-supplier-list"
    data-testid="wc-supplier-list"
  >
    <CalculumGrid
      :grid-data="rows"
      :grid-columns="columns"
      :children-columns="true"
      :allow-export-excel="false"
      :hide-column-selector="true"
      :reordering-columns="false"
      :enabled-pagination="true"
      :default-page-size="50"
      :footer-follows-filter="true"
      :selectable="false"
    />
  </div>
</template>

<script lang="ts">
import { computed, defineComponent, type PropType } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAppStore } from '@/stores/app'
import CalculumGrid from '@/modules/components/grid/CalculumGrid.vue'
import { buildSupplierListColumns } from '../data/supplierListColumns'
import { resolveSupplierListCurrency, toSupplierListRows } from '../utils/supplierList'
import type { SupplierListItem } from '../types'

/**
 * WI#20545 — the Achievement List: every supplier of the active file, side by side
 * with the comparison file. It only renders what the comparison already loaded for
 * the Overview (NFR Performance). The rows are a computed over the store's currency
 * rate, so a change in the top bar converts every amount and total at once (AC-12).
 */
export default defineComponent({
  name: 'WorkingCapitalSupplierList',
  components: { CalculumGrid },
  props: {
    items: { type: Array as PropType<SupplierListItem[]>, required: true },
    // The company currency: what the amounts stay in when conversion is unavailable (EF-3).
    companyCurrency: { type: String, required: true },
    currentFileName: { type: String, default: '' },
    comparisonFileName: { type: String, default: '' },
  },
  setup(props) {
    const { t } = useI18n({ warnHtmlMessage: false, useScope: 'global' })
    const appStore = useAppStore()

    const currency = computed(() =>
      resolveSupplierListCurrency(
        appStore.getCurrencyTo,
        props.companyCurrency,
        appStore.getCurrencyConversionUnavailable,
      ),
    )
    // Reads appStore.getCurrencyAmount through changeToCurrency, so it re-runs on a rate change.
    const rows = computed(() => toSupplierListRows(props.items, t, currency.value))
    // The grid watches its columns, so the currency in the headers follows without a remount.
    const columns = computed(() => buildSupplierListColumns(t, currency.value.code, {
        current: props.currentFileName,
        comparison: props.comparisonFileName,
      }),
    )

    return { rows, columns }
  },
})
</script>
