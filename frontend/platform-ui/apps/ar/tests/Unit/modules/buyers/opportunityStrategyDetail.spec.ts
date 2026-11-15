import { describe, expect, it } from 'vitest'
import {
  buildBenchmarkPanel,
  toDetailBadges,
  type BenchmarkEntry,
  type DetailExtraMember,
} from '@/modules/buyers/components/customerCard/opportunityStrategyDetail'

function member(overrides: Partial<DetailExtraMember> = {}): DetailExtraMember {
  return {
    terms: 60,
    details: { average: 60, firstQuartile: 55, min: 45, max: 90, occurrences: 8 },
    calculationMethod: null,
    ...overrides,
  }
}

describe('toDetailBadges', () => {
  it('keeps only the requested figures, highest value first, nulls last', () => {
    const badges = toDetailBadges(
      member({ details: { average: 60, firstQuartile: null, min: 45, max: 90, occurrences: 8 } }),
      ['average', 'firstQuartile', 'min', 'max'],
    )
    expect(badges.map((b) => b.key)).toEqual(['max', 'average', 'min', 'firstQuartile'])
  })

  it.each([
    ['avg', 'average'],
    ['1q', 'firstQuartile'],
    ['min', 'min'],
    ['max', 'max'],
    ['average', 'average'],
    ['q1', 'firstQuartile'],
    ['firstQuartile', 'firstQuartile'],
  ] as const)('marks the %s calculationMethod as the %s badge', (method, key) => {
    const calculationMethod = method as DetailExtraMember['calculationMethod']
    const active = toDetailBadges(member({ calculationMethod }), ['average', 'firstQuartile', 'min', 'max'])
      .filter((b) => b.active)
    expect(active.map((b) => b.key)).toEqual([key])
  })

  it.each(['3q', null] as const)('highlights nothing for calculationMethod %s', (method) => {
    expect(toDetailBadges(member({ calculationMethod: method }), ['average', 'firstQuartile']).some((b) => b.active))
      .toBe(false)
  })
})

describe('buildBenchmarkPanel', () => {
  it('builds one band per extra member the backend sent (Contractual: two)', () => {
    const entry: BenchmarkEntry = {
      key: 'contractualTerms',
      terms: 30,
      extra: { contractualTerms: { terms: 30 }, currentTerms: { terms: 30 } },
    }

    expect(buildBenchmarkPanel('contractual', entry).bands).toEqual([
      { titleKey: 'contractualTerms', terms: 30, badges: [] },
      { titleKey: 'currentTerms', terms: 30, badges: [] },
    ])
  })

  it('has no band when the entry has no extra', () => {
    expect(buildBenchmarkPanel('regulatory', { key: 'BuyersRegulatory', terms: 60, extra: null }).bands).toEqual([])
  })

  it('renders no cards until the backend sends infoCards', () => {
    expect(buildBenchmarkPanel('creditLimitMax', { key: 'CreditLimitMax', terms: 690, extra: null }).cards).toEqual([])
  })

  it("renders the backend's infoCards as sent, aliasing ADA's keys and keeping the null ones", () => {
    const entry: BenchmarkEntry = {
      key: 'BuyersRegulatory',
      terms: 60,
      extra: null,
      infoCards: [
        { key: 'cashFlowOpportunity', value: 500 },
        { key: 'regulationModality', value: 'E' },
        { key: 'regulationCountrySource', value: null },
        { key: 'someNewCard', value: 3 },
      ],
    }

    expect(buildBenchmarkPanel('regulatory', entry).cards).toEqual([
      { key: 'cashFlowOpportunity', value: 500, format: 'signedMoney' },
      { key: 'regulationType', value: 'E', format: 'text' },
      { key: 'countrySource', value: null, format: 'text' },
      { key: 'someNewCard', value: 3, format: 'count' },
    ])
  })

  it("reads the infoCards the backend sends inside extra, and never draws them as a band", () => {
    const entry: BenchmarkEntry = {
      key: 'IndustryRegionGroup',
      terms: 30,
      extra: {
        IndustryRegionGroup: { terms: 30, details: null, calculationMethod: null },
        infoCards: [
          { key: 'cashFlowOpportunity', value: 2199.0558608219178 },
          { key: 'changeInTerms', value: 15 },
          { key: 'mainRegion', value: 'Southern Europe' },
          { key: 'mainIndustry', value: 'Ventilation, Heating, Air-Conditioning, and Commercial Refrigeration Equipment Manufacturing' },
        ],
      },
    }
    const panel = buildBenchmarkPanel('industryRegionStandard', entry)

    expect(panel.bands.map((band) => band.titleKey)).toEqual(['IndustryRegionGroup'])
    expect(panel.cards).toEqual([
      { key: 'cashFlowOpportunity', value: 2199.0558608219178, format: 'signedMoney' },
      { key: 'paymentTermsChange', value: 15, format: 'days' },
      { key: 'mainRegion', value: 'Southern Europe', format: 'text' },
      {
        key: 'mainIndustry',
        value: 'Ventilation, Heating, Air-Conditioning, and Commercial Refrigeration Equipment Manufacturing',
        format: 'text',
      },
    ])
  })

  it('buyer standard: an Average + 1st Quartile band with the method highlighted', () => {
    const entry: BenchmarkEntry = {
      key: 'CounterPartyStandard2',
      terms: 60,
      extra: { CounterPartyStandard2: member({ calculationMethod: 'avg' }) },
    }

    expect(buildBenchmarkPanel('buyerStandard', entry).bands).toEqual([{
      titleKey: 'CounterPartyStandard2',
      terms: 60,
      badges: [
        { key: 'average', value: 60, active: true },
        { key: 'firstQuartile', value: 55, active: false },
      ],
    }])
  })

  it('industry/region: one band per extra member, badges left out while their figures are null', () => {
    const entry: BenchmarkEntry = {
      key: 'IndustryRegionGroup',
      terms: 30,
      extra: {
        IndustryRegionGroup: { terms: 30, details: null, calculationMethod: null },
        IndustryGroup: { terms: 30, details: null, calculationMethod: null },
        RegionGroup: { terms: 56, details: { average: 50, firstQuartile: 40, min: 30, max: 60, occurrences: 4 }, calculationMethod: null },
      },
    }
    const { bands } = buildBenchmarkPanel('industryRegionStandard', entry)

    expect(bands.map((band) => band.titleKey)).toEqual(['IndustryRegionGroup', 'IndustryGroup', 'RegionGroup'])
    expect(bands[0].badges).toEqual([])
    expect(bands[2].badges.map((b) => b.key)).toEqual(['max', 'average', 'firstQuartile', 'min'])
  })

  it("parent/buyer min: one band per present member, Sales Lines from the backend's saleLineCount", () => {
    // The backend's own shape for these two: the sale line count alone.
    const entry: BenchmarkEntry = {
      key: 'BuyerOrParentMin',
      terms: 30,
      extra: {
        BuyerMin: member({ terms: 30, details: { saleLineCount: 1 } }),
        ParentBuyerMin: member({ terms: 30, details: { saleLineCount: 3 } }),
      },
    }

    expect(buildBenchmarkPanel('parentBuyerMin', entry).bands).toEqual([
      { titleKey: 'BuyerMin', terms: 30, badges: [{ key: 'salesLines', value: 1, active: false }] },
      { titleKey: 'ParentBuyerMin', terms: 30, badges: [{ key: 'salesLines', value: 3, active: false }] },
    ])
  })

  it('parent/buyer min: any other figure the backend adds sorts in with Sales Lines, highest first', () => {
    const entry: BenchmarkEntry = {
      key: 'BuyerOrParentMin',
      terms: 30,
      extra: { BuyerMin: member({ terms: 30, details: { saleLineCount: 45, average: 60, min: 30 } }) },
    }

    expect(buildBenchmarkPanel('parentBuyerMin', entry).bands[0].badges.map((b) => [b.key, b.value])).toEqual([
      ['average', 60],
      ['salesLines', 45],
      ['min', 30],
    ])
  })

  it('industry/region: Sales Lines reads saleLineCount and sorts with the figures', () => {
    const entry: BenchmarkEntry = {
      key: 'IndustryRegionGroup',
      terms: 30,
      extra: {
        IndustryRegionGroup: member({ terms: 30, details: { average: 50, firstQuartile: 40, min: 30, max: 60, saleLineCount: 12 } }),
      },
    }

    expect(buildBenchmarkPanel('industryRegionStandard', entry).bands[0].badges.map((b) => b.key))
      .toEqual(['max', 'average', 'firstQuartile', 'min', 'salesLines'])
  })
})
