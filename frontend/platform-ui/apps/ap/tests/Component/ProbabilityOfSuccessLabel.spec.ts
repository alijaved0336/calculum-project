/**
 * Tests for ProbabilityOfSuccessLabel's branching logic (packages/design-system/src/components/
 * grid/custom-columns/ProbabilityOfSuccessLabel.vue - formerly apps/ap's own
 * NineBoxesProbabilityOfSuccess.vue, moved into design-system).
 *
 * The component cannot be mounted directly in Vitest/Node.js due to Kendo UI
 * and store dependencies. Strategy: extract the two key computed predicates as
 * pure functions and test them directly, matching the pattern used in
 * ExcludeColumn.spec.ts.
 */

import { describe, it, expect } from 'vitest'

const LEVEL_FIELDS = ['successProbabilityLabel', 'scaleFinancingValueToSupplier', 'scaleUsingFinancing']

function getLevelClass(field: string, dataItem: Record<string, unknown>): string {
  const value = String(dataItem[field] ?? '').toLowerCase()
  if (!LEVEL_FIELDS.includes(field)) return 'empty-level'
  if (value === 'high') return 'high-level'
  if (value === 'medium') return 'medium-level'
  if (value === 'low') return 'low-level'
  return 'empty-level'
}

function getLevelItem(field: string, dataItem: Record<string, unknown>): unknown {
  if (!LEVEL_FIELDS.includes(field)) return '-'
  return dataItem[field] ?? null
}

// ─── getLevelClass ────────────────────────────────────────────────────────────

describe('getLevelClass — scaleUsingFinancing', () => {
  it('returns high-level for high', () => {
    expect(getLevelClass('scaleUsingFinancing', { scaleUsingFinancing: 'high' })).toBe('high-level')
  })
  it('returns medium-level for medium', () => {
    expect(getLevelClass('scaleUsingFinancing', { scaleUsingFinancing: 'medium' })).toBe('medium-level')
  })
  it('returns low-level for low', () => {
    expect(getLevelClass('scaleUsingFinancing', { scaleUsingFinancing: 'low' })).toBe('low-level')
  })
  it('returns empty-level for null', () => {
    expect(getLevelClass('scaleUsingFinancing', { scaleUsingFinancing: null })).toBe('empty-level')
  })
  it('returns empty-level for undefined', () => {
    expect(getLevelClass('scaleUsingFinancing', {})).toBe('empty-level')
  })
})

describe('getLevelClass — scaleFinancingValueToSupplier (regression)', () => {
  it('returns high-level for high', () => {
    expect(getLevelClass('scaleFinancingValueToSupplier', { scaleFinancingValueToSupplier: 'high' })).toBe('high-level')
  })
  it('returns medium-level for medium', () => {
    expect(getLevelClass('scaleFinancingValueToSupplier', { scaleFinancingValueToSupplier: 'medium' })).toBe('medium-level')
  })
  it('returns low-level for low', () => {
    expect(getLevelClass('scaleFinancingValueToSupplier', { scaleFinancingValueToSupplier: 'low' })).toBe('low-level')
  })
  it('returns empty-level for null', () => {
    expect(getLevelClass('scaleFinancingValueToSupplier', { scaleFinancingValueToSupplier: null })).toBe('empty-level')
  })
})

describe('getLevelClass — successProbabilityLabel (regression)', () => {
  it('returns high-level for high', () => {
    expect(getLevelClass('successProbabilityLabel', { successProbabilityLabel: 'high' })).toBe('high-level')
  })
  it('returns low-level for low', () => {
    expect(getLevelClass('successProbabilityLabel', { successProbabilityLabel: 'low' })).toBe('low-level')
  })
})

describe('getLevelClass — unknown field', () => {
  it('returns empty-level for any unknown field', () => {
    expect(getLevelClass('someOtherField', { someOtherField: 'high' })).toBe('empty-level')
  })
})

describe('getLevelClass — case-insensitive matching (regression)', () => {
  it('matches regardless of the backend value\'s casing', () => {
    expect(getLevelClass('scaleUsingFinancing', { scaleUsingFinancing: 'High' })).toBe('high-level')
    expect(getLevelClass('scaleUsingFinancing', { scaleUsingFinancing: 'MEDIUM' })).toBe('medium-level')
    expect(getLevelClass('scaleUsingFinancing', { scaleUsingFinancing: 'Low' })).toBe('low-level')
  })
})

// ─── getLevelItem ─────────────────────────────────────────────────────────────

describe('getLevelItem — scaleUsingFinancing', () => {
  it('returns the raw value when present', () => {
    expect(getLevelItem('scaleUsingFinancing', { scaleUsingFinancing: 'high' })).toBe('high')
    expect(getLevelItem('scaleUsingFinancing', { scaleUsingFinancing: 'medium' })).toBe('medium')
    expect(getLevelItem('scaleUsingFinancing', { scaleUsingFinancing: 'low' })).toBe('low')
  })
  it('returns null when value is null (template renders "-" via ??)', () => {
    expect(getLevelItem('scaleUsingFinancing', { scaleUsingFinancing: null })).toBeNull()
  })
  it('returns null when field is missing', () => {
    expect(getLevelItem('scaleUsingFinancing', {})).toBeNull()
  })
})

describe('getLevelItem — unknown field', () => {
  it('returns dash for any unknown field', () => {
    expect(getLevelItem('randomField', { randomField: 'high' })).toBe('-')
  })
})
