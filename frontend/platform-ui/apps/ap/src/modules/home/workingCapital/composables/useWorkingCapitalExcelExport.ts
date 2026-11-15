import { useI18n } from 'vue-i18n'
import { useToast } from 'vue-toastification'
import { saveExcel } from '@progress/kendo-vue-excel-export'
import { useAppStore } from '@/stores/app'
import { postWorkingCapitalExportLog } from '../api'
import { buildSupplierListExcelColumns } from '../data/supplierListColumns'
import { resolveSupplierListCurrency, toSupplierListRows } from '../utils/supplierList'
import type { WorkingCapitalComparisonResult } from '../types'

/**
 * WI#20545 — "Export to Excel" of the Achievement List. Every supplier of the List
 * (not only the filtered page), amounts in the selected currency and the currency in
 * the headers (AC-13), through the same row conversion as the grid so the file and
 * the screen agree. Open to every user who can see the tab, like the PDF (BR-06).
 */
export function useWorkingCapitalExcelExport() {
  const { t } = useI18n({ warnHtmlMessage: false, useScope: 'global' })
  const toast = useToast()
  const appStore = useAppStore()

  function exportToExcel(
    result: WorkingCapitalComparisonResult,
    baseVersionUuid?: string,
    fileNames: { current?: string; comparison?: string } = {},
  ) {
    const currency = resolveSupplierListCurrency(
      appStore.getCurrencyTo,
      result.currency,
      appStore.getCurrencyConversionUnavailable,
    )
    try {
      saveExcel({
        data: toSupplierListRows(result.supplierList, t, currency),
        fileName: 'AchievementSupplierList.xlsx',
        columns: buildSupplierListExcelColumns(t, currency.code, fileNames),
        filterable: true,
      })
    } catch (error) {
      console.error('Error generating Working Capital Excel export:', error)
      toast.error(t('home.workingCapital.export.exportExcelFailed'))
      return
    }

    // AC-14 — audit-log the export. Fire-and-forget, like the PDF: the file already
    // downloaded, so a logging failure must not look like the export failed.
    postWorkingCapitalExportLog(baseVersionUuid, currency.code, 'excel').catch((logError) => {
      console.warn('Error logging Working Capital Excel export:', logError)
    })
  }

  return { exportToExcel }
}
