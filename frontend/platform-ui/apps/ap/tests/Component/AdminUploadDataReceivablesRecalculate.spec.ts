import { describe, it, expect, vi, beforeEach } from 'vitest'
import { VueWrapper } from '@vue/test-utils'
import { mountWithProviders } from '../Helpers/mountWithProviders'

// AB#20095 — the Receivables tab's Recalculate action, now that it asks AR to recalculate instead
// of re-publishing the upload event.
//
// What changed for this view is not the call, which keeps the same route and the same envelope, but
// what the answers MEAN. The old path had one outcome, success, because a published event answers
// nothing; AR answers three different things and only one of them is the user's to wait out. So the
// cases below are about the difference between them reaching the user, and about the row not
// inviting a second click while the first is still in flight.

vi.mock('@ada/design-system', async () => {
  const { h } = await import('vue')
  return {
    SearchableDropdown: {
      name: 'SearchableDropdown',
      props: ['modelValue', 'items', 'placeholder'],
      setup: () => () => h('div', { class: 'stub-dropdown' })
    },
    CalculumLoading: {
      name: 'CalculumLoading',
      props: ['modal'],
      setup: () => () => h('div', { class: 'stub-loading' })
    }
  }
})

// Declares gridData, unlike the sibling specs' stub: the row's in-flight flag is a property of the
// data this view hands the grid, and asserting it anywhere else would be asserting a local copy.
vi.mock('@/modules/components/grid/CalculumGrid.vue', async () => {
  const { h } = await import('vue')
  return {
    default: {
      name: 'CalculumGrid',
      props: ['gridData', 'buttonText'],
      emits: ['button-action-clicked'],
      setup: () => () => h('div', { class: 'stub-grid' })
    }
  }
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

// The `@/utils` barrel reaches the router and every view; resolved with a plain object rather than
// an `await import` inside the factory, which hangs.
vi.mock('@/utils', () => ({
  StringUtils: {
    removeIRI: (value: string) => String(value).split('/').pop() ?? '',
    isNullUndefinedOrEmpty: (value: unknown) => value === null || value === undefined || value === ''
  }
}))

const recalculateSaleFileVersion = vi.fn()
const saleFilesVersionsAPIReadAll = vi.fn()

vi.mock('@/modules/home/saleFiles/api', () => ({
  ADJUSTMENTS_KIND_STRATEGY: 'strategy-adjustments',
  ADJUSTMENTS_KIND_CREDIT_RATING: 'credit-rating-adjustments',
  postSaleFile: vi.fn(),
  recalculateSaleFileVersion: (...args: any[]) => recalculateSaleFileVersion(...args),
  saleFilesVersionsAPIReadAll: (...args: any[]) => saleFilesVersionsAPIReadAll(...args),
  saleFilesVersionsByCompanyAPIReadAll: vi.fn().mockResolvedValue({ success: true, data: [] }),
  downloadAdjustments: vi.fn(),
  uploadAdjustments: vi.fn()
}))

vi.mock('@progress/kendo-file-saver', () => ({ saveAs: vi.fn() }))

const toastSuccess = vi.fn()
const toastError = vi.fn()
vi.mock('vue-toastification', () => ({ useToast: () => ({ success: toastSuccess, error: toastError }) }))

vi.mock('@/stores/adminBackend', () => ({
  useAdminBackendStore: () => ({
    get getCompanies() {
      return []
    },
    fetchCompanies: ({ callbackSuccess }: any) => callbackSuccess?.()
  })
}))

import AdminUploadDataReceivables from '@/modules/adminBackend/views/AdminUploadDataReceivables.vue'

const ROW = {
  uuid: 'version-uuid-1',
  saleFileName: 'Sales 2026.xlsx',
  version: 3,
  status: 'ready'
}

async function mountAndSettle(): Promise<VueWrapper> {
  saleFilesVersionsAPIReadAll.mockResolvedValue({ success: true, data: [{ ...ROW }] })
  const wrapper = mountWithProviders(AdminUploadDataReceivables)
  await flush(wrapper)
  return wrapper
}

async function flush(wrapper: VueWrapper): Promise<void> {
  await wrapper.vm.$nextTick()
  await Promise.resolve()
  await wrapper.vm.$nextTick()
}

function grid(wrapper: VueWrapper) {
  return wrapper.findComponent({ name: 'CalculumGrid' })
}

async function clickRecalculate(wrapper: VueWrapper, dataItem: any = { ...ROW }): Promise<void> {
  grid(wrapper).vm.$emit('button-action-clicked', { action: 'recalculate', dataItem })
  await flush(wrapper)
}

describe('Receivables grid - Recalculate action', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('asks AR to recalculate the clicked version and reports what was queued', async () => {
    recalculateSaleFileVersion.mockResolvedValue({
      success: true,
      code: 200,
      data: { data: { status: 'recalculateClaimed' } }
    })
    const wrapper = await mountAndSettle()

    await clickRecalculate(wrapper)

    expect(recalculateSaleFileVersion).toHaveBeenCalledWith('version-uuid-1')
    // Not the word "Recalculate", which is what the button already said and tells the user nothing
    // about what just happened.
    expect(toastSuccess).toHaveBeenCalledWith(
      'adminBackend.adminUploadData.receivablesRecalculate.queued'
    )
    expect(toastError).not.toHaveBeenCalled()
  })

  it("shows AR's own reason when the version is held by another process", async () => {
    recalculateSaleFileVersion.mockResolvedValue({
      success: false,
      code: 409,
      data: { message: "Status 'calculating' does not allow recalculation." }
    })
    const wrapper = await mountAndSettle()

    await clickRecalculate(wrapper)

    expect(toastError).toHaveBeenCalledWith("Status 'calculating' does not allow recalculation.")
  })

  // "Error" is not a message. Every refusal AR makes carries a reason, so a failure with none is an
  // infrastructure one, and the line has to say at least which system failed.
  it('falls back to a line that names the failure when there is no reason to quote', async () => {
    recalculateSaleFileVersion.mockResolvedValue({ success: false, code: 502, data: null })
    const wrapper = await mountAndSettle()

    await clickRecalculate(wrapper)

    expect(toastError).toHaveBeenCalledWith(
      'adminBackend.adminUploadData.receivablesRecalculate.failed'
    )
  })

  it('marks the row in flight until the answer arrives', async () => {
    let release: (value: unknown) => void = () => {}
    recalculateSaleFileVersion.mockReturnValue(new Promise((resolve) => { release = resolve }))
    const wrapper = await mountAndSettle()

    grid(wrapper).vm.$emit('button-action-clicked', { action: 'recalculate', dataItem: { ...ROW } })
    await flush(wrapper)

    expect(grid(wrapper).props('gridData')[0].recalculating).toBe(true)

    release({ success: true, code: 200, data: { data: { status: 'recalculateClaimed' } } })
    await flush(wrapper)

    // Cleared by the refresh that follows, which brings the version back as recalculateClaimed —
    // a status the cell already refuses, so the button stays disabled for the right reason.
    expect(grid(wrapper).props('gridData')[0].recalculating).toBeFalsy()
  })

  // The guard is one request per view, so every OTHER row has to look refused too — otherwise the
  // grid offers a button that silently does nothing. AR's dashboard disables its whole Actions
  // column the same way.
  it('marks every row busy, not just the one being recalculated', async () => {
    saleFilesVersionsAPIReadAll.mockResolvedValue({
      success: true,
      data: [{ ...ROW }, { ...ROW, uuid: 'version-uuid-2' }]
    })
    recalculateSaleFileVersion.mockReturnValue(new Promise(() => {}))
    const wrapper = mountWithProviders(AdminUploadDataReceivables)
    await flush(wrapper)

    await clickRecalculate(wrapper)

    const [clicked, other] = grid(wrapper).props('gridData')
    expect(clicked.recalculating).toBe(true)
    expect(other.recalculating).toBeFalsy()
    expect(other.busy).toBe(true)
  })

  it('ignores a second click while the first request is still in flight', async () => {
    recalculateSaleFileVersion.mockReturnValue(new Promise(() => {}))
    const wrapper = await mountAndSettle()

    await clickRecalculate(wrapper)
    await clickRecalculate(wrapper)

    expect(recalculateSaleFileVersion).toHaveBeenCalledTimes(1)
  })

  it('leaves other grid actions alone', async () => {
    const wrapper = await mountAndSettle()

    grid(wrapper).vm.$emit('button-action-clicked', { action: 'somethingElse', dataItem: { ...ROW } })
    await flush(wrapper)

    expect(recalculateSaleFileVersion).not.toHaveBeenCalled()
  })
})
