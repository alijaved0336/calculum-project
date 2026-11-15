/**
 * WI#19918 — the supplier country's real currency on the Market Insights cards.
 *
 * The "Supplier Country (Currency)" pill used to be fed `entityDetails.currencies`, which holds
 * the spend-transaction currencies, so a Polish supplier read "Poland (EUR)" — EUR being what we
 * pay in, not what Poland uses. The currency now comes from the platform's own country reference
 * data via GET /countries/{id}/currencies, and both cards are handed the same resolved string.
 *
 * Two levels here: the view's resolution (which country is matched, what is passed down) and the
 * cards' rendering (a country with no resolved currency must show its name alone, with no empty
 * parentheses left behind).
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createI18n } from 'vue-i18n'

const {
  getMarketInsightsCurrencies,
  getLovelaceInterestRates,
  getLovelaceExchangeRates,
  getCountryCurrencies,
  fetchCountries,
  countries,
} = vi.hoisted(() => ({
  getMarketInsightsCurrencies: vi.fn(),
  getLovelaceInterestRates: vi.fn(),
  getLovelaceExchangeRates: vi.fn(),
  getCountryCurrencies: vi.fn(),
  fetchCountries: vi.fn(),
  countries: { value: [] as any[] },
}))

vi.mock('@/modules/home/entityCard/api', () => ({
  getMarketInsightsCurrencies,
  getLovelaceInterestRates,
  getLovelaceExchangeRates,
}))

vi.mock('@/services/app/api', () => ({ getCountryCurrencies }))

vi.mock('@/stores/app', () => ({
  useAppStore: () => ({ fetchCountries, get getCountries() { return countries.value } }),
}))

vi.mock('@/services/router', () => ({ default: { push: vi.fn() } }))

const i18n = createI18n({
  legacy: false,
  locale: 'en',
  missingWarn: false,
  fallbackWarn: false,
  messages: { en: {} },
})

const POLAND = {
  '@id': '/api/countries/42',
  '@type': 'Country',
  code: 'PL',
  alpha3Code: 'POL',
  localizedName: 'Poland',
}

const ENTITY_DETAILS = {
  supplierCountry: 'Poland',
  supplierCountryAlpha3Code: 'POL',
  supplierCountryFlagUrl: 'https://flags.example/pl.png',
  currencies: ['EUR'],
}

// Imported once here rather than inside the helpers: this module graph is slow to transform, and
// inside the first test that cost lands against the 10s per-test timeout.
const MarketInsights = (
  await import('@/modules/home/entityCard/views/EntityCardMarketInsights.vue')
).default
const ExchangeRatesCard = (
  await import('@/modules/home/entityCard/components/marketInsights/ExchangeRatesCard.vue')
).default
const InterestRatesCard = (
  await import('@/modules/home/entityCard/components/marketInsights/InterestRatesCard.vue')
).default

// Two distinct definitions, one per card: a single shared stub object collapses both into one
// entry in Vue's stub registry, so only one of them can be found afterwards.
const ExchangeStub = {
  props: ['supplierCurrency', 'supplierCountry', 'data'],
  template: '<div class="exchange-stub" />',
}
const InterestStub = {
  props: ['supplierCurrency', 'data'],
  template: '<div class="interest-stub" />',
}

async function mountMarketInsights(entityDetails: Record<string, any> = ENTITY_DETAILS) {
  getMarketInsightsCurrencies.mockResolvedValue({ success: true, data: { currencies: ['EUR'] } })
  getLovelaceInterestRates.mockResolvedValue({ success: true, data: { output: { country: 'Poland' } } })
  getLovelaceExchangeRates.mockResolvedValue({ success: true, data: { output: { exchangeRate: 4.33 } } })

  const wrapper = mount(MarketInsights, {
    // EntityDetails has ~35 fields; only the country and currency ones matter here.
    props: { companyId: 'company-1', entityDetails: entityDetails as any },
    global: {
      plugins: [i18n],
      mocks: { $t: (key: string) => key },
      stubs: {
        Skeleton: { template: '<div />' },
        SearchableDropdown: { template: '<div />' },
        ExchangeRatesCard: ExchangeStub,
        InterestRatesCard: InterestStub,
      },
    },
  })

  await new Promise((resolve) => setTimeout(resolve, 0))
  await wrapper.vm.$nextTick()

  return wrapper
}

function cardCurrencies(wrapper: any): string[] {
  return [
    wrapper.findComponent(ExchangeStub).props('supplierCurrency'),
    wrapper.findComponent(InterestStub).props('supplierCurrency'),
  ]
}

// Exchange Rates carries two pills — Spend Currency first, then the country one under test.
// Interest Rates carries only the country pill, so the last match is the right one in both.
function pillOf(wrapper: any): string {
  const pills = wrapper.findAll('.pill-value')
  return pills[pills.length - 1].text()
}

beforeEach(() => {
  setActivePinia(createPinia())
  vi.clearAllMocks()
  countries.value = [POLAND]
})

describe('Market Insights — supplier country currency (WI#19918)', () => {
  it('AC-07: resolves the country currency from the country reference data, not from spend', async () => {
    getCountryCurrencies.mockResolvedValue({
      success: true,
      data: { 'hydra:member': [{ code: 'PLN' }] },
    })

    const wrapper = await mountMarketInsights()

    expect(getCountryCurrencies).toHaveBeenCalledWith('/api/countries/42')
    expect((wrapper.vm as any).supplierCurrencyLabel).toBe('PLN')
    // EUR is the spend-transaction currency that used to leak into this pill.
    expect((wrapper.vm as any).supplierCurrencyLabel).not.toBe('EUR')
  })

  it('AC-08: hands both cards the identical currency', async () => {
    getCountryCurrencies.mockResolvedValue({
      success: true,
      data: { 'hydra:member': [{ code: 'PLN' }] },
    })

    const wrapper = await mountMarketInsights()

    expect(cardCurrencies(wrapper)).toEqual(['PLN', 'PLN'])
  })

  it('AC-09: shows every currency of a multi-currency country', async () => {
    getCountryCurrencies.mockResolvedValue({
      success: true,
      data: { 'hydra:member': [{ code: 'PAB' }, { code: 'USD' }] },
    })

    const wrapper = await mountMarketInsights()

    expect((wrapper.vm as any).supplierCurrencyLabel).toBe('PAB / USD')
  })

  it('AC-10: leaves the currency empty when the lookup fails', async () => {
    getCountryCurrencies.mockResolvedValue({ success: false, data: null })

    const wrapper = await mountMarketInsights()

    expect((wrapper.vm as any).supplierCurrencyLabel).toBe('')
  })

  it('AC-10: leaves the currency empty when the lookup throws', async () => {
    getCountryCurrencies.mockRejectedValue(new Error('network down'))

    const wrapper = await mountMarketInsights()

    // A rejected lookup must not take the whole tab down with it.
    expect((wrapper.vm as any).supplierCurrencyLabel).toBe('')
    expect((wrapper.vm as any).error).toBe(false)
  })

  it('AC-10: leaves the currency empty when the country is not in the reference data', async () => {
    countries.value = []

    const wrapper = await mountMarketInsights()

    expect(getCountryCurrencies).not.toHaveBeenCalled()
    expect((wrapper.vm as any).supplierCurrencyLabel).toBe('')
  })

  it('matches the country by name when no alpha3 code is on the payload', async () => {
    getCountryCurrencies.mockResolvedValue({
      success: true,
      data: { 'hydra:member': [{ code: 'PLN' }] },
    })

    const wrapper = await mountMarketInsights({
      supplierCountry: 'Poland',
      currencies: ['EUR'],
    })

    expect((wrapper.vm as any).supplierCurrencyLabel).toBe('PLN')
  })

  it('AC-11: does not touch the Spend Currency indicator', async () => {
    getCountryCurrencies.mockResolvedValue({
      success: true,
      data: { 'hydra:member': [{ code: 'PLN' }] },
    })

    const wrapper = await mountMarketInsights()

    expect((wrapper.vm as any).selectedCurrency).toBe('EUR')
  })
})

describe('Market Insights cards — the country/currency pill (WI#19918)', () => {
  const CHART_STUBS = {
    Chart: { template: '<div />' },
    ChartLegend: { template: '<div />' },
    ChartValueAxis: { template: '<div />' },
    ChartValueAxisItem: { template: '<div />' },
    ChartCategoryAxis: { template: '<div />' },
    ChartCategoryAxisItem: { template: '<div />' },
    ChartCategoryAxisTitle: { template: '<div />' },
    ChartSeries: { template: '<div />' },
    ChartSeriesItem: { template: '<div />' },
    Tooltip: { template: '<div />' },
  }

  function mountCard(component: any, supplierCurrency: string, extraProps = {}) {
    return mount(component, {
      props: { data: { output: { country: 'Poland' } }, supplierCurrency, ...extraProps },
      global: {
        plugins: [i18n],
        mocks: { $t: (key: string) => key },
        stubs: CHART_STUBS,
      },
    })
  }

  it('Exchange Rates shows "Country (Currency)" when a currency is resolved', () => {
    const wrapper = mountCard(ExchangeRatesCard, 'PLN', { supplierCountry: 'Poland' })

    expect(pillOf(wrapper)).toBe('Poland (PLN)')
  })

  it('Exchange Rates shows the country alone when no currency is resolved', () => {
    const wrapper = mountCard(ExchangeRatesCard, '', { supplierCountry: 'Poland' })

    expect(pillOf(wrapper)).toBe('Poland')
  })

  it('Interest Rates shows "Country (Currency)" when a currency is resolved', () => {
    const wrapper = mountCard(InterestRatesCard, 'PLN')

    expect(pillOf(wrapper)).toBe('Poland (PLN)')
  })

  it('Interest Rates shows the country alone when no currency is resolved', () => {
    const wrapper = mountCard(InterestRatesCard, '')

    expect(pillOf(wrapper)).toBe('Poland')
  })

  it('renders a multi-currency label as given, with no comma join', () => {
    const wrapper = mountCard(ExchangeRatesCard, 'PAB / USD', { supplierCountry: 'Panama' })

    // The pre-story bug interpolated a string[] straight into a template literal, so two
    // currencies rendered as "Panama (PAB,USD)".
    expect(pillOf(wrapper)).toBe('Panama (PAB / USD)')
    expect(pillOf(wrapper)).not.toContain(',')
  })
})
