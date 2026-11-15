/**
 * GNews caps `q` at 200 characters. The Setup counter used to sum the raw config
 * text, which ignores the quoting and operators the real query carries — a config
 * counted at 200 built a 271-character query and GNews answered 400. These tests
 * pin the builders to the exact string the backend sends.
 */
import { describe, it, expect } from 'vitest'
import {
  splitCommaList,
  collectTerms,
  buildGeneralNewsQuery,
  buildSupplierTermsQuery,
  buildSupplierNewsPreview,
  entityPartLength,
} from '@/utils/NewsQueryUtils'

const DEFAULT_TERMS = [
  'Cash Flow',
  'Supply Chain',
  'Supply Chain Finance',
  'SCF',
  'Financing',
  'Procurement',
]

describe('splitCommaList', () => {
  it('trims entries and drops empty ones', () => {
    expect(splitCommaList(' Pharma ,, Automotive , ')).toEqual(['Pharma', 'Automotive'])
  })

  it('returns an empty list for blank input', () => {
    expect(splitCommaList('')).toEqual([])
    expect(splitCommaList(null)).toEqual([])
    expect(splitCommaList(undefined)).toEqual([])
  })
})

describe('collectTerms', () => {
  it('appends the additional terms after the selected ones', () => {
    expect(
      collectTerms({ selectedTerms: ['SCF'], additionalTerms: 'Working Capital, DPO' })
    ).toEqual(['SCF', 'Working Capital', 'DPO'])
  })
})

describe('buildGeneralNewsQuery', () => {
  it('joins the keyword block and the term block with AND', () => {
    expect(
      buildGeneralNewsQuery({
        keywords: 'Pharma',
        selectedTerms: ['SCF', 'Financing'],
        additionalTerms: '',
      })
    ).toBe('("Pharma") AND ("SCF" OR "Financing")')
  })

  it('emits only the term block when there are no keywords', () => {
    expect(
      buildGeneralNewsQuery({ keywords: '', selectedTerms: ['SCF'], additionalTerms: '' })
    ).toBe('("SCF")')
  })

  it('emits only the keyword block when no term is selected', () => {
    expect(
      buildGeneralNewsQuery({ keywords: 'Pharma', selectedTerms: [], additionalTerms: '' })
    ).toBe('("Pharma")')
  })

  it('returns an empty string when nothing is configured', () => {
    expect(
      buildGeneralNewsQuery({ keywords: '', selectedTerms: [], additionalTerms: '' })
    ).toBe('')
  })

  it('costs 98 characters for the six default terms alone', () => {
    const query = buildGeneralNewsQuery({
      keywords: '',
      selectedTerms: DEFAULT_TERMS,
      additionalTerms: '',
    })
    expect(query.length).toBe(98)
  })

  // Regression: this exact configuration counted 200 under the old raw-text counter,
  // saved cleanly, and then made GNews answer 400.
  it('exceeds the GNews limit for the reported Lundbeck configuration', () => {
    const query = buildGeneralNewsQuery({
      keywords:
        'Lundbeck, pharmaceutical, drug development, clinical trials, ' +
        'pharmaceutical manufacturing, pharmaceutical supply chain, drug supply, FDA',
      selectedTerms: DEFAULT_TERMS,
      additionalTerms: '',
    })
    expect(query.length).toBe(271)
    expect(query.length).toBeGreaterThan(200)
  })
})

describe('buildSupplierTermsQuery', () => {
  it('builds only the term half, which is all Setup controls', () => {
    expect(
      buildSupplierTermsQuery({ selectedTerms: DEFAULT_TERMS, additionalTerms: '' })
    ).toBe(
      '("Cash Flow" OR "Supply Chain" OR "Supply Chain Finance" OR "SCF" OR "Financing" OR "Procurement")'
    )
  })
})

describe('buildSupplierNewsPreview', () => {
  it('parenthesises the entity block when both names are selected', () => {
    expect(
      buildSupplierNewsPreview({
        selectedEntities: ['Supplier Name', 'Parent Name'],
        selectedTerms: ['SCF'],
        additionalTerms: '',
      })
    ).toBe('("Supplier Name" OR "Parent Name") AND ("SCF")')
  })

  it('drops the parentheses when only the supplier name is selected', () => {
    expect(
      buildSupplierNewsPreview({
        selectedEntities: ['Supplier Name'],
        selectedTerms: ['SCF'],
        additionalTerms: '',
      })
    ).toBe('"Supplier Name" AND ("SCF")')
  })

  // Mirrors NewsQueryBuilder::resolveSelectedEntities() on the backend: an empty
  // selection falls back to both identifiers rather than dropping the company.
  it('falls back to both identifiers when the selection is empty', () => {
    expect(
      buildSupplierNewsPreview({
        selectedEntities: [],
        selectedTerms: ['SCF'],
        additionalTerms: '',
      })
    ).toBe('("Supplier Name" OR "Parent Name") AND ("SCF")')
  })
})

describe('entityPartLength', () => {
  // `("<name>" OR "<name>") AND ` is 2n + 15; `"<name>" AND ` is n + 7.
  it('budgets both names plus the surrounding syntax', () => {
    expect(entityPartLength(15, true)).toBe(45)
  })

  it('budgets a single name plus the trailing AND', () => {
    expect(entityPartLength(15, false)).toBe(22)
  })
})
