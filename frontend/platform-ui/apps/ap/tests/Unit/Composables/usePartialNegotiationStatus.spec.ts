import { describe, it, expect } from 'vitest'
import {
  getDistinctStatusCodes,
  isPartialEntity,
  getStageBreakdownEntry,
  type StageBreakdownEntry
} from '@/composables/usePartialNegotiationStatus'

describe('getDistinctStatusCodes', () => {
  it('returns an empty array for null', () => {
    expect(getDistinctStatusCodes(null)).toEqual([])
  })

  it('returns an empty array for undefined', () => {
    expect(getDistinctStatusCodes(undefined)).toEqual([])
  })

  it('returns an empty array for an empty string', () => {
    expect(getDistinctStatusCodes('')).toEqual([])
  })

  it('returns a single-element array for a single status', () => {
    expect(getDistinctStatusCodes('contacted')).toEqual(['contacted'])
  })

  it('splits a comma-joined list', () => {
    expect(getDistinctStatusCodes('planned,contacted')).toEqual(['planned', 'contacted'])
  })

  it('trims whitespace around each token', () => {
    expect(getDistinctStatusCodes('planned, contacted')).toEqual(['planned', 'contacted'])
  })

  it('drops empty tokens', () => {
    expect(getDistinctStatusCodes('planned,,contacted')).toEqual(['planned', 'contacted'])
  })
})

describe('isPartialEntity', () => {
  it('is false for null/undefined/empty', () => {
    expect(isPartialEntity(null)).toBe(false)
    expect(isPartialEntity(undefined)).toBe(false)
    expect(isPartialEntity('')).toBe(false)
  })

  it('is false for a single status', () => {
    expect(isPartialEntity('analyzed')).toBe(false)
  })

  it('is true for two or more distinct statuses', () => {
    expect(isPartialEntity('planned,contacted')).toBe(true)
    expect(isPartialEntity('analyzed,onHold,contacted')).toBe(true)
  })
})

describe('getStageBreakdownEntry', () => {
  const breakdown: StageBreakdownEntry[] = [
    { stageCode: 200, count: 2, avgPaymentTerms: 30, avgPaymentTermsWithoutDiscount: 35, cashFlowTarget: 1000, vCardRebateFull: null },
    { stageCode: 300, count: 1, avgPaymentTerms: 45, avgPaymentTermsWithoutDiscount: 50, cashFlowTarget: 500, vCardRebateFull: 120 }
  ]

  it('returns null when stageBreakdown is undefined', () => {
    expect(getStageBreakdownEntry(undefined, '200')).toBeNull()
  })

  it('returns null when stageBreakdown is null', () => {
    expect(getStageBreakdownEntry(null, '200')).toBeNull()
  })

  it('returns null when stageBreakdown is empty', () => {
    expect(getStageBreakdownEntry([], '200')).toBeNull()
  })

  it('returns null when there is no matching entry', () => {
    expect(getStageBreakdownEntry(breakdown, '400')).toBeNull()
  })

  it('returns the matching entry for the given status code', () => {
    expect(getStageBreakdownEntry(breakdown, '300')).toEqual({
      stageCode: 300,
      count: 1,
      avgPaymentTerms: 45,
      avgPaymentTermsWithoutDiscount: 50,
      cashFlowTarget: 500,
      vCardRebateFull: 120
    })
  })
})
