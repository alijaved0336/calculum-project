/**
 * Unit tests for EntityTermsChartLine - per-spend-line regulation additions
 *
 * Tests perSpendLineRangeLabel logic and lineType helper.
 */

import { describe, it, expect } from 'vitest'

// Replicated from EntityTermsChartLine.vue setup()
function perSpendLineRangeLabel(regulationPerSpendLine: { min: number | null; max: number | null } | null) {
  if (!regulationPerSpendLine) return null
  const { min, max } = regulationPerSpendLine
  if (min === null || min === undefined || max === null || max === undefined) return null
  if (min === max) return null
  return { min, max }
}

function lineType(modality: string): string {
  switch (modality) {
    case 'P': return 'Pre-Payment'
    case 'E': return 'Extended'
    case 'P,E': return 'Pre-Payment, Extended'
    default: return modality
  }
}

describe('EntityTermsChartLine - perSpendLineRangeLabel', () => {
  it('returns null when regulationPerSpendLine is null', () => {
    expect(perSpendLineRangeLabel(null)).toBeNull()
  })

  it('returns null when min === max', () => {
    expect(perSpendLineRangeLabel({ min: 30, max: 30 })).toBeNull()
  })

  it('returns null when min is null', () => {
    expect(perSpendLineRangeLabel({ min: null, max: 60 })).toBeNull()
  })

  it('returns null when max is null', () => {
    expect(perSpendLineRangeLabel({ min: 30, max: null })).toBeNull()
  })

  it('returns { min, max } when they differ', () => {
    expect(perSpendLineRangeLabel({ min: 30, max: 60 })).toEqual({ min: 30, max: 60 })
  })

  it('returns correct values for typical regulation range', () => {
    const result = perSpendLineRangeLabel({ min: 15, max: 45 })
    expect(result).not.toBeNull()
    expect(result?.min).toBe(15)
    expect(result?.max).toBe(45)
  })
})

describe('EntityTermsChartLine - lineType', () => {
  it('translates P to Pre-Payment', () => {
    expect(lineType('P')).toBe('Pre-Payment')
  })

  it('translates E to Extended', () => {
    expect(lineType('E')).toBe('Extended')
  })

  it('translates P,E to Pre-Payment, Extended', () => {
    expect(lineType('P,E')).toBe('Pre-Payment, Extended')
  })

  it('returns the raw string for unknown modalities', () => {
    expect(lineType('OTHER')).toBe('OTHER')
    expect(lineType('')).toBe('')
  })
})
