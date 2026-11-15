import { describe, it, expect, vi, beforeEach } from 'vitest'
import { VueWrapper } from '@vue/test-utils'
import { mountWithProviders } from '../Helpers/mountWithProviders'

// AB#20871 — the Receivables tab's Delete action.
//
// Two properties matter: nothing is asked of the server until the administrator confirms, and AR's
// refusal (the version is still being processed or calculated) reaches them in AR's own words.

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
      props: ['gridData', 'buttonText'],
      emits: ['button-action-clicked'],
      setup: () => () => h('div', { class: 'stub-grid' })
    }
  }
})

// The confirmation itself is the payables modal and is not under test; the stub keeps its contract
// (the props this view passes, the two events it listens to).
vi.mock('@/modules/components/CalculumDeleteModal.vue', async () => {
  const { h } = await import('vue')
  return {
    default: {
      name: 'CalculumDeleteModal',
      props: ['forDeleteSpendFile', 'loading'],
      emits: ['deleteSpendFile', 'hide'],
      setup: () => () => h('div', { class: 'stub-delete-modal' })
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

const deleteSaleFileVersion = vi.fn()
const saleFilesVersionsAPIReadAll = vi.fn()

vi.mock('@/modules/home/saleFiles/api', () => ({
  ADJUSTMENTS_KIND_STRATEGY: 'strategy-adjustments',
  ADJUSTMENTS_KIND_CREDIT_RATING: 'credit-rating-adjustments',
  postSaleFile: vi.fn(),
  recalculateSaleFileVersion: vi.fn(),
  deleteSaleFileVersion: (...args: any[]) => deleteSaleFileVersion(...args),
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

function modal(wrapper: VueWrapper) {
  return wrapper.findComponent({ name: 'CalculumDeleteModal' })
}

async function clickDelete(wrapper: VueWrapper): Promise<void> {
  wrapper.findComponent({ name: 'CalculumGrid' }).vm.$emit('button-action-clicked', { action: 'delete', dataItem: { ...ROW } })
  await flush(wrapper)
}

async function confirm(wrapper: VueWrapper): Promise<void> {
  modal(wrapper).vm.$emit('deleteSpendFile')
  await flush(wrapper)
}

describe('Receivables grid - Delete action', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('asks for confirmation before anything is sent', async () => {
    const wrapper = await mountAndSettle()

    await clickDelete(wrapper)

    expect(modal(wrapper).exists()).toBe(true)
    expect(deleteSaleFileVersion).not.toHaveBeenCalled()
  })

  it('cancelling closes the confirmation and sends nothing', async () => {
    const wrapper = await mountAndSettle()

    await clickDelete(wrapper)
    modal(wrapper).vm.$emit('hide')
    await flush(wrapper)

    expect(modal(wrapper).exists()).toBe(false)
    expect(deleteSaleFileVersion).not.toHaveBeenCalled()
  })

  it('deletes the confirmed version, reports it as requested and refreshes the grid', async () => {
    deleteSaleFileVersion.mockResolvedValue({ success: true, code: 200, data: { data: { status: 'deleteClaimed' } } })
    const wrapper = await mountAndSettle()
    saleFilesVersionsAPIReadAll.mockClear()

    await clickDelete(wrapper)
    await confirm(wrapper)

    expect(deleteSaleFileVersion).toHaveBeenCalledWith('version-uuid-1')
    expect(toastSuccess).toHaveBeenCalledWith('adminBackend.adminUploadData.receivablesDelete.queued')
    expect(saleFilesVersionsAPIReadAll).toHaveBeenCalledTimes(1)
    expect(modal(wrapper).exists()).toBe(false)
  })

  it("shows the server's own reason when it refuses the delete", async () => {
    deleteSaleFileVersion.mockResolvedValue({
      success: false,
      code: 403,
      data: { message: 'Authorization required.' }
    })
    const wrapper = await mountAndSettle()

    await clickDelete(wrapper)
    await confirm(wrapper)

    expect(toastError).toHaveBeenCalledWith('Authorization required.')
    expect(toastSuccess).not.toHaveBeenCalled()
  })

  it('falls back to a line that names the failure when there is no reason to quote', async () => {
    deleteSaleFileVersion.mockResolvedValue({ success: false, code: 502, data: null })
    const wrapper = await mountAndSettle()

    await clickDelete(wrapper)
    await confirm(wrapper)

    expect(toastError).toHaveBeenCalledWith('adminBackend.adminUploadData.receivablesDelete.failed')
  })

  it('ignores a second confirmation while the first request is in flight', async () => {
    deleteSaleFileVersion.mockReturnValue(new Promise(() => {}))
    const wrapper = await mountAndSettle()

    await clickDelete(wrapper)
    await confirm(wrapper)
    await confirm(wrapper)

    expect(deleteSaleFileVersion).toHaveBeenCalledTimes(1)
    expect(modal(wrapper).props('loading')).toBe(true)
  })
})

describe('grid column placement', () => {
  // The grid resolves cells by name and renders an unknown one blank, so a column pointing at a
  // slot that does not exist would pass every other case here.
  it('puts the Delete cell on the sale files grid and not on the payables one', async () => {
    const columns = await vi.importActual<any>('@/modules/adminBackend/data/columns')
    const saleFiles = columns.defaultSaleFilesGridColumns.map((c: any) => c.cell)
    const spendFiles = columns.defaultSpendFilesGridColumns.map((c: any) => c.cell)

    expect(saleFiles).toContain('deleteSaleFileVersionColumn')
    expect(spendFiles).not.toContain('deleteSaleFileVersionColumn')
  })

  it('has a slot of that name on the grid', async () => {
    const { CLIENT_GRID_SLOT_MAP } = await vi.importActual<any>(
      '@/modules/components/grid/calculum-grid/cells/clientGridSlotMap'
    )

    expect(CLIENT_GRID_SLOT_MAP.deleteSaleFileVersionColumn).toBe('DeleteSaleFileVersionColumn')
  })
})
