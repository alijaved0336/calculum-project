/**
 * WI#20545 — "Export to Excel" of the Achievement List: every supplier, amounts in the
 * selected currency with the currency in the headers (AC-13), and an audit-log entry in
 * Excel format (AC-14). EF-3: with no rate the file stays in the company currency.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { defineComponent, h } from 'vue'
import { mount } from '@vue/test-utils'

const { saveExcelMock, postLogMock, toastErrorSpy, store } = vi.hoisted(() => ({
  saveExcelMock: vi.fn(),
  postLogMock: vi.fn().mockResolvedValue({ success: true }),
  toastErrorSpy: vi.fn(),
  store: { getCurrencyTo: 'EUR', getCurrencyConversionUnavailable: false, rate: 2 },
}))

vi.mock('vue-i18n', async (importOriginal) => {
  const actual = await importOriginal<typeof import('vue-i18n')>()
  return {
    ...actual,
    useI18n: () => ({ t: (key: string, values?: Record<string, unknown>) => (values?.currency ? `${key}(${values.currency})` : key) }),
  }
})
vi.mock('vue-toastification', () => ({ useToast: () => ({ error: toastErrorSpy }) }))
vi.mock('@progress/kendo-vue-excel-export', () => ({ saveExcel: saveExcelMock }))
vi.mock('@/stores/app', () => ({ useAppStore: () => store }))
vi.mock('@/utils/FormatData', () => ({ changeToCurrency: (amount: number) => Number(amount) * store.rate }))
vi.mock('@/modules/home/workingCapital/api', () => ({ postWorkingCapitalExportLog: postLogMock }))

import { useWorkingCapitalExcelExport } from '@/modules/home/workingCapital/composables/useWorkingCapitalExcelExport'
import type { SupplierListItem, WorkingCapitalComparisonResult } from '@/modules/home/workingCapital/types'

const item = (supplier: string, currentVolume: number, status: SupplierListItem['status'] = 'matched'): SupplierListItem => ({
  supplier, country: 'Spain', status,
  currentPt: 60, currentVolume, currentCfOpportunity: 10, currentTargetPt: 90,
  comparisonPt: 30, comparisonVolume: 50, comparisonCfOpportunity: -5, comparisonTargetPt: 70,
})

const result = (supplierList: SupplierListItem[]) =>
  ({ currency: 'USD', supplierList } as unknown as WorkingCapitalComparisonResult)

function exporter() {
  let api!: ReturnType<typeof useWorkingCapitalExcelExport>
  mount(defineComponent({ setup() { api = useWorkingCapitalExcelExport(); return () => h('div') } }))
  return api
}

describe('useWorkingCapitalExcelExport', () => {
  beforeEach(() => {
    saveExcelMock.mockReset()
    postLogMock.mockClear()
    toastErrorSpy.mockReset()
    store.getCurrencyTo = 'EUR'
    store.getCurrencyConversionUnavailable = false
    store.rate = 2
  })

  it('downloads every supplier of the List with converted amounts (AC-13)', () => {
    const suppliers = Array.from({ length: 120 }, (_, i) => item(`S${i}`, i + 1))
    exporter().exportToExcel(result(suppliers), 'base-uuid')

    const options = saveExcelMock.mock.calls[0][0]
    expect(options.data).toHaveLength(120)
    expect(options.data[0].currentVolume).toBe(2)
    expect(options.data[0].comparisonCfOpportunity).toBe(-10)
    expect(options.data[0].statusLabel).toBe('home.workingCapital.list.status.matched')
    expect(options.fileName).toBe('AchievementSupplierList.xlsx')
  })

  it('puts the selected currency in the money headers (AC-13)', () => {
    exporter().exportToExcel(result([item('A', 1)]), 'base-uuid')

    const titles = saveExcelMock.mock.calls[0][0].columns.flatMap((c: { children?: { title: string }[] }) => c.children ?? []).map((c: { title: string }) => c.title)
    expect(titles).toContain('home.workingCapital.list.columns.spendVolume(EUR)')
  })

  it('records the export in the audit log as Excel, with the comparison file and currency (AC-14)', () => {
    exporter().exportToExcel(result([item('A', 1)]), 'base-uuid')

    expect(postLogMock).toHaveBeenCalledWith('base-uuid', 'EUR', 'excel')
  })

  it('stays in the company currency when the conversion is unavailable (EF-3)', () => {
    store.getCurrencyConversionUnavailable = true
    exporter().exportToExcel(result([item('A', 7)]), 'base-uuid')

    const options = saveExcelMock.mock.calls[0][0]
    expect(options.data[0].currentVolume).toBe(7)
    expect(options.columns.flatMap((c: { children?: { title: string }[] }) => c.children ?? []).map((c: { title: string }) => c.title)).toContain(
      'home.workingCapital.list.columns.spendVolume(USD)',
    )
    expect(postLogMock).toHaveBeenCalledWith('base-uuid', 'USD', 'excel')
  })

  it('shows an error and logs nothing when the file cannot be built', () => {
    saveExcelMock.mockImplementation(() => { throw new Error('boom') })
    exporter().exportToExcel(result([item('A', 1)]), 'base-uuid')

    expect(toastErrorSpy).toHaveBeenCalledWith('home.workingCapital.export.exportExcelFailed')
    expect(postLogMock).not.toHaveBeenCalled()
  })
})
