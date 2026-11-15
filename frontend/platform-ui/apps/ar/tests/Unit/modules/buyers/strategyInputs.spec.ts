import { describe, expect, it } from 'vitest'
import {
  deriveInputRows,
  deriveStrategyResultRow,
  formatSelectionOutcome,
  humanizeInputKey,
} from '@/modules/buyers/components/customerCard/strategyInputs'
import type { BuyerCardStrategyResultDto, SaleLineStrategyResultDto } from '@/api'

describe('humanizeInputKey', () => {
  it('capitalises a single-word key unchanged otherwise', () => {
    expect(humanizeInputKey('occurrences')).toBe('Occurrences')
  })

  it('capitalises the leading word and splits the camelCase boundary', () => {
    expect(humanizeInputKey('calculationMethod')).toBe('Calculation Method')
  })

  it('leaves a digit-suffixed key as-is beyond capitalising it', () => {
    expect(humanizeInputKey('q1')).toBe('Q1')
  })

  it('returns an empty string unchanged', () => {
    expect(humanizeInputKey('')).toBe('')
  })
})

describe('deriveInputRows', () => {
  // This is one of the two tests the whole design is bought with: a strategy nobody has heard of,
  // whose keys appear in no label map, must still render every key, humanized, dropping nothing.
  it('renders every key of an unrecognised strategy, humanized, dropping none', () => {
    const rows = deriveInputRows({ foo: 1, barBaz: 2 })

    expect(rows).toEqual([
      { key: 'barBaz', label: 'Bar Baz', value: '2' },
      { key: 'foo', label: 'Foo', value: '1' },
    ])
  })

  // The other: canonical keys sort ahead of unknown ones, and unknown ones sort alphabetically
  // among themselves - asserted against a hand-written expected order, not a re-derived one.
  it('orders canonical keys first in their fixed order, then unknown keys alphabetically', () => {
    const rows = deriveInputRows({
      zeta: 1,
      calculationMethod: 'average',
      max: 100,
      alpha: 2,
      occurrences: 12,
      avg: 45,
      min: 10,
      q3: 60,
      q1: 30,
    })

    expect(rows.map((row) => row.key)).toEqual([
      'occurrences',
      'min',
      'q1',
      'avg',
      'q3',
      'max',
      'calculationMethod',
      'alpha',
      'zeta',
    ])
  })

  // Mixed case on purpose. The keys above are all lowercase, where every collation agrees; these
  // are where `localeCompare` and code-point order part company, so this is the case that pins the
  // choice. An ICU collation would read these as a human alphabet and put `alpha` before `Zeta`.
  it('orders unknown keys by code point, so the order does not depend on the runtime locale', () => {
    const rows = deriveInputRows({ alpha: 1, Zeta: 2, Beta: 3, gamma: 4 })

    expect(rows.map((row) => row.key)).toEqual(['Beta', 'Zeta', 'alpha', 'gamma'])
  })

  it('omits a canonical key that is absent from inputs rather than rendering it empty', () => {
    const rows = deriveInputRows({ occurrences: 5, max: 10 })

    expect(rows.map((row) => row.key)).toEqual(['occurrences', 'max'])
  })

  it('returns an empty list for null inputs', () => {
    expect(deriveInputRows(null)).toEqual([])
  })

  it('returns an empty list for array inputs', () => {
    expect(deriveInputRows([1, 2, 3])).toEqual([])
  })

  it('returns an empty list for scalar inputs', () => {
    expect(deriveInputRows(42)).toEqual([])
    expect(deriveInputRows('not an object')).toEqual([])
  })

  it('renders a nested object value as JSON rather than "[object Object]"', () => {
    const rows = deriveInputRows({ calculationMethod: { type: 'weighted', weight: 2 } })

    expect(rows).toEqual([
      { key: 'calculationMethod', label: 'Calculation Method', value: '{"type":"weighted","weight":2}' },
    ])
  })

  it('renders a null value as the shared em-dash marker, not the string "null"', () => {
    const rows = deriveInputRows({ min: null })

    expect(rows).toEqual([{ key: 'min', label: 'Min', value: '—' }])
  })
})

describe('deriveStrategyResultRow', () => {
  // displayName is the raw strategy key, verbatim, in whatever casing the backend used - never
  // humanized. Prettifying snake_case (below) but not PascalCase, or the reverse, would make the
  // label lie about which kind of value it is; this panel exists so an engineer can paste the key
  // into a query, and a humanized string cannot be pasted anywhere.
  it('derives a row from a party-grain BuyerCardStrategyResultDto with no cast, leaving a snake_case strategy key verbatim', () => {
    const result: BuyerCardStrategyResultDto = {
      strategy: 'peer_group_standard_2_0',
      proposedTerm: 45,
      applicabilityReason: null,
      selectionOutcome: 'selected',
      inputs: { occurrences: 8, avg: 42.5 },
    }

    expect(deriveStrategyResultRow(result)).toEqual({
      displayName: 'peer_group_standard_2_0',
      proposedTerm: 45,
      applicabilityReason: null,
      selectionOutcome: 'selected',
      inputRows: [
        { key: 'occurrences', label: 'Occurrences', value: '8' },
        { key: 'avg', label: 'Avg', value: '42.5' },
      ],
    })
  })

  it('derives a row from a line-grain SaleLineStrategyResultDto with the same function, no cast, leaving a PascalCase strategy key verbatim too', () => {
    const result: SaleLineStrategyResultDto = {
      strategy: 'BuyerStandardStrategy',
      proposedTerm: null,
      applicabilityReason: 'No parent on file',
      selectionOutcome: 'not_applicable',
      inputs: null,
    }

    expect(deriveStrategyResultRow(result)).toEqual({
      displayName: 'BuyerStandardStrategy',
      proposedTerm: null,
      applicabilityReason: 'No parent on file',
      selectionOutcome: 'not_applicable',
      inputRows: [],
    })
  })
})

describe('formatSelectionOutcome', () => {
  // The closed vocabulary from BuyerCardStrategyResultDto.selectionOutcome's own doc comment -
  // each of the six known codes must resolve to its own i18n key, not a shared fallback.
  const translate = (key: string) => `translated:${key}`

  it.each([
    ['selected', 'translated:arCustomerCard.strategyResults.selectionOutcomes.selected'],
    ['capped_by_regulation', 'translated:arCustomerCard.strategyResults.selectionOutcomes.cappedByRegulation'],
    ['longer_than_selected', 'translated:arCustomerCard.strategyResults.selectionOutcomes.longerThanSelected'],
    ['no_reduction', 'translated:arCustomerCard.strategyResults.selectionOutcomes.noReduction'],
    ['not_applicable', 'translated:arCustomerCard.strategyResults.selectionOutcomes.notApplicable'],
    ['not_a_candidate', 'translated:arCustomerCard.strategyResults.selectionOutcomes.notACandidate'],
  ])('translates the known code %s', (code, expected) => {
    expect(formatSelectionOutcome(code, translate)).toBe(expected)
  })

  // The backend can add a seventh outcome before the front end has a translation for it - it must
  // still read as words, never blank and never raw snake_case.
  it('humanizes an unknown code instead of leaving it blank or raw', () => {
    expect(formatSelectionOutcome('some_future_outcome', translate)).toBe('Some future outcome')
  })
})
