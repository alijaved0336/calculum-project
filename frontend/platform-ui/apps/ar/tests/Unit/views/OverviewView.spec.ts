import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'
import { createPinia, setActivePinia } from 'pinia'

const fetchOpportunityOverviewSummary = vi.fn()
const fetchOpportunityOverviewChart = vi.fn()

vi.mock('@/api', () => ({
  fetchOpportunityOverviewSummary: (...args: unknown[]) => fetchOpportunityOverviewSummary(...args),
  fetchOpportunityOverviewChart: (...args: unknown[]) => fetchOpportunityOverviewChart(...args),
}))

vi.mock('@ada/auth', () => ({ authLogin: vi.fn() }))
vi.mock('@/utils/getBaseApi', () => ({ getBaseApi: () => 'http://api.test' }))

/**
 * The chart card is mocked whole rather than shallow-stubbed: it pulls in the Apollo client and
 * the chart machinery at import time, none of which belongs in the VIEW's spec. Props are kept
 * because the defaults are what this suite asserts about it; its own behaviour has its own spec.
 */
vi.mock('@/modules/opportunity/components/OverviewMetricsCard.vue', () => ({
  default: {
    name: 'OverviewMetricsCard',
    props: ['defaultMeasure', 'defaultDimension', 'cardIndex', 'selection'],
    emits: ['item-selected', 'selection-cleared'],
    template:
      '<div class="chart-card" :data-measure="defaultMeasure" :data-dimension="defaultDimension"'
      + ' :data-card-index="cardIndex" :data-selection="selection ? selection.label : \'\'" />',
  },
}))

/**
 * US#20527: AP parity - the Overview screen now carries its own `OverviewList`, filtered by
 * whichever chart segment is selected above (mocked whole for the same reason as
 * OverviewMetricsCard - it pulls in the real GraphQL grid machinery, none of which belongs here).
 */
vi.mock('@/modules/opportunity/components/OverviewList.vue', () => ({
  default: {
    name: 'OverviewList',
    props: ['chartSelection'],
    emits: ['clear-chart-selection'],
    template: '<div class="overview-list-stub" :data-chart-selection="chartSelection ? chartSelection.label : \'\'" />',
  },
}))

/** AB#20609: the undecided figures' switch, flipped per test below - off, as shipped, by default. */
const flags = vi.hoisted(() => ({ showUndecided: false }))
vi.mock('@/modules/opportunity/overviewSummaryFlags', () => ({
  get SHOW_UNDECIDED_SUMMARY_METRICS() { return flags.showUndecided },
}))

/**
 * The design-system primitives are stubbed down to their slots and the props this suite asserts.
 * The two summary cards themselves are REAL (OverviewOpportunitySummaryCard,
 * OverviewSalesEntitiesCard): what they print is the formatting contract this suite checks.
 */
vi.mock('@ada/design-system', () => ({
  BodyText: { template: '<span><slot /></span>' },
  DisplayText: { template: '<span><slot /></span>' },
  CalculumLoadingAr: { template: '<div class="loading" />' },
  ContentBox: { template: '<div><slot name="header-title" /><slot name="header-controls" /><slot /></div>' },
  ContentBoxBody: { template: '<div><slot /></div>' },
  NoDataAvailable: { props: ['title'], template: '<div class="no-data">{{ title }}</div>' },
  TooltipButton: { props: ['text'], template: '<div class="tooltip"><slot name="content" /></div>' },
  CustomButton: { props: ['text'], template: '<button>{{ text }}</button>' },
  CustomBadge: { props: ['text', 'variant'], template: '<span :data-variant="variant">{{ text }}</span>' },
  CustomTabs: { props: ['items', 'modelValue'], template: '<div class="tabs" />' },
  SearchableDropdown: { props: ['options', 'modelValue'], template: '<div class="dropdown" />' },
  HorizontalBarChart: { props: ['categories', 'series'], template: '<div class="chart" />' },
}))

import Overview from '@/modules/opportunity/views/OpportunityOverview.vue'
import { useContextStore } from '@/stores/context'

const i18n = createI18n({
  legacy: false,
  locale: 'en',
  // Only the keys this view renders, so a missing one shows up as the key itself here exactly as it
  // would in the browser. overviewI18nKeys.spec.ts is what checks the real dictionaries.
  messages: {
    en: {
      arOpportunity: {
        cards: {
          paymentTermsTitle: 'Payment Terms (Days)',
          paymentTermsTooltip: 'Payment terms tooltip',
          avgDaysPaidCaption: 'Avg. Days Paid: {days}',
          paymentFloatCaption: 'Payment Float: {days}',
          scfButton: 'SCF',
          opportunitySummaryTitle: 'Opportunity Summary',
          salesTitle: 'Sales & Entities',
          periodLabel: 'Period: {range}',
          salesTooltip: 'tt',
          salesVolume: 'Sales Volume',
          buyers: 'Buyers',
          salesLines: 'Sales Lines',
          cashFlowTooltip: 'Cash flow tooltip',
          economicProfitTooltip: 'Economic profit tooltip',
          plImpactTitle: 'P&L Impact',
          plImpactTooltip: 'tt',
        },
        charts: { paymentTermsTitle: 'Payment Terms', salesTitle: 'Sales', selectDimension: 'Group by', topN: 'Top {count}' },
        measure: {
          actualPaymentTerms: 'Avg. Days Paid',
          contractualPaymentTerms: 'Contractual',
          proposedPaymentTerms: 'Proposed',
          volume: 'Sales Volume',
          cashFlowOpportunity: 'Cash Flow Opportunity',
          buyers: 'Buyers',
        },
        dimension: { region: 'Region', country: 'Country', industry: 'Industry', buyer: 'Buyer', currency: 'Currency', isSme: 'SME' },
        sme: { true: 'SME', false: 'Non-SME', unknown: 'Not classified' },
        empty: { noVersion: 'Pick a version', loadError: 'Could not load', forbidden: 'No access' },
      },
      global: {
        contractual: 'Contractual',
        opportunity: 'Opportunity',
        expected: 'Expected',
        cashFlow: 'Cash Flow',
        ultimateParents: 'Parents',
        notAvailable: '—',
      },
      home: { analyze: { vCard: { economicProfit: 'Economic Profit' } } },
    },
  },
})

/** The version, by uuid: what the endpoints' filter envelope names it by, and so what the
 * composables watch. `setVersion` writes the id alongside it, which is what the progress link uses. */
const VERSION = '1653c234-9318-4707-a6c3-33f4b427126c'

const calculated = {
  saleFileVersionId: 7,
  status: 'ready',
  // Deliberately fractional: the bars must show whole days.
  paymentTerms: { contractual: 30.4, actual: 44.6, opportunity: 20, expected: 25 },
  cashFlow: { opportunity: 1_300_000_000, expected: 89_000_000 },
  // Negative, as the buyer-side figure comes: the supplier's gain is the buyers' financing cost.
  plImpact: { opportunity: -454_600, expected: null },
  economicProfit: { opportunity: 15_100_000, expected: null },
  salesAndEntities: { salesVolume: 1_300_000_000, parentCount: 225, buyerCount: 293, saleLineCount: 400 },
}

/** `calculated` plus the figures the API does not send yet (AB#20609). */
const withUndecidedFigures = {
  ...calculated,
  paymentTerms: { ...calculated.paymentTerms, opportunityPaymentFloat: 3, expectedPaymentFloat: 4.6 },
  salesAndEntities: { ...calculated.salesAndEntities, salesVolumeTrend: 3.214 },
}

function mountView() {
  return mount(Overview, { global: { plugins: [i18n], stubs: { RouterLink: { template: '<a><slot /></a>' } } } })
}

function tile(wrapper: ReturnType<typeof mountView>, id: string) {
  return wrapper.find(`[data-tile="${id}"]`)
}

describe('Overview', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    fetchOpportunityOverviewSummary.mockReset()
    fetchOpportunityOverviewChart.mockReset()
    fetchOpportunityOverviewChart.mockResolvedValue({ points: [] })
    flags.showUndecided = false
  })

  it('asks for a version instead of drawing empty cards', async () => {
    const wrapper = mountView()
    await flushPromises()

    expect(wrapper.find('.no-data').text()).toBe('Pick a version')
    expect(wrapper.find('.opportunity-summary-card').exists()).toBe(false)
  })

  it('draws the cards with their own dash/N/A fallback for a version with no figures yet, rather than a placeholder', async () => {
    fetchOpportunityOverviewSummary.mockResolvedValue({
      ...calculated,
      status: 'processed',
      paymentTerms: null,
      cashFlow: null,
      economicProfit: null,
      salesAndEntities: null,
    })
    const context = useContextStore()
    context.setVersion(7, VERSION)

    const wrapper = mountView()
    await flushPromises()

    expect(wrapper.text()).not.toContain('Not calculated yet')

    expect(wrapper.find('.payment-terms__contractual').text()).toBe('—')
    expect(wrapper.find('.payment-terms__opportunity').text()).toBe('—')
    expect(wrapper.find('.payment-terms__expected').text()).toBe('—')
    expect(wrapper.find('.payment-terms__avg-days-paid').exists()).toBe(false)

    // The component this card replaces (OpportunityExpectedValues) said N/A for an empty figure.
    const moneyValues = wrapper.findAll('.summary-metric__opportunity, .summary-metric__expected')
    expect(moneyValues).toHaveLength(4)
    moneyValues.forEach((value) => expect(value.text()).toBe('N/A'))

    expect(tile(wrapper, 'salesVolume').text()).toContain('—')
    expect(tile(wrapper, 'parents').text()).toContain('—')
  })

  it('says access is missing rather than reporting a load failure', async () => {
    const { HttpError } = await import('@/api/http')
    fetchOpportunityOverviewSummary.mockRejectedValue(new HttpError(403, 'GET /x', 'no'))
    const context = useContextStore()
    context.setVersion(7, VERSION)

    const wrapper = mountView()
    await flushPromises()

    expect(wrapper.find('.no-data').text()).toBe('No access')
  })

  it('rounds payment terms to whole days, Avg. Days Paid included as the caption under Contractual', async () => {
    fetchOpportunityOverviewSummary.mockResolvedValue(calculated)
    const context = useContextStore()
    context.setVersion(7, VERSION)

    const wrapper = mountView()
    await flushPromises()

    // 30.4 and 44.6, not "30.4" and "44.6": the card prints these verbatim.
    expect(wrapper.find('.payment-terms__contractual').text()).toBe('30')
    expect(wrapper.find('.payment-terms__avg-days-paid').text()).toBe('Avg. Days Paid: 45')
    expect(wrapper.find('.payment-terms__opportunity').text()).toBe('20')
    expect(wrapper.find('.payment-terms__expected').text()).toBe('25')
  })

  it('AB#20321: omits the Avg. Days Paid caption when the version has no actual term (AF-1)', async () => {
    fetchOpportunityOverviewSummary.mockResolvedValue({
      ...calculated,
      paymentTerms: { ...calculated.paymentTerms, actual: null },
    })
    const context = useContextStore()
    context.setVersion(7, VERSION)

    const wrapper = mountView()
    await flushPromises()

    expect(wrapper.find('.payment-terms__avg-days-paid').exists()).toBe(false)
    expect(wrapper.find('.payment-terms__contractual').text()).toBe('30')
  })

  it('AB#20321: also omits the Avg. Days Paid caption when `actual` is missing rather than null (AF-1)', async () => {
    // The type says `actual` is always `number | null`, but a response that simply omits the key
    // is still valid JS at runtime - a strict `!== null` check would read that as "has a value".
    const { actual: _actual, ...paymentTermsWithoutActual } = calculated.paymentTerms
    fetchOpportunityOverviewSummary.mockResolvedValue({
      ...calculated,
      paymentTerms: paymentTermsWithoutActual,
    })
    const context = useContextStore()
    context.setVersion(7, VERSION)

    const wrapper = mountView()
    await flushPromises()

    expect(wrapper.find('.payment-terms__avg-days-paid').exists()).toBe(false)
  })

  it('AB#20609: shows the version\'s period as a caption in the Sales & Entities header', async () => {
    fetchOpportunityOverviewSummary.mockResolvedValue(calculated)
    const context = useContextStore()
    context.setVersion(7, VERSION)
    context.setPeriods('2022-01-01', '2022-12-31')

    const wrapper = mountView()
    await flushPromises()

    expect(wrapper.find('.sales-entities-card__period').text()).toBe('Period: 01/01/2022 - 12/31/2022')
  })

  it('AB#20321: shows no period text when the version has none recorded (EF-1)', async () => {
    fetchOpportunityOverviewSummary.mockResolvedValue(calculated)
    const context = useContextStore()
    context.setVersion(7, VERSION)
    context.setPeriods(null, null)

    const wrapper = mountView()
    await flushPromises()

    expect(wrapper.find('.sales-entities-card__period').exists()).toBe(false)
    expect(wrapper.text()).not.toMatch(/\d{2}\/\d{2}\/\d{4}/)
  })

  it('abbreviates money in the Cash Flow and Economic Profit columns, Economic Profit highlighted, N/A for an absent figure', async () => {
    fetchOpportunityOverviewSummary.mockResolvedValue(calculated)
    const context = useContextStore()
    context.setVersion(7, VERSION)

    const wrapper = mountView()
    await flushPromises()

    // P&L Impact is built but switched off until product decides (overviewSummaryFlags.ts).
    const metrics = wrapper.findAll('.summary-metric')
    expect(metrics.map((metric) => metric.attributes('data-metric'))).toEqual(['cashFlow', 'economicProfit'])

    const [cashFlow, economicProfit] = metrics
    expect(cashFlow.find('.summary-metric__opportunity').text()).toBe('$1.3b')
    expect(cashFlow.find('.summary-metric__expected').text()).toBe('$89.0m')
    expect(cashFlow.classes()).not.toContain('summary-metric--highlighted')

    expect(economicProfit.find('.summary-metric__opportunity').text()).toBe('$15.1m')
    // N/A, never a zero: a zero would claim the move is worth nothing.
    expect(economicProfit.find('.summary-metric__expected').text()).toBe('N/A')
    expect(economicProfit.classes()).toContain('summary-metric--highlighted')
  })

  it('gathers every section\'s explanation into the Opportunity Summary help tooltip', async () => {
    fetchOpportunityOverviewSummary.mockResolvedValue(calculated)
    const context = useContextStore()
    context.setVersion(7, VERSION)

    const wrapper = mountView()
    await flushPromises()

    const tooltip = wrapper.find('.opportunity-summary-card .tooltip').text()
    expect(tooltip).toContain('Payment terms tooltip')
    expect(tooltip).toContain('Cash flow tooltip')
    expect(tooltip).toContain('Economic profit tooltip')
  })

  it('formats the Sales & Entities tiles: money abbreviated, counts without decimals', async () => {
    fetchOpportunityOverviewSummary.mockResolvedValue(calculated)
    const context = useContextStore()
    context.setVersion(7, VERSION)

    const wrapper = mountView()
    await flushPromises()

    expect(tile(wrapper, 'salesVolume').text()).toContain('$1.3b')
    expect(tile(wrapper, 'parents').find('.sales-tile__value').text()).toBe('225')
    expect(tile(wrapper, 'buyers').find('.sales-tile__value').text()).toBe('293')
    expect(tile(wrapper, 'salesLines').find('.sales-tile__value').text()).toBe('400')
  })

  it('AB#20609: keeps every undecided figure hidden while the switch is off, even when the data is there', async () => {
    fetchOpportunityOverviewSummary.mockResolvedValue(withUndecidedFigures)
    const context = useContextStore()
    context.setVersion(7, VERSION)

    const wrapper = mountView()
    await flushPromises()

    expect(wrapper.find('[data-metric="plImpact"]').exists()).toBe(false)
    expect(wrapper.find('.payment-terms__float').exists()).toBe(false)
    expect(wrapper.find('.sales-tile__trend').exists()).toBe(false)
    expect(wrapper.find('.opportunity-summary-card__scf').exists()).toBe(false)
  })

  it('AB#20609: shows P&L Impact, Payment Float, the Sales Volume trend and SCF once the switch is on', async () => {
    flags.showUndecided = true
    fetchOpportunityOverviewSummary.mockResolvedValue(withUndecidedFigures)
    const context = useContextStore()
    context.setVersion(7, VERSION)

    const wrapper = mountView()
    await flushPromises()

    // The mockup's order: Cash Flow, P&L Impact, then Economic Profit highlighted.
    const metrics = wrapper.findAll('.summary-metric')
    expect(metrics.map((metric) => metric.attributes('data-metric'))).toEqual(['cashFlow', 'plImpact', 'economicProfit'])
    expect(metrics[1].find('.summary-metric__opportunity').text()).toBe('-$454.6k')
    expect(metrics[1].find('.summary-metric__expected').text()).toBe('N/A')

    // Whole days, like every other payment-term figure: 4.6 prints as 5.
    const floats = wrapper.findAll('.payment-terms__float')
    expect(floats.map((caption) => caption.text())).toEqual(['Payment Float: 3', 'Payment Float: 5'])

    const trend = wrapper.find('.sales-tile__trend')
    expect(trend.text()).toBe('↗ 3.21%')
    expect(trend.attributes('data-variant')).toBe('success')

    expect(wrapper.find('.opportunity-summary-card__scf').text()).toBe('SCF')
  })

  it('AB#20609: marks a falling Sales Volume trend as down', async () => {
    flags.showUndecided = true
    fetchOpportunityOverviewSummary.mockResolvedValue({
      ...withUndecidedFigures,
      salesAndEntities: { ...withUndecidedFigures.salesAndEntities, salesVolumeTrend: -1.5 },
    })
    const context = useContextStore()
    context.setVersion(7, VERSION)

    const wrapper = mountView()
    await flushPromises()

    const trend = wrapper.find('.sales-tile__trend')
    expect(trend.text()).toBe('↘ 1.50%')
    expect(trend.attributes('data-variant')).toBe('danger')
  })

  it('AB#20609: leaves the undecided captions out when the switch is on but the API sends nothing', async () => {
    flags.showUndecided = true
    fetchOpportunityOverviewSummary.mockResolvedValue(calculated)
    const context = useContextStore()
    context.setVersion(7, VERSION)

    const wrapper = mountView()
    await flushPromises()

    expect(wrapper.find('.payment-terms__float').exists()).toBe(false)
    expect(wrapper.find('.sales-tile__trend').exists()).toBe(false)
  })

  it('draws both chart cards once there is data, plus its own grid below them (US#20527: AP parity)', async () => {
    fetchOpportunityOverviewSummary.mockResolvedValue(calculated)
    const context = useContextStore()
    context.setVersion(7, VERSION)

    const wrapper = mountView()
    await flushPromises()

    // Two independently configurable cards, each opening on its own remembered pick (or the
    // catalog's own 1st/2nd measure on a first visit) rather than a measure named here - the view
    // only tells each card which of the two it is.
    const cards = wrapper.findAll('.chart-card')
    expect(cards).toHaveLength(2)
    expect(cards[0].attributes('data-card-index')).toBe('0')
    expect(cards[1].attributes('data-card-index')).toBe('1')

    // The Overview screen now carries its own OverviewList (AP parity) - the List tab keeps its
    // own separate, unfiltered instance untouched (product decision, see US#20527's plan).
    expect(wrapper.find('.overview-list-stub').exists()).toBe(true)
  })

  it('US#20527: a chart segment click on either card feeds the same shared selection to the list below (AP\'s itemSelectedInCharts parity)', async () => {
    fetchOpportunityOverviewSummary.mockResolvedValue(calculated)
    const context = useContextStore()
    context.setVersion(7, VERSION)

    const wrapper = mountView()
    await flushPromises()

    const cards = wrapper.findAll('.chart-card')
    const list = wrapper.find('.overview-list-stub')
    expect(list.attributes('data-chart-selection')).toBe('')

    const selection = { dimension: 'region', value: 'EMEA', label: 'EMEA' }
    await cards[0].getComponent({ name: 'OverviewMetricsCard' }).vm.$emit('item-selected', selection)

    expect(wrapper.find('.overview-list-stub').attributes('data-chart-selection')).toBe('EMEA')
    // Shared state: BOTH cards receive it back as their own `selection` prop, not just the one
    // that emitted it - the other card needs it too, to know a repeat click on ITS OWN matching
    // point should clear rather than re-select (see OverviewMetricsCard's own `selection` prop).
    const updatedCards = wrapper.findAll('.chart-card')
    expect(updatedCards[0].attributes('data-selection')).toBe('EMEA')
    expect(updatedCards[1].attributes('data-selection')).toBe('EMEA')
  })

  it('US#20527: a click on the other card replaces the previous selection rather than combining with it', async () => {
    fetchOpportunityOverviewSummary.mockResolvedValue(calculated)
    const context = useContextStore()
    context.setVersion(7, VERSION)

    const wrapper = mountView()
    await flushPromises()

    await wrapper.findAll('.chart-card')[0]
      .getComponent({ name: 'OverviewMetricsCard' }).vm.$emit('item-selected', { dimension: 'region', value: 'EMEA', label: 'EMEA' })
    await wrapper.findAll('.chart-card')[1]
      .getComponent({ name: 'OverviewMetricsCard' }).vm.$emit('item-selected', { dimension: 'industry', value: 'Tech', label: 'Tech' })

    expect(wrapper.find('.overview-list-stub').attributes('data-chart-selection')).toBe('Tech')
  })

  it('US#20527: selection-cleared from a card clears the shared selection', async () => {
    fetchOpportunityOverviewSummary.mockResolvedValue(calculated)
    const context = useContextStore()
    context.setVersion(7, VERSION)

    const wrapper = mountView()
    await flushPromises()

    await wrapper.findAll('.chart-card')[0]
      .getComponent({ name: 'OverviewMetricsCard' }).vm.$emit('item-selected', { dimension: 'region', value: 'EMEA', label: 'EMEA' })
    await wrapper.findAll('.chart-card')[1]
      .getComponent({ name: 'OverviewMetricsCard' }).vm.$emit('selection-cleared')

    expect(wrapper.find('.overview-list-stub').attributes('data-chart-selection')).toBe('')
  })

  it('US#20527: clear-chart-selection from the list clears the shared selection (the chip\'s own remove button)', async () => {
    fetchOpportunityOverviewSummary.mockResolvedValue(calculated)
    const context = useContextStore()
    context.setVersion(7, VERSION)

    const wrapper = mountView()
    await flushPromises()

    await wrapper.findAll('.chart-card')[0]
      .getComponent({ name: 'OverviewMetricsCard' }).vm.$emit('item-selected', { dimension: 'region', value: 'EMEA', label: 'EMEA' })
    await wrapper.find('.overview-list-stub').getComponent({ name: 'OverviewList' }).vm.$emit('clear-chart-selection')

    expect(wrapper.find('.overview-list-stub').attributes('data-chart-selection')).toBe('')
    expect(wrapper.findAll('.chart-card')[0].attributes('data-selection')).toBe('')
  })
})
