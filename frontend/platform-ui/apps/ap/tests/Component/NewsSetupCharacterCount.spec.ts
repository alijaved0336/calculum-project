/**
 * The Save button must refuse a configuration whose built query exceeds the 200
 * characters GNews accepts. Before the fix the counter summed the raw config text,
 * so the Lundbeck configuration below read 200/200 in green and saved cleanly.
 */
import { describe, it, expect } from 'vitest'
import {
  buildGeneralNewsQuery,
  buildSupplierTermsQuery,
  entityPartLength,
} from '@/utils/NewsQueryUtils'
import {
  NEWS_CONFIG_MAX_QUERY_LENGTH,
  NEWS_CONFIG_ENTITY_NAME_ALLOWANCE,
  NEWS_CONFIG_DEFAULT_TERMS,
} from '@/types'

const LUNDBECK_KEYWORDS =
  'Lundbeck, pharmaceutical, drug development, clinical trials, ' +
  'pharmaceutical manufacturing, pharmaceutical supply chain, drug supply, FDA'

describe('News Setup character budget', () => {
  it('rejects the Lundbeck configuration that GNews answered 400 for', () => {
    const count = buildGeneralNewsQuery({
      keywords: LUNDBECK_KEYWORDS,
      selectedTerms: [...NEWS_CONFIG_DEFAULT_TERMS],
      additionalTerms: '',
    }).length

    expect(count).toBeGreaterThan(NEWS_CONFIG_MAX_QUERY_LENGTH)
  })

  it('accepts the default configuration', () => {
    const count = buildGeneralNewsQuery({
      keywords: '',
      selectedTerms: [...NEWS_CONFIG_DEFAULT_TERMS],
      additionalTerms: '',
    }).length

    expect(count).toBeLessThanOrEqual(NEWS_CONFIG_MAX_QUERY_LENGTH)
  })

  it('leaves the default Entity Card terms within budget once both names are reserved', () => {
    const count =
      buildSupplierTermsQuery({
        selectedTerms: [...NEWS_CONFIG_DEFAULT_TERMS],
        additionalTerms: '',
      }).length + entityPartLength(NEWS_CONFIG_ENTITY_NAME_ALLOWANCE, true)

    expect(count).toBeLessThanOrEqual(NEWS_CONFIG_MAX_QUERY_LENGTH)
  })

  // The backend uses the same allowance; if they drift the API rejects what this
  // screen showed as valid. 42 is the measured p95 of company name length.
  it('keeps the allowance in step with the backend constant', () => {
    expect(NEWS_CONFIG_ENTITY_NAME_ALLOWANCE).toBe(42)
  })

  // At 42 the default Entity Card configuration fits with only 3 characters to spare,
  // so this pins the ceiling: a higher allowance would invalidate the defaults.
  it('leaves the default Entity Card configuration only just within budget', () => {
    const count =
      buildSupplierTermsQuery({
        selectedTerms: [...NEWS_CONFIG_DEFAULT_TERMS],
        additionalTerms: '',
      }).length + entityPartLength(NEWS_CONFIG_ENTITY_NAME_ALLOWANCE, true)

    expect(count).toBe(197)
    expect(NEWS_CONFIG_MAX_QUERY_LENGTH - count).toBe(3)
  })
})
