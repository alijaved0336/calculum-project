import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'
import { createPinia, setActivePinia } from 'pinia'

const fetchCorporateTree = vi.fn()
vi.mock('@/api', () => ({
  fetchCorporateTree: (...args: unknown[]) => fetchCorporateTree(...args),
}))

const openEntityCard = vi.fn()
vi.mock('@/modules/entityCard/EntityCardRouting', () => ({
  openEntityCard: (...args: unknown[]) => openEntityCard(...args),
}))

vi.mock('@ada/design-system', () => ({
  CalculumLoadingAr: { template: '<div class="loading" />' },
  NoDataAvailable: { props: ['title'], template: '<div class="no-data">{{ title }}</div>' },
}))

import EntityCardCorporateTreeTab from '@/modules/entityCard/components/tabs/EntityCardCorporateTreeTab.vue'
import type { CorporateTreeResponse } from '@/api'

const messages = {
  en: {
    arEntityCard: {
      corporateTree: {
        loadError: 'Could not load the corporate tree. Try again.',
        truncated: 'The tree stopped at a depth or size limit; more of the group structure may exist beyond what is shown.',
        cyclesDetected: '{count} ownership cycle(s) found in the data; the walk stopped where each was found rather than looping.',
        currentBuyer: 'Current buyer',
      },
    },
    arMatch: {
      roles: { all: 'All', counterparty: 'Counterparty', parent: 'Parent', self: 'Own entity' },
    },
  },
}

function mountTab(props: { versionId?: number; buyerId?: number } = {}) {
  const i18n = createI18n({ legacy: false, locale: 'en', fallbackLocale: 'en', messages })
  return mount(EntityCardCorporateTreeTab, {
    props: { versionId: 73, buyerId: 10, ...props },
    global: { plugins: [i18n] },
  })
}

function tree(overrides: Partial<CorporateTreeResponse> = {}): CorporateTreeResponse {
  return {
    buyerId: 10,
    nodes: [
      { id: 1, companyName: 'Top Parent', role: 'Parent', resolution: 'Resolved', isRequestedBuyer: false },
      { id: 10, companyName: 'Acme Corp', role: 'Self', resolution: 'Enriched', isRequestedBuyer: true },
      { id: 20, companyName: 'Acme Sub', role: 'Counterparty', resolution: 'Named', isRequestedBuyer: false },
    ],
    edges: [
      { parentId: 1, childId: 10 },
      { parentId: 10, childId: 20 },
    ],
    cycles: [],
    partial: false,
    truncated: false,
    ...overrides,
  }
}

describe('EntityCardCorporateTreeTab', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  afterEach(() => {
    fetchCorporateTree.mockReset()
    openEntityCard.mockReset()
  })

  it('shows a loading state while the tree is in flight', async () => {
    fetchCorporateTree.mockImplementation(() => new Promise(() => {}))
    const wrapper = mountTab()
    await flushPromises()

    expect(wrapper.find('.loading').exists()).toBe(true)
  })

  it('asks the API for the given version and buyer', async () => {
    fetchCorporateTree.mockResolvedValue(tree())
    mountTab({ versionId: 73, buyerId: 10 })
    await flushPromises()

    expect(fetchCorporateTree).toHaveBeenCalledWith(73, 10, 1)
  })

  it('shows a load error on failure', async () => {
    fetchCorporateTree.mockRejectedValue(new Error('boom'))
    const wrapper = mountTab()
    await flushPromises()

    expect(wrapper.text()).toContain('Could not load the corporate tree. Try again.')
  })

  it('renders the parent chain and subsidiary as a nested tree, with the current buyer highlighted', async () => {
    fetchCorporateTree.mockResolvedValue(tree())
    const wrapper = mountTab()
    await flushPromises()

    const nodes = wrapper.findAll('.corporate-tree-node')
    expect(nodes).toHaveLength(3)
    expect(wrapper.text()).toContain('Top Parent')
    expect(wrapper.text()).toContain('Acme Corp')
    expect(wrapper.text()).toContain('Acme Sub')

    const current = nodes.find((n) => n.text().includes('Acme Corp'))
    expect(current?.classes()).toContain('corporate-tree-node--current')
    expect(current?.text()).toContain('Current buyer')

    const other = nodes.find((n) => n.text().includes('Acme Sub'))
    expect(other?.classes()).not.toContain('corporate-tree-node--current')
  })

  it('renders a single node, not an empty panel, for a buyer with no relationships', async () => {
    fetchCorporateTree.mockResolvedValue(
      tree({
        nodes: [{ id: 10, companyName: 'Acme Corp', role: 'Self', resolution: 'Enriched', isRequestedBuyer: true }],
        edges: [],
      }),
    )
    const wrapper = mountTab()
    await flushPromises()

    const nodes = wrapper.findAll('.corporate-tree-node')
    expect(nodes).toHaveLength(1)
    expect(wrapper.find('.no-data').exists()).toBe(false)
    expect(wrapper.text()).toContain('Acme Corp')
  })

  it('opens another node\'s own Entity Card on click, on the corporate-tree tab', async () => {
    fetchCorporateTree.mockResolvedValue(tree())
    const wrapper = mountTab({ versionId: 73, buyerId: 10 })
    await flushPromises()

    const subsidiaryLabel = wrapper.findAll('.org-tree-node-label-inner').find((el) => el.text().includes('Acme Sub'))
    await subsidiaryLabel?.trigger('click')

    expect(openEntityCard).toHaveBeenCalledWith(73, 20, 'corporate-tree')
  })

  it('does not navigate when the current buyer\'s own node is clicked', async () => {
    fetchCorporateTree.mockResolvedValue(tree())
    const wrapper = mountTab({ versionId: 73, buyerId: 10 })
    await flushPromises()

    const buyerLabel = wrapper.findAll('.org-tree-node-label-inner').find((el) => el.text().includes('Acme Corp'))
    await buyerLabel?.trigger('click')

    expect(openEntityCard).not.toHaveBeenCalled()
  })

  it('states explicitly when a depth or node bound truncated the walk (A2)', async () => {
    fetchCorporateTree.mockResolvedValue(tree({ truncated: true }))
    const wrapper = mountTab()
    await flushPromises()

    expect(wrapper.text()).toContain('depth or size limit')
  })

  it('states explicitly when a cycle was cut from the walk, naming how many (A1)', async () => {
    fetchCorporateTree.mockResolvedValue(tree({ partial: true, cycles: [{ parentId: 20, childId: 1 }] }))
    const wrapper = mountTab()
    await flushPromises()

    expect(wrapper.text()).toContain('1 ownership cycle(s) found')
  })

  it('truncates a branch on a cycle below the root rather than recursing forever (malformed response)', async () => {
    fetchCorporateTree.mockResolvedValue(
      tree({
        nodes: [
          { id: 1, companyName: 'Top', role: 'Parent', resolution: 'Resolved', isRequestedBuyer: false },
          { id: 10, companyName: 'Acme Corp', role: 'Self', resolution: 'Enriched', isRequestedBuyer: true },
          { id: 20, companyName: 'Acme Sub', role: 'Counterparty', resolution: 'Named', isRequestedBuyer: false },
        ],
        // 20 points back at 10, a cycle that never reaches the root (1) - edges cannot actually
        // carry this per the backend's own contract, but toUiNode must not recurse forever if a
        // response ever did.
        edges: [
          { parentId: 1, childId: 10 },
          { parentId: 10, childId: 20 },
          { parentId: 20, childId: 10 },
        ],
      }),
    )
    const wrapper = mountTab()
    await flushPromises()

    expect(wrapper.findAll('.corporate-tree-node')).toHaveLength(3)
    expect(wrapper.text()).toContain('Top')
    expect(wrapper.text()).toContain('Acme Corp')
    expect(wrapper.text()).toContain('Acme Sub')
  })

  it('reports an unrenderable response rather than a blank panel (no node with no incoming edge)', async () => {
    fetchCorporateTree.mockResolvedValue(
      tree({
        nodes: [
          { id: 1, companyName: 'A', role: 'Self', resolution: 'Enriched', isRequestedBuyer: true },
          { id: 2, companyName: 'B', role: 'Counterparty', resolution: 'Named', isRequestedBuyer: false },
        ],
        // Every node has an incoming edge - a malformed response with no root, which
        // `buildTree` cannot draw.
        edges: [
          { parentId: 1, childId: 2 },
          { parentId: 2, childId: 1 },
        ],
      }),
    )
    const wrapper = mountTab()
    await flushPromises()

    expect(wrapper.find('.no-data').exists()).toBe(true)
    expect(wrapper.find('.corporate-tree-node').exists()).toBe(false)
  })

  it('hides and re-shows a branch on the expand/collapse toggle, even though the tree is built inside a computed', async () => {
    fetchCorporateTree.mockResolvedValue(tree())
    const wrapper = mountTab()
    await flushPromises()
    expect(wrapper.findAll('.corporate-tree-node')).toHaveLength(3)

    const rootToggle = wrapper.find('.org-tree-node-btn')
    expect(rootToggle.exists()).toBe(true)

    await rootToggle.trigger('click')
    await flushPromises()
    expect(wrapper.findAll('.corporate-tree-node')).toHaveLength(1)

    await rootToggle.trigger('click')
    await flushPromises()
    expect(wrapper.findAll('.corporate-tree-node')).toHaveLength(3)
  })

  it('reloads when the route moves to a different buyer', async () => {
    fetchCorporateTree.mockResolvedValueOnce(tree())
    const wrapper = mountTab({ buyerId: 10 })
    await flushPromises()
    expect(fetchCorporateTree).toHaveBeenCalledTimes(1)

    fetchCorporateTree.mockResolvedValueOnce(tree({ buyerId: 99 }))
    await wrapper.setProps({ buyerId: 99 })
    await flushPromises()

    expect(fetchCorporateTree).toHaveBeenCalledTimes(2)
    expect(fetchCorporateTree).toHaveBeenLastCalledWith(73, 99, 1)
  })

  it('discards a slower response once a newer navigation has already landed (stale-load guard)', async () => {
    let resolveFirst: (value: CorporateTreeResponse) => void = () => {}
    fetchCorporateTree.mockImplementationOnce(() => new Promise((resolve) => { resolveFirst = resolve }))
    const wrapper = mountTab({ buyerId: 10 })
    await flushPromises()

    fetchCorporateTree.mockResolvedValueOnce(tree({ buyerId: 99, nodes: [{ id: 99, companyName: 'Globex', role: 'Self', resolution: 'Enriched', isRequestedBuyer: true }], edges: [] }))
    await wrapper.setProps({ buyerId: 99 })
    await flushPromises()
    expect(wrapper.text()).toContain('Globex')

    resolveFirst(tree())
    await flushPromises()

    expect(wrapper.text()).toContain('Globex')
    expect(wrapper.text()).not.toContain('Acme Corp')
  })
})
