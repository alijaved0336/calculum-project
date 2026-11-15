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
      'items', 'total', 'skip', 'take', 'sort', 'filter', 'loading', 'dataItemKey', 'columns',
      'columnSelectorDefaultColumns', 'totalsByColumns', 'loadingTotals', 'analyzeStore',
      'allowExport', 'exportLabel', 'optionsLabel',
    ],
    emits: ['datastatechange', 'update:columns', 'export'],
    template: '<div class="grid" />',
  },
}))

import OverviewList from '@/modules/opportunity/components/OverviewList.vue'
import { useContextStore } from '@/stores/context'
import { useArCurrentUserStore } from '@/stores/arCurrentUser'
import { LARGE_EXPORT_THRESHOLD } from '@/composables/useArGridExport'

const VERSION = '1653c234-9318-4707-a6c3-33f4b427126c'

const i18n = createI18n({
  legacy: false,
  locale: 'en',
  messages: {
    en: {
      arOpportunity: { list: { tabs: { saleLines: 'Sales Lines', buyers: 'Buying Entities', parents: 'Ultimate Parents' } } },
      home: { analyze: { list: { largeExportTitle: 'Large export' } } },
      arGridExport: {
        largeExportWarning: '{count} rows',
        continue: 'Continue',
        cancel: 'Cancel',
        cancelExport: 'Cancel export',
        dismiss: 'Dismiss',
        exportLabel: 'Export Excel',
        optionsLabel: 'Options',
        fileName: { saleLines: 'Sales Lines file', buyers: 'Buyers file', parents: 'Parents file' },
      },
    },
  },
})

type PageDocument = { definitions: Array<{ selectionSet: { selections: Array<{ name: { value: string } }> } }> }

/** Answers whichever collection field the document asks for. */
function answerWith(total: number) {
  query.mockImplementation(async ({ query: document }: { query: PageDocument }) => ({
    data: { [document.definitions[0].selectionSet.selections[0].name.value]: { items: [], totalCount: total } },
  }))
}

function setPermission(allowed: boolean) {
  useArCurrentUserStore().setUser({
    email: 'a@b.c', idps: 'x', authenticationSource: 'x', sessionExpiresAt: 0,
    roles: allowed ? ['ROLE_USER', 'ROLE_COMPANY_ADMIN', 'FEATURE_DOWNLOAD_EXCEL'] : ['ROLE_USER'],
  })
}

const mounted: Array<{ unmount: () => void }> = []

async function mountList() {
  const wrapper = mount(OverviewList, { global: { plugins: [i18n] } })
  mounted.push(wrapper)
  await flushPromises()
  return wrapper
}

const grid = (wrapper: Awaited<ReturnType<typeof mountList>>) => wrapper.findComponent({ name: 'GraphqlGrid' })
const lastPageVariables = () => (query.mock.lastCall![0] as { variables: Record<string, unknown> }).variables

describe('OverviewList export', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    query.mockReset()
    answerWith(40)
    post.mockReset().mockResolvedValue(SUMMARY)
    startGridExport.mockReset().mockResolvedValue({ kind: 'job', jobId: 'job-1' })
    useContextStore().setVersion(7, VERSION)
    setPermission(true)
  })

  afterEach(() => {
    // Leaving the page cancels a running export (and its poll timer) with the component.
    mounted.splice(0).forEach((wrapper) => wrapper.unmount())
  })

  it('offers the export only to a user the server allows to export lists', async () => {
    setPermission(false)
    const denied = await mountList()
    expect(grid(denied).props('allowExport')).toBe(false)

    setPermission(true)
    const allowed = await mountList()
    expect(grid(allowed).props('allowExport')).toBe(true)
    expect(grid(allowed).props('exportLabel')).toBe('Export Excel')
    expect(grid(allowed).props('optionsLabel')).toBe('Options')
  })

  it('exports the sale-line level with the last query variables and the visible GraphQL columns', async () => {
    const wrapper = await mountList()
    // A column filter the analyst typed: it travels in the page query's `where`, and must reach the
    // export unchanged.
    grid(wrapper).vm.$emit('datastatechange', {
      skip: 25, take: 25, sort: [{ field: 'volume', dir: 'asc' }],
      filter: { logic: 'and', filters: [{ field: 'currency', operator: 'eq', value: 'EUR' }] },
    })
    await flushPromises()
    const sent = lastPageVariables()

    grid(wrapper).vm.$emit('export')
    await flushPromises()

    expect(startGridExport).toHaveBeenCalledOnce()
    const [kind, request] = startGridExport.mock.calls[0]
    expect(kind).toBe('OpportunitySaleLines')
    expect(request).toMatchObject({
      versionUuid: VERSION,
      where: sent.where,
      order: sent.order,
      currencyRate: sent.currencyRate,
      customFilters: null,
      customSorts: null,
      fileName: 'Sales Lines file',
    })
    expect(JSON.stringify(request.where)).toContain('EUR')
    expect(request.order).toEqual([{ volume: 'ASC' }])

    expect(request.columns.every((column: { hidden: boolean }) => column.hidden === false)).toBe(true)
  })

  it('sends the visible columns by GraphQL name, in display order, without hidden, client-only or custom ones', async () => {
    const wrapper = await mountList()

    grid(wrapper).vm.$emit('update:columns', [
      { field: 'buyerName', title: 'Buying Entity' },
      { field: 'alias', title: 'Alias', hidden: true },
      { field: 'volume', title: 'Spend Volume' },
      { field: 'paymentTermsAgreed', title: 'Payment Terms (Agreed)' },
      { field: 'customDataPoint2', title: 'Region manager' },
      { field: 'currency', title: 'Currency' },
    ])
    await flushPromises()
    grid(wrapper).vm.$emit('export')
    await flushPromises()

    expect(startGridExport.mock.lastCall![1].columns).toEqual([
      { field: 'buyerName', title: 'Buying Entity', hidden: false },
      { field: 'volume', title: 'Spend Volume', hidden: false },
      { field: 'currency', title: 'Currency', hidden: false },
    ])
  })

  it('exports nothing once the version is gone, rather than the previous version\'s request', async () => {
    const wrapper = await mountList()
    useContextStore().clear()
    await flushPromises()

    grid(wrapper).vm.$emit('export')
    await flushPromises()

    expect(startGridExport).not.toHaveBeenCalled()
  })

  it('falls back to an empty grid when a page fails to load, and exports nothing from it', async () => {
    const wrapper = await mountList()
    expect(grid(wrapper).props('total')).toBe(40)

    query.mockRejectedValue(new Error('boom'))
    grid(wrapper).vm.$emit('datastatechange', { skip: 25, take: 25, sort: [] })
    await flushPromises()

    // Handled in loadPage (no unhandled rejection): the previous page's rows and count are gone.
    expect(grid(wrapper).props('items')).toEqual([])
    expect(grid(wrapper).props('total')).toBe(0)
    expect(grid(wrapper).props('loading')).toBe(false)

    grid(wrapper).vm.$emit('export')
    await flushPromises()

    expect(startGridExport).not.toHaveBeenCalled()
  })

  it('maps the Buyers level to OpportunityBuyers', async () => {
    const wrapper = await mountList()

    await wrapper.findComponent({ name: 'CustomTabs' }).vm.$emit('update:modelValue', 'buyers')
    await flushPromises()
    grid(wrapper).vm.$emit('export')
    await flushPromises()

    expect(startGridExport.mock.lastCall![0]).toBe('OpportunityBuyers')
    expect(startGridExport.mock.lastCall![1].fileName).toBe('Buyers file')
    expect(startGridExport.mock.lastCall![1].columns.map((column: { field: string }) => column.field)).toContain('name')
  })

  it('maps the Ultimate Parents level to OpportunityParents', async () => {
    const wrapper = await mountList()

    await wrapper.findComponent({ name: 'CustomTabs' }).vm.$emit('update:modelValue', 'parents')
    await flushPromises()
    grid(wrapper).vm.$emit('export')
    await flushPromises()

    expect(startGridExport.mock.lastCall![0]).toBe('OpportunityParents')
  })

  it('asks for confirmation instead of starting when the grid is above the large-export threshold', async () => {
    answerWith(LARGE_EXPORT_THRESHOLD + 1)
    const wrapper = await mountList()

    grid(wrapper).vm.$emit('export')
    await flushPromises()

    expect(startGridExport).not.toHaveBeenCalled()
    expect(wrapper.findComponent({ name: 'CustomDialog' }).props('visible')).toBe(true)
  })

  it('says why nothing is exported while a page is still loading, and sends no request', async () => {
    const wrapper = await mountList()
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
