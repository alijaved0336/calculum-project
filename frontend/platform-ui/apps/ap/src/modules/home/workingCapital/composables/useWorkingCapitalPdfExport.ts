import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useToast } from 'vue-toastification'
import { useAppStore } from '@/stores/app'
import { exportElementToPdf } from '../utils/exportPdf'
import { postWorkingCapitalExportLog } from '../api'

/**
 * Wraps exportElementToPdf with the loading-state and error-surfacing behavior the
 * Working Capital PDF export needs (AC-06/EF-2). Fixes two gaps found in
 * EntityExportPDF.vue's precedent, which this composable's export target is modeled
 * on: that component only resets its "exporting" flag on the success path (it stays
 * stuck true after a failure), and only console.error's on failure (no user-facing
 * feedback). Both are corrected here — `finally` always resets `isExporting`, and a
 * failure shows a toast.
 */
export function useWorkingCapitalPdfExport() {
  const { t } = useI18n({ warnHtmlMessage: false, useScope: 'global' })
  const toast = useToast()
  const appStore = useAppStore()
  const isExporting = ref(false)

  async function exportToPdf(
    element: HTMLElement | null,
    filename: string,
    baseVersionUuid?: string,
    chartImage?: string | null,
  ) {
    try {
      isExporting.value = true
      if (!element) {
        throw new Error('Element not found')
      }
      await exportElementToPdf(element, filename, chartImage)

      // Story 3 (AC-08) — audit-log the export. Fire-and-forget: the PDF already
      // downloaded successfully, so a logging failure must never surface a toast or
      // otherwise look like the export itself failed. `currency` is the live,
      // user-selected currency (appStore.getCurrencyTo) — not the comparison's own
      // `result.currency`, which is the company's base currency, a different value.
      postWorkingCapitalExportLog(baseVersionUuid, appStore.getCurrencyTo).catch((logError) => {
        console.warn('Error logging Working Capital PDF export:', logError)
      })
    } catch (error) {
      console.error('Error generating Working Capital PDF export:', error)
      toast.error(t('home.workingCapital.export.exportFailed'))
    } finally {
      isExporting.value = false
    }
  }

  return { isExporting, exportToPdf }
}
