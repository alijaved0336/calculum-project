import { describe, it, expect } from 'vitest'
import { COUNTRY_CENTROIDS } from '@ada/design-system'
import { ALPHA3_TO_ALPHA2, toGeoChartRows } from '@/modules/opportunity/data/overviewCountryCodes'

describe('ALPHA3_TO_ALPHA2', () => {
  it('covers every country COUNTRY_CENTROIDS covers, so a resolvable centroid is always a resolvable alpha-2 too', () => {
    const missing = Object.keys(COUNTRY_CENTROIDS).filter((code) => !(code in ALPHA3_TO_ALPHA2))
    expect(missing).toEqual([])
  })

  it('resolves a handful of well-known codes correctly', () => {
    expect(ALPHA3_TO_ALPHA2.CHE).toBe('CH')
    expect(ALPHA3_TO_ALPHA2.USA).toBe('US')
    expect(ALPHA3_TO_ALPHA2.IND).toBe('IN')
    expect(ALPHA3_TO_ALPHA2.DEU).toBe('DE')
    expect(ALPHA3_TO_ALPHA2.GBR).toBe('GB')
  })
})

describe('toGeoChartRows', () => {
  it('resolves each ISO3 code to alpha-2, keeps the original as `key`, and formats a tooltip', () => {
    const result = toGeoChartRows([{ name: 'CHE', value: 90 }, { name: 'IND', value: 1_500_000 }])

    expect(result).toEqual([
      { code: 'CH', value: 90, key: 'CHE', tooltip: '90.0' },
      { code: 'IN', value: 1_500_000, key: 'IND', tooltip: '1.5m' },
    ])
  })

  it('lowercases codes the same as uppercase ones, since the endpoint always sends uppercase', () => {
    const result = toGeoChartRows([{ name: 'che', value: 1 }])
    expect(result).toHaveLength(1)
    expect(result[0]?.code).toBe('CH')
    expect(result[0]?.key).toBe('CHE')
  })

  it('drops a point with no known alpha-2 mapping rather than sending a guessed code', () => {
    const result = toGeoChartRows([{ name: 'CHE', value: 90 }, { name: 'ZZZ', value: 10 }])
    expect(result.map((row) => row.key)).toEqual(['CHE'])
  })

  it('drops a point with a null value, and a point with a null name', () => {
    const result = toGeoChartRows([
      { name: 'CHE', value: null },
      { name: null, value: 90 },
      { name: 'IND', value: 90 },
    ])
    expect(result.map((row) => row.key)).toEqual(['IND'])
  })
})
