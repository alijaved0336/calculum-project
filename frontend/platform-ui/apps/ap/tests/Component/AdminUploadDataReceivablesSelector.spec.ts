import { describe, it, expect, vi, beforeEach } from 'vitest'
import { VueWrapper } from '@vue/test-utils'
import { mountWithProviders } from '../Helpers/mountWithProviders'

// WI#19427 / UC-ENT-12 A2 and A3. Exercises only the company selector: which companies it offers,
// and when the view is allowed to claim that none is enabled for receivables.
//
// Every dependency is replaced. The store in particular has to be controllable per test, because
// the whole point of the empty state is telling "nobody is enabled" apart from "nobody has been
// asked yet" — the first render, before the fetch resolves, is the case that got this wrong.

vi.mock('@ada/design-system', async () => {
  const { h } = await import('vue')
  return {
    SearchableDropdown: {
      name: 'SearchableDropdown',
      props: ['modelValue', 'items', 'placeholder'],
      // A setup-returned render function rather than a `render()` method: reading props off `this`
      // gives them no type, and the returned node then references itself through the inferred
      // return type (TS7023).
      setup(props: any) {
        return () =>
          h(
            'div',
            { class: 'stub-dropdown' },
            (props.items ?? []).map((item: any) => h('span', { class: 'stub-option' }, item.label))
          )
      }
    }
  }
})

vi.mock('@/modules/components/grid/CalculumGrid.vue', async () => {
  const { h } = await import('vue')
  return { default: { name: 'CalculumGrid', render: () => h('div', { class: 'stub-grid' }) } }
})

vi.mock('@/modules/components/ButtonIconStandard.vue', async () => {
  const { h } = await import('vue')
  return { default: { name: 'ButtonIconStandard', render: () => h('button') } }
})

vi.mock('@/resources/assets/images/icons/IconSync.vue', async () => {
  const { h } = await import('vue')
  return { default: { name: 'IconSync', render: () => h('span') } }
})

vi.mock('@/modules/adminBackend/data/columns', () => ({ defaultSaleFilesGridColumns: [] }))

// The `@/utils` barrel reaches RedirectSection and from there `@/services/router`, which statically
// imports every view and then fails on the partial `@ada/design-system` mock above. Only the two
// StringUtils helpers this view calls are needed, so they are supplied rather than the barrel.
// hasModuleRole stays real: CompaniesUtils imports it from `@/utils/moduleRoleUtils`, a different
// module path, and the filter under test is the point of the suite.
vi.mock('@/utils', () => ({
  StringUtils: {
    removeIRI: (value: string) => String(value).split('/').pop() ?? '',
    isNullUndefinedOrEmpty: (value: unknown) => value === null || value === undefined || value === ''
  }
}))

vi.mock('@/modules/home/saleFiles/api', () => ({
  ADJUSTMENTS_KIND_STRATEGY: 'strategy-adjustments',
  ADJUSTMENTS_KIND_CREDIT_RATING: 'credit-rating-adjustments',
  postSaleFile: vi.fn(),
  recalculateSaleFileVersion: vi.fn(),
  saleFilesVersionsAPIReadAll: vi.fn().mockResolvedValue({ success: true, data: [] }),
  saleFilesVersionsByCompanyAPIReadAll: vi.fn().mockResolvedValue({ success: true, data: [] })
}))

vi.mock('vue-toastification', () => ({ useToast: () => ({ success: vi.fn(), error: vi.fn() }) }))

const storeState = {
  companies: [] as any[],
  fetchOutcome: 'success' as 'success' | 'error' | 'pending'
}

vi.mock('@/stores/adminBackend', () => ({
  useAdminBackendStore: () => ({
    get getCompanies() {
      return storeState.companies
    },
    fetchCompanies: ({ callbackSuccess, callbackError }: any) => {
      // Fires synchronously, standing in for a request that has already resolved by the time the
      // test asserts. A 'pending' outcome calls neither, which is the first-render state.
      if (storeState.fetchOutcome === 'success') callbackSuccess?.()
      if (storeState.fetchOutcome === 'error') callbackError?.(new Error('boom'))
    }
  })
}))

import AdminUploadDataReceivables from '@/modules/adminBackend/views/AdminUploadDataReceivables.vue'

const AR_COMPANY = { '@id': '/api/companies/1', name: 'Enabled Co', roles: ['MODULE_MATCH', 'MODULE_AR'] }
const AP_ONLY_COMPANY = { '@id': '/api/companies/2', name: 'Payables Only Co', roles: ['MODULE_MATCH'] }

// mountWithProviders supplies pinia, a memory router and an i18n instance with empty messages, so
// useI18n() resolves in setup and every key renders as itself — which is what the assertions match.
function mountView(): VueWrapper {
  return mountWithProviders(AdminUploadDataReceivables)
}

const emptyStateShown = (wrapper: VueWrapper) =>
  wrapper.text().includes('adminBackend.adminUploadData.noReceivablesCompany')

const optionLabels = (wrapper: VueWrapper) =>
  wrapper.findAll('.stub-option').map(option => option.text())

describe('AdminUploadDataReceivables company selector', () => {
  beforeEach(() => {
    storeState.companies = []
    storeState.fetchOutcome = 'success'
  })

  it('offers only the companies holding MODULE_AR', async () => {
    storeState.companies = [AR_COMPANY, AP_ONLY_COMPANY]
    const wrapper = mountView()
    await wrapper.vm.$nextTick()

    expect(optionLabels(wrapper)).toEqual(['company.allCompanies', 'Enabled Co'])
    expect(emptyStateShown(wrapper)).toBe(false)
  })

  it('says so when the list has been read and no company is enabled', async () => {
    storeState.companies = [AP_ONLY_COMPANY]
    const wrapper = mountView()
    await wrapper.vm.$nextTick()

    expect(emptyStateShown(wrapper)).toBe(true)
    expect(wrapper.find('.stub-dropdown').exists()).toBe(false)
  })

  it('does NOT claim no company is enabled before the fetch has resolved', async () => {
    // The store is empty on first render whatever the truth is. Asserting "enable one with the
    // Account Receivable checkbox" here tells an administrator to fix configuration that may
    // already be correct.
    storeState.fetchOutcome = 'pending'
    const wrapper = mountView()
    await wrapper.vm.$nextTick()

    expect(emptyStateShown(wrapper)).toBe(false)
    expect(wrapper.find('.stub-dropdown').exists()).toBe(true)
  })

  it('does NOT claim no company is enabled when the fetch failed', async () => {
    // A failed read is not evidence about configuration, and it never resolves later, so the false
    // claim would be permanent rather than momentary.
    storeState.fetchOutcome = 'error'
    const wrapper = mountView()
    await wrapper.vm.$nextTick()

    expect(emptyStateShown(wrapper)).toBe(false)
  })

  it('trusts a store already populated without fetching again', async () => {
    storeState.companies = [AR_COMPANY]
    storeState.fetchOutcome = 'pending'
    const wrapper = mountView()
    await wrapper.vm.$nextTick()

    expect(optionLabels(wrapper)).toEqual(['company.allCompanies', 'Enabled Co'])
    expect(emptyStateShown(wrapper)).toBe(false)
  })
})
