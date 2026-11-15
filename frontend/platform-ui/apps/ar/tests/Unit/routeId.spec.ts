import { describe, expect, it } from 'vitest'
import { parsePositiveRouteId } from '@/modules/match/utils/routeId'

describe('parsePositiveRouteId', () => {
  it('parses a numeric string route param', () => {
    expect(parsePositiveRouteId('42')).toBe(42)
  })

  it('parses a bare number', () => {
    expect(parsePositiveRouteId(42)).toBe(42)
  })

  it('rejects an empty string, rather than treating it as id 0', () => {
    expect(parsePositiveRouteId('')).toBeUndefined()
  })

  it('rejects zero and negative values', () => {
    expect(parsePositiveRouteId('0')).toBeUndefined()
    expect(parsePositiveRouteId('-1')).toBeUndefined()
  })

  it('rejects a non-numeric segment, rather than producing NaN', () => {
    expect(parsePositiveRouteId('abc')).toBeUndefined()
  })

  it('rejects a non-integer value', () => {
    expect(parsePositiveRouteId('1.5')).toBeUndefined()
  })

  it('rejects undefined/null', () => {
    expect(parsePositiveRouteId(undefined)).toBeUndefined()
    expect(parsePositiveRouteId(null)).toBeUndefined()
  })
})
