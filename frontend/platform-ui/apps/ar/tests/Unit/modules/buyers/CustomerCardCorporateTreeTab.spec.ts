import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'
import { createPinia, setActivePinia } from 'pinia'
import { useCustomerCardModalStore } from '@/stores/customerCardModal'
import { useContextStore } from '@/stores/context'

const fetchBuyerCorporateTree = vi.fn()
vi.mock('@/api', () => ({
  fetchBuyerCorporateTree: (...args: unknown[]) => fetchBuyerCorporateTree(...args),
}))

const markBuyerRecent = vi.fn()
vi.mock('@/modules/buyers/api/recentBuyers', () => ({
  markBuyerRecent: (...args: unknown[]) => markBuyerRecent(...args),
}))

vi.mock('@ada/design-system', () => ({
  ContentBox: { template: '<div class="content-box-stub"><slot name="header-title" /><slot /></div>' },
  ContentBoxBody: { template: '<div class="content-box-body-stub"><slot /></div>' },
  NoDataAvailable: { props: ['title'], template: '<div class="no-data">{{ title }}</div>' },
  Skeleton: { template: '<div class="skeleton-stub" />' },
}))

import CustomerCardCorporateTreeTab from '@/modules/buyers/components/customerCard/CustomerCardCorporateTreeTab.vue'
import type { BuyerCorporateTreeResponse } from '@/api'

const VERSION_UUID = '1653c234-9318-4707-a6c3-33f4b427126c'

const messages = {
  en: {
    arCustomerCard: {
      notAvailable: '—',
      notFound: 'This buyer could not be found for this sale file version.',
      corporateTree: {
        salesLinesTruncated: 'Showing the first 50 sales lines; more exist for this entity.',
        noParent: 'No Parent',
        salesLinesGroup: 'Sales Lines ({count})',
        node: {
          volume: 'Volume',
          cashFlow: 'Cash Flow',
          paymentTerms: 'PT',
          paymentTermsOpportunity: 'PT Opp.',
          country: 'Country',
          buyingEntity: 'Buying Entity',
          commodity: 'Commodity',
          spend: 'Sale {n}',
        },
      },
    },
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
    arOpportunity: {
      list: {
        tabs: { saleLines: 'Sales Lines', buyers: 'Buyers', parents: 'Parents' },
      },
    },
  },
}

function node(overrides: Partial<BuyerCorporateTreeResponse['nodes'][number]>): BuyerCorporateTreeResponse['nodes'][number] {
  return {
    id: 0,
    companyName: null,
    role: 'Counterparty',
    resolution: 'Enriched',
    isRequestedBuyer: false,
    volume: 0,
    paymentTerms: null,
    paymentTermsOpportunity: null,
    cashFlow: 0,
    country: null,
    salesLines: [],
    salesLinesTruncated: false,
    companyDetails: null,
    ...overrides,
  }
}

function companyDetails(
  overrides: Partial<NonNullable<BuyerCorporateTreeResponse['nodes'][number]['companyDetails']>> = {},
): NonNullable<BuyerCorporateTreeResponse['nodes'][number]['companyDetails']> {
  return {
    id: 0,
    uuid: '01a06d1d-bfd9-7b9f-9b4a-c413638b3159',
    role: 'Counterparty',
    resolution: 'Enriched',
    lifecycle: 'Actual',
    companyName: null,
    description: null,
    externalId: null,
    typeOfIdNumber: null,
    idNumber: null,
    bvdIdNumber: null,
    catalogCompanyId: null,
    legalForm: null,
    foundedYear: null,
    employeesCount: null,
    phoneNumber: null,
    address: null,
    city: null,
    zipCode: null,
    formattedAddress: null,
    latitude: null,
    longitude: null,
    url: null,
    countryCode: null,
    countryName: null,
    countryFlagUrl: null,
    regionName: null,
    supplierCountryCode: null,
    supplierCountryName: null,
    supplierRegionName: null,
    supplierContinent: null,
    industryCode: null,
    industryName: null,
    commodity: null,
    sector: null,
    creditScore: null,
    creditScoreReferenceId: null,
    creditRating: null,
    ratingDescription: null,
    brandValueReferenceId: null,
    brandLevel: null,
    brandPaymentTermsFactor: null,
    buyerLeverage: null,
    supplierLeverage: null,
    companySizeId: null,
    estimatedCompanySize: null,
    salesTeam: null,
    averageDaysToApproveInvoice: null,
    dateOfLastTermNegotiation: null,
    negotiationStatus: null,
    negotiationStatusCode: null,
    negotiationStatusUpdatedAt: null,
    originalName: null,
    isMinorityOwned: null,
    isVeteranOwned: null,
    isWomanOwned: null,
    parentId: null,
    parentName: null,
    parentUuid: null,
    currencyCode: null,
    confidenceScore: null,
    smeClassificationStatus: null,
    isSme: null,
    smeSource: null,
    relationshipSinceYear: null,
    supplierEntities: null,
    customAttributes: [],
    ...overrides,
  }
}

function salesLine(
  overrides: Partial<BuyerCorporateTreeResponse['nodes'][number]['salesLines'][number]> = {},
): BuyerCorporateTreeResponse['nodes'][number]['salesLines'][number] {
  return {
    saleLineId: 1,
    volume: 100,
    cashFlow: 10,
    paymentTerms: 30,
    paymentTermsOpportunity: 30,
    supplierId: 1,
    supplierName: 'Supplier A',
    commodity: 'Widgets',
    ...overrides,
  }
}

function tree(overrides: Partial<BuyerCorporateTreeResponse> = {}): BuyerCorporateTreeResponse {
  return {
    buyerId: 10,
    nodes: [
      node({ id: 1, companyName: 'Top Parent', role: 'Parent', resolution: 'Resolved' }),
      node({ id: 10, companyName: 'Acme Corp', role: 'Self', isRequestedBuyer: true }),
      node({ id: 20, companyName: 'Acme Sub', role: 'Counterparty', resolution: 'Named' }),
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

/** Top Parent -> Acme Corp -> Acme Sub (the requested buyer) -> Acme Sub Sub, with Acme Sub
 * carrying both a real sales line AND a further subsidiary child (Acme Sub Sub) - it being the
 * REQUESTED buyer (not the sales-lines-only-node rule) is what keeps its own sales line visible
 * from the very first render, making the Sales Lines header's own collapse/expand behavior
 * exercisable through an ANCESTOR's toggle rather than Acme Sub's own. */
function treeWithVisibleSalesLines(): BuyerCorporateTreeResponse {
  return tree({
    nodes: [
      node({ id: 1, companyName: 'Top Parent', role: 'Parent', resolution: 'Resolved' }),
      node({ id: 10, companyName: 'Acme Corp', role: 'Self' }),
      node({ id: 20, companyName: 'Acme Sub', role: 'Counterparty', resolution: 'Named', isRequestedBuyer: true, salesLines: [salesLine()] }),
      node({ id: 30, companyName: 'Acme Sub Sub', role: 'Counterparty', resolution: 'Named' }),
    ],
    edges: [
      { parentId: 1, childId: 10 },
      { parentId: 10, childId: 20 },
      { parentId: 20, childId: 30 },
    ],
  })
}

/** The tab fetches via context.saleFileVersionUuid, not the (unused-for-the-fetch) versionId prop
 * - see useBuyerCorporateTree's own doc - so a version has to be active for the happy-path tests
 * below to actually reach fetchBuyerCorporateTree rather than short-circuiting to not-found. */
function mountTab(props: { versionId: string; buyerId: string } = { versionId: '73', buyerId: '10' }) {
  useContextStore().setVersion(73, VERSION_UUID)
  const i18n = createI18n({ legacy: false, locale: 'en', fallbackLocale: 'en', messages })
  return mount(CustomerCardCorporateTreeTab, { props, global: { plugins: [i18n] } })
}

/** The expand/collapse toggle sits inside the same `.org-tree-node-label-inner` as the node's own
 * card, as a sibling - this finds the one belonging to whichever node's card contains `companyName`. */
function findToggle(view: ReturnType<typeof mountTab>, companyName: string) {
  return view.findAll('.org-tree-node-label-inner').find((el) => el.text().includes(companyName))?.find('.org-tree-node-btn')
}

describe('CustomerCardCorporateTreeTab', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    markBuyerRecent.mockResolvedValue(undefined)
  })

  afterEach(() => {
    fetchBuyerCorporateTree.mockReset()
    markBuyerRecent.mockReset()
  })

  it('shows its own loading state before the fetch resolves', () => {
    fetchBuyerCorporateTree.mockImplementation(() => new Promise(() => {}))

    const view = mountTab()

    expect(view.find('.skeleton-stub').exists()).toBe(true)
  })

  it('asks the API for the active version uuid and the buyer parsed off the route-id string prop', async () => {
    fetchBuyerCorporateTree.mockResolvedValue(tree())

    mountTab({ versionId: '73', buyerId: '10' })
    await flushPromises()

    expect(fetchBuyerCorporateTree).toHaveBeenCalledWith(VERSION_UUID, 10, 1)
  })

  it('shows the not-found state without calling the API when no version is selected', async () => {
    // Fresh store, no version set - mountTab's own setVersion is skipped here on purpose.
    const i18n = createI18n({ legacy: false, locale: 'en', fallbackLocale: 'en', messages })
    const view = mount(CustomerCardCorporateTreeTab, {
      props: { versionId: '73', buyerId: '10' },
      global: { plugins: [i18n] },
    })
    await flushPromises()

    expect(fetchBuyerCorporateTree).not.toHaveBeenCalled()
    expect(view.text()).toContain('This buyer could not be found for this sale file version.')
  })

  it('shows the not-found state for a malformed buyer id, without ever calling the API', async () => {
    const view = mountTab({ versionId: '73', buyerId: 'abc' })
    await flushPromises()

    expect(fetchBuyerCorporateTree).not.toHaveBeenCalled()
    expect(view.text()).toContain('This buyer could not be found for this sale file version.')
  })

  it('shows a load error on failure', async () => {
    fetchBuyerCorporateTree.mockRejectedValue(new Error('boom'))

    const view = mountTab()
    await flushPromises()

    expect(view.text()).toContain('Could not load the corporate tree. Try again.')
  })

  it('renders the parent chain and subsidiary as a nested tree, with the current buyer highlighted', async () => {
    fetchBuyerCorporateTree.mockResolvedValue(tree())

    const view = mountTab()
    await flushPromises()

    const nodes = view.findAll('.corporate-tree-node')
    expect(nodes).toHaveLength(3)
    expect(view.text()).toContain('Top Parent')
    expect(view.text()).toContain('Acme Corp')
    expect(view.text()).toContain('Acme Sub')

    // The current buyer is marked by the border highlight class alone - the role/"Current buyer"
    // badge row was removed from this tab's cards.
    const current = nodes.find((n) => n.text().includes('Acme Corp'))
    expect(current?.classes()).toContain('corporate-tree-node--current')

    const other = nodes.find((n) => n.text().includes('Acme Sub'))
    expect(other?.classes()).not.toContain('corporate-tree-node--current')
  })

  it('lays the tree out horizontally, per the reference AP interaction (TreeCards.vue)', async () => {
    fetchBuyerCorporateTree.mockResolvedValue(tree())

    const view = mountTab()
    await flushPromises()

    expect(view.get('.org-tree').classes()).toContain('horizontal')
  })

  it('shows the Parents and Buyer Entities headers when the buyer has both ancestors and subsidiaries', async () => {
    fetchBuyerCorporateTree.mockResolvedValue(tree())

    const view = mountTab()
    await flushPromises()

    // Sales Lines is deliberately absent here: none of this fixture's nodes carry any actual sales
    // lines - see the dedicated tests below for that header's own (stricter) condition.
    const headers = view.findAll('.corporate-tree-header').map((header) => header.text())
    expect(headers).toEqual(['Parents', 'Buyers'])
  })

  it('shows the Sales Lines header once a visible Counterparty\'s own sales lines are expanded', async () => {
    fetchBuyerCorporateTree.mockResolvedValue(
      tree({
        nodes: [
          node({ id: 1, companyName: 'Top Parent', role: 'Parent', resolution: 'Resolved' }),
          node({ id: 10, companyName: 'Acme Corp', role: 'Self', isRequestedBuyer: true }),
          node({ id: 20, companyName: 'Acme Sub', role: 'Counterparty', resolution: 'Named', salesLines: [salesLine()] }),
        ],
        edges: [
          { parentId: 1, childId: 10 },
          { parentId: 10, childId: 20 },
        ],
      }),
    )

    const view = mountTab()
    await flushPromises()

    // Acme Sub's own sales lines are its only children, so it starts collapsed (see the dedicated
    // default-collapsed tests) - Sales Lines has nothing to show yet.
    expect(view.findAll('.corporate-tree-header').map((header) => header.text())).toEqual([
      'Parents',
      'Buyers',
    ])

    await findToggle(view, 'Acme Sub')?.trigger('click')

    expect(view.findAll('.corporate-tree-header').map((header) => header.text())).toEqual([
      'Parents',
      'Buyers',
      'Sales Lines',
    ])
  })

  it('still shows the Parents header when the requested buyer is the root of the tree', async () => {
    fetchBuyerCorporateTree.mockResolvedValue(
      tree({
        nodes: [
          node({ id: 10, companyName: 'Acme Corp', role: 'Self', isRequestedBuyer: true }),
          node({ id: 20, companyName: 'Acme Sub', role: 'Counterparty', resolution: 'Named' }),
        ],
        edges: [{ parentId: 10, childId: 20 }],
      }),
    )

    const view = mountTab()
    await flushPromises()

    const headers = view.findAll('.corporate-tree-header').map((header) => header.text())
    expect(headers).toEqual(['Parents', 'Buyers'])
  })

  it('renders a No Parent placeholder card under the Parents header when the response has no Parent-role node', async () => {
    fetchBuyerCorporateTree.mockResolvedValue(
      tree({
        nodes: [
          node({ id: 10, companyName: 'Acme Corp', role: 'Self', isRequestedBuyer: true }),
          node({ id: 20, companyName: 'Acme Sub', role: 'Counterparty', resolution: 'Named' }),
        ],
        edges: [{ parentId: 10, childId: 20 }],
      }),
    )

    const view = mountTab()
    await flushPromises()

    const placeholder = view.find('.corporate-tree-node--no-parent')
    expect(placeholder.exists()).toBe(true)
    expect(placeholder.text()).toContain('No Parent')
  })

  it('does not render a No Parent placeholder when the response already has a Parent-role node', async () => {
    fetchBuyerCorporateTree.mockResolvedValue(tree())

    const view = mountTab()
    await flushPromises()

    expect(view.find('.corporate-tree-node--no-parent').exists()).toBe(false)
  })

  it('does not render a No Parent placeholder when the requested buyer is the root but its own role is Parent', async () => {
    // A buyer can legitimately BE the ultimate parent of its own group (its role is "Parent"
    // precisely because it has subsidiaries below it and no ancestor above) - the root having no
    // incoming edge does not by itself mean a parent is missing.
    fetchBuyerCorporateTree.mockResolvedValue(
      tree({
        nodes: [
          node({ id: 921, companyName: 'Assa Abloy AB', role: 'Parent', isRequestedBuyer: true }),
          node({ id: 991, companyName: 'Assa Abloy Limited', role: 'Counterparty', resolution: 'Enriched' }),
        ],
        edges: [{ parentId: 921, childId: 991 }],
      }),
    )

    const view = mountTab()
    await flushPromises()

    expect(view.find('.corporate-tree-node--no-parent').exists()).toBe(false)
    expect(view.text()).toContain('Assa Abloy AB')
    expect(view.text()).toContain('Assa Abloy Limited')
  })

  it('does not open the modal when the No Parent placeholder is clicked', async () => {
    fetchBuyerCorporateTree.mockResolvedValue(
      tree({
        nodes: [
          node({ id: 10, companyName: 'Acme Corp', role: 'Self', isRequestedBuyer: true }),
          node({ id: 20, companyName: 'Acme Sub', role: 'Counterparty', resolution: 'Named' }),
        ],
        edges: [{ parentId: 10, childId: 20 }],
      }),
    )
    const modal = useCustomerCardModalStore()

    const view = mountTab()
    await flushPromises()

    const placeholderLabel = view.findAll('.org-tree-node-label-inner').find((el) => el.text().includes('No Parent'))
    await placeholderLabel?.trigger('click')

    expect(modal.isOpen).toBe(false)
  })

  it('shows the Sales Lines header for the requested buyer\'s own sales lines immediately, even with no parent', async () => {
    fetchBuyerCorporateTree.mockResolvedValue(
      tree({
        nodes: [
          node({
            id: 10,
            companyName: 'Acme Corp',
            role: 'Counterparty',
            isRequestedBuyer: true,
            salesLines: [salesLine()],
          }),
        ],
        edges: [],
      }),
    )

    const view = mountTab()
    await flushPromises()

    // The No Parent placeholder wraps the buyer as its own child in the tree data - a node's
    // `kind` must not stop `hasVisibleExpandedSalesLines` from recursing into ITS children too,
    // or a sales line nested under that wrapper (the buyer's own, here) would never be found. The
    // requested buyer's own sales lines start expanded - no toggle click needed here.
    expect(view.findAll('.corporate-tree-header').map((header) => header.text())).toEqual([
      'Parents',
      'Buyers',
      'Sales Lines',
    ])
  })

  it('hides the Subsidiaries header when the requested buyer has no children', async () => {
    fetchBuyerCorporateTree.mockResolvedValue(
      tree({
        nodes: [
          node({ id: 1, companyName: 'Top Parent', role: 'Parent', resolution: 'Resolved' }),
          node({ id: 10, companyName: 'Acme Corp', role: 'Self', isRequestedBuyer: true }),
        ],
        edges: [{ parentId: 1, childId: 10 }],
      }),
    )

    const view = mountTab()
    await flushPromises()

    const headers = view.findAll('.corporate-tree-header').map((header) => header.text())
    expect(headers).toEqual(['Parents', 'Buyers'])
  })

  it('shows the Parents and Buyer Entities headers, not Sales Lines, for a buyer with no relationships at all', async () => {
    fetchBuyerCorporateTree.mockResolvedValue(
      tree({
        nodes: [node({ id: 10, companyName: 'Acme Corp', role: 'Self', isRequestedBuyer: true })],
        edges: [],
      }),
    )

    const view = mountTab()
    await flushPromises()

    const headers = view.findAll('.corporate-tree-header').map((header) => header.text())
    expect(headers).toEqual(['Parents', 'Buyers'])
  })

  it('hides Buyer Entities and Sales Lines when an ancestor above the buyer is collapsed', async () => {
    fetchBuyerCorporateTree.mockResolvedValue(treeWithVisibleSalesLines())

    const view = mountTab()
    await flushPromises()
    // Sanity check: Sales Lines is actually visible before collapsing anything, so the assertion
    // below is verifying a real hide, not a header that was already absent.
    expect(view.findAll('.corporate-tree-header').map((header) => header.text())).toContain('Sales Lines')

    await findToggle(view, 'Top Parent')?.trigger('click')

    const headers = view.findAll('.corporate-tree-header').map((header) => header.text())
    expect(headers).toEqual(['Parents'])
  })

  it('hides only Sales Lines when the buyer\'s own card is collapsed', async () => {
    fetchBuyerCorporateTree.mockResolvedValue(treeWithVisibleSalesLines())

    const view = mountTab()
    await flushPromises()
    expect(view.findAll('.corporate-tree-header').map((header) => header.text())).toContain('Sales Lines')

    await findToggle(view, 'Acme Sub')?.trigger('click')

    const headers = view.findAll('.corporate-tree-header').map((header) => header.text())
    expect(headers).toEqual(['Parents', 'Buyers'])
  })

  it('re-shows the Sales Lines header once its collapsed ancestor is expanded again', async () => {
    fetchBuyerCorporateTree.mockResolvedValue(treeWithVisibleSalesLines())

    const view = mountTab()
    await flushPromises()

    const buyerToggle = findToggle(view, 'Acme Sub')
    await buyerToggle?.trigger('click')
    expect(view.findAll('.corporate-tree-header').map((header) => header.text())).not.toContain('Sales Lines')

    await buyerToggle?.trigger('click')
    expect(view.findAll('.corporate-tree-header').map((header) => header.text())).toContain('Sales Lines')
  })

  it('states explicitly when a depth or node bound truncated the walk', async () => {
    fetchBuyerCorporateTree.mockResolvedValue(tree({ truncated: true }))

    const view = mountTab()
    await flushPromises()

    expect(view.text()).toContain('depth or size limit')
  })

  it('states explicitly when a cycle was cut from the walk, naming how many', async () => {
    fetchBuyerCorporateTree.mockResolvedValue(tree({ partial: true, cycles: [{ parentId: 20, childId: 1 }] }))

    const view = mountTab()
    await flushPromises()

    expect(view.text()).toContain('1 ownership cycle(s) found')
  })

  it('reports an unrenderable response rather than a blank panel (no node with no incoming edge)', async () => {
    fetchBuyerCorporateTree.mockResolvedValue(
      tree({
        nodes: [
          node({ id: 1, companyName: 'A', role: 'Self', isRequestedBuyer: true }),
          node({ id: 2, companyName: 'B', role: 'Counterparty', resolution: 'Named' }),
        ],
        edges: [
          { parentId: 1, childId: 2 },
          { parentId: 2, childId: 1 },
        ],
      }),
    )

    const view = mountTab()
    await flushPromises()

    expect(view.find('.no-data').exists()).toBe(true)
    expect(view.find('.corporate-tree-node').exists()).toBe(false)
  })

  it('re-targets the customer card modal to another node on click, on the corporate-tree tab', async () => {
    fetchBuyerCorporateTree.mockResolvedValue(tree())
    const modal = useCustomerCardModalStore()

    const view = mountTab({ versionId: '73', buyerId: '10' })
    await flushPromises()

    const subsidiaryLabel = view.findAll('.org-tree-node-label-inner').find((el) => el.text().includes('Acme Sub'))
    await subsidiaryLabel?.trigger('click')

    // modal.open takes the numeric versionId route PROP, not the fetch's own version uuid - the
    // two happen to be 73/VERSION_UUID for the same version here, but they are read from different
    // places (route param vs. context store).
    expect(modal.versionId).toBe(73)
    expect(modal.buyerId).toBe(20)
    // Re-targeting is opening that node's card, so it lands in "recently viewed" too.
    expect(markBuyerRecent).toHaveBeenCalledWith(VERSION_UUID, 20)
  })

  it('does not re-target the modal when the current buyer\'s own node is clicked', async () => {
    fetchBuyerCorporateTree.mockResolvedValue(tree())
    const modal = useCustomerCardModalStore()

    const view = mountTab({ versionId: '73', buyerId: '10' })
    await flushPromises()

    const buyerLabel = view.findAll('.org-tree-node-label-inner').find((el) => el.text().includes('Acme Corp'))
    await buyerLabel?.trigger('click')

    expect(modal.isOpen).toBe(false)
    expect(markBuyerRecent).not.toHaveBeenCalled()
  })

  it('seeds the modal\'s initialBuyer from the clicked node\'s own companyDetails', async () => {
    fetchBuyerCorporateTree.mockResolvedValue(
      tree({
        nodes: [
          node({ id: 10, companyName: 'Acme Corp', role: 'Self', isRequestedBuyer: true }),
          node({
            id: 20,
            companyName: 'Acme Sub',
            role: 'Counterparty',
            volume: 999,
            salesLines: [salesLine(), salesLine({ saleLineId: 2 })],
            companyDetails: companyDetails({
              companyName: 'Acme Subsidiary Ltd',
              originalName: 'Acme Sub Original',
              url: 'www.acme-sub.example',
              countryName: 'Sweden',
              countryFlagUrl: 'https://flags.example/se.svg',
              industryName: 'Widgets Manufacturing',
              isSme: true,
              smeSource: 'sweden',
              creditRating: 'BBB',
              parentId: 1,
              parentName: 'Top Parent',
              negotiationStatus: 'Ongoing',
            }),
          }),
        ],
        edges: [{ parentId: 10, childId: 20 }],
      }),
    )
    const modal = useCustomerCardModalStore()

    const view = mountTab({ versionId: '73', buyerId: '10' })
    await flushPromises()

    const subsidiaryLabel = view.findAll('.org-tree-node-label-inner').find((el) => el.text().includes('Acme Sub'))
    await subsidiaryLabel?.trigger('click')

    expect(modal.initialBuyer).toMatchObject({
      id: 20,
      role: 'Counterparty',
      name: 'Acme Subsidiary Ltd',
      originalName: 'Acme Sub Original',
      url: 'www.acme-sub.example',
      country: 'Sweden',
      countryFlagUrl: 'https://flags.example/se.svg',
      industry: 'Widgets Manufacturing',
      isSme: true,
      smeSource: 'sweden',
      creditRating: 'BBB',
      parentId: 1,
      parentName: 'Top Parent',
      negotiationStatus: 'Ongoing',
      volume: 999,
      saleLineCount: 2,
    })
  })

  it('falls back to the node\'s own fields for initialBuyer when it has no companyDetails', async () => {
    fetchBuyerCorporateTree.mockResolvedValue(
      tree({
        nodes: [
          node({ id: 10, companyName: 'Acme Corp', role: 'Self', isRequestedBuyer: true }),
          node({ id: 20, companyName: 'Acme Sub', role: 'Counterparty', companyDetails: null }),
        ],
        edges: [{ parentId: 10, childId: 20 }],
      }),
    )
    const modal = useCustomerCardModalStore()

    const view = mountTab({ versionId: '73', buyerId: '10' })
    await flushPromises()

    const subsidiaryLabel = view.findAll('.org-tree-node-label-inner').find((el) => el.text().includes('Acme Sub'))
    await subsidiaryLabel?.trigger('click')

    expect(modal.initialBuyer).toMatchObject({
      id: 20,
      role: 'Counterparty',
      name: 'Acme Sub',
      country: null,
      countryFlagUrl: null,
    })
  })

  it('shows volume/cash flow/payment terms/country metrics on Parent and Counterparty cards', async () => {
    fetchBuyerCorporateTree.mockResolvedValue(
      tree({
        nodes: [
          node({
            id: 1,
            companyName: 'Top Parent',
            role: 'Parent',
            volume: 628.6,
            cashFlow: 41.5,
            paymentTerms: 45,
            paymentTermsOpportunity: 44,
            country: 'CZE',
          }),
          node({ id: 10, companyName: 'Acme Corp', role: 'Self', isRequestedBuyer: true }),
        ],
        edges: [{ parentId: 1, childId: 10 }],
      }),
    )

    const view = mountTab()
    await flushPromises()

    const parentCard = view.findAll('.corporate-tree-node').find((n) => n.text().includes('Top Parent'))
    expect(parentCard?.text()).toContain('Volume:')
    expect(parentCard?.text()).toContain('$628.6')
    expect(parentCard?.text()).toContain('Cash Flow:')
    expect(parentCard?.text()).toContain('$41.5')
    expect(parentCard?.text()).toContain('PT:')
    expect(parentCard?.text()).toContain('45d')
    expect(parentCard?.text()).toContain('PT Opp.:')
    expect(parentCard?.text()).toContain('44d')
    expect(parentCard?.text()).toContain('Country:')
    expect(parentCard?.text()).toContain('CZE')
  })

  it('places the symbol after the minus sign for a negative cash flow, never "$-41.5"', async () => {
    fetchBuyerCorporateTree.mockResolvedValue(
      tree({
        nodes: [
          node({ id: 1, companyName: 'Top Parent', role: 'Parent', cashFlow: -41.5 }),
          node({ id: 10, companyName: 'Acme Corp', role: 'Self', isRequestedBuyer: true }),
        ],
        edges: [{ parentId: 1, childId: 10 }],
      }),
    )

    const view = mountTab()
    await flushPromises()

    const parentCard = view.findAll('.corporate-tree-node').find((n) => n.text().includes('Top Parent'))
    expect(parentCard?.text()).toContain('-$41.5')
  })

  it('falls back to the not-available dash for null cash flow/payment terms/country metrics', async () => {
    fetchBuyerCorporateTree.mockResolvedValue(
      tree({
        nodes: [
          node({
            id: 20,
            companyName: 'Acme Sub',
            role: 'Counterparty',
            cashFlow: null,
            paymentTerms: null,
            paymentTermsOpportunity: null,
            country: null,
          }),
          node({ id: 10, companyName: 'Acme Corp', role: 'Self', isRequestedBuyer: true }),
        ],
        edges: [{ parentId: 10, childId: 20 }],
      }),
    )

    const view = mountTab()
    await flushPromises()

    const subsidiaryCard = view.findAll('.corporate-tree-node').find((n) => n.text().includes('Acme Sub'))
    // Label and value are separate spans with no text-node space between them (spacing is CSS
    // margin, not a rendered character), so the concatenated text has no space before the dash.
    expect(subsidiaryCard?.text()).toContain('Cash Flow:—')
    expect(subsidiaryCard?.text()).toContain('PT:—')
    expect(subsidiaryCard?.text()).toContain('PT Opp.:—')
    expect(subsidiaryCard?.text()).toContain('Country:—')
  })

  it('does not show the volume/cash flow/payment terms metrics on the requested buyer\'s own Self card', async () => {
    fetchBuyerCorporateTree.mockResolvedValue(
      tree({
        nodes: [node({ id: 10, companyName: 'Acme Corp', role: 'Self', isRequestedBuyer: true, volume: 628.6 })],
        edges: [],
      }),
    )

    const view = mountTab()
    await flushPromises()

    expect(view.find('.corporate-tree-node-metrics').exists()).toBe(false)
  })

  it('renders a Counterparty node\'s own sales lines as their own nodes nested under it', async () => {
    fetchBuyerCorporateTree.mockResolvedValue(
      tree({
        nodes: [
          node({
            id: 10,
            companyName: 'Acme Corp',
            role: 'Counterparty',
            isRequestedBuyer: true,
            salesLines: [salesLine({ supplierName: 'Supplier A', commodity: 'Widgets' })],
          }),
        ],
        edges: [],
      }),
    )

    const view = mountTab()
    await flushPromises()
    // The requested buyer's own sales lines start expanded - no toggle click needed.

    expect(view.find('.corporate-tree-node--sales-line').exists()).toBe(true)
    expect(view.text()).toContain('Supplier A')
    expect(view.text()).toContain('Widgets')
  })

  it('starts a Counterparty node collapsed when its sales lines are its only children and it is not the requested buyer', async () => {
    fetchBuyerCorporateTree.mockResolvedValue(
      tree({
        nodes: [
          node({ id: 10, companyName: 'Acme Corp', role: 'Self', isRequestedBuyer: true }),
          node({
            id: 20,
            companyName: 'Acme Sub',
            role: 'Counterparty',
            resolution: 'Named',
            salesLines: [salesLine({ supplierName: 'Supplier A' })],
          }),
        ],
        edges: [{ parentId: 10, childId: 20 }],
      }),
    )

    const view = mountTab()
    await flushPromises()

    expect(view.find('.corporate-tree-node--sales-line').exists()).toBe(false)
    expect(view.text()).not.toContain('Supplier A')

    await findToggle(view, 'Acme Sub')?.trigger('click')

    expect(view.find('.corporate-tree-node--sales-line').exists()).toBe(true)
    expect(view.text()).toContain('Supplier A')
  })

  it('keeps the requested buyer\'s own sales lines expanded while another Counterparty\'s stay collapsed, when the tree has more than one', async () => {
    // A Parent can have several Counterparty children (siblings) - only the one the
    // Customer Card is actually open for should show its sales lines by default.
    fetchBuyerCorporateTree.mockResolvedValue(
      tree({
        nodes: [
          node({ id: 1, companyName: 'Top Parent', role: 'Parent', resolution: 'Resolved' }),
          node({
            id: 10,
            companyName: 'Buyer A',
            role: 'Counterparty',
            isRequestedBuyer: true,
            salesLines: [salesLine({ supplierName: 'Supplier A' })],
          }),
          node({
            id: 20,
            companyName: 'Buyer B',
            role: 'Counterparty',
            salesLines: [salesLine({ supplierName: 'Supplier B' })],
          }),
        ],
        edges: [
          { parentId: 1, childId: 10 },
          { parentId: 1, childId: 20 },
        ],
      }),
    )

    const view = mountTab()
    await flushPromises()

    expect(view.text()).toContain('Supplier A')
    expect(view.text()).not.toContain('Supplier B')

    await findToggle(view, 'Buyer B')?.trigger('click')

    expect(view.text()).toContain('Supplier B')
  })

  it('does not start a Counterparty node collapsed when it also has real subsidiary company children', async () => {
    fetchBuyerCorporateTree.mockResolvedValue(
      tree({
        nodes: [
          node({ id: 1, companyName: 'Top Parent', role: 'Parent' }),
          node({
            id: 10,
            companyName: 'Acme Corp',
            role: 'Counterparty',
            isRequestedBuyer: true,
            salesLines: [salesLine({ supplierName: 'Supplier A' })],
          }),
          node({ id: 20, companyName: 'Acme Sub', role: 'Counterparty', resolution: 'Named' }),
        ],
        edges: [
          { parentId: 1, childId: 10 },
          { parentId: 10, childId: 20 },
        ],
      }),
    )

    const view = mountTab()
    await flushPromises()

    // Both the real subsidiary AND the sales line render without needing to expand anything first
    // - collapsing the whole node here would have hidden the subsidiary too, not just its own
    // sales-line detail. Both are visible together because Acme Corp is the requested buyer (its
    // own sales-lines group - see the dedicated test below for a non-requested-buyer counterpart -
    // defaults open too); the subsidiary itself is unconditional either way.
    expect(view.text()).toContain('Acme Sub')
    expect(view.text()).toContain('Supplier A')
  })

  it('shows a subsidiary immediately but keeps its own sales lines collapsed under their own toggle, when that subsidiary is not the requested buyer', async () => {
    fetchBuyerCorporateTree.mockResolvedValue(
      tree({
        nodes: [
          node({ id: 10, companyName: 'Acme Corp', role: 'Self', isRequestedBuyer: true }),
          node({
            id: 20,
            companyName: 'Acme Sub',
            role: 'Counterparty',
            resolution: 'Named',
            salesLines: [salesLine({ supplierName: 'Supplier A' })],
          }),
          node({ id: 30, companyName: 'Acme Sub Sub', role: 'Counterparty', resolution: 'Named' }),
        ],
        edges: [
          { parentId: 10, childId: 20 },
          { parentId: 20, childId: 30 },
        ],
      }),
    )

    const view = mountTab()
    await flushPromises()

    // Acme Sub's own real subsidiary (Acme Sub Sub) shows right away, but Acme Sub is not the
    // requested buyer, so its own sales lines stay collapsed under their own group toggle -
    // `SalesLinesGroupDisplayNode` - instead of sharing Acme Sub's toggle with Acme Sub Sub.
    expect(view.text()).toContain('Acme Sub Sub')
    expect(view.text()).not.toContain('Supplier A')

    expect(view.find('.corporate-tree-node--sales-lines-group').text()).toContain('Sales Lines (1)')

    await findToggle(view, 'Sales Lines (1)')?.trigger('click')

    expect(view.text()).toContain('Supplier A')
  })

  it('shows volume/cash flow/PT/buying entity/PT Opp./commodity metrics on a sales-line card', async () => {
    fetchBuyerCorporateTree.mockResolvedValue(
      tree({
        nodes: [
          node({
            id: 10,
            companyName: 'Acme Corp',
            role: 'Counterparty',
            isRequestedBuyer: true,
            salesLines: [
              salesLine({
                volume: 628.6,
                cashFlow: 41.4,
                paymentTerms: 45,
                paymentTermsOpportunity: 44,
                supplierName: 'Pagero Inc',
                commodity: 'Telephone',
              }),
            ],
          }),
        ],
        edges: [],
      }),
    )

    const view = mountTab()
    await flushPromises()

    const salesLineCard = view.find('.corporate-tree-node--sales-line')
    expect(salesLineCard.text()).toContain('Volume:')
    expect(salesLineCard.text()).toContain('$628.6')
    expect(salesLineCard.text()).toContain('Cash Flow:')
    expect(salesLineCard.text()).toContain('$41.4')
    expect(salesLineCard.text()).toContain('PT:')
    expect(salesLineCard.text()).toContain('45d')
    expect(salesLineCard.text()).toContain('PT Opp.:')
    expect(salesLineCard.text()).toContain('44d')
    expect(salesLineCard.text()).toContain('Buying Entity:')
    expect(salesLineCard.text()).toContain('Pagero Inc')
    expect(salesLineCard.text()).toContain('Commodity:')
    expect(salesLineCard.text()).toContain('Telephone')
  })

  it('falls back to the not-available dash for null cash flow/payment terms on a sales-line card', async () => {
    fetchBuyerCorporateTree.mockResolvedValue(
      tree({
        nodes: [
          node({
            id: 10,
            companyName: 'Acme Corp',
            role: 'Counterparty',
            isRequestedBuyer: true,
            salesLines: [salesLine({ cashFlow: null, paymentTerms: null, paymentTermsOpportunity: null })],
          }),
        ],
        edges: [],
      }),
    )

    const view = mountTab()
    await flushPromises()

    const salesLineCard = view.find('.corporate-tree-node--sales-line')
    expect(salesLineCard.text()).toContain('Cash Flow:—')
    expect(salesLineCard.text()).toContain('PT:—')
    expect(salesLineCard.text()).toContain('PT Opp.:—')
  })

  it('labels each of a Counterparty node\'s sales lines "Sale N" by its position in the array', async () => {
    fetchBuyerCorporateTree.mockResolvedValue(
      tree({
        nodes: [
          node({
            id: 10,
            companyName: 'Acme Corp',
            role: 'Counterparty',
            isRequestedBuyer: true,
            salesLines: [
              salesLine({ saleLineId: 1, supplierName: 'Supplier One' }),
              salesLine({ saleLineId: 2, supplierName: 'Supplier Two' }),
              salesLine({ saleLineId: 3, supplierName: 'Supplier Three' }),
            ],
          }),
        ],
        edges: [],
      }),
    )

    const view = mountTab()
    await flushPromises()

    const salesLineCards = view.findAll('.corporate-tree-node--sales-line')
    expect(salesLineCards).toHaveLength(3)
    expect(salesLineCards[0].text()).toContain('Sale 1')
    expect(salesLineCards[0].text()).toContain('Supplier One')
    expect(salesLineCards[1].text()).toContain('Sale 2')
    expect(salesLineCards[1].text()).toContain('Supplier Two')
    expect(salesLineCards[2].text()).toContain('Sale 3')
    expect(salesLineCards[2].text()).toContain('Supplier Three')
  })

  it('does not render sales-line nodes for a node with no Counterparty role, even if it somehow carried salesLines', async () => {
    fetchBuyerCorporateTree.mockResolvedValue(
      tree({
        nodes: [
          node({
            id: 10,
            companyName: 'Acme Corp',
            role: 'Parent',
            isRequestedBuyer: true,
            salesLines: [salesLine({ supplierName: 'Supplier A' })],
          }),
        ],
        edges: [],
      }),
    )

    const view = mountTab()
    await flushPromises()

    expect(view.find('.corporate-tree-node--sales-line').exists()).toBe(false)
    expect(view.text()).not.toContain('Supplier A')
  })

  it('renders at most 50 sales lines under a Counterparty node, even when the response sends more', async () => {
    const salesLines = Array.from({ length: 60 }, (_, i) => salesLine({ saleLineId: i + 1, supplierName: `Supplier ${i + 1}` }))
    fetchBuyerCorporateTree.mockResolvedValue(
      tree({
        nodes: [
          node({
            id: 10,
            companyName: 'Acme Corp',
            role: 'Counterparty',
            isRequestedBuyer: true,
            salesLines,
            salesLinesTruncated: true,
          }),
        ],
        edges: [],
      }),
    )

    const view = mountTab()
    await flushPromises()

    expect(view.findAll('.corporate-tree-node--sales-line')).toHaveLength(50)
    expect(view.text()).toContain('Supplier 50')
    expect(view.text()).not.toContain('Supplier 51')
  })

  it('shows the sales-lines-truncated notice on a Counterparty node past the 50-line cap', async () => {
    fetchBuyerCorporateTree.mockResolvedValue(
      tree({
        nodes: [
          node({
            id: 10,
            companyName: 'Acme Corp',
            role: 'Counterparty',
            isRequestedBuyer: true,
            salesLines: [salesLine()],
            salesLinesTruncated: true,
          }),
        ],
        edges: [],
      }),
    )

    const view = mountTab()
    await flushPromises()

    expect(view.text()).toContain('more exist for this entity')
  })

  it('does not show the sales-lines-truncated notice when the node is at or under the cap', async () => {
    fetchBuyerCorporateTree.mockResolvedValue(
      tree({
        nodes: [
          node({
            id: 10,
            companyName: 'Acme Corp',
            role: 'Counterparty',
            isRequestedBuyer: true,
            salesLines: [salesLine()],
            salesLinesTruncated: false,
          }),
        ],
        edges: [],
      }),
    )

    const view = mountTab()
    await flushPromises()

    expect(view.text()).not.toContain('more exist for this entity')
  })

  it('does not re-target the modal when a sales line node is clicked', async () => {
    fetchBuyerCorporateTree.mockResolvedValue(
      tree({
        nodes: [
          node({
            id: 10,
            companyName: 'Acme Corp',
            role: 'Counterparty',
            isRequestedBuyer: true,
            salesLines: [salesLine({ supplierName: 'Supplier A' })],
          }),
        ],
        edges: [],
      }),
    )
    const modal = useCustomerCardModalStore()

    const view = mountTab()
    await flushPromises()

    const salesLineLabel = view.findAll('.org-tree-node-label-inner').find((el) => el.text().includes('Supplier A'))
    expect(salesLineLabel).toBeTruthy()
    await salesLineLabel?.trigger('click')

    expect(modal.isOpen).toBe(false)
  })

  it('reloads when the buyer id prop changes', async () => {
    fetchBuyerCorporateTree.mockResolvedValueOnce(tree())
    const view = mountTab({ versionId: '73', buyerId: '10' })
    await flushPromises()
    expect(fetchBuyerCorporateTree).toHaveBeenCalledTimes(1)

    fetchBuyerCorporateTree.mockResolvedValueOnce(tree({ buyerId: 99 }))
    await view.setProps({ buyerId: '99' })
    await flushPromises()

    expect(fetchBuyerCorporateTree).toHaveBeenCalledTimes(2)
    expect(fetchBuyerCorporateTree).toHaveBeenLastCalledWith(VERSION_UUID, 99, 1)
  })
})
