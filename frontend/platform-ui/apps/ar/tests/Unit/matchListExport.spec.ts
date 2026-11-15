import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'
import { createPinia, setActivePinia } from 'pinia'

// The Apollo client is the boundary: the REAL page fetcher runs, so the variables the export reads
// are the ones the grid actually sent.
const query = vi.fn()
vi.mock('@/services/graphql/apolloClient', () => ({
  apolloClient: { query: (...args: unknown[]) => query(...args), clearStore: vi.fn() },
}))

vi.mock('vue-router', () => ({ onBeforeRouteLeave: vi.fn() }))

// The footer totals are matchListTotals.spec's concern; here they must not reach the network.
vi.mock('@/api', () => ({ fetchFilterSummary: vi.fn().mockResolvedValue({}) }))

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
      'items', 'total', 'skip', 'take', 'sort', 'filter', 'loading', 'pageable', 'height', 'columns',
      'columnSelectorDefaultColumns', 'allowExport', 'exportLabel', 'optionsLabel',
    ],
    emits: ['datastatechange', 'update:columns', 'export'],
    template: '<div class="grid" />',
  },
}))

import ListMatch from '@/modules/match/components/ListMatch.vue'
import { useContextStore } from '@/stores/context'
import { useArCurrentUserStore } from '@/stores/arCurrentUser'
import { LARGE_EXPORT_THRESHOLD } from '@/composables/useArGridExport'

const VERSION = '1653c234-9318-4707-a6c3-33f4b427126c'

const i18n = createI18n({
  legacy: false,
  locale: 'en',
  messages: {
    en: {
      arMatch: { chartFilterChip: { remove: 'Remove', clearAll: 'Clear all' } },
      home: { analyze: { list: { largeExportTitle: 'Large export' } } },
      arGridExport: {
        largeExportWarning: '{count} rows',
        continue: 'Continue',
        cancel: 'Cancel',
        cancelExport: 'Cancel export',
        dismiss: 'Dismiss',
        exportLabel: 'Export Excel',
        optionsLabel: 'Options',
        fileName: { match: 'Match file' },
      },
    },
  },
})

const LISTS_ADMIN = ['ROLE_USER', 'ROLE_COMPANY_ADMIN', 'FEATURE_DOWNLOAD_EXCEL']
const MATCH_ADMIN = ['ROLE_USER', 'ROLE_COMPANY_ADMIN', 'FEATURE_DOWNLOAD_EXCEL_MATCH']

function setUser(roles: string[]) {
  useArCurrentUserStore().setUser({
    email: 'a@b.c', idps: 'x', authenticationSource: 'x', sessionExpiresAt: 0, roles,
  })
}

const mounted: Array<{ unmount: () => void }> = []

async function mountList(props: Record<string, unknown> = {}) {
  const wrapper = mount(ListMatch, { props, global: { plugins: [i18n] } })
  mounted.push(wrapper)
  await flushPromises()
  return wrapper
}

const grid = (wrapper: Awaited<ReturnType<typeof mountList>>) => wrapper.findComponent({ name: 'GraphqlGrid' })
const lastPageVariables = () => (query.mock.lastCall![0] as { variables: Record<string, unknown> }).variables

describe('ListMatch export', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    query.mockReset().mockResolvedValue({ data: { saleMatchRows: { items: [], totalCount: 30 } } })
    startGridExport.mockReset().mockResolvedValue({ kind: 'job', jobId: 'job-1' })
    useContextStore().setVersion(7, VERSION)
    setUser(MATCH_ADMIN)
  })

  afterEach(() => {
    mounted.splice(0).forEach((wrapper) => wrapper.unmount())
  })

  it('is gated by the Match permission, not the lists one', async () => {
    setUser(LISTS_ADMIN)
    expect(grid(await mountList()).props('allowExport')).toBe(false)

    setUser(MATCH_ADMIN)
    const allowed = await mountList()
    expect(grid(allowed).props('allowExport')).toBe(true)
    expect(grid(allowed).props('exportLabel')).toBe('Export Excel')
    expect(grid(allowed).props('optionsLabel')).toBe('Options')
  })

  it('exports Match with the last query variables, chart drill-down included', async () => {
    const wrapper = await mountList({
      chartFilter: { logic: 'and', filters: [{ field: 'isMatched', operator: 'eq', value: true }] },
    })
    await flushPromises()
    const sent = lastPageVariables()
    expect(JSON.stringify(sent.where)).toContain('isMatched')

    grid(wrapper).vm.$emit('export')
    await flushPromises()

    expect(startGridExport).toHaveBeenCalledOnce()
    const [kind, request] = startGridExport.mock.calls[0]
    expect(kind).toBe('Match')
    expect(request).toMatchObject({
      versionUuid: VERSION,
      where: sent.where,
      order: sent.order,
      currencyRate: sent.currencyRate,
      customFilters: null,
      customSorts: null,
      fileName: 'Match file',
    })
    expect('step' in request).toBe(false)
  })

  it('sends the visible columns by GraphQL name, in display order, without hidden or custom ones', async () => {
    const wrapper = await mountList()

    grid(wrapper).vm.$emit('update:columns', [
      {
        title: 'Results',
        children: [
          { field: 'matchStatus', title: 'Status' },
          { field: 'isMatched', title: 'Matched', hidden: true },
          { field: 'buyerName', title: 'Buyer' },
        ],
      },
      {
        title: 'Match details',
        children: [
          { field: 'originalBuyerName', title: 'Original name' },
          { field: 'volume', title: 'Sale Volume' },
          { field: 'customDataPoint3', title: 'Region manager' },
        ],
      },
    ])
    await flushPromises()
    grid(wrapper).vm.$emit('export')
    await flushPromises()

    expect(startGridExport.mock.lastCall![1].columns).toEqual([
      { field: 'matchStatus', title: 'Status', hidden: false },
      { field: 'buyerName', title: 'Buyer', hidden: false },
      { field: 'originalBuyerName', title: 'Original name', hidden: false },
      { field: 'volume', title: 'Sale Volume', hidden: false },
    ])
  })

  it("exports nothing once the version is gone, rather than the previous version's request", async () => {
    const wrapper = await mountList()
    useContextStore().clear()
    await flushPromises()

    grid(wrapper).vm.$emit('export')
    await flushPromises()

    expect(startGridExport).not.toHaveBeenCalled()
  })

  it('falls back to an empty grid when a page fails to load, and exports nothing from it', async () => {
    const wrapper = await mountList()
    expect(grid(wrapper).props('total')).toBe(30)

    query.mockRejectedValue(new Error('boom'))
    grid(wrapper).vm.$emit('datastatechange', { skip: 25, take: 25, sort: [] })
    await flushPromises()

    expect(grid(wrapper).props('items')).toEqual([])
    expect(grid(wrapper).props('total')).toBe(0)
    expect(grid(wrapper).props('loading')).toBe(false)

    grid(wrapper).vm.$emit('export')
    await flushPromises()

    expect(startGridExport).not.toHaveBeenCalled()
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

  describe('with two page loads in flight', () => {
    type Deferred = { resolve: (value: unknown) => void; reject: (reason: unknown) => void }
    const pending: Deferred[] = []
    const page = (totalCount: number) => ({ data: { saleMatchRows: { items: [], totalCount } } })

    /** Starts a page load that stays in flight until the test settles it, oldest first. */
    function startLoad(wrapper: Awaited<ReturnType<typeof mountList>>, skip: number) {
      query.mockReturnValueOnce(new Promise((resolve, reject) => pending.push({ resolve, reject })))
      grid(wrapper).vm.$emit('datastatechange', { skip, take: 25, sort: [] })
    }

    beforeEach(() => {
      pending.length = 0
    })

    it('ignores an older page that resolves after a newer one', async () => {
      const wrapper = await mountList()
      startLoad(wrapper, 25)
      startLoad(wrapper, 50)

      pending[1].resolve(page(7))
      await flushPromises()
      expect(grid(wrapper).props('total')).toBe(7)
      expect(grid(wrapper).props('loading')).toBe(false)

      pending[0].resolve(page(99))
      await flushPromises()

      expect(grid(wrapper).props('total')).toBe(7)
      expect(grid(wrapper).props('loading')).toBe(false)
      grid(wrapper).vm.$emit('export')
      await flushPromises()
      expect(startGridExport.mock.lastCall![1].order).toEqual(lastPageVariables().order)
      expect(JSON.stringify(query.mock.calls[2][0].variables)).toContain('"skip":50')
    })

    it('ignores an older failure that arrives after a newer success: no blanked grid, the export still knows the row count', async () => {
      const wrapper = await mountList()
      startLoad(wrapper, 25)
      startLoad(wrapper, 50)

      pending[1].resolve(page(LARGE_EXPORT_THRESHOLD + 5))
      await flushPromises()
      pending[0].reject(new Error('boom'))
      await flushPromises()

      expect(grid(wrapper).props('total')).toBe(LARGE_EXPORT_THRESHOLD + 5)
      expect(grid(wrapper).props('loading')).toBe(false)

      grid(wrapper).vm.$emit('export')
      await flushPromises()

      // The above-threshold confirmation, not a silent no-op and not an unconfirmed export.
      expect(startGridExport).not.toHaveBeenCalled()
      expect(wrapper.findComponent({ name: 'CustomDialog' }).props('visible')).toBe(true)
    })

    it('keeps loading true until the latest load settles', async () => {
      const wrapper = await mountList()
      startLoad(wrapper, 25)
      startLoad(wrapper, 50)

      pending[0].resolve(page(99))
      await flushPromises()

      expect(grid(wrapper).props('loading')).toBe(true)
      expect(grid(wrapper).props('total')).toBe(30)
    })
  })
})
