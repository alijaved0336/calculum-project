import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'
import { createPinia, setActivePinia } from 'pinia'

// The Apollo client is the boundary: the REAL page fetchers run, so the variables the export reads
// are the ones the drill-in actually sent.
const query = vi.fn()
vi.mock('@/services/graphql/apolloClient', () => ({
  apolloClient: { query: (...args: unknown[]) => query(...args) },
}))

// Mocked at the HTTP module (a concrete path), not the `@/api` barrel: the chart call is a real
// `@/api` function that ends in `post`.
vi.mock('@/api/http', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  post: vi.fn().mockResolvedValue({
    byCashFlow: [{ period: 'actual', amount: 1 }, { period: 'payOnTerms', amount: 5 }],
    byTerms: [],
  }),
}))

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
      'items', 'total', 'take', 'skip', 'sort', 'sortable', 'loading', 'pageable', 'columnMenu', 'columns',
      'dataItemKey', 'allowExport', 'exportLabel', 'optionsLabel',
    ],
    emits: ['datastatechange', 'update:columns', 'export'],
    template: '<div class="grid" />',
  },
}))

import Waterfall from '@/modules/opportunity/views/Waterfall.vue'
import { useContextStore } from '@/stores/context'
import { useArCurrentUserStore } from '@/stores/arCurrentUser'

const VERSION = '1653c234-9318-4707-a6c3-33f4b427126c'

const i18n = createI18n({
  legacy: false,
  locale: 'en',
  messages: {
    en: {
      arOpportunity: { list: { tabs: { saleLines: 'Sales Lines' } } },
      home: { analyze: { list: { largeExportTitle: 'Large export' } } },
      arGridExport: {
        largeExportWarning: '{count} rows',
        continue: 'Continue',
        cancel: 'Cancel',
        cancelExport: 'Cancel export',
        dismiss: 'Dismiss',
        exportLabel: 'Export Excel',
        optionsLabel: 'Options',
        fileName: { waterfall: 'Waterfall file' },
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

async function mountView() {
  // The chart is the design-system package's own concern (Kendo): a button per bar is all a click needs.
  const wrapper = mount(Waterfall, {
    global: {
      plugins: [i18n],
      stubs: {
        WaterfallChart: {
          props: ['data'],
          emits: ['bar-click'],
          template: `
            <div>
              <button
                v-for="(item, i) in data"
                :key="i"
                type="button"
                :class="'bar-' + i"
                @click="$emit('bar-click', { category: item.category, index: i, isSummary: !!item.summary })"
              >{{ item.category }}</button>
            </div>
          `,
        },
      },
    },
  })
  mounted.push(wrapper)
  await flushPromises()
  return wrapper
}

const grid = (wrapper: Awaited<ReturnType<typeof mountView>>) => wrapper.findComponent({ name: 'GraphqlGrid' })
const lastPageVariables = () => (query.mock.lastCall![0] as { variables: Record<string, unknown> }).variables

describe('Waterfall drill-in export', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    query.mockReset().mockImplementation(async ({ query: document }: { query: PageDocument }) => ({
      data: { [document.definitions[0].selectionSet.selections[0].name.value]: { items: [], totalCount: 8 } },
    }))
    startGridExport.mockReset().mockResolvedValue({ kind: 'job', jobId: 'job-1' })
    useContextStore().setVersion(7, VERSION)
    setPermission(true)
  })

  afterEach(() => {
    mounted.splice(0).forEach((wrapper) => wrapper.unmount())
  })

  it('offers the export only to a user the server allows to export lists', async () => {
    setPermission(false)
    expect(grid(await mountView()).props('allowExport')).toBe(false)

    setPermission(true)
    const allowed = await mountView()
    expect(grid(allowed).props('allowExport')).toBe(true)
    expect(grid(allowed).props('exportLabel')).toBe('Export Excel')
    expect(grid(allowed).props('optionsLabel')).toBe('Options')
  })

  it('exports the opening total drill-in as WaterfallSaleLines with its step and the visible columns', async () => {
    const wrapper = await mountView()
    const sent = lastPageVariables()
    expect(sent.step).toBe('total')

    grid(wrapper).vm.$emit('export')
    await flushPromises()

    expect(startGridExport).toHaveBeenCalledOnce()
    const [kind, request] = startGridExport.mock.calls[0]
    expect(kind).toBe('WaterfallSaleLines')
    expect(request).toMatchObject({
      versionUuid: VERSION,
      step: 'total',
      where: sent.where ?? null, // an unfiltered page sends no where at all
      order: sent.order,
      currencyRate: sent.currencyRate,
      fileName: 'Waterfall file',
    })

  })

  it('sends the visible columns by GraphQL name, in display order, without hidden, client-only or custom ones', async () => {
    const wrapper = await mountView()

    grid(wrapper).vm.$emit('update:columns', [
      { field: 'buyerName', title: 'Buying Entity' },
      { field: 'alias', title: 'Alias', hidden: true },
      { field: 'previousTerm', title: 'Previous term' },
      { field: 'cashFlowAgreed', title: 'Cash Flow (Agreed)' },
      { field: 'customDataPoint1', title: 'Segment' },
      { field: 'cashFlowContribution', title: 'Cash flow contribution' },
    ])
    await flushPromises()
    grid(wrapper).vm.$emit('export')
    await flushPromises()

    expect(startGridExport.mock.lastCall![1].columns).toEqual([
      { field: 'buyerName', title: 'Buying Entity', hidden: false },
      { field: 'previousTerm', title: 'Previous term', hidden: false },
      { field: 'cashFlowContribution', title: 'Cash flow contribution', hidden: false },
    ])
  })

  it('exports nothing once the last drill-in page failed to load, rather than the previous page request', async () => {
    const wrapper = await mountView()
    await wrapper.find('.bar-1').trigger('click') // payOnTerms, loaded fine
    await flushPromises()
    query.mockRejectedValue(new Error('boom'))

    grid(wrapper).vm.$emit('datastatechange', { skip: 25, take: 25, sort: [] })
    await flushPromises()

    grid(wrapper).vm.$emit('export')
    await flushPromises()

    expect(startGridExport).not.toHaveBeenCalled()
  })

  it('exports the step the analyst picked, with the sort the drill-in last sent', async () => {
    const wrapper = await mountView()

    await wrapper.find('.bar-1').trigger('click') // payOnTerms
    await flushPromises()
    grid(wrapper).vm.$emit('datastatechange', { skip: 0, take: 25, sort: [{ field: 'volume', dir: 'asc' }] })
    await flushPromises()
    const sent = lastPageVariables()
    expect(sent.step).toBe('payOnTerms')

    grid(wrapper).vm.$emit('export')
    await flushPromises()

    expect(startGridExport.mock.lastCall![1]).toMatchObject({ step: 'payOnTerms', order: [{ volume: 'ASC' }] })
    expect(startGridExport.mock.lastCall![1].order).toEqual(sent.order)
  })

  it('does not offer the export on the baseline (Actual) drill-in, which is not a step the server knows', async () => {
    const wrapper = await mountView()

    await wrapper.find('.bar-0').trigger('click') // actual
    await flushPromises()

    expect(grid(wrapper).props('allowExport')).toBe(false)
    grid(wrapper).vm.$emit('export')
    await flushPromises()
    expect(startGridExport).not.toHaveBeenCalled()
  })

  it('says why nothing is exported while a page is still loading, and sends no request', async () => {
    const wrapper = await mountView()
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
