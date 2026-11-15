/**
 * WI#20545 — Achievement sub-tabs and the List's Excel option, on the dashboard view.
 * The comparison composable and every chart are stubbed: what is checked is the view's
 * own wiring (AC-01, AF-1/AF-2, AC-13 access, EF-2).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref } from 'vue'
import { mount } from '@vue/test-utils'

const { comparison, exportToExcelMock, runComparisonMock, stub } = vi.hoisted(() => ({
  comparison: {} as Record<string, any>,
  exportToExcelMock: vi.fn(),
  runComparisonMock: vi.fn(),
  stub: (name: string) => ({ name, props: ['items', 'companyCurrency', 'result', 'currentFileName', 'comparisonFileName'], template: '<div />' }),
}))

vi.mock('vue-i18n', async (importOriginal) => {
  const actual = await importOriginal<typeof import('vue-i18n')>()
  return { ...actual, useI18n: () => ({ t: (key: string) => key, locale: ref('en') }) }
})
vi.mock('@/stores/app', () => ({ useAppStore: () => ({ getCurrencyConversionUnavailable: false }) }))
vi.mock('@ada/design-system', () => ({
  SearchableDropdown: { name: 'SearchableDropdown', props: ['modelValue', 'items'], emits: ['update:modelValue'], template: '<div />' },
}))
vi.mock('@/modules/home/workingCapital/composables/useWorkingCapitalComparison', () => ({
  useWorkingCapitalComparison: () => comparison,
}))
vi.mock('@/modules/home/workingCapital/composables/useWorkingCapitalExcelExport', () => ({
  useWorkingCapitalExcelExport: () => ({ exportToExcel: exportToExcelMock }),
}))
vi.mock('@/modules/home/workingCapital/utils/kpiCards', () => ({ buildKpiCards: () => [] }))
vi.mock('@/modules/home/workingCapital/utils/formatters', () => ({
  formatVersionLabel: () => 'label',
  formatVersionMonthYear: () => 'Dec 2025',
}))

vi.mock('@/modules/home/workingCapital/components/WorkingCapitalSupplierList.vue', () => ({ default: stub('WorkingCapitalSupplierList') }))
vi.mock('@/modules/home/workingCapital/components/WorkingCapitalMinDaysControl.vue', () => ({ default: stub('WorkingCapitalMinDaysControl') }))
vi.mock('@/modules/home/workingCapital/components/WorkingCapitalKPICard.vue', () => ({ default: stub('WorkingCapitalKPICard') }))
vi.mock('@/modules/home/workingCapital/components/SupplierMatchCoverageChart.vue', () => ({ default: stub('SupplierMatchCoverageChart') }))
vi.mock('@/modules/home/workingCapital/components/WAPTImprovementChart.vue', () => ({ default: stub('WAPTImprovementChart') }))
vi.mock('@/modules/home/workingCapital/components/CashFlowByCountryChart.vue', () => ({ default: stub('CashFlowByCountryChart') }))
vi.mock('@/modules/home/workingCapital/components/PaymentTermsByCountryChart.vue', () => ({ default: stub('PaymentTermsByCountryChart') }))
vi.mock('@/modules/home/workingCapital/components/TopSuppliersChart.vue', () => ({ default: stub('TopSuppliersChart') }))
vi.mock('@/modules/home/workingCapital/components/CashFlowVsTargetChart.vue', () => ({ default: stub('CashFlowVsTargetChart') }))
vi.mock('@/modules/home/workingCapital/pdf/WorkingCapitalExportPDF.vue', () => ({ default: stub('WorkingCapitalExportPDF') }))

import WorkingCapitalDashboard from '@/modules/home/workingCapital/views/WorkingCapitalDashboard.vue'

const supplierList = [{ supplier: 'Aska' }, { supplier: 'Beta' }]

function setComparison(overrides: Record<string, any> = {}) {
  Object.assign(comparison, {
    fromVersionOptions: ref([{ uuid: 'base-uuid' }, { uuid: 'other-uuid', name: 'Pagero older' }]),
    toVersion: ref({ finalDate: '2025-12-31', name: 'Pagero' }),
    fromVersion: ref({ uuid: 'base-uuid', name: 'Pagero old' }),
    minDays: ref(5),
    comparisonResult: ref({ currency: 'USD', supplierList }),
    isLoading: ref(false),
    hasError: ref(false),
    runComparison: runComparisonMock,
    selectFromVersion: vi.fn(),
    incrementMinDays: vi.fn(),
    decrementMinDays: vi.fn(),
    ...overrides,
  })
}

const mountView = () => mount(WorkingCapitalDashboard, { attachTo: document.body })
const isShown = (el: { attributes: (n: string) => string | undefined }) => !(el.attributes('style') ?? '').includes('display: none')

describe('WorkingCapitalDashboard — Overview / List sub-tabs (WI#20545)', () => {
  beforeEach(() => {
    exportToExcelMock.mockReset()
    runComparisonMock.mockReset()
    setComparison()
  })

  it('shows Overview and List, with Overview selected (AC-01)', () => {
    const wrapper = mountView()

    expect(wrapper.find('[data-testid="wc-sub-tab-overview"]').text()).toBe('home.workingCapital.subTabs.overview')
    expect(wrapper.find('[data-testid="wc-sub-tab-list"]').text()).toBe('home.workingCapital.subTabs.list')
    expect(wrapper.find('[data-testid="wc-sub-tab-overview"]').classes()).toContain('btn-clear')
    expect(isShown(wrapper.find('[data-testid="wc-overview"]'))).toBe(true)
    expect(isShown(wrapper.findComponent({ name: 'WorkingCapitalSupplierList' }))).toBe(false)
  })

  it('switches between the sub-tabs without reloading the comparison (AC-01)', async () => {
    const wrapper = mountView()

    await wrapper.find('[data-testid="wc-sub-tab-list"]').trigger('click')
    expect(isShown(wrapper.findComponent({ name: 'WorkingCapitalSupplierList' }))).toBe(true)
    expect(isShown(wrapper.find('[data-testid="wc-overview"]'))).toBe(false)

    await wrapper.find('[data-testid="wc-sub-tab-overview"]').trigger('click')
    expect(isShown(wrapper.find('[data-testid="wc-overview"]'))).toBe(true)
    // The charts stayed mounted the whole time (v-show), and nothing was refetched.
    expect(wrapper.findComponent({ name: 'SupplierMatchCoverageChart' }).exists()).toBe(true)
    expect(runComparisonMock).not.toHaveBeenCalled()
  })

  it('hands the List every supplier of the comparison and the company currency', () => {
    const list = mountView().findComponent({ name: 'WorkingCapitalSupplierList' })
    expect(list.props('items')).toEqual(supplierList)
    expect(list.props('companyCurrency')).toBe('USD')
  })

  it('stays on the List when the comparison is refreshed (AF-1 Min Days, AF-2 Compare from)', async () => {
    const wrapper = mountView()
    await wrapper.find('[data-testid="wc-sub-tab-list"]').trigger('click')

    comparison.comparisonResult.value = { currency: 'USD', supplierList: [{ supplier: 'Cora' }] }
    await wrapper.vm.$nextTick()

    const list = wrapper.findComponent({ name: 'WorkingCapitalSupplierList' })
    expect(isShown(list)).toBe(true)
    expect(list.props('items')).toEqual([{ supplier: 'Cora' }])
  })

  it('refreshes the List for the file picked in "Compare from" (AC-09)', async () => {
    const wrapper = mountView()
    await wrapper.find('[data-testid="wc-sub-tab-list"]').trigger('click')

    // What the composable does on a new pick: fetch, then swap the file and the result.
    comparison.selectFromVersion.mockImplementation((version: { uuid: string; name: string }) => {
      comparison.fromVersion.value = version
      comparison.comparisonResult.value = { currency: 'USD', supplierList: [{ supplier: 'Aska', status: 'matched' }] }
    })
    wrapper.findComponent({ name: 'SearchableDropdown' }).vm.$emit('update:modelValue', 'other-uuid')
    await wrapper.vm.$nextTick()

    expect(comparison.selectFromVersion).toHaveBeenCalledWith({ uuid: 'other-uuid', name: 'Pagero older' })
    const list = wrapper.findComponent({ name: 'WorkingCapitalSupplierList' })
    expect(isShown(list)).toBe(true)
    expect(list.props('items')).toEqual([{ supplier: 'Aska', status: 'matched' }])
    expect(list.props('comparisonFileName')).toBe('Pagero older')
    expect(list.props('currentFileName')).toBe('Pagero')
  })

  it('offers "Export to Excel" next to "Export to PDF" and exports with the comparison file and both file names (AC-13)', async () => {
    const wrapper = mountView()
    await wrapper.find('#wc-options-btn').trigger('click')

    const excel = wrapper.find('[data-testid="wc-export-excel-menu-item"]')
    expect(wrapper.find('[data-testid="wc-export-pdf-menu-item"]').exists()).toBe(true)
    expect(excel.text()).toBe('home.workingCapital.export.exportExcelButton')

    await excel.trigger('click')
    expect(exportToExcelMock).toHaveBeenCalledWith(comparison.comparisonResult.value, 'base-uuid', {
      current: 'Pagero',
      comparison: 'Pagero old',
    })
  })

  it('empties the List and blocks the Excel export when the comparison cannot be loaded (EF-2)', async () => {
    setComparison({ hasError: ref(true) })
    const wrapper = mountView()

    expect(wrapper.findComponent({ name: 'WorkingCapitalSupplierList' }).props('items')).toEqual([])

    await wrapper.find('#wc-options-btn').trigger('click')
    const excel = wrapper.find('[data-testid="wc-export-excel-menu-item"]')
    expect(excel.classes()).toContain('menu-item--disabled')
    await excel.trigger('click')
    expect(exportToExcelMock).not.toHaveBeenCalled()
  })
})
