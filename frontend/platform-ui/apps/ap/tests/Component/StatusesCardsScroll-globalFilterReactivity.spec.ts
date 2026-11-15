/**
 * The Manage kanban columns build their GraphQL query around a `globalFilter` literal that used to
 * be read once, when setup() ran. Applying a global filter therefore refreshed the header counts
 * above the columns (Overview.vue has its own watcher) but left the cards below showing the
 * previous result set until the page was reloaded.
 *
 * These tests mount the real component and assert on the query string it actually sends, so they
 * fail if the watcher is removed or stops rebuilding the literal.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { defineComponent, ref } from 'vue'

const { getCollectionDataSpy, holder } = vi.hoisted(() => ({
  getCollectionDataSpy: vi.fn(),
  holder: {} as { store: any },
}))

// reactive() has to be pulled in from inside the factory: vi.hoisted runs before any import.
vi.mock('@/stores/globalFilters', async () => {
  const { reactive } = await import('vue')
  holder.store = reactive({
    getFiltersApplied: { filters: [], logic: 'and' },
    getDisableWatchers: false,
  })
  return { useGlobalFiltersStore: () => holder.store }
})
vi.mock('@/stores/home', () => ({
  useHomeStore: () => ({ getEntityLevelTabSelected: 0, setEntityLevelTabSelected: vi.fn() }),
}))
vi.mock('@/stores/app', () => ({ useAppStore: () => ({ getCurrencyAmount: 1 }) }))
vi.mock('@/composables', () => ({ useUser: () => ({ isPilotAccount: () => false, user: ref(null) }) }))
vi.mock('@/composables/useSpendFile', () => ({
  default: () => ({ spendFileVersionActiveId: ref('sfv-1') }),
}))
vi.mock('@/services/graphql/useApolloClient', () => ({
  default: () => ({ apolloClientResetStore: vi.fn(), isResetting: ref(false) }),
}))
// The real one gates on programs/SFV consistency; here the component just needs its initial pass.
vi.mock('@/composables/useConsistentFetch', () => ({
  useConsistentFetch: (fns: Array<() => void>) => {
    fns.forEach((fn) => fn())
    return { triggerFetch: vi.fn() }
  },
}))
// Fully replaced rather than spread over importOriginal(): the real module's import graph reaches
// the analyze views, which blow up outside a real app shell. The four helpers below are copies of
// the real implementations — the component's use of them is what is under test, not their bodies.
vi.mock('@/utils/graphqlUtils', () => ({
  getCollectionData: getCollectionDataSpy,
  convertGlobalFilterToGraphQL: (filter: any) =>
    filter ? `globalFilter: "${JSON.stringify(filter).replace(/"/g, '\\"')}"` : '',
  convertFiltersToGraphQL: (filters: any) =>
    filters?.filters?.length ? `telerikFilter: "${JSON.stringify(filters).replace(/"/g, '\\"')}"` : '',
  safelyExtractNodes: (response: any, name = 'spends') =>
    (response?.data?.[name]?.edges ?? []).map((edge: any) => edge.node),
  safelyGetPaginationInfo: (response: any, name = 'spends') => ({
    hasNextPage: response?.data?.[name]?.pageInfo?.hasNextPage ?? false,
  }),
}))
vi.mock('@/modules/home/manageModule/components/CardsByStatus.vue', () => ({
  default: defineComponent({ name: 'CardsByStatus', template: '<div />' }),
}))
vi.mock('@progress/kendo-vue-layout', () => ({
  TabStrip: defineComponent({ name: 'TabStrip', template: '<div />' }),
}))
vi.mock('vue-draggable-plus', () => ({
  VueDraggable: defineComponent({ name: 'VueDraggable', template: '<div><slot /></div>' }),
}))

import StatusesCardsScroll from '@/modules/home/manageModule/components/StatusesCardsScroll.vue'

function page(...uuids: string[]) {
  return {
    data: {
      spends: {
        pageInfo: { hasNextPage: false },
        edges: uuids.map((uuid) => ({ cursor: uuid, node: { uuid, entityName: uuid } })),
      },
    },
  }
}

function lastQuery(): string {
  const { calls } = getCollectionDataSpy.mock
  return calls[calls.length - 1][0] as string
}

async function mountColumn() {
  const wrapper = mount(StatusesCardsScroll, {
    props: {
      levelofGrid: 0,
      negotiationStatus: 'planned',
      statusCode: '300',
      selectedProgramId: 'prog-1',
      setSorting: 'targetDesc',
    },
  })
  await flushPromises()
  return wrapper
}

/** Shaped like the store getter: a Kendo-style filter tree. */
function buyerEntityFilter() {
  return {
    logic: 'and',
    filters: [{ field: 'buyerEntity', operator: 'eq', value: 'Acme GmbH' }],
  }
}

describe('StatusesCardsScroll — global filter reactivity', () => {
  beforeEach(() => {
    getCollectionDataSpy.mockReset()
    getCollectionDataSpy.mockResolvedValue(page('before-1'))
    holder.store.getFiltersApplied = { filters: [], logic: 'and' }
    holder.store.getDisableWatchers = false
  })

  it('reloads the column when a global filter is applied', async () => {
    const wrapper = await mountColumn()
    const callsBefore = getCollectionDataSpy.mock.calls.length
    expect(callsBefore).toBeGreaterThan(0)

    holder.store.getFiltersApplied = buyerEntityFilter()
    await flushPromises()

    expect(getCollectionDataSpy.mock.calls.length).toBeGreaterThan(callsBefore)
    wrapper.unmount()
  })

  it('sends the new filter, not the one setup() first read', async () => {
    const wrapper = await mountColumn()
    expect(lastQuery()).not.toContain('buyerEntity')

    holder.store.getFiltersApplied = buyerEntityFilter()
    await flushPromises()

    expect(lastQuery()).toContain('globalFilter')
    expect(lastQuery()).toContain('buyerEntity')
    expect(lastQuery()).toContain('Acme GmbH')
    wrapper.unmount()
  })

  it('replaces the cards it was showing instead of appending to them', async () => {
    const wrapper = await mountColumn()
    expect((wrapper.vm as any).cards.map((c: any) => c.uuid)).toEqual(['before-1'])

    getCollectionDataSpy.mockResolvedValue(page('after-1'))
    holder.store.getFiltersApplied = buyerEntityFilter()
    await flushPromises()

    // Without the pagination/cards reset in refetch() this would be ['before-1', 'after-1'].
    expect((wrapper.vm as any).cards.map((c: any) => c.uuid)).toEqual(['after-1'])
    wrapper.unmount()
  })

  it('stays put while the company-change guard is up', async () => {
    const wrapper = await mountColumn()
    const callsBefore = getCollectionDataSpy.mock.calls.length

    // cleanupBeforeCompanyChange() empties the filters before the new company's program and SFV
    // have landed; refetching in that window queries with mismatched context.
    holder.store.getDisableWatchers = true
    holder.store.getFiltersApplied = buyerEntityFilter()
    await flushPromises()

    expect(getCollectionDataSpy.mock.calls.length).toBe(callsBefore)
    wrapper.unmount()
  })
})
