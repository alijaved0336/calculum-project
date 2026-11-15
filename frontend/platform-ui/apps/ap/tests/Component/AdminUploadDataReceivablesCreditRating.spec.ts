import { describe, it, expect, vi, beforeEach } from 'vitest'
import { VueWrapper } from '@vue/test-utils'
import { mountWithProviders } from '../Helpers/mountWithProviders'

// UC-SET-08 / AB#19911 — the Credit Rating Adjustments column of the Receivables tab.
//
// The view now routes three shared handlers through a behaviour table, so the risk this file
// covers is not "does download work" — its sibling spec proves that — but **which file a click
// reaches**. Both columns sit on the same row, emit the same three events and differ only by a
// behaviour string, so a wrong table entry sends a Credit Rating click to the Peer Group endpoint
// and back with a plausible answer. Nothing throws; the administrator edits the wrong file.

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

vi.mock('@/modules/components/grid/CalculumGrid.vue', async () => {
  const { h } = await import('vue')
  return {
    default: {
      name: 'CalculumGrid',
      emits: ['download-adjustments', 'upload-adjustments', 'outcome-adjustments'],
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

vi.mock('@/utils', () => ({
  StringUtils: {
    removeIRI: (value: string) => String(value).split('/').pop() ?? '',
    isNullUndefinedOrEmpty: (value: unknown) => value === null || value === undefined || value === ''
  }
}))

// One parameterised call each, so every assertion below is about the KIND a click carries rather
// than about which of six near-identical functions it happened to reach.
const downloadAdjustments = vi.fn()
const uploadAdjustments = vi.fn()
const fetchAdjustmentsOutcome = vi.fn()

vi.mock('@/modules/home/saleFiles/api', () => ({
  ADJUSTMENTS_KIND_STRATEGY: 'strategy-adjustments',
  ADJUSTMENTS_KIND_CREDIT_RATING: 'credit-rating-adjustments',
  postSaleFile: vi.fn(),
  recalculateSaleFileVersion: vi.fn(),
  saleFilesVersionsAPIReadAll: vi.fn().mockResolvedValue({ success: true, data: [] }),
  saleFilesVersionsByCompanyAPIReadAll: vi.fn().mockResolvedValue({ success: true, data: [] }),
  downloadAdjustments: (...a: any[]) => downloadAdjustments(...a),
  uploadAdjustments: (...a: any[]) => uploadAdjustments(...a),
  fetchAdjustmentsOutcome: (...a: any[]) => fetchAdjustmentsOutcome(...a),
  ADJUSTMENTS_OUTCOME_REPORTED: 'reported',
  ADJUSTMENTS_OUTCOME_NO_UPLOAD_YET: 'noUploadYet',
  ADJUSTMENTS_OUTCOME_VERSION_UNKNOWN: 'versionUnknownToReceivables'
}))

const saveAs = vi.fn()
vi.mock('@progress/kendo-file-saver', () => ({ saveAs: (...args: any[]) => saveAs(...args) }))

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

const CREDIT_RATING = 'creditRatingAdjustments'
const CREDIT_RATING_KIND = 'credit-rating-adjustments'
const STRATEGY_KIND = 'strategy-adjustments'
const STRATEGY = 'peerGroupAndBuyerStandardAdjustments'
const PAYABLES = 'peerGroupAndSupplierStandardAdjustments'

const ROW = { uuid: 'version-uuid-1', saleFileName: 'Sales 2026.xlsx', version: 3 }

async function mountAndSettle(): Promise<VueWrapper> {
  const wrapper = mountWithProviders(AdminUploadDataReceivables)
  await wrapper.vm.$nextTick()
  return wrapper
}

async function emitFromGrid(wrapper: VueWrapper, event: string, ...args: any[]): Promise<void> {
  wrapper.findComponent({ name: 'CalculumGrid' }).vm.$emit(event, ...args)
  await wrapper.vm.$nextTick()
  await Promise.resolve()
  await wrapper.vm.$nextTick()
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('Credit Rating adjustments column - routing', () => {
  it('sends a Credit Rating download to the Credit Rating endpoint and nowhere else', async () => {
    downloadAdjustments.mockResolvedValue({
      success: true,
      code: 200,
      data: new ArrayBuffer(8),
      fileName: 'Sales 2026-creditRating.csv',
      contentType: 'text/csv'
    })
    const wrapper = await mountAndSettle()

    await emitFromGrid(wrapper, 'download-adjustments', ROW, CREDIT_RATING)

    expect(downloadAdjustments).toHaveBeenCalledWith('version-uuid-1', CREDIT_RATING_KIND)
    expect(saveAs.mock.calls[0][1]).toBe('Sales 2026-creditRating.csv')
    expect((saveAs.mock.calls[0][0] as Blob).type).toBe('text/csv')
  })

  /**
   * The generated name carries this file's own infix and the served extension. Falling back to the
   * sibling's `-strategyAdjustments-` would put two different files under one name in a downloads
   * folder, and the administrator re-uploads whichever one they find.
   */
  it('falls back to a name that says which file it is, with the served extension', async () => {
    downloadAdjustments.mockResolvedValue({
      success: true,
      code: 200,
      data: new ArrayBuffer(8),
      contentType: 'text/csv'
    })
    const wrapper = await mountAndSettle()

    await emitFromGrid(wrapper, 'download-adjustments', ROW, CREDIT_RATING)

    expect(saveAs.mock.calls[0][1]).toBe('Sales 2026-creditRatingAdjustments-Version3.csv')
  })

  it('sends a Credit Rating upload to the Credit Rating endpoint and reports acceptance', async () => {
    uploadAdjustments.mockResolvedValue({ success: false, code: 202 })
    const wrapper = await mountAndSettle()

    await emitFromGrid(wrapper, 'upload-adjustments', ROW, new Blob(['x']), CREDIT_RATING)

    expect(uploadAdjustments).toHaveBeenCalledTimes(1)
    expect(uploadAdjustments.mock.calls[0][2]).toBe(CREDIT_RATING_KIND)
    // 202, not 200: the file is stored and the event published, and AR reports the rest.
    expect(toastSuccess).toHaveBeenCalledTimes(1)
    expect(toastError).not.toHaveBeenCalled()
  })

  it('asks the Credit Rating outcome endpoint for its own column', async () => {
    fetchAdjustmentsOutcome.mockResolvedValue({
      success: true,
      code: 200,
      state: 'noUploadYet',
      report: null
    })
    const wrapper = await mountAndSettle()

    await emitFromGrid(wrapper, 'outcome-adjustments', { ...ROW }, CREDIT_RATING)

    expect(fetchAdjustmentsOutcome).toHaveBeenCalledWith('version-uuid-1', CREDIT_RATING_KIND)
  })

  /**
   * The row carries one entry per waiting column. Both sit on the same row and both can be in
   * flight at once, so neither a plain `true` nor a single marker holding the last behaviour
   * clicked could say whose button to grey out.
   */
  it('marks the row with the column that is waiting, and clears it after', async () => {
    let markerWhileInFlight: any
    const row: any = { ...ROW }
    fetchAdjustmentsOutcome.mockImplementation(async () => {
      markerWhileInFlight = { ...row.outcomeLoading }
      return { success: true, code: 200, state: 'noUploadYet', report: null }
    })
    const wrapper = await mountAndSettle()

    await emitFromGrid(wrapper, 'outcome-adjustments', row, CREDIT_RATING)

    expect(markerWhileInFlight[CREDIT_RATING]).toBe(true)
    expect(row.outcomeLoading[CREDIT_RATING]).toBeUndefined()
  })

  /**
   * Found by review on this branch: one marker serves both columns, so a slow answer must not
   * clear a marker that now belongs to the other one.
   *
   * The administrator opens Peer Group, then Credit Rating on the same row before the first
   * returns. When Peer Group settles it used to null the marker unconditionally, un-greying the
   * Credit Rating button while its own call was still running — an invitation to fire a second
   * request for an answer already on its way.
   */
  /**
   * Two columns on one row can be waiting at the same time, and neither may un-grey the other.
   *
   * Both halves were found on this branch rather than reasoned out in advance. The first — a late
   * answer clearing whichever marker it found — came from `/code-review`. The second, caught on
   * the pull request, is that a single marker holding the last behaviour clicked cannot represent
   * two concurrent calls at all: opening the second column un-greyed the first while its own
   * request was still running, which is the same duplicate-request invitation from the other end.
   */
  it('keeps both columns greyed out while both are waiting, and releases them one at a time', async () => {
    const row: any = { ...ROW }
    let releasePeerGroup: (v: any) => void = () => {}
    let releaseCreditRating: (v: any) => void = () => {}

    // BOTH deferred. If either resolved on its own its finally would already have run, and the
    // assertions below would hold whether or not the per-column entries exist.
    fetchAdjustmentsOutcome
      .mockImplementationOnce(() => new Promise((resolve) => { releasePeerGroup = resolve }))
      .mockImplementationOnce(() => new Promise((resolve) => { releaseCreditRating = resolve }))

    const wrapper = await mountAndSettle()
    const grid = wrapper.findComponent({ name: 'CalculumGrid' })

    grid.vm.$emit('outcome-adjustments', row, STRATEGY)
    await wrapper.vm.$nextTick()
    expect(row.outcomeLoading[STRATEGY]).toBe(true)

    // Opening Credit Rating must not release Peer Group, which is still running.
    grid.vm.$emit('outcome-adjustments', row, CREDIT_RATING)
    await wrapper.vm.$nextTick()
    expect(row.outcomeLoading[STRATEGY]).toBe(true)
    expect(row.outcomeLoading[CREDIT_RATING]).toBe(true)

    // Peer Group answers late; Credit Rating is still open and must stay greyed out.
    releasePeerGroup({ success: true, code: 200, state: 'noUploadYet', report: null })
    await wrapper.vm.$nextTick()
    await Promise.resolve()
    await wrapper.vm.$nextTick()
    expect(row.outcomeLoading[STRATEGY]).toBeUndefined()
    expect(row.outcomeLoading[CREDIT_RATING]).toBe(true)

    releaseCreditRating({ success: true, code: 200, state: 'noUploadYet', report: null })
    await wrapper.vm.$nextTick()
    await Promise.resolve()
    await wrapper.vm.$nextTick()
    expect(row.outcomeLoading[CREDIT_RATING]).toBeUndefined()
  })

  it('still routes the Peer Group behaviour to its own endpoints', async () => {
    downloadAdjustments.mockResolvedValue({
      success: true,
      code: 200,
      data: new ArrayBuffer(8),
      fileName: 'x.xlsx'
    })
    const wrapper = await mountAndSettle()

    await emitFromGrid(wrapper, 'download-adjustments', ROW, STRATEGY)

    expect(downloadAdjustments).toHaveBeenCalledWith('version-uuid-1', STRATEGY_KIND)
  })

  /**
   * The grid emits these events for the payables columns too. An unknown behaviour has to fall
   * through rather than be routed anywhere — the table returning null is what makes that so.
   */
  it('ignores a behaviour that belongs to another column entirely', async () => {
    const wrapper = await mountAndSettle()

    await emitFromGrid(wrapper, 'download-adjustments', ROW, PAYABLES)
    await emitFromGrid(wrapper, 'upload-adjustments', ROW, new Blob(['x']), PAYABLES)
    await emitFromGrid(wrapper, 'outcome-adjustments', { ...ROW }, PAYABLES)

    expect(downloadAdjustments).not.toHaveBeenCalled()
    expect(uploadAdjustments).not.toHaveBeenCalled()
    expect(fetchAdjustmentsOutcome).not.toHaveBeenCalled()
  })
})

/**
 * A `cell` that does not match a slot renders a blank cell, and every suite stays green — the grid
 * resolves cells by name and says nothing when the name is unknown. The Peer Group column has been
 * pinned this way since UC-SET-07; these are its two siblings.
 */
describe('grid column placement', () => {
  it('puts the Credit Rating cell on the sale files grid and not on the payables one', async () => {
    const columns = await vi.importActual<any>('@/modules/adminBackend/data/columns')
    const saleFiles = columns.defaultSaleFilesGridColumns.map((c: any) => c.cell)
    const spendFiles = columns.defaultSpendFilesGridColumns.map((c: any) => c.cell)

    expect(saleFiles).toContain(CREDIT_RATING)
    expect(spendFiles).not.toContain(CREDIT_RATING)
  })

  /**
   * Both outcome columns folded into the cells they report on. Pinned as an absence because a
   * leftover definition is exactly the failure this describe block exists for: the grid resolves
   * cells by name and says nothing when the name is unknown, so a column whose slot is gone renders
   * blank and every other suite stays green.
   */
  it('no longer defines a column for either outcome', async () => {
    const columns = await vi.importActual<any>('@/modules/adminBackend/data/columns')
    const saleFiles = columns.defaultSaleFilesGridColumns.map((c: any) => c.cell)

    expect(saleFiles).not.toContain('creditRatingOutcomeColumn')
    expect(saleFiles).not.toContain('adjustmentsOutcomeColumn')
  })
})
