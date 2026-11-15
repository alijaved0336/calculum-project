<template>
<CalculumModal :size="'xlg'" :showClose="true" :title="$t('home.workingCapital.export.title')" :isPdfModal="true" @close="$emit('close')">
  <template v-slot:modalContent>
    <div class="wc-export" ref="contentToExport">
      <!-- KPI Cards -->
      <div class="row mb-3">
        <div v-for="(card, index) in kpiCards" :key="card.title" class="col-sm-12 col-md-6 col-lg-6 col-xl-3 mb-3">
          <WorkingCapitalKPICard
            :title="card.title"
            :big-value="card.bigValue"
            :big-value-tooltip="card.bigValueTooltip"
            :sub-lines="card.subLines"
            :progress-pct="card.progressPct"
            :centered="index < 3"
            :reserve-title-lines="true"
          />
        </div>
      </div>

      <div class="row">
        <div class="col-12 mb-3">
          <SupplierMatchCoverageChart ref="supplierMatchChartRef" :result="result" :from-label="fromMonthYear" :to-label="toMonthYear" />
        </div>
        <div class="col-12 mb-3">
          <WAPTImprovementChart :result="result" :from-label="fromMonthYear" :to-label="toMonthYear" />
        </div>
      </div>
      <div class="row">
        <div class="col-12 mb-3">
          <CashFlowByCountryChart :result="result" />
        </div>
        <div class="col-12 mb-3">
          <PaymentTermsByCountryChart :result="result" :from-label="fromMonthYear" :to-label="toMonthYear" />
        </div>
      </div>
      <div class="row align-items-start">
        <div class="col-12 mb-3">
          <TopSuppliersChart :result="result" />
        </div>
        <div class="col-12 mb-3">
          <CashFlowVsTargetChart :result="result" />
        </div>
      </div>

    </div>
    <!-- Buttons rendered as a plain sibling row (not CalculumModal's modalButtons slot),
         mirroring EntityExportPDF.vue's precedent: .wc-export above is height-bounded with
         its own internal scroll, so this row always stays visible below it instead of
         relying on the outer modal container's scroll to reach an unbounded fold. -->
    <div class="row mt-2 mb-2">
      <div class="col-12 d-flex container-buttons">
        <button class="btn outline-secondary-btn font-md" @click="$emit('close')">{{ $t('global.cancel') }}</button>
        <button class="btn btn-primary font-md" :disabled="isExportingToPdf" @click="exportToPDF">
          {{ $t('home.workingCapital.export.exportButton') }}
        </button>
      </div>
    </div>
  </template>
</CalculumModal>
</template>

<script lang="ts">
import { defineComponent, ref, computed, PropType } from 'vue'
import { useI18n } from 'vue-i18n'
import CalculumModal from '@/modules/components/CalculumModal.vue'
import type { WorkingCapitalComparisonResult } from '../types'
import { formatVersionMonthYear } from '../utils/formatters'
import { buildKpiCards } from '../utils/kpiCards'
import { useWorkingCapitalPdfExport } from '../composables/useWorkingCapitalPdfExport'
import WorkingCapitalKPICard from '../components/WorkingCapitalKPICard.vue'
import SupplierMatchCoverageChart from '../components/SupplierMatchCoverageChart.vue'
import WAPTImprovementChart from '../components/WAPTImprovementChart.vue'
import CashFlowByCountryChart from '../components/CashFlowByCountryChart.vue'
import PaymentTermsByCountryChart from '../components/PaymentTermsByCountryChart.vue'
import TopSuppliersChart from '../components/TopSuppliersChart.vue'
import CashFlowVsTargetChart from '../components/CashFlowVsTargetChart.vue'

export default defineComponent({
  name: 'WorkingCapitalExportPDF',
  components: {
    CalculumModal,
    WorkingCapitalKPICard,
    SupplierMatchCoverageChart,
    WAPTImprovementChart,
    CashFlowByCountryChart,
    PaymentTermsByCountryChart,
    TopSuppliersChart,
    CashFlowVsTargetChart,
  },
  props: {
    result: {
      type: Object as PropType<WorkingCapitalComparisonResult>,
      required: true,
    },
    // Story 3 (AC-08) — the "from" version's uuid, forwarded to the export-log call.
    baseVersionUuid: {
      type: String,
      default: undefined,
    },
  },
  emits: ['close'],
  setup(props) {
    const { t, locale } = useI18n({ warnHtmlMessage: false, useScope: 'global' })
    const { isExporting: isExportingToPdf, exportToPdf } = useWorkingCapitalPdfExport()

    const contentToExport = ref<HTMLElement | null>(null)
    const supplierMatchChartRef = ref<{ exportChartImage?: () => Promise<string | null> } | null>(null)

    const kpiCards = computed(() => buildKpiCards(props.result, t))
    const fromYear = computed(() => props.result.fromYear)
    const toYear   = computed(() => props.result.toYear)
    // Month + year, matching the live dashboard's WAPT/Payment Terms by Country legends
    // (Story 2 Fidelity NFR — the export must always match the live cards exactly).
    const fromMonthYear = computed(() => formatVersionMonthYear(props.result.fromDate, locale.value) || fromYear.value)
    const toMonthYear   = computed(() => formatVersionMonthYear(props.result.toDate, locale.value) || toYear.value)

    // The Supplier Match Coverage donut is the only real Kendo <Chart> in this export;
    // drawDOM() can't faithfully reproduce its SVG, so it's rasterized separately first
    // (see exportPdf.ts) and spliced into the capture in place of the chart's own markup.
    async function exportToPDF() {
      const chartImage = await supplierMatchChartRef.value?.exportChartImage?.() ?? null
      return exportToPdf(contentToExport.value, 'WorkingCapitalComparison.pdf', props.baseVersionUuid, chartImage)
    }

    return { contentToExport, supplierMatchChartRef, isExportingToPdf, kpiCards, fromMonthYear, toMonthYear, exportToPDF }
  },
})
</script>

<style scoped lang="scss">
@import '@/resources/assets/styles/variables/_dimensions.scss';

.wc-export {
  padding: 0.5rem;
  background: #f2f4f7;
  border-radius: 8px;
  // Bounded height + internal scroll (mirrors EntityExportPDF.vue's .pdf-content) so the
  // Cancel/Export buttons row below it stays visible instead of sitting past an unbounded
  // fold. exportPdf.ts strips these on the offscreen clone before drawDOM, so the actual
  // PDF still captures the full, unclipped content.
  height: calc(100vh * #{$zoom-compensation} - 200px);
  overflow-y: auto;
  overflow-x: hidden;

}
</style>
