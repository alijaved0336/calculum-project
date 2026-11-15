import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'
import { createPinia, setActivePinia } from 'pinia'

// The Apollo client is the boundary: the REAL page fetcher runs, so the variables the export reads
// are the ones the grid actually sent.
const query = vi.fn()
vi.mock('@/services/graphql/apolloClient', () => ({
  apolloClient: { query: (...args: unknown[]) => query(...args) },
}))

// Mocked at the HTTP module (a concrete path), not the `@/api` barrel: the summary and chart calls
// are real `@/api` functions that end in `post`.
const post = vi.fn()
vi.mock('@/api/http', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  post: (...args: unknown[]) => post(...args),
}))
const SUMMARY = { sum: {}, weightedCeilingAverage: {}, weightedAverage: {}, countTrue: {}, totalCount: 0 }

const startGridExport = vi.fn()
vi.mock('@/api/gridExport', () => ({
  startGridExport: (...args: unknown[]) => startGridExport(...args),
  getGridExportStatus: vi.fn(),
  cancelGridExport: vi.fn().mockResolvedValue(true),
  downloadGridExport: vi.fn(),
}))

vi.mock('@ada/design-system/components/graphql-grid/Index.vue', () => ({
  default: {
    name: 'GraphqlGrid',
    props: [
      'items', 'total', 'skip', 'take', 'sort', 'loading', 'pageable', 'dataItemKey', 'columns',
      'columnSelectorDefaultColumns', 'totalsByColumns', 'loadingTotals', 'analyzeStore',
      'allowExport', 'exportLabel', 'optionsLabel',
    ],
    emits: ['datastatechange', 'update:columns', 'export'],
    template: '<div class="grid" />',
  },
}))

import NineBoxRowsGrid from '@/modules/opportunity/components/NineBoxRowsGrid.vue'
import { useArCurrentUserStore } from '@/stores/arCurrentUser'

const VERSION = '1653c234-9318-4707-a6c3-33f4b427126c'

const i18n = createI18n({
  legacy: false,
  locale: 'en',
  messages: {
    en: {
      home: { analyze: { list: { largeExportTitle: 'Large export' } } },
      arGridExport: {
        largeExportWarning: '{count} rows',
        continue: 'Continue',
        cancel: 'Cancel',
        cancelExport: 'Cancel export',
        dismiss: 'Dismiss',
        exportLabel: 'Export Excel',
        optionsLabel: 'Options',
        fileName: { nineBox: 'Buyer Prioritization file', nineBoxUnranked: 'Unranked file' },
      },
    },
  },
})

type PageDocument = { definitions: Array<{ selectionSet: { selections: Array<{ name: { value: string } }> } }> }

function setPermission(allowed: boolean) {
  useArCurrentUserStore().setUser({
    email: 'a@b.c', idps: 'x', authenticationSource: 'x', sessionExpiresAt: 0,
    roles: allowed ? ['ROLE_USER', 'ROLE_COMPANY_ADMIN', 'FEATURE_DOWNLOAD_EXCEL'] : ['ROLE_USER'],
  })
}

const mounted: Array<{ unmount: () => void }> = []

async function mountGrid(props: Record<string, unknown> = {}) {
  const wrapper = mount(NineBoxRowsGrid, {
    props: { versionUuid: VERSION, level: 'buyers', selectedBoxes: [4, 7], ...props },
    global: { plugins: [i18n] },
  })
  mounted.push(wrapper)
  await flushPromises()
  return wrapper
}

const grid = (wrapper: Awaited<ReturnType<typeof mountGrid>>) => wrapper.findComponent({ name: 'GraphqlGrid' })
const lastPageVariables = () => (query.mock.lastCall![0] as { variables: Record<string, unknown> }).variables

describe('NineBoxRowsGrid export', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    post.mockReset().mockResolvedValue(SUMMARY)
    query.mockReset().mockImplementation(async ({ query: document }: { query: PageDocument }) => ({
      data: { [document.definitions[0].selectionSet.selections[0].name.value]: { items: [], totalCount: 12 } },
    }))
    startGridExport.mockReset().mockResolvedValue({ kind: 'job', jobId: 'job-1' })
    setPermission(true)
  })

  afterEach(() => {
    mounted.splice(0).forEach((wrapper) => wrapper.unmount())
  })

  it('offers the export only to a user the server allows to export lists', async () => {
    setPermission(false)
    expect(grid(await mountGrid()).props('allowExport')).toBe(false)

    setPermission(true)
    const allowed = await mountGrid()
    expect(grid(allowed).props('allowExport')).toBe(true)
    expect(grid(allowed).props('exportLabel')).toBe('Export Excel')
    expect(grid(allowed).props('optionsLabel')).toBe('Options')
  })

  it('exports the buyer list as NineBoxRows with the box selection in the where the grid sent', async () => {
    const wrapper = await mountGrid()
    const sent = lastPageVariables()

    grid(wrapper).vm.$emit('export')
    await flushPromises()

    expect(startGridExport).toHaveBeenCalledOnce()
    const [kind, request] = startGridExport.mock.calls[0]
    expect(kind).toBe('NineBoxRows')
    expect(request).toMatchObject({
      versionUuid: VERSION,
      where: { nineBox: { in: [4, 7] } },
      order: sent.order,
      currencyRate: sent.currencyRate,
      fileName: 'Buyer Prioritization file',
    })
    expect(request.where).toEqual(sent.where)

  })

  it('sends the visible columns by GraphQL name, in display order, without hidden, client-only or custom ones', async () => {
    const wrapper = await mountGrid()

    grid(wrapper).vm.$emit('update:columns', [
      { field: 'name', title: 'Buying Entity' },
      { field: 'originalName', title: 'Original name', hidden: true },
      { field: 'volume', title: 'Spend Volume' },
      { field: 'cashFlowAgreed', title: 'Cash Flow (Agreed)' },
      { field: 'customDataPoint5', title: 'Segment' },
      { field: 'nineBox', title: 'Box' },
    ])
    await flushPromises()
    grid(wrapper).vm.$emit('export')
    await flushPromises()

    expect(startGridExport.mock.lastCall![1].columns).toEqual([
      { field: 'name', title: 'Buying Entity', hidden: false },
      { field: 'volume', title: 'Spend Volume', hidden: false },
      { field: 'nineBox', title: 'Box', hidden: false },
    ])
  })

  it('exports nothing once the version is gone, rather than the previous version\'s request', async () => {
    const wrapper = await mountGrid()
    await wrapper.setProps({ versionUuid: null })
    await flushPromises()

    grid(wrapper).vm.$emit('export')
    await flushPromises()

    expect(startGridExport).not.toHaveBeenCalled()
  })

  it('falls back to an empty grid when a page fails to load, and exports nothing from it', async () => {
    const wrapper = await mountGrid()
    expect(grid(wrapper).props('total')).toBe(12)

    query.mockRejectedValue(new Error('boom'))
    grid(wrapper).vm.$emit('datastatechange', { skip: 25, take: 25, sort: [] })
    await flushPromises()

    expect(grid(wrapper).props('total')).toBe(0)
    expect(grid(wrapper).props('loading')).toBe(false)

    grid(wrapper).vm.$emit('export')
    await flushPromises()

    expect(startGridExport).not.toHaveBeenCalled()
  })

  it('exports the Unranked instance by its own where and name', async () => {
    const wrapper = await mountGrid({ unranked: true })

    grid(wrapper).vm.$emit('export')
    await flushPromises()

    expect(startGridExport.mock.lastCall![1]).toMatchObject({
      where: { nineBox: { eq: null } },
      fileName: 'Unranked file',
    })
  })

  it('exports the other levels through their own Opportunity kind, since NineBoxRows is the buyer projection', async () => {
    const saleLines = await mountGrid({ level: 'saleLines' })
    grid(saleLines).vm.$emit('export')
    await flushPromises()
    expect(startGridExport.mock.lastCall![0]).toBe('OpportunitySaleLines')
    expect(startGridExport.mock.lastCall![1].where).toEqual({ nineBox: { in: [4, 7] } })

    startGridExport.mockClear()
    const parents = await mountGrid({ level: 'parents' })
    grid(parents).vm.$emit('export')
    await flushPromises()
    // The sale-line export is still running on its own grid; the parents grid has its own exporter.
    expect(startGridExport.mock.lastCall![0]).toBe('OpportunityParents')
    expect(startGridExport.mock.lastCall![1].where).toEqual({ nineBox: { in: [4, 7] } })
  })

  it('says why nothing is exported while a page is still loading, and sends no request', async () => {
    const wrapper = await mountGrid()
    query.mockReturnValue(new Promise(() => undefined))
    grid(wrapper).vm.$emit('datastatechange', { skip: 25, take: 25, sort: [] })
    await flushPromises()
    expect(grid(wrapper).props('loading')).toBe(true)

    grid(wrapper).vm.$emit('export')
    await flushPromises()

    expect(startGridExport).not.toHaveBeenCalled()
    const status = wrapper.find('.grid-export-status--notice')
    expect(status.exists()).toBe(true)
    expect(status.text()).toContain('The list is still loading. Try Export again in a moment.')
  })
})
