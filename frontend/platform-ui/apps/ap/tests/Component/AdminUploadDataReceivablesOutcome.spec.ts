import { describe, it, expect, vi, beforeEach } from 'vitest'
import { VueWrapper } from '@vue/test-utils'
import { mountWithProviders } from '../Helpers/mountWithProviders'

// AB#20259 — the missing half of UC-SET-07: what became of an uploaded adjustments file.
//
// The upload answers 202 and the administrator is told the file was accepted, never whether it
// applied. AR has recorded that since the use case shipped and nothing read it, which is what left
// defect D of AB#20259 unexplained.
//
// Every case here protects one property: AR's three answers must not collapse into two. "AR knows
// this version and nobody uploaded" and "AR has never heard of this version" read alike and mean
// different things — the second says a sale file never reached Receivables. And a proxy failure is
// none of the three: drawing it as "nothing uploaded" would report a broken conversation as calm.

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

// The `@/utils` barrel reaches the router and every view. Resolved with a plain object rather than
// an `await import` inside the factory, which hangs.
vi.mock('@/utils', () => ({
  StringUtils: {
    removeIRI: (value: string) => String(value).split('/').pop() ?? '',
    isNullUndefinedOrEmpty: (value: unknown) => value === null || value === undefined || value === ''
  }
}))

const fetchStrategyAdjustmentsOutcome = vi.fn()

vi.mock('@/modules/home/saleFiles/api', () => ({
  ADJUSTMENTS_KIND_STRATEGY: 'strategy-adjustments',
  ADJUSTMENTS_KIND_CREDIT_RATING: 'credit-rating-adjustments',
  postSaleFile: vi.fn(),
  recalculateSaleFileVersion: vi.fn(),
  saleFilesVersionsAPIReadAll: vi.fn().mockResolvedValue({ success: true, data: [] }),
  saleFilesVersionsByCompanyAPIReadAll: vi.fn().mockResolvedValue({ success: true, data: [] }),
  downloadAdjustments: vi.fn(),
  uploadAdjustments: vi.fn(),
  fetchAdjustmentsOutcome: (...args: any[]) => fetchStrategyAdjustmentsOutcome(...args),
  ADJUSTMENTS_OUTCOME_REPORTED: 'reported',
  ADJUSTMENTS_OUTCOME_NO_UPLOAD_YET: 'noUploadYet',
  ADJUSTMENTS_OUTCOME_VERSION_UNKNOWN: 'versionUnknownToReceivables'
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

/** The grid emits which column was clicked; UC-SET-08 added a second one. */
const AR_BEHAVIOR = 'peerGroupAndBuyerStandardAdjustments'

const ROW = { uuid: 'version-uuid-1', saleFileName: 'Sales 2026.xlsx', version: 3 }

const REPORT = {
  objectKey: 'adjustments/version-uuid-1/edited.csv',
  uploadedByEmail: 'anabeisy@calculum.ai',
  status: 'Applied',
  rowsMatched: 184,
  valuesWritten: 6,
  valuesCleared: 25,
  valuesUnchanged: 1103,
  rejections: [{ lineNumber: 47, sourceUniqueId: 'BU-10231', reason: 'matches no line of this version.' }],
  completedAt: '2026-09-11T19:04:00+00:00'
}

async function mountAndSettle(): Promise<VueWrapper> {
  const wrapper = mountWithProviders(AdminUploadDataReceivables)
  await wrapper.vm.$nextTick()
  return wrapper
}

async function askForOutcome(wrapper: VueWrapper): Promise<void> {
  wrapper.findComponent({ name: 'CalculumGrid' }).vm.$emit('outcome-adjustments', ROW, AR_BEHAVIOR)
  await wrapper.vm.$nextTick()
  await Promise.resolve()
  await wrapper.vm.$nextTick()
}

describe('Receivables adjustments outcome', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('asks the proxy for the row it was given, by version uuid', async () => {
    fetchStrategyAdjustmentsOutcome.mockResolvedValue({ success: true, state: 'reported', report: REPORT })

    await askForOutcome(await mountAndSettle())

    expect(fetchStrategyAdjustmentsOutcome).toHaveBeenCalledWith(ROW.uuid, 'strategy-adjustments')
  })

  it('opens the detail with the report when a file was processed', async () => {
    fetchStrategyAdjustmentsOutcome.mockResolvedValue({ success: true, state: 'reported', report: REPORT })

    const wrapper = await mountAndSettle()
    await askForOutcome(wrapper)

    expect((wrapper.vm as any).outcomeModalOpen).toBe(true)
    expect((wrapper.vm as any).outcomeState).toBe('reported')
    expect((wrapper.vm as any).outcomeReport.valuesWritten).toBe(6)
  })

  // The four counters stay four: one figure would let an upload that matched 184 rows and changed
  // nothing read as one that worked.
  it('keeps the four counters apart', async () => {
    fetchStrategyAdjustmentsOutcome.mockResolvedValue({ success: true, state: 'reported', report: REPORT })

    const wrapper = await mountAndSettle()
    await askForOutcome(wrapper)

    const report = (wrapper.vm as any).outcomeReport
    expect([report.rowsMatched, report.valuesWritten, report.valuesCleared, report.valuesUnchanged])
      .toEqual([184, 6, 25, 1103])
  })

  it('carries the rejections through with their line number and key', async () => {
    fetchStrategyAdjustmentsOutcome.mockResolvedValue({ success: true, state: 'reported', report: REPORT })

    const wrapper = await mountAndSettle()
    await askForOutcome(wrapper)

    const [first] = (wrapper.vm as any).outcomeReport.rejections
    expect(first.lineNumber).toBe(47)
    expect(first.sourceUniqueId).toBe('BU-10231')
  })

  it('opens the detail for a version nobody has uploaded against', async () => {
    fetchStrategyAdjustmentsOutcome.mockResolvedValue({ success: true, state: 'noUploadYet', report: null })

    const wrapper = await mountAndSettle()
    await askForOutcome(wrapper)

    expect((wrapper.vm as any).outcomeModalOpen).toBe(true)
    expect((wrapper.vm as any).outcomeState).toBe('noUploadYet')
  })

  // The pair that must never merge. A version AR has never heard of is a finding about the sale
  // file, not an absence of adjustments.
  it('distinguishes a version AR has never heard of from one with no upload', async () => {
    fetchStrategyAdjustmentsOutcome.mockResolvedValue({
      success: true,
      state: 'versionUnknownToReceivables',
      report: null
    })

    const wrapper = await mountAndSettle()
    await askForOutcome(wrapper)

    expect((wrapper.vm as any).outcomeState).toBe('versionUnknownToReceivables')
    expect((wrapper.vm as any).outcomeState).not.toBe('noUploadYet')
  })

  // A 502 is not an answer about the version. Reporting it as "nothing uploaded" would tell the
  // administrator their data is fine when the platform could not be asked.
  it('reports a failed proxy as an error and does not open the detail', async () => {
    fetchStrategyAdjustmentsOutcome.mockResolvedValue({
      success: false,
      data: { message: 'The Receivables platform could not be reached.' }
    })

    const wrapper = await mountAndSettle()
    await askForOutcome(wrapper)

    expect(toastError).toHaveBeenCalled()
    expect((wrapper.vm as any).outcomeModalOpen).toBe(false)
  })

  // Review finding on PR 14633. Two rows asked for in a row, the first answering last: without
  // correlating the response to the row it was asked for, the modal shows row B's file name and
  // version above row A's counters and rejections. Attributing one version's adjustments report to
  // another version is the exact confusion this whole column exists to prevent.
  it('discards a response whose row is no longer the one being asked about', async () => {
    const ROW_B = { uuid: 'version-uuid-2', saleFileName: 'Other 2026.xlsx', version: 9 }
    const REPORT_B = { ...REPORT, valuesWritten: 999 }

    let resolveA: (value: unknown) => void = () => {}
    fetchStrategyAdjustmentsOutcome
      .mockImplementationOnce(() => new Promise((resolve) => { resolveA = resolve }))
      .mockResolvedValueOnce({ success: true, state: 'reported', report: REPORT_B })

    const wrapper = await mountAndSettle()
    const grid = wrapper.findComponent({ name: 'CalculumGrid' })

    grid.vm.$emit('outcome-adjustments', ROW, AR_BEHAVIOR)
    await wrapper.vm.$nextTick()

    grid.vm.$emit('outcome-adjustments', ROW_B, AR_BEHAVIOR)
    await wrapper.vm.$nextTick()
    await Promise.resolve()
    await wrapper.vm.$nextTick()

    // A answers last, and must not overwrite B.
    resolveA({ success: true, state: 'reported', report: REPORT })
    await wrapper.vm.$nextTick()
    await Promise.resolve()
    await wrapper.vm.$nextTick()

    expect((wrapper.vm as any).outcomeRow.uuid).toBe(ROW_B.uuid)
    expect((wrapper.vm as any).outcomeReport.valuesWritten).toBe(999)
  })

  // Review finding on PR 14633. The modal body renders only for the three known states, so an
  // unrecognised one opened a dialog carrying the file name and nothing else — reporting a
  // non-answer as calm, the failure the rest of this change is built to avoid.
  it('does not open a blank detail for a state it cannot render', async () => {
    fetchStrategyAdjustmentsOutcome.mockResolvedValue({ success: true, state: undefined, report: null })

    const wrapper = await mountAndSettle()
    await askForOutcome(wrapper)

    expect((wrapper.vm as any).outcomeModalOpen).toBe(false)
    expect(toastError).toHaveBeenCalled()
  })

  /** `reported` with no report is the same non-answer wearing a known state's name. */
  it('does not open a blank detail for a report that is missing', async () => {
    fetchStrategyAdjustmentsOutcome.mockResolvedValue({ success: true, state: 'reported', report: null })

    const wrapper = await mountAndSettle()
    await askForOutcome(wrapper)

    expect((wrapper.vm as any).outcomeModalOpen).toBe(false)
    expect(toastError).toHaveBeenCalled()
  })

  // The instant AR reports carries microseconds and an offset, and reached the panel raw:
  // "2026-09-11T19:03:26.734166+00:00" was the only unreadable thing on screen.
  it('renders the completion instant as a date rather than as AR sent it', async () => {
    fetchStrategyAdjustmentsOutcome.mockResolvedValue({ success: true, state: 'reported', report: REPORT })

    const wrapper = await mountAndSettle()
    await askForOutcome(wrapper)

    const line = (wrapper.vm as any).outcomeSummaryLine
    expect(line).not.toContain('2026-09-11T19:04:00+00:00')
    expect(line).not.toContain('T19:04')
    expect(line).toContain('2026')
  })

  it('carries the status and the uploader in the same line', async () => {
    fetchStrategyAdjustmentsOutcome.mockResolvedValue({ success: true, state: 'reported', report: REPORT })

    const wrapper = await mountAndSettle()
    await askForOutcome(wrapper)

    const line = (wrapper.vm as any).outcomeSummaryLine
    expect(line).toContain('Applied')
    expect(line).toContain('anabeisy@calculum.ai')
  })

  // `uploadedByEmail` is null by AR's contract - a file applied by a job rather than a person.
  // Interpolating around fixed separators left a dangling one with nothing on one side.
  it('leaves no dangling separator when nobody is named as the uploader', async () => {
    fetchStrategyAdjustmentsOutcome.mockResolvedValue({
      success: true,
      state: 'reported',
      report: { ...REPORT, uploadedByEmail: null }
    })

    const wrapper = await mountAndSettle()
    await askForOutcome(wrapper)

    const line = (wrapper.vm as any).outcomeSummaryLine
    expect(line).not.toContain('· ·')
    expect(line.trim()).toBe(line)
    expect(line).toContain('Applied')
  })

  // An instant the browser cannot parse formats to an empty string. Showing the raw value keeps
  // the only trace of what Receivables actually reported, where a blank would discard it.
  it('falls back to the raw instant rather than showing nothing', async () => {
    fetchStrategyAdjustmentsOutcome.mockResolvedValue({
      success: true,
      state: 'reported',
      report: { ...REPORT, completedAt: 'not-an-instant' }
    })

    const wrapper = await mountAndSettle()
    await askForOutcome(wrapper)

    expect((wrapper.vm as any).outcomeSummaryLine).toContain('not-an-instant')
  })

  it('surfaces the platform own reason rather than a generic failure', async () => {
    fetchStrategyAdjustmentsOutcome.mockResolvedValue({
      success: false,
      data: { message: 'The Receivables platform rejected this application service key.' }
    })

    await askForOutcome(await mountAndSettle())

    expect(toastError).toHaveBeenCalledWith(
      expect.stringContaining('service key')
    )
  })
})
