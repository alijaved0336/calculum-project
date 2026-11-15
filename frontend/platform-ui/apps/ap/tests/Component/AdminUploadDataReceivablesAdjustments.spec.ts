import { describe, it, expect, vi, beforeEach } from 'vitest'
import { VueWrapper } from '@vue/test-utils'
import { mountWithProviders } from '../Helpers/mountWithProviders'

// AB#19711 / UC-SET-07 — the Peer Group & Buyer Standard Adjustments column of the Receivables tab.
//
// Exercises the two things the acceptance criteria turn on and nothing else: that a failed proxy
// reaches the user as AR's own reason rather than as a file, and that an accepted upload is
// reported as accepted rather than as applied. Both are cases where the code that looks right
// silently produces the wrong outcome — a downloaded error body, or a "saved" toast for figures
// that have not been applied yet.

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

// Emits the pair of events the real DownloadUpload cell emits, so the view's handlers are driven
// through the same path the grid uses rather than being called directly.
vi.mock('@/modules/components/grid/CalculumGrid.vue', async () => {
  const { h } = await import('vue')
  return {
    default: {
      name: 'CalculumGrid',
      emits: ['download-adjustments', 'upload-adjustments'],
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

// See AdminUploadDataReceivablesSelector.spec.ts: the `@/utils` barrel reaches the router and every
// view. Resolved with a plain object rather than an `await import` inside the factory, which hangs.
vi.mock('@/utils', () => ({
  StringUtils: {
    removeIRI: (value: string) => String(value).split('/').pop() ?? '',
    isNullUndefinedOrEmpty: (value: unknown) => value === null || value === undefined || value === ''
  }
}))

const downloadStrategyAdjustments = vi.fn()
const uploadStrategyAdjustments = vi.fn()

vi.mock('@/modules/home/saleFiles/api', () => ({
  ADJUSTMENTS_KIND_STRATEGY: 'strategy-adjustments',
  ADJUSTMENTS_KIND_CREDIT_RATING: 'credit-rating-adjustments',
  postSaleFile: vi.fn(),
  recalculateSaleFileVersion: vi.fn(),
  saleFilesVersionsAPIReadAll: vi.fn().mockResolvedValue({ success: true, data: [] }),
  saleFilesVersionsByCompanyAPIReadAll: vi.fn().mockResolvedValue({ success: true, data: [] }),
  downloadAdjustments: (...args: any[]) => downloadStrategyAdjustments(...args),
  uploadAdjustments: (...args: any[]) => uploadStrategyAdjustments(...args)
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

const AR_BEHAVIOR = 'peerGroupAndBuyerStandardAdjustments'
const PAYABLES_BEHAVIOR = 'peerGroupAndSupplierStandardAdjustments'

const ROW = {
  uuid: 'version-uuid-1',
  saleFileName: 'Sales 2026.xlsx',
  version: 3
}

/** JSON error body as it actually arrives on the download path: an ArrayBuffer, not an object. */
function jsonArrayBuffer(payload: object): ArrayBuffer {
  const encoded = new TextEncoder().encode(JSON.stringify(payload))
  // Copied into a standalone buffer so the assertion is about an ArrayBuffer, matching axios.
  return encoded.buffer.slice(encoded.byteOffset, encoded.byteOffset + encoded.byteLength) as ArrayBuffer
}

async function mountAndSettle(): Promise<VueWrapper> {
  const wrapper = mountWithProviders(AdminUploadDataReceivables)
  await wrapper.vm.$nextTick()
  return wrapper
}

async function emitFromGrid(wrapper: VueWrapper, event: string, ...args: any[]): Promise<void> {
  wrapper.findComponent({ name: 'CalculumGrid' }).vm.$emit(event, ...args)
  // The handler awaits the api call before touching the toast or the file saver.
  await wrapper.vm.$nextTick()
  await Promise.resolve()
  await wrapper.vm.$nextTick()
}

describe('Receivables adjustments column - download', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('saves under the name the server sent, when it sent one', async () => {
    // Review finding on PR 14274: the api wrapper dropped the response headers, so the filename the
    // proxy sets in Content-Disposition never reached here and every download used the generated
    // fallback instead.
    downloadStrategyAdjustments.mockResolvedValue({
      success: true,
      code: 200,
      data: new ArrayBuffer(8),
      fileName: 'Sales 2026-adjustments.xlsx',
      contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    })
    const wrapper = await mountAndSettle()

    await emitFromGrid(wrapper, 'download-adjustments', ROW, AR_BEHAVIOR)

    expect(downloadStrategyAdjustments).toHaveBeenCalledWith('version-uuid-1', 'strategy-adjustments')
    expect(saveAs).toHaveBeenCalledTimes(1)
    expect(saveAs.mock.calls[0][1]).toBe('Sales 2026-adjustments.xlsx')
    // The Blob carries the served type, so the OS can associate the saved file.
    expect((saveAs.mock.calls[0][0] as Blob).type).toBe(
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    )
    expect(toastError).not.toHaveBeenCalled()
  })

  it('falls back to a generated name that still carries an extension', async () => {
    // The other half of the same finding: the generated fallback appended no extension at all, so
    // the saved file could not be reopened to edit and upload back — the point of the column.
    downloadStrategyAdjustments.mockResolvedValue({
      success: true,
      code: 200,
      data: new ArrayBuffer(8),
      contentType: 'text/csv'
    })
    const wrapper = await mountAndSettle()

    await emitFromGrid(wrapper, 'download-adjustments', ROW, AR_BEHAVIOR)

    expect(saveAs.mock.calls[0][1]).toBe('Sales 2026-strategyAdjustments-Version3.csv')
  })

  it('still names the file when the server sent neither header', async () => {
    downloadStrategyAdjustments.mockResolvedValue({ success: true, code: 200, data: new ArrayBuffer(8) })
    const wrapper = await mountAndSettle()

    await emitFromGrid(wrapper, 'download-adjustments', ROW, AR_BEHAVIOR)

    // .xlsx by default rather than no extension: an unopenable file is worse than a wrong guess.
    expect(saveAs.mock.calls[0][1]).toBe('Sales 2026-strategyAdjustments-Version3.xlsx')
  })

  it('shows the reason AR gave and saves nothing when the proxy fails', async () => {
    // AC 2. The body is an ArrayBuffer because the request asks for one, so AR's message has to be
    // decoded out of it — without that this fell through to the generic line and the useful half of
    // the answer was discarded.
    downloadStrategyAdjustments.mockResolvedValue({
      success: false,
      code: 502,
      data: jsonArrayBuffer({ message: 'The Receivables platform could not be reached.' })
    })
    const wrapper = await mountAndSettle()

    await emitFromGrid(wrapper, 'download-adjustments', ROW, AR_BEHAVIOR)

    expect(saveAs).not.toHaveBeenCalled()
    expect(toastError).toHaveBeenCalledWith('The Receivables platform could not be reached.')
  })

  it('falls back to a generic line rather than showing undefined on an unreadable body', async () => {
    downloadStrategyAdjustments.mockResolvedValue({ success: false, code: 502, data: jsonArrayBuffer({}) })
    const wrapper = await mountAndSettle()

    await emitFromGrid(wrapper, 'download-adjustments', ROW, AR_BEHAVIOR)

    expect(toastError).toHaveBeenCalledWith('global.noty.error.tryAgainLater')
  })

  it('ignores the payables column event', async () => {
    // AC 1. CalculumGrid emits this pair for every DownloadUpload column it renders; acting on a
    // payables one here would call the AR endpoint for a spend file version's uuid.
    const wrapper = await mountAndSettle()

    await emitFromGrid(wrapper, 'download-adjustments', ROW, PAYABLES_BEHAVIOR)

    expect(downloadStrategyAdjustments).not.toHaveBeenCalled()
  })

  it('does nothing for a row with no uuid', async () => {
    const wrapper = await mountAndSettle()

    await emitFromGrid(wrapper, 'download-adjustments', { saleFileName: 'x.xlsx' }, AR_BEHAVIOR)

    expect(downloadStrategyAdjustments).not.toHaveBeenCalled()
  })
})

describe('Receivables adjustments column - upload', () => {
  const FILE = { name: 'adjusted.csv' }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('reports acceptance, not success, on the 202 the endpoint answers with', async () => {
    // AC 3, and the defect this test exists for: `giveAnswer` counts only 200/201/204 as success,
    // so a 202 arrives with success:false and an accepted upload was reported as an error.
    uploadStrategyAdjustments.mockResolvedValue({ success: false, code: 202, data: { message: 'accepted' } })
    const wrapper = await mountAndSettle()

    await emitFromGrid(wrapper, 'upload-adjustments', ROW, FILE, AR_BEHAVIOR)

    expect(uploadStrategyAdjustments).toHaveBeenCalledWith(FILE, 'version-uuid-1', 'strategy-adjustments')
    expect(toastSuccess).toHaveBeenCalledWith('adminBackend.adminUploadData.adjustmentsAccepted')
    expect(toastError).not.toHaveBeenCalled()
  })

  it('surfaces the failure when the file is rejected', async () => {
    uploadStrategyAdjustments.mockResolvedValue({
      success: false,
      code: 400,
      data: { message: 'File is not a allowed Excel file' }
    })
    const wrapper = await mountAndSettle()

    await emitFromGrid(wrapper, 'upload-adjustments', ROW, FILE, AR_BEHAVIOR)

    expect(toastSuccess).not.toHaveBeenCalled()
    expect(toastError).toHaveBeenCalledWith('File is not a allowed Excel file')
  })

  it('ignores the payables column event', async () => {
    const wrapper = await mountAndSettle()

    await emitFromGrid(wrapper, 'upload-adjustments', ROW, FILE, PAYABLES_BEHAVIOR)

    expect(uploadStrategyAdjustments).not.toHaveBeenCalled()
  })

  it('does nothing when the file dialog was dismissed', async () => {
    const wrapper = await mountAndSettle()

    await emitFromGrid(wrapper, 'upload-adjustments', ROW, null, AR_BEHAVIOR)

    expect(uploadStrategyAdjustments).not.toHaveBeenCalled()
  })
})

// The columns module is mocked above for the mount, so these read the real one through
// importActual. AC 1: the two columns are siblings, and the payables grid is untouched.
describe('grid column placement', () => {
  it('puts the adjustments cell on the sale files grid', async () => {
    const columns = await vi.importActual<any>('@/modules/adminBackend/data/columns')

    expect(columns.defaultSaleFilesGridColumns.map((c: any) => c.cell)).toContain(AR_BEHAVIOR)
  })

  it('leaves the payables grid with its own column and not the AR one', async () => {
    const columns = await vi.importActual<any>('@/modules/adminBackend/data/columns')
    const cells = columns.defaultSpendFilesGridColumns.map((c: any) => c.cell)

    expect(cells).toContain(PAYABLES_BEHAVIOR)
    expect(cells).not.toContain(AR_BEHAVIOR)
  })
})
