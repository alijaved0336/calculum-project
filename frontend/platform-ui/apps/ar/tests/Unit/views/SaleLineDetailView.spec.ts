import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'
import { createPinia, setActivePinia } from 'pinia'

const fetchBuyerLine = vi.fn()
vi.mock('@/api', () => ({
  fetchBuyerLine: (...args: unknown[]) => fetchBuyerLine(...args),
}))

vi.mock('@ada/auth', () => ({ authLogin: vi.fn() }))
vi.mock('@/utils/getBaseApi', () => ({ getBaseApi: () => 'http://api.test' }))

const openMatch = vi.fn()
const openCustomerCard = vi.fn()
vi.mock('@/modules/match/MatchRouting', () => ({
  openMatch: (...args: unknown[]) => openMatch(...args),
  openCustomerCard: (...args: unknown[]) => openCustomerCard(...args),
}))

vi.mock('@ada/design-system', () => ({
  CalculumLayout: { template: '<div><slot name="slotTop" /><slot name="slotContent" /></div>' },
  CalculumLoadingAr: { template: '<div class="loading" />' },
  ContentBox: { template: '<div><slot name="header-title" /><slot /></div>' },
  ContentBoxBody: { template: '<div><slot /></div>' },
  NoDataAvailable: { props: ['title'], template: '<div class="no-data">{{ title }}</div>' },
  CustomBadge: { props: ['text', 'variant'], template: '<span class="badge">{{ text }}</span>' },
}))

import { HttpError } from '@/api/http'
import SaleLineDetailView from '@/modules/match/views/SaleLineDetailView.vue'
import { resolveSaleLineFieldLabel } from '@/modules/buyers/components/customerCard/saleLineFields'
import type { SaleLineCustomAttributeValue, SaleLineDetailDto, SaleLineDetailResponse, SaleLineStrategyResultDto } from '@/api'

const messages = {
  en: {
    arEntityCard: {
      opportunity: {
        days: '{count} day | {count} days',
      },
    },
    arCustomerCard: {
      strategyResults: {
        winner: 'Winner',
        selectionOutcomes: {
          selected: 'Selected',
          cappedByRegulation: 'Capped by regulation',
          longerThanSelected: 'Longer than selected',
          noReduction: 'No reduction',
          notApplicable: 'Not applicable',
          notACandidate: 'Not a candidate',
        },
      },
    },
    arSaleLine: {
      title: 'Sales Line',
      back: 'Back to Customer Card',
      notFound: 'This sales line could not be found for this buyer.',
      loadError: 'Could not load the sales line. Try again.',
      notAvailable: '—',
      notSupplied: 'Not supplied',
      customAttributesEmpty: 'This line has no custom attributes.',
      yesNo: { true: 'Yes', false: 'No' },
      sections: {
        identity: 'Identity and dates',
        volumeTerms: 'Volume and terms',
        negotiation: 'Negotiation',
        wacc: 'WACC and credit',
        virtualCard: 'Virtual card',
        enrichment: 'Calculation results',
        marketPosition: 'Market position',
        customAttributes: 'Custom attributes',
      },
      fields: {
        id: 'ID',
        saleFileVersionId: 'Sale file version ID',
        companyId: 'Company ID',
        buyerId: 'Buyer ID',
        supplierId: 'Supplier ID',
        currencyId: 'Currency ID',
        salesTeam: 'Sales team',
        startDate: 'Start date',
        endDate: 'End date',
        year: 'Year',
        periodInMonths: 'Period (months)',
        commodity: 'Commodity',
        originalCommodity: 'Original commodity',
        internalId: 'Internal ID',
        aggregatedLinesCount: 'Aggregated lines',
        alias: 'Alias',
        buyerName: 'Buyer name',
        buyerCountry: 'Buyer country',
        supplierEntityName: 'Supplier entity name',
        supplierEntityCountry: 'Supplier entity country',
        invoiceCurrency: 'Invoice currency',
        volume: 'Volume',
        forecastVolume: 'Forecast volume',
        actualPaymentTerms: 'Actual payment terms',
        contractualActual: 'Contractual (actual)',
        contractualPaymentTermsWithCashDiscounts: 'Contractual terms with cash discount',
        contractualPaymentTermsWithoutCashDiscounts: 'Contractual terms without cash discount',
        buyerPaymentTermPolicy: 'Buyer payment term policy',
        cashDiscounts: 'Cash discounts',
        capturedCashDiscounts: 'Captured cash discounts',
        averageDaysToApproveInvoice: 'Average days to approve invoice',
        usingWorkingCapitalFinance: 'Using working capital finance',
        dateOfLastTermNegotiation: 'Date of last term negotiation',
        reason: 'Reason',
        reasonManuallySetAt: 'Reason manually set at',
        targetPaymentTerms: 'Target payment terms',
        negotiationStatus: 'Negotiation status',
        negotiationStatusCode: 'Negotiation status code',
        negotiationStatusUpdatedAt: 'Negotiation status updated at',
        isPilot: 'Pilot',
        afterTaxWacc: 'After-tax WACC',
        preTaxWacc: 'Pre-tax WACC',
        waccSource: 'WACC source',
        waccFromParent: 'WACC from parent',
        creditScore: 'Credit score',
        dataQuality: 'Data quality',
        vCardAverageTransactionSize: 'Average transaction size',
        vCardNumberOfPayments: 'Number of payments',
        vCardNumberOfInvoices: 'Number of invoices',
        vCardIsAlreadyInUse: 'Already in use',
        vCardVolume: 'Virtual card volume',
        vCardAcceptanceType: 'Acceptance type',
        vCardProvider: 'Provider',
        vCardPaymentMethod: 'Payment method',
        vCardLargestTransactionSize: 'Largest transaction size',
        vCardIndirectSpend: 'Indirect spend',
        calculatedPaymentTerms: 'Calculated payment terms',
        calculatedPaymentTermsSource: 'Calculated payment terms source',
        weightedPaymentTerms: 'Weighted payment terms',
        effectiveCashDiscountRate: 'Effective cash discount rate',
        fundingCost: 'Funding cost',
        winningStrategy: 'Winning strategy',
        recommendedTerm: 'Recommended term',
        currentTerm: 'Current term',
        expectedTerm: 'Expected term',
        cashFlowImpact: 'Cash flow impact',
        economicProfitImpact: 'Economic profit impact',
        economicProfitBuyerImpact: 'Economic profit impact (buyer)',
        expectedCashFlowImpact: 'Expected cash flow impact',
        expectedEconomicProfitImpact: 'Expected economic profit impact',
        expectedEconomicProfitBuyerImpact: 'Expected economic profit impact (buyer)',
        financingRate: 'Financing rate',
        marketShareLevel: 'Market share',
        switchingCostLevel: 'Switching cost',
      },
      strategyResults: {
        title: 'Strategy results',
        provisional: 'Provisional',
        description: 'These figures come straight from the calculation tables, for this sales line.',
        empty: 'No strategy result exists for this line.',
        proposedTerm: 'Proposed term',
        selectionOutcome: 'Selection outcome',
      },
    },
  },
}

function mountView(versionId = '73', buyerId = '10', lineId = '501') {
  const i18n = createI18n({ legacy: false, locale: 'en', fallbackLocale: 'en', messages })
  return mount(SaleLineDetailView, { props: { versionId, buyerId, lineId }, global: { plugins: [i18n] } })
}

/** A fully populated, valid line - every one of `SaleLineDetailDto`'s 57 `SaleLine` fields plus
 * its 18 enrichment fields, so a test only has to override what it actually cares about. */
function baseLine(overrides: Partial<SaleLineDetailDto> = {}): SaleLineDetailDto {
  return {
    id: 501,
    saleFileVersionId: 73,
    companyId: 5,
    buyerId: 10,
    supplierId: 6,
    currencyId: 1,
    salesTeam: 'Team A',
    startDate: '2024-01-01',
    endDate: '2024-01-31',
    year: 2024,
    periodInMonths: 1,
    volume: 12345,
    forecastVolume: 13000,
    actualPaymentTerms: 30,
    contractualActual: 32,
    contractualPaymentTermsWithCashDiscounts: 25,
    contractualPaymentTermsWithoutCashDiscounts: 45,
    buyerPaymentTermPolicy: 60,
    cashDiscounts: 2,
    capturedCashDiscounts: 1,
    averageDaysToApproveInvoice: 3,
    dateOfLastTermNegotiation: '2023-06-01',
    usingWorkingCapitalFinance: false,
    commodity: 'Widgets',
    originalCommodity: 'Widgets Raw',
    internalId: 'INT-1',
    aggregatedLinesCount: 4,
    alias: 'Line alias',
    reason: 'Manual override',
    reasonManuallySetAt: '2024-02-01T10:00:00Z',
    creditScore: 700,
    dataQuality: 0.9,
    targetPaymentTerms: 40,
    afterTaxWacc: 0.08,
    preTaxWacc: 0.1,
    waccSource: 'Company',
    waccFromParent: false,
    negotiationStatus: 'Open',
    negotiationStatusCode: 1,
    negotiationStatusUpdatedAt: '2024-02-02T10:00:00Z',
    isPilot: true,
    vCardAverageTransactionSize: 500,
    vCardNumberOfPayments: 12,
    vCardNumberOfInvoices: 12,
    vCardIsAlreadyInUse: false,
    vCardVolume: 6000,
    vCardAcceptanceType: 'Full',
    vCardProvider: 'AmEx',
    vCardPaymentMethod: 'Card',
    vCardLargestTransactionSize: 900,
    vCardIndirectSpend: false,
    buyerName: null,
    buyerCountry: null,
    supplierEntityName: null,
    supplierEntityCountry: null,
    invoiceCurrency: null,
    calculatedPaymentTerms: 42,
    calculatedPaymentTermsSource: 'Strategy',
    weightedPaymentTerms: 41,
    effectiveCashDiscountRate: 0.01,
    fundingCost: 100,
    winningStrategy: 'BuyerStandardStrategy',
    recommendedTerm: 45,
    currentTerm: 30,
    expectedTerm: 42,
    cashFlowImpact: 1000,
    economicProfitImpact: 200,
    economicProfitBuyerImpact: 50,
    expectedCashFlowImpact: 900,
    expectedEconomicProfitImpact: 180,
    expectedEconomicProfitBuyerImpact: 45,
    financingRate: 0.05,
    marketShareLevel: 'High',
    switchingCostLevel: 'Medium',
    customAttributes: [],
    ...overrides,
  }
}

/** Every enrichment field null - the shape a line carries before the calculation has reached it,
 * which must render, not error. */
const nullEnrichment: Partial<SaleLineDetailDto> = {
  calculatedPaymentTerms: null,
  calculatedPaymentTermsSource: null,
  weightedPaymentTerms: null,
  effectiveCashDiscountRate: null,
  fundingCost: null,
  winningStrategy: null,
  recommendedTerm: null,
  currentTerm: null,
  expectedTerm: null,
  cashFlowImpact: null,
  economicProfitImpact: null,
  economicProfitBuyerImpact: null,
  expectedCashFlowImpact: null,
  expectedEconomicProfitImpact: null,
  expectedEconomicProfitBuyerImpact: null,
  financingRate: null,
  marketShareLevel: null,
  switchingCostLevel: null,
}

function detailWith(
  line: Partial<SaleLineDetailDto> = {},
  strategyResults: SaleLineStrategyResultDto[] = [],
): SaleLineDetailResponse {
  return { line: baseLine(line), strategyResults }
}

/** A field row's rendered value, by its label - the same `dt`/`dd` pairing every group on this
 * view renders through `deriveSaleLineFieldRows`. */
function rowValue(view: ReturnType<typeof mount>, label: string): string {
  const dt = view.findAll('dt').find((d) => d.text() === label)
  if (!dt) throw new Error(`no row labelled ${label}`)
  return (dt.element.nextElementSibling as HTMLElement).textContent!.trim()
}

describe('SaleLineDetailView', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('treats a malformed route segment as not-found without asking the API', async () => {
    const view = mountView('73', '10', 'abc')
    await flushPromises()

    expect(view.text()).toContain('This sales line could not be found for this buyer.')
    expect(fetchBuyerLine).not.toHaveBeenCalled()

    view.unmount()
  })

  it('renders not-found on a 404', async () => {
    fetchBuyerLine.mockRejectedValue(new HttpError(404, '/lines/501', ''))
    const view = mountView()
    await flushPromises()

    expect(view.text()).toContain('This sales line could not be found for this buyer.')

    view.unmount()
  })

  it('renders the load error on anything other than a 404', async () => {
    fetchBuyerLine.mockRejectedValue(new HttpError(500, '/lines/501', ''))
    const view = mountView()
    await flushPromises()

    expect(view.text()).toContain('Could not load the sales line. Try again.')

    view.unmount()
  })

  // The calculation has not reached this line yet - the enrichment block being entirely null is
  // an expected, ordinary state, not an error, and the screen (including the fields around it)
  // must still render.
  it("renders money fields (volume, capturedCashDiscounts, cashFlowImpact, vCard transaction/volume fields) with the selected currency's symbol, non-money numeric fields unaffected (UC-UI-23)", async () => {
    fetchBuyerLine.mockResolvedValue(detailWith({
      volume: 12345,
      capturedCashDiscounts: 1500,
      cashFlowImpact: 900,
      vCardAverageTransactionSize: 500,
      vCardVolume: 6000,
      vCardLargestTransactionSize: 900,
      periodInMonths: 6,
      creditScore: 82,
    }))
    const view = mountView()
    await flushPromises()

    expect(view.text()).toContain('$12,345')
    expect(view.text()).toContain('$1,500')
    expect(view.text()).toContain('$900')
    expect(view.text()).toContain('$500')
    expect(view.text()).toContain('$6,000')

    const fieldRow = (label: string) =>
      view.findAll('dt').find((dt) => dt.text() === label)?.element.nextElementSibling?.textContent
    // periodInMonths/creditScore are plain numeric fields ('number' kind), never money.
    expect(fieldRow('Period (months)')).toBe('6')
    expect(fieldRow('Credit score')).toBe('82')

    view.unmount()
  })

  it('places the symbol after the minus sign for a negative money field, never "$-900"', async () => {
    fetchBuyerLine.mockResolvedValue(detailWith({ cashFlowImpact: -900 }))
    const view = mountView()
    await flushPromises()

    expect(view.text()).toContain('-$900')

    view.unmount()
  })

  it('still renders when the entire enrichment block is null', async () => {
    fetchBuyerLine.mockResolvedValue(detailWith(nullEnrichment))
    const view = mountView()
    await flushPromises()

    expect(view.text()).toContain('Calculation results')
    expect(view.text()).toContain('Identity and dates')
    // The enrichment fields render like any other absent value - no error state and no
    // "not found"/"load error" notice, only the (unrelated) empty states this fixture's empty
    // customAttributes/strategyResults arrays legitimately produce elsewhere on the screen.
    expect(view.text()).not.toContain('This sales line could not be found for this buyer.')
    expect(view.text()).not.toContain('Could not load the sales line. Try again.')
    expect(view.find('dl').exists()).toBe(true)

    view.unmount()
  })

  it("renders the line's own Market Share and Switching Cost bands in their own group (UC-UI-26 FR2)", async () => {
    fetchBuyerLine.mockResolvedValue(detailWith({ marketShareLevel: 'High', switchingCostLevel: 'Medium' }))
    const view = mountView()
    await flushPromises()

    expect(view.text()).toContain('Market position')
    expect(rowValue(view, 'Market share')).toBe('High')
    expect(rowValue(view, 'Switching cost')).toBe('Medium')

    view.unmount()
  })

  it('renders Market Share and Switching Cost as absent, not a default Medium, when the calculation has not reached the line (A1)', async () => {
    fetchBuyerLine.mockResolvedValue(detailWith({ marketShareLevel: null, switchingCostLevel: null, financingRate: null }))
    const view = mountView()
    await flushPromises()

    const absent = rowValue(view, 'Financing rate')
    expect(rowValue(view, 'Market share')).toBe(absent)
    expect(rowValue(view, 'Switching cost')).toBe(absent)

    view.unmount()
  })

  // One of the two load-bearing tests: a strategy this front end has never heard of, with input
  // keys in no map, must render end to end with no change to this component - the humanizing and
  // ordering already live in strategyInputs.ts.
  it('renders an unrecognised strategy and its unknown input keys, with no change to the component', async () => {
    const unknown: SaleLineStrategyResultDto = {
      strategy: 'FutureFamilyStrategy',
      proposedTerm: 45,
      applicabilityReason: null,
      selectionOutcome: 'selected',
      inputs: { foo: 1, barBaz: 2 },
    }
    fetchBuyerLine.mockResolvedValue(detailWith({}, [unknown]))
    const view = mountView()
    await flushPromises()

    expect(view.text()).toContain('FutureFamilyStrategy')
    expect(view.text()).toContain('45 days')
    expect(view.text()).toContain('Foo')
    expect(view.text()).toContain('Bar Baz')

    view.unmount()
  })

  it('marks the strategy row matching the line\'s winningStrategy, and leaves the other row unmarked', async () => {
    const winner: SaleLineStrategyResultDto = {
      strategy: 'BuyerStandardStrategy',
      proposedTerm: 45,
      applicabilityReason: null,
      selectionOutcome: 'selected',
      inputs: null,
    }
    const loser: SaleLineStrategyResultDto = {
      strategy: 'BuyerParentMinStrategy',
      proposedTerm: null,
      applicabilityReason: 'No parent on file',
      selectionOutcome: 'not_applicable',
      inputs: null,
    }
    // baseLine's default winningStrategy is 'BuyerStandardStrategy'.
    fetchBuyerLine.mockResolvedValue(detailWith({}, [winner, loser]))
    const view = mountView()
    await flushPromises()

    const rows = view.findAll('.strategy-results-row')
    const winnerRow = rows.find((row) => row.text().includes('BuyerStandardStrategy'))
    const loserRow = rows.find((row) => row.text().includes('BuyerParentMinStrategy'))

    expect(winnerRow?.text()).toContain('Winner')
    expect(loserRow?.text()).not.toContain('Winner')

    view.unmount()
  })

  it('marks no row when the line\'s winningStrategy is null, never guessed from a row with a term', async () => {
    const candidate: SaleLineStrategyResultDto = {
      strategy: 'BuyerStandardStrategy',
      proposedTerm: 45,
      applicabilityReason: null,
      selectionOutcome: 'selected',
      inputs: null,
    }
    fetchBuyerLine.mockResolvedValue(detailWith({ winningStrategy: null }, [candidate]))
    const view = mountView()
    await flushPromises()

    expect(view.text()).not.toContain('Winner')

    view.unmount()
  })

  it('marks no row and does not throw when the entire enrichment block (including winningStrategy) is null', async () => {
    const candidate: SaleLineStrategyResultDto = {
      strategy: 'BuyerStandardStrategy',
      proposedTerm: 45,
      applicabilityReason: null,
      selectionOutcome: 'selected',
      inputs: null,
    }
    fetchBuyerLine.mockResolvedValue(detailWith(nullEnrichment, [candidate]))
    const view = mountView()
    // Renders past the loading state with no error thrown - null winningStrategy alongside a
    // strategyResults row with a real proposedTerm is exactly the "calculation has not reached
    // this line yet" shape and must not crash.
    await flushPromises()

    expect(view.text()).not.toContain('Winner')
    expect(view.text()).toContain('BuyerStandardStrategy')

    view.unmount()
  })

  it('renders the six structurally-always-null fields like any other absent field, not hidden and not annotated', async () => {
    fetchBuyerLine.mockResolvedValue(detailWith())
    const view = mountView()
    await flushPromises()

    expect(view.text()).toContain('Buyer name')
    expect(view.text()).toContain('Supplier entity name')
    // formatted with the same '—' every other null text field gets, nothing distinguishing it.
    expect(view.text()).toContain('—')

    view.unmount()
  })

  it('renders the custom attributes in declaration order, using the backend-supplied title', async () => {
    const attributes: SaleLineCustomAttributeValue[] = [
      { ordinal: 2, title: 'Second attribute', dataType: 'text', aggregation: 'list', value: 'B', supplied: true },
      { ordinal: 1, title: 'First attribute', dataType: 'text', aggregation: 'list', value: 'A', supplied: true },
    ]
    fetchBuyerLine.mockResolvedValue(detailWith({ customAttributes: attributes }))
    const view = mountView()
    await flushPromises()

    const text = view.text()
    expect(text.indexOf('Second attribute')).toBeLessThan(text.indexOf('First attribute'))

    view.unmount()
  })

  it('navigates back to the Customer Card this line belongs to', async () => {
    fetchBuyerLine.mockResolvedValue(detailWith())
    const view = mountView('73', '10', '501')
    await flushPromises()

    await view.find('button').trigger('click')

    expect(openCustomerCard).toHaveBeenCalledWith(73, 10)

    view.unmount()
  })
})

// resolveSaleLineFieldLabel's own contract, isolated from rendering: it has no notion of which
// keys SALE_LINE_FIELD_GROUPS actually puts on screen, only whether a key has an entry in
// SALE_LINE_FIELD_LABEL_KEYS. This covers the maintenance slip of a field being wired into a
// group without its label following - NOT a guarantee that an arbitrary new DTO field renders on
// its own; a field absent from every group is never passed to this function at all.
describe('resolveSaleLineFieldLabel', () => {
  const translate = (key: string) => `translated:${key}`

  it('translates a known field key', () => {
    expect(resolveSaleLineFieldLabel('volume', translate)).toBe('translated:arSaleLine.fields.volume')
  })

  it('humanizes a key with no entry in the label map, rather than translating to a missing key', () => {
    expect(resolveSaleLineFieldLabel('someFutureField', translate)).toBe('Some Future Field')
  })
})
