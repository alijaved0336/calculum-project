/**
 * WI#20545 — the List component hands the grid one row per supplier, converted to the
 * top-bar currency, and turns the totals-follow-filters option on. A rate change in the
 * store re-converts every amount at once (AC-12). The real CalculumGrid cannot be
 * mounted under Vitest (see CalculumGridGraphqlDistinctValues.spec.ts), so it is stubbed
 * and its props are what is checked.
 */

import { describe, it, expect, vi } from 'vitest'
import { nextTick } from 'vue'
import { mount } from '@vue/test-utils'

const { store } = vi.hoisted(() => ({ store: { getCurrencyTo: 'EUR', getCurrencyConversionUnavailable: false, getCurrencyAmount: 2 } }))

vi.mock('vue-i18n', async (importOriginal) => {
  const actual = await importOriginal<typeof import('vue-i18n')>()
  return { ...actual, useI18n: () => ({ t: (key: string) => key }) }
})
vi.mock('@/modules/components/grid/CalculumGrid.vue', () => ({
  default: { name: 'CalculumGrid', props: ['gridData', 'gridColumns', 'footerFollowsFilter', 'childrenColumns', 'enabledPagination', 'defaultPageSize', 'allowExportExcel'], template: '<div />' },
}))

vi.mock('@/stores/app', async () => {
  const { reactive } = await import('vue')
  const reactiveStore = reactive(store)
  return { useAppStore: () => reactiveStore }
})
vi.mock('@/utils/FormatData', async () => {
  const { useAppStore } = await import('@/stores/app')
  return { changeToCurrency: (amount: number) => Number(amount) * useAppStore().getCurrencyAmount }
})

import { useAppStore } from '@/stores/app'
import WorkingCapitalSupplierList from '@/modules/home/workingCapital/components/WorkingCapitalSupplierList.vue'
import type { SupplierListItem } from '@/modules/home/workingCapital/types'

const items: SupplierListItem[] = [
  { supplier: 'Aska', country: 'Japan', status: 'matchedIncreased', currentPt: 60, currentVolume: 1000, currentCfOpportunity: 82, currentTargetPt: 90, comparisonPt: 30, comparisonVolume: 730, comparisonCfOpportunity: 40, comparisonTargetPt: 70 },
  { supplier: 'Beta', country: 'Spain', status: 'notMatched', currentPt: 50, currentVolume: 500, currentCfOpportunity: null, currentTargetPt: null, comparisonPt: null, comparisonVolume: null, comparisonCfOpportunity: null, comparisonTargetPt: null },
]

const grid = () => {
  const wrapper = mount(WorkingCapitalSupplierList, { props: { items, companyCurrency: 'USD' } })
  return { wrapper, props: () => wrapper.findComponent({ name: 'CalculumGrid' }).props() }
}

const reactiveStore = useAppStore() as unknown as typeof store

describe('WorkingCapitalSupplierList', () => {
  it('gives the grid one row per supplier, with the status as a label', () => {
    const { props } = grid()
    expect(props().gridData).toHaveLength(2)
    expect(props().gridData[0].statusLabel).toBe('home.workingCapital.list.status.matchedIncreased')
    expect(props().gridData[1].statusLabel).toBe('home.workingCapital.list.status.notMatched')
  })

  it('totals follow the filters, the columns are grouped and long lists are paged', () => {
    const { props } = grid()
    expect(props().footerFollowsFilter).toBe(true)
    expect(props().childrenColumns).toBe(true)
    expect(props().enabledPagination).toBe(true)
    expect(props().defaultPageSize).toBe(50)
    // The grid's own Excel icon is role-gated; the List's Excel lives in the tab menu (BR-06).
    expect(props().allowExportExcel).toBe(false)
  })

  it('converts the amounts and re-converts them when the currency changes (AC-12)', async () => {
    reactiveStore.getCurrencyAmount = 2
    const { props } = grid()
    expect(props().gridData[0].currentVolume).toBe(2000)

    reactiveStore.getCurrencyTo = 'GBP'
    reactiveStore.getCurrencyAmount = 3
    await nextTick()

    expect(props().gridData[0].currentVolume).toBe(3000)
    expect(props().gridData[0].comparisonVolume).toBe(2190)
    const volumeTitles = JSON.stringify(props().gridColumns)
    expect(volumeTitles).toContain('home.workingCapital.list.columns.spendVolume')
    // Not-matched suppliers keep their comparison values empty.
    expect(props().gridData[1].comparisonVolume).toBeNull()
  })
})
