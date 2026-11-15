import { describe, expect, it } from 'vitest'
import { toUSDate } from '@/utils/dateFormatting'

describe('toUSDate', () => {
  it('converts an ISO date to MM/DD/YYYY', () => {
    expect(toUSDate('2024-01-01')).toBe('01/01/2024')
    expect(toUSDate('2024-12-31')).toBe('12/31/2024')
  })

  it('reads only the date portion of an ISO datetime, ignoring any time/offset suffix', () => {
    expect(toUSDate('2024-03-05T00:00:00.000Z')).toBe('03/05/2024')
  })
})
